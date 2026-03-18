/**
 * 🎯 SOLID REFACTOR: PlayerForceCalculator
 * Responsabilité unique : Calculer les forces et rayons dynamiques du joueur
 */
export class PlayerForceCalculator {
  player: any;
  baseShoutForce: number;
  baseShoutRadius: number;
  currentShoutForce: number;
  currentShoutRadius: number;
  forceMultiplierPerFollower: number;
  radiusMultiplierPerFollower: number;
  tremblingRadiusMultiplierPerFollower: number;
  lastFollowerCount?: number;

  constructor(player: any) {
    this.player = player;

    this.baseShoutForce = 1.0;
    this.baseShoutRadius = 125;

    this.currentShoutForce = this.baseShoutForce;
    this.currentShoutRadius = this.baseShoutRadius;

    this.forceMultiplierPerFollower = 0.1;
    this.radiusMultiplierPerFollower = 0.025;
    this.tremblingRadiusMultiplierPerFollower = 0.01;

    console.log('⚡ PlayerForceCalculator initialisé - force:', this.baseShoutForce, 'rayon:', this.baseShoutRadius);
  }

  calculateShoutForce(followerCount = 0): number {
    const multiplier = 1 + followerCount * this.forceMultiplierPerFollower;
    this.currentShoutForce = this.baseShoutForce * multiplier;

    return this.currentShoutForce;
  }

  calculateShoutRadius(followerCount = 0): number {
    const multiplier = 1 + followerCount * this.radiusMultiplierPerFollower;
    this.currentShoutRadius = this.baseShoutRadius * multiplier;

    return this.currentShoutRadius;
  }

  calculateTremblingRadius(baseRadius: number, followerCount = 0): number {
    const multiplier = 1 + followerCount * this.tremblingRadiusMultiplierPerFollower;
    return baseRadius * multiplier;
  }

  updateCalculations(): void {
    const followerCount = this.player.followerManager
      ? this.player.followerManager.getFollowerCount()
      : 0;

    this.calculateShoutForce(followerCount);
    this.calculateShoutRadius(followerCount);

    console.log(
      `⚡ Forces mises à jour - followers: ${followerCount}, force: ${this.currentShoutForce.toFixed(2)}, rayon: ${this.currentShoutRadius.toFixed(1)}`
    );
  }

  getCurrentShoutForce(): number {
    return this.currentShoutForce;
  }

  getCurrentShoutRadius(): number {
    return this.currentShoutRadius;
  }

  getBaseShoutForce(): number {
    return this.baseShoutForce;
  }

  getBaseShoutRadius(): number {
    return this.baseShoutRadius;
  }

  setBaseShoutForce(force: number): void {
    this.baseShoutForce = Math.max(0.1, force);
    this.updateCalculations();
    console.log('⚡ Nouvelle force de base:', this.baseShoutForce);
  }

  setBaseShoutRadius(radius: number): void {
    this.baseShoutRadius = Math.max(10, radius);
    this.updateCalculations();
    console.log('⚡ Nouveau rayon de base:', this.baseShoutRadius);
  }

  setForceMultiplierPerFollower(multiplier: number): void {
    this.forceMultiplierPerFollower = Math.max(0, multiplier);
    this.updateCalculations();
    console.log('⚡ Nouveau multiplicateur force/follower:', this.forceMultiplierPerFollower);
  }

  setRadiusMultiplierPerFollower(multiplier: number): void {
    this.radiusMultiplierPerFollower = Math.max(0, multiplier);
    this.updateCalculations();
    console.log('⚡ Nouveau multiplicateur rayon/follower:', this.radiusMultiplierPerFollower);
  }

  calculateForceAtDistance(distance: number, maxDistance: number | null = null): number {
    const effectiveMaxDistance = maxDistance || this.currentShoutRadius;

    if (distance >= effectiveMaxDistance) return 0;

    const normalizedDistance = distance / effectiveMaxDistance;
    const forceRatio = 1 - normalizedDistance;

    return this.currentShoutForce * forceRatio;
  }

  calculateShoutEfficiency(targetDistance: number): number {
    if (targetDistance >= this.currentShoutRadius) return 0;

    const efficiency = 1 - targetDistance / this.currentShoutRadius;
    return Math.max(0, Math.min(1, efficiency));
  }

  getForceStats(): Record<string, number> {
    const followerCount = this.player.followerManager
      ? this.player.followerManager.getFollowerCount()
      : 0;

    return {
      followers: followerCount,
      baseForce: this.baseShoutForce,
      currentForce: this.currentShoutForce,
      forceBonus: this.currentShoutForce - this.baseShoutForce,
      baseRadius: this.baseShoutRadius,
      currentRadius: this.currentShoutRadius,
      radiusBonus: this.currentShoutRadius - this.baseShoutRadius,
      forceMultiplier: this.forceMultiplierPerFollower,
      radiusMultiplier: this.radiusMultiplierPerFollower,
    };
  }

  predictStatsWithFollowers(followerCount: number): Record<string, number> {
    const force = this.baseShoutForce * (1 + followerCount * this.forceMultiplierPerFollower);
    const radius = this.baseShoutRadius * (1 + followerCount * this.radiusMultiplierPerFollower);

    return {
      followers: followerCount,
      predictedForce: force,
      predictedRadius: radius,
      forceGain: force - this.baseShoutForce,
      radiusGain: radius - this.baseShoutRadius,
    };
  }

  update(delta: number): void {
    if (this.player.followerManager) {
      const currentFollowerCount = this.player.followerManager.getFollowerCount();

      if (this.lastFollowerCount !== currentFollowerCount) {
        this.updateCalculations();
        this.lastFollowerCount = currentFollowerCount;
      }
    }
  }

  destroy(): void {
    console.log('🚮 PlayerForceCalculator détruit');
  }
}
