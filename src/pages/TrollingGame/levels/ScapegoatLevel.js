import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { NpcSpawner } from '../systems/NpcSpawner';
import { IntroSequence } from '../systems/IntroSequence';
import { OutroSequence } from '../systems/OutroSequence';
import { PlayerStates } from '../core/PlayerState';

/**
 * 🐐 SCAPEGOAT - TROUVER ET ISOLER LE BOUC ÉMISSAIRE
 * 
 * Mécanique : Un NPC "bouc émissaire" est caché parmi les autres.
 * Il est visuellement identique, mais son comportement est différent :
 * - Il ne fuit PAS quand le joueur crie (seul indice)
 * - Sa présence agite le groupe (tremblements, fuite spontanée)
 * - Quand il est isolé, le groupe se calme
 * 
 * Victoire : Isoler le bouc émissaire du groupe pendant suffisamment longtemps
 * 
 * Concept enseigné : Le mécanisme du bouc émissaire / exclusion sociale
 */
export class ScapegoatLevel extends ILevel {
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
    
    // 🐐 Le bouc émissaire
    this.scapegoatNpc = null;
    
    // 🚫 Désactiver le système de suivi (vérifié par PlayerCollisionDetector)
    this.disableNpcFollowing = true;
    
    // 🐐 CONFIGURATION SCAPEGOAT
    this.levelConfig = {
      name: "The Scapegoat",
      mechanic: 'FIND_AND_ISOLATE',
      description: 'Un NPC perturbe le groupe. Trouvez-le et isolez-le.',
      npcCount: 15,
      
      // Agitation : quand le bouc émissaire est proche du groupe
      agitationRadius: 200,         // Rayon autour du bouc émissaire qui agite les NPCs
      agitationCheckInterval: 800,  // Vérifier toutes les 800ms
      agitationChance: 0.15,        // 15% de chance par NPC par check d'être agité
      
      // Isolation : victoire (distance par rapport au centre INITIAL, pas dynamique)
      isolationDistance: 150,        // Distance min du centre INITIAL du groupe
      isolationDuration: 3000,       // Durée d'isolation requise (3 secondes)
    };
    
    // 🐐 Centre initial du groupe (point de référence FIXE pour l'isolation)
    this.initialGroupCenter = null;
    
    // 🐐 Le level ne démarre qu'après l'intro (empêche le trigger prématuré)
    this.levelActive = false;
    
    // État d'isolation
    this.isolationTimer = 0;
    this.isScapegoatIsolated = false;
    this.lastAgitationCheck = 0;
    
    // Debug : log throttle
    this._lastDebugLog = 0;
  }

  // ================================
  // INITIALISATION
  // ================================

  init() {
    console.log(`🐐 Initialisation ${this.levelConfig.name}`);
    
    this.createBackground();
    this.createPerimeterWalls();
    this.createPlayer();
    this.createNpcSpawner();
    
    this.setupLevelEventListeners();
    
    this.spawnNpcs();
    this.designateScapegoat();
    
    this.createIntroSequence();
    this.createOutroSequence();
    
    this.setupCollisions();
    
    console.log(`✅ ${this.levelConfig.name} initialisé`);
  }

  createBackground() {
    this.background = this.scene.add.graphics();
    this.updateBackground();
  }

  updateBackground() {
    if (this.background) {
      this.background.clear();
      this.background.fillStyle(0x000000);
      this.background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    }
  }

  createPerimeterWalls() {
    this.clearWalls();
    
    const wallSize = 25;
    const wallThickness = 40;
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    // Murs du haut
    for (let x = 0; x < gameWidth; x += wallSize) {
      const npcHeight = 64;
      const wall = new Wall(this.scene, x, -wallThickness + npcHeight, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs du bas
    for (let x = 0; x < gameWidth; x += wallSize) {
      const wall = new Wall(this.scene, x, gameHeight - 10, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de gauche
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, -wallThickness + 10, y, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }

    // Murs de droite
    for (let y = wallSize; y < gameHeight - wallSize; y += wallSize) {
      const wall = new Wall(this.scene, gameWidth - 10, y, true);
      this.walls.push(wall);
      this.entityManager.addEntity(wall, 'wall');
    }
  }

  clearWalls() {
    this.walls.forEach(wall => {
      if (wall.id !== undefined) {
        this.entityManager.removeEntity(wall.id);
      }
      wall.destroy();
    });
    this.walls = [];
  }

  disablePerimeterWalls() {
    this.walls.forEach(wall => wall.setEnabled(false));
  }

  enablePerimeterWalls() {
    this.walls.forEach(wall => wall.setEnabled(true));
  }

  createPlayer() {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    
    if (!this.player) {
      this.player = new Player(this.scene, centerX, centerY);
      this.entityManager.addEntity(this.player, 'player');
    } else {
      this.player.sprite.x = centerX;
      this.player.sprite.y = centerY;
    }
    
    this.player.playerState.setState(PlayerStates.INTRO);
    this.player.setInputEnabled(false);
    this.player.clearAllFollowers();
    
    this.updatePlayerBounds();
    
    if (window.game && window.game.debugShoutRadius) {
      this.player.setDebugEnabled(true);
    }
  }

  createNpcSpawner() {
    this.npcSpawner = new NpcSpawner(this.scene, this.entityManager, this.collisionSystem);
    this.npcSpawner.groupSize = this.levelConfig.npcCount;
  }

  spawnNpcs() {
    if (!this.npcSpawner || !this.player) return;
    
    const playerPosition = {
      x: this.player.sprite.x,
      y: this.player.sprite.y
    };
    
    this.npcSpawner.spawnGroups(playerPosition);
    this.setupNpcBehavior();
  }

  /**
   * 🐐 Configurer le comportement des NPCs pour ce niveau
   * Tous les NPCs : pas de following, seulement fuite + trembling
   */
  setupNpcBehavior() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    
    allNpcs.forEach(npc => {
      if (npc.sprite && npc.sprite.body) {
        // Pas de follow dans ce niveau
        npc.canFollow = false;
        
        // Physique standard
        npc.sprite.body.setMass(0.6);
        npc.sprite.body.setDrag(30, 30);
        npc.sprite.body.setBounce(0.2, 0.2);
      }
    });
  }

  /**
   * 🐐 COEUR DU NIVEAU : Désigner un NPC comme bouc émissaire
   * Visuellement identique, mais comportement unique
   */
  designateScapegoat() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    if (allNpcs.length === 0) return;
    
    // 🐐 Sauvegarder le centre INITIAL du groupe (point de référence FIXE)
    this.initialGroupCenter = this.getGroupCenter();
    console.log(`🐐 Centre initial du groupe: (${this.initialGroupCenter.x.toFixed(0)}, ${this.initialGroupCenter.y.toFixed(0)})`);
    
    // Choisir un NPC au hasard (pas le premier ni le dernier pour plus de subtilité)
    const minIndex = Math.floor(allNpcs.length * 0.2);
    const maxIndex = Math.floor(allNpcs.length * 0.8);
    const scapegoatIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex));
    
    this.scapegoatNpc = allNpcs[scapegoatIndex];
    this.scapegoatNpc.isScapegoat = true;
    
    // 🐐 OVERRIDE COMPORTEMENTAL : Le bouc émissaire ne réagit PAS au cri
    // Il reste immobile quand les autres fuient — c'est le seul indice
    this.scapegoatNpc.onShoutHit = (force, distance, maxRadius) => {
      // Le bouc émissaire ignore complètement le cri du joueur
      // Il ne fuit pas, ne tremble pas — il reste planté là
      // C'est CE comportement qui permet au joueur de l'identifier
    };
    
    // Le bouc émissaire ne peut pas non plus trembler spontanément
    this.scapegoatNpc.canTremble = false;
    
    // 🐐 Physique du bouc émissaire : plus facile à pousser
    if (this.scapegoatNpc.sprite && this.scapegoatNpc.sprite.body) {
      this.scapegoatNpc.sprite.body.setMass(0.3);   // Plus léger → plus facile à pousser
      this.scapegoatNpc.sprite.body.setDrag(8, 8);   // Moins de friction → glisse plus loin
      this.scapegoatNpc.sprite.body.setBounce(0.1, 0.1);
    }
    
    console.log(`🐐 Bouc émissaire désigné : NPC index ${scapegoatIndex} (sur ${allNpcs.length})`);
  }

  // ================================
  // EVENTS & CONTRÔLES
  // ================================

  setupLevelEventListeners() {
    // Primary: quand l'intro + migration sont terminées
    this.scene.events.on('introSequenceComplete', () => {
      console.log('🐐 Event reçu: introSequenceComplete');
      this.onIntroComplete();
    });
    
    // Backup: si introSequenceComplete ne fire pas, utiliser introCompletelyFinished
    this.scene.events.on('introCompletelyFinished', () => {
      if (!this.levelActive) {
        console.log('🐐 Event backup reçu: introCompletelyFinished');
        this.onIntroComplete();
      }
    });
  }

  onIntroComplete() {
    this.activatePlayerControls();
    
    // 🐐 Activer la condition de victoire SEULEMENT maintenant
    this.levelActive = true;
    
    // Recalculer le centre initial APRÈS l'intro (positions stables)
    this.initialGroupCenter = this.getGroupCenter();
    
    // Reset le timer d'isolation (au cas où il aurait accumulé pendant l'intro)
    this.isolationTimer = 0;
    this.isScapegoatIsolated = false;
    
    console.log(`🐐 Level actif ! Centre initial: (${this.initialGroupCenter.x.toFixed(0)}, ${this.initialGroupCenter.y.toFixed(0)})`);
  }

  activatePlayerControls() {
    if (this.player && this.player.playerState) {
      this.player.playerState.setState(PlayerStates.PLAYING);
      this.enablePerimeterWalls();
    }
  }

  createIntroSequence() {
    if (!this.player) return;

    this.introSequence = new IntroSequence(this.scene, this.player, this);
    
    const targetX = this.scene.scale.width / 3;
    const targetY = this.scene.scale.height / 2;
    
    this.disablePerimeterWalls();
    this.introSequence.start(targetX, targetY);
  }

  createOutroSequence() {
    this.outroSequence = new OutroSequence(this.scene, this.player, this);
  }

  // ================================
  // 🐐 MÉCANIQUE PRINCIPALE : AGITATION & ISOLATION
  // ================================

  /**
   * Calculer le centre du groupe (excluant le bouc émissaire)
   */
  getGroupCenter() {
    if (!this.npcSpawner) return { x: 0, y: 0 };
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    let sumX = 0, sumY = 0, count = 0;
    
    allNpcs.forEach(npc => {
      if (npc === this.scapegoatNpc) return; // Exclure le bouc émissaire
      if (!npc.sprite) return;
      sumX += npc.sprite.x;
      sumY += npc.sprite.y;
      count++;
    });
    
    if (count === 0) return { x: this.scene.scale.width / 2, y: this.scene.scale.height / 2 };
    return { x: sumX / count, y: sumY / count };
  }

  /**
   * 🐐 Distance du bouc émissaire par rapport au centre DYNAMIQUE du groupe
   * Utilisée pour l'agitation (comportement réactif)
   */
  getScapegoatDistanceFromGroup() {
    if (!this.scapegoatNpc || !this.scapegoatNpc.sprite) return 0;
    
    const groupCenter = this.getGroupCenter();
    const dx = this.scapegoatNpc.sprite.x - groupCenter.x;
    const dy = this.scapegoatNpc.sprite.y - groupCenter.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 🐐 Distance du bouc émissaire par rapport au centre INITIAL du groupe
   * Utilisée pour la condition d'isolation (référence FIXE et stable)
   */
  getScapegoatDistanceFromInitialCenter() {
    if (!this.scapegoatNpc || !this.scapegoatNpc.sprite) return 0;
    
    const center = this.initialGroupCenter || this.getGroupCenter();
    const dx = this.scapegoatNpc.sprite.x - center.x;
    const dy = this.scapegoatNpc.sprite.y - center.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 🐐 Agiter les NPCs proches du bouc émissaire
   * Plus le bouc émissaire est proche, plus les NPCs sont agités
   */
  updateAgitation(time) {
    if (!this.scapegoatNpc || !this.npcSpawner) return;
    
    // Vérifier à intervalle régulier
    if (time - this.lastAgitationCheck < this.levelConfig.agitationCheckInterval) return;
    this.lastAgitationCheck = time;
    
    const scapegoatDistance = this.getScapegoatDistanceFromGroup();
    const isNearGroup = scapegoatDistance < this.levelConfig.agitationRadius;
    
    if (!isNearGroup) return; // Pas d'agitation si le bouc émissaire est loin
    
    // Intensité d'agitation inversement proportionnelle à la distance
    const agitationIntensity = 1 - (scapegoatDistance / this.levelConfig.agitationRadius);
    const adjustedChance = this.levelConfig.agitationChance * agitationIntensity;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    
    allNpcs.forEach(npc => {
      if (npc === this.scapegoatNpc) return;
      if (!npc.sprite) return;
      if (npc.state !== 'normal') return; // Pas agiter un NPC déjà agité
      
      // Distance entre ce NPC et le bouc émissaire
      const dx = npc.sprite.x - this.scapegoatNpc.sprite.x;
      const dy = npc.sprite.y - this.scapegoatNpc.sprite.y;
      const distToScapegoat = Math.sqrt(dx * dx + dy * dy);
      
      // Plus le NPC est proche du bouc émissaire, plus il a de chance d'être agité
      if (distToScapegoat < this.levelConfig.agitationRadius) {
        const proximityFactor = 1 - (distToScapegoat / this.levelConfig.agitationRadius);
        const finalChance = adjustedChance * proximityFactor;
        
        if (Math.random() < finalChance) {
          // Agiter ce NPC : soit trembler, soit fuir brièvement
          if (Math.random() < 0.6) {
            // Trembler
            npc.stateController.startTrembling(0);
          } else {
            // Fuir brièvement — direction OPPOSÉE au bouc émissaire (pas au joueur)
            npc.stateController.state = 'fleeing';
            npc.stateController.stateTimer = 0;
            npc.stateController.stateDuration = 800 + Math.random() * 1200;
            
            // Direction de fuite : loin du bouc émissaire
            const flDx = npc.sprite.x - this.scapegoatNpc.sprite.x;
            const flDy = npc.sprite.y - this.scapegoatNpc.sprite.y;
            const flDist = Math.sqrt(flDx * flDx + flDy * flDy);
            if (flDist > 0) {
              npc.stateController.fleeDirection.x = flDx / flDist;
              npc.stateController.fleeDirection.y = flDy / flDist;
            } else {
              const angle = Math.random() * Math.PI * 2;
              npc.stateController.fleeDirection.x = Math.cos(angle);
              npc.stateController.fleeDirection.y = Math.sin(angle);
            }
          }
        }
      }
    });
  }

  /**
   * 🐐 Vérifier la condition d'isolation (victoire)
   */
  updateIsolationCheck(delta) {
    if (!this.scapegoatNpc || !this.scapegoatNpc.sprite) return;
    
    // Utiliser le centre INITIAL (stable) pour la condition de victoire
    const scapegoatDistance = this.getScapegoatDistanceFromInitialCenter();
    const wasIsolated = this.isScapegoatIsolated;
    this.isScapegoatIsolated = scapegoatDistance >= this.levelConfig.isolationDistance;
    
    if (this.isScapegoatIsolated) {
      this.isolationTimer += delta;
      
      if (!wasIsolated) {
        console.log(`🐐 Bouc émissaire ISOLÉ ! Distance: ${scapegoatDistance.toFixed(0)}px (seuil: ${this.levelConfig.isolationDistance}px)`);
      }
    } else {
      if (wasIsolated && this.isolationTimer > 0) {
        console.log(`🐐 Bouc émissaire revenu dans la zone...`);
      }
      this.isolationTimer = 0;
    }
  }

  /**
   * 🐐 Empêcher les NPCs de suivre le joueur (pas de follow dans ce niveau)
   */
  enforceNoFollowing() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach(npc => {
      if (npc.state === 'following') {
        npc.state = 'normal';
        npc.followTarget = null;
        npc.velocity = { x: 0, y: 0 };
      }
    });
  }

  // ================================
  // CONDITION DE VICTOIRE
  // ================================

  checkLevelCompletion() {
    const isolated = this.isScapegoatIsolated;
    const timerDone = this.isolationTimer >= this.levelConfig.isolationDuration;
    
    if (isolated && !timerDone) {
      // On est isolé mais le timer n'est pas fini — progression en cours
    }
    
    if (isolated && timerDone) {
      console.log(`🐐🏆 checkLevelCompletion = TRUE ! timer=${this.isolationTimer.toFixed(0)}ms >= ${this.levelConfig.isolationDuration}ms`);
    }
    
    return isolated && timerDone;
  }

  disableWorldBoundsForAllNpcs() {
    if (!this.npcSpawner) return;
    
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach(npc => {
      if (npc.sprite && npc.sprite.body) {
        npc.sprite.body.setCollideWorldBounds(false);
      }
    });
  }

  // ================================
  // COLLISIONS & BOUNDS
  // ================================

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

  setupCollisions() {
    const allNpcs = this.entityManager.getNpcs();
    
    // Joueur vs murs
    this.walls.forEach(wall => {
      if (wall.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, wall.body);
      }
    });
    
    // NPCs vs murs
    allNpcs.forEach(npc => {
      this.walls.forEach(wall => {
        if (wall.body && npc.sprite && npc.sprite.body) {
          this.scene.physics.add.collider(npc.sprite, wall.body);
        }
      });
    });
    
    // NPC vs NPC
    for (let i = 0; i < allNpcs.length; i++) {
      for (let j = i + 1; j < allNpcs.length; j++) {
        const npc1 = allNpcs[i];
        const npc2 = allNpcs[j];
        if (npc1.sprite && npc1.sprite.body && npc2.sprite && npc2.sprite.body) {
          this.scene.physics.add.collider(npc1.sprite, npc2.sprite);
        }
      }
    }
    
    // Joueur vs NPCs (pour pousser le bouc émissaire)
    allNpcs.forEach(npc => {
      if (npc.sprite && npc.sprite.body && this.player.sprite && this.player.sprite.body) {
        this.scene.physics.add.collider(this.player.sprite, npc.sprite);
      }
    });
  }

  // ================================
  // RESIZE
  // ================================

  handleResize(width, height) {
    this.updateBackground();
    this.createPerimeterWalls();
    this.updatePlayerBounds();
    
    if (this.npcSpawner && this.player) {
      const playerPosition = {
        x: this.player.sprite.x,
        y: this.player.sprite.y
      };
      this.npcSpawner.respawnGroups(playerPosition);
      this.setupNpcBehavior();
      this.designateScapegoat();
    }
    
    this.setupCollisions();
  }

  // ================================
  // UPDATE LOOP
  // ================================

  update(time, delta) {
    // Intro
    if (this.introSequence) {
      this.introSequence.update();
    }
    
    // Mise à jour des entités
    this.entityManager.update(time, delta);
    
    // Pas de follow dans ce niveau
    this.enforceNoFollowing();
    
    // NPC spawner
    if (this.npcSpawner) {
      this.npcSpawner.update(delta);
    }
    
    // 🐐 MÉCANIQUES (toujours actives - agitation + isolation tracking)
    this.updateAgitation(time);
    this.updateIsolationCheck(delta);
    
    // 🐐 VICTOIRE : seulement quand le level est actif (après l'intro)
    if (this.levelActive && this.outroSequence) {
      if (!this.outroSequence.isActive && this.checkLevelCompletion()) {
        console.log(`🐐 VICTOIRE ! Le bouc émissaire est isolé depuis ${(this.isolationTimer / 1000).toFixed(1)}s`);
        this.outroSequence.start('right');
      }
      
      if (this.outroSequence.isActive) {
        this.outroSequence.update();
      }
    }
    
    // 🐐 FALLBACK : si le level n'est pas actif après 10s, forcer l'activation
    if (!this.levelActive && time > 10000) {
      console.warn('⚠️ Fallback: activation forcée du level après 10s');
      this.levelActive = true;
      this.initialGroupCenter = this.getGroupCenter();
      this.isolationTimer = 0;
      this.isScapegoatIsolated = false;
      if (this.player && this.player.playerState) {
        this.player.playerState.setState(PlayerStates.PLAYING);
        this.enablePerimeterWalls();
      }
    }
    
    // 🐐 DEBUG : Log TOUJOURS toutes les secondes (diagnostic complet)
    if (time - this._lastDebugLog > 1000) {
      this._lastDebugLog = time;
      const distFromInitial = this.getScapegoatDistanceFromInitialCenter();
      const distFromGroup = this.getScapegoatDistanceFromGroup();
      const threshold = this.levelConfig.isolationDistance;
      const isolated = this.isScapegoatIsolated;
      const timer = this.isolationTimer;
      const duration = this.levelConfig.isolationDuration;
      const active = this.levelActive;
      const hasOutro = !!this.outroSequence;
      const outroActive = this.outroSequence ? this.outroSequence.isActive : false;
      const centerOK = !!this.initialGroupCenter;
      
      console.log(
        `🐐 [${active ? 'ACTIF' : '⏳INTRO'}] ` +
        `Dist: ${distFromInitial.toFixed(0)}/${threshold}px | ` +
        `${isolated ? `ISOLÉ ${(timer/duration*100).toFixed(0)}% (${(timer/1000).toFixed(1)}s/${(duration/1000).toFixed(0)}s)` : 'pas isolé'} | ` +
        `centre:${centerOK ? `(${this.initialGroupCenter.x.toFixed(0)},${this.initialGroupCenter.y.toFixed(0)})` : 'NULL'} | ` +
        `outro:${hasOutro}/${outroActive}`
      );
    }
  }

  // ================================
  // CLEANUP
  // ================================

  cleanup() {
    console.log(`🧹 Nettoyage de ${this.levelConfig.name}...`);
    
    if (this.introSequence) {
      this.introSequence.destroy();
      this.introSequence = null;
    }
    
    if (this.outroSequence) {
      this.outroSequence.destroy();
      this.outroSequence = null;
    }
    
    if (this.npcSpawner) {
      this.npcSpawner.cleanup();
      this.npcSpawner = null;
    }
    
    if (this.footstepsSystem) {
      this.footstepsSystem.destroy();
    }
    
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    
    this.clearWalls();
    this.entityManager.clear();
    
    this.player = null;
    this.scapegoatNpc = null;
    this.initialGroupCenter = null;
    this.levelActive = false;
    this.isolationTimer = 0;
    this.isScapegoatIsolated = false;
    
    console.log(`✅ ${this.levelConfig.name} nettoyé`);
  }

  // ================================
  // STATS
  // ================================

  getLevelStats() {
    const distFromInitial = this.getScapegoatDistanceFromInitialCenter();
    const distFromGroup = this.getScapegoatDistanceFromGroup();
    
    return {
      name: this.levelConfig.name,
      type: 'SCAPEGOAT',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: this.levelConfig.npcCount,
      scapegoatIsolated: this.isScapegoatIsolated,
      scapegoatDistFromInitial: distFromInitial.toFixed(0),
      scapegoatDistFromGroup: distFromGroup.toFixed(0),
      isolationThreshold: this.levelConfig.isolationDistance,
      isolationProgress: Math.min(100, (this.isolationTimer / this.levelConfig.isolationDuration * 100)).toFixed(1) + '%',
      isolationRequired: (this.levelConfig.isolationDuration / 1000).toFixed(1) + 's'
    };
  }
}
