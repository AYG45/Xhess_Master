// Chess sounds using Web Audio API - generated sounds
export class ChessSounds {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  
  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initAudioContext();
    }
  }
  
  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }
  
  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  // Move sound - gentle click
  playMove() {
    this.playSound(800, 0.1, 'sine', 0.2);
    setTimeout(() => this.playSound(600, 0.1, 'sine', 0.15), 50);
  }
  
  // Capture sound - sharper, higher pitch
  playCapture() {
    this.playSound(1200, 0.15, 'square', 0.3);
    setTimeout(() => this.playSound(800, 0.1, 'square', 0.2), 50);
  }
  
  // Check sound - warning tone
  playCheck() {
    this.playSound(400, 0.2, 'sawtooth', 0.25);
    setTimeout(() => this.playSound(300, 0.2, 'sawtooth', 0.2), 100);
    setTimeout(() => this.playSound(400, 0.2, 'sawtooth', 0.15), 200);
  }
  
  // Checkmate sound - dramatic final sound
  playCheckmate() {
    this.playSound(500, 0.3, 'triangle', 0.3);
    setTimeout(() => this.playSound(400, 0.3, 'triangle', 0.25), 150);
    setTimeout(() => this.playSound(300, 0.4, 'triangle', 0.2), 300);
    setTimeout(() => this.playSound(200, 0.5, 'sine', 0.15), 500);
  }
  
  // Game start sound
  playGameStart() {
    this.playSound(600, 0.1, 'sine', 0.2);
    setTimeout(() => this.playSound(800, 0.1, 'sine', 0.25), 100);
    setTimeout(() => this.playSound(1000, 0.1, 'sine', 0.2), 200);
  }
  
  // Illegal move sound
  playIllegalMove() {
    this.playSound(200, 0.2, 'sawtooth', 0.3);
  }
  
  // Toggle sounds on/off
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
  
  isEnabled() {
    return this.enabled;
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Create singleton instance
export const chessSounds = new ChessSounds();
