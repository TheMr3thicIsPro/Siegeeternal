// ============================================================
// SoundManager — procedural Web Audio API sounds (no audio files)
// Exported as a module-level singleton: import { soundMgr }
// All methods are safe to call from any scene; AudioContext is
// created lazily on first use so it works around autoplay policy.
// ============================================================

class SoundManager {
  constructor() {
    this._ctx        = null;
    this._masterGain = null;
    this._enabled    = true;
  }

  // ── Volume control ───────────────────────────────────────

  /** Set master volume 0–1. Applied via a master GainNode. */
  setVolume(v) {
    if (this._masterGain) this._masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  // ── Internal helpers ─────────────────────────────────────

  _getCtx() {
    if (!this._ctx) {
      try {
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Master gain node — all sounds route through here for global volume control
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = 0.75;
        this._masterGain.connect(this._ctx.destination);
      } catch (e) {
        this._enabled = false;
        return null;
      }
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  /** Returns the node all sounds should connect to (master gain or destination fallback). */
  _dest() {
    return this._masterGain ?? this._ctx?.destination;
  }

  /** Play a simple oscillator tone with exponential decay */
  _tone(freq, type, duration, peakGain) {
    if (!this._enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this._dest());
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(peakGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch (e) {}
  }

  /** Play a noise burst through a lowpass filter */
  _noise(duration, peakGain, filterFreq = 1800) {
    if (!this._enabled) return;
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const bufLen = Math.ceil(ctx.sampleRate * duration);
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const filter = ctx.createBiquadFilter();
      filter.type  = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain   = ctx.createGain();
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this._dest());
      gain.gain.setValueAtTime(peakGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      src.start(ctx.currentTime);
    } catch (e) {}
  }

  // ── Public sound effects ──────────────────────────────────

  /** Projectile or sword hit */
  hit() {
    this._tone(200, 'square', 0.07, 0.12);
    this._noise(0.05, 0.06, 1000);
  }

  /** Regular enemy dies */
  die() {
    this._noise(0.14, 0.20, 900);
    this._tone(120, 'sine', 0.12, 0.08);
  }

  /** Boss dies — big dramatic boom */
  bossDie() {
    this._noise(0.7, 0.45, 500);
    this._tone(55, 'sine', 0.9, 0.35);
    // Pitch-sweeping crash
    const ctx = this._getCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this._dest());
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.9);
    } catch (e) {}
  }

  /** Boss incoming alert — two-tone siren */
  bossAlert() {
    const ctx = this._getCtx();
    if (!ctx || !this._enabled) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this._dest());
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.9);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.1);
    } catch (e) {}
  }

  /** Player takes damage */
  playerHurt() {
    this._tone(110, 'sawtooth', 0.18, 0.22);
    this._noise(0.10, 0.12, 700);
  }

  /** Harvest a surface resource node */
  harvest() {
    this._tone(550, 'sine', 0.11, 0.10);
    this._noise(0.06, 0.05, 2200);
  }

  /** Harvest in cave (mining) */
  mine() {
    this._noise(0.12, 0.18, 2500);
    this._tone(180, 'square', 0.08, 0.08);
  }

  /** Place / build a structure */
  build() {
    this._tone(330, 'sine', 0.06, 0.10);
    this._tone(440, 'sine', 0.10, 0.09);
  }

  /** Craft an item */
  craft() {
    this._tone(523, 'triangle', 0.07, 0.12);
    this._tone(659, 'triangle', 0.12, 0.10);
    this._tone(784, 'triangle', 0.18, 0.08);
  }

  /** Dawn transition — ascending four-note arpeggio */
  dayStart() {
    const ctx = this._getCtx();
    if (!ctx || !this._enabled) return;
    const notes = [261, 329, 392, 523];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.17;
      try {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this._dest());
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.start(t);
        osc.stop(t + 0.5);
      } catch (e) {}
    });
  }

  /** Dusk transition — descending two-tone */
  nightStart() {
    const ctx = this._getCtx();
    if (!ctx || !this._enabled) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this._dest());
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(196, ctx.currentTime + 0.9);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.1);
    } catch (e) {}
  }

  /** Tower fires a shot */
  shoot() {
    this._tone(300, 'square', 0.06, 0.07);
  }

  /** Crystal Wraith phase-shift teleport — downward pitch sweep */
  phaseShift() {
    const ctx = this._getCtx();
    if (!ctx || !this._enabled) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this._dest());
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
    this._noise(0.2, 0.08, 3000);
  }
}

export const soundMgr = new SoundManager();
