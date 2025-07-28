import Phaser from 'phaser';
import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SchoolLevel } from '../levels/SchoolLevel';
import { Level2 } from '../levels/Level2';
import { EffectManager } from '../effects/EffectManager';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.entityManager = null;
    this.collisionSystem = null;
    this.effectManager = null;
    this.currentLevel = null;
  }

  preload() {
    // Charger le spritesheet Yume Nikki
    this.load.spritesheet('yume-nikki-player', 'img/yume-nikki-character-spritesheet-transparent.png', {
      frameWidth: 140,
      frameHeight: 190,
      startFrame: 0,
      endFrame: 11 // 3 frames × 4 directions = 12 frames (0-11)
    });
    
    // Charger les fichiers audio
    this.load.audio('level-1-music', 'sounds/level-1.mp3');
    this.load.audio('level-2', 'sounds/level-2.mp3');
    this.load.audio('transition-sound', 'sounds/hover.mp3'); // Son de survol pour la transition
    this.load.audio('level-enter', 'sounds/enter-level.mp3'); // Son d'entrée de niveau
    
    // Créer des formes de base temporaires pour les autres entités
    this.load.image('student', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" fill="#f5a623"/>
      </svg>
    `));
    
    this.load.image('wall', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#8b4513"/>
      </svg>
    `));
    
    this.load.image('floor', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" fill="#d4d4d4"/>
      </svg>
    `));
    
    this.load.image('door', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <!-- Cadre de la porte double -->
        <rect width="64" height="64" fill="#654321" stroke="#432818" stroke-width="3"/>
        
        <!-- Panneau gauche -->
        <rect x="4" y="4" width="26" height="56" fill="#8B4513" stroke="#654321" stroke-width="1"/>
        <rect x="8" y="12" width="18" height="16" fill="#654321" opacity="0.7"/>
        <rect x="8" y="32" width="18" height="16" fill="#654321" opacity="0.7"/>
        <circle cx="24" cy="32" r="2" fill="#000000"/>
        
        <!-- Panneau droit -->
        <rect x="34" y="4" width="26" height="56" fill="#8B4513" stroke="#654321" stroke-width="1"/>
        <rect x="38" y="12" width="18" height="16" fill="#654321" opacity="0.7"/>
        <rect x="38" y="32" width="18" height="16" fill="#654321" opacity="0.7"/>
        <circle cx="40" cy="32" r="2" fill="#000000"/>
        
        <!-- Séparation centrale -->
        <line x1="32" y1="6" x2="32" y2="58" stroke="#432818" stroke-width="2"/>
      </svg>
    `));
    
    this.load.image('psychologist', 'data:image/svg+xml;base64,' + btoa(`
      <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#4a90e2"/>
        <circle cx="18" cy="18" r="3" fill="#ffffff"/>
        <circle cx="30" cy="18" r="3" fill="#ffffff"/>
        <path d="M 15 30 Q 24 36 33 30" stroke="#ffffff" stroke-width="2" fill="none"/>
        <rect x="20" y="8" width="8" height="6" fill="#8B4513" rx="3"/>
      </svg>
    `));
  }

  create(transitionData) {
    // Créer les animations pour le joueur Yume Nikki
    this.createPlayerAnimations();
    
    // Initialiser les systèmes
    this.entityManager = new EntityManager();
    this.collisionSystem = new CollisionSystem();
    this.effectManager = new EffectManager(this);
    
    // Déterminer le niveau à charger selon les données de transition
    const targetLevel = transitionData?.targetLevel || 'school';
    this.initializeLevel(targetLevel);
    
    // Désactiver le debug par défaut et afficher l'aide
    this.time.delayedCall(100, () => {
      this.setDebugMode(this.debugMode);
      console.log('🎮 Utilisez WASD ou les flèches pour bouger');
      console.log('🔍 Appuyez sur [P] pour basculer le mode debug');
    });
    
    // Configurer les contrôles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
    this.debugKey = this.input.keyboard.addKey('P');
    this.interactKey = this.input.keyboard.addKey('SPACE');
    
    // État du debug
    this.debugMode = false; // Désactivé par défaut
    this.debugKeyPressed = false;
    this.interactKeyPressed = false;
  }

  initializeLevel(levelName) {
    // Créer le niveau approprié
    switch (levelName) {
      case 'level2':
        this.currentLevel = new Level2();
        console.log('🏢 Initialisation du Niveau 2');
        break;
      case 'school':
      default:
        this.currentLevel = new SchoolLevel();
        console.log('🏫 Initialisation du Niveau École');
        break;
    }
    
    // Initialiser le niveau
    this.currentLevel.init(this);
  }

  createPlayerAnimations() {
    // Animations de marche vers le haut (frames 0-2) - première ligne
    this.anims.create({
      key: 'walk-up',
      frames: this.anims.generateFrameNumbers('yume-nikki-player', { start: 0, end: 2 }),
      frameRate: 8,
      repeat: -1
    });

    // Animations de marche vers la droite (frames 3-5) - deuxième ligne
    this.anims.create({
      key: 'walk-right',
      frames: this.anims.generateFrameNumbers('yume-nikki-player', { start: 3, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    // Animations de marche vers le bas (frames 6-8) - troisième ligne
    this.anims.create({
      key: 'walk-down',
      frames: this.anims.generateFrameNumbers('yume-nikki-player', { start: 6, end: 8 }),
      frameRate: 8,
      repeat: -1
    });

    // Animations de marche vers la gauche (frames 9-11) - quatrième ligne
    this.anims.create({
      key: 'walk-left',
      frames: this.anims.generateFrameNumbers('yume-nikki-player', { start: 9, end: 11 }),
      frameRate: 8,
      repeat: -1
    });

    // Animations d'arrêt (frame du milieu pour chaque direction)
    this.anims.create({
      key: 'idle-up',
      frames: [{ key: 'yume-nikki-player', frame: 1 }],
      frameRate: 1
    });

    this.anims.create({
      key: 'idle-right',
      frames: [{ key: 'yume-nikki-player', frame: 4 }],
      frameRate: 1
    });

    this.anims.create({
      key: 'idle-down',
      frames: [{ key: 'yume-nikki-player', frame: 7 }],
      frameRate: 1
    });

    this.anims.create({
      key: 'idle-left',
      frames: [{ key: 'yume-nikki-player', frame: 10 }],
      frameRate: 1
    });
  }

  update(time, delta) {
    // Mettre à jour tous les systèmes
    if (this.entityManager) {
      this.entityManager.update(delta);
    }
    
    if (this.collisionSystem) {
      this.collisionSystem.update();
    }
    
    if (this.effectManager) {
      this.effectManager.update(delta);
    }
    
    if (this.currentLevel) {
      this.currentLevel.update(delta);
    }
    
    // Gérer les contrôles du joueur
    this.handlePlayerInput();
  }

  handlePlayerInput() {
    const player = this.entityManager.getPlayer();
    if (!player) return;

    // Gérer le toggle du debug avec P
    if (this.debugKey.isDown && !this.debugKeyPressed) {
      this.debugKeyPressed = true;
      this.debugMode = !this.debugMode;
      console.log(`🔍 Mode debug: ${this.debugMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
      
             // Appliquer le nouveau mode debug
      this.setDebugMode(this.debugMode);
    }
    
    // Réinitialiser le flag quand la touche est relâchée
    if (!this.debugKey.isDown) {
      this.debugKeyPressed = false;
    }

    // Gérer l'interaction avec ESPACE
    if (this.interactKey.isDown && !this.interactKeyPressed) {
      this.interactKeyPressed = true;
      this.handlePlayerInteraction();
    }

    // Réinitialiser le flag quand la touche est relâchée
    if (!this.interactKey.isDown) {
      this.interactKeyPressed = false;
    }

    // Mouvement du joueur
    let direction = null;
    const speed = 150;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      direction = 'right';
    } else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      direction = 'down';
    }

    if (direction) {
      player.move(direction, speed);
    }
  }

  getEntityManager() {
    return this.entityManager;
  }

  getCollisionSystem() {
    return this.collisionSystem;
  }

  getEffectManager() {
    return this.effectManager;
  }

  // Gérer l'interaction du joueur avec les entités
  handlePlayerInteraction() {
    const player = this.entityManager.getPlayer();
    if (!player) return;

    // Chercher les entités interactives à proximité
    const nearbyEntities = player.getNearbyEntities(this.entityManager, 60);
    
    for (const entity of nearbyEntities) {
      if (entity.entityType === 'door' && entity.canInteract && entity.canInteract(player)) {
        entity.onInteraction(player);
        break; // Interagir avec une seule entité à la fois
      } else if (entity.entityType === 'student' && entity.canInteract && entity.canInteract(player)) {
        entity.onInteraction(player);
        
        // Appliquer l'effet de bruit si on interagit avec un étudiant
        if (this.effectManager) {
          this.effectManager.applyNoiseEffect();
        }
        break;
      } else if (entity.entityType === 'psychologist' && entity.canInteract && entity.canInteract(player)) {
        entity.onInteraction(player);
        console.log('🗣️ Interaction avec le psychologue');
        break;
      }
    }
  }

  // Changer de niveau avec transition
  changeLevel(levelName, levelTitle) {
    console.log(`🔄 Démarrage de la transition vers: ${levelName}`);
    
    // Définir le titre du niveau
    const titles = {
      'level2': 'Psychologist',
      'school': 'Classroom',
      'level3': 'Level 3 - Coming Soon'
    };
    
    const finalTitle = levelTitle || titles[levelName] || 'Nouveau Niveau';
    
    // Nettoyer le niveau actuel avant la transition
    this.cleanupCurrentLevel();
    
    // Démarrer la scène de transition avec les données
    this.scene.start('TransitionScene', {
      targetLevel: levelName,
      levelTitle: finalTitle
    });
  }

  // Nettoyer le niveau actuel (méthode séparée pour la réutiliser)
  cleanupCurrentLevel() {
    console.log('🧹 Nettoyage du niveau actuel...');
    
    // Nettoyer le niveau actuel
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }
    
    // Nettoyer tous les systèmes centraux pour éviter l'overlap
    if (this.entityManager) {
      this.entityManager.clear();
    }
    
    if (this.collisionSystem) {
      this.collisionSystem.clear();
    }
    
    if (this.effectManager) {
      this.effectManager.clear();
    }
    
    // Nettoyer tous les éléments graphiques générés par les niveaux
    this.children.list.slice().forEach(child => {
      // Détruire tous les éléments sauf les éléments d'interface UI essentiels
      if (child.type === 'Rectangle' || child.type === 'Image' || child.type === 'Sprite' || 
          (child.type === 'Text' && child.text && !child.text.includes('Debug') && !child.text.includes('FPS'))) {
        try {
          child.destroy();
        } catch (e) {
          // Ignorer les erreurs de destruction si l'élément est déjà détruit
        }
      }
    });
    
    console.log('✅ Nettoyage terminé');
  }

  // Méthode pour appliquer le mode debug à tous les éléments
  setDebugMode(show) {
    const player = this.entityManager.getPlayer();
    
    // Toggle l'affichage des hitboxes du joueur
    if (player && player.toggleDebugHitboxes) {
      player.toggleDebugHitboxes(show);
    }
    
    // Toggle l'affichage des hitboxes des étudiants
    if (this.currentLevel && this.currentLevel.toggleStudentsDebug) {
      this.currentLevel.toggleStudentsDebug(show);
    }
  }

  // Méthodes utilitaires pour l'accès depuis les entités
  getEntityManager() {
    return this.entityManager;
  }

  getCollisionSystem() {
    return this.collisionSystem;
  }

  getEffectManager() {
    return this.effectManager;
  }
} 