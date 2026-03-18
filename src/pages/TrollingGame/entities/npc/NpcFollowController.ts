/**
 * 🎯 SOLID: NpcFollowController
 * Responsabilité : Système de suivi AAA avec zone de confort
 */
export class NpcFollowController {
  npc: any;
  followState: {
    mode: string;
    lastDistanceToTarget: number | null;
    recentProgress: number[];
    comfortZone: number;
    minProgressRate: number;
    wakeUpDistance: number;
  };

  constructor(npc: any) {
    this.npc = npc;

    this.followState = {
      mode: 'MOVING',
      lastDistanceToTarget: null,
      recentProgress: [],
      comfortZone: 25,
      minProgressRate: 0.3,
      wakeUpDistance: 50,
    };

    console.log('👥 NpcFollowController créé');
  }

  resetFollowState(): void {
    this.followState.mode = 'MOVING';
    this.followState.recentProgress = [];
    this.followState.lastDistanceToTarget = null;
  }

  updateFollowState(stateController: any): void {
    if (stateController.getState() !== 'following') return;

    const followTarget = stateController.getFollowTarget();
    if (!followTarget) return;

    const trailTarget = followTarget.getFollowTargetPosition(this.npc);
    if (!trailTarget) return;

    const currentDistance = Math.sqrt(
      (trailTarget.x - this.npc.sprite.x) ** 2 +
        (trailTarget.y - this.npc.sprite.y) ** 2
    );

    let progress = 0;
    if (this.followState.lastDistanceToTarget !== null) {
      progress = this.followState.lastDistanceToTarget - currentDistance;
    }

    this.followState.recentProgress.push(progress);
    if (this.followState.recentProgress.length > 10) {
      this.followState.recentProgress.shift();
    }

    const avgProgress =
      this.followState.recentProgress.length > 0
        ? this.followState.recentProgress.reduce((a, b) => a + b, 0) /
          this.followState.recentProgress.length
        : 0;

    if (this.followState.mode === 'MOVING') {
      const inComfortZone =
        currentDistance < this.followState.comfortZone;
      const poorProgress = avgProgress < this.followState.minProgressRate;

      if (
        inComfortZone &&
        poorProgress &&
        this.followState.recentProgress.length >= 5
      ) {
        this.followState.mode = 'AT_REST';
        console.log(
          `😴 NPC ${this.npc.groupId} entre en mode repos (distance: ${currentDistance.toFixed(1)}px)`
        );
      }
    } else if (this.followState.mode === 'AT_REST') {
      const farFromComfort =
        currentDistance > this.followState.wakeUpDistance;

      if (farFromComfort) {
        this.followState.mode = 'MOVING';
        this.followState.recentProgress = [];
        console.log(
          `🏃 NPC ${this.npc.groupId} sort du repos (distance: ${currentDistance.toFixed(1)}px)`
        );
      }
    }

    this.followState.lastDistanceToTarget = currentDistance;
  }

  isAtRest(): boolean {
    return this.followState.mode === 'AT_REST';
  }

  calculateFollowingForces(delta: number): { x: number; y: number } {
    if (this.isAtRest()) {
      return { x: 0, y: 0 };
    }

    return { x: 0, y: 0 };
  }

  getFollowStats(): Record<string, any> {
    return {
      mode: this.followState.mode,
      recentProgressCount: this.followState.recentProgress.length,
      lastDistanceToTarget: this.followState.lastDistanceToTarget,
      comfortZone: this.followState.comfortZone,
      wakeUpDistance: this.followState.wakeUpDistance,
    };
  }

  configure(options: Record<string, any> = {}): void {
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
      wakeUpDistance: this.followState.wakeUpDistance,
    });
  }

  destroy(): void {
    this.followState.recentProgress = [];
    console.log('🗑️ NpcFollowController détruit');
  }
}
