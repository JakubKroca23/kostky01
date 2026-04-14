class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  init() {
    try {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.context = new AudioContextClass();
      }
      
      if (this.context.state === 'suspended' || this.context.state === 'interrupted') {
        this.context.resume();
      }

      // iOS Unlock: Standard approach for mobile Safari
      if (!this.unlocked) {
        const buffer = this.context.createBuffer(1, 1, 22050);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.connect(this.context.destination);
        if (source.start) {
          source.start(0);
        } else {
          source.noteOn(0);
        }
        
        // Mark as unlocked if we reached here
        this.unlocked = true;
        console.log("Audio Unlocked for iOS/Safari");
      }
    } catch (e) {
      console.error("Audio Init Error:", e);
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
    const duration = 1.0;
    
    // Deeper rumble
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    const noise = this.context.createBufferSource();
    const buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    noise.start();

    // More realistic multiple clacks
    for (let i = 0; i < 8; i++) {
       const delay = i * 0.12;
       const osc = this.context.createOscillator();
       const cGain = this.context.createGain();
       osc.type = 'square'; // Sharper sound
       osc.frequency.setValueAtTime(200 + Math.random() * 400, now + delay);
       osc.frequency.exponentialRampToValueAtTime(50, now + delay + 0.04);
       
       cGain.gain.setValueAtTime(0.04, now + delay);
       cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);
       
       osc.connect(cGain);
       cGain.connect(this.context.destination);
       osc.start(now + delay);
       osc.stop(now + delay + 0.04);
    }
  }

  playBust() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    
    // Low, depressing downward slide
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(40, now + 1.2);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.2);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    osc.stop(now + 1.2);

    // Complementary "honk" noise
    const osc2 = this.context.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(70, now);
    osc2.connect(gain);
    osc2.start();
    osc2.stop(now + 1.2);
  }

  playBotMove() {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    
    // High-pitched "UI processing" bleep bloop
    const notes = [1200, 1600, 1000];
    notes.forEach((freq, i) => {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.015, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.05);
        osc.connect(gain);
        gain.connect(this.context.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.05);
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
