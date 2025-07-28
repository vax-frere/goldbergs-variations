import Phaser from 'phaser';
import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SoundManager } from './SoundManager';
import { FootstepsSystem } from '../systems/FootstepsSystem';
import { DepthSortingSystem } from '../systems/DepthSortingSystem';
import { MainLevel } from '../levels/MainLevel';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.entityManager = null;
    this.collisionSystem = null;
    this.soundManager = null;
    this.footstepsSystem = null;
    this.depthSortingSystem = null;
    this.currentLevel = null;
  }

  preload() {
    // Charger le spritesheet pour les personnages (8 directions)
    this.load.spritesheet('character-spritesheet', 'img/trolling-game/spritesheet-2.png', {
      frameWidth: 126,
      frameHeight: 190,
      startFrame: 0,
      endFrame: 71 // 9 lignes × 8 frames = 72 frames (0-71)
    });
    
    // Créer une texture simple pour les murs
    this.load.image('wall', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#8b4513"/>
      </svg>
    `));
    
    // Créer une texture simple pour les NPCs
    this.load.image('npc', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="#ff6b6b"/>
        <circle cx="8" cy="9" r="2" fill="#ffffff"/>
        <circle cx="16" cy="9" r="2" fill="#ffffff"/>
        <circle cx="8" cy="9" r="1" fill="#000000"/>
        <circle cx="16" cy="9" r="1" fill="#000000"/>
        <path d="M 8 15 Q 12 18 16 15" stroke="#000000" stroke-width="1" fill="none"/>
      </svg>
    `));
    
    // Charger les onomatopées SVG pour les cris
    for (let i = 1; i <= 11; i++) {
      this.load.image(`onomatope-${i}`, `img/trolling-game/onomatope-${i}.svg`);
    }
    
    // Charger l'image spéciale pour les cris des NPCs followers
    this.load.image('npc-shout', 'img/trolling-game/npc-shout.svg');
    
    // Charger les sons de pas
    for (let i = 1; i <= 11; i++) {
      this.load.audio(`foot-${i}`, `sounds/trolling-game/foot-${i}.mp3`);
    }
    
    // Charger le son de cri
    this.load.audio('cry', 'sounds/trolling-game/cry.mp3');
    
    // Charger le son de touch (NPC commence à suivre)
    this.load.audio('touch', 'sounds/trolling-game/touch.mp3');
    
    // Charger le son de célébration pour l'outro
    this.load.audio('claps', 'sounds/trolling-game/claps.mp3');
  }

  create() {
    // 🎯 TRANSITION DOUCE: Créer un overlay pour éviter le flickering
    this.createTransitionOverlay();
    
    // ACTIVER LA PHYSIQUE PHASER POUR LES COLLISIONS CERCLES
    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.physics.world.gravity.set(0, 0); // Pas de gravité (vue du dessus)
    this.physics.world.overlapBias = 4; // Défaut: 4, réduit les chevauchements
    this.physics.world.separationBias = 4; // Défaut: 4, améliore la séparation
    this.physics.world.maxSubSteps = 10; // Subdivision pour haute vitesse
    
    console.log('🔵 Physique Phaser activée - Collisions cercles garanties');
    
    // Initialiser les systèmes de base
    this.initSystems();
    
    // Créer et charger le niveau principal
    this.loadMainLevel();
    
    // Configurer les contrôles
    this.setupInput();
    
    // 🎯 TRANSITION: Masquer l'overlay après création
    this.hideTransitionOverlay();
  }

  /**
   * 🎯 Créer un overlay pour masquer les transitions
   */
  createTransitionOverlay() {
    if (!this.transitionOverlay) {
      this.transitionOverlay = this.add.rectangle(800, 600, 1600, 1200, 0x000000);
      this.transitionOverlay.setDepth(10000); // Au-dessus de tout
      this.transitionOverlay.setAlpha(0.8); // Semi-transparent
    }
  }

  /**
   * 🎯 Masquer l'overlay de transition
   */
  hideTransitionOverlay() {
    if (this.transitionOverlay) {
      // Transition douce pour masquer l'overlay
      this.tweens.add({
        targets: this.transitionOverlay,
        alpha: 0,
        duration: 300, // 300ms de transition
        ease: 'Power2',
        onComplete: () => {
          if (this.transitionOverlay) {
            this.transitionOverlay.destroy();
            this.transitionOverlay = null;
          }
        }
      });
    }
  }

  initSystems() {
    this.entityManager = new EntityManager(this);
    this.collisionSystem = new CollisionSystem(this);
    this.soundManager = new SoundManager(this);
    this.footstepsSystem = new FootstepsSystem(this.soundManager);
    this.depthSortingSystem = new DepthSortingSystem(this);
    
    // Initialiser le gestionnaire de sons
    this.soundManager.init();
  }

  loadMainLevel() {
    // Nettoyer le niveau précédent s'il existe
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }
    
    // Créer et initialiser le niveau principal
    this.currentLevel = new MainLevel(this, this.entityManager, this.collisionSystem, this.footstepsSystem);
    this.currentLevel.init();
  }

  setupInput() {
    // Créer les contrôles du clavier
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.spaceKey = this.input.keyboard.addKey('SPACE'); 
    this.debugKey = this.input.keyboard.addKey('P'); // Touche B pour Debug (Bounding boxes)

    // États des touches pour éviter les répétitions
    this.spaceKeyPressed = false;
    this.debugKeyPressed = false;
  }

  // Gérer le redimensionnement de l'écran
  handleResize(width, height) {
    // Mettre à jour les dimensions de la scène
    this.scale.resize(width, height);
    
    // Notifier le niveau du changement de taille
    if (this.currentLevel && this.currentLevel.handleResize) {
      this.currentLevel.handleResize(width, height);
    }
  }

  update(time, delta) {
    // Gérer les contrôles du joueur
    this.handlePlayerInput();
    
    // Mettre à jour le niveau actuel
    if (this.currentLevel) {
      this.currentLevel.update(time, delta);
    }
    
    // Mettre à jour le système de collision
    this.collisionSystem.update();
    
    // Mettre à jour le tri par profondeur (vue 3/4)
    if (this.depthSortingSystem) {
      this.depthSortingSystem.update();
    }
    
    // Mettre à jour les sons de pas
    if (this.footstepsSystem && this.currentLevel) {
      // Sons du joueur
      if (this.currentLevel.player) {
        this.footstepsSystem.updatePlayerFootsteps(this.currentLevel.player, delta);
    }

      // Sons des NPCs
      const npcs = this.entityManager.getNpcs();
      if (npcs.length > 0) {
        this.footstepsSystem.updateNpcFootsteps(npcs);
  }
    }
  }

  handlePlayerInput() {
    const player = this.currentLevel?.player;
    if (!player) return;
    
    // Ne pas traiter les inputs si le joueur ne peut pas les recevoir (pendant l'intro par exemple)
    if (!player.playerState.canReceiveInput()) {
      return;
    }

    // Détecter toutes les directions pressées simultanément pour le mouvement en 8 directions
    const directions = {
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown
    };

    // Utiliser la nouvelle méthode de mouvement en 8 directions
    player.setMovement(directions);
    
    // Gérer le cri avec ESPACE
    if (this.spaceKey.isDown && !this.spaceKeyPressed) {
      this.spaceKeyPressed = true;
      player.shout();
    }

    // Réinitialiser le flag quand la touche est relâchée
    if (!this.spaceKey.isDown) {
      this.spaceKeyPressed = false;
    }

    // Gérer le toggle debug avec B
    if (this.debugKey.isDown && !this.debugKeyPressed) {
      this.debugKeyPressed = true;
      
      // Accéder à l'instance de Game via la référence globale
      if (window.game && window.game.toggleDebug) {
        const debugState = window.game.toggleDebug();
        console.log(`🔧 Debug mode: ${debugState ? 'ACTIVÉ' : 'DÉSACTIVÉ'} (Touche B)`);
      }
    }

    // Réinitialiser le flag debug quand la touche est relâchée
    if (!this.debugKey.isDown) {
      this.debugKeyPressed = false;
    }
  }
} 