import { PlayerStates } from '../core/PlayerState';

export class OutroSequence {
  constructor(scene, player, level = null) {
    this.scene = scene;
    this.player = player;
    this.level = level; // Référence au niveau pour les callbacks
    this.isActive = false;
    this.exitStarted = false;
    this.everyoneExited = false;
    
    // Configuration de l'outro
    this.config = {
      exitDirection: 'right',           // Direction de sortie par défaut
      exitSpeed: 200,                   // Vitesse de sortie (plus rapide que normal)
      exitDistanceFactor: 1.5,          // Distance à parcourir = largeur écran * facteur
      soundDelay: 500,                  // Délai avant de jouer le son (ms)
      levelReloadDelay: 2000            // Délai avant rechargement (ms)
    };
    
    // Calcul des positions de sortie
    this.calculateExitPositions();
  }

  /**
   * Calculer les positions de sortie selon la configuration
   */
  calculateExitPositions() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    switch (this.config.exitDirection) {
      case 'right':
        this.exitTarget = screenWidth + (screenWidth * this.config.exitDistanceFactor);
        break;
      case 'left':
        this.exitTarget = -(screenWidth * this.config.exitDistanceFactor);
        break;
      case 'up':
        this.exitTarget = -(screenHeight * this.config.exitDistanceFactor);
        break;
      case 'down':
        this.exitTarget = screenHeight + (screenHeight * this.config.exitDistanceFactor);
        break;
    }
  }

  /**
   * Démarrer la séquence d'outro
   * @param {string} direction - Direction de sortie ('right', 'left', 'up', 'down')
   */
  start(direction = 'right') {
    if (this.isActive) return;
    
    this.isActive = true;
    this.config.exitDirection = direction;
    this.calculateExitPositions();
    
    // 🎵 Jouer le son de victoire avec délai
    this.scene.time.delayedCall(this.config.soundDelay, () => {
      this.playCelebrationSound();
    });
    
    // Mettre le joueur en état CUTSCENE pour désactiver les contrôles
    this.player.playerState.setState(PlayerStates.CUTSCENE);
    
    // Désactiver les murs comme dans l'intro
    this.disableWorldBounds();
    
    // Démarrer le mouvement de sortie
    this.startExitMovement();
  }

  /**
   * Jouer le son de célébration
   */
  playCelebrationSound() {
    try {
      if (this.scene.soundManager) {
        this.scene.soundManager.playClaps();
      } else {
        console.warn('🎵 SoundManager non trouvé');
      }
    } catch (error) {
      console.error('🎵 Erreur lors de la lecture du son:', error);
    }
  }

  /**
   * Démarrer le mouvement de sortie automatique
   */
  startExitMovement() {
    // Définir le mouvement selon la direction
    let movementInput = { right: false, left: false, up: false, down: false };
    
    switch (this.config.exitDirection) {
      case 'right':
        movementInput.right = true;
        break;
      case 'left':
        movementInput.left = true;
        break;
      case 'up':
        movementInput.up = true;
        break;
      case 'down':
        movementInput.down = true;
        break;
    }
    
    // Forcer le mouvement (forceMovement = true pour bypasser inputEnabled)
    this.player.setMovement(movementInput, true);
  }

  /**
   * Mettre à jour la surveillance de sortie (appelé par le niveau)
   */
  update() {
    if (!this.isActive || this.everyoneExited || !this.player.sprite) return;
    
    // 🎯 AAA: Vérification simple et robuste
    const playerExited = this.isPlayerOffScreen();
    const allNpcsExited = this.areAllNpcsOffScreen();
    
    if (playerExited && !this.exitStarted) {
      this.exitStarted = true;
    }
    
    // 🎯 RELOAD dès que Player + TOUS NPCs sont hors écran
    if (playerExited && allNpcsExited) {
      this.onOutroComplete();
    }
  }

  /**
   * 🎯 AAA: Vérifier si le Player est complètement hors écran
   */
  isPlayerOffScreen() {
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    const playerX = this.player.sprite.x;
    const playerY = this.player.sprite.y;
    
    switch (this.config.exitDirection) {
      case 'right':
        return playerX > screenWidth + 50; // Marge de 50px
      case 'left':
        return playerX < -50;
      case 'up':
        return playerY < -50;
      case 'down':
        return playerY > screenHeight + 50;
      default:
        return false;
    }
  }

  /**
   * 🎯 AAA: Vérifier si TOUS les NPCs sont hors écran (plus robuste)
   */
  areAllNpcsOffScreen() {
    if (!this.level || !this.level.npcSpawner) {
      console.warn('🎬 Impossible de vérifier les NPCs - pas de npcSpawner');
      return true; // Si pas de NPCs, considérer comme "tous sortis"
    }
    
    const allNpcs = this.level.npcSpawner.getAllNpcs();
    if (allNpcs.length === 0) return true;
    
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    for (const npc of allNpcs) {
      if (!npc.sprite) continue;
      
      const npcX = npc.sprite.x;
      const npcY = npc.sprite.y;
      
      // Vérifier si ce NPC est encore visible selon la direction de sortie
      let isOffScreen = false;
      
      switch (this.config.exitDirection) {
        case 'right':
          isOffScreen = npcX > screenWidth + 50;
          break;
        case 'left':
          isOffScreen = npcX < -50;
          break;
        case 'up':
          isOffScreen = npcY < -50;
          break;
        case 'down':
          isOffScreen = npcY > screenHeight + 50;
          break;
      }
      
      // Si UN SEUL NPC est encore visible, pas encore prêt
      if (!isOffScreen) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Outro terminé - recharger le niveau
   */
  onOutroComplete() {
    if (this.everyoneExited) return;
    
    this.everyoneExited = true;
    
    // Arrêter le mouvement
    this.player.setMovement({ right: false, left: false, up: false, down: false }, true);
    
    // Recharger le niveau après un délai
    this.scene.time.delayedCall(this.config.levelReloadDelay, () => {
      this.reloadLevel();
    });
  }

  /**
   * Recharger le niveau
   */
  reloadLevel() {
    try {
      // 🎯 VÉRIFICATION: La scène existe-t-elle encore ?
      if (!this.scene || !this.scene.time) {
        console.warn('⚠️ Scene déjà détruite - restart direct...');
        this.doDirectRestart();
        return;
      }
      
      // 🎯 TRANSITION DOUCE: Créer un overlay avant le reload
      this.createReloadTransition();
      
      // 🎯 DÉLAI pour la transition puis restart via window.game
      this.scene.time.delayedCall(200, () => {
        // 🧹 CLEANUP qui va détruire this.scene
        this.cleanupBeforeReload();
        
        // 🎯 RESTART via window.game (plus fiable)
        this.doDirectRestart();
      });
      
    } catch (error) {
      console.error('🔄 Erreur lors du rechargement:', error);
      console.warn('🆘 Erreur dans le processus principal de reload');
      this.doDirectRestart();
    }
  }

  /**
   * 🎯 Restart direct si scene détruite
   */
  doDirectRestart() {
    try {
      // Utiliser window.game pour accéder au jeu principal
      if (window.game && window.game.phaserGame) {
        const gameInstance = window.game.phaserGame;
        const sceneManager = gameInstance.scene;
        
        // 🎯 CRUCIAL: S'assurer que la scène est complètement nettoyée
        const oldScene = sceneManager.getScene('GameScene');
        if (oldScene) {
          // Forcer le nettoyage de la scène actuelle
          if (oldScene.currentLevel) {
            oldScene.currentLevel.cleanup();
          }

          // Arrêter la scène et la redémarrer proprement
          sceneManager.stop('GameScene');
          sceneManager.start('GameScene'); // Redémarre la scène existante au lieu d'en créer une nouvelle
        }
      } else {
        console.error('❌ Impossible d\'accéder à window.game');
      }
    } catch (error) {
      console.error('❌ Restart direct échoué:', error);
    }
  }

  /**
   * 🎯 Créer une transition douce pour le reload (évite le flickering)
   */
  createReloadTransition() {
    try {
      // Créer un overlay noir qui couvre tout l'écran
      this.reloadOverlay = this.scene.add.rectangle(
        this.scene.cameras.main.centerX,
        this.scene.cameras.main.centerY,
        this.scene.cameras.main.width,
        this.scene.cameras.main.height,
        0x000000
      );
      
      this.reloadOverlay.setDepth(20000); // Au-dessus de tout
      this.reloadOverlay.setAlpha(0); // Commence transparent
      
      // Transition douce vers noir
      this.scene.tweens.add({
        targets: this.reloadOverlay,
        alpha: 1,
        duration: 200, // 200ms pour couvrir l'écran
        ease: 'Power2'
      });
      
    } catch (error) {
      console.warn('⚠️ Impossible de créer la transition:', error);
    }
  }

  /**
   * 🎯 Nettoyage complet avant reload pour éviter les erreurs
   */
  cleanupBeforeReload() {
    try {
      // 1. Nettoyer les debug texts du Player en premier (évite les erreurs)
      if (this.player) {
        if (this.player.destroyShoutRadiusDebug) {
          this.player.destroyShoutRadiusDebug();
        }
        if (this.player.destroyTremblingRadiusDebug) {
          this.player.destroyTremblingRadiusDebug();
        }
        
        // 2. Vider la liste des followers sans appeler removeFollower (évite updateShoutPower)
        if (this.player.followers) {
          this.player.followers.length = 0; // Clear direct sans callbacks
        }
      }
      
      // 3. Arrêter tous les sons du niveau
      if (this.scene.soundManager && this.scene.soundManager.stopAllSounds) {
        // Utiliser SoundManager pour arrêter les sons du niveau
        this.scene.soundManager.stopAllSounds();
      } else if (this.scene.sound) {
        // Fallback: arrêter les sons de cette scène
        this.scene.sound.stopAll();
      }
      
      // 🎵 NOTE: Le son d'ambiance continue dans AmbientScene (scène persistante)
      
      // 4. Nettoyer le niveau si possible
      if (this.level && typeof this.level.cleanup === 'function') {
        this.level.cleanup();
      }
      
    } catch (error) {
      console.warn('⚠️ Erreur pendant le nettoyage:', error);
      // Continuer quand même le reload
    }
  }

  /**
   * Désactiver les collisions avec les limites du monde (player + NPCs) ET les murs
   */
  disableWorldBounds() {
    // Désactiver pour le joueur
    if (this.player.sprite && this.player.sprite.body) {
      this.player.sprite.body.setCollideWorldBounds(false);
    }
    
    // 🎯 CRUCIAL: Désactiver les murs physiques comme dans l'intro !
    if (this.level && typeof this.level.disablePerimeterWalls === 'function') {
      this.level.disablePerimeterWalls();
    }
    
    // Désactiver pour tous les NPCs via le niveau
    if (this.level && typeof this.level.disableWorldBoundsForAllNpcs === 'function') {
      this.level.disableWorldBoundsForAllNpcs();
    }
  }

  /**
   * Nettoyage à la destruction
   */
  destroy() {
    this.isActive = false;
    this.scene = null;
    this.player = null;
    this.level = null;
  }
} 