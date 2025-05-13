class SoundManager {
  constructor() {
    this.bgMusic = new Audio('/sounds/background2.mp3');
    this.hitSound = new Audio('/sounds/hit2.mp3');
    this.scoreSound = new Audio('/sounds/score2.mp3');
    this.loadSound = new Audio('/sounds/load2.mp3');
    this.gameOverSound = new Audio('/sounds/gameover3.mp3');
    this.introSound = new Audio('/sounds/intro2.mp3');
    
    this.bgMusic.loop = true;
  }

  startBackgroundMusic() {
    this.bgMusic.play();
  }

  playHitSound() {
    this.hitSound.currentTime = 0;
    this.hitSound.play();
  }

  playScoreSound() {
    this.scoreSound.currentTime = 0;
    this.scoreSound.play();
  }

  playLoadSound() {
    this.loadSound.currentTime = 0;
    this.loadSound.play();
  }

  playGameOverSound() {
    this.gameOverSound.currentTime = 0;
    this.gameOverSound.play();
  }

  playIntroSound() {
    this.introSound.currentTime = 0;
    return this.introSound.play();
  }

  stopAll() {
    this.bgMusic.pause();
    this.bgMusic.currentTime = 0;
  }
}

export default new SoundManager(); 