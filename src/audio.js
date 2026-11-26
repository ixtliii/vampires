// =====================================================================
// Web Audio synth: the looping theme (speeds up towards sunrise) and all sound effects.
// No audio files needed.
// =====================================================================
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
// "gar-lic gar-lic yuck yuck yuck": two 16-step phrases in A minor
const MEL = [[69, null, 72, 69, 76, null, 74, 72, 71, null, 68, 71, 64, null, null, null],
             [69, null, 72, 69, 76, null, 77, 76, 74, 72, 71, 68, 69, null, null, null]];
const BASS = [[45, 45, 40, 40, 45, 45, 40, 40], [45, 45, 41, 41, 40, 40, 45, 45]];

export class Sound {
  constructor() { this.ac = null; this.on = true; this.music = false; this.step = 0; this.next = 0; this.tempo = 0; this.ambT = {}; }
  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      this.ac = ac;
      this.master = ac.createGain(); this.master.gain.value = this.on ? 0.8 : 0; this.master.connect(ac.destination);
      this.mg = ac.createGain(); this.mg.gain.value = 0.3; this.mg.connect(this.master);
      this.sg = ac.createGain(); this.sg.gain.value = 0.75; this.sg.connect(this.master);
      this.nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = this.nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // village ambience: its own quiet bus, under the music
      this.ag = ac.createGain(); this.ag.gain.value = 0.55; this.ag.connect(this.master);
      this.startWind();
      setInterval(() => this.schedule(), 25);
    } catch (e) { this.ac = null; }
  }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ac.currentTime, 0.05); }
  now() { return this.ac ? this.ac.currentTime : 0; }
  tone(f, dur, type, vol, t0, slide, dest) {
    const ac = this.ac; if (!ac) return;
    const t = t0 ?? ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sg); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, f0, f1, vol, q = 1, t0, dest) {
    const ac = this.ac; if (!ac) return;
    const t = t0 ?? ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = this.nb; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sg); s.start(t); s.stop(t + dur + 0.05);
  }
  // ---- village at night -------------------------------------------------------------------------
  // a soft, endless wind: looping noise through a low filter whose cutoff drifts slowly
  startWind() {
    const ac = this.ac, len = ac.sampleRate * 4, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = last * .985 + (Math.random() * 2 - 1) * .015; d[i] = last * 6; } // brown-ish noise
    const src = ac.createBufferSource(); src.buffer = b; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = .7;
    const g = ac.createGain(); g.gain.value = .16;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .07; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    const lfo2 = ac.createOscillator(), lg2 = ac.createGain(); lfo2.frequency.value = .045; lg2.gain.value = .07; lfo2.connect(lg2); lg2.connect(g.gain); lfo2.start();
    src.connect(f); f.connect(g); g.connect(this.ag); src.start();
  }
  // a sound placed somewhere left or right in the room
  pan(x) { const p = this.ac.createStereoPanner ? this.ac.createStereoPanner() : null; if (!p) return this.ag; p.pan.value = x; p.connect(this.ag); return p; }
  cricket(t) {
    const dest = this.pan(Math.random() * 1.6 - .8), f = 4200 + Math.random() * 900, n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) this.tone(f, .035, 'sine', .03, t + k * .32 + i * .055, null, dest);
  }
  owl(t) {
    const dest = this.pan(Math.random() < .5 ? -.6 : .6);
    this.tone(400, .32, 'sine', .07, t, 370, dest); this.tone(410, .22, 'sine', .05, t + .45, 390, dest); this.tone(405, .55, 'sine', .07, t + .75, 350, dest);
  }
  dog(t) {
    const dest = this.pan(Math.random() * 1.4 - .7);
    [0, .28].forEach(d => { this.tone(520, .12, 'sawtooth', .025, t + d, 300, dest); this.noise(.1, 900, 500, .03, 2, t + d, dest); });
  }
  frog(t) { const dest = this.pan(Math.random() * 1.2 - .6); [0, .16].forEach(d => this.tone(140, .12, 'square', .02, t + d, 95, dest)); }
  bell(t) { const dest = this.pan(-.3); [1, 2.76, 5.4].forEach((m, i) => this.tone(196 * m, 3.2 / (i + 1), 'sine', .035 / (i + 1), t, null, dest)); }
  crackle(t) { const dest = this.pan(.75); for (let i = 0; i < 3; i++) this.noise(.03, 2500 + Math.random() * 2500, 1800, .05, 3, t + Math.random() * .3, dest); }
  ambience() {
    const t = this.ac.currentTime, A = this.ambT;
    const due = (k, lo, hi, fn) => { if (A[k] === undefined) A[k] = t + lo * Math.random(); if (t >= A[k]) { fn(t + .02); A[k] = t + lo + Math.random() * (hi - lo); } };
    due('cricket', .6, 2.2, x => this.cricket(x));
    due('cricket2', 1.1, 3.4, x => this.cricket(x));
    due('frog', 6, 14, x => this.frog(x));
    due('owl', 16, 34, x => this.owl(x));
    due('dog', 35, 70, x => this.dog(x));
    due('bell', 70, 110, x => this.bell(x));
    due('crackle', .8, 2.5, x => this.crackle(x));
  }
  play(name) {
    if (!this.ac) return; const t = this.now();
    switch (name) {
      case 'yuck': this.tone(560, .16, 'square', .17, t, 220); this.tone(320, .24, 'square', .14, t + .12, 110); break;
      case 'whoosh': this.noise(.6, 300, 3200, .5, 1.2); this.tone(110, .5, 'sine', .3, t, 45); break;
      case 'squeak': this.tone(2200, .07, 'sine', .2, t, 3300); this.tone(2500, .07, 'sine', .16, t + .09, 3700); break;
      case 'alarm': this.tone(880, .14, 'square', .16, t); this.tone(660, .22, 'square', .16, t + .15); break;
      case 'hey': this.tone(330, .12, 'square', .12, t, 420); break;
      case 'meow': this.tone(720, .18, 'sawtooth', .1, t, 900); this.tone(900, .3, 'sawtooth', .1, t + .17, 520); break;
      case 'lamp': this.tone(1200, .05, 'square', .05, t); this.tone(900, .05, 'square', .05, t + .07); break;
      case 'puff': this.noise(.55, 900, 160, .45, .7); break;
      case 'yawn': this.tone(430, .55, 'triangle', .2, t, 230); break;
      case 'ready': this.tone(1320, .08, 'sine', .12, t); this.tone(1760, .12, 'sine', .1, t + .08); break;
      case 'tick': this.tone(880, .12, 'sine', .25); break;
      case 'more': [0, .08, .16].forEach((d, i) => this.tone(660 + i * 220, .12, 'triangle', .15, t + d)); break;
      case 'win': [69, 72, 76, 81].forEach((m, i) => this.tone(mf(m), .5, 'triangle', .2, t + i * .12)); break;
      case 'mwahaha':
        this.tone(150, .5, 'sawtooth', .2, t, 120);
        [.55, .85, 1.15, 1.45].forEach((d, i) => this.tone(240 - i * 22, .24, 'sawtooth', .2, t + d, 170 - i * 18));
        this.tone(70, 1.9, 'sine', .28, t, 45); break;
      // new sounds: each event has its own sound so the icons don't need words
      case 'lifeLost': [0, .16, .32].forEach((d, i) => this.tone(520 - i * 110, .2, 'triangle', .18, t + d, 400 - i * 100)); break;
      case 'snore': this.noise(.7, 180, 420, .12, 2, t); this.tone(95, .7, 'sine', .08, t, 75); break;
      case 'pass': this.tone(500, .12, 'sine', .16, t, 900); this.tone(900, .16, 'triangle', .14, t + .1, 1400); break;
      case 'clap': this.noise(.09, 1800, 2400, .5, .8, t); this.tone(523, .14, 'triangle', .1, t + .03, 587); break;
      case 'slow': this.tone(300, .4, 'sine', .14, t, 160); break;
      case 'faster': this.tone(420, .08, 'square', .06, t); this.tone(560, .08, 'square', .06, t + .08); break;
      case 'cage': this.noise(.25, 300, 900, .35, 1.2, t); this.tone(140, .35, 'square', .1, t, 90); this.tone(220, .2, 'triangle', .12, t + .18, 180); break;
      case 'free': [0, .09, .18, .27].forEach((d, i) => this.tone([523, 659, 784, 1046][i], .18, 'triangle', .15, t + d)); break;
      case 'rooster': {
        const ac = this.ac, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 2400;
        [[0, 460], [.14, 900], [.3, 720], [.55, 1040], [.95, 980], [1.35, 520]].forEach(([d, fr], i) => i ? o.frequency.linearRampToValueAtTime(fr, t + d) : o.frequency.setValueAtTime(fr, t + d));
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + .05); g.gain.setValueAtTime(.18, t + 1.1); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
        o.connect(f); f.connect(g); g.connect(this.sg); o.start(t); o.stop(t + 1.5); break;
      }
    }
  }
  schedule() {
    if (!this.ac) return;
    if (this.on) this.ambience();
    if (!this.music) return;
    const ac = this.ac, eighth = 60 / (104 + 60 * this.tempo) / 2;
    if (this.next < ac.currentTime) this.next = ac.currentTime + .05;
    while (this.next < ac.currentTime + .15) {
      const ph = Math.floor(this.step / 16) % 2, i = this.step % 16, m = MEL[ph][i];
      if (m) { this.tone(mf(m), .22, 'triangle', .22, this.next, null, this.mg); this.tone(mf(m + 12), .08, 'sine', .05, this.next, null, this.mg); }
      if (i % 2 === 0) this.tone(mf(BASS[ph][i / 2]), .3, 'triangle', .3, this.next, null, this.mg);
      if (this.tempo > .45 && i % 2 === 1) this.noise(.04, 6000, 7000, .05, 2, this.next, this.mg);
      this.next += eighth; this.step++;
    }
  }
}
