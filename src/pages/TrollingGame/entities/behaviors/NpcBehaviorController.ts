import { AvoidanceBehavior } from './AvoidanceBehavior';

export class NpcBehaviorController {
  entity: any;
  wanderRadius: number;
  wanderSpeed: number;
  followSpeed: number;
  fleeSpeed: number;
  trembleIntensity: number;
  avoidanceBehavior: AvoidanceBehavior;
  wanderTarget: { x: number; y: number } | null;
  wanderTimer: number;
  wanderDelay: number;
  spawnPosition: { x: number; y: number };

  constructor(entity: any, config: Record<string, any> = {}) {
    this.entity = entity;

    this.wanderRadius = config.wanderRadius || 100;
    this.wanderSpeed = config.wanderSpeed || 20;
    this.followSpeed = config.followSpeed || 40;
    this.fleeSpeed = config.fleeSpeed || 60;
    this.trembleIntensity = config.trembleIntensity || 2;

    this.avoidanceBehavior = new AvoidanceBehavior(entity, {
      exclusionRadius: 80,
      maxAvoidanceForce: 180,
      avoidanceStrength: 1.0,
      followingBonus: 1.4,
    });

    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.wanderDelay = 2000 + Math.random() * 3000;

    this.spawnPosition = {
      x: entity.sprite.x,
      y: entity.sprite.y,
    };
  }

  computeMovementIntent(delta: number): {
    desiredDirection: { x: number; y: number };
    context: Record<string, any>;
  } {
    const state = this.entity.state;
    const player = this.getPlayer();
    const intent: {
      desiredDirection: { x: number; y: number };
      context: Record<string, any>;
    } = { desiredDirection: { x: 0, y: 0 }, context: {} };

    switch (state) {
      case 'following': {
        if (!player) return intent;
        const trailTarget = player.getFollowTargetPosition(this.entity);
        if (!trailTarget) return intent;
        const dx = trailTarget.x - this.entity.sprite.x;
        const dy = trailTarget.y - this.entity.sprite.y;
        const dist = Math.hypot(dx, dy);
        intent.desiredDirection =
          dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
        intent.context.nearFollowTarget = dist < 20;
        break;
      }
      case 'fleeing': {
        if (!player) return intent;
        const dx = this.entity.sprite.x - player.sprite.x;
        const dy = this.entity.sprite.y - player.sprite.y;
        const dist = Math.hypot(dx, dy);
        intent.desiredDirection =
          dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
        break;
      }
      case 'migrating':
      case 'organism_migrating': {
        const vel =
          this.entity.migrationController?.getVelocity?.() ||
          this.entity.movementController.getVelocity();
        const mag = Math.hypot(vel.x, vel.y);
        intent.desiredDirection =
          mag > 0 ? { x: vel.x / mag, y: vel.y / mag } : { x: 0, y: 0 };
        break;
      }
      case 'normal':
      case 'trembling':
      default:
        intent.desiredDirection = { x: 0, y: 0 };
    }

    return intent;
  }

  computeModifiers(): Array<{ x: number; y: number }> {
    const mods: Array<{ x: number; y: number }> = [];
    const avoid = this.avoidanceBehavior?.calculate?.() || { x: 0, y: 0 };
    const maxAvoid = 80;
    const mag = Math.hypot(avoid.x, avoid.y);
    if (mag > 0) {
      const scale = Math.min(1, maxAvoid / mag);
      mods.push({ x: avoid.x * scale, y: avoid.y * scale });
    }
    return mods;
  }

  update(delta: number): void {
    if (!this.entity || !this.entity.sprite) return;

    switch (this.entity.state) {
      case 'normal':
        this.entity.velocity.x = 0;
        this.entity.velocity.y = 0;
        break;
      case 'following':
        this.updateFollow(delta);
        break;
      case 'trembling':
        this.updateTremble(delta);
        break;
      case 'fleeing':
        this.updateFlee(delta);
        break;
    }
  }

  updateFollow(delta: number): void {
    const player = this.getPlayer();
    if (!player) return;

    const trailTarget = player.getFollowTargetPosition(this.entity);

    if (!trailTarget) {
      console.error(
        `🚨 NpcBehaviorController: NPC ${this.entity.groupId || this.entity.id} n'a PAS reçu de point de trail !`
      );
      return;
    }

    const target = { x: trailTarget.x, y: trailTarget.y };

    const followSpeed = this.entity.speed * 1.2;
    const velocity = this.moveTowards(target, followSpeed);
    this.entity.velocity.x = velocity.x;
    this.entity.velocity.y = velocity.y;
  }

  updateTremble(_delta: number): void {
    const trembleX = (Math.random() - 0.5) * this.trembleIntensity;
    const trembleY = (Math.random() - 0.5) * this.trembleIntensity;

    this.entity.velocity.x = trembleX;
    this.entity.velocity.y = trembleY;
  }

  updateFlee(_delta: number): void {
    const player = this.getPlayer();
    if (!player) return;

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const fleeTarget = {
        x: this.entity.sprite.x + (dx / distance) * 100,
        y: this.entity.sprite.y + (dy / distance) * 100,
      };

      const fleeSpeed = this.entity.speed * 1.0;
      const velocity = this.moveTowards(fleeTarget, fleeSpeed);
      this.entity.velocity.x = velocity.x;
      this.entity.velocity.y = velocity.y;
    }
  }

  pickNewWanderTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.wanderRadius;

    this.wanderTarget = {
      x: this.spawnPosition.x + Math.cos(angle) * distance,
      y: this.spawnPosition.y + Math.sin(angle) * distance,
    };
  }

  moveTowards(
    target: { x: number; y: number },
    speed: number
  ): { x: number; y: number } {
    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5.0) {
      return { x: 0, y: 0 };
    }

    if (distance > 0) {
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      const force = Math.min(distance / 20, 1.0);

      return {
        x: normalizedX * speed * force,
        y: normalizedY * speed * force,
      };
    }

    return { x: 0, y: 0 };
  }

  moveTowardsConstant(
    target: { x: number; y: number },
    speed: number
  ): { x: number; y: number } {
    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 3.0) {
      return { x: 0, y: 0 };
    }

    if (distance > 0) {
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;

      return {
        x: normalizedX * speed,
        y: normalizedY * speed,
      };
    }

    return { x: 0, y: 0 };
  }

  isCloseToTarget(
    target: { x: number; y: number } | null,
    threshold: number
  ): boolean {
    if (!target) return false;

    const dx = this.entity.sprite.x - target.x;
    const dy = this.entity.sprite.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < threshold;
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

  setSpawnPosition(x: number, y: number): void {
    this.spawnPosition.x = x;
    this.spawnPosition.y = y;
  }

  calculateVelocity(delta: number): { x: number; y: number } {
    if (!this.entity || !this.entity.sprite) return { x: 0, y: 0 };

    if (this.entity.shoutBehavior && this.entity.shoutBehavior.isScreaming) {
      return { x: 0, y: 0 };
    }

    const primaryMovement = this.calculatePrimaryMovement(delta);
    const secondaryBehaviors = this.calculateSecondaryBehaviors(delta);

    return this.blendBehaviors(primaryMovement, secondaryBehaviors);
  }

  calculatePrimaryMovement(delta: number): { x: number; y: number } {
    switch (this.entity.state) {
      case 'normal':
        return this.calculateWanderVelocity(delta);
      case 'following':
        return this.calculateFollowVelocity(delta);
      case 'trembling':
        return this.calculateTrembleVelocity(delta);
      case 'fleeing':
        return this.calculateFleeVelocity(delta);
      default:
        return { x: 0, y: 0 };
    }
  }

  calculateSecondaryBehaviors(delta: number): {
    avoidance: { x: number; y: number };
  } {
    const avoidance = this.avoidanceBehavior.calculate();

    return {
      avoidance: avoidance,
    };
  }

  blendBehaviors(
    primary: { x: number; y: number },
    secondary: { avoidance: { x: number; y: number } }
  ): { x: number; y: number } {
    if (this.entity.state === 'normal') {
      return secondary.avoidance;
    }

    if (this.entity.state === 'following') {
      return this.blendFollowWithAvoidance(primary, secondary.avoidance);
    }

    const avoidanceWeight =
      this.avoidanceBehavior.calculateSafeAvoidanceWeight();

    return {
      x:
        primary.x * (1 - avoidanceWeight) +
        secondary.avoidance.x * avoidanceWeight,
      y:
        primary.y * (1 - avoidanceWeight) +
        secondary.avoidance.y * avoidanceWeight,
    };
  }

  blendFollowWithAvoidance(
    followMovement: { x: number; y: number },
    avoidanceForce: { x: number; y: number }
  ): { x: number; y: number } {
    const followSpeed = Math.sqrt(
      followMovement.x ** 2 + followMovement.y ** 2
    );

    if (followSpeed < 0.1) {
      return avoidanceForce;
    }

    const avoidanceWeight =
      this.avoidanceBehavior.calculateSafeAvoidanceWeight();

    const blendedX =
      followMovement.x * (1 - avoidanceWeight) +
      avoidanceForce.x * avoidanceWeight;
    const blendedY =
      followMovement.y * (1 - avoidanceWeight) +
      avoidanceForce.y * avoidanceWeight;

    const blendedMagnitude = Math.sqrt(blendedX ** 2 + blendedY ** 2);

    if (blendedMagnitude < 0.1) {
      return followMovement;
    }

    const directionX = blendedX / blendedMagnitude;
    const directionY = blendedY / blendedMagnitude;

    return {
      x: directionX * followSpeed,
      y: directionY * followSpeed,
    };
  }

  calculateWanderVelocity(_delta: number): { x: number; y: number } {
    return { x: 0, y: 0 };
  }

  calculateFollowVelocity(_delta: number): { x: number; y: number } {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };

    if (this.entity.isAtRest && this.entity.isAtRest()) {
      return { x: 0, y: 0 };
    }

    const trailTarget = player.getFollowTargetPosition(this.entity);

    if (!trailTarget) {
      return { x: 0, y: 0 };
    }

    const target = { x: trailTarget.x, y: trailTarget.y };

    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

    if (distanceToTarget < 20) {
      return { x: 0, y: 0 };
    }

    const followSpeed = this.entity.speed * 1.2;

    return this.moveTowardsConstant(target, followSpeed);
  }

  calculateTrembleVelocity(_delta: number): { x: number; y: number } {
    const trembleX = (Math.random() - 0.5) * this.trembleIntensity;
    const trembleY = (Math.random() - 0.5) * this.trembleIntensity;

    return { x: trembleX, y: trembleY };
  }

  calculateFleeVelocity(_delta: number): { x: number; y: number } {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      const fleeTarget = {
        x: this.entity.sprite.x + (dx / distance) * 100,
        y: this.entity.sprite.y + (dy / distance) * 100,
      };

      const fleeSpeed = this.entity.speed * 1.0;
      return this.moveTowardsConstant(fleeTarget, fleeSpeed);
    }

    return { x: 0, y: 0 };
  }
}
