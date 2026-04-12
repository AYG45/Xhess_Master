import { Howl } from 'howler';

export class ChessSounds {
  private enabled: boolean = true;
  private sounds: Map<string, Howl> = new Map();
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initSounds();
    }
  }

  private initSounds() {
    // Define sound configurations - mapped to actual files in public/sounds/
    const soundConfigs = [
      // Regular piece move (note: you have move.mp3.wav - consider renaming to move.wav or move.mp3)
      { name: 'move', src: ['/sounds/move.mp3.wav', '/sounds/move.wav', '/sounds/move.mp3', '/sounds/move.ogg'] },
      // Piece capture
      { name: 'capture', src: ['/sounds/capture.mp3', '/sounds/capture.wav', '/sounds/capture.ogg'] },
      // King in check (using your move-check.mp3)
      { name: 'check', src: ['/sounds/move-check.mp3', '/sounds/check.mp3', '/sounds/check.wav', '/sounds/check.ogg'] },
      // Checkmate (reusing capture sound if no specific file exists)
      { name: 'checkmate', src: ['/sounds/checkmate.mp3', '/sounds/move-check.mp3', '/sounds/capture.mp3'] },
      // Game start
      { name: 'start', src: ['/sounds/start.mp3', '/sounds/start.wav', '/sounds/start.ogg'] },
      // Illegal move (subtle error - using check sound or silent)
      { name: 'illegal', src: ['/sounds/illegal.mp3', '/sounds/move-check.mp3'] },
      // Castling (special move sound)
      { name: 'castle', src: ['/sounds/castle.mp3', '/sounds/castle.wav', '/sounds/castle.ogg', '/sounds/move.mp3.wav'] },
      // Pawn promotion
      { name: 'promote', src: ['/sounds/promote.mp3', '/sounds/promote.wav', '/sounds/promote.ogg', '/sounds/capture.mp3'] },
    ];

    // Initialize Howl instances
    for (const config of soundConfigs) {
      const howl = new Howl({
        src: config.src,
        volume: 0.5,
        html5: true, // Force HTML5 Audio for better mobile compatibility
        preload: true,
        onloaderror: () => {
          console.warn(`Sound file not found: ${config.name}`);
        },
      });
      this.sounds.set(config.name, howl);
    }

    this.initialized = true;
  }

  private play(name: string) {
    if (!this.enabled || !this.initialized) return;
    
    const sound = this.sounds.get(name);
    if (sound && sound.state() === 'loaded') {
      // Stop any currently playing instance of this sound
      sound.stop();
      sound.play();
    }
  }

  // Move sound - piece movement
  playMove() {
    this.play('move');
  }

  // Capture sound - piece capture
  playCapture() {
    this.play('capture');
  }

  // Check sound - king in check
  playCheck() {
    this.play('check');
  }

  // Checkmate sound - game ending
  playCheckmate() {
    this.play('checkmate');
  }

  // Game start sound
  playGameStart() {
    this.play('start');
  }

  // Illegal move sound
  playIllegalMove() {
    this.play('illegal');
  }

  // Castle sound - castling move
  playCastle() {
    this.play('castle');
  }

  // Promotion sound - pawn promotion
  playPromote() {
    this.play('promote');
  }

  // Toggle sounds on/off
  toggle() {
    this.enabled = !this.enabled;
    
    // Mute/unmute all sounds
    for (const sound of this.sounds.values()) {
      sound.mute(!this.enabled);
    }
    
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    
    for (const sound of this.sounds.values()) {
      sound.mute(!enabled);
    }
  }

  // Get volume for a specific sound
  getVolume(soundName: string): number {
    const sound = this.sounds.get(soundName);
    return sound ? sound.volume() : 0;
  }

  // Set volume for a specific sound (0.0 to 1.0)
  setVolume(soundName: string, volume: number) {
    const sound = this.sounds.get(soundName);
    if (sound) {
      sound.volume(Math.max(0, Math.min(1, volume)));
    }
  }

  // Set global volume for all sounds
  setGlobalVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    for (const sound of this.sounds.values()) {
      sound.volume(clamped);
    }
  }
}

// Create singleton instance
export const chessSounds = new ChessSounds();
