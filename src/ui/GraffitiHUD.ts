import Phaser from 'phaser';

/**
 * GraffitiHUD
 * Minimal diegetic UI for graffiti system.
 * Shows selected tag and painted count.
 */

export class GraffitiHUD {
  private container: Phaser.GameObjects.Container;
  private tagPreview: Phaser.GameObjects.Sprite;
  private countText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.container = scene.add.container(8, 8);
    this.container.setScrollFactor(0);
    this.container.setDepth(200);

    this.tagPreview = this.createTagPreview();
    this.countText = this.createCountText();

    this.container.add([this.tagPreview, this.countText]);
  }

  private createTagPreview(): Phaser.GameObjects.Sprite {
    const preview = this.scene.add.sprite(8, 8, 'tag_0');
    preview.setScale(1);
    return preview;
  }

  private createCountText(): Phaser.GameObjects.Text {
    const text = this.scene.add.text(20, 4, '0', {
      fontSize: '8px',
      color: '#00ffff',
      fontFamily: 'monospace',
    });
    return text;
  }

  updateSelectedTag(tagIndex: number): void {
    const textureKey = `tag_${tagIndex}`;
    if (this.scene.textures.exists(textureKey)) {
      this.tagPreview.setTexture(textureKey);
    }
  }

  updateCount(count: number): void {
    this.countText.setText(count.toString());
  }

  destroy(): void {
    this.container.destroy();
  }
}
