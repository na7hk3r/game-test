import Phaser from 'phaser';
import { ANSIRenderer } from '../utils/ANSIRenderer';

// URLs for ANS files (loaded as binary)
const ANS_FILES = {
  tag: '/src/assets/sprites/nathker-tag.ans',
  piece: '/src/assets/sprites/ntkr.ans',
};

export class BootScene extends Phaser.Scene {
  private ansiRenderer!: ANSIRenderer;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createPlaceholderAssets();
  }

  async create(): Promise<void> {
    this.ansiRenderer = new ANSIRenderer();
    await this.loadANSITags();
    this.scene.start('MainMenuScene');
  }

  private async loadANSITags(): Promise<void> {
    try {
      // Load as binary ArrayBuffer to preserve CP437 bytes
      const [tagData, pieceData] = await Promise.all([
        this.loadANSFile(ANS_FILES.tag),
        this.loadANSFile(ANS_FILES.piece),
      ]);

      // Tag 0: Compact tag (32x24 pixels)
      this.ansiRenderer.renderFromBytes(this, 'tag_0', tagData, 32, 24);
      
      // Tag 1: Wide piece (6 lines × ~80 cols)
      // Original ratio: 640x96 pixels (8x16 per char) = 6.67:1
      // Scaled: 48x8 pixels maintains proportion
      this.ansiRenderer.renderFromBytes(this, 'tag_1', pieceData, 48, 8);
      
      console.log('ANSI tags loaded successfully');
    } catch (err) {
      console.error('Failed to load ANSI files:', err);
    }
  }

  private async loadANSFile(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private createPlaceholderAssets(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Player (cyan)
    graphics.fillStyle(0x00ffff);
    graphics.fillRect(0, 0, 16, 16);
    graphics.generateTexture('player', 16, 16);
    graphics.clear();

    // Wall (dark gray)
    graphics.fillStyle(0x3a3a5c);
    graphics.fillRect(0, 0, 16, 16);
    graphics.generateTexture('wall', 16, 16);
    graphics.clear();

    // Paintable wall (lighter with border)
    graphics.fillStyle(0x4a4a6a);
    graphics.fillRect(0, 0, 16, 16);
    graphics.lineStyle(1, 0x5a5a7a);
    graphics.strokeRect(0, 0, 16, 16);
    graphics.generateTexture('wall_paintable', 16, 16);
    graphics.clear();

    // Ground (darker)
    graphics.fillStyle(0x2a2a4e);
    graphics.fillRect(0, 0, 16, 16);
    graphics.generateTexture('ground', 16, 16);
    graphics.clear();

    graphics.destroy();
  }
}
