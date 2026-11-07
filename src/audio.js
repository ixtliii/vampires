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
  constructor() { this.ac = null; this.on = true; this.music = false; this.step = 0; this.next = 0; this.tempo = 0; }
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
    if (!this.ac || !this.music) return;
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
