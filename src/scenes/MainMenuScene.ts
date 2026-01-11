import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    this.setupTitle();
    this.setupControls();
  }

  private setupTitle(): void {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, centerY - 30, 'GRAFFITI & HACKING', {
      fontSize: '12px',
      color: '#00ffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 10, 'Press SPACE to start', {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private setupControls(): void {
    const spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    spaceKey?.once('down', () => {
      this.scene.start('GameScene');
    });
  }
}
