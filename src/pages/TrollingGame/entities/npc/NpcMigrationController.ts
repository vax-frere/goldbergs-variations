/**
 * 🎯 SOLID: NpcMigrationController
 * Responsabilité : Gestion de toutes les migrations (normale + organisme)
 */
export class NpcMigrationController {
  npc: any;
  targetPosition: { x: number; y: number } | null;
  migrationSpeed: number;
  migrationTolerance: number;
  organicVelocity: { x: number; y: number } | null;
  oscillation: { frequency: number; phase: number; amplitude: number };

  constructor(npc: any) {
    this.npc = npc;

    this.targetPosition = null;
    this.migrationSpeed = 120;
    this.migrationTolerance = 15;

    this.organicVelocity = null;
    this.oscillation = {
      frequency: 1,
      phase: 0,
      amplitude: 0,
    };

    console.log('🚚 NpcMigrationController créé');
  }

  startMigration(targetPos: { x: number; y: number }, stateController: any): void {
    this.targetPosition = { x: targetPos.x, y: targetPos.y };
    stateController.setState('migrating');

    console.log(
      `🚚 NPC ${this.npc.groupId} commence migration vers (${targetPos.x}, ${targetPos.y})`
    );
  }

  startOrganismMigration(
    targetPos: { x: number; y: number },
    organicVelocity: any,
    stateController: any
  ): void {
    this.targetPosition = { x: targetPos.x, y: targetPos.y };
    this.organicVelocity = organicVelocity;

    this.oscillation = organicVelocity.oscillation || {
      frequency: 1,
      phase: 0,
      amplitude: 0,
    };

    stateController.setState('organism_migrating');

    console.log(
      `🌊 NPC ${this.npc.groupId} commence migration d'organisme avec vélocité (${organicVelocity.x.toFixed(1)}, ${organicVelocity.y.toFixed(1)})`
    );
  }

  updateMigration(
    movementController: any,
    stateController: any,
    delta: number
  ): void {
    if (!this.targetPosition || !this.npc.sprite) return;

    if (this.npc.shoutBehavior && this.npc.shoutBehavior.isScreaming) {
      movementController.setVelocity({ x: 0, y: 0 });
      return;
    }

    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;

    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.migrationTolerance) {
      this.onMigrationComplete(stateController);
      return;
    }

    const dirX = dx / distance;
    const dirY = dy / distance;

    const migrationVelocity = {
      x: dirX * this.migrationSpeed,
      y: dirY * this.migrationSpeed,
    };

    movementController.setVelocity(migrationVelocity);
  }

  updateOrganismMigration(
    movementController: any,
    stateController: any,
    delta: number
  ): void {
    if (!this.targetPosition || !this.npc.sprite || !this.organicVelocity) return;

    if (this.npc.shoutBehavior && this.npc.shoutBehavior.isScreaming) {
      movementController.setVelocity({ x: 0, y: 0 });
      return;
    }

    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;

    const distance = Math.sqrt(
      (targetX - currentX) ** 2 + (targetY - currentY) ** 2
    );

    let finalVelocity: { x: number; y: number };

    if (distance <= 50) {
      const dirX = (targetX - currentX) / distance;
      const dirY = (targetY - currentY) / distance;
      const precisionSpeed = Math.min(this.migrationSpeed * 0.3, distance * 2);

      finalVelocity = {
        x: dirX * precisionSpeed,
        y: dirY * precisionSpeed,
      };

      if (distance <= this.migrationTolerance) {
        this.onOrganismMigrationComplete(stateController);
        return;
      }
    } else {
      const stateTimer = stateController.getStateTimer();
      const time = stateTimer * 0.001;

      const oscillationX =
        Math.sin(
          time * this.oscillation.frequency * Math.PI * 2 + this.oscillation.phase
        ) * this.oscillation.amplitude;
      const oscillationY =
        Math.cos(
          time * this.oscillation.frequency * Math.PI * 2 + this.oscillation.phase
        ) * this.oscillation.amplitude;

      const swarmX = Math.sin(currentY * 0.01 + time) * 2;
      const swarmY = Math.cos(currentX * 0.008 + time * 1.5) * 1;

      finalVelocity = {
        x: this.organicVelocity.x + oscillationX + swarmX,
        y: this.organicVelocity.y + oscillationY + swarmY,
      };
    }

    movementController.setVelocity(finalVelocity);
  }

  onMigrationComplete(stateController: any): void {
    console.log(`✅ NPC ${this.npc.groupId} migration terminée`);

    if (this.npc.movementController) {
      this.npc.movementController.stop();
    }

    if (this.npc.sprite) {
      if (this.npc.behaviorController) {
        this.npc.behaviorController.spawnPosition.x = this.npc.sprite.x;
        this.npc.behaviorController.spawnPosition.y = this.npc.sprite.y;
      }
    }

    if (this.npc.animationBehavior) {
      this.npc.animationBehavior.setFacing('down');
    }

    this.targetPosition = null;
    stateController.returnToNormal();
  }

  onOrganismMigrationComplete(stateController: any): void {
    console.log(`🌊 NPC ${this.npc.groupId} arrivé à destination en mode organisme`);

    if (this.npc.animationBehavior) {
      this.npc.animationBehavior.setFacing('down');
      this.npc.animationBehavior.setMoving(false);
    }

    this.onMigrationComplete(stateController);
  }

  calculateMigrationVelocity(): { x: number; y: number } {
    if (!this.targetPosition || !this.npc.sprite) return { x: 0, y: 0 };

    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;

    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= this.migrationTolerance) {
      return { x: 0, y: 0 };
    }

    const dirX = dx / distance;
    const dirY = dy / distance;

    return {
      x: dirX * this.migrationSpeed,
      y: dirY * this.migrationSpeed,
    };
  }

  isMigrating(state: string): boolean {
    return state === 'migrating' || state === 'organism_migrating';
  }

  getTargetPosition(): { x: number; y: number } | null {
    return this.targetPosition;
  }

  configure(options: Record<string, any> = {}): void {
    if (options.migrationSpeed !== undefined) {
      this.migrationSpeed = options.migrationSpeed;
    }

    if (options.migrationTolerance !== undefined) {
      this.migrationTolerance = options.migrationTolerance;
    }

    console.log(`⚙️ NpcMigrationController reconfiguré:`, {
      migrationSpeed: this.migrationSpeed,
      migrationTolerance: this.migrationTolerance,
    });
  }

  destroy(): void {
    this.targetPosition = null;
    this.organicVelocity = null;
    console.log('🗑️ NpcMigrationController détruit');
  }
}
