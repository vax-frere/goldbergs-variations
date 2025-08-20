import { Npc } from '../entities/Npc';

export class NpcSpawner {
  constructor(scene, entityManager, collisionSystem) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.collisionSystem = collisionSystem;
    
    // 🎯 UNIFIÉ : Gestion directe des NPCs (plus de NpcGroup)
    this.npcs = []; // Liste directe des NPCs
    this.groupId = 'central_group';
    this.groupColor = 0x4ecdc4; // Turquoise pour tous les NPCs
    this.groupSize = 37; // Nombre de NPCs
    this.centerX = 0;
    this.centerY = 0;
    this.spawnRadius = 150; // Rayon compact pour former un cercle serré
    
    this.migrationActive = false; // Flag pour savoir si la migration est en cours
    
    // Système de debug visuel pour la migration
    this.debugGraphics = null; // Graphics object pour dessiner les debug visuals
    this.migrationDebugData = []; // Données pour le debug (NPCs, destinations, ordre)
    
    // Configuration de la migration
    this.migrationConfig = {
      staggerDelayMin: 0,      // Certains peuvent partir immédiatement
      staggerDelayMax: 3500,   // Délai max plus important
      speedMin: 80,            // Vitesse min plus lente
      speedMax: 180,           // Vitesse max plus rapide
      migrationSpeed: 120,     // Vitesse de base (sera modulée)
      spawnMargin: 800,        // Distance à droite de l'écran pour le spawn
      verticalVariation: 150,  // Variation verticale au spawn
      speedVariation: 60,      // Variation de vitesse
      verticalSpeedVariation: 40 // Variation de vitesse verticale
    };
    
    // Écouter l'événement d'intro du joueur
    this.scene.events.on('playerIntroStarted', (data) => {
      this.startNpcMigration(data);
    });
  }

  // Spawner le groupe central de NPCs
  spawnGroups(playerPosition = { x: 0, y: 0 }) {
    // Position à 2/3 de l'écran en X, centre en Y
    this.centerX = this.scene.scale.width * 2/3;
    this.centerY = this.scene.scale.height / 2;
    
    this.createNpcs();
  }

  // 🎯 UNIFIÉ : Créer tous les NPCs directement
  createNpcs() {
    for (let i = 0; i < this.groupSize; i++) {
      const npc = this.createNpc(i);
      this.npcs.push(npc);
      
      if (this.entityManager) {
        this.entityManager.addEntity(npc, 'npc');
      }
    }
    
    // Configurer les collisions avec le joueur
    this.setupPlayerCollisions();

    // 🎯 CRUCIAL: Toujours démarrer la migration quand on crée les NPCs
    this.migrationActive = true;
  }

  // 🎯 UNIFIÉ : Créer un NPC individuel avec placement optimisé
  createNpc(index) {
    // Calcul de la position finale (destination) en cercles concentriques
    const npcCollisionRadius = 25; // Rayon réel de collision
    const safetyMargin = 0; // Marge de sécurité pour éviter les micro-collisions
    const minDistance = (npcCollisionRadius * 2) + safetyMargin; // Distance minimale = 50px
    
    let finalX, finalY;
    
    if (index === 0) {
      // Premier NPC au centre
      finalX = this.centerX;
      finalY = this.centerY;
    } else {
      // Calcul du cercle et de la position sur ce cercle
      let circle = 1;
      let positionInCircle = index - 1;
      
      // Calculer dynamiquement le nombre de NPCs par cercle selon la circonférence
      let npcsPerCircle = Math.floor((2 * Math.PI * (circle * minDistance)) / minDistance);
      npcsPerCircle = Math.max(6, npcsPerCircle); // Minimum 6 NPCs par cercle
      
      // Trouver le bon cercle
      while (positionInCircle >= npcsPerCircle) {
        positionInCircle -= npcsPerCircle;
        circle++;
        // Recalculer pour le nouveau cercle
        npcsPerCircle = Math.floor(2 * Math.PI * circle);
        npcsPerCircle = Math.max(6, npcsPerCircle);
      }
      
      // Position sur le cercle
      const angle = (Math.PI * 2 * positionInCircle) / npcsPerCircle;
      const distance = circle * minDistance;
      
      finalX = this.centerX + Math.cos(angle) * distance;
      finalY = this.centerY + Math.sin(angle) * distance;
    }
    
    // Calculer la position de spawn optimale selon la destination finale
    const spawnPosition = this.calculateSpawnPosition(index, { x: finalX, y: finalY });
    
    // Configuration du NPC avec vitesse normale
    const npcConfig = {
      groupId: this.groupId,
      color: this.groupColor,
      speed: 145 + Math.random() * 10 // 🎯 NORMALISÉ : 145-155 px/s (même que Player ~150)
    };
    
    // Créer le NPC à la position de spawn (extérieur)
    const npc = new Npc(this.scene, spawnPosition.x, spawnPosition.y, npcConfig);
    
    // Stocker la position finale comme cible de migration
    npc.targetPosition = { x: finalX, y: finalY };

    // 🎯 CRUCIAL: Démarrer la migration immédiatement
    npc.startMigration(npc.targetPosition);
    
    return npc;
  }

  /**
   * 🌟 KIDS-LIKE : Spawner directement dans la formation finale, décalée hors écran
   * @param {number} index - Index du NPC
   * @param {number} totalNpcs - Nombre total de NPCs
   * @param {Object} finalPosition - Position finale {x, y} du NPC
   * @returns {Object} Position {x, y}
   */
  calculateSpawnPosition(index, finalPosition) {
    // Plus de chaos dans le spawn
    const verticalVariation = (Math.random() - 0.5) * this.migrationConfig.verticalVariation;
    const horizontalVariation = Math.random() * 200; // Variation de profondeur de spawn
    
    const spawnX = finalPosition.x + this.migrationConfig.spawnMargin + horizontalVariation;
    const spawnY = finalPosition.y + verticalVariation;
    
    // Ajouter un léger décalage basé sur l'index pour créer des motifs naturels
    const angleOffset = (index / this.groupSize) * Math.PI * 2;
    const circleRadius = 30;
    const circleX = Math.cos(angleOffset) * circleRadius;
    const circleY = Math.sin(angleOffset) * circleRadius;
    
    return { 
      x: spawnX + circleX, 
      y: spawnY + circleY 
    };
  }

  // 🎯 UNIFIÉ : Configurer les collisions avec le joueur
  setupPlayerCollisions() {
    if (!this.collisionSystem) return;
    
    const player = this.entityManager.getPlayer();
    if (!player) return;
    
    // Les NPCs peuvent toujours collisionner avec le joueur
    this.npcs.forEach(npc => {
      this.collisionSystem.addCollisionPair(npc, player);
    });
  }

  /**
   * Démarrer la migration staggerée des NPCs
   * @param {Object} playerIntroData - Données de l'intro du joueur
   */
  startNpcMigration(playerIntroData) {
    if (this.migrationActive || this.npcs.length === 0) {
      console.warn('⚠️ Migration déjà active ou pas de NPCs');
      return;
    }
    
    this.migrationActive = true;
    
    const allNpcs = this.npcs;
    const groupCenter = this.getCenterPosition();
    
    // Calculer la distance de chaque NPC par rapport au centre du groupe
    const npcsWithDistance = allNpcs.map((npc, originalIndex) => {
      if (!npc.targetPosition) {
        console.warn(`⚠️ NPC ${originalIndex} n'a pas de targetPosition pour le tri!`);
        return null;
      }
      
      const dx = npc.targetPosition.x - groupCenter.x;
      const dy = npc.targetPosition.y - groupCenter.y;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      
      // Ajouter un facteur aléatoire pour briser la symétrie parfaite
      const randomFactor = Math.random() * 0.4 + 0.8; // Entre 0.8 et 1.2
      
      return {
        npc: npc,
        originalIndex: originalIndex,
        distanceFromCenter: distanceFromCenter * randomFactor
      };
    }).filter(data => data !== null);
    
    // Trier avec un peu de chaos
    npcsWithDistance.sort((a, b) => {
      const baseComparison = a.distanceFromCenter - b.distanceFromCenter;
      const randomInfluence = (Math.random() - 0.5) * 0.3; // ±15% de chaos dans le tri
      return baseComparison + randomInfluence;
    });
    
    const totalNpcs = npcsWithDistance.length;
    const baseVelocity = { x: -this.migrationConfig.migrationSpeed, y: 0 };
    
    npcsWithDistance.forEach((npcData, sortedIndex) => {
      // Distribution plus chaotique des délais
      const randomBase = Math.random();
      const randomPower = 0.5 + Math.random() * 1.5; // Exposant variable pour la distribution
      const normalizedIndex = sortedIndex / totalNpcs;
      
      const organicDelay = this.migrationConfig.staggerDelayMin + 
        (Math.pow(randomBase * normalizedIndex, randomPower) * 
        (this.migrationConfig.staggerDelayMax - this.migrationConfig.staggerDelayMin));
      
      // Variation de vitesse plus importante
      const speedVariation = (Math.random() - 0.5) * this.migrationConfig.speedVariation;
      const verticalVariation = (Math.random() - 0.5) * this.migrationConfig.verticalSpeedVariation;
      
      // Ajouter des micro-oscillations uniques à chaque NPC
      const uniqueFrequency = 0.5 + Math.random(); // Entre 0.5 et 1.5 Hz
      const uniquePhase = Math.random() * Math.PI * 2;
      const oscillationAmplitude = 5 + Math.random() * 10;
      
      const globalVelocity = {
        x: baseVelocity.x + speedVariation,
        y: baseVelocity.y + verticalVariation,
        oscillation: {
          frequency: uniqueFrequency,
          phase: uniquePhase,
          amplitude: oscillationAmplitude
        }
      };
      
      this.scene.time.delayedCall(organicDelay, () => {
        this.startNpcOrganismMigration(npcData.npc, globalVelocity, npcData.originalIndex);
      });
    });
    
    this.migrationDebugData = npcsWithDistance.map((npcData, sortedIndex) => ({
      npc: npcData.npc,
      originalIndex: npcData.originalIndex,
      sortedIndex: sortedIndex,
      distanceFromCenter: npcData.distanceFromCenter,
      migrationStarted: false
    }));
    
    this.createMigrationDebugVisual();
  }

  /**
   * 🌟 Démarrer la migration d'organisme unifié
   * @param {Npc} npc - Le NPC à faire migrer
   * @param {Object} globalVelocity - Vélocité globale de l'organisme {x, y}
   * @param {number} originalIndex - Index original du NPC pour debug
   */
  startNpcOrganismMigration(npc, globalVelocity, originalIndex) {
    if (!npc.targetPosition) {
      console.warn(`⚠️ NPC #${originalIndex} n'a pas de targetPosition!`);
      return;
    }
    
    // Variations organiques pour chaque NPC
    const organicVariation = {
      x: globalVelocity.x + (Math.random() - 0.5) * 10, // ±5px/s de variation
      y: globalVelocity.y + (Math.random() - 0.5) * 5   // ±2.5px/s de variation verticale
    };
    
    // Démarrer la migration avec la vélocité organique
    npc.startOrganismMigration(npc.targetPosition, organicVariation);
    
    // Mettre à jour le debug visuel
    this.updateMigrationDebugForNpc(originalIndex);
  }

  /**
   * Démarrer la migration d'un NPC individuel (ancienne méthode - gardée pour compatibilité)
   * @param {Npc} npc - Le NPC à faire migrer
   * @param {number} originalIndex - Index original du NPC pour debug
   * @param {number} sortedIndex - Position dans l'ordre de migration (optionnel)
   * @param {number} distanceFromCenter - Distance du centre (optionnel)
   */
  startNpcMigrationIndividual(npc, originalIndex, sortedIndex = null, distanceFromCenter = null) {
    if (!npc.targetPosition) {
      console.warn(`⚠️ NPC #${originalIndex} n'a pas de targetPosition!`);
      return;
    }
    
    npc.startMigration(npc.targetPosition);
    
    // Mettre à jour le debug visuel
    this.updateMigrationDebugForNpc(originalIndex);
  }

  /**
   * Créer le debug visuel pour la migration (destinations et trajets)
   */
  createMigrationDebugVisual() {
    if (!this.isDebugMode() || !this.migrationDebugData.length) {
      return;
    }
    
    // Créer l'objet graphics si nécessaire
    if (!this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(999); // Au-dessus des autres éléments
    }
    
    this.redrawMigrationDebugVisual();
  }

  /**
   * Redessiner le debug visuel complet
   */
  redrawMigrationDebugVisual() {
    if (!this.debugGraphics || !this.isDebugMode()) {
      return;
    }
    
    this.debugGraphics.clear();
    
    this.migrationDebugData.forEach((debugData, index) => {
      const npc = debugData.npc;
      const targetPos = npc.targetPosition;
      
      if (!targetPos || !npc.sprite) return;
      
      // Calculer la distance actuelle entre NPC et destination
      const currentDistance = Math.sqrt(
        Math.pow(targetPos.x - npc.sprite.x, 2) + 
        Math.pow(targetPos.y - npc.sprite.y, 2)
      );
      
      // Calculer la couleur selon l'ordre de migration (vert → jaune → rouge)
      const color = this.getColorForMigrationOrder(debugData.sortedIndex, this.migrationDebugData.length);
      
      // Alpha dynamique selon l'état et la distance
      let alpha = 0.8;
      if (debugData.migrationStarted) {
        // Plus transparent à mesure qu'il se rapproche (mais toujours visible)
        alpha = Math.max(0.3, Math.min(0.7, currentDistance / 200));
      }
      
      // Dessiner le cercle de destination
      this.debugGraphics.fillStyle(color, alpha);
      this.debugGraphics.fillCircle(targetPos.x, targetPos.y, 6);
      
      // Dessiner le contour du cercle
      this.debugGraphics.lineStyle(1, color, alpha + 0.2);
      this.debugGraphics.strokeCircle(targetPos.x, targetPos.y, 6);
      
      // Dessiner la ligne de connexion EN PERMANENCE (même pendant migration)
      if (currentDistance > 10) { // Seulement si pas encore arrivé
        // Épaisseur de ligne selon l'état
        const lineWidth = debugData.migrationStarted ? 2 : 1;
        const lineAlpha = debugData.migrationStarted ? alpha * 0.8 : alpha * 0.6;
        
        this.debugGraphics.lineStyle(lineWidth, color, lineAlpha);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(npc.sprite.x, npc.sprite.y);
        this.debugGraphics.lineTo(targetPos.x, targetPos.y);
        this.debugGraphics.strokePath();
        
        // Petite flèche à la destination
        const arrowSize = debugData.migrationStarted ? 10 : 8;
        const angle = Math.atan2(targetPos.y - npc.sprite.y, targetPos.x - npc.sprite.x);
        const arrowX1 = targetPos.x - Math.cos(angle - 0.5) * arrowSize;
        const arrowY1 = targetPos.y - Math.sin(angle - 0.5) * arrowSize;
        const arrowX2 = targetPos.x - Math.cos(angle + 0.5) * arrowSize;
        const arrowY2 = targetPos.y - Math.sin(angle + 0.5) * arrowSize;
        
        this.debugGraphics.lineStyle(lineWidth + 1, color, lineAlpha + 0.2);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(targetPos.x, targetPos.y);
        this.debugGraphics.lineTo(arrowX1, arrowY1);
        this.debugGraphics.moveTo(targetPos.x, targetPos.y);
        this.debugGraphics.lineTo(arrowX2, arrowY2);
        this.debugGraphics.strokePath();
      }
    });
  }

  /**
   * Mettre à jour le debug pour un NPC spécifique qui commence sa migration
   */
  updateMigrationDebugForNpc(originalIndex) {
    const debugData = this.migrationDebugData.find(data => data.originalIndex === originalIndex);
    if (debugData) {
      debugData.migrationStarted = true;
      // Pas besoin de redessiner ici, c'est fait en continu dans update()
    }
  }

  /**
   * Calculer la couleur selon l'ordre de migration (gradient rouge → vert)
   */
  getColorForMigrationOrder(sortedIndex, totalNpcs) {
    const ratio = sortedIndex / (totalNpcs - 1); // 0 (centre) à 1 (extérieur)
    
    // CORRECTION: Inverser le gradient pour que ROUGE = centre, VERT = extérieur
    if (ratio <= 0.5) {
      // Rouge → Jaune (centre → milieu)
      const localRatio = ratio * 2; // 0 → 1
      const red = 255;
      const green = Math.floor(localRatio * 255);
      const blue = 0;
      return (red << 16) | (green << 8) | blue;
    } else {
      // Jaune → Vert (milieu → extérieur)  
      const localRatio = (ratio - 0.5) * 2; // 0 → 1
      const red = Math.floor((1 - localRatio) * 255);
      const green = 255;
      const blue = 0;
      return (red << 16) | (green << 8) | blue;
    }
  }

  /**
   * Vérifier si le mode debug est activé pour les NPCs
   */
  isDebugMode() {
    return window.game && (window.game.debugPhysics || window.game.debugShoutRadius || window.game.debugNpcs);
  }

  /**
   * Recréer les données de debug pour tous les NPCs (même après migration)
   */
  createDebugDataForAllNpcs() {
    if (this.npcs.length === 0) return;
    
    const groupCenter = this.getCenterPosition();
    
    // Recréer les données de debug pour tous les NPCs existants
    this.migrationDebugData = this.npcs.map((npc, index) => {
      const dx = npc.targetPosition ? npc.targetPosition.x - groupCenter.x : 0;
      const dy = npc.targetPosition ? npc.targetPosition.y - groupCenter.y : 0;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      
      return {
        npc: npc,
        originalIndex: index,
        sortedIndex: index, // Garder l'ordre actuel
        distanceFromCenter: distanceFromCenter,
        migrationStarted: true // Marquer comme déjà migré
      };
    });
    
    console.log(`🔍 Données de debug recréées pour ${this.npcs.length} NPCs`);
  }

  /**
   * Nettoyer le debug visuel de migration
   */
  clearMigrationDebugVisual() {
    if (this.debugGraphics) {
      this.debugGraphics.clear();
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
    this.migrationDebugData = [];
  }

  /**
   * Vérifier si tous les NPCs ont terminé leur migration
   */
  checkMigrationComplete() {
    if (!this.migrationActive || this.npcs.length === 0) return;
    
    // Vérifier tous les types de migration (ancien et nouveau système)
    const migrating = this.npcs.filter(npc => 
      npc.state === 'migrating' || npc.state === 'organism_migrating'
    );
    
    if (migrating.length === 0) {
      this.migrationActive = false;
      
      // Nettoyer le debug visuel
      this.clearMigrationDebugVisual();
      
      console.log('🎯 Tous les NPCs ont terminé leur migration');
      this.scene.events.emit('npcMigrationComplete');
    }
  }

  // Mettre à jour les NPCs
  update(delta) {
    // Plus de groupe à mettre à jour - les NPCs se mettent à jour individuellement
    
    // Vérifier la completion de la migration
    if (this.migrationActive) {
      this.checkMigrationComplete();
    }
    
    // Mettre à jour le debug visuel si nécessaire
    const shouldShowDebug = this.isDebugMode();
    
    if (shouldShowDebug) {
      // Si le debug est activé mais qu'on n'a pas de données, les recréer
      if (this.migrationDebugData.length === 0 && this.npcs.length > 0) {
        this.createDebugDataForAllNpcs();
      }
      
      // Créer les graphics si nécessaire
      if (!this.debugGraphics && this.migrationDebugData.length > 0) {
        this.createMigrationDebugVisual();
      }
      
      // Mettre à jour la visibilité
      if (this.debugGraphics && this.debugGraphics.visible !== shouldShowDebug) {
        this.debugGraphics.setVisible(shouldShowDebug);
      }
      
      // Redessiner en continu si visible (les lignes doivent suivre les NPCs)
      if (this.debugGraphics && this.debugGraphics.visible) {
        this.redrawMigrationDebugVisual();
      }
    } else if (this.debugGraphics) {
      // Cacher le debug si désactivé
      this.debugGraphics.setVisible(false);
    }
  }

  // 🎯 UNIFIÉ : Obtenir tous les NPCs
  getAllNpcs() {
    return [...this.npcs];
  }

  // 🎯 UNIFIÉ : Obtenir le nombre total de NPCs
  getTotalNpcCount() {
    return this.npcs.length;
  }

  // 🎯 UNIFIÉ : Obtenir la position centrale du groupe
  getCenterPosition() {
    return { x: this.centerX, y: this.centerY };
  }

  // 🎯 UNIFIÉ : Obtenir les statistiques de spawn
  getSpawnStats() {
    return {
      totalGroups: 1,
      totalNpcs: this.npcs.length,
      groupSizes: [this.npcs.length],
      groupColors: [this.groupColor],
      groupPositions: [this.getCenterPosition()]
    };
  }

  // Nettoyer tous les NPCs
  cleanup() {
    // Nettoyer les event listeners
    this.scene.events.off('playerIntroStarted');
    
    // Nettoyer le debug visuel
    this.clearMigrationDebugVisual();
    
    // Nettoyer tous les NPCs
    this.npcs.forEach(npc => {
      if (this.entityManager && npc.id !== undefined) {
        this.entityManager.removeEntity(npc.id);
      } else {
        npc.destroy();
      }
    });
    
    this.npcs = [];
    this.migrationActive = false;
  }

  // Respawn les NPCs (utile pour le redimensionnement)
  respawnGroups(playerPosition) {
    // Nettoyer le debug avant de respawn
    this.clearMigrationDebugVisual();
    this.cleanup();
    this.spawnGroups(playerPosition);
  }

  // 🎯 COMPATIBILITÉ : Méthodes pour maintenir la compatibilité avec l'ancien système
  getGroups() {
    // Retourner un objet simulant l'ancien NpcGroup pour compatibilité
    return [{
      getNpcs: () => this.npcs,
      getSize: () => this.npcs.length,
      getColor: () => this.groupColor,
      getId: () => this.groupId,
      getCenterPosition: () => this.getCenterPosition()
    }];
  }

  getCentralGroup() {
    // Retourner un objet simulant l'ancien centralGroup pour compatibilité
    return {
      getNpcs: () => this.npcs,
      getSize: () => this.npcs.length,
      getColor: () => this.groupColor,
      getId: () => this.groupId,
      getCenterPosition: () => this.getCenterPosition()
    };
  }
} 