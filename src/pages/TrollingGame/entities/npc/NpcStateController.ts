/**
 * 🎯 SOLID: NpcStateController
 * Responsabilité : Gestion des états du NPC et réactions aux événements
 */
export class NpcStateController {
  npc: any;
  state: string;
  stateTimer: number;
  stateDuration: number;
  config: Record<string, any>;
  basePosition: { x: number; y: number };
  tremblingOffset: { x: number; y: number };
  tremblingIntensity: number;
  tremblingCollisionRadius: number;
  fleeDirection: { x: number; y: number };
  followTarget: any;
  _onTrembleAnimComplete: (() => void) | null;
  _onTrembleAnimEventName: string | null;

  constructor(npc: any) {
    this.npc = npc;

    this.state = 'normal';
    this.stateTimer = 0;
    this.stateDuration = 0;

    this.config = {
      fleeing: {
        minDuration: 1500,
        maxDuration: 2500,
        speedMultiplier: 0.3,
        safeDistance: 200,
      },
      trembling: {
        baseDuration: 2000,
        durationPerFollower: 50,
        baseIntensity: 1.2,
        intensityPerFollower: 0.05,
        baseCollisionRadius: 25,
        radiusPerFollower: 0.8,
      },
    };

    this.basePosition = { x: 0, y: 0 };
    this.tremblingOffset = { x: 0, y: 0 };
    this.tremblingIntensity = 3;
    this.tremblingCollisionRadius = 25;

    this.fleeDirection = { x: 0, y: 0 };
    this.followTarget = null;
    this._onTrembleAnimComplete = null;
    this._onTrembleAnimEventName = null;

    console.log('🎭 NpcStateController créé');
  }

  getState(): string {
    return this.state;
  }

  getStateTimer(): number {
    return this.stateTimer;
  }

  onShoutHit(force: number, distance: number, maxRadius: number): void {
    if (this.state === 'following') return;

    if (this.npc.shepherdMode || this.npc.canTremble === false) {
      this.startFleeing();
      return;
    }

    const player = this.getPlayer();
    const followersCount =
      player && player.followers ? player.followers.length : 0;

    const intensity = 1.0 - distance / maxRadius;
    const effectiveForce = force * intensity;

    const randomFactor = 0.7 + Math.random() * 0.6;
    const finalForce = effectiveForce * randomFactor;

    const baseTremblingChance = 0.25;
    const forceBasedChance = Math.max(0, (finalForce - 0.6) / 1.0);
    const followersBonus = Math.min(0.2, followersCount * 0.05);
    const totalTremblingChance = Math.min(
      0.9,
      baseTremblingChance + forceBasedChance + followersBonus
    );

    if (Math.random() < totalTremblingChance) {
      this.startTrembling(followersCount);
    } else {
      this.startFleeing();
    }
  }

  startFleeing(): void {
    this.state = 'fleeing';
    this.stateTimer = 0;
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }

    const config = this.config.fleeing;
    this.stateDuration =
      config.minDuration + Math.random() * (config.maxDuration - config.minDuration);

    const player = this.getPlayer();
    if (player && player.sprite) {
      const dx = this.npc.sprite.x - player.sprite.x;
      const dy = this.npc.sprite.y - player.sprite.y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      if (magnitude > 0) {
        this.fleeDirection.x = dx / magnitude;
        this.fleeDirection.y = dy / magnitude;
      } else {
        const angle = Math.random() * Math.PI * 2;
        this.fleeDirection.x = Math.cos(angle);
        this.fleeDirection.y = Math.sin(angle);
      }
    }

    console.log(`🏃 NPC ${this.npc.groupId} commence à fuir`);
  }

  startTrembling(followersCount = 0): void {
    this.state = 'trembling';
    this.stateTimer = 0;

    const config = this.config.trembling;
    this.stateDuration = Infinity;

    const intensityBonus = Math.min(3, followersCount * config.intensityPerFollower);
    this.tremblingIntensity = config.baseIntensity + intensityBonus;

    const radiusBonus = Math.min(20, followersCount * config.radiusPerFollower);
    this.tremblingCollisionRadius = config.baseCollisionRadius + radiusBonus;

    this.basePosition.x = this.npc.sprite.x;
    this.basePosition.y = this.npc.sprite.y;

    if (this.npc.animationBehavior && this.npc.animationBehavior.setForcedAnimation) {
      this.npc.animationBehavior.setForcedAnimation('headholdinpain');
      try {
        const facing = this.npc.animationBehavior.facing || 'down';
        const key = `headholdinpain-${facing}`;
        const ev = `animationcomplete-${key}`;
        if (this._onTrembleAnimComplete) {
          try {
            this.npc.sprite.off(
              this._onTrembleAnimEventName || 'animationcomplete',
              this._onTrembleAnimComplete
            );
          } catch (_) {}
        }
        this._onTrembleAnimEventName = ev;
        this._onTrembleAnimComplete = () => {
          if (this.npc?.sprite) {
            this.npc.sprite.setOrigin(0.5, 0.5);
          }
          this.returnToNormal();
          try {
            this.npc?.sprite?.off(ev, this._onTrembleAnimComplete!);
          } catch (_) {}
          this._onTrembleAnimComplete = null;
          this._onTrembleAnimEventName = null;
        };
        this.npc.sprite.once(ev, this._onTrembleAnimComplete);
      } catch (_) {}
    }

    console.log(
      `😰 NPC ${this.npc.groupId} commence à trembler (intensité: ${this.tremblingIntensity.toFixed(1)})`
    );
  }

  startFollowing(player: any): void {
    if (this.npc.shepherdMode || this.npc.canFollow === false) {
      console.log('🚫 NPC Shepherd refuse de suivre le joueur');
      return;
    }

    this.state = 'following';
    this.followTarget = player;
    this.stateTimer = 0;
    this.stateDuration = Infinity;
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }

    console.log(`👥 NPC ${this.npc.groupId} commence à suivre le joueur`);
  }

  setState(newState: string, duration = 0): void {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.stateDuration = duration;
    if (
      newState !== 'trembling' &&
      this.npc.animationBehavior &&
      this.npc.animationBehavior.clearForcedAnimation
    ) {
      this.npc.animationBehavior.clearForcedAnimation();
    }

    console.log(`🔄 NPC ${this.npc.groupId}: ${oldState} → ${newState}`);
  }

  returnToNormal(): void {
    this.state = 'normal';
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.followTarget = null;

    if (this.npc.sprite) {
      this.npc.sprite.setOrigin(0.5, 0.5);
    }
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }

    console.log(`✅ NPC ${this.npc.groupId} retourne à l'état normal`);
  }

  updateStateLogic(delta: number): void {
    if (this.state === 'normal') return;

    this.stateTimer += delta;

    switch (this.state) {
      case 'trembling':
        this.updateTremblingLogic(delta);
        break;

      case 'fleeing':
        if (
          this.stateTimer >= this.stateDuration ||
          this.hasReachedSafeDistance()
        ) {
          this.returnToNormal();
        }
        break;

      case 'following':
        break;
    }
  }

  hasReachedSafeDistance(): boolean {
    const cfg = this.config.fleeing || {};
    const safe = cfg.safeDistance || 200;
    const player = this.getPlayer();
    if (!player || !player.sprite) return false;
    const dx = this.npc.sprite.x - player.sprite.x;
    const dy = this.npc.sprite.y - player.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist >= safe;
  }

  updateTremblingLogic(delta: number): void {
    this.tremblingOffset.x = (Math.random() - 0.5) * this.tremblingIntensity;
    this.tremblingOffset.y = (Math.random() - 0.5) * this.tremblingIntensity;

    this.npc.sprite.x = this.basePosition.x;
    this.npc.sprite.y = this.basePosition.y;

    const baseOriginX = 0.5;
    const baseOriginY = 0.5;
    const offsetFactorX =
      this.tremblingOffset.x / (this.npc.sprite.displayWidth || 64);
    const offsetFactorY =
      this.tremblingOffset.y / (this.npc.sprite.displayHeight || 64);

    this.npc.sprite.setOrigin(
      baseOriginX - offsetFactorX,
      baseOriginY - offsetFactorY
    );
  }

  getFleeingData(): { direction: { x: number; y: number }; speedMultiplier: number } {
    return {
      direction: this.fleeDirection,
      speedMultiplier: this.config.fleeing.speedMultiplier,
    };
  }

  getFollowTarget(): any {
    return this.followTarget;
  }

  getTremblingCollisionRadius(): number {
    return this.tremblingCollisionRadius;
  }

  getPlayer(): any {
    if (this.npc.scene.currentLevel && this.npc.scene.currentLevel.player) {
      return this.npc.scene.currentLevel.player;
    }
    return null;
  }

  destroy(): void {
    this.followTarget = null;
    if (this._onTrembleAnimComplete) {
      const ev = this._onTrembleAnimEventName || 'animationcomplete';
      try {
        this.npc?.sprite?.off(ev, this._onTrembleAnimComplete);
      } catch (_) {}
      this._onTrembleAnimComplete = null;
      this._onTrembleAnimEventName = null;
    }
    console.log('🗑️ NpcStateController détruit');
  }
}
