import { PlayerStates } from '../core/PlayerState';

/**
 * 🎯 SOLID REFACTOR: IntroSequence générique
 * Responsabilité unique : gérer l'entrée du joueur par la gauche
 * Découplé du tutorial via events
 */
export class IntroSequence {
  constructor(scene, player, level = null) {
    this.scene = scene;
    this.player = player;
    this.level = level;
    this.isActive = false;
    this.targetX = null;
    this.targetReached = false;
    this.wallsReactivated = false;
    this.npcMigrationComplete = false;
    
    // Configuration générique
    this.config = {
      pauseDuration: 500, // Pause avant d'émettre l'event de fin
    };
    
    // Écouter la fin de migration des NPCs
    this.scene.events.on('npcMigrationComplete', () => {
      this.npcMigrationComplete = true;
      this.checkIntroComplete();
    });
  }

  /**
   * Démarrer la séquence d'introduction (toujours depuis la gauche)
   */
  start(targetX, targetY) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.targetX = targetX;
    this.targetReached = false;
    
    // Position de départ hors écran à gauche
    const playerWidth = this.player.sprite.displayWidth || 64;
    const startX = -playerWidth - 50;
    
    // Placer le joueur et commencer le mouvement
    this.player.setPosition(startX, targetY);
    this.disableWorldBounds();
    this.player.playerState.setState(PlayerStates.INTRO);
    
    // Émettre événement pour migration NPCs
    this.scene.events.emit('playerIntroStarted', {
      playerStartX: startX,
      playerTargetX: targetX,
      estimatedDuration: ((targetX - startX) / (this.player.speed || 150)) * 1000
    });
    
    this.startPlayerMovement();
  }

  startPlayerMovement() {
    // Mouvement automatique vers la droite
    this.player.setMovement({ right: true, up: false, down: false, left: false }, true);
  }

  update() {
    if (!this.isActive || this.targetReached) return;

    // Vérifier si le joueur a atteint la cible
    if (this.player.sprite.x >= this.targetX) {
      this.targetReached = true;
      this.onTargetReached();
    }
  }

  onTargetReached() {
    this.stopPlayerMovement();
    
    // Pause puis fin d'intro
    this.scene.time.delayedCall(this.config.pauseDuration, () => {
      this.endIntroSequence();
    });
  }

  stopPlayerMovement() {
    this.player.setMovement({ right: false, up: false, down: false, left: false }, true);
  }

  /**
   * 🎯 SOLID: Terminer l'intro et émettre des events
   * Plus de logique tutorial ici !
   */
  endIntroSequence() {
    this.isActive = false;
    
    // 🎯 EVENT 1: Joueur arrivé (pour tutorial si présent)
    this.scene.events.emit('playerArrivedAtDestination');
    
    // 🎯 EVENT 2: Attendre migration puis activer niveau
    if (this.npcMigrationComplete) {
      this.activateLevel();
    } else {
      this.scene.events.once('npcMigrationComplete', () => {
        this.activateLevel();
      });
    }
    
    // Fallback sécurité
    this.fallbackTimer = this.scene.time.delayedCall(5000, () => {
      if (!this.wallsReactivated) {
        console.warn('⚠️ Timeout sécurité : réactivation forcée');
        this.reactivateWallsAndBounds();
      }
    });

    this.checkIntroComplete();
  }

  /**
   * 🎯 NOUVEAU: Activer le niveau (découplé du tutorial)
   */
  activateLevel() {
    // 🎯 EVENT 3: Intro terminée - le niveau décide quoi faire
    this.scene.events.emit('introSequenceComplete');
    
    console.log('🎮 IntroSequence terminée - niveau peut prendre le contrôle');
  }

  /**
   * Vérifier si l'intro est complètement terminée
   */
  checkIntroComplete() {
    if (!this.isActive && this.npcMigrationComplete) {
      this.reactivateWallsAndBounds();
    }
  }

  reactivateWallsAndBounds() {
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

  disableWorldBounds() {
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

  enableWorldBounds() {
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(true);
    }
    
    if (this.level && this.level.enableWorldBoundsForAllNpcs) {
      this.level.enableWorldBoundsForAllNpcs();
    }
  }

  destroy() {
    this.isActive = false;
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }
  }
} 