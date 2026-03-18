import type { FootstepData, FootstepsConfig } from '../types/types';

export class FootstepsSystem {
  soundManager: any;
  entityFootstepsData: Map<string, FootstepData> = new Map();
  soundPool: {
    maxConcurrent: number;
    activeSounds: any[];
    globalCooldown: number;
    lastGlobalStep: number;
  } = {
    maxConcurrent: 2,
    activeSounds: [],
    globalCooldown: 200,
    lastGlobalStep: 0,
  };
  config: FootstepsConfig = {
    playerBaseStepInterval: 550,
    playerRandomVariation: 0.15,
    npcBaseStepInterval: 550,
    npcRandomVariation: 0.15,
    spatialClusterRadius: 400,
    maxPerCluster: 3,
  };

  constructor(soundManager: any) {
    this.soundManager = soundManager;
  }

  initializeEntityFootsteps(entityId: string, isPlayer: boolean = false): void {
    if (!this.entityFootstepsData.has(entityId)) {
      this.entityFootstepsData.set(entityId, {
        lastStepTime: Date.now() + Math.random() * 1000,
        personalRhythm: isPlayer ? 1.0 : (0.8 + Math.random() * 0.4),
        isMoving: false,
        isPlayer: isPlayer,
      });
    }
  }

  updatePlayerFootsteps(player: any, delta: number): void {
    const currentTime = Date.now();

    if (!player.animationBehavior) {
      console.warn('Player sans animationBehavior - FootstepsSystem désactivé');
      return;
    }

    const isMoving = player.animationBehavior.isMoving;
    const playerId = player.id || 'player';

    this.initializeEntityFootsteps(playerId, true);
    const footstepData = this.entityFootstepsData.get(playerId)!;

    if (isMoving !== footstepData.isMoving) {
      footstepData.isMoving = isMoving;
      if (isMoving) {
        if (currentTime - this.soundPool.lastGlobalStep >= this.soundPool.globalCooldown) {
          this.playUnifiedFootstep(player, currentTime);
          footstepData.lastStepTime = currentTime;
        }
      }
      return;
    }

    if (!isMoving) return;

    if (currentTime - this.soundPool.lastGlobalStep < this.soundPool.globalCooldown) {
      return;
    }

    const realVelocity = player.sprite.body ? {
      x: player.sprite.body.velocity.x,
      y: player.sprite.body.velocity.y,
    } : { x: 0, y: 0 };

    const speed = Math.sqrt(realVelocity.x ** 2 + realVelocity.y ** 2);
    const speedFactor = Math.max(0.4, Math.min(1.8, speed / player.speed));
    const personalInterval = this.config.playerBaseStepInterval / speedFactor * footstepData.personalRhythm;

    const randomVariation = 1 + (Math.random() - 0.5) * this.config.playerRandomVariation;
    const finalInterval = personalInterval * randomVariation;

    if (currentTime - footstepData.lastStepTime >= finalInterval) {
      this.playUnifiedFootstep(player, currentTime);
      footstepData.lastStepTime = currentTime;
    }
  }

  updateNpcFootsteps(npcs: any[]): void {
    const currentTime = Date.now();

    this.cleanupSoundPool();

    const clusters = this.createSpatialClusters(npcs);

    for (const cluster of clusters) {
      this.processClusterFootsteps(cluster, currentTime);
    }
  }

  createSpatialClusters(npcs: any[]): any[] {
    const clusters: any[] = [];
    const processed = new Set<string | number>();

    for (const npc of npcs) {
      if (processed.has(npc.id)) continue;

      const cluster: any = {
        center: { x: npc.sprite.x, y: npc.sprite.y },
        npcs: [npc],
        activeSounds: 0,
      };
      cluster.id = `cluster-${clusters.length}`;

      for (const otherNpc of npcs) {
        if (otherNpc.id === npc.id || processed.has(otherNpc.id)) continue;

        const distance = Math.sqrt(
          (npc.sprite.x - otherNpc.sprite.x) ** 2 +
          (npc.sprite.y - otherNpc.sprite.y) ** 2
        );

        if (distance <= this.config.spatialClusterRadius) {
          cluster.npcs.push(otherNpc);
          processed.add(otherNpc.id);
        }
      }

      processed.add(npc.id);
      clusters.push(cluster);
    }

    return clusters;
  }

  processClusterFootsteps(cluster: any, currentTime: number): void {
    const movingNpcs = cluster.npcs.filter((npc: any) => {
      return npc.animationBehavior && npc.animationBehavior.isMoving;
    });

    if (movingNpcs.length === 0) return;

    if (currentTime - this.soundPool.lastGlobalStep < this.soundPool.globalCooldown) {
      return;
    }

    const activeSoundsInCluster = this.soundPool.activeSounds.filter((sound: any) =>
      sound.clusterId === cluster.id
    ).length;

    if (activeSoundsInCluster >= this.config.maxPerCluster) return;

    const candidateNpcs: Array<{ npc: any; priority: number; interval: number }> = [];

    for (const npc of movingNpcs) {
      const npcId = npc.id || `npc-${npc.groupId}`;
      this.initializeEntityFootsteps(npcId, false);
      const footstepData = this.entityFootstepsData.get(npcId)!;

      const realVelocity = npc.sprite.body ? {
        x: npc.sprite.body.velocity.x,
        y: npc.sprite.body.velocity.y,
      } : { x: 0, y: 0 };

      const speed = Math.sqrt(realVelocity.x ** 2 + realVelocity.y ** 2);
      const speedFactor = Math.max(0.5, Math.min(2.0, speed / 50));
      const personalInterval = this.config.npcBaseStepInterval / speedFactor * footstepData.personalRhythm;

      const randomVariation = 1 + (Math.random() - 0.5) * this.config.npcRandomVariation;
      const finalInterval = personalInterval * randomVariation;

      if (currentTime - footstepData.lastStepTime >= finalInterval) {
        candidateNpcs.push({
          npc,
          priority: currentTime - footstepData.lastStepTime,
          interval: finalInterval,
        });
      }
    }

    if (candidateNpcs.length === 0) return;

    candidateNpcs.sort((a, b) => b.priority - a.priority);

    const chosen = candidateNpcs[0];
    this.playUnifiedFootstep(chosen.npc, currentTime, cluster);
  }

  playUnifiedFootstep(entity: any, currentTime: number, cluster: any = null): any {
    if (this.soundPool.activeSounds.length >= this.soundPool.maxConcurrent) {
      return;
    }

    const sound = this.soundManager.playRandomFootstep();
    if (sound) {
      sound.entityId = entity.id || (entity.entityType === 'player' ? 'player' : `npc-${entity.groupId}`);
      sound.entityType = entity.entityType;
      sound.clusterId = cluster?.id || null;
      sound.playTime = currentTime;

      this.soundPool.activeSounds.push(sound);
      this.soundPool.lastGlobalStep = currentTime;

      const entityId = sound.entityId;
      const footstepData = this.entityFootstepsData.get(entityId);
      if (footstepData) {
        footstepData.lastStepTime = currentTime;
      }

      sound.once('complete', () => {
        this.removeFromPool(sound);
      });

      return sound;
    }
  }

  cleanupSoundPool(): void {
    this.soundPool.activeSounds = this.soundPool.activeSounds.filter((sound: any) => {
      return sound.isPlaying;
    });
  }

  removeFromPool(sound: any): void {
    const index = this.soundPool.activeSounds.indexOf(sound);
    if (index > -1) {
      this.soundPool.activeSounds.splice(index, 1);
    }
  }

  setPlayerStepInterval(interval: number): void {
    this.config.playerBaseStepInterval = Math.max(200, interval);
  }

  setNpcMaxConcurrent(max: number): void {
    this.soundPool.maxConcurrent = Math.max(1, Math.min(12, max));
  }

  setAAASoundConfig(config: Partial<FootstepsConfig>): void {
    Object.assign(this.config, config);
  }

  destroy(): void {
    this.soundPool.activeSounds.forEach((sound: any) => sound.stop());
    this.soundPool.activeSounds = [];
    this.entityFootstepsData.clear();
  }
}
