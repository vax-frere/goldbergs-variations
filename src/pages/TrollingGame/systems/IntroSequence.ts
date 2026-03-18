import { PlayerStates } from '../core/PlayerState';

/**
 * 🎯 SOLID REFACTOR: IntroSequence générique
 * Responsabilité unique : gérer l'entrée du joueur par la gauche
 * Découplé du tutorial via events
 */
export class IntroSequence {
  scene: any;
  player: any;
  level: any;
  isActive: boolean = false;
  targetX: number | null = null;
  targetReached: boolean = false;
  wallsReactivated: boolean = false;
  npcMigrationComplete: boolean = false;
  config: { pauseDuration: number } = {
    pauseDuration: 500,
  };
  fallbackTimer: any = null;

  constructor(scene: any, player: any, level: any = null) {
    this.scene = scene;
    this.player = player;
    this.level = level;

    this.scene.events.on('npcMigrationComplete', () => {
      this.npcMigrationComplete = true;
      this.checkIntroComplete();
    });
  }

  start(targetX: number, targetY: number): void {
    if (this.isActive) return;

    this.isActive = true;
    this.targetX = targetX;
    this.targetReached = false;

    const playerWidth = this.player.sprite.displayWidth || 64;
    const startX = -playerWidth - 50;

    this.player.setPosition(startX, targetY);
    this.disableWorldBounds();
    this.player.playerState.setState(PlayerStates.INTRO);

    this.scene.events.emit('playerIntroStarted', {
      playerStartX: startX,
      playerTargetX: targetX,
      estimatedDuration: ((targetX - startX) / (this.player.speed || 150)) * 1000,
    });

    this.startPlayerMovement();
  }

  startPlayerMovement(): void {
    this.player.setMovement({ right: true, up: false, down: false, left: false }, true);
  }

  update(): void {
    if (!this.isActive || this.targetReached) return;

    if (this.player.sprite.x >= this.targetX!) {
      this.targetReached = true;
      this.onTargetReached();
    }
  }

  onTargetReached(): void {
    this.stopPlayerMovement();

    this.scene.time.delayedCall(this.config.pauseDuration, () => {
      this.endIntroSequence();
    });
  }

  stopPlayerMovement(): void {
    this.player.setMovement({ right: false, up: false, down: false, left: false }, true);
  }

  endIntroSequence(): void {
    this.isActive = false;

    this.scene.events.emit('playerArrivedAtDestination');

    if (this.npcMigrationComplete) {
      this.activateLevel();
    } else {
      this.scene.events.once('npcMigrationComplete', () => {
        this.activateLevel();
      });
    }

    this.fallbackTimer = this.scene.time.delayedCall(5000, () => {
      if (!this.wallsReactivated) {
        console.warn('⚠️ Timeout sécurité : réactivation forcée');
        this.reactivateWallsAndBounds();
      }
    });

    this.checkIntroComplete();
  }

  activateLevel(): void {
    this.scene.events.emit('introSequenceComplete');

    console.log('🎮 IntroSequence terminée - niveau peut prendre le contrôle');
  }

  checkIntroComplete(): void {
    if (!this.isActive && this.npcMigrationComplete) {
      this.reactivateWallsAndBounds();
    }
  }

  reactivateWallsAndBounds(): void {
    if (this.wallsReactivated) return;

    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }

    this.enableWorldBounds();

    if (this.level && this.level.enablePerimeterWalls) {
      this.level.enablePerimeterWalls();
    }

    this.wallsReactivated = true;
    this.scene.events.emit('introCompletelyFinished');
  }

  disableWorldBounds(): void {
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(false);
    }

    if (this.level && this.level.disablePerimeterWalls) {
      this.level.disablePerimeterWalls();
    }

    if (this.level && this.level.disableWorldBoundsForAllNpcs) {
      this.level.disableWorldBoundsForAllNpcs();
    }
  }

  enableWorldBounds(): void {
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(true);
    }

    if (this.level && this.level.enableWorldBoundsForAllNpcs) {
      this.level.enableWorldBoundsForAllNpcs();
    }
  }

  destroy(): void {
    this.isActive = false;
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }
  }
}
