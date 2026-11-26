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

export const TILT_SENS = { low: [.19, 1.0, 1.7], medium: [.14, .7, 1.4], high: [.1, .5, 1.2] };

export class JoyConHub {
  constructor() {
    // four seats (Pad 1..4). A Joy-Con keeps its seat: if one drops out for a moment, the others do NOT move up
    // a seat (that would hand them a different bat), and when it comes back it gets its own seat again
    this.seats = [null, null, null, null]; this.seatDev = [null, null, null, null];
    this.counter = 0;
    this.supported = !!(navigator.hid && window.isSecureContext);
    this.onChange = null;
    // tilt steering: which way is which differs between the left and right Joy-Con chips, so each side / grip
    // can be flipped in the controller check (remembered in this browser)
    this.flips = {}; try { this.flips = JSON.parse(localStorage.getItem('vgh-tilt-flips2') || '{}'); } catch (e) {}
    this.sens = 'medium'; try { this.sens = localStorage.getItem('vgh-tilt-sens') || 'medium'; } catch (e) {}
  }
  flip(key, axis) {
    const f = this.flips[key] = this.flips[key] || { x: false, y: false }; f[axis] = !f[axis];
    try { localStorage.setItem('vgh-tilt-flips2', JSON.stringify(this.flips)); } catch (e) {}
  }
  // "this is how I hold it": the current angle becomes straight ahead (after a short wait so the shake has settled)
  get list() { return this.seats.filter(Boolean); }
  recenter(i, delay = 0) { const j = this.seats[i]; if (j) j.recenterAt = performance.now() + delay; }
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
    if (this.seats.some(j => j && j.dev === dev)) return;
    let seat = this.seatDev.findIndex((d, i) => d === dev && !this.seats[i]);
    if (seat < 0) seat = this.seats.findIndex((j, i) => !j && !this.seatDev[i]);
    if (seat < 0) seat = this.seats.findIndex(j => !j);
    if (seat < 0) return; // already four Joy-Cons
    const j = { dev, side: dev.productId === LEFT ? 'L' : dev.productId === RIGHT ? 'R' : 'P', name: dev.productName,
      lx: 0, ly: 0, rx: 0, ry: 0, gv: null, zero: null, recenterAt: 0, btn: 0, prevBtn: 0, g: 1, motion: 0, spikes: [], shakeQueued: false, center: null, last: 0, battery: 0 };
    j.seat = seat; this.seats[seat] = j; this.seatDev[seat] = dev;
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
    this.seats = this.seats.map(j => j && j.dev === dev ? null : j);
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
  lights() { this.seats.forEach((j, i) => { if (j) this.sub(j, 0x30, [LIGHTS[i] || 0x0f]).catch(() => {}); }); }
  // a Joy-Con that stops sending its full reports (Bluetooth hiccup, or it fell back to its simple mode):
  // switch full reports and the motion sensor on again
  async kick(j) {
    try {
      if (!j.dev.opened) await j.dev.open();
      await this.sub(j, 0x03, [0x30]); await this.sub(j, 0x40, [0x01]);
      this.sub(j, 0x30, [LIGHTS[j.seat] || 0x0f]).catch(() => {});
    } catch (e) { /* try again later */ }
  }

  report(j, e) {
    if (e.reportId !== 0x30) { j.other = performance.now(); return; }
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
      // gravity, smoothed: samples taken while the Joy-Con is being swung or shaken are left out
      if (!j.gv) j.gv = [ax / 4096, ay / 4096, az / 4096];
      else if (g > .6 && g < 1.45) { const k = .07; j.gv[0] += (ax / 4096 - j.gv[0]) * k; j.gv[1] += (ay / 4096 - j.gv[1]) * k; j.gv[2] += (az / 4096 - j.gv[2]) * k; }
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

  // tilt angles (radians) of one Joy-Con: [left/right, forward/back]
  angles(j, upright) {
    if (!j.gv) return [0, 0];
    // the right Joy-Con's motion chip sits the other way round: its y and z axes point the opposite way
    const m = Math.hypot(...j.gv) || 1, inv = j.side === 'R' ? -1 : 1;
    const gx = j.gv[0] / m, gy = inv * j.gv[1] / m, gz = inv * j.gv[2] / m;
    const as = v => Math.asin(Math.max(-1, Math.min(1, v)));
    if (upright) {
      // held like a remote pointed at the screen: lying almost flat, buttons up, trigger end towards the screen.
      // Roll it left / right = left / right; dip the nose = forward (up the screen), lift it = back
      const sx = 1; // the accelerometer's x axis points to the trigger end
      return [as(gy) * sx, Math.atan2(gz, gx * sx)];
    }
    // sideways, both hands, stick on the left: lower the right end = right, lower the left end = left;
    // tip the top edge away from you = forward (up the screen), towards you = back.
    // The rail sits on the right edge of a left Joy-Con and on the left edge of a right one.
    return [as(gx) * (j.side === 'L' ? 1 : -1), j.side === 'L' ? Math.atan2(gz, -gy) : Math.atan2(gz, gy)];
  }
  tilt(j, upright) {
    const now = performance.now(), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    let [lat, fwd] = this.angles(j, upright);
    const key = j.side + (upright ? 'p' : 's');
    if (j.recenterAt && now >= j.recenterAt) {
      j.recenterAt = 0;
      const c = v => Math.max(-.35, Math.min(.35, v));
      j.zero = { key, lat: c(lat), fwd: upright ? Math.max(.35, Math.min(1.9, fwd)) : fwd };
    }
    // straight ahead: what was stored at the last recentre, else held perfectly upright / sideways
    const z = j.zero && j.zero.key === key ? j.zero : { lat: 0, fwd: upright ? 1.05 : .7 }; // default: pointing = nose up about 30 degrees; sideways = buttons tilted up about 40 degrees
    lat = wrap(lat - z.lat); fwd = wrap(fwd - z.fwd);
    // tilt sensitivity (settings): [angle that does nothing, angle for full speed (radians), curve]
    //   low    ~11 deg nothing, ~57 deg full, soft start
    //   medium ~8 deg nothing,  ~40 deg full
    //   high   ~6 deg nothing,  ~29 deg full, quick
    const [DEAD, FULL, CURVE] = TILT_SENS[this.sens] || TILT_SENS.medium;
    const amt = a => Math.sign(a) * Math.pow(Math.max(0, Math.min(1, (Math.abs(a) - DEAD) / (FULL - DEAD))), CURVE);
    const f = this.flips[key] || {};
    let ax = amt(lat) * (f.x ? -1 : 1), ay = -amt(fwd) * (f.y ? -1 : 1);
    const mg = Math.hypot(ax, ay); if (mg > 1) { ax /= mg; ay /= mg; }
    // ease towards the new value so a shaky hand doesn't make the bat twitch
    const k = .25; j.tx = (j.tx || 0) + (ax - (j.tx || 0)) * k; j.ty = (j.ty || 0) + (ay - (j.ty || 0)) * k;
    return [Math.abs(j.tx) < .01 ? 0 : j.tx, Math.abs(j.ty) < .01 ? 0 : j.ty];
  }

  // one state per Joy-Con for this frame; upright = held vertically instead of sideways; tilt = steer by tilting
  read(upright, tilt = true) {
    const now = performance.now();
    return this.seats.map((j, i) => {
      if (!j) return null;
      const lost = !j.last || now - j.last > 700;
      if (lost && now - (j.kickAt || 0) > 1500) { j.kickAt = now; this.kick(j); }
      if (lost && j.last) { j.btn = j.prevBtn = 0; } // don't keep flying on the last reading
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
      if (edge(0x000400) || edge(0x000800)) j.recenterAt = performance.now(); // click the stick in: recentre the tilt
      if (lost) { ax = 0; ay = 0; }
      else if (tilt && j.side !== 'P') { [ax, ay] = this.tilt(j, upright); }
      else if (tilt) this.tilt(j, upright);
      const any = (j.btn & ~j.prevBtn) !== 0, shake = j.shakeQueued;
      if (shake) j.shakeAt = performance.now();
      j.prevBtn = j.btn; j.shakeQueued = false;
      const m = Math.hypot(ax, ay); if (m < (tilt && j.side !== 'P' ? .02 : .22)) { ax = 0; ay = 0; } else if (m > 1) { ax /= m; ay /= m; }
      const pressed = []; for (let k = 0; k < 24; k++) if (j.btn & (1 << k)) pressed.push(k);
      return { ax, ay, echo, pass, any, shake, motion: j.motion, hid: true, side: j.side, name: j.name, pressed, battery: j.battery, lost, light: i + 1, shakeAt: j.shakeAt || 0, flipKey: j.side + (upright ? 'p' : 's') };
    });
  }

  // rumble: a short buzz (frequency in Hz, amplitude 0..1), encoded as in dekuNukem's notes
  rumble(i, dur, amp) {
    const j = this.seats[i]; if (!j) return;
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
