import Phaser from 'phaser';
import { Paintable, PaintMark } from '../components/Paintable';

/**
 * PaintableWall Entity
 * A wall surface that can receive graffiti tags.
 * Uses the Paintable component for paint logic.
 */

export class PaintableWall extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.StaticBody;
  private paintable: Paintable;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'wall_paintable');

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.paintable = new Paintable(scene, this);
    this.setupVisual();
  }

  private setupVisual(): void {
    this.setTint(0x4a4a6a);
  }

  canPaint(): boolean {
    return this.paintable.canPaint();
  }

  paint(tagIndex: number): boolean {
    const mark = this.paintable.paint(tagIndex);
    
    if (mark) {
      this.onPainted(mark);
      return true;
    }
    
    return false;
  }

  private onPainted(_mark: PaintMark): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0.8,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.setTint(0xffffff);
      },
    });
  }

  isPainted(): boolean {
    return this.paintable.isPainted();
  }

  destroy(fromScene?: boolean): void {
    this.paintable.destroy();
    super.destroy(fromScene);
  }
}
