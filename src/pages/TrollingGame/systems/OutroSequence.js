import { PlayerStates } from '../core/PlayerState';

/**
 * 🎯 SOLID REFACTOR: OutroSequence générique
 * Responsabilité unique : gérer la sortie TOUJOURS PAR LA DROITE
 * Indépendant du type de niveau et du nombre de followers
 */
export class OutroSequence {
  constructor(scene, player, level = null) {
    this.scene = scene;
    this.player = player;
    this.level = level;
    this.isActive = false;
    this.exitStarted = false;
    this.everyoneExited = false;
    
    // Configuration générique - TOUJOURS DROITE
    this.config = {
      exitDirection: 'right',           // ⚠️ FORCÉ: Toujours droite
      exitSpeed: 200,                   // Vitesse de sortie
      exitDistanceFactor: 1.5,          // Distance = largeur écran * facteur
      soundDelay: 500,                  // Délai avant son
      levelReloadDelay: 2000            // Délai avant changement niveau
    };
    
    this.calculateExitPositions();
  }

  calculateExitPositions() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    // TOUJOURS sortir par la droite
    this.exitTargetX = screenWidth + 100; // Hors écran à droite
    this.exitTargetY = screenHeight / 2;  // Centre vertical
  }

  /**
   * Démarrer la séquence d'outro (TOUJOURS par la droite)
   */
  start(direction = 'right') {
    if (this.isActive) return;
    
    this.isActive = true;
    // ⚠️ IGNORER le paramètre direction - toujours droite
    this.config.exitDirection = 'right';
    this.calculateExitPositions();
    
    console.log('🎯 OutroSequence: Sortie FORCÉE par la droite');
    
    // Son de victoire
    this.scene.time.delayedCall(this.config.soundDelay, () => {
      this.playCelebrationSound();
    });
    
    // État cutscene + désactivation murs
    this.player.playerState.setState(PlayerStates.CUTSCENE);
    this.disableWorldBounds();

    // Attendre la fin (ou quasi fin) d'un cri en cours avant de démarrer la sortie
    const delay = this.computeExitDelay();
    this.scene.time.delayedCall(delay, () => {
      this.startExitMovement();
    });
  }

  playCelebrationSound() {
    try {
      if (this.scene.soundManager) {
        this.scene.soundManager.playClaps();
      }
    } catch (error) {
      console.error('🎵 Erreur son:', error);
    }
  }

  startExitMovement() {
    // TOUJOURS mouvement vers la droite
    const movementInput = { right: true, left: false, up: false, down: false };
    
    this.player.setMovement(movementInput, true);
    this.exitStarted = true;
    
    console.log('🚀 Mouvement de sortie vers la droite commencé');
  }

  /**
   * Calculer un délai avant la sortie pour laisser finir l'animation de cri
   */
  computeExitDelay() {
    try {
      const shout = this.player && this.player.shoutBehavior ? this.player.shoutBehavior : null;
      if (shout && shout.isScreaming) {
        const elapsed = Math.max(0, Date.now() - (shout.screamStartTime || 0));
        const duration = Math.max(0, (shout.config && shout.config.duration) ? shout.config.duration : 0);
        const remaining = Math.max(0, duration - elapsed);
        // Petit buffer pour terminer proprement (100ms)
        return Math.min(1500, remaining + 100);
      }
    } catch (e) {
      // ignore et fallback
    }
    // Fallback: léger délai même sans cri pour une transition plus douce
    return 150;
  }

  update() {
    if (!this.isActive) return;

    this.checkPlayerExit();
    this.checkFollowersExit();
  }

  checkPlayerExit() {
    if (!this.exitStarted) return;

    // Vérifier si le joueur est sorti de l'écran (droite)
    if (this.player.sprite.x >= this.exitTargetX) {
      this.onPlayerExited();
    }
  }

  checkFollowersExit() {
    if (!this.exitStarted || this.everyoneExited) return;

    // Récupérer tous les followers du joueur (peut être 0)
    const followers = this.player.followers || [];
    
    if (followers.length === 0) {
      // Pas de followers = immediate
      this.onEveryoneExited();
      return;
    }

    // Vérifier si tous les followers sont sortis
    const followersExited = followers.every(follower => {
      if (!follower || !follower.sprite) return true;
      return follower.sprite.x >= this.exitTargetX;
    });

    if (followersExited) {
      this.onEveryoneExited();
    }
  }

  onPlayerExited() {
    console.log('🚪 Joueur sorti par la droite');
    // Continue à attendre les followers si nécessaire
  }

  onEveryoneExited() {
    if (this.everyoneExited) return;
    
    this.everyoneExited = true;
    const followerCount = (this.player.followers || []).length;
    
    console.log(`✅ Sortie terminée! Joueur + ${followerCount} followers`);
    
    // Délai avant changement de niveau
    this.scene.time.delayedCall(this.config.levelReloadDelay, () => {
      this.triggerLevelChange();
    });
  }

  triggerLevelChange() {
    console.log('🔄 Déclenchement changement de niveau...');
    
    this.createReloadTransition();
    this.cleanupBeforeReload();
    
    // Délai court pour la transition puis reload
    this.scene.time.delayedCall(500, () => {
      this.doDirectRestart();
    });
  }

  doDirectRestart() {
    try {
      const oldScene = this.scene;
      if (oldScene && oldScene.loadNextLevel) {
        console.log('📝 Chargement du niveau suivant...');
        
        // Appel sur le frame suivant
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

  createReloadTransition() {
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
        ease: 'Power2'
      });
    } catch (error) {
      console.warn('⚠️ Erreur transition:', error);
    }
  }

  cleanupBeforeReload() {
    try {
      // Arrêter tous les sons
      if (this.scene.soundManager) {
        this.scene.soundManager.stopAllSounds();
      } else if (this.scene.sound) {
        this.scene.sound.stopAll();
      }
      
      // Nettoyer le niveau
      if (this.level && typeof this.level.cleanup === 'function') {
        this.level.cleanup();
      }
    } catch (error) {
      console.warn('⚠️ Erreur cleanup:', error);
    }
  }

  disableWorldBounds() {
    // Player
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(false);
    }
    
    // Murs via niveau
    if (this.level && this.level.disablePerimeterWalls) {
      this.level.disablePerimeterWalls();
    }
    
    // NPCs via niveau
    if (this.level && this.level.disableWorldBoundsForAllNpcs) {
      this.level.disableWorldBoundsForAllNpcs();
    }
  }

  destroy() {
    this.isActive = false;
    if (this.reloadOverlay) {
      this.reloadOverlay.destroy();
    }
  }
} 