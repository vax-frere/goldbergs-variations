/**
 * 🎯 SOLID REFACTOR: PlayerDebugRenderer
 * Responsabilité unique : Gérer l'affichage des éléments de debug pour le joueur
 */
export class PlayerDebugRenderer {
  player: any;
  scene: any;
  sprite: any;
  shoutRadiusDebugGraphic: any;
  tremblingRadiusDebugGraphic: any;
  shoutRadiusDebugText: any;
  tremblingRadiusDebugText: any;
  isDebugEnabled: boolean;
  DEBUG_BASE_INDEX: number;

  constructor(player: any) {
    this.player = player;
    this.scene = player.scene;
    this.sprite = player.sprite;

    this.shoutRadiusDebugGraphic = null;
    this.tremblingRadiusDebugGraphic = null;
    this.shoutRadiusDebugText = null;
    this.tremblingRadiusDebugText = null;

    this.isDebugEnabled = false;

    this.DEBUG_BASE_INDEX = 10000;

    console.log('🔧 PlayerDebugRenderer initialisé');
  }

  setDebugEnabled(enabled: boolean): void {
    this.isDebugEnabled = enabled;

    if (enabled) {
      this.createDebugVisuals();
    } else {
      this.destroyDebugVisuals();
    }

    console.log(`🔧 Debug Player ${enabled ? 'activé' : 'désactivé'}`);
  }

  createDebugVisuals(): void {
    this.createShoutRadiusDebug();
    this.createTremblingRadiusDebug();
  }

  createShoutRadiusDebug(): void {
    if (this.shoutRadiusDebugGraphic) {
      this.destroyShoutRadiusDebug();
    }

    this.shoutRadiusDebugGraphic = this.scene.add.graphics();
    this.shoutRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 1);

    this.shoutRadiusDebugText = this.scene.add.text(0, 0, '', {
      fontSize: '12px',
      fill: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    });
    this.shoutRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 2);
    this.shoutRadiusDebugText.setOrigin(0.5, 0.5);

    console.log('🔧 Debug rayon de cri créé');
  }

  createTremblingRadiusDebug(): void {
    if (this.tremblingRadiusDebugGraphic) {
      this.destroyTremblingRadiusDebug();
    }

    this.tremblingRadiusDebugGraphic = this.scene.add.graphics();
    this.tremblingRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 3);

    this.tremblingRadiusDebugText = this.scene.add.text(0, 0, '', {
      fontSize: '10px',
      fill: '#ffaa00',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 },
    });
    this.tremblingRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 4);
    this.tremblingRadiusDebugText.setOrigin(0.5, 0.5);

    console.log('🔧 Debug rayon collision trembling créé');
  }

  updateShoutRadiusDebug(): void {
    if (!this.isDebugEnabled || !this.shoutRadiusDebugGraphic || !this.sprite) return;

    if (!this.shoutRadiusDebugText) return;

    const radius = this.player.forceCalculator
      ? this.player.forceCalculator.getCurrentShoutRadius()
      : 125;
    const force = this.player.forceCalculator
      ? this.player.forceCalculator.getCurrentShoutForce()
      : 1.0;

    this.shoutRadiusDebugGraphic.clear();
    this.shoutRadiusDebugGraphic.lineStyle(2, 0x00ff00, 0.7);
    this.shoutRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, radius);

    if (this.shoutRadiusDebugText) {
      this.shoutRadiusDebugText.setPosition(
        this.sprite.x,
        this.sprite.y - radius - 20
      );
      this.shoutRadiusDebugText.setText(`R: ${radius.toFixed(1)} F: ${force.toFixed(2)}`);
    }
  }

  updateTremblingRadiusDebug(): void {
    if (!this.isDebugEnabled || !this.tremblingRadiusDebugGraphic || !this.sprite) return;

    if (!this.tremblingRadiusDebugText) return;

    const radius = this.player.collisionDetector
      ? this.player.collisionDetector.getTremblingCollisionRadius()
      : 70;

    this.tremblingRadiusDebugGraphic.clear();
    this.tremblingRadiusDebugGraphic.lineStyle(2, 0xffaa00, 0.5);
    this.tremblingRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, radius);

    if (this.tremblingRadiusDebugText) {
      this.tremblingRadiusDebugText.setPosition(
        this.sprite.x + radius + 10,
        this.sprite.y
      );
      this.tremblingRadiusDebugText.setText(`T: ${radius.toFixed(1)}`);
    }
  }

  drawDebugInfo(): void {
    if (!this.isDebugEnabled) return;

    const followerCount = this.player.followerManager
      ? this.player.followerManager.getFollowerCount()
      : 0;

    const velocity = this.player.movementController
      ? this.player.movementController.velocity
      : { x: 0, y: 0 };

    console.log(
      `🔧 DEBUG Player - Pos: (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}) Vel: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}) Followers: ${followerCount}`
    );
  }

  destroyShoutRadiusDebug(): void {
    if (this.shoutRadiusDebugGraphic) {
      this.shoutRadiusDebugGraphic.destroy();
      this.shoutRadiusDebugGraphic = null;
    }

    if (this.shoutRadiusDebugText) {
      this.shoutRadiusDebugText.destroy();
      this.shoutRadiusDebugText = null;
    }
  }

  destroyTremblingRadiusDebug(): void {
    if (this.tremblingRadiusDebugGraphic) {
      this.tremblingRadiusDebugGraphic.destroy();
      this.tremblingRadiusDebugGraphic = null;
    }

    if (this.tremblingRadiusDebugText) {
      this.tremblingRadiusDebugText.destroy();
      this.tremblingRadiusDebugText = null;
    }
  }

  destroyDebugVisuals(): void {
    this.destroyShoutRadiusDebug();
    this.destroyTremblingRadiusDebug();
  }

  update(_delta: number): void {
    if (!this.isDebugEnabled) return;

    this.updateShoutRadiusDebug();
    this.updateTremblingRadiusDebug();

    if (Math.random() < 0.02) {
      this.drawDebugInfo();
    }
  }

  forceUpdateDebugVisuals(): void {
    if (!this.isDebugEnabled) return;

    this.updateShoutRadiusDebug();
    this.updateTremblingRadiusDebug();
  }

  getDebugStatus(): Record<string, boolean> {
    return {
      enabled: this.isDebugEnabled,
      shoutRadius: !!this.shoutRadiusDebugGraphic,
      tremblingRadius: !!this.tremblingRadiusDebugGraphic,
      shoutText: !!this.shoutRadiusDebugText,
      tremblingText: !!this.tremblingRadiusDebugText,
    };
  }

  destroy(): void {
    this.destroyDebugVisuals();
    console.log('🚮 PlayerDebugRenderer détruit');
  }
}
