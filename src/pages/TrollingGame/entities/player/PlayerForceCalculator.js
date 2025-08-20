/**
 * 🎯 SOLID REFACTOR: PlayerForceCalculator
 * Responsabilité unique : Calculer les forces et rayons dynamiques du joueur
 */
export class PlayerForceCalculator {
  constructor(player) {
    this.player = player;
    
    // Configuration de base
    this.baseShoutForce = 1.0;
    this.baseShoutRadius = 125;
    
    // Configuration actuelle (calculée dynamiquement)
    this.currentShoutForce = this.baseShoutForce;
    this.currentShoutRadius = this.baseShoutRadius;
    
    // Multiplicateurs par follower
    this.forceMultiplierPerFollower = 0.1; // +10% de force par suiveur
    this.radiusMultiplierPerFollower = 0.025; // +2.5% de rayon par suiveur
    this.tremblingRadiusMultiplierPerFollower = 0.01; // +1% pour collision trembling
    
    console.log('⚡ PlayerForceCalculator initialisé - force:', this.baseShoutForce, 'rayon:', this.baseShoutRadius);
  }

  /**
   * Calculer la force de cri basée sur le nombre de followers
   */
  calculateShoutForce(followerCount = 0) {
    const multiplier = 1 + (followerCount * this.forceMultiplierPerFollower);
    this.currentShoutForce = this.baseShoutForce * multiplier;
    
    return this.currentShoutForce;
  }

  /**
   * Calculer le rayon de cri basé sur le nombre de followers
   */
  calculateShoutRadius(followerCount = 0) {
    const multiplier = 1 + (followerCount * this.radiusMultiplierPerFollower);
    this.currentShoutRadius = this.baseShoutRadius * multiplier;
    
    return this.currentShoutRadius;
  }

  /**
   * Calculer le rayon de collision trembling basé sur le nombre de followers
   */
  calculateTremblingRadius(baseRadius, followerCount = 0) {
    const multiplier = 1 + (followerCount * this.tremblingRadiusMultiplierPerFollower);
    return baseRadius * multiplier;
  }

  /**
   * Mettre à jour tous les calculs basés sur le nombre de followers actuel
   */
  updateCalculations() {
    const followerCount = this.player.followerManager ? 
      this.player.followerManager.getFollowerCount() : 0;
    
    this.calculateShoutForce(followerCount);
    this.calculateShoutRadius(followerCount);
    
    console.log(`⚡ Forces mises à jour - followers: ${followerCount}, force: ${this.currentShoutForce.toFixed(2)}, rayon: ${this.currentShoutRadius.toFixed(1)}`);
  }

  /**
   * Obtenir la force de cri actuelle
   */
  getCurrentShoutForce() {
    return this.currentShoutForce;
  }

  /**
   * Obtenir le rayon de cri actuel
   */
  getCurrentShoutRadius() {
    return this.currentShoutRadius;
  }

  /**
   * Obtenir la force de base
   */
  getBaseShoutForce() {
    return this.baseShoutForce;
  }

  /**
   * Obtenir le rayon de base
   */
  getBaseShoutRadius() {
    return this.baseShoutRadius;
  }

  /**
   * Définir la force de base
   */
  setBaseShoutForce(force) {
    this.baseShoutForce = Math.max(0.1, force);
    this.updateCalculations();
    console.log('⚡ Nouvelle force de base:', this.baseShoutForce);
  }

  /**
   * Définir le rayon de base
   */
  setBaseShoutRadius(radius) {
    this.baseShoutRadius = Math.max(10, radius);
    this.updateCalculations();
    console.log('⚡ Nouveau rayon de base:', this.baseShoutRadius);
  }

  /**
   * Définir le multiplicateur de force par follower
   */
  setForceMultiplierPerFollower(multiplier) {
    this.forceMultiplierPerFollower = Math.max(0, multiplier);
    this.updateCalculations();
    console.log('⚡ Nouveau multiplicateur force/follower:', this.forceMultiplierPerFollower);
  }

  /**
   * Définir le multiplicateur de rayon par follower
   */
  setRadiusMultiplierPerFollower(multiplier) {
    this.radiusMultiplierPerFollower = Math.max(0, multiplier);
    this.updateCalculations();
    console.log('⚡ Nouveau multiplicateur rayon/follower:', this.radiusMultiplierPerFollower);
  }

  /**
   * Calculer la force totale pour une distance donnée
   * (plus proche = plus de force)
   */
  calculateForceAtDistance(distance, maxDistance = null) {
    const effectiveMaxDistance = maxDistance || this.currentShoutRadius;
    
    if (distance >= effectiveMaxDistance) return 0;
    
    // Force inversement proportionnelle à la distance
    const normalizedDistance = distance / effectiveMaxDistance;
    const forceRatio = 1 - normalizedDistance; // 1 au centre, 0 au bord
    
    return this.currentShoutForce * forceRatio;
  }

  /**
   * Calculer l'efficacité du cri basé sur la distance
   */
  calculateShoutEfficiency(targetDistance) {
    if (targetDistance >= this.currentShoutRadius) return 0;
    
    const efficiency = 1 - (targetDistance / this.currentShoutRadius);
    return Math.max(0, Math.min(1, efficiency));
  }

  /**
   * Obtenir des statistiques complètes sur les forces
   */
  getForceStats() {
    const followerCount = this.player.followerManager ? 
      this.player.followerManager.getFollowerCount() : 0;
    
    return {
      followers: followerCount,
      baseForce: this.baseShoutForce,
      currentForce: this.currentShoutForce,
      forceBonus: this.currentShoutForce - this.baseShoutForce,
      baseRadius: this.baseShoutRadius,
      currentRadius: this.currentShoutRadius,
      radiusBonus: this.currentShoutRadius - this.baseShoutRadius,
      forceMultiplier: this.forceMultiplierPerFollower,
      radiusMultiplier: this.radiusMultiplierPerFollower
    };
  }

  /**
   * Prédire les stats avec un nombre de followers donné
   */
  predictStatsWithFollowers(followerCount) {
    const force = this.baseShoutForce * (1 + (followerCount * this.forceMultiplierPerFollower));
    const radius = this.baseShoutRadius * (1 + (followerCount * this.radiusMultiplierPerFollower));
    
    return {
      followers: followerCount,
      predictedForce: force,
      predictedRadius: radius,
      forceGain: force - this.baseShoutForce,
      radiusGain: radius - this.baseShoutRadius
    };
  }

  /**
   * Mettre à jour (appelé chaque frame si nécessaire)
   */
  update(delta) {
    // Mettre à jour les calculs si le nombre de followers a changé
    if (this.player.followerManager) {
      const currentFollowerCount = this.player.followerManager.getFollowerCount();
      
      // Vérifier si on a besoin de recalculer
      if (this.lastFollowerCount !== currentFollowerCount) {
        this.updateCalculations();
        this.lastFollowerCount = currentFollowerCount;
      }
    }
  }

  /**
   * Nettoyer
   */
  destroy() {
    console.log('🚮 PlayerForceCalculator détruit');
  }
} 