class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.unlocked = false;
  }

  // Tato metoda se MUSÍ volat z přímé interakce (click, touchend)
  init() {
    if (this.unlocked && this.context && this.context.state === 'running') return;

    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextClass();
      }

      if (this.context.state === 'suspended' || this.context.state === 'interrupted') {
        this.context.resume();
      }

      // Vytvoření tichého bufferu pro odemknutí
      const buffer = this.context.createBuffer(1, 1, 22050);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.context.destination);
      source.start(0);

      this.unlocked = true;
      console.log("Audio Context initialized and unlocked.");
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }
  }

  setEnabled(val) {
    this.enabled = val;
    if (val) this.init();
  }

  // Pomocná metoda pro bezpečné přehrání
  _play(fn) {
    if (!this.enabled) return;
    if (!this.context || this.context.state !== 'running') {
      this.init();
    }
    if (this.context && this.context.state === 'running') {
      fn(this.context, this.context.currentTime);
    }
  }

  playClick() {
    this._play((ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.1);
    });
  }

  playRoll() {
    this._play((ctx, now) => {
      const duration = 1.0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + duration);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      const noise = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      for (let i = 0; i < 8; i++) {
        const delay = i * 0.12;
        const osc = ctx.createOscillator();
        const cGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200 + Math.random() * 400, now + delay);
        osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.04);
        cGain.gain.setValueAtTime(0.04, now + delay);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
        osc.connect(cGain);
        cGain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.04);
      }
    });
  }

  playBust() {
    this._play((ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 1.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 1.2);
    });
  }

  playBotMove() {
    this._play((ctx, now) => {
      const notes = [1200, 1600, 1000];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.015, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.05);
      });
    });
  }

  playScore() {
    this._play((ctx, now) => {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.05, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + i * 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + 0.5 + i * 0.1);
      });
    });
  }

  playSteal() {
    this._play((ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    });
  }

  playStrike() {
    this._play((ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.4);
    });
  }

  playStraight() {
    this._play((ctx, now) => {
      const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
      scale.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = i * 0.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.06, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    });
  }

  playDoubleStart() {
    this._play((ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.5);
    });
  }

  playVictory() {
    this._play((ctx, now) => {
      const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
      fanfare.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const delay = i * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.0, now + delay);
        gain.gain.linearRampToValueAtTime(0.07, now + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.65);
      });
    });
  }
}

export const audio = new AudioManager();
