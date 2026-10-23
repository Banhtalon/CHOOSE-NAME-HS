// Synthesized Web Audio API Sound Engine for Classroom Arcade Games
class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.init();
      this.playTick(660, 0.06);
    }
    return this.enabled;
  }

  playTone(freq, duration = 0.1, type = 'sine', volume = 0.14, slideFreq = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideFreq), now + duration);
    }

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  playCountdown(step) {
    if (step > 0) {
      this.playTone(440, 0.14, 'triangle', 0.18);
    } else {
      // GO Horn!
      this.playTone(587.33, 0.12, 'sawtooth', 0.16);
      setTimeout(() => this.playTone(880, 0.32, 'sawtooth', 0.2), 90);
    }
  }

  playQuack() {
    if (!this.enabled) return;
    this.playTone(390, 0.09, 'sawtooth', 0.12, 240);
    setTimeout(() => this.playTone(340, 0.11, 'sawtooth', 0.1, 210), 75);
  }

  playBoost() {
    this.playTone(280, 0.22, 'triangle', 0.15, 920);
  }

  playWhirlpool() {
    this.playTone(520, 0.2, 'sine', 0.12, 160);
  }

  playPegPing(index = 0) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const freq = scale[Math.abs(index) % scale.length];
    this.playTone(freq, 0.08, 'sine', 0.1);
  }

  playKartRev() {
    this.playTone(130, 0.16, 'sawtooth', 0.1, 290);
  }

  playUfoSweep() {
    this.playTone(620, 0.24, 'sine', 0.11, 340);
  }

  playUfoBeam() {
    this.playTone(320, 0.35, 'triangle', 0.16, 760);
  }

  playBubblePop() {
    this.playTone(680, 0.07, 'sine', 0.16, 180);
  }

  playTick(freq = 540, dur = 0.04) {
    this.playTone(freq, dur, 'triangle', 0.08);
  }

  playWinFanfare() {
    if (!this.enabled) return;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 110 },
      { f: 783.99, d: 0.12, t: 220 },
      { f: 1046.5, d: 0.36, t: 340 }
    ];
    notes.forEach((n) => {
      setTimeout(() => this.playTone(n.f, n.d, 'triangle', 0.2), n.t);
    });
  }
}

export const soundFX = new ArcadeAudio();
