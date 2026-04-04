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
  playVictory() {
    if (!this.enabled) return;
    this.init();

    // Fanfára: vzestupný akord s chvějivým efektem pro vítěznou obrazovku
    const fanfare = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
    fanfare.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const delay = i * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.context.currentTime + delay);

      gain.gain.setValueAtTime(0.0, this.context.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.07, this.context.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + delay + 0.6);

      osc.connect(gain);
      gain.connect(this.context.destination);

      osc.start(this.context.currentTime + delay);
      osc.stop(this.context.currentTime + delay + 0.65);
    });

    // Shimmer vrstva - lehký bílý šum pro texturu
    const shimmerDuration = 1.8;
    const bufferSize = this.context.sampleRate * shimmerDuration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const shimmer = this.context.createBufferSource();
    shimmer.buffer = buffer;

    const shimmerFilter = this.context.createBiquadFilter();
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.setValueAtTime(3000, this.context.currentTime);

    const shimmerGain = this.context.createGain();
    shimmerGain.gain.setValueAtTime(0.015, this.context.currentTime);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + shimmerDuration);

    shimmer.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(this.context.destination);

    shimmer.start();
    shimmer.stop(this.context.currentTime + shimmerDuration);
  }
}

export const audio = new AudioManager();
