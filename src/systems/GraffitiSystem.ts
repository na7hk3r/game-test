import Phaser from 'phaser';
import { PaintableWall } from '../entities/PaintableWall';
import { Player } from '../entities/Player';

/**
 * GraffitiSystem
 * Manages all graffiti interactions in the game.
 * Handles proximity detection, painting actions, and persistence.
 */

export interface GraffitiEvent {
  wall: PaintableWall;
  tagIndex: number;
  position: { x: number; y: number };
}

export class GraffitiSystem {
  private walls: PaintableWall[] = [];
  private player: Player | null = null;
  private interactionRadius: number = 24;
  private currentTarget: PaintableWall | null = null;
  private indicator: Phaser.GameObjects.Text | null = null;
  private selectedTag: number = 0;
  private totalTags: number = 2; // Now only 2 tags from ANS files (+ fallback)

  // Tag names for display
  private tagNames: string[] = ['TAG', 'PIECE'];

  // Event emitter for external listeners
  private events: Phaser.Events.EventEmitter;

  constructor(private scene: Phaser.Scene) {
    this.events = new Phaser.Events.EventEmitter();
    this.createIndicator();
  }

  private createIndicator(): void {
    this.indicator = this.scene.add.text(0, 0, '[E] TAG', {
      fontSize: '6px',
      color: '#ff00ff',
      fontFamily: 'monospace',
      backgroundColor: '#000000cc',
      padding: { x: 2, y: 1 },
    });
    this.indicator.setDepth(100);
    this.indicator.setVisible(false);
    this.indicator.setOrigin(0.5, 1);
  }

  registerWall(wall: PaintableWall): void {
    this.walls.push(wall);
  }

  registerPlayer(player: Player): void {
    this.player = player;
  }

  update(): void {
    if (!this.player) return;

    this.currentTarget = this.findNearestPaintableWall();
    this.updateIndicator();
  }

  private findNearestPaintableWall(): PaintableWall | null {
    if (!this.player) return null;

    let nearest: PaintableWall | null = null;
    let nearestDist = this.interactionRadius;

    for (const wall of this.walls) {
      if (!wall.canPaint()) continue;

      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        wall.x,
        wall.y
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = wall;
      }
    }

    return nearest;
  }

  private updateIndicator(): void {
    if (!this.indicator) return;

    if (this.currentTarget) {
      const tagName = this.tagNames[this.selectedTag] || 'TAG';
      this.indicator.setText(`[E] ${tagName}`);
      this.indicator.setPosition(
        this.currentTarget.x,
        this.currentTarget.y - 12
      );
      this.indicator.setVisible(true);
    } else {
      this.indicator.setVisible(false);
    }
  }

  tryPaint(): boolean {
    if (!this.currentTarget) return false;

    const success = this.currentTarget.paint(this.selectedTag);
    
    if (success) {
      this.events.emit('painted', {
        wall: this.currentTarget,
        tagIndex: this.selectedTag,
        position: { x: this.currentTarget.x, y: this.currentTarget.y },
      } as GraffitiEvent);

      this.currentTarget = null;
      return true;
    }

    return false;
  }

  cycleTag(): void {
    this.selectedTag = (this.selectedTag + 1) % this.totalTags;
    this.events.emit('tagChanged', this.selectedTag);
  }

  getSelectedTag(): number {
    return this.selectedTag;
  }

  hasTarget(): boolean {
    return this.currentTarget !== null;
  }

  onPainted(callback: (event: GraffitiEvent) => void): void {
    this.events.on('painted', callback);
  }

  onTagChanged(callback: (tagIndex: number) => void): void {
    this.events.on('tagChanged', callback);
  }

  getPaintedCount(): number {
    return this.walls.filter(w => !w.canPaint()).length;
  }

  destroy(): void {
    this.indicator?.destroy();
    this.events.destroy();
  }
}
