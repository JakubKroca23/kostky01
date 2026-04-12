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
    const now = this.context.currentTime;
    const duration = 1.2;
    
    // Low rumble noise
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    noise.start();
    noise.stop(now + duration);

    // Add random clacks
    for (let i = 0; i < 6; i++) {
       const delay = Math.random() * 0.8;
       const osc = this.context.createOscillator();
       const cGain = this.context.createGain();
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(150 + Math.random() * 200, now + delay);
       osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.05);
       
       cGain.gain.setValueAtTime(0.05, now + delay);
       cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);
       
       osc.connect(cGain);
       cGain.connect(this.context.destination);
       osc.start(now + delay);
       osc.stop(now + delay + 0.05);
    }
  }

  playBust() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    const duration = 0.8;
    
    // Aggressive buzzing failure sound
    [110, 107, 103].forEach(freq => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, now + duration);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + duration);
      
      // Filter for "grit"
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.linearRampToValueAtTime(200, now + duration);
      filter.Q.value = 10;
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.context.destination);
      
      osc.start();
      osc.stop(now + duration);
    });
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

  playSteal() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    
    // Sharp metal slide
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.4);
  }

  playStrike() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;

    // Deep heavy impact
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.3);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.4);

    // Crackle noise
    this.playBust();
  }

  playStraight() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    
    scale.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const delay = i * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gain.gain.setValueAtTime(0.06, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
  }

  playDoubleStart() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 0.5);
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
