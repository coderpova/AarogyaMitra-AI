class AudioSynth {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playMedication() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Soft, calm 2-chime arpeggio (E5 -> G5)
    this.playTone(659.25, now, 0.18, "sine");
    this.playTone(783.99, now + 0.16, 0.35, "sine");
  }

  playAppointment() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Calendar reminder tone (3-chime arpeggio: A4 -> C#5 -> E5)
    this.playTone(440, now, 0.12, "sine");
    this.playTone(554.37, now + 0.12, 0.12, "sine");
    this.playTone(659.25, now + 0.24, 0.3, "sine");
  }

  playEmergency() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Professional, controlled alert tone (alternating wave: D5 -> B4 -> D5)
    this.playTone(587.33, now, 0.15, "triangle");
    this.playTone(493.88, now + 0.18, 0.15, "triangle");
    this.playTone(587.33, now + 0.36, 0.4, "triangle");
  }

  playMessage() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Subtle single G5 notification
    this.playTone(783.99, now, 0.25, "sine");
  }

  playSecurity() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Double beep: A5 -> C6
    this.playTone(880, now, 0.08, "sine");
    this.playTone(1046.5, now + 0.08, 0.18, "sine");
  }

  playSystem() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Neutral click: F4
    this.playTone(349.23, now, 0.1, "sine");
  }

  private playTone(freq: number, start: number, duration: number, type: OscillatorType = "sine") {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      // Prevent pop clicks: linear rise, exponential decay
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.02); // Controlled volume
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    } catch (e) {
      console.error("AudioSynth failed to play tone:", e);
    }
  }
}

export const audioSynth = new AudioSynth();
