import { PlayerStates } from '../core/PlayerState';

export class IntroSequence {
  constructor(scene, player, level = null) {
    this.scene = scene;
    this.player = player;
    this.level = level; // Référence au niveau pour les callbacks
    this.isActive = false;
    this.targetX = null; // Position cible pour surveillance
    this.targetReached = false; // Flag pour éviter multiple triggers
    this.wallsReactivated = false; // Flag pour éviter double réactivation des murs
    this.npcMigrationComplete = false; // 🎯 NOUVEAU: Flag pour la migration des NPCs
    
    // Configuration de l'introduction
    this.config = {
      pauseDuration: 500, // Pause avant de donner le contrôle
    };
    
    // Écouter la fin de migration des NPCs
    this.scene.events.on('npcMigrationComplete', () => {
      this.npcMigrationComplete = true; // 🎯 NOUVEAU: Marquer la migration comme terminée
      this.checkIntroComplete(); // 🎯 NOUVEAU: Vérifier si tout est fini
    });
  }

  /**
   * Démarrer la séquence d'introduction
   * @param {number} targetX - Position X finale (centre de l'écran)
   * @param {number} targetY - Position Y finale (centre de l'écran)
   */
  start(targetX, targetY) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.targetX = targetX;
    this.targetReached = false;
    
    // Calculer la position de départ hors écran à gauche
    const playerWidth = this.player.sprite.displayWidth || 64; // Largeur approximative du joueur
    const screenWidth = this.scene.scale.width;
    const startX = -playerWidth - 50; // Position négative = complètement hors écran à gauche avec marge de 50px
    
    // Calculer la durée basée sur la vitesse normale du joueur
    const distance = targetX - startX; // Distance à parcourir en pixels
    const playerSpeed = this.player.speed || 150; // Vitesse normale du joueur en pixels/seconde
    const estimatedDuration = (distance / playerSpeed) * 1000; // Durée estimée en millisecondes
    
    // Placer le joueur hors écran à gauche
    this.player.setPosition(startX, targetY);
    
    // Désactiver les collisions avec les limites du monde temporairement (player + NPCs)
    this.disableWorldBounds();
    
    // Mettre le joueur en état INTRO
    this.player.playerState.setState(PlayerStates.INTRO);
    
    // Émettre un événement pour déclencher la migration des NPCs
    this.scene.events.emit('playerIntroStarted', {
      playerStartX: startX,
      playerTargetX: targetX,
      estimatedDuration: estimatedDuration
    });
    
    // Démarrer le mouvement
    this.startPlayerMovement();
  }

  /**
   * Démarrer le mouvement automatique du joueur
   */
  startPlayerMovement() {
    // Simuler l'input de mouvement vers la droite (forceMovement = true pour bypasser inputEnabled)
    this.player.setMovement({ right: true, up: false, down: false, left: false }, true);
  }

  /**
   * Mettre à jour la surveillance de position (appelé par le niveau)
   */
  update() {
    if (!this.isActive || this.targetReached || !this.player.sprite) return;
    
    // Vérifier si le joueur a atteint la position cible
    const currentX = this.player.sprite.x;
    const tolerance = 10; // Tolérance de 10 pixels
    
    if (currentX >= this.targetX - tolerance) {
      this.targetReached = true;
      this.onTargetReached();
    }
  }

  /**
   * Appelé quand le joueur atteint la position cible
   */
  onTargetReached() {
    // Arrêter le mouvement
    this.stopPlayerMovement();
    
    // Créer une pause avant d'activer les contrôles
    this.scene.time.delayedCall(this.config.pauseDuration, () => {
      this.endIntroSequence();
    });
  }

  /**
   * Arrêter le mouvement du joueur
   */
  stopPlayerMovement() {
    // Arrêter le mouvement (forceMovement = true pour bypasser inputEnabled)
    this.player.setMovement({ right: false, up: false, down: false, left: false }, true);
  }

  /**
   * Terminer la séquence d'introduction (contrôles player seulement)
   */
  endIntroSequence() {
    // Marquer la séquence comme terminée
    this.isActive = false;
    
    // 🎯 NOUVEAU: Attendre la fin de la migration des NPCs avant d'activer les contrôles
    if (this.npcMigrationComplete) {
      this.activatePlayerControls();
    } else {
      // Écouter l'événement une seule fois
      this.scene.events.once('npcMigrationComplete', () => {
        this.activatePlayerControls();
      });
    }
    
    // Fallback de sécurité : réactiver les murs après 5 secondes maximum
    this.fallbackTimer = this.scene.time.delayedCall(5000, () => {
      if (!this.wallsReactivated) {
        console.warn('⚠️ Timeout sécurité : réactivation forcée des murs après 5s');
        this.reactivateWallsAndBounds();
      }
    });

    // 🎯 NOUVEAU: Vérifier si tout est fini
    this.checkIntroComplete();
  }

  // 🎯 NOUVEAU: Activer les contrôles du joueur
  activatePlayerControls() {
    // Passer en état PLAYING pour activer les contrôles du joueur
    this.player.playerState.setState(PlayerStates.PLAYING);
    
    // Émettre un événement pour notifier la fin de l'intro du joueur
    this.scene.events.emit('introSequenceComplete');
  }

  /**
   * Réactiver les murs et world bounds quand tous les NPCs ont terminé leur migration
   */
  reactivateWallsAndBounds() {
    if (this.wallsReactivated) return; // Éviter double activation
    
    // Annuler le timer de fallback
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }
    
    // Réactiver les collisions avec les limites du monde (player + NPCs)
    this.enableWorldBounds();
    
    // Réactiver les murs extérieurs du niveau
    if (this.level && this.level.enablePerimeterWalls) {
      this.level.enablePerimeterWalls();
    }
    
    this.wallsReactivated = true;
    
    // Émettre un événement pour notifier la fin complète de l'intro
    this.scene.events.emit('introCompletelyFinished');
  }

  /**
   * Désactiver temporairement les collisions avec les limites du monde (player + NPCs)
   */
  disableWorldBounds() {
    // Player
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(false);
    }
    
    // NPCs via injection de dépendance propre
    if (this.level && this.level.npcSpawner) {
      const allNpcs = this.level.npcSpawner.getAllNpcs();
      allNpcs.forEach((npc, index) => {
        if (npc.sprite && npc.sprite.body) {
          npc.sprite.body.setCollideWorldBounds(false);
        }
      });
    }
  }

  /**
   * Réactiver les collisions avec les limites du monde (player + NPCs)
   */
  enableWorldBounds() {
    // Player
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(true);
    }
    
    // NPCs
    if (this.level && this.level.npcSpawner) {
      const allNpcs = this.level.npcSpawner.getAllNpcs();
      allNpcs.forEach((npc, index) => {
        if (npc.sprite && npc.sprite.body) {
          npc.sprite.body.setCollideWorldBounds(true);
        }
      });
    }
  }

  /**
   * Forcer l'arrêt de la séquence (pour debug ou cas d'urgence)
   */
  forceStop() {
    if (!this.isActive) return;
    
    this.stopPlayerMovement();
    
    // Force la réactivation immédiate en cas d'urgence
    this.reactivateWallsAndBounds();
    
    this.endIntroSequence();
  }

  /**
   * Vérifier si la séquence est active
   */
  isRunning() {
    return this.isActive;
  }

  /**
   * Nettoyer les ressources
   */
  destroy() {
    // Nettoyer les event listeners
    this.scene.events.off('npcMigrationComplete');
    
    // Nettoyer le timer de fallback
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }
    
    this.isActive = false;
    this.targetX = null;
    this.targetReached = false;
    this.wallsReactivated = false;
  }

  // 🎯 NOUVEAU: Vérifier si l'intro est complètement terminée
  checkIntroComplete() {
    if (!this.isActive && this.npcMigrationComplete && !this.wallsReactivated) {
      this.reactivateWallsAndBounds();
    }
  }
} 