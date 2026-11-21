// =====================================================================
// Vampire Garlic Heist: crowd clap detection through the microphone.
// A clap is a short, sharp jump in loudness. To cope with a noisy room the detector keeps a running
// "noise floor" (the room's normal loudness) and only counts a sound as a clap when it is clearly
// louder than that floor AND rises suddenly. Sensitivity sets how much louder it has to be.
// =====================================================================
export const SENSITIVITY = { low: .30, medium: .20, high: .12 }; // margin above the noise floor (0-1 scale)

export class ClapDetector {
  constructor() {
    this.status = 'off';        // off | starting | on | denied | unavailable
    this.level = 0;             // current loudness, 0-1
    this.floor = .15;           // running noise floor, 0-1
    this.sensitivity = 'medium';
    this.prev = 0; this.cooldown = 0; this.onClap = null;
  }
  get threshold() { return Math.min(.95, this.floor + SENSITIVITY[this.sensitivity]); }
  async enable() {
    if (this.status === 'on' || this.status === 'starting') return this.status;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { this.status = 'unavailable'; return this.status; }
    this.status = 'starting';
    try {
      // switch off the browser's voice processing: it would flatten exactly the sharp peaks we look for
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') await ac.resume();
      const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
      an.fftSize = 512; src.connect(an);
      Object.assign(this, { ac, stream, an, buf: new Float32Array(an.fftSize), status: 'on' });
    } catch (e) {
      this.status = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'unavailable';
    }
    return this.status;
  }
  disable() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.ac) this.ac.close().catch(() => {});
    Object.assign(this, { stream: null, ac: null, an: null, status: 'off', level: 0 });
  }
  // call once per frame; returns true on the frame a clap is detected
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.status !== 'on') { this.level = 0; return false; }
    this.an.getFloatTimeDomainData(this.buf);
    let peak = 0, sum = 0;
    for (let i = 0; i < this.buf.length; i++) { const v = this.buf[i]; sum += v * v; if (Math.abs(v) > peak) peak = Math.abs(v); }
    const rms = Math.sqrt(sum / this.buf.length);
    // map -60 dB .. 0 dB to 0 .. 1 (mix in the peak so short claps register)
    const db = 20 * Math.log10(Math.max(1e-5, rms * .6 + peak * .4));
    const level = Math.max(0, Math.min(1, (db + 60) / 60));
    const rise = level - this.prev;
    this.prev = this.prev * .6 + level * .4;
    this.level = level;
    // the floor follows the room slowly, and ignores the loud moments themselves
    const k = level < this.threshold ? dt * .5 : dt * .05;
    this.floor += (level - this.floor) * Math.min(1, k);
    if (this.cooldown <= 0 && level > this.threshold && rise > .08) {
      this.cooldown = .25;
      if (this.onClap) this.onClap();
      return true;
    }
    return false;
  }
}
