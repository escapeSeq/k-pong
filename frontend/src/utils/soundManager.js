class SoundManager {
  constructor() {
    this.hitSound = new Audio('/sounds/hit2.mp3');
    this.scoreSound = new Audio('/sounds/score2.mp3');
    this.loadSound = new Audio('/sounds/load2.mp3');
    this.gameOverSound = new Audio('/sounds/gameover3.mp3');
    this.introSound = new Audio('/sounds/intro2.mp3');
    
    this.audioContext = null;
    this.oscillators = [];
    this.gainNodes = [];
    this.rhythmIntervals = [];
    
    this.defaultGenome = "aslkajd asklja lskj ask aslkj aldka lskdjaslkdj ";
    
    this.isGenomeAudioPlaying = false;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Audio context created:', this.audioContext.state);
    } catch (e) {
      console.error('Failed to create audio context:', e);
    }
  }

  async playWithErrorHandling(playFunction, fallbackMessage = '') {
    try {
      await playFunction();
    } catch (error) {
      console.warn(`Sound playback failed: ${fallbackMessage}`, error);
    }
  }

  startBackgroundMusic() {
    this.startGenomeAudio(this.defaultGenome);
  }

  startGenomeAudio(genome = null) {
    return this.createRhythmicSound(genome || this.defaultGenome);
  }

  startSimpleGenomeAudio(genome = null) {
    return this.createRhythmicSound(genome || this.defaultGenome);
  }

  createRhythmicSound(genome) {
    try {
      this.stopAll();
      
      if (!this.audioContext) {
        try {
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          console.error('Failed to create audio context:', e);
          return;
        }
      }
      
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(e => {
          console.error('Failed to resume audio context:', e);
        });
      }
      
      console.log('Creating faster rhythmic sound with genome:', genome);
      
      const baseFreq = 80 + (Math.abs(this.hashCode(genome)) % 80);
      console.log('Base frequency:', baseFreq);
      
      const tempoFactor = 0.3 + (Math.abs(this.hashCode(genome.substring(0, 10))) % 0.2);
      const beatInterval = 300 * tempoFactor;
      console.log('Beat interval:', beatInterval);
      
      const mainSequence = this.generateLongerSequence(genome, 16);
      const bassSequence = this.generateLongerSequence(genome.split('').reverse().join(''), 12);
      const accentSequence = this.generateLongerSequence(genome.substring(5) + genome.substring(0, 5), 10);
      
      console.log('Main sequence length:', mainSequence.length);
      console.log('Bass sequence length:', bassSequence.length);
      console.log('Accent sequence length:', accentSequence.length);
      
      const patternLength = this.lcm(
        this.lcm(mainSequence.length, bassSequence.length), 
        accentSequence.length
      );
      
      console.log('Total pattern length (beats):', patternLength);
      console.log('Pattern duration (seconds):', (patternLength * beatInterval) / 1000);
      
      let currentBeat = 0;
      const mainRhythmInterval = setInterval(() => {
        if (!this.isGenomeAudioPlaying) {
          clearInterval(mainRhythmInterval);
          return;
        }
        
        const mainIndex = currentBeat % mainSequence.length;
        const mainNote = mainSequence[mainIndex];
        
        if (mainNote.volume > 0) {
          this.playNote(
            baseFreq * mainNote.frequency, 
            mainNote.duration * beatInterval * 0.85,
            mainNote.volume,
            'triangle'
          );
        }
        
        currentBeat++;
      }, beatInterval);
      
      let bassBeat = 0;
      const bassRhythmInterval = setInterval(() => {
        if (!this.isGenomeAudioPlaying) {
          clearInterval(bassRhythmInterval);
          return;
        }
        
        const bassIndex = bassBeat % bassSequence.length;
        const bassNote = bassSequence[bassIndex];
        
        if (bassNote.volume > 0) {
          this.playNote(
            (baseFreq * 0.75) * bassNote.frequency, 
            bassNote.duration * beatInterval * 0.9,
            bassNote.volume * 1.2,
            'sine'
          );
        }
        
        bassBeat++;
      }, beatInterval * 1.5);
      
      let accentBeat = 0;
      const accentRhythmInterval = setInterval(() => {
        if (!this.isGenomeAudioPlaying) {
          clearInterval(accentRhythmInterval);
          return;
        }
        
        const accentIndex = accentBeat % accentSequence.length;
        const accentNote = accentSequence[accentIndex];
        
        if (accentNote.volume > 0.15) {
          this.playNote(
            baseFreq * 1.5 * accentNote.frequency,
            accentNote.duration * beatInterval * 0.4,
            accentNote.volume * 0.9,
            'square'
          );
        }
        
        accentBeat++;
      }, beatInterval * 2);
      
      this.rhythmIntervals.push(mainRhythmInterval, bassRhythmInterval, accentRhythmInterval);
      
      this.createBassDrone(baseFreq * 0.5);
      
      this.createRhythmicPercussion(beatInterval, genome);
      
      this.isGenomeAudioPlaying = true;
      console.log('Faster rhythmic genome audio started successfully');
    } catch (error) {
      console.error('Error creating rhythmic sound:', error);
    }
  }

  generateLongerSequence(genome, length = 16) {
    const sequence = [];
    const possibleFrequencies = [0.5, 0.66, 0.75, 0.8, 1, 1.125, 1.25, 1.33, 1.5];
    
    let extendedGenome = genome;
    while (extendedGenome.length < length * 3) {
      extendedGenome += genome;
    }
    
    for (let i = 0; i < length * 2; i += 2) {
      if (i + 1 >= extendedGenome.length) break;
      
      const char1 = extendedGenome.charCodeAt(i % extendedGenome.length);
      const char2 = extendedGenome.charCodeAt((i + 1) % extendedGenome.length);
      const char3 = extendedGenome.charCodeAt((i + 2) % extendedGenome.length);
      
      const freqIndex = char1 % possibleFrequencies.length;
      const frequency = possibleFrequencies[freqIndex];
      
      const durationOptions = [0.5, 1, 1.5];
      const durIndex = char2 % durationOptions.length;
      const duration = durationOptions[durIndex];
      
      const volume = (char3 % 100) < 15 ? 0 : (0.1 + ((char1 + char2) % 25) / 100);
      
      sequence.push({ frequency, duration, volume });
      
      if (sequence.length >= length) break;
    }
    
    while (sequence.length < length) {
      sequence.push({ frequency: 1, duration: 1, volume: 0.2 });
    }
    
    return sequence;
  }

  playNote(frequency, duration, volume, waveType = 'triangle') {
    try {
      if (!this.audioContext) return;
      
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      osc.type = waveType;
      osc.frequency.value = frequency;
      
      gainNode.gain.value = 0;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(volume * 0.7, this.audioContext.currentTime + (duration * 0.2) / 1000);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);
      
      osc.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      osc.start();
      osc.stop(this.audioContext.currentTime + (duration + 50) / 1000);
      
      osc.onended = () => {
        osc.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('Error playing note:', error);
    }
  }

  createBassDrone(frequency) {
    try {
      if (!this.audioContext) return;
      
      const osc = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency;
      
      gainNode.gain.value = 0.06;
      
      osc.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      osc.start();
      
      this.oscillators.push(osc);
      this.gainNodes.push(gainNode);
      
      console.log('Bass drone created at frequency:', frequency);
    } catch (error) {
      console.error('Error creating bass drone:', error);
    }
  }

  createRhythmicPercussion(beatInterval, genome) {
    try {
      if (!this.audioContext) return;
      
      const frequencies = [
        baseFreq * 1,
        baseFreq * 1.5,
        baseFreq * 2,
        baseFreq * 2.5
      ];
      
      const detuneValues = [];
      for (let i = 0; i < 4; i++) {
        const startPos = i * 5;
        const genomeSlice = genome.substring(startPos, startPos + 5);
        const detune = Math.abs(this.hashCode(genomeSlice)) % 20 - 10;
        detuneValues.push(detune);
      }
      
      for (let i = 0; i < frequencies.length; i++) {
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = frequencies[i];
        osc.detune.value = detuneValues[i];
        
        gainNode.gain.value = 0.04 - (i * 0.005);
        
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        
        lfo.frequency.value = 0.05 + (i * 0.02);
        lfoGain.gain.value = 0.02;
        
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.start();
        lfo.start();
        
        this.oscillators.push(osc, lfo);
        this.gainNodes.push(gainNode, lfoGain);
      }
      
      console.log('Evolving pad created');
    } catch (error) {
      console.error('Error creating evolving pad:', error);
    }
  }

  lcm(a, b) {
    return (a * b) / this.gcd(a, b);
  }

  gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  stopAll() {
    if (this.oscillators && this.oscillators.length > 0) {
      console.log('Stopping', this.oscillators.length, 'oscillators');
      
      for (let i = 0; i < this.oscillators.length; i++) {
        try {
          this.oscillators[i].stop();
          this.oscillators[i].disconnect();
        } catch (e) {
          console.warn('Error stopping oscillator:', e);
        }
      }
      
      this.oscillators = [];
      this.gainNodes = [];
    }
    
    if (this.rhythmIntervals && this.rhythmIntervals.length > 0) {
      console.log('Clearing', this.rhythmIntervals.length, 'rhythm intervals');
      
      for (let i = 0; i < this.rhythmIntervals.length; i++) {
        clearInterval(this.rhythmIntervals[i]);
      }
      
      this.rhythmIntervals = [];
    }
    
    this.isGenomeAudioPlaying = false;
    
    try {
      this.hitSound.pause();
      this.scoreSound.pause();
      this.loadSound.pause();
      this.gameOverSound.pause();
      this.introSound.pause();
    } catch (e) {
      console.warn('Error stopping sound effects:', e);
    }
  }

  stopGenomeAudio() {
    this.stopAll();
  }

  playHitSound() {
    return this.playWithErrorHandling(
      () => {
        this.hitSound.currentTime = 0;
        this.hitSound.play();
      },
      'Hit sound failed'
    );
  }

  playScoreSound() {
    this.scoreSound.currentTime = 0;
    this.scoreSound.play();
  }

  playLoadSound() {
    return this.playWithErrorHandling(
      () => {
        this.loadSound.currentTime = 0;
        this.loadSound.play();
      },
      'Load sound failed'
    );
  }

  playGameOverSound() {
    this.gameOverSound.currentTime = 0;
    this.gameOverSound.play();
  }

  playIntroSound() {
    this.introSound.currentTime = 0;
    return this.introSound.play();
  }
  
  hashCode(str) {
    if (!str || str.length === 0) return 0;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

export default new SoundManager(); 