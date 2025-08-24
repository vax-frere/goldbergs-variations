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
      // 🎯 NOUVEAU: paramètres de formation bus (multi-voies)
      // laneCount: nombre de voies latérales autour de l'axe du trail (3–5 recommandé)
      laneCount: config.laneCount || 4,
      // laneSpacing: écart (en px) entre deux voies adjacentes (10–26px recommandé)
      laneSpacing: config.laneSpacing || 26,
      // staggerRatio: proportion de followPointDistance utilisée comme décalage longitudinal
      // 0.3–0.5 pour un bon étagement; 0 = aucune progression vers l'arrière
      staggerRatio: config.staggerRatio || 0.4,
      // jitterPx: micro-jitter aléatoire (en px) pour casser la rigidité de la formation
      jitterPx: config.jitterPx || 6,
      // 🎯 Biais pour remplir d'abord les points les plus proches du joueur
      // Plus la valeur est grande, plus les premiers points seront favorisés
      frontFillBias: config.frontFillBias || 0,
      // 🎯 SWAP LOCAL: échanges de cibles avec seuil/cooldown pour organicité
      swapCooldown: config.swapCooldown || 1000, // ms entre deux swaps du même NPC
      swapImprovementThreshold: config.swapImprovementThreshold || 15, // gain minimal (px)
      ...config
    };
    
    // État du système
    this.npcAssignments = new Map(); // NPC → {pointIndex, assignedAt, lastDistance}
    this.pointCapacities = new Map(); // pointIndex → {current, max, npcs: Set()}
    this.reassignmentTimers = new Map(); // NPC → timestamp
    this.swapTimers = new Map(); // NPC → last swap timestamp
    
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
    
    // Calculer la position précise en utilisant le modèle multi-voies (bus)
    return this.calculateLanePosition(basePoint, npc, assignment.pointIndex);
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
      
      // 🎯 BONUS DE REMPLISSAGE AVANT: favoriser les indices proches du joueur (i petit)
      const frontBonus = (followPoints.length - i) * (this.config.frontFillBias || 0);
      const score = distance * this.config.distanceWeight + strongCapacityPenalty - distributionBonus - frontBonus;
      
      // 🎯 DEBUG détaillé (conditionnel)
      if (this.config.debugAssignment) {
        console.log(`  📊 Point ${i}: dist=${distance.toFixed(1)}px, occ=${capacity.current}/${capacity.max}, pénalité=${strongCapacityPenalty.toFixed(1)}, bonus=${distributionBonus.toFixed(1)}, frontBonus=${frontBonus.toFixed(1)}, score=${score.toFixed(1)}`);
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
      } else {
        // 🎯 SWAP LOCAL: tenter un échange si le point cible est plein
        const targetCap = this.getPointCapacity(bestPoint);
        if (targetCap.current >= targetCap.max) {
          const swapped = this.trySwapWithOccupant(npc, currentPointIndex, bestPoint);
          if (swapped && this.config.debugAssignment) {
            console.log(`🔁 Swap local effectué pour NPC ${this.getNpcId(npc)} vers point ${bestPoint}`);
          }
        }
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

    // 🎯 Rééquilibrage local: si on dépasse 75% de la capacité sur ce point
    // et qu'un point précédent immédiat (plus proche du joueur) a de la place,
    // pousser un NPC excédentaire vers le point précédent pour éviter les bouchons.
    const overloadThreshold = Math.ceil(capacity.max * 0.75);
    if (capacity.current > overloadThreshold && pointIndex > 0) {
      const prevCapacity = this.getPointCapacity(pointIndex - 1);
      if (prevCapacity.current < prevCapacity.max) {
        // Déplacer le dernier NPC ajouté (ou un au hasard) vers le point précédent
        const candidates = Array.from(capacity.npcs);
        const toMove = candidates[candidates.length - 1];
        if (toMove && toMove !== npc) {
          capacity.npcs.delete(toMove);
          capacity.current = capacity.npcs.size;
          prevCapacity.npcs.add(toMove);
          prevCapacity.current = prevCapacity.npcs.size;
          this.npcAssignments.set(toMove, {
            pointIndex: pointIndex - 1,
            assignedAt: Date.now(),
            lastDistance: this.calculateDistance(toMove.sprite, this.trailBehavior.followPoints[pointIndex - 1])
          });
          this.reassignmentTimers.set(toMove, Date.now());
          if (this.config.debugAssignment) {
            console.log(`🚦 Rebalance: NPC ${toMove.groupId} déplacé point ${pointIndex} → ${pointIndex - 1}`);
          }
        }
      }
    }
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
  calculateLanePosition(basePoint, npc, pointIndex) {
    const capacity = this.getPointCapacity(pointIndex);
    const npcsAtPoint = Array.from(capacity.npcs);
    const npcIndexAtPoint = npcsAtPoint.indexOf(npc);
    if (npcIndexAtPoint === -1) return basePoint;

    // Vecteurs directionnels (fallback si absents)
    const tangent = basePoint.tangent || { x: 1, y: 0 };
    const normal = basePoint.normal || { x: 0, y: 1 };

    // Calcul lane et position dans la lane
    const lanes = Math.max(1, this.config.laneCount);
    // 🎯 NOUVEL ORDRE: remplir d'abord la colonne la plus proche du joueur (offset 0),
    // puis étendre progressivement vers l'arrière.
    // On mappe l'index dans le point à (colIdx, laneIdx): on remplit par colonnes croissantes.
    const colIdx = Math.floor(npcIndexAtPoint / lanes); // 0,1,2...
    const laneIdx = npcIndexAtPoint % lanes;

    // Centrer les lanes autour de 0: ex lanes=4 → offsets -1.5, -0.5, 0.5, 1.5
    const centeredLane = laneIdx - (lanes - 1) / 2;
    const lateralOffset = centeredLane * this.config.laneSpacing;

    // Stagger longitudinal (alterner les colonnes) le long de la tangente
    // Décalage longitudinal croissant (0, 1x, 2x, ...), orienté vers l'arrière du trail (négatif sur la tangente)
    const baseLongitudinal = colIdx * (this.trailBehavior.followPointDistance * this.config.staggerRatio);
    const directionSign = -1; // vers l'arrière du joueur
    const stagger = directionSign * baseLongitudinal;

    // Petit jitter pour casser les motifs
    const jx = (Math.random() * 2 - 1) * this.config.jitterPx;
    const jy = (Math.random() * 2 - 1) * this.config.jitterPx;

    return {
      x: basePoint.x + normal.x * lateralOffset + tangent.x * stagger + jx,
      y: basePoint.y + normal.y * lateralOffset + tangent.y * stagger + jy
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
    this.swapTimers.delete(npc); // Supprimer le timer de swap
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
    this.swapTimers.clear(); // Supprimer les timers de swap
    console.log('🗑️ SmartTrailAssignment détruit');
  }

  trySwapWithOccupant(npc, currentPointIndex, targetPointIndex) {
    const now = Date.now();
    const lastSwapNpc = this.swapTimers.get(npc) || 0;
    if (now - lastSwapNpc < this.config.swapCooldown) return false;
    const cap = this.getPointCapacity(targetPointIndex);
    if (!cap || cap.npcs.size === 0) return false;

    // Limiter le nombre de candidats scannés pour performance
    const candidates = Array.from(cap.npcs).slice(0, 4);
    const npcCurrentPoint = this.trailBehavior.followPoints[currentPointIndex];
    const npcTargetPoint = this.trailBehavior.followPoints[targetPointIndex];
    const dNpcCurrent = this.calculateDistance(npc.sprite, npcCurrentPoint);
    const dNpcTarget = this.calculateDistance(npc.sprite, npcTargetPoint);

    for (const other of candidates) {
      const lastSwapOther = this.swapTimers.get(other) || 0;
      if (now - lastSwapOther < this.config.swapCooldown) continue;
      const otherAssign = this.npcAssignments.get(other);
      if (!otherAssign) continue;
      const otherPointIndex = otherAssign.pointIndex; // devrait être targetPointIndex
      const otherCurrentPoint = this.trailBehavior.followPoints[otherPointIndex];
      const otherAltPoint = npcCurrentPoint; // ce que l'autre prendrait
      const dOtherCurrent = this.calculateDistance(other.sprite, otherCurrentPoint);
      const dOtherAlt = this.calculateDistance(other.sprite, otherAltPoint);

      const improvement = (dNpcCurrent + dOtherCurrent) - (dNpcTarget + dOtherAlt);
      if (improvement > this.config.swapImprovementThreshold) {
        // Exécuter le swap: déplacer npc → targetPointIndex, other → currentPointIndex
        const targetCap = cap;
        const currentCap = this.getPointCapacity(currentPointIndex);
        // Mettre à jour les ensembles
        targetCap.npcs.delete(other);
        currentCap.npcs.add(other);
        currentCap.npcs.delete(npc);
        targetCap.npcs.add(npc);
        targetCap.current = targetCap.npcs.size;
        currentCap.current = currentCap.npcs.size;

        this.npcAssignments.set(npc, {
          pointIndex: targetPointIndex,
          assignedAt: now,
          lastDistance: dNpcTarget
        });
        this.npcAssignments.set(other, {
          pointIndex: currentPointIndex,
          assignedAt: now,
          lastDistance: dOtherAlt
        });
        this.swapTimers.set(npc, now);
        this.swapTimers.set(other, now);
        return true;
      }
    }
    return false;
  }

  getNpcId(npc) {
    return (npc && (npc.groupId ?? npc.entityId ?? 'unknown'));
  }
}
