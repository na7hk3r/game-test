import Phaser from 'phaser';

const PLAYER_SPEED = 80;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setupPhysics();
  }

  private setupPhysics(): void {
    this.body.setCollideWorldBounds(true);
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    this.handleMovement(cursors);
  }

  private handleMovement(cursors: Phaser.Types.Input.Keyboard.CursorKeys): void {
    const velocity = { x: 0, y: 0 };

    if (cursors.left.isDown) {
      velocity.x = -PLAYER_SPEED;
    } else if (cursors.right.isDown) {
      velocity.x = PLAYER_SPEED;
    }

    if (cursors.up.isDown) {
      velocity.y = -PLAYER_SPEED;
    } else if (cursors.down.isDown) {
      velocity.y = PLAYER_SPEED;
    }

    // Normalize diagonal movement
    if (velocity.x !== 0 && velocity.y !== 0) {
      velocity.x *= 0.707;
      velocity.y *= 0.707;
    }

    this.body.setVelocity(velocity.x, velocity.y);
  }
}
