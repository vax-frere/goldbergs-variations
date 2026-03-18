import { PlayerStates } from '../core/PlayerState';

/**
 * 🎯 SOLID REFACTOR: OutroSequence générique
 * Responsabilité unique : gérer la sortie TOUJOURS PAR LA DROITE
 * Indépendant du type de niveau et du nombre de followers
 */
export class OutroSequence {
  scene: any;
  player: any;
  level: any;
  isActive: boolean = false;
  exitStarted: boolean = false;
  everyoneExited: boolean = false;
  config: {
    exitDirection: string;
    exitSpeed: number;
    exitDistanceFactor: number;
    soundDelay: number;
    levelReloadDelay: number;
  } = {
    exitDirection: 'right',
    exitSpeed: 200,
    exitDistanceFactor: 1.5,
    soundDelay: 500,
    levelReloadDelay: 2000,
  };
  exitTargetX: number = 0;
  exitTargetY: number = 0;
  reloadOverlay: any = null;

  constructor(scene: any, player: any, level: any = null) {
    this.scene = scene;
    this.player = player;
    this.level = level;

    this.calculateExitPositions();
  }

  calculateExitPositions(): void {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    this.exitTargetX = screenWidth + 100;
    this.exitTargetY = screenHeight / 2;
  }

  start(direction: string = 'right'): void {
    if (this.isActive) return;

    this.isActive = true;
    this.config.exitDirection = 'right';
    this.calculateExitPositions();

    console.log('🎯 OutroSequence: Sortie FORCÉE par la droite');

    this.scene.time.delayedCall(this.config.soundDelay, () => {
      this.playCelebrationSound();
    });

    this.player.playerState.setState(PlayerStates.CUTSCENE);
    this.disableWorldBounds();

    const delay = this.computeExitDelay();
    this.scene.time.delayedCall(delay, () => {
      this.startExitMovement();
    });
  }

  playCelebrationSound(): void {
    try {
      if (this.scene.soundManager) {
        this.scene.soundManager.playClaps();
      }
    } catch (error) {
      console.error('🎵 Erreur son:', error);
    }
  }

  startExitMovement(): void {
    const movementInput = { right: true, left: false, up: false, down: false };

    this.player.setMovement(movementInput, true);
    this.exitStarted = true;

    console.log('🚀 Mouvement de sortie vers la droite commencé');
  }

  computeExitDelay(): number {
    try {
      const shout = this.player && this.player.shoutBehavior ? this.player.shoutBehavior : null;
      if (shout && shout.isScreaming) {
        const elapsed = Math.max(0, Date.now() - (shout.screamStartTime || 0));
        const duration = Math.max(0, (shout.config && shout.config.duration) ? shout.config.duration : 0);
        const remaining = Math.max(0, duration - elapsed);
        return Math.min(1500, remaining + 100);
      }
    } catch (e) {
      // ignore et fallback
    }
    return 150;
  }

  update(): void {
    if (!this.isActive) return;

    this.checkPlayerExit();
    this.checkFollowersExit();
  }

  checkPlayerExit(): void {
    if (!this.exitStarted) return;

    if (this.player.sprite.x >= this.exitTargetX) {
      this.onPlayerExited();
    }
  }

  checkFollowersExit(): void {
    if (!this.exitStarted || this.everyoneExited) return;

    const followers = this.player.followers || [];

    if (followers.length === 0) {
      this.onEveryoneExited();
      return;
    }

    const followersExited = followers.every((follower: any) => {
      if (!follower || !follower.sprite) return true;
      return follower.sprite.x >= this.exitTargetX;
    });

    if (followersExited) {
      this.onEveryoneExited();
    }
  }

  onPlayerExited(): void {
    console.log('🚪 Joueur sorti par la droite');
  }

  onEveryoneExited(): void {
    if (this.everyoneExited) return;

    this.everyoneExited = true;
    const followerCount = (this.player.followers || []).length;

    console.log(`✅ Sortie terminée! Joueur + ${followerCount} followers`);

    this.scene.time.delayedCall(this.config.levelReloadDelay, () => {
      this.triggerLevelChange();
    });
  }

  triggerLevelChange(): void {
    console.log('🔄 Déclenchement changement de niveau...');

    this.createReloadTransition();
    this.cleanupBeforeReload();

    this.scene.time.delayedCall(500, () => {
      this.doDirectRestart();
    });
  }

  doDirectRestart(): void {
    try {
      const oldScene = this.scene;
      if (oldScene && oldScene.loadNextLevel) {
        console.log('📝 Chargement du niveau suivant...');

        this.scene.time.delayedCall(1, () => {
          if (oldScene.loadNextLevel) {
            oldScene.loadNextLevel();
            console.log('✅ Changement de niveau réussi!');
          }
        });
      }
    } catch (error) {
      console.error('❌ Erreur changement niveau:', error);
    }
  }

  createReloadTransition(): void {
    try {
      this.reloadOverlay = this.scene.add.rectangle(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY,
        this.scene.cameras.main.width,
        this.scene.cameras.main.height,
        0x000000
      );

      this.reloadOverlay.setDepth(20000);
      this.reloadOverlay.setAlpha(0);

      this.scene.tweens.add({
        targets: this.reloadOverlay,
        alpha: 1,
        duration: 200,
        ease: 'Power2',
      });
    } catch (error) {
      console.warn('⚠️ Erreur transition:', error);
    }
  }

  cleanupBeforeReload(): void {
    try {
      if (this.scene.soundManager) {
        this.scene.soundManager.stopAllSounds();
      } else if (this.scene.sound) {
        this.scene.sound.stopAll();
      }

      if (this.level && typeof this.level.cleanup === 'function') {
        this.level.cleanup();
      }
    } catch (error) {
      console.warn('⚠️ Erreur cleanup:', error);
    }
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

  destroy(): void {
    this.isActive = false;
    if (this.reloadOverlay) {
      this.reloadOverlay.destroy();
    }
  }
}
