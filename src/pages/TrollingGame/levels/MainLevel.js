import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { NpcSpawner } from '../systems/NpcSpawner';
import { IntroSequence } from '../systems/IntroSequence';
import { OutroSequence } from '../systems/OutroSequence';
import { PlayerStates } from '../core/PlayerState';

export class MainLevel extends ILevel {
  constructor(scene, entityManager, collisionSystem, footstepsSystem = null) {
    super();
    this.scene = scene;
    this.entityManager = entityManager;
    this.collisionSystem = collisionSystem;
    this.footstepsSystem = footstepsSystem;
    this.player = null;
    this.walls = [];
    this.background = null;
    this.npcSpawner = null;
    this.introSequence = null;
    this.outroSequence = null;
  }

  init() {
    // Créer le fond
    this.createBackground();
    
    // Créer les murs invisibles du périmètre
    this.createPerimeterWalls();
    
    // Créer le joueur (sera positionné par la séquence d'intro)
    this.createPlayer();
    
    // Créer le système de spawn des NPCs AVANT l'intro
    this.createNpcSpawner();
    
    // Spawner les groupes de NPCs AVANT l'intro
    this.spawnNpcs();
    
    // Créer et démarrer la séquence d'introduction (APRÈS le spawn NPCs)
    this.createIntroSequence();
    
    // Créer la séquence d'outro (APRÈS l'intro)
    this.createOutroSequence();
    
    // Configurer les collisions
    this.setupCollisions();
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
    
    const wallSize = 25; // 🎯 ÉPAISSI : 10 → 25px pour éviter que les NPCs se coincent
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Murs du haut (invisibles) - couvrir toute la largeur, décalés vers l'extérieur
    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, -0, true); // 🎯 DÉCALÉ : Plus loin vers l'extérieur
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs du bas (invisibles) - couvrir toute la largeur, décalés vers l'extérieur
    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, gameHeight + 0, true); // 🎯 DÉCALÉ : Plus loin vers l'extérieur
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de gauche (invisibles) - EXCLURE les coins pour éviter les chevauchements
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, -0, y, true); // 🎯 EXCLU les coins
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de droite (invisibles) - EXCLURE les coins pour éviter les chevauchements  
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, gameWidth + 0, y, true); // 🎯 EXCLU les coins
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }
  }

  clearWalls() {
    // Nettoyer les anciens murs
    this.walls.forEach(wall => {
      if (wall.id !== undefined) {
        this.entityManager.removeEntity(wall.id);
      } else if (wall.sprite) {
        wall.sprite.destroy();
      }
    });
    this.walls = [];
  }

  // Désactiver temporairement les collisions des murs extérieurs (pour l'introduction)
  disablePerimeterWalls() {
    this.walls.forEach(wall => {
      if (wall.sprite && wall.sprite.body) {
        wall.sprite.body.enable = false;
      }
    });
    console.log('🚫 Murs extérieurs désactivés pour l\'introduction');
  }

  // Réactiver les collisions des murs extérieurs (fin d'introduction)
  enablePerimeterWalls() {
    this.walls.forEach(wall => {
      if (wall.sprite && wall.sprite.body) {
        wall.sprite.body.enable = true;
      }
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
    
    // Calculer la position finale (1/4 de l'écran en X, centre en Y)
    const targetX = this.scene.scale.width / 4;
    const targetY = this.scene.scale.height / 2;
    
    // 🎯 CRUCIAL: Désactiver les murs JUSTE AVANT de démarrer l'intro
    this.disablePerimeterWalls();
    
    // Démarrer la séquence d'introduction
    this.introSequence.start(targetX, targetY);
    
    console.log('🎬 Système d\'introduction créé et démarré');
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
      if (wall.sprite && wall.sprite.body) {
        wallsWithBodies++;
      } else {
        console.warn(`⚠️ Mur sans corps physique!`, wall);
      }
    });
    
    console.log(`🔵 Corps physiques trouvés: ${npcsWithBodies}/${allNpcs.length} NPCs, ${wallsWithBodies}/${this.walls.length} murs`);
    
    // COLLISIONS DIRECTES (plus fiable que les groupes)
    
    // 1. Collisions joueur vs murs
    this.walls.forEach(wall => {
      if (wall.sprite && wall.sprite.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, wall.sprite);
      }
    });
    
    // 2. Collisions NPCs vs murs 
    allNpcs.forEach(npc => {
      this.walls.forEach(wall => {
        if (wall.sprite && wall.sprite.body && npc.sprite && npc.sprite.body) {
          this.scene.physics.add.collider(npc.sprite, wall.sprite);
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
  }

  cleanup() {
    console.log('🧹 Nettoyage de MainLevel...');
    
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
    
    console.log('✅ MainLevel nettoyé');
  }
} 