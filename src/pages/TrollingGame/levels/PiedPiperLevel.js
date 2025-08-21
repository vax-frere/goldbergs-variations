import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { NpcSpawner } from '../systems/NpcSpawner';
import { IntroSequence } from '../systems/IntroSequence';
import { OutroSequence } from '../systems/OutroSequence';
import { TutorialTextManager } from '../systems/TutorialTextManager';
import { GroupFleeingSystem } from '../systems/GroupFleeingSystem';
import { PlayerStates } from '../core/PlayerState';

/**
 * 🎵 PIED PIPER - MENER LA FOULE AVEC SON CRI
 * 
 * Mécanique : Le joueur utilise son cri pour attirer et faire suivre tous les NPCs
 * Victoire : Quand tous les NPCs suivent le joueur
 * 
 * Principe SOLID appliqué :
 * - Single Responsibility : Gère uniquement la mécanique "faire suivre"
 * - Open/Closed : Étend ILevel sans le modifier
 * - Liskov Substitution : Peut remplacer n'importe quel niveau
 * - Interface Segregation : APIs spécialisées pour la mécanique de follow
 * - Dependency Inversion : Dépend d'abstractions
 */
export class PiedPiperLevel extends ILevel {
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
    this.tutorialTextManager = null;
    this.groupFleeingSystem = null; // 🎯 Système spécifique au niveau Piper
    
    // 🎵 CONFIGURATION PIED PIPER
    this.levelConfig = {
      name: "Pied Piper",
      mechanic: 'ATTRACT_AND_FOLLOW',
      description: 'Attirez tous les NPCs avec votre cri pour les faire suivre !',
      npcCount: 3,           // Nombre classique, gérable
      followRadius: 100,      // Rayon d'attraction du cri
      difficulty: 'STANDARD'  // Difficulté normale
    };
  }

  /**
   * 🎯 SINGLE RESPONSIBILITY : Initialiser le niveau Pied Piper
   */
  init() {
    console.log(`🎵 Initialisation ${this.levelConfig.name} - Mécanique: ${this.levelConfig.mechanic}`);
    
    // Phase 1 : Environnement
    this.createBackground();
    this.createPerimeterWalls();
    
    // Phase 2 : Entités principales
    this.createPlayer();
    
    // Phase 3 : Systèmes
    this.createTutorialTextManager();
    this.createNpcSpawner();
    this.createGroupFleeingSystem(); // 🎯 Système spécifique au niveau Piper
    
    // 🎯 SOLID: Écouter les events pour gérer l'activation des contrôles
    this.setupLevelEventListeners();
    
    // Phase 4 : Population
    this.spawnNpcs();
    
    // Phase 5 : Séquences
    this.createIntroSequence();
    this.createOutroSequence();
    
    // Phase 6 : Configuration finale
    this.setupCollisions();
    
    console.log(`✅ ${this.levelConfig.name} initialisé avec succès`);
  }

  createBackground() {
    // Créer un fond noir qui couvre tout l'écran
    this.background = this.scene.add.graphics();
    this.updateBackground();
  }

  updateBackground() {
    if (this.background) {
      this.background.clear();
      this.background.fillStyle(0x000000); // Noir
      this.background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    }
  }

  createPerimeterWalls() {
    this.clearWalls();
    
    const wallSize = 25; // Espacement entre les murs
    const wallThickness = 40; // Taille réelle des murs (définie dans Wall.js)
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Murs du haut (invisibles) - baissé d'une taille de NPC
    for (let x = 0; x < gameWidth; x += wallSize) {
      const npcHeight = 64; // Taille approximative d'un NPC
      const wall = new Wall(this.scene, x, -wallThickness + npcHeight, true); // 🎯 BAISSÉ : Position ajustée d'une taille de NPC
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs du bas (invisibles) - rapprochés de 10px de l'écran  
    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, gameHeight - 10, true); // 🎯 RAPPROCHÉ : 10px plus près de l'écran
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de gauche (invisibles) - rapprochés de 10px de l'écran
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, -wallThickness + 10, y, true); // 🎯 RAPPROCHÉ : 10px plus près de l'écran
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de droite (invisibles) - rapprochés de 10px de l'écran
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, gameWidth - 10, y, true); // 🎯 RAPPROCHÉ : 10px plus près de l'écran
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }
  }

  clearWalls() {
    // Nettoyer les anciens murs
    this.walls.forEach(wall => {
      if (wall.id !== undefined) {
        this.entityManager.removeEntity(wall.id);
      }
      // Détruire le mur proprement
      wall.destroy();
    });
    this.walls = [];
  }

  // Désactiver temporairement les collisions des murs extérieurs (pour l'introduction)
  disablePerimeterWalls() {
    this.walls.forEach(wall => {
      wall.setEnabled(false);
    });
    console.log('🚫 Murs extérieurs désactivés pour l\'introduction');
  }

  // Réactiver les collisions des murs extérieurs (fin d'introduction)
  enablePerimeterWalls() {
    this.walls.forEach(wall => {
      wall.setEnabled(true);
    });
    console.log('✅ Murs extérieurs réactivés après l\'introduction');
  }

  createPlayer() {
    // Créer le joueur (position sera définie par la séquence d'introduction)
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    
    if (!this.player) {
      this.player = new Player(this.scene, centerX, centerY);
      this.entityManager.addEntity(this.player, 'player');
    } else {
      // Recentrer le joueur existant
      this.player.sprite.x = centerX;
      this.player.sprite.y = centerY;
    }
    
    // 🎯 CRUCIAL: Toujours démarrer en état INTRO
    this.player.playerState.setState(PlayerStates.INTRO);
    this.player.setInputEnabled(false);
    
    // Mettre à jour les limites du monde pour le joueur
    this.updatePlayerBounds();
    
    // 🎯 CORRECTION: Initialiser le debug du Player TOUJOURS (pas seulement dans l'intro)
    if (window.game && window.game.debugShoutRadius) {
      this.player.setDebugEnabled(true);
      console.log('🔍 Debug Player activé au démarrage');
    }
  }

  createIntroSequence() {
    if (!this.player) {
      console.error('❌ Impossible de créer la séquence d\'introduction sans joueur');
      return;
    }

    // Créer le système d'introduction avec référence au niveau pour les callbacks
    this.introSequence = new IntroSequence(this.scene, this.player, this);
    
    // Calculer la position finale (1/3 de l'écran en X, centre en Y)
    const targetX = this.scene.scale.width / 3;
    const targetY = this.scene.scale.height / 2;
    
    // 🎯 CRUCIAL: Désactiver les murs JUSTE AVANT de démarrer l'intro
    this.disablePerimeterWalls();
    
    // Démarrer la séquence d'introduction
    this.introSequence.start(targetX, targetY);
    
    console.log('🎬 Séquence d\'introduction créée pour Pied Piper');
  }

  /**
   * 📝 NOUVEAU: Créer le gestionnaire de textes tutorial
   */
  createTutorialTextManager() {
    this.tutorialTextManager = new TutorialTextManager(this.scene);
    console.log('📝 TutorialTextManager créé pour Pied Piper');
  }
  
  /**
   * 🎯 SOLID: Setup des event listeners pour gérer l'activation des contrôles
   */
  setupLevelEventListeners() {
    // Écouter la fin de l'intro
    this.scene.events.on('introSequenceComplete', () => {
      this.onIntroComplete();
    });
    
    // Écouter la fin du tutorial (si présent)
    this.scene.events.on('tutorialFinished', () => {
      this.onTutorialFinished();
    });
    
    // 🎯 PIPER-SPECIFIC: Contrôles de debug pour le GroupFleeingSystem
    this.setupGroupFleeingDebugControls();
    
    console.log('🎯 Event listeners configurés pour Pied Piper');
  }

  /**
   * 🎯 PIPER-SPECIFIC: Configurer les contrôles de debug pour le GroupFleeingSystem
   */
  setupGroupFleeingDebugControls() {
    // Ajouter les touches de debug spécifiques au niveau Piper
    this.groupFleeKey = this.scene.input.keyboard.addKey('G'); // Stats
    this.forceFleeKey = this.scene.input.keyboard.addKey('F'); // Forcer fuite
    this.stopFleeKey = this.scene.input.keyboard.addKey('H');  // Arrêter fuite
    
    // États des touches
    this.groupFleeKeyPressed = false;
    this.forceFleeKeyPressed = false;
    this.stopFleeKeyPressed = false;
    
    console.log('👥 Contrôles debug GroupFleeingSystem configurés (G/F/H) pour le niveau Piper');
  }
  
  /**
   * 🎯 SOLID: Appelé quand l'intro est terminée
   */
  onIntroComplete() {
    console.log('🎮 Pied Piper: Intro terminée');
    
    // Si pas de tutorial, activer directement
    if (!this.tutorialTextManager || !this.tutorialTextManager.shouldShowTutorial()) {
      this.activatePlayerControls();
    }
    // Sinon, attendre tutorialFinished
  }
  
  /**
   * 🎯 SOLID: Appelé quand le tutorial est terminé
   */
  onTutorialFinished() {
    console.log('🎮 Pied Piper: Tutorial terminé - activation des contrôles');
    this.activatePlayerControls();
  }
  
  /**
   * 🎯 SOLID: Activer les contrôles du joueur
   */
  activatePlayerControls() {
    if (this.player && this.player.playerState) {
      this.player.playerState.setState(PlayerStates.PLAYING);
      console.log('🎮 ✅ Pied Piper: Contrôles du joueur ACTIVÉS !');
    }
  }

  /**
   * Créer la séquence d'outro
   */
  createOutroSequence() {
    // Créer la séquence avec référence au niveau pour les callbacks
    this.outroSequence = new OutroSequence(this.scene, this.player, this);
    console.log('🎬 OutroSequence créée et prête');
  }

  /**
   * Vérifier si tous les NPCs sont en mode follow (fin de niveau)
   */
  checkLevelCompletion() {
    if (!this.npcSpawner || !this.player) return false;
    
    // Obtenir tous les NPCs
    const allNpcs = this.npcSpawner.getAllNpcs();
    if (allNpcs.length === 0) return false;
    
    // Vérifier si tous les NPCs sont en état 'following'
    const followingNpcs = allNpcs.filter(npc => npc.state === 'following');
    const allFollowing = followingNpcs.length === allNpcs.length;
    
    // Debug: afficher le statut
    if (allFollowing) {
      console.log(`🎯 NIVEAU TERMINÉ ! Tous les NPCs (${allNpcs.length}) sont en mode follow`);
    }
    
    return allFollowing;
  }

  /**
   * Désactiver les collisions avec les limites du monde pour tous les NPCs
   * (Utilisé par OutroSequence)
   */
  disableWorldBoundsForAllNpcs() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc, index) => {
      if (npc.sprite && npc.sprite.body) {
        npc.sprite.body.setCollideWorldBounds(false);
        console.log(`🎬 Limites du monde désactivées pour NPC ${index}`);
      }
    });
    
    console.log(`🎬 Limites du monde désactivées pour ${allNpcs.length} NPCs`);
  }

  createNpcSpawner() {
    // Créer le système de spawn des NPCs
    this.npcSpawner = new NpcSpawner(this.scene, this.entityManager, this.collisionSystem);
  }

  /**
   * 🎯 PIPER-SPECIFIC: Créer le système de fuite de groupe (exclusif au niveau Piper)
   */
  createGroupFleeingSystem() {
    this.groupFleeingSystem = new GroupFleeingSystem(this.scene, this.entityManager);
    
    // Configuration spécifique au niveau Piper pour fuite constante
    this.groupFleeingSystem.updateConfig({
      triggerThreshold: 8,    // Quand ≤ 8 NPCs non-followers
      checkInterval: 200,     // Vérifier plus souvent (200ms) pour maintenir la fuite constante
      fleeRange: 300,         // Distance de fuite étendue
      minNpcsForFlee: 1       // Au moins 1 NPC pour déclencher
    });
    
    console.log('👥 GroupFleeingSystem créé spécifiquement pour le niveau Pied Piper');
  }

  spawnNpcs() {
    if (!this.npcSpawner || !this.player) return;
    
    // Position du joueur pour éviter de spawner trop près
    const playerPosition = {
      x: this.player.sprite.x,
      y: this.player.sprite.y
    };
    
    // Spawner les groupes de NPCs
    this.npcSpawner.spawnGroups(playerPosition);
    
    // Configurer les collisions des NPCs avec les murs
    this.setupNpcWallCollisions();
    
    // Log des statistiques de spawn
    const stats = this.npcSpawner.getSpawnStats();
    console.log('📊 Statistiques de spawn:', stats);
  }

  setupNpcWallCollisions() {
    if (!this.npcSpawner) return;
    
    // Configurer les collisions entre tous les NPCs et tous les murs
    const allNpcs = this.npcSpawner.getAllNpcs();
    
    allNpcs.forEach(npc => {
      this.walls.forEach(wall => {
        this.collisionSystem.addCollisionPair(npc, wall);
      });
    });
  }

  updatePlayerBounds() {
    if (this.player) {
      // Les limites correspondent exactement aux bords de l'écran
      this.player.setWorldBounds({
        x: 0,
        y: 0,
        width: this.scene.scale.width,
        height: this.scene.scale.height
      });
    }
  }

  setupCollisions() {
    // CONFIGURER LES COLLISIONS PHYSIQUES PHASER - CERCLES NON DÉPASSABLES
    
    const allNpcs = this.entityManager.getNpcs();
    console.log(`🔵 DEBUG: Configurant collisions pour ${allNpcs.length} NPCs`);
    
    // Vérifier que les corps physiques existent
    let npcsWithBodies = 0;
    let wallsWithBodies = 0;
    
    allNpcs.forEach(npc => {
      if (npc.sprite && npc.sprite.body) {
        npcsWithBodies++;
        console.log(`🔵 NPC corps physique: x=${npc.sprite.x.toFixed(0)}, y=${npc.sprite.y.toFixed(0)}, state=${npc.state}`);
      } else {
        console.warn(`⚠️ NPC sans corps physique!`, npc);
      }
    });
    
    this.walls.forEach(wall => {
      if (wall.body) {
        wallsWithBodies++;
      } else {
        console.warn(`⚠️ Mur sans corps physique!`, wall);
      }
    });
    
    console.log(`🔵 Corps physiques trouvés: ${npcsWithBodies}/${allNpcs.length} NPCs, ${wallsWithBodies}/${this.walls.length} murs`);
    
    // COLLISIONS DIRECTES (plus fiable que les groupes)
    
    // 1. Collisions joueur vs murs
    this.walls.forEach(wall => {
      if (wall.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, wall.body);
      }
    });
    
    // 2. Collisions NPCs vs murs 
    allNpcs.forEach(npc => {
      this.walls.forEach(wall => {
        if (wall.body && npc.sprite && npc.sprite.body) {
          this.scene.physics.add.collider(npc.sprite, wall.body);
        }
      });
    });
    
    // 3. COLLISIONS NPC vs NPC - AUCUN OVERLAP POSSIBLE
    for (let i = 0; i < allNpcs.length; i++) {
      for (let j = i + 1; j < allNpcs.length; j++) {
        const npc1 = allNpcs[i];
        const npc2 = allNpcs[j];
        if (npc1.sprite && npc1.sprite.body && npc2.sprite && npc2.sprite.body) {
          this.scene.physics.add.collider(npc1.sprite, npc2.sprite);
          console.log(`🔵 Collision configurée entre NPC ${i} et NPC ${j}`);
        }
      }
    }
    
    // 4. COLLISIONS JOUEUR vs NPCs - AUCUN OVERLAP POSSIBLE  
    allNpcs.forEach((npc, index) => {
      if (npc.sprite && npc.sprite.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, npc.sprite);
        console.log(`🔵 Collision joueur vs NPC ${index} configurée`);
      }
    });
    
    console.log(`🔵 Total collisions configurées: ${(allNpcs.length * (allNpcs.length - 1)) / 2} NPC-NPC + ${allNpcs.length} joueur-NPC + murs`);
  }

  // Méthode appelée lors du redimensionnement
  handleResize(width, height) {
    // Mettre à jour le fond
    this.updateBackground();
    
    // Recréer les murs avec les nouvelles dimensions
    this.createPerimeterWalls();
    
    // Mettre à jour les limites du joueur
    this.updatePlayerBounds();
    
    // Respawn les NPCs avec les nouvelles dimensions
    if (this.npcSpawner && this.player) {
      const playerPosition = {
        x: this.player.sprite.x,
        y: this.player.sprite.y
      };
      this.npcSpawner.respawnGroups(playerPosition);
      this.setupNpcWallCollisions();
    }
    
    // Reconfigurer les collisions
    this.setupCollisions();
  }

  update(time, delta) {
    // Mise à jour de la séquence d'introduction
    if (this.introSequence) {
      this.introSequence.update();
    }
    
    // 📝 NOUVEAU: Mise à jour du gestionnaire de tutorial
    if (this.tutorialTextManager) {
      this.tutorialTextManager.update(delta);
    }
    
    // 🎯 Vérification de fin de niveau et outro
    if (this.outroSequence) {
      // Si l'outro n'est pas encore active, vérifier si le niveau est terminé
      if (!this.outroSequence.isActive && this.checkLevelCompletion()) {
        // Déclencher l'outro - sortie par la droite
        this.outroSequence.start('right');
      }
      
      // Mettre à jour l'outro si active
      if (this.outroSequence.isActive) {
        this.outroSequence.update();
      }
    }
    
    // Mise à jour des entités
    this.entityManager.update(time, delta);
    
    // Mise à jour des groupes de NPCs
    if (this.npcSpawner) {
      this.npcSpawner.update(delta);
    }
    
    // 🎯 PIPER-SPECIFIC: Mise à jour du système de fuite de groupe
    if (this.groupFleeingSystem) {
      this.groupFleeingSystem.update(time, delta);
    }
    
    // 🎯 PIPER-SPECIFIC: Gérer les contrôles de debug du GroupFleeingSystem
    this.handleGroupFleeingDebugInput();
  }

  /**
   * 🎯 PIPER-SPECIFIC: Gérer les contrôles de debug du GroupFleeingSystem
   */
  handleGroupFleeingDebugInput() {
    if (!this.groupFleeKey || !this.forceFleeKey || !this.stopFleeKey) return;

    // Afficher les stats avec G
    if (this.groupFleeKey.isDown && !this.groupFleeKeyPressed) {
      this.groupFleeKeyPressed = true;
      
      if (this.groupFleeingSystem) {
        const stats = this.groupFleeingSystem.getSystemStats();
        console.log('👥 [PIPER] Group Fleeing System Stats:', stats);
        console.log(`👥 [PIPER] Status: ${stats.isActive ? 'ACTIF' : 'INACTIF'} | NPCs non-followers: ${stats.nonFollowerNpcs}/${stats.totalNpcs} | Seuil: ${stats.threshold}`);
      }
    }
    if (!this.groupFleeKey.isDown) {
      this.groupFleeKeyPressed = false;
    }

    // Forcer la fuite avec F
    if (this.forceFleeKey.isDown && !this.forceFleeKeyPressed) {
      this.forceFleeKeyPressed = true;
      
      if (this.groupFleeingSystem) {
        this.groupFleeingSystem.forceGroupFleeing();
        console.log('👥 [PIPER] 🧪 Fuite de groupe forcée ! (Touche F)');
      }
    }
    if (!this.forceFleeKey.isDown) {
      this.forceFleeKeyPressed = false;
    }

    // Arrêter la fuite avec H
    if (this.stopFleeKey.isDown && !this.stopFleeKeyPressed) {
      this.stopFleeKeyPressed = true;
      
      if (this.groupFleeingSystem) {
        this.groupFleeingSystem.forceStopGroupFleeing();
        console.log('👥 [PIPER] 🛑 Fuite de groupe arrêtée ! (Touche H)');
      }
    }
    if (!this.stopFleeKey.isDown) {
      this.stopFleeKeyPressed = false;
    }
  }

  cleanup() {
    console.log('🧹 Nettoyage de PiedPiperLevel...');
    
    // Nettoyer la séquence d'introduction
    if (this.introSequence) {
      this.introSequence.destroy();
      this.introSequence = null;
    }
    
    // Nettoyer la séquence d'outro
    if (this.outroSequence) {
      this.outroSequence.destroy();
      this.outroSequence = null;
    }
    
    // 📝 NOUVEAU: Nettoyer le gestionnaire de tutorial
    if (this.tutorialTextManager) {
      this.tutorialTextManager.destroy();
      this.tutorialTextManager = null;
    }
    
    // 🎯 PIPER-SPECIFIC: Nettoyer le système de fuite de groupe
    if (this.groupFleeingSystem) {
      this.groupFleeingSystem.destroy();
      this.groupFleeingSystem = null;
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
    
    // Nettoyer le fond
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    
    // Nettoyer les murs
    this.clearWalls();
    
    // Nettoyer toutes les entités
    this.entityManager.clear();
    this.player = null;
    
    console.log('✅ PiedPiperLevel nettoyé');
  }

  /**
   * 🎯 PUBLIC API : Obtenir les stats du niveau (compatibilité SOLID)
   */
  getLevelStats() {
    return {
      name: this.levelConfig.name,
      type: 'PIED_PIPER',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: this.levelConfig.npcCount,
      difficulty: this.levelConfig.difficulty,
      completionRate: this.npcSpawner ? 
        (this.npcSpawner.getAllNpcs().filter(npc => npc.state === 'following').length / this.npcSpawner.getAllNpcs().length * 100).toFixed(1) + '%' : 
        '0%'
    };
  }
} 