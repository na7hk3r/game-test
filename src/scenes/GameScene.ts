import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { PaintableWall } from '../entities/PaintableWall';
import { GraffitiSystem } from '../systems/GraffitiSystem';
import { GraffitiHUD } from '../ui/GraffitiHUD';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private graffitiSystem!: GraffitiSystem;
  private graffitiHUD!: GraffitiHUD;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private cycleKey!: Phaser.Input.Keyboard.Key;
  private paintableWalls: PaintableWall[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.setupWorld();
    this.setupPlayer();
    this.setupGraffitiSystem();
    this.setupControls();
    this.setupCamera();
    this.setupHUD();
  }

  update(): void {
    this.player.update(this.cursors);
    this.graffitiSystem.update();
  }

  private setupWorld(): void {
    // Ground tiles
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 12; y++) {
        this.add.image(x * 16 + 8, y * 16 + 8, 'ground');
      }
    }

    // Border walls
    for (let x = 0; x < 20; x++) {
      this.add.image(x * 16 + 8, 8, 'wall');
      this.add.image(x * 16 + 8, 11 * 16 + 8, 'wall');
    }
  }

  private setupPlayer(): void {
    this.player = new Player(this, 160, 90);
  }

  private setupGraffitiSystem(): void {
    this.graffitiSystem = new GraffitiSystem(this);
    this.graffitiSystem.registerPlayer(this.player);
    this.createPaintableWalls();

    this.graffitiSystem.onPainted(() => {
      this.graffitiHUD?.updateCount(this.graffitiSystem.getPaintedCount());
    });

    this.graffitiSystem.onTagChanged((tagIndex) => {
      this.graffitiHUD?.updateSelectedTag(tagIndex);
    });
  }

  private createPaintableWalls(): void {
    const positions = [
      { x: 3, y: 3 }, { x: 3, y: 4 }, { x: 3, y: 5 },
      { x: 10, y: 5 }, { x: 10, y: 6 },
      { x: 16, y: 3 }, { x: 16, y: 4 }, { x: 16, y: 5 }, { x: 16, y: 6 },
      { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 10, y: 8 },
    ];

    for (const pos of positions) {
      const wall = new PaintableWall(this, pos.x * 16 + 8, pos.y * 16 + 8);
      this.paintableWalls.push(wall);
      this.graffitiSystem.registerWall(wall);
    }
  }

  private setupControls(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.actionKey.on('down', () => this.graffitiSystem.tryPaint());

    this.cycleKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.cycleKey.on('down', () => this.graffitiSystem.cycleTag());
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true);
    this.cameras.main.setZoom(1);
  }

  private setupHUD(): void {
    this.graffitiHUD = new GraffitiHUD(this);
  }
}
