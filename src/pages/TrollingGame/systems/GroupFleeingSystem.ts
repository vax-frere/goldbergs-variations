import Phaser from 'phaser';

/**
 * 🎯 SOLID: GroupFleeingSystem
 *
 * Responsabilité unique : Détecter quand déclencher la fuite de groupe des NPCs
 */
export class GroupFleeingSystem {
  scene: any;
  entityManager: any;
  config: {
    triggerThreshold: number;
    checkInterval: number;
    fleeRange: number;
    minNpcsForFlee: number;
  } = {
    triggerThreshold: 8,
    checkInterval: 500,
    fleeRange: 300,
    minNpcsForFlee: 1,
  };
  lastCheckTime: number = 0;
  isGroupFleeingActive: boolean = false;
  affectedNpcs: Set<any> = new Set();

  constructor(scene: any, entityManager: any) {
    this.scene = scene;
    this.entityManager = entityManager;

    console.log('👥 GroupFleeingSystem créé - Seuil:', this.config.triggerThreshold, 'NPCs non-followers, Range:', this.config.fleeRange, 'px');
  }

  update(time: number, delta: number): void {
    if (time - this.lastCheckTime < this.config.checkInterval) {
      return;
    }

    this.lastCheckTime = time;

    this.evaluateGroupFleeingConditions();
  }

  evaluateGroupFleeingConditions(): void {
    const player = this.getPlayer();
    if (!player) return;

    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);
    const shouldTriggerFlee = this.shouldTriggerGroupFleeing(nonFollowerNpcs);

    if (shouldTriggerFlee) {
      this.maintainGroupFleeing(nonFollowerNpcs, player);
      if (!this.isGroupFleeingActive) {
        this.isGroupFleeingActive = true;
        console.log(`👥 🏃 FUITE CONSTANTE activée ! ${nonFollowerNpcs.length} NPCs en fuite permanente`);
      }
    } else if (this.isGroupFleeingActive) {
      this.stopGroupFleeing();
    }
  }

  shouldTriggerGroupFleeing(nonFollowerNpcs: any[]): boolean {
    return nonFollowerNpcs.length <= this.config.triggerThreshold &&
      nonFollowerNpcs.length >= this.config.minNpcsForFlee;
  }

  triggerGroupFleeing(nonFollowerNpcs: any[], player: any): void {
    console.log(`👥 🏃 FUITE DE GROUPE déclenchée ! ${nonFollowerNpcs.length} NPCs vont fuir`);

    this.isGroupFleeingActive = true;

    nonFollowerNpcs.forEach((npc: any) => {
      if (this.isNpcInFleeRange(npc, player)) {
        this.makeNpcFleeFromGroup(npc, player);
      }
    });
  }

  maintainGroupFleeing(nonFollowerNpcs: any[], player: any): void {
    nonFollowerNpcs.forEach((npc: any) => {
      if (this.isNpcInFleeRange(npc, player)) {
        this.ensureNpcIsFleeing(npc, player);
      }
    });
  }

  ensureNpcIsFleeing(npc: any, player: any): void {
    if (!npc.stateController) return;

    const currentState = npc.stateController.getState();

    if (npc.shoutBehavior && npc.shoutBehavior.isScreaming) {
      return;
    }

    if (currentState === 'trembling') {
      return;
    }

    if (currentState !== 'fleeing') {
      npc.stateController.startFleeing();
      this.affectedNpcs.add(npc);
      console.log(`👥 🔄 NPC ${npc.groupId} forcé en fuite constante (était en état: ${currentState})`);
    } else {
      if (npc.stateController.stateTimer > (npc.stateController.stateDuration - 1000)) {
        npc.stateController.stateTimer = 0;
        console.log(`👥 ♻️ NPC ${npc.groupId} fuite prolongée (maintien constant)`);
      }
    }
  }

  stopGroupFleeing(): void {
    console.log('👥 ✋ FUITE CONSTANTE terminée - Les NPCs peuvent reprendre leurs comportements normaux');

    this.isGroupFleeingActive = false;

    this.affectedNpcs.clear();
  }

  makeNpcFleeFromGroup(npc: any, player: any): void {
    if (!npc.stateController) return;

    const currentState = npc.stateController.getState();
    if (currentState === 'fleeing' ||
      (npc.shoutBehavior && npc.shoutBehavior.isScreaming)) {
      return;
    }

    npc.stateController.startFleeing();
    this.affectedNpcs.add(npc);

    console.log(`👥 🏃 NPC ${npc.groupId} fuit le groupe !`);
  }

  isNpcInFleeRange(npc: any, player: any): boolean {
    if (!npc.sprite || !player.sprite) return false;

    const distance = Phaser.Math.Distance.Between(
      npc.sprite.x, npc.sprite.y,
      player.sprite.x, player.sprite.y
    );

    return distance <= this.config.fleeRange;
  }

  getNonFollowerNpcs(allNpcs: any[]): any[] {
    return allNpcs.filter((npc: any) => {
      if (!npc.stateController) return false;

      const state = npc.stateController.getState();
      return state !== 'following';
    });
  }

  getPlayer(): any {
    return this.scene.currentLevel?.player;
  }

  getSystemStats(): any {
    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);

    return {
      totalNpcs: allNpcs.length,
      nonFollowerNpcs: nonFollowerNpcs.length,
      threshold: this.config.triggerThreshold,
      isActive: this.isGroupFleeingActive,
      affectedNpcsCount: this.affectedNpcs.size,
      shouldTrigger: this.shouldTriggerGroupFleeing(nonFollowerNpcs),
    };
  }

  updateConfig(newConfig: Record<string, any>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('👥 Configuration GroupFleeingSystem mise à jour:', this.config);
  }

  forceGroupFleeing(): boolean {
    const player = this.getPlayer();
    if (!player) return false;

    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);

    console.log(`👥 🧪 FORCE Group Fleeing - ${nonFollowerNpcs.length} NPCs non-followers`);
    this.triggerGroupFleeing(nonFollowerNpcs, player);

    return true;
  }

  forceStopGroupFleeing(): void {
    console.log('👥 🛑 FORCE Stop Group Fleeing');
    this.stopGroupFleeing();
  }

  destroy(): void {
    this.affectedNpcs.clear();
    this.isGroupFleeingActive = false;
    console.log('👥 GroupFleeingSystem détruit');
  }
}
