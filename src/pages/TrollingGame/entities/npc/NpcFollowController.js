/**
 * 🎯 SOLID: NpcFollowController
 * Responsabilité : Système de suivi AAA avec zone de confort
 */
export class NpcFollowController {
  constructor(npc) {
    this.npc = npc;
    
    // 🎯 SYSTÈME AAA : Zone de confort + détection de progrès
    this.followState = {
      mode: "MOVING",                 // "MOVING" ou "AT_REST"
      lastDistanceToTarget: null,     // Distance précédente au point de trail
      recentProgress: [],             // Historique du progrès des dernières frames
      comfortZone: 25,                // Zone de confort (px) - peut s'arrêter si dedans
      minProgressRate: 0.3,           // Progrès minimum requis (px par frame)
      wakeUpDistance: 50              // Target doit bouger de 50px pour réveiller
    };
    
    console.log('👥 NpcFollowController créé');
  }

  /**
   * Reset du système AAA
   */
  resetFollowState() {
    this.followState.mode = "MOVING";
    this.followState.recentProgress = [];
    this.followState.lastDistanceToTarget = null;
  }

  /**
   * Mettre à jour le système AAA zone de confort
   */
  updateFollowState(stateController) {
    if (stateController.getState() !== 'following') return;
    
    const followTarget = stateController.getFollowTarget();
    if (!followTarget) return;
    
    const trailTarget = followTarget.getFollowTargetPosition(this.npc);
    if (!trailTarget) return;
    
    const currentDistance = Math.sqrt(
      (trailTarget.x - this.npc.sprite.x)**2 + (trailTarget.y - this.npc.sprite.y)**2
    );
    
    // Calculer le progrès (distance qui diminue = progrès positif)
    let progress = 0;
    if (this.followState.lastDistanceToTarget !== null) {
      progress = this.followState.lastDistanceToTarget - currentDistance;
    }
    
    // Garder historique des 10 dernières frames
    this.followState.recentProgress.push(progress);
    if (this.followState.recentProgress.length > 10) {
      this.followState.recentProgress.shift();
    }
    
    // Calculer progrès moyen
    const avgProgress = this.followState.recentProgress.length > 0 
      ? this.followState.recentProgress.reduce((a, b) => a + b, 0) / this.followState.recentProgress.length
      : 0;
    
    // LOGIQUE AAA
    if (this.followState.mode === "MOVING") {
      // Mode actif : vérifier si on peut se reposer
      const inComfortZone = currentDistance < this.followState.comfortZone;
      const poorProgress = avgProgress < this.followState.minProgressRate;
      
      if (inComfortZone && poorProgress && this.followState.recentProgress.length >= 5) {
        this.followState.mode = "AT_REST";
        console.log(`😴 NPC ${this.npc.groupId} entre en mode repos (distance: ${currentDistance.toFixed(1)}px)`);
      }
      
    } else if (this.followState.mode === "AT_REST") {
      // Mode repos : vérifier si la target a bougé suffisamment
      const farFromComfort = currentDistance > this.followState.wakeUpDistance;
      
      if (farFromComfort) {
        this.followState.mode = "MOVING";
        this.followState.recentProgress = []; // Reset historique
        console.log(`🏃 NPC ${this.npc.groupId} sort du repos (distance: ${currentDistance.toFixed(1)}px)`);
      }
    }
    
    this.followState.lastDistanceToTarget = currentDistance;
  }

  /**
   * Vérifier si au repos
   */
  isAtRest() {
    return this.followState.mode === "AT_REST";
  }

  /**
   * Calculer les forces additionnelles pour le following
   */
  calculateFollowingForces(delta) {
    // 🎯 Aucune force si au repos
    if (this.isAtRest()) {
      return { x: 0, y: 0 };
    }
    
    // Pas de forces supplémentaires actuellement - géré par la physique Phaser
    return { x: 0, y: 0 };
  }

  /**
   * Obtenir les statistiques du follow
   */
  getFollowStats() {
    return {
      mode: this.followState.mode,
      recentProgressCount: this.followState.recentProgress.length,
      lastDistanceToTarget: this.followState.lastDistanceToTarget,
      comfortZone: this.followState.comfortZone,
      wakeUpDistance: this.followState.wakeUpDistance
    };
  }

  /**
   * Configurer les paramètres de suivi
   */
  configure(options = {}) {
    if (options.comfortZone !== undefined) {
      this.followState.comfortZone = options.comfortZone;
    }
    
    if (options.minProgressRate !== undefined) {
      this.followState.minProgressRate = options.minProgressRate;
    }
    
    if (options.wakeUpDistance !== undefined) {
      this.followState.wakeUpDistance = options.wakeUpDistance;
    }
    
    console.log(`⚙️ NpcFollowController reconfiguré:`, {
      comfortZone: this.followState.comfortZone,
      minProgressRate: this.followState.minProgressRate,
      wakeUpDistance: this.followState.wakeUpDistance
    });
  }

  /**
   * Nettoyer le composant
   */
  destroy() {
    this.followState.recentProgress = [];
    console.log('🗑️ NpcFollowController détruit');
  }
} 