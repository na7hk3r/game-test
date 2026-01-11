import Phaser from 'phaser';

/**
 * Paintable Component
 * Marks a surface as available for graffiti intervention.
 */

export interface PaintMark {
  id: string;
  tagIndex: number;
  timestamp: number;
}

export class Paintable {
  private painted: boolean = false;
  private marks: PaintMark[] = [];
  private overlay: Phaser.GameObjects.Sprite | null = null;

  constructor(
    private scene: Phaser.Scene,
    private target: Phaser.GameObjects.Sprite
  ) {}

  canPaint(): boolean {
    return !this.painted;
  }

  paint(tagIndex: number): PaintMark | null {
    if (this.painted) return null;

    const mark: PaintMark = {
      id: `mark_${Date.now()}`,
      tagIndex,
      timestamp: Date.now(),
    };

    this.marks.push(mark);
    this.painted = true;
    this.applyVisual(tagIndex);

    return mark;
  }

  private applyVisual(tagIndex: number): void {
    const textureKey = `tag_${tagIndex}`;
    
    if (this.scene.textures.exists(textureKey)) {
      this.overlay = this.scene.add.sprite(
        this.target.x,
        this.target.y,
        textureKey
      );
      this.overlay.setDepth(this.target.depth + 1);
      this.overlay.setAlpha(0.95);
      
      this.overlay.setScale(0.8);
      this.scene.tweens.add({
        targets: this.overlay,
        scale: 1,
        duration: 150,
        ease: 'Back.easeOut',
      });
    }
  }

  isPainted(): boolean {
    return this.painted;
  }

  getMarks(): PaintMark[] {
    return [...this.marks];
  }

  destroy(): void {
    this.overlay?.destroy();
  }
}
