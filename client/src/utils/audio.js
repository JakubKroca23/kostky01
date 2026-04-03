class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setEnabled(val) {
    this.enabled = val;
  }

  playClick() {
    if (!this.enabled) return;
    this.init();
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  playRoll() {
    if (!this.enabled) return;
    this.init();
    const duration = 0.8;
    const osc = this.context.createOscillator();
    const noise = this.context.createBufferSource();
    const gain = this.context.createGain();

    // Fake roll noise using random buffer
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.context.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + duration);

    gain.gain.setValueAtTime(0.05, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    noise.start();
    noise.stop(this.context.currentTime + duration);
  }

  playBust() {
    if (!this.enabled) return;
    this.init();
    const duration = 0.5;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, this.context.currentTime);
    osc.frequency.linearRampToValueAtTime(55, this.context.currentTime + duration);

    gain.gain.setValueAtTime(0.1, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playScore() {
    if (!this.enabled) return;
    this.init();
    const notes = [440, 554.37, 659.25, 880]; // A Major
    notes.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.context.currentTime + i * 0.1);

      gain.gain.setValueAtTime(0.05, this.context.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5 + i * 0.1);

      osc.connect(gain);
      gain.connect(this.context.destination);

      osc.start(this.context.currentTime + i * 0.1);
      osc.stop(this.context.currentTime + 0.5 + i * 0.1);
    });
  }
}

export const audio = new AudioManager();
