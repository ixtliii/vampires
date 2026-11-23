// =====================================================================
// Vampire Garlic Heist: Joy-Cons over WebHID.
// Chrome's normal gamepad interface merges a left + right Joy-Con into one controller and hides the motion
// sensor. WebHID talks to every Joy-Con on its own instead: each one is one player, we get its accelerometer
// (shake to wake), the SL / SR buttons, rumble, and we can switch on its player light (1-4) to match its bat.
// Report layout: dekuNukem's "Nintendo_Switch_Reverse_Engineering" notes.
// =====================================================================
const NINTENDO = 0x057e, LEFT = 0x2006, RIGHT = 0x2007, PRO = 0x2009;
const LIGHTS = [0x01, 0x02, 0x04, 0x08];         // player light 1..4 (one LED each)
const NEUTRAL_RUMBLE = [0x00, 0x01, 0x40, 0x40];

export class JoyConHub {
  constructor() {
    this.list = [];        // connected Joy-Cons, in the order they were connected (= Pad 1..4)
    this.counter = 0;
    this.supported = !!(navigator.hid && window.isSecureContext);
    this.onChange = null;
  }
  async init() {
    if (!this.supported) return;
    navigator.hid.addEventListener('connect', e => this.open(e.device));
    navigator.hid.addEventListener('disconnect', e => this.drop(e.device));
    try { (await navigator.hid.getDevices()).forEach(d => this.open(d)); } catch (e) { /* not allowed here */ }
  }
  // must be called from a click: Chrome then shows its device picker (pick each Joy-Con, one after the other)
  async request() {
    if (!this.supported) return 'unsupported';
    try {
      const devs = await navigator.hid.requestDevice({ filters: [{ vendorId: NINTENDO, productId: LEFT }, { vendorId: NINTENDO, productId: RIGHT }, { vendorId: NINTENDO, productId: PRO }] });
      for (const d of devs) await this.open(d);
      return devs.length ? 'ok' : 'none';
    } catch (e) { return 'error'; }
  }
  async open(dev) {
    if (dev.vendorId !== NINTENDO || ![LEFT, RIGHT, PRO].includes(dev.productId)) return;
    if (this.list.some(j => j.dev === dev)) return;
    const j = { dev, side: dev.productId === LEFT ? 'L' : dev.productId === RIGHT ? 'R' : 'P', name: dev.productName,
      lx: 0, ly: 0, rx: 0, ry: 0, btn: 0, prevBtn: 0, g: 1, motion: 0, spikes: [], shakeQueued: false, center: null, last: 0, battery: 0 };
    this.list.push(j);
    try {
      if (!dev.opened) await dev.open();
      dev.addEventListener('inputreport', e => this.report(j, e));
      await this.sub(j, 0x03, [0x30]);       // full input reports, 60 per second
      await this.sub(j, 0x40, [0x01]);       // switch the motion sensor on
      await this.sub(j, 0x48, [0x01]);       // allow rumble
      this.lights();
    } catch (e) { console.warn('Joy-Con could not be opened', e); }
    if (this.onChange) this.onChange();
  }
  drop(dev) {
    this.list = this.list.filter(j => j.dev !== dev);
    this.lights();
    if (this.onChange) this.onChange();
  }
  // a subcommand: output report 0x01 = packet counter, 8 rumble bytes, subcommand id, arguments
  async sub(j, id, args, rumble) {
    const r = rumble || [...NEUTRAL_RUMBLE, ...NEUTRAL_RUMBLE];
    const data = new Uint8Array([this.counter++ & 0x0f, ...r, id, ...args]);
    await j.dev.sendReport(0x01, data);
    await new Promise(res => setTimeout(res, 30)); // give the Joy-Con a moment between commands
  }
  lights() { this.list.forEach((j, i) => { this.sub(j, 0x30, [LIGHTS[i] || 0x0f]).catch(() => {}); }); }

  report(j, e) {
    if (e.reportId !== 0x30) return;
    const d = e.data, b = i => d.getUint8(i);
    j.battery = b(1) >> 5;
    j.btn = b(2) | (b(3) << 8) | (b(4) << 16);   // right byte, shared byte, left byte
    const stick = o => [b(o) | ((b(o + 1) & 0x0f) << 8), (b(o + 1) >> 4) | (b(o + 2) << 4)];
    const [lh, lv] = stick(5), [rh, rv] = stick(8);
    if (!j.center) j.center = { lh, lv, rh, rv };    // the first report is taken as "stick at rest"
    const n = (v, c) => Math.max(-1, Math.min(1, (v - c) / 1300));
    j.lx = n(lh, j.center.lh); j.ly = n(lv, j.center.lv); j.rx = n(rh, j.center.rh); j.ry = n(rv, j.center.rv);
    // motion: three samples per report; accelerometer at +/-8G, 1G = 4096
    const now = performance.now();
    for (let s = 0; s < 3; s++) {
      const o = 12 + s * 12, ax = d.getInt16(o, true), ay = d.getInt16(o + 2, true), az = d.getInt16(o + 4, true);
      const gyro = Math.hypot(d.getInt16(o + 6, true), d.getInt16(o + 8, true), d.getInt16(o + 10, true));
      const g = Math.hypot(ax, ay, az) / 4096;
      j.g = g;
      // a shake = two hard jolts within 0.7 s (one bump on the table doesn't count)
      if (g > 2.1 || gyro > 14000) {
        if (!j.spikes.length || now - j.spikes[j.spikes.length - 1] > 120) j.spikes.push(now);
        j.spikes = j.spikes.filter(t => now - t < 700);
        if (j.spikes.length >= 2) { j.shakeQueued = true; j.spikes = []; }
      }
      j.motion = Math.max(j.motion * .9, Math.min(1, Math.max(Math.abs(g - 1) / 1.5, gyro / 20000)));
    }
    j.last = now;
  }

  // one state per Joy-Con for this frame; upright = held vertically instead of sideways
  read(upright) {
    return this.list.map((j, i) => {
      const has = m => (j.btn & m) !== 0, was = m => (j.prevBtn & m) !== 0, edge = m => has(m) && !was(m);
      let ax, ay, echo, pass;
      if (j.side === 'L') {
        // left Joy-Con: up on the stick = larger v. Held sideways, the rail (SL/SR) points up
        ax = upright ? j.lx : -j.ly; ay = upright ? -j.ly : -j.lx;
        echo = edge(0x010000) || edge(0x020000) || edge(0x040000) || edge(0x080000);   // the four arrow buttons
        pass = edge(0x100000) || edge(0x200000) || edge(0x400000) || edge(0x800000);   // SR, SL, L, ZL
      } else if (j.side === 'R') {
        ax = upright ? j.rx : j.ry; ay = upright ? -j.ry : j.rx;
        echo = edge(0x01) || edge(0x02) || edge(0x04) || edge(0x08);                   // Y X B A
        pass = edge(0x10) || edge(0x20) || edge(0x40) || edge(0x80);                   // SR, SL, R, ZR
      } else {
        ax = j.lx; ay = -j.ly;
        echo = edge(0x01) || edge(0x02) || edge(0x04) || edge(0x08);
        pass = edge(0x40) || edge(0x80) || edge(0x400000) || edge(0x800000);
      }
      const any = (j.btn & ~j.prevBtn) !== 0, shake = j.shakeQueued;
      if (shake) j.shakeAt = performance.now();
      j.prevBtn = j.btn; j.shakeQueued = false;
      const m = Math.hypot(ax, ay); if (m < .22) { ax = 0; ay = 0; } else if (m > 1) { ax /= m; ay /= m; }
      const pressed = []; for (let k = 0; k < 24; k++) if (j.btn & (1 << k)) pressed.push(k);
      return { ax, ay, echo, pass, any, shake, motion: j.motion, hid: true, side: j.side, name: j.name, pressed, battery: j.battery, light: i + 1, shakeAt: j.shakeAt || 0 };
    });
  }

  // rumble: a short buzz (frequency in Hz, amplitude 0..1), encoded as in dekuNukem's notes
  rumble(i, dur, amp) {
    const j = this.list[i]; if (!j) return;
    const enc = (hf, lf, a) => {
      const fh = Math.round(Math.log2(hf / 10) * 32), fl = Math.round(Math.log2(lf / 10) * 32);
      const hfc = (fh - 0x60) * 4, lfc = fl - 0x40;
      let ea = 0; if (a > .23) ea = Math.round(Math.log2(a * 8.7) * 32); else if (a > .12) ea = Math.round(Math.log2(a * 17) * 16); else if (a > 0) ea = Math.round((Math.log2(a) * 32 - 96) / (4 - 2 * a));
      const ha = ea * 2, la = Math.round(ea / 2) + 64;
      return [hfc & 0xff, ((hfc >> 8) & 0xff) + ha, (lfc + ((la >> 8) & 0xff)) & 0xff, la & 0xff];
    };
    const on = enc(320, 160, Math.min(1, Math.max(.15, amp)));
    j.dev.sendReport(0x10, new Uint8Array([this.counter++ & 0x0f, ...on, ...on])).catch(() => {});
    setTimeout(() => { j.dev.sendReport(0x10, new Uint8Array([this.counter++ & 0x0f, ...NEUTRAL_RUMBLE, ...NEUTRAL_RUMBLE])).catch(() => {}); }, dur * 1000);
  }
}
