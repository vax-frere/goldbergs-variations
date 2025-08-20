import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { NpcSpawner } from '../systems/NpcSpawner';
import { IntroSequence } from '../systems/IntroSequence';
import { OutroSequence } from '../systems/OutroSequence';

import { PlayerStates } from '../core/PlayerState';

/**
 * 🕳️ SHEPHERD'S GATE - POUSSER LA FOULE DANS LE TROU
 * 
 * Mécanique : Le joueur doit pousser tous les NPCs dans un trou central
 * Victoire : Quand tous les NPCs sont tombés dans le trou
 * 
 * Principe SOLID appliqué :
 * - Single Responsibility : Gère uniquement la mécanique "pousser vers le trou"
 * - Open/Closed : Étend ILevel sans le modifier
 * - Liskov Substitution : Peut remplacer n'importe quel niveau
 * - Interface Segregation : APIs spécialisées pour la mécanique du trou
 * - Dependency Inversion : Dépend d'abstractions
 */
export class ShepherdsGateLevel extends ILevel {
  constructor(scene, entityManager, collisionSystem, footstepsSystem = null) {
    super();
    this.scene = scene;
    this.entityManager = entityManager;
    this.collisionSystem = collisionSystem;
    this.footstepsSystem = footstepsSystem;
    
    // Core entities
    this.player = null;
    this.walls = [];
    this.background = null;
    
    // Systems
    this.npcSpawner = null;
    this.introSequence = null;
    this.outroSequence = null;
    
    // 🕳️ CONFIGURATION SHEPHERD'S GATE
    this.levelConfig = {
      name: "Shepherd's Gate",
      mechanic: 'PUSH_TO_HOLE',
      description: 'Poussez tous les NPCs dans le trou central !',
      npcCount: 3,              // Foule très légère (encore divisé par 2)
      holeRadius: 160,           // Trou 2x plus grand
      holeColor: 0xffffff,      // Trou blanc
      pushForce: 150,            // Force de poussée du joueur
      fallSpeed: 300,            // Vitesse de chute dans le trou
      respawnDistance: 240       // Distance ajustée pour le trou plus grand
    };
    
    // 🚫 DÉSACTIVER le système de suivi des NPCs pour ce niveau
    this.disableNpcFollowing = true;
    
    // 🕳️ ÉLÉMENTS SPÉCIFIQUES AU TROU
    this.holeGraphics = null;     // Visuel du trou
    this.holeZone = null;         // Zone de détection du trou
    this.fallenNpcs = new Set();  // NPCs qui sont tombés
    this.holeCenter = { x: 0, y: 0 }; // Position du trou
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Initialiser le niveau Shepherd's Gate
   */
  init() {
    console.log(`🕳️ Initialisation ${this.levelConfig.name} - Mécanique: ${this.levelConfig.mechanic}`);
    
    // Phase 1 : Environnement
    this.createBackground();
    this.createPerimeterWalls();
    this.createCentralHole(); // 🕳️ NOUVEAU: Créer le trou central
    
    // Phase 2 : Entités principales
    this.createPlayer();
    
    // Phase 3 : Systèmes
    this.createShepherdSpawner(); // 🕳️ SPÉCIALISÉ pour mécanique poussée
    
    // 🎯 SOLID: Écouter les events pour gérer l'activation des contrôles
    this.setupLevelEventListeners();
    
    // Phase 4 : Population
    this.spawnShepherdCrowd(); // 🕳️ SPÉCIALISÉ pour spawn autour du trou
    
    // Phase 5 : Séquences
    this.createIntroSequence();
    this.createOutroSequence();
    
    // Phase 6 : Configuration finale
    this.setupCollisions();
    this.setupHoleDetection(); // 🕳️ NOUVEAU: Détection de chute
    
    console.log(`✅ ${this.levelConfig.name} initialisé avec succès`);
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Créer l'arrière-plan
   */
  createBackground() {
    this.background = this.scene.add.graphics();
    this.updateBackground();
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Mettre à jour l'arrière-plan
   */
  updateBackground() {
    if (this.background) {
      this.background.clear();
      // Fond noir pour contraster avec le trou blanc
      this.background.fillStyle(0x000000); // Noir
      this.background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    }
  }

  /**
   * 🕳️ NOUVEAU : Créer le trou central
   */
  createCentralHole() {
    // Position du trou au centre de l'écran
    this.holeCenter.x = this.scene.scale.width / 2;
    this.holeCenter.y = this.scene.scale.height / 2;
    
    // Créer le visuel du trou
    this.holeGraphics = this.scene.add.graphics();
    this.drawHole();
    
    // Créer la zone de détection invisible
    this.holeZone = this.scene.add.zone(
      this.holeCenter.x, 
      this.holeCenter.y, 
      this.levelConfig.holeRadius * 2, 
      this.levelConfig.holeRadius * 2
    );
    this.holeZone.setCircleDropZone(this.levelConfig.holeRadius);
    
    console.log(`🕳️ Trou central créé à (${this.holeCenter.x}, ${this.holeCenter.y}), rayon: ${this.levelConfig.holeRadius}`);
  }

  /**
   * 🕳️ NOUVEAU : Dessiner le visuel du trou (blanc, plat, sans bordures)
   */
  drawHole() {
    if (!this.holeGraphics) return;
    
    this.holeGraphics.clear();
    
    // Trou simple : juste un cercle blanc plat
    const radius = this.levelConfig.holeRadius;
    
    // Un seul cercle blanc, pas d'effet de profondeur, pas de bordures
    this.holeGraphics.fillStyle(this.levelConfig.holeColor); // Blanc
    this.holeGraphics.fillCircle(this.holeCenter.x, this.holeCenter.y, radius);
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Créer les murs du périmètre
   */
  createPerimeterWalls() {
    this.clearWalls();
    
    const wallSize = 25;
    const wallThickness = 40;
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Murs identiques aux autres niveaux
    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, -wallThickness, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, gameHeight, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, -wallThickness, y, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, gameWidth, y, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Nettoyer les murs
   */
  clearWalls() {
    this.walls.forEach(wall => {
      if (wall.id !== undefined) {
        this.entityManager.removeEntity(wall.id);
      }
      wall.destroy();
    });
    this.walls = [];
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Créer le joueur
   */
  createPlayer() {
    // Placer le joueur sur le bord, pas au centre (le trou est au centre)
    const centerX = this.scene.scale.width * 0.2; // Côté gauche
    const centerY = this.scene.scale.height / 2;
    
    if (!this.player) {
      this.player = new Player(this.scene, centerX, centerY);
      this.entityManager.addEntity(this.player, 'player');
    } else {
      this.player.sprite.x = centerX;
      this.player.sprite.y = centerY;
    }
    
    // État initial (sera changé à PLAYING à la fin de l'intro automatiquement)
    this.player.playerState.setState(PlayerStates.INTRO);
    this.player.setInputEnabled(false);
    
    // 🚫 VIDER la liste des followers pour éviter les conflits avec TrailBehavior
    this.player.clearAllFollowers();
    
    console.log('🎯 Shepherd\'s Gate : Joueur en état INTRO, contrôles seront activés après l\'intro');
    console.log('🚫 Système de suivi désactivé - NPCs ne suivront pas le joueur');
    
    // Écouter l'activation des contrôles pour confirmation
    this.scene.events.once('introSequenceComplete', () => {
      console.log('🎮 Shepherd\'s Gate : Intro terminée, joueur prêt à jouer !');
    });
    
    this.updatePlayerBounds();
    
    // Augmenter la force de poussée du joueur pour cette mécanique
    this.enhancePlayerPushForce();
    
    // Debug si activé
    if (window.game && window.game.debugShoutRadius) {
      this.player.setDebugEnabled(true);
      console.log('🔍 Debug Player activé pour Shepherd\'s Gate');
    }
  }

  /**
   * 🕳️ NOUVEAU : Améliorer la force de poussée du joueur
   */
  enhancePlayerPushForce() {
    if (this.player && this.player.sprite && this.player.sprite.body) {
      // Augmenter la masse du joueur pour qu'il puisse pousser plus fort
      this.player.sprite.body.setMass(2.0); // Plus lourd = pousse plus fort
      
      // Réduire le drag pour un mouvement plus fluide
      this.player.sprite.body.setDrag(60, 60);
    }
  }



  /**
   * 🕳️ NOUVEAU : Créer le spawner spécialisé pour Shepherd's Gate
   */
  createShepherdSpawner() {
    this.npcSpawner = new NpcSpawner(this.scene, this.entityManager, this.collisionSystem);
    
    // Configuration pour mécanique de poussée
    this.configureShepherdSpawner();
    
    console.log(`🕳️ ShepherdSpawner configuré : ${this.levelConfig.npcCount} NPCs autour du trou`);
  }
  
  /**
   * 🎯 SOLID: Setup des event listeners pour gérer l'activation des contrôles
   * Shepherd's Gate n'a PAS de tutorial - activation directe après intro
   */
  setupLevelEventListeners() {
    // Écouter la fin de l'intro
    this.scene.events.on('introSequenceComplete', () => {
      this.onIntroComplete();
    });
    
    console.log('🎯 Event listeners configurés pour Shepherd\'s Gate (sans tutorial)');
  }
  
  /**
   * 🎯 SOLID: Appelé quand l'intro est terminée
   * Activation directe car pas de tutorial
   */
  onIntroComplete() {
    console.log('🎮 Shepherd\'s Gate: Intro terminée - activation directe des contrôles');
    this.activatePlayerControls();
  }
  
  /**
   * 🎯 SOLID: Activer les contrôles du joueur
   */
  activatePlayerControls() {
    if (this.player && this.player.playerState) {
      this.player.playerState.setState(PlayerStates.PLAYING);
      console.log('🎮 ✅ Shepherd\'s Gate: Contrôles du joueur ACTIVÉS !');
    }
  }

  /**
   * 🕳️ NOUVEAU : Configurer le spawner pour la mécanique de poussée
   */
  configureShepherdSpawner() {
    this.npcSpawner.groupSize = this.levelConfig.npcCount; // 60 NPCs
    this.npcSpawner.spawnRadius = this.levelConfig.respawnDistance; // Distance du trou
    
    // Position de spawn : autour du trou (pas dedans)
    this.npcSpawner.centerX = this.holeCenter.x;
    this.npcSpawner.centerY = this.holeCenter.y;
    
    // Désactiver la migration automatique (on veut qu'ils restent sur place)
    this.npcSpawner.migrationActive = false;
    
    // Configuration pour NPCs plus "poussables"
    this.npcSpawner.migrationConfig = {
      staggerDelayMin: 0,
      staggerDelayMax: 0,      // Pas de migration
      speedMin: 0,
      speedMax: 0,             // Pas de mouvement autonome
      migrationSpeed: 0,
      spawnMargin: 0,
      verticalVariation: 50,
      speedVariation: 0,
      verticalSpeedVariation: 0
    };
    
    console.log('🕳️ Configuration shepherd appliquée : NPCs statiques et poussables');
  }

  /**
   * 🕳️ NOUVEAU : Spawner la foule autour du trou
   */
  spawnShepherdCrowd() {
    if (!this.npcSpawner || !this.player) return;
    
    const playerPosition = {
      x: this.player.sprite.x,
      y: this.player.sprite.y
    };
    
    console.log(`🕳️ Début spawn foule Shepherd : ${this.levelConfig.npcCount} NPCs autour du trou`);
    
    // Spawner les NPCs
    this.npcSpawner.spawnGroups(playerPosition);
    
    // Configuration spéciale pour mécanique de poussée
    this.setupShepherdNpcBehavior();
    
    // Statistiques
    const stats = this.npcSpawner.getSpawnStats();
    console.log('📊 Statistiques Shepherd:', stats);
  }

  /**
   * 🕳️ NOUVEAU : Configurer le comportement des NPCs pour la poussée
   * NPCs simplifiés : juste PEUR (fleeing) - pas de trembling ni following
   */
  setupShepherdNpcBehavior() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    
    allNpcs.forEach(npc => {
      if (npc.sprite && npc.sprite.body) {
        // 🔧 PHYSIQUE : Configuration pour être poussés facilement
        npc.sprite.body.setMass(0.5); // Légers
        npc.sprite.body.setDrag(20, 20); // Peu de friction
        npc.sprite.body.setBounce(0.3, 0.3); // Rebondissent
        
        // 🎭 COMPORTEMENT : SEULEMENT peur + être poussable
        npc.state = 'normal'; // État de base
        npc.followTarget = null; // Pas de suivi
        npc.velocity.x = 0;
        npc.velocity.y = 0;
        
        // 🚫 DÉSACTIVER les comportements complexes
        npc.canTremble = false; // Pas de trembling
        npc.canFollow = false;  // Pas de following
        npc.shepherdMode = true; // Flag pour identifier les NPCs Shepherd
        
        // 🕳️ État du trou
        npc.hasFallen = false;
        
        // 🎯 OVERRIDE: Forcer l'état fleeing si le joueur s'approche
        npc.originalStartFleeing = npc.startFleeing;
        npc.startFleeing = function() {
          // Garder seulement la logique de fuite, pas de trembling après
          this.state = 'fleeing';
          this.stateTimer = 0;
          this.stateDuration = 2000 + Math.random() * 3000; // 2-5 secondes de fuite
          
          // Direction de fuite simple
          const player = this.scene.currentLevel?.player;
          if (player) {
            const dx = this.sprite.x - player.sprite.x;
            const dy = this.sprite.y - player.sprite.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              this.fleeDirection.x = dx / distance;
              this.fleeDirection.y = dy / distance;
            }
          }
        };
        
        // 🎯 OVERRIDE: Retour direct à normal (pas de trembling)
        npc.originalReturnToNormal = npc.returnToNormal;
        npc.returnToNormal = function() {
          this.state = 'normal';
          this.stateTimer = 0;
          this.stateDuration = 0;
          this.velocity.x = 0;
          this.velocity.y = 0;
          // PAS de trembling après
        };
      }
    });
    
    console.log(`🕳️ Shepherd NPCs configurés : ${allNpcs.length} avec comportement simplifié (peur seulement)`);
  }
  
  /**
   * 🚫 PROTECTION : Empêcher les NPCs de passer en état following
   */
  enforceNoFollowing() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    let followingCount = 0;
    
    allNpcs.forEach(npc => {
      if (npc.state === 'following') {
        followingCount++;
        npc.state = 'normal';
        npc.followTarget = null;
        npc.velocity.x = 0;
        npc.velocity.y = 0;
      }
    });
    
    // Log temporaire pour diagnostiquer
    if (followingCount > 0) {
      console.log(`🚫 FORCÉ ${followingCount} NPCs à arrêter de suivre`);
    }
  }

  /**
   * 🕳️ NOUVEAU : Configurer la détection de chute dans le trou
   */
  setupHoleDetection() {
    // Vérifier régulièrement quels NPCs sont dans le trou
    this.holeDetectionTimer = this.scene.time.addEvent({
      delay: 100, // Vérifier toutes les 100ms
      callback: this.checkNpcsInHole,
      callbackScope: this,
      loop: true
    });
    
    console.log('🕳️ Détection de trou activée');
  }

  /**
   * 🕳️ NOUVEAU : Vérifier quels NPCs sont dans le trou
   */
  checkNpcsInHole() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    
    allNpcs.forEach(npc => {
      if (npc.hasFallen) return; // Déjà tombé
      
      const distance = Phaser.Math.Distance.Between(
        npc.sprite.x, npc.sprite.y,
        this.holeCenter.x, this.holeCenter.y
      );
      
      // Si le NPC est dans le rayon du trou
      if (distance <= this.levelConfig.holeRadius) {
        this.makeNpcFall(npc);
      }
    });
  }

  /**
   * 🕳️ NOUVEAU : Faire tomber un NPC dans le trou
   */
  makeNpcFall(npc) {
    if (npc.hasFallen) return;
    
    npc.hasFallen = true;
    this.fallenNpcs.add(npc.id);
    
    console.log(`🕳️ NPC ${npc.id} tombe dans le trou ! (${this.fallenNpcs.size}/${this.levelConfig.npcCount})`);
    
    // Animation de chute
    this.scene.tweens.add({
      targets: npc.sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Cacher complètement le NPC
        npc.sprite.setVisible(false);
        npc.sprite.body.setEnable(false);
      }
    });
    
    // Son de chute (si disponible)
    if (this.scene.soundManager) {
      this.scene.soundManager.playTouch(); // Son de touch quand NPC tombe dans le trou
    }
    
    // Vérifier victoire immédiatement
    const isVictorious = this.checkShepherdVictory();
    if (isVictorious) {
      console.log(`🎯 VICTOIRE IMMÉDIATE DÉTECTÉE ! Attente du prochain frame pour déclencher l'outro...`);
    }
  }

  /**
   * 🕳️ NOUVEAU : Vérifier la victoire (tous les NPCs dans le trou)
   */
  checkShepherdVictory() {
    const totalNpcs = this.levelConfig.npcCount;
    const fallenCount = this.fallenNpcs.size;
    
    if (fallenCount >= totalNpcs) {
      console.log(`🎯 VICTOIRE SHEPHERD'S GATE ! Tous les ${totalNpcs} NPCs sont dans le trou !`);
      return true;
    }
    
    return false;
  }

  /**
   * 🎯 LISKOV SUBSTITUTION : Même interface de vérification de fin
   */
  checkLevelCompletion() {
    return this.checkShepherdVictory();
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Créer la séquence d'intro
   */
  createIntroSequence() {
    if (!this.player) {
      console.error('❌ Impossible de créer la séquence d\'introduction sans joueur');
      return;
    }

    this.introSequence = new IntroSequence(this.scene, this.player, this);
    
    // Position d'intro sur le côté gauche
    const targetX = this.scene.scale.width * 0.2;
    const targetY = this.scene.scale.height / 2;
    
    this.disablePerimeterWalls();
    this.introSequence.start(targetX, targetY);
    
    console.log('🎬 Séquence d\'introduction créée pour Shepherd\'s Gate');
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Créer la séquence d'outro
   */
  createOutroSequence() {
    this.outroSequence = new OutroSequence(this.scene, this.player, this);
    console.log('🎬 OutroSequence créée pour Shepherd\'s Gate');
  }

  /**
   * 🎯 LISKOV SUBSTITUTION : Même interface pour désactiver murs
   */
  disablePerimeterWalls() {
    this.walls.forEach(wall => wall.setEnabled(false));
    console.log('🚫 Murs extérieurs désactivés pour l\'introduction (Shepherd\'s Gate)');
  }

  /**
   * 🎯 LISKOV SUBSTITUTION : Même interface pour activer murs
   */
  enablePerimeterWalls() {
    this.walls.forEach(wall => wall.setEnabled(true));
    console.log('✅ Murs extérieurs réactivés après l\'introduction (Shepherd\'s Gate)');
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Désactiver limites monde pour NPCs
   */
  disableWorldBoundsForAllNpcs() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc, index) => {
      if (npc.sprite && npc.sprite.body) {
        npc.sprite.body.setCollideWorldBounds(false);
      }
    });
    
    console.log(`🎬 Limites du monde désactivées pour ${allNpcs.length} NPCs Shepherd`);
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Mettre à jour les limites du joueur
   */
  updatePlayerBounds() {
    if (this.player) {
      this.player.setWorldBounds({
        x: 0,
        y: 0,
        width: this.scene.scale.width,
        height: this.scene.scale.height
      });
    }
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Configuration des collisions
   */
  setupCollisions() {
    const allNpcs = this.entityManager.getNpcs();
    console.log(`🔵 Configuration collisions Shepherd's Gate : ${allNpcs.length} NPCs`);
    
    // Collisions joueur vs murs
    this.walls.forEach(wall => {
      if (wall.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, wall.body);
      }
    });
    
    // Collisions NPCs vs murs
    allNpcs.forEach(npc => {
      this.walls.forEach(wall => {
        if (wall.body && npc.sprite && npc.sprite.body) {
          this.scene.physics.add.collider(npc.sprite, wall.body);
        }
      });
    });
    
    // Collisions NPC vs NPC (importantes pour l'effet de foule)
    for (let i = 0; i < allNpcs.length; i++) {
      for (let j = i + 1; j < allNpcs.length; j++) {
        const npc1 = allNpcs[i];
        const npc2 = allNpcs[j];
        if (npc1.sprite && npc1.sprite.body && npc2.sprite && npc2.sprite.body) {
          this.scene.physics.add.collider(npc1.sprite, npc2.sprite);
        }
      }
    }
    
    // Collisions joueur vs NPCs (pour pousser)
    allNpcs.forEach((npc, index) => {
      if (npc.sprite && npc.sprite.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, npc.sprite);
      }
    });
    
    console.log(`🕳️ Collisions Shepherd configurées pour pousser vers le trou`);
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Gérer le redimensionnement
   */
  handleResize(width, height) {
    this.updateBackground();
    this.createPerimeterWalls();
    this.updatePlayerBounds();
    
    // Recalculer la position du trou
    this.holeCenter.x = width / 2;
    this.holeCenter.y = height / 2;
    this.drawHole();
    
    if (this.npcSpawner && this.player) {
      const playerPosition = {
        x: this.player.sprite.x,
        y: this.player.sprite.y
      };
      this.npcSpawner.respawnGroups(playerPosition);
      this.setupShepherdNpcBehavior();
    }
    
    this.setupCollisions();
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Boucle de mise à jour principale
   */
  update(time, delta) {
    // Séquence d'introduction
    if (this.introSequence) {
      this.introSequence.update();
    }
    
    // Vérification fin de niveau et outro
    if (this.outroSequence) {
      if (!this.outroSequence.isActive && this.checkLevelCompletion()) {
        console.log(`🎯 DÉCLENCHEMENT OUTRO SHEPHERD'S GATE ! Passage vers Pied Piper...`);
        this.outroSequence.start('right');
      }
      
      if (this.outroSequence.isActive) {
        this.outroSequence.update();
      }
    }
    
    // Mise à jour des entités
    this.entityManager.update(time, delta);
    
    // 🚫 PROTECTION : Forcer tous les NPCs à rester en état normal (pas de following)
    this.enforceNoFollowing();
    
    // Mise à jour du spawner
    if (this.npcSpawner) {
      this.npcSpawner.update(delta);
    }
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Nettoyage des ressources
   */
  cleanup() {
    console.log(`🧹 Nettoyage de ${this.levelConfig.name}...`);
    
    // Nettoyer le timer de détection du trou
    if (this.holeDetectionTimer) {
      this.holeDetectionTimer.destroy();
      this.holeDetectionTimer = null;
    }
    
    // Nettoyer les graphics du trou
    if (this.holeGraphics) {
      this.holeGraphics.destroy();
      this.holeGraphics = null;
    }
    
    if (this.holeZone) {
      this.holeZone.destroy();
      this.holeZone = null;
    }
    
    // Nettoyer la liste des NPCs tombés
    this.fallenNpcs.clear();
    
    // Nettoyer les séquences
    if (this.introSequence) {
      this.introSequence.destroy();
      this.introSequence = null;
    }
    
    if (this.outroSequence) {
      this.outroSequence.destroy();
      this.outroSequence = null;
    }
    
    // Nettoyer le système de NPCs
    if (this.npcSpawner) {
      this.npcSpawner.cleanup();
      this.npcSpawner = null;
    }
    
    // Nettoyer le système de footsteps
    if (this.footstepsSystem) {
      this.footstepsSystem.destroy();
    }
    
    // Nettoyer l'arrière-plan
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    
    // Nettoyer les murs
    this.clearWalls();
    
    // Nettoyer toutes les entités
    this.entityManager.clear();
    this.player = null;
    
    console.log(`✅ ${this.levelConfig.name} nettoyé (trou fermé, ${this.levelConfig.npcCount} NPCs libérés)`);
  }

  /**
   * 🎯 PUBLIC API : Obtenir les stats du niveau
   */
  getLevelStats() {
    const totalNpcs = this.levelConfig.npcCount;
    const fallenCount = this.fallenNpcs.size;
    
    return {
      name: this.levelConfig.name,
      type: 'SHEPHERD_GATE',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: totalNpcs,
      fallenNpcs: fallenCount,
      completionRate: totalNpcs > 0 ? (fallenCount / totalNpcs * 100).toFixed(1) + '%' : '0%',
      holeRadius: this.levelConfig.holeRadius,
      remaining: totalNpcs - fallenCount
    };
  }
} 