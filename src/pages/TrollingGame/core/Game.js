import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { AmbientScene } from './AmbientScene';

export class Game {
  constructor(container) {
    this.container = container;
    this.phaserGame = null;
    
    // Charger les paramètres de debug depuis le localStorage (désactivé par défaut)
    this.debugPhysics = this.loadDebugSetting('debugPhysics', false);
    this.debugShoutRadius = this.loadDebugSetting('debugShoutRadius', false);
    this.debugNpcs = this.loadDebugSetting('debugNpcs', false); // 🎯 NOUVEAU: Flag dédié pour le debug des NPCs
    
    // État du tutorial pour cette session (pas persistant)
    this.tutorialShown = false; // Toujours false au chargement de page
    
    this.init();
  }

  // Charger un paramètre de debug depuis le localStorage
  loadDebugSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(`trollingGame_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(`Erreur lors du chargement de ${key} depuis localStorage:`, error);
      return defaultValue;
    }
  }

  // Sauvegarder un paramètre de debug dans le localStorage
  saveDebugSetting(key, value) {
    try {
      localStorage.setItem(`trollingGame_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
    }
  }

  // Charger un paramètre de jeu depuis le localStorage
  loadGameSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(`trollingGame_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(`Erreur lors du chargement de ${key} depuis localStorage:`, error);
      return defaultValue;
    }
  }

  // Sauvegarder un paramètre de jeu dans le localStorage
  saveGameSetting(key, value) {
    try {
      localStorage.setItem(`trollingGame_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
    }
  }

  init() {
    const config = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: this.container,
      backgroundColor: '#000000',
      resolution: window.devicePixelRatio || 1,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: this.debugPhysics,  // Utiliser la valeur depuis localStorage
          fixedStep: true,
          fps: 60,
          timeScale: 1
        }
      },
      fps: {
        target: 60,
        min: 60,
        forceSetTimeOut: false
      },
      // 🎵 DEUX SCÈNES: AmbientScene (persistante) + GameScene (redémarrable)
      scene: [AmbientScene, GameScene],
      scale: {
        // 🎯 MODE RESIZE: Utilise TOUTE la taille d'écran disponible
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // 🎮 DIMENSIONS DYNAMIQUES: S'adapte à la taille réelle de l'écran
        width: window.innerWidth,
        height: window.innerHeight,
        // 🎯 RESIZE AUTOMATIQUE quand la fenêtre change
        autoRound: true
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        antialiasGL: true
      }
    };

    this.phaserGame = new Phaser.Game(config);
    
    // Mettre en pause quand l'onglet est masqué, reprendre quand visible
    this.phaserGame.events.on('hidden', () => {
      const gameScene = this.phaserGame.scene.getScene('GameScene');
      if (gameScene) this.phaserGame.scene.pause('GameScene');
      const ambient = this.phaserGame.scene.getScene('AmbientScene');
      if (ambient) this.phaserGame.scene.pause('AmbientScene');
    });
    this.phaserGame.events.on('visible', () => {
      const ambient = this.phaserGame.scene.getScene('AmbientScene');
      if (ambient) this.phaserGame.scene.resume('AmbientScene');
      const gameScene = this.phaserGame.scene.getScene('GameScene');
      if (gameScene) this.phaserGame.scene.resume('GameScene');
    });
    
    // Écouter les changements de taille de l'écran
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  handleResize() {
    // 🎯 REDIMENSIONNEMENT RÉEL pour utiliser toute la taille d'écran
    if (this.phaserGame) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      console.log(`📱 Resize: ${width}x${height} - Adaptation complète du jeu`);
      
      // 🎮 REDIMENSIONNER le jeu pour remplir tout l'écran
      this.phaserGame.scale.resize(width, height);
      
      // 🎯 NOTIFIER les scènes du changement
      if (this.phaserGame.scene.scenes[0]) {
        const scene = this.phaserGame.scene.scenes[0];
        if (scene.handleResize) {
          scene.handleResize(width, height);
        }
      }
    }
  }

  // TOGGLE DEBUG MODE - Appel depuis la console avec game.toggleDebug()
  toggleDebug() {
    this.debugPhysics = !this.debugPhysics;
    this.debugShoutRadius = !this.debugShoutRadius;
    
    // Sauvegarder dans localStorage
    this.saveDebugSetting('debugPhysics', this.debugPhysics);
    this.saveDebugSetting('debugShoutRadius', this.debugShoutRadius);
    
    // 🎯 CORRECTION CRITIQUE: GameScene est à l'index [1], pas [0] (AmbientScene)
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (this.phaserGame && gameScene) {
      const scene = gameScene;
      
      // 🎯 CORRECTION: Gérer Physics Debug correctement
      if (scene.physics && scene.physics.world) {
        // Nettoyer d'abord tous les graphics existants
        if (scene.physics.world.debugGraphic) {
          scene.physics.world.debugGraphic.destroy();
          scene.physics.world.debugGraphic = null;
        }
        
        // Nettoyer les graphics orphelins
        const childrenToDestroy = scene.children.list.filter(child => 
          child.type === 'Graphics' && child.name && (
            child.name.includes('debug') || 
            child.name.includes('trail') ||
            child.name.includes('shout') ||
            child.name.includes('trembling')
          )
        );
        childrenToDestroy.forEach(child => child.destroy());
        
        // 🎯 REPRODUCTION COMPLÈTE de l'état debug initial de Phaser
        if (this.debugPhysics) {
          // Activer le debug comme à l'initialisation
          scene.physics.world.drawDebug = true;
          scene.physics.world.defaults.debugShowBody = true;
          scene.physics.world.defaults.debugShowStaticBody = true; 
          scene.physics.world.defaults.debugShowVelocity = true;
          scene.physics.world.defaults.bodyDebugColor = 0xff00ff;
          scene.physics.world.defaults.staticBodyDebugColor = 0x0000ff;
          scene.physics.world.defaults.velocityDebugColor = 0x00ff00;
          scene.physics.world.createDebugGraphic();
        } else {
          // Désactiver complètement comme à l'initialisation debug=false
          scene.physics.world.drawDebug = false;
          scene.physics.world.defaults.debugShowBody = false;
          scene.physics.world.defaults.debugShowStaticBody = false; 
          scene.physics.world.defaults.debugShowVelocity = false;
        }
      }
      
      // 🎯 FORCER mise à jour de tous les éléments de debug visuels (gère Player + trails + NPCs)
      this.forceUpdateAllDebugVisuals(scene);
      
      // 🎯 LOGS de confirmation
      if (this.debugPhysics) {
        console.log('🔵 DEBUG PHYSIQUE: ACTIVÉ - Colliders visibles');
      } else {
        console.log('🔴 DEBUG PHYSIQUE: DÉSACTIVÉ - Colliders cachés');
      }
      
      if (this.debugShoutRadius) {
        console.log('🔴 DEBUG RAYON CRI: ACTIVÉ - Rayon d\'effet visible');
      } else {
        console.log('🔴 DEBUG RAYON CRI: DÉSACTIVÉ - Rayon d\'effet caché');
      }
    }
    
    return { physics: this.debugPhysics, shoutRadius: this.debugShoutRadius };
  }

  // TOGGLE UNIQUEMENT LE DEBUG DU RAYON DE CRI - Appel depuis la console avec game.toggleShoutRadiusDebug()
  toggleShoutRadiusDebug() {
    this.debugShoutRadius = !this.debugShoutRadius;
    
    // Sauvegarder dans localStorage
    this.saveDebugSetting('debugShoutRadius', this.debugShoutRadius);
    
    // 🎯 CORRECTION CRITIQUE: GameScene est à l'index [1], pas [0] (AmbientScene)
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (this.phaserGame && gameScene) {
      const scene = gameScene;
      
      // 🎯 FORCER mise à jour de tous les éléments de debug visuels (gère Player + trails)
      this.forceUpdateAllDebugVisuals(scene);
      
      if (this.debugShoutRadius) {
        console.log('🔴 DEBUG RAYON CRI: ACTIVÉ - Rayon d\'effet visible');
      } else {
        console.log('🔴 DEBUG RAYON CRI: DÉSACTIVÉ - Rayon d\'effet caché');
      }
    }
    
    return this.debugShoutRadius;
  }

  /**
   * 🎯 Forcer la mise à jour de tous les éléments visuels de debug
   * Appelé lors du toggle pour éviter que certains éléments restent affichés
   */
  forceUpdateAllDebugVisuals(scene) {
    if (!scene || !scene.currentLevel) return;
    
    const level = scene.currentLevel;
    
    // 1. Forcer la mise à jour des trails et debug du Player
    if (level.player) {
      if (level.player.trailBehavior) {
        console.log(`🔧 FORÇAGE: Appel de trailBehavior.updateVisibility(), debugPhysics=${this.debugPhysics}, debugShoutRadius=${this.debugShoutRadius}`);
        level.player.trailBehavior.updateVisibility();
      } else {
        console.warn('⚠️ Pas de trailBehavior sur le player');
      }
      
      // 🎯 FORCER la synchronisation Player debug (sans destroy/recreate)
      if (this.debugShoutRadius) {
        // Debug activé : s'assurer que les éléments existent et sont visibles
        if (!level.player.debugRenderer || !level.player.debugRenderer.isDebugEnabled) {
          level.player.setDebugEnabled(true);
        }
        // ✅ NOUVEAU: Utiliser le PlayerDebugRenderer pour forcer la mise à jour
        level.player.debugRenderer.forceUpdateDebugVisuals();
      } else {
        // Debug désactivé : détruire les éléments
        if (level.player.debugRenderer && level.player.debugRenderer.isDebugEnabled) {
          level.player.setDebugEnabled(false);
        }
        // 🚫 NE PAS appeler de mise à jour si debug désactivé !
      }
    }
    
    // 2. Forcer la mise à jour des NPCs et de leur debug visuel
    if (level.npcSpawner) {
      // Forcer la recréation du debug visuel des destinations NPCs
      if (this.debugPhysics || this.debugShoutRadius || this.debugNpcs) {
        level.npcSpawner.createDebugDataForAllNpcs();
        level.npcSpawner.createMigrationDebugVisual();
        console.log('🔧 FORÇAGE: Debug NPCs destinations activé');
      } else {
        level.npcSpawner.clearMigrationDebugVisual();
        console.log('🔧 FORÇAGE: Debug NPCs destinations désactivé');
      }
      
      // Mettre à jour les trails des NPCs individuels
      const allNpcs = level.npcSpawner.getAllNpcs();
      allNpcs.forEach(npc => {
        // Si des NPCs ont des trails ou autres éléments de debug, les mettre à jour ici
        if (npc.trailBehavior) {
          npc.trailBehavior.updateVisibility();
        }
      });
    }
    
    // 3. Nettoyer AGRESSIVEMENT les graphics orphelins
    if (!this.debugShoutRadius && !this.debugPhysics) {
      // Mode debug complètement désactivé : nettoyer tous les graphics de debug
      const childrenToCheck = [...scene.children.list]; // Copie pour éviter les modifications pendant l'itération
      
      childrenToCheck.forEach(child => {
        if (child.type === 'Graphics') {
          // Détruire les graphics qui ressemblent à du debug
          if (child.name && (
            child.name.includes('debug') || 
            child.name.includes('trail') ||
            child.name.includes('shout') ||
            child.name.includes('radius')
          )) {
            try {
              child.destroy();
              console.log(`🗑️ Nettoyage: Graphics ${child.name}`);
            } catch (error) {
              console.warn('⚠️ Erreur nettoyage graphics:', error);
            }
          }
          
          // Vérifier aussi les graphics sans nom mais qui ont les caractéristiques du debug
          else if (!child.name && child.lineStyle && child.fillStyle) {
            // Si c'est probablement un graphics de debug (cercles, lignes)
            child.setVisible(false);
          }
        }
        
        // 🎯 NOUVEAU: Nettoyer aussi les textes de debug orphelins
        else if (child.type === 'Text') {
          const text = child.text || '';
          if (text.includes('Radius:') || text.includes('Force:') || text.includes('Followers:') || 
              text.includes('Trembling:') || text.includes('Collision:')) {
            try {
              child.destroy();
              console.log(`🗑️ Nettoyage: Text debug orphelin`);
            } catch (error) {
              console.warn('⚠️ Erreur nettoyage text:', error);
            }
          }
        }
      });
    }
    
    console.log('🔄 Mise à jour forcée de tous les éléments visuels de debug');
  }

  // TOGGLE TUTORIAL TEXT - Appel depuis la console avec game.toggleTutorialArrow()
  toggleTutorialArrow() {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene || !gameScene.currentLevel || !gameScene.currentLevel.tutorialTextManager) {
      console.warn('⚠️ Impossible de toggle tutorial text: pas de tutorialTextManager disponible');
      return false;
    }

    const tutorialManager = gameScene.currentLevel.tutorialTextManager;
    const status = tutorialManager.getStatus();
    
    // Si des textes sont visibles, les masquer, sinon forcer leur affichage
    const hasVisibleTexts = Object.values(status.texts).some(text => text.visible);
    const hasVisibleImages = status.images.length > 0;
    
    if (hasVisibleTexts || hasVisibleImages) {
      tutorialManager.hideAllTexts();
      tutorialManager.hideAllTutorialImages();
      console.log('📝 Tutorial text + images: CACHÉ');
    } else {
      // Forcer l'affichage pour debug
      const player = tutorialManager.getPlayer();
      if (player && player.sprite) {
        tutorialManager.showYouText();
        tutorialManager.showThemText();
        // L'image tutorial apparaîtra automatiquement après le délai
        console.log('📝 Tutorial text + images: AFFICHÉ (debug)');
      }
    }
    
    return !(hasVisibleTexts || hasVisibleImages);
  }

  // 🧪 DEBUG: Forcer le masquage du tutorial
  forceHideTutorial() {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene || !gameScene.currentLevel || !gameScene.currentLevel.tutorialTextManager) {
      console.warn('⚠️ Impossible de forcer masquage tutorial: pas de tutorialTextManager disponible');
      return;
    }

    const tutorialManager = gameScene.currentLevel.tutorialTextManager;
    tutorialManager.forceHideAll();
    console.log('📝 Tutorial: MASQUAGE FORCÉ');
  }

  // 🧪 DEBUG: Obtenir l'état du tutorial
  getTutorialDebugState() {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene || !gameScene.currentLevel || !gameScene.currentLevel.tutorialTextManager) {
      console.warn('⚠️ Impossible d\'obtenir état tutorial: pas de tutorialTextManager disponible');
      return null;
    }

    const state = gameScene.currentLevel.tutorialTextManager.getDebugState();
    console.log('📝 DEBUG Tutorial State:', state);
    return state;
  }

  // TOGGLE DEBUG NPCS - Appel depuis la console avec game.toggleNpcDebug()
  toggleNpcDebug() {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene || !gameScene.currentLevel || !gameScene.currentLevel.npcSpawner) {
      console.warn('⚠️ Impossible de toggle NPC debug: pas de NPCs disponibles');
      return false;
    }

    // 🎯 NOUVEAU: Toggle le flag dédié et sauvegarder
    this.debugNpcs = !this.debugNpcs;
    this.saveDebugSetting('debugNpcs', this.debugNpcs);
    
    const npcSpawner = gameScene.currentLevel.npcSpawner;
    
    if (this.debugNpcs) {
      // Activer le debug des NPCs
      npcSpawner.createDebugDataForAllNpcs();
      npcSpawner.createMigrationDebugVisual();
      console.log('🎯 NPCs debug: AFFICHÉ (destinations et flèches)');
    } else {
      // Désactiver le debug des NPCs
      npcSpawner.clearMigrationDebugVisual();
      console.log('🎯 NPCs debug: CACHÉ (destinations et flèches)');
    }
    
    return this.debugNpcs;
  }

  // 🎯 NOUVEAU: SWITCH LEVELS - Appel depuis la console avec game.switchLevel('piper')
  switchLevel(levelType = 'shepherd') {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene) {
      console.warn('⚠️ Impossible de changer de niveau: pas de GameScene disponible');
      return false;
    }

    const gameSceneLevels = Object.keys(gameScene.availableLevels);
    if (!gameSceneLevels.includes(levelType)) {
      console.warn(`⚠️ Niveau '${levelType}' inexistant. Disponibles: ${gameSceneLevels.join(', ')}`);
      return false;
    }

    gameScene.switchToLevel(levelType);
    
    // Afficher les informations du nouveau niveau
    if (gameScene.currentLevel && gameScene.currentLevel.getLevelStats) {
      const stats = gameScene.currentLevel.getLevelStats();
      console.log(`🎯 Niveau actuel: ${levelType}`, stats);
    }
    
    return true;
  }

  // 🎯 NOUVEAU: GET CURRENT LEVEL INFO - Appel depuis la console avec game.getLevelInfo()
  getLevelInfo() {
    const gameScene = this.phaserGame.scene.getScene('GameScene');
    if (!gameScene || !gameScene.currentLevel) {
      console.warn('⚠️ Pas de niveau actuel');
      return null;
    }

    const info = {
      currentType: gameScene.currentLevelType,
      availableLevels: Object.keys(gameScene.availableLevels),
      stats: gameScene.currentLevel.getLevelStats ? gameScene.currentLevel.getLevelStats() : null
    };

    console.log('📊 Informations niveau actuel:', info);
    return info;
  }

  // Vérifier si le tutorial doit être affiché (première fois seulement)
  shouldShowTutorial() {
    return !this.tutorialShown;
  }

  // Marquer le tutorial comme vu pour cette session
  markTutorialAsShown() {
    this.tutorialShown = true;
    console.log('✅ Tutorial marqué comme vu - ne s\'affichera plus dans cette session');
  }

  // RESET DU TUTORIAL - Appel depuis la console avec game.resetTutorial()
  resetTutorial() {
    this.tutorialShown = false;
    console.log('🔄 Tutorial remis à zéro - s\'affichera à nouveau dans cette session');
    return false; // Tutorial réinitialisé = pas encore vu
  }

  destroy() {
    // Nettoyer l'écouteur d'événements
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = null;
    }
  }
} 