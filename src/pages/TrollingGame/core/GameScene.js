import Phaser from 'phaser';
import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SoundManager } from './SoundManager';
import { FootstepsSystem } from '../systems/FootstepsSystem';
import { DepthSortingSystem } from '../systems/DepthSortingSystem';
import { PiedPiperLevel } from '../levels/PiedPiperLevel';
import { ShepherdsGateLevel } from '../levels/ShepherdsGateLevel';
import { ScapegoatLevel } from '../levels/ScapegoatLevel';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.entityManager = null;
    this.collisionSystem = null;
    this.soundManager = null;
    this.footstepsSystem = null;
    this.depthSortingSystem = null;
    this.currentLevel = null;
    
    // 🎯 Gestion des niveaux multiples (SOLID)
    this.availableLevels = {
      'shepherd': ShepherdsGateLevel,
      'piper': PiedPiperLevel,
      'scapegoat': ScapegoatLevel
    };
    this.currentLevelType = 'scapegoat'; // Niveau par défaut: Scapegoat (en dev)
    this.caveatFontLoaded = false;
  }

    /**
   * 🎯 FORCER LE CHARGEMENT DE CAVEAT : Assurer que la font est disponible AVANT create()
   */
ensureCaveatFont() {
    console.log('📝 🔄 PRELOAD: Vérification et chargement forcé de Caveat...');
    
    // Créer une promise pour le chargement de font
    this.caveatFontReady = new Promise((resolve) => {
      const checkCaveat = () => {
        if (document.fonts && document.fonts.check) {
          return document.fonts.check('40px "Caveat"') || document.fonts.check('40px Caveat');
        }
        return false;
      };
      
      // 1) Si déjà prête, on sort immédiatement
      if (checkCaveat()) {
        console.log('📝 ✅ PRELOAD: Caveat déjà disponible');
        this.caveatFontLoaded = true;
        resolve();
        return;
      }
      
      // 2) Essayer de charger la police locale via FontFace pour garantir la présence (évite le swap Google Fonts)
      if (window.FontFace) {
        try {
          const baseUrl = (import.meta && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
          const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
          const fontHref = `${normalizedBase}fonts/caveat.ttf`;
          console.log('📝 ⏳ PRELOAD: Chargement via FontFace de', fontHref);
          const face = new FontFace('Caveat', `url(${fontHref}) format("truetype")`);
          face.load().then((loadedFace) => {
            try {
              if (document.fonts && document.fonts.add) {
                document.fonts.add(loadedFace);
              }
            } catch (e) {
              console.warn('📝 ⚠️ PRELOAD: Ajout document.fonts.add a échoué', e);
            }
            console.log('📝 ✅ PRELOAD: Caveat chargée via FontFace');
            this.caveatFontLoaded = true;
            resolve();
          }).catch((error) => {
            console.warn('📝 ⚠️ PRELOAD: FontFace load a échoué, tentative via document.fonts.load', error);
            if (document.fonts && document.fonts.load) {
              document.fonts.load('40px "Caveat"').then(() => {
                console.log('📝 ✅ PRELOAD: Caveat chargée via document.fonts.load');
                this.caveatFontLoaded = true;
                resolve();
              }).catch((err2) => {
                console.warn('📝 ⚠️ PRELOAD: document.fonts.load a échoué', err2);
                resolve();
              });
            } else {
              setTimeout(resolve, 800);
            }
          });
        } catch (error) {
          console.warn('📝 ⚠️ PRELOAD: Exception FontFace, fallback document.fonts.load', error);
          if (document.fonts && document.fonts.load) {
            document.fonts.load('40px "Caveat"').then(() => { this.caveatFontLoaded = true; resolve(); }).catch(() => resolve());
          } else {
            setTimeout(resolve, 800);
          }
        }
      } else if (document.fonts && document.fonts.load) {
        console.log('📝 ⏳ PRELOAD: FontFace non dispo, tentative via document.fonts.load');
        document.fonts.load('40px "Caveat"').then(() => { this.caveatFontLoaded = true; resolve(); }).catch(() => resolve());
      } else {
        console.log('📝 ⚠️ PRELOAD: Aucune API de police, délai de sécurité');
        setTimeout(resolve, 800);
      }
    });
    
    // 🎯 RETOURNER LA PROMISE pour que preload() puisse l'attendre
    return this.caveatFontReady;
  }

  preload() {
    // 🎯 FORCER LE CHARGEMENT DE CAVEAT EN PREMIER pour éviter les font fallback
    this.ensureCaveatFont();
    
    // 🎨 NOUVEAU : Charger le spritesheet SVG multi-animations  
    // Chaque sprite : 120x200px (réduit pour optimiser la performance)
    this.load.spritesheet('character-spritesheet', 'img/trolling-game/character-spritesheet.svg', {
      frameWidth: 120,   // Largeur de chaque frame
      frameHeight: 200, // Hauteur de chaque frame
      startFrame: 0,
      endFrame: -1       // Calculé automatiquement par Phaser
    });
    
    // 🎨 Charger les métadonnées pour le découpage des animations
    this.load.json('character-metadata', 'img/trolling-game/character-spritesheet-metadata.json');
    
    // Charger les onomatopées SVG pour les cris
    this.load.image(`onomatope-1`, `img/trolling-game/onomatope-1.png`);
    
    // Charger l'image complète du tutorial (flèche + texte)
    this.load.image('this-is-you', 'img/trolling-game/this-is-you.svg');
    
    // Charger l'image tutorial (contrôles)
    this.load.image('tutorial', 'img/trolling-game/tutorial.svg');
    
    // Charger le coeur pour l'effet de follow des NPCs
    this.load.image('star-effect', 'img/trolling-game/heart.svg');

    // Charger les sons de pas
    for (let i = 1; i <= 11; i++) {
      this.load.audio(`foot-${i}`, `sounds/trolling-game/foot-${i}.mp3`);
    }

    // Charger les sons de pas
    for (let i = 1; i <= 4; i++) {
      this.load.audio(`child-shout-${i}`, `sounds/trolling-game/child-shout-${i}.mp3`);
    }
    
    
    // Charger le son de cri
    this.load.audio('cry', 'sounds/trolling-game/cry.mp3');
    
    // Charger le son de touch (NPC commence à suivre)
    this.load.audio('touch', 'sounds/trolling-game/touch.mp3');
    
    // Charger le son de célébration pour l'outro
    this.load.audio('claps', 'sounds/trolling-game/claps.mp3');
    
    // Charger le son splat pour les textes tutorial
    this.load.audio('splat', 'sounds/trolling-game/splat.mp3');
  }

  create(data) {
    // 🎯 ATTENDRE LE CHARGEMENT DE CAVEAT avant de créer quoi que ce soit
    if (data && data.targetLevel && this.availableLevels[data.targetLevel]) {
      this.currentLevelType = data.targetLevel;
    }
    this.waitForFontThenCreate();
  }

  /**
   * 🎯 Attendre Caveat puis lancer la création de la scène
   */
  async waitForFontThenCreate() {
    console.log('📝 🔄 CREATE: Attente de Caveat...');
    
    // Attendre que Caveat soit prête
    if (this.caveatFontReady) {
      await this.caveatFontReady;
    }
    
    console.log('📝 ✅ CREATE: Caveat prête - création de la scène');
    
    // Maintenant créer la scène normalement
    this.createScene();
  }

  /**
   * 🎯 Création effective de la scène (ancienne méthode create)
   */
  createScene() {
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

  /**
   * 🎯 OPEN/CLOSED PRINCIPLE : Charger un niveau (extensible pour nouveaux niveaux)
   */
  loadMainLevel() {
    this.loadLevel(this.currentLevelType);
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Charger un niveau spécifique
   */
  loadLevel(levelType = 'shepherd') {
    // Nettoyer le niveau précédent s'il existe
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }
    
    // Vérifier que le niveau existe
    if (!this.availableLevels[levelType]) {
      console.error(`❌ Niveau '${levelType}' inexistant. Chargement de Shepherd's Gate.`);
      levelType = 'shepherd';
    }
    
    // Créer et initialiser le niveau demandé (Dependency Inversion)
    const LevelClass = this.availableLevels[levelType];
    this.currentLevel = new LevelClass(this, this.entityManager, this.collisionSystem, this.footstepsSystem);
    this.currentLevelType = levelType;
    
    console.log(`🎯 Chargement niveau: ${levelType}`);
    this.currentLevel.init();
    
    // Afficher les stats du niveau
    if (this.currentLevel.getLevelStats) {
      const stats = this.currentLevel.getLevelStats();
      console.log(`📊 Stats niveau:`, stats);
    }
  }

  /**
   * 🎯 PUBLIC API : Basculer vers un autre niveau
   */
  switchToLevel(levelType) {
    if (levelType === this.currentLevelType) {
      console.log(`📋 Déjà sur le niveau '${levelType}'`);
      return;
    }
    
    console.log(`🔄 Basculement: ${this.currentLevelType} → ${levelType}`);
    this.loadLevel(levelType);
  }

  /**
   * 🎯 PUBLIC API : Passer au niveau suivant
   */
  loadNextLevel() {
    const levelProgression = ['scapegoat', 'piper', 'shepherd'];
    const currentIndex = levelProgression.indexOf(this.currentLevelType);
    
    if (currentIndex === -1) {
      console.warn(`⚠️ Niveau actuel '${this.currentLevelType}' non trouvé dans la progression`);
      return false;
    }
    
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= levelProgression.length) {
      console.log(`🎯 TOUS LES NIVEAUX TERMINÉS ! Retour au début.`);
      this.loadLevel(levelProgression[0]); // Retour au premier niveau
      return true;
    }
    
    const nextLevelType = levelProgression[nextIndex];
    console.log(`🎯 PROGRESSION AUTOMATIQUE: ${this.currentLevelType} → ${nextLevelType}`);
    
    // Petite pause pour que l'utilisateur voie le message
    setTimeout(() => {
      this.loadLevel(nextLevelType);
    }, 500);
    
    return true;
  }

  setupInput() {
    // Créer les contrôles du clavier
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.spaceKey = this.input.keyboard.addKey('SPACE'); 
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.debugKey = this.input.keyboard.addKey('P'); // Touche P pour Debug (Bounding boxes)

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

    // Sprint (Shift maintenu)
    if (player.movementController && player.movementController.setSprintEnabled) {
      const sprinting = !!(this.shiftKey && this.shiftKey.isDown);
      player.movementController.setSprintEnabled(sprinting);
    }
    
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