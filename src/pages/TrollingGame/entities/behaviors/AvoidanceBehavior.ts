/**
 * Comportement d'évitement modulaire pour les NPCs
 * Peut être combiné avec d'autres comportements via NpcBehaviorController
 */
export class AvoidanceBehavior {
  entity: any;
  config: Record<string, number>;

  constructor(entity: any, config: Record<string, any> = {}) {
    this.entity = entity;

    this.config = {
      exclusionRadius: config.exclusionRadius || 80,
      maxAvoidanceForce: config.maxAvoidanceForce || 100,
      avoidanceStrength: config.avoidanceStrength || 1.0,
      followingBonus: config.followingBonus || 1.3,
      ...config,
    };
  }

  calculateAvoidanceForce(targetEntity: any): { x: number; y: number } {
    if (!targetEntity || !targetEntity.sprite || !this.entity.sprite) {
      return { x: 0, y: 0 };
    }

    const dx = this.entity.sprite.x - targetEntity.sprite.x;
    const dy = this.entity.sprite.y - targetEntity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.config.exclusionRadius || distance <= 0) {
      return { x: 0, y: 0 };
    }

    const avoidDirection = { x: dx / distance, y: dy / distance };

    const intensity =
      (this.config.exclusionRadius - distance) / this.config.exclusionRadius;

    let effectiveStrength = this.config.avoidanceStrength;
    if (this.entity.state === 'following') {
      effectiveStrength *= this.config.followingBonus;
    }

    const force =
      intensity * this.config.maxAvoidanceForce * effectiveStrength;

    return {
      x: avoidDirection.x * force,
      y: avoidDirection.y * force,
    };
  }

  calculate(): { x: number; y: number } {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };

    return this.calculateAvoidanceForce(player);
  }

  getPlayer(): any {
    if (
      this.entity.scene.currentLevel &&
      this.entity.scene.currentLevel.player
    ) {
      return this.entity.scene.currentLevel.player;
    }
    return null;
  }

  calculateSafeAvoidanceWeight(): number {
    if (this.entity.state !== 'following') {
      return 1.0;
    }

    const player = this.getPlayer();
    if (!player) return 0.6;

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

    if (distanceToPlayer < 50) {
      return 0.85;
    }

    if (distanceToPlayer < 70) {
      return 0.7;
    }

    if (
      this.entity.followState &&
      this.entity.followState.mode === 'AT_REST'
    ) {
      return 0.5;
    }

    return 0.6;
  }
}
