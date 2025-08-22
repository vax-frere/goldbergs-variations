/**
 * 🎯 SYSTÈME AAA : Smart Trail Assignment
 * Répartition dynamique et optimale des NPCs sur les points de trail
 * 
 * Fonctionnalités :
 * - Assignment par proximité plutôt que par index
 * - Réassignation intelligente en temps réel
 * - Gestion de capacité flexible
 * - Prévention des oscillations
 */
export class SmartTrailAssignment {
  constructor(trailBehavior, config = {}) {
    this.trailBehavior = trailBehavior;
    this.owner = trailBehavior.owner; // Le Player
    
    // Configuration
    this.config = {
      maxFollowersPerPoint: config.maxFollowersPerPoint || 6,
      minFollowersPerPoint: config.minFollowersPerPoint || 3,
      reassignmentCooldown: config.reassignmentCooldown || 1000, // 1s avant réassignation
      stabilityThreshold: config.stabilityThreshold || 30, // 30px de distance pour considérer stable
      distanceWeight: config.distanceWeight || 1.0,
      capacityWeight: config.capacityWeight || 0.3, // Legacy, plus utilisé
      debugAssignment: config.debugAssignment === true, // Debug par défaut désactivé
      ...config
    };
    
    // État du système
    this.npcAssignments = new Map(); // NPC → {pointIndex, assignedAt, lastDistance}
    this.pointCapacities = new Map(); // pointIndex → {current, max, npcs: Set()}
    this.reassignmentTimers = new Map(); // NPC → timestamp
    
    // Statistiques
    this.stats = {
      totalReassignments: 0,
      averageDistance: 0,
      lastOptimizationTime: 0
    };
    
    console.log('🧠 SmartTrailAssignment initialisé avec config:', this.config);
  }

  /**
   * 🎯 API PRINCIPALE : Obtenir le point assigné pour un NPC
   */
  getAssignedPoint(npc) {
    // D'abord s'assurer que le NPC a un assignment valide
    this.ensureValidAssignment(npc);
    
    const assignment = this.npcAssignments.get(npc);
    if (!assignment) {
      console.warn('❌ Aucun assignment trouvé pour NPC', npc.groupId);
      return null;
    }
    
    const followPoints = this.trailBehavior.followPoints;
    if (assignment.pointIndex >= followPoints.length) {
      console.warn('❌ Index de point invalide:', assignment.pointIndex, 'vs', followPoints.length);
      return null;
    }
    
    const basePoint = followPoints[assignment.pointIndex];
    
    // Calculer la position précise avec offset pour éviter superposition
    return this.calculatePrecisePosition(basePoint, npc, assignment.pointIndex);
  }

  /**
   * 🎯 S'assurer qu'un NPC a un assignment valide
   */
  ensureValidAssignment(npc) {
    const currentAssignment = this.npcAssignments.get(npc);
    const followPoints = this.trailBehavior.followPoints;
    
    // Vérifier si il faut faire un assignment initial
    if (!currentAssignment || currentAssignment.pointIndex >= followPoints.length) {
      this.performInitialAssignment(npc);
      return;
    }
    
    // Vérifier si une réassignation serait bénéfique
    this.checkForReassignment(npc);
  }

  /**
   * 🎯 Assignment initial d'un NPC
   */
  performInitialAssignment(npc) {
    const bestPoint = this.findBestAvailablePoint(npc);
    
    if (bestPoint !== null) {
      this.assignNpcToPoint(npc, bestPoint);
      console.log(`✅ NPC ${npc.groupId} assigné au point ${bestPoint}`);
    } else {
      console.warn(`⚠️ Aucun point disponible pour NPC ${npc.groupId}`);
    }
  }

  /**
   * 🎯 Trouver le meilleur point disponible pour un NPC
   */
  findBestAvailablePoint(npc) {
    const followPoints = this.trailBehavior.followPoints;
    if (!followPoints.length) return null;
    
    let bestPoint = null;
    let bestScore = Infinity;
    
    // 🎯 DEBUG: Log des candidats (conditionnel)
    if (this.config.debugAssignment) {
      console.log(`🔍 NPC ${npc.groupId} cherche un point parmi ${followPoints.length} disponibles`);
    }
    
    for (let i = 0; i < followPoints.length; i++) {
      const point = followPoints[i];
      const capacity = this.getPointCapacity(i);
      
      // Vérifier si le point a de la place
      if (capacity.current >= capacity.max) {
        if (this.config.debugAssignment) {
          console.log(`  ❌ Point ${i}: PLEIN (${capacity.current}/${capacity.max})`);
        }
        continue;
      }
      
      // Calculer le score amélioré
      const distance = this.calculateDistance(npc.sprite, point);
      
      // 🎯 NOUVELLE PÉNALITÉ BEAUCOUP PLUS FORTE
      // Plus un point est occupé, plus la pénalité est exponentielle
      const occupancyRatio = capacity.current / capacity.max;
      const strongCapacityPenalty = Math.pow(occupancyRatio, 2) * 500; // Pénalité exponentielle !
      
      // 🎯 BONUS DE DISTRIBUTION : Favoriser les points moins utilisés
      const distributionBonus = (capacity.max - capacity.current) * 50; // Bonus pour places libres
      
      const score = distance * this.config.distanceWeight + strongCapacityPenalty - distributionBonus;
      
      // 🎯 DEBUG détaillé (conditionnel)
      if (this.config.debugAssignment) {
        console.log(`  📊 Point ${i}: dist=${distance.toFixed(1)}px, occ=${capacity.current}/${capacity.max}, pénalité=${strongCapacityPenalty.toFixed(1)}, bonus=${distributionBonus.toFixed(1)}, score=${score.toFixed(1)}`);
      }
      
      if (score < bestScore) {
        bestScore = score;
        bestPoint = i;
      }
    }
    
    if (this.config.debugAssignment) {
      console.log(`  ✅ NPC ${npc.groupId} → Point ${bestPoint} (score: ${bestScore.toFixed(1)})`);
    }
    return bestPoint;
  }

  /**
   * 🎯 Vérifier si une réassignation serait bénéfique
   */
  checkForReassignment(npc) {
    const currentTime = Date.now();
    const lastReassignment = this.reassignmentTimers.get(npc) || 0;
    
    // Cooldown pour éviter les oscillations
    if (currentTime - lastReassignment < this.config.reassignmentCooldown) {
      return;
    }
    
    const currentAssignment = this.npcAssignments.get(npc);
    const currentPointIndex = currentAssignment.pointIndex;
    const currentPoint = this.trailBehavior.followPoints[currentPointIndex];
    
    if (!currentPoint) return;
    
    const currentDistance = this.calculateDistance(npc.sprite, currentPoint);
    const bestPoint = this.findBestAvailablePoint(npc);
    
    // Si on trouve un meilleur point
    if (bestPoint !== null && bestPoint !== currentPointIndex) {
      const bestPointData = this.trailBehavior.followPoints[bestPoint];
      const bestDistance = this.calculateDistance(npc.sprite, bestPointData);
      
      // Réassigner seulement si l'amélioration est significative
      const improvement = currentDistance - bestDistance;
      if (improvement > this.config.stabilityThreshold) {
        this.reassignNpc(npc, bestPoint);
        this.stats.totalReassignments++;
        console.log(`🔄 NPC ${npc.groupId} réassigné: point ${currentPointIndex} → ${bestPoint} (gain: ${improvement.toFixed(1)}px)`);
      }
    }
  }

  /**
   * 🎯 Assigner un NPC à un point spécifique
   */
  assignNpcToPoint(npc, pointIndex) {
    // Retirer de l'ancien point si nécessaire
    this.removeNpcFromCurrentPoint(npc);
    
    // Ajouter au nouveau point
    const capacity = this.getPointCapacity(pointIndex);
    capacity.npcs.add(npc);
    capacity.current = capacity.npcs.size;
    
    // Enregistrer l'assignment
    this.npcAssignments.set(npc, {
      pointIndex: pointIndex,
      assignedAt: Date.now(),
      lastDistance: this.calculateDistance(npc.sprite, this.trailBehavior.followPoints[pointIndex])
    });
    
    this.reassignmentTimers.set(npc, Date.now());
  }

  /**
   * 🎯 Réassigner un NPC à un nouveau point
   */
  reassignNpc(npc, newPointIndex) {
    this.assignNpcToPoint(npc, newPointIndex);
  }

  /**
   * 🎯 Retirer un NPC de son point actuel
   */
  removeNpcFromCurrentPoint(npc) {
    const currentAssignment = this.npcAssignments.get(npc);
    if (!currentAssignment) return;
    
    const capacity = this.getPointCapacity(currentAssignment.pointIndex);
    capacity.npcs.delete(npc);
    capacity.current = capacity.npcs.size;
  }

  /**
   * 🎯 Obtenir/créer la capacité d'un point
   */
  getPointCapacity(pointIndex) {
    if (!this.pointCapacities.has(pointIndex)) {
      this.pointCapacities.set(pointIndex, {
        current: 0,
        max: this.config.maxFollowersPerPoint,
        npcs: new Set()
      });
    }
    return this.pointCapacities.get(pointIndex);
  }

  /**
   * 🎯 Calculer la position précise avec offset
   */
  calculatePrecisePosition(basePoint, npc, pointIndex) {
    const capacity = this.getPointCapacity(pointIndex);
    const npcsAtPoint = Array.from(capacity.npcs);
    const npcIndexAtPoint = npcsAtPoint.indexOf(npc);
    
    if (npcIndexAtPoint === -1) {
      return basePoint; // Fallback
    }
    
    // Disperser en cercle autour du point
    const totalAtPoint = npcsAtPoint.length;
    const angle = (npcIndexAtPoint / totalAtPoint) * Math.PI * 2;
    const radius = Math.min(20, totalAtPoint * 3); // Rayon adaptatif
    
    return {
      x: basePoint.x + Math.cos(angle) * radius,
      y: basePoint.y + Math.sin(angle) * radius
    };
  }

  /**
   * 🎯 Calculer la distance entre deux points
   */
  calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 🎯 Nettoyer un NPC du système
   */
  removeNpc(npc) {
    this.removeNpcFromCurrentPoint(npc);
    this.npcAssignments.delete(npc);
    this.reassignmentTimers.delete(npc);
    console.log(`🗑️ NPC ${npc.groupId} retiré du système d'assignment`);
  }

  /**
   * 🎯 Optimisation globale périodique
   */
  performGlobalOptimization() {
    const startTime = performance.now();
    
    // Réinitialiser les capacités
    this.pointCapacities.clear();
    
    // Recalculer tous les assignments
    const allNpcs = Array.from(this.npcAssignments.keys());
    allNpcs.forEach(npc => {
      this.performInitialAssignment(npc);
    });
    
    this.stats.lastOptimizationTime = performance.now() - startTime;
    console.log(`🔧 Optimisation globale terminée en ${this.stats.lastOptimizationTime.toFixed(2)}ms`);
  }

  /**
   * 🎯 Obtenir les statistiques du système
   */
  getStats() {
    const totalAssignments = this.npcAssignments.size;
    let totalDistance = 0;
    
    this.npcAssignments.forEach((assignment, npc) => {
      const point = this.trailBehavior.followPoints[assignment.pointIndex];
      if (point) {
        totalDistance += this.calculateDistance(npc.sprite, point);
      }
    });
    
    return {
      ...this.stats,
      totalNpcs: totalAssignments,
      averageDistance: totalAssignments > 0 ? totalDistance / totalAssignments : 0,
      pointsInUse: this.pointCapacities.size,
      totalCapacity: Array.from(this.pointCapacities.values()).reduce((sum, cap) => sum + cap.current, 0)
    };
  }

  /**
   * 🎯 Debugging : afficher l'état du système
   */
  debugLog() {
    const stats = this.getStats();
    console.log('🧠 SmartTrailAssignment Stats:', stats);
    
    console.log('📍 Points et capacités:');
    this.pointCapacities.forEach((capacity, pointIndex) => {
      console.log(`  Point ${pointIndex}: ${capacity.current}/${capacity.max} NPCs`);
    });
  }

  /**
   * 🎯 Activer/désactiver le debug
   */
  setDebugEnabled(enabled) {
    this.config.debugAssignment = enabled;
    console.log(`🐛 SmartAssignment debug ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * 🎯 Nettoyer le système
   */
  destroy() {
    this.npcAssignments.clear();
    this.pointCapacities.clear();
    this.reassignmentTimers.clear();
    console.log('🗑️ SmartTrailAssignment détruit');
  }
}
