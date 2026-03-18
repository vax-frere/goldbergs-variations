import { Npc } from '../entities/Npc';
import type { Vector2 } from '../types/types';

export class NpcSpawner {
  scene: any;
  entityManager: any;
  collisionSystem: any;
  npcs: any[] = [];
  groupId: string = 'central_group';
  groupColor: number = 0x4ecdc4;
  groupSize: number = 37;
  centerX: number = 0;
  centerY: number = 0;
  spawnRadius: number = 150;
  migrationActive: boolean = false;
  debugGraphics: any = null;
  migrationDebugData: Array<{
    npc: any;
    originalIndex: number;
    sortedIndex?: number;
    distanceFromCenter: number;
    migrationStarted: boolean;
  }> = [];
  migrationConfig: {
    staggerDelayMin: number;
    staggerDelayMax: number;
    speedMin: number;
    speedMax: number;
    migrationSpeed: number;
    spawnMargin: number;
    verticalVariation: number;
    speedVariation: number;
    verticalSpeedVariation: number;
  } = {
    staggerDelayMin: 0,
    staggerDelayMax: 3500,
    speedMin: 80,
    speedMax: 180,
    migrationSpeed: 120,
    spawnMargin: 800,
    verticalVariation: 150,
    speedVariation: 60,
    verticalSpeedVariation: 40,
  };

  constructor(scene: any, entityManager: any, collisionSystem: any) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.collisionSystem = collisionSystem;

    this.scene.events.on('playerIntroStarted', (data: any) => {
      this.startNpcMigration(data);
    });
  }

  spawnGroups(playerPosition: Vector2 = { x: 0, y: 0 }): void {
    this.centerX = this.scene.scale.width * 2 / 3;
    this.centerY = this.scene.scale.height / 2;

    this.createNpcs();
  }

  createNpcs(): void {
    for (let i = 0; i < this.groupSize; i++) {
      const npc = this.createNpc(i);
      this.npcs.push(npc);

      if (this.entityManager) {
        this.entityManager.addEntity(npc, 'npc');
      }
    }

    this.setupPlayerCollisions();

    this.migrationActive = true;
  }

  createNpc(index: number): any {
    const npcCollisionRadius = 25;
    const safetyMargin = 0;
    const minDistance = (npcCollisionRadius * 2) + safetyMargin;

    let finalX: number, finalY: number;

    if (index === 0) {
      finalX = this.centerX;
      finalY = this.centerY;
    } else {
      let circle = 1;
      let positionInCircle = index - 1;

      let npcsPerCircle = Math.floor((2 * Math.PI * (circle * minDistance)) / minDistance);
      npcsPerCircle = Math.max(6, npcsPerCircle);

      while (positionInCircle >= npcsPerCircle) {
        positionInCircle -= npcsPerCircle;
        circle++;
        npcsPerCircle = Math.floor(2 * Math.PI * circle);
        npcsPerCircle = Math.max(6, npcsPerCircle);
      }

      const angle = (Math.PI * 2 * positionInCircle) / npcsPerCircle;
      const distance = circle * minDistance;

      finalX = this.centerX + Math.cos(angle) * distance;
      finalY = this.centerY + Math.sin(angle) * distance;
    }

    const spawnPosition = this.calculateSpawnPosition(index, { x: finalX, y: finalY });

    const npcConfig = {
      groupId: this.groupId,
      color: this.groupColor,
      speed: 145 + Math.random() * 10,
    };

    const npc = new Npc(this.scene, spawnPosition.x, spawnPosition.y, npcConfig);

    npc.targetPosition = { x: finalX, y: finalY };

    npc.startMigration(npc.targetPosition);

    return npc;
  }

  calculateSpawnPosition(index: number, finalPosition: Vector2): Vector2 {
    const verticalVariation = (Math.random() - 0.5) * this.migrationConfig.verticalVariation;
    const horizontalVariation = Math.random() * 200;

    const spawnX = finalPosition.x + this.migrationConfig.spawnMargin + horizontalVariation;
    const spawnY = finalPosition.y + verticalVariation;

    const angleOffset = (index / this.groupSize) * Math.PI * 2;
    const circleRadius = 30;
    const circleX = Math.cos(angleOffset) * circleRadius;
    const circleY = Math.sin(angleOffset) * circleRadius;

    return {
      x: spawnX + circleX,
      y: spawnY + circleY,
    };
  }

  setupPlayerCollisions(): void {
    if (!this.collisionSystem) return;

    const player = this.entityManager.getPlayer();
    if (!player) return;

    this.npcs.forEach((npc: any) => {
      this.collisionSystem.addCollisionPair(npc, player);
    });
  }

  startNpcMigration(playerIntroData: any): void {
    if (this.migrationActive || this.npcs.length === 0) {
      console.warn('⚠️ Migration déjà active ou pas de NPCs');
      return;
    }

    this.migrationActive = true;

    const allNpcs = this.npcs;
    const groupCenter = this.getCenterPosition();

    const npcsWithDistance = allNpcs.map((npc: any, originalIndex: number) => {
      if (!npc.targetPosition) {
        console.warn(`⚠️ NPC ${originalIndex} n'a pas de targetPosition pour le tri!`);
        return null;
      }

      const dx = npc.targetPosition.x - groupCenter.x;
      const dy = npc.targetPosition.y - groupCenter.y;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

      const randomFactor = Math.random() * 0.4 + 0.8;

      return {
        npc: npc,
        originalIndex: originalIndex,
        distanceFromCenter: distanceFromCenter * randomFactor,
      };
    }).filter((data: any) => data !== null);

    npcsWithDistance.sort((a: any, b: any) => {
      const baseComparison = a.distanceFromCenter - b.distanceFromCenter;
      const randomInfluence = (Math.random() - 0.5) * 0.3;
      return baseComparison + randomInfluence;
    });

    const totalNpcs = npcsWithDistance.length;
    const baseVelocity = { x: -this.migrationConfig.migrationSpeed, y: 0 };

    npcsWithDistance.forEach((npcData: any, sortedIndex: number) => {
      const randomBase = Math.random();
      const randomPower = 0.5 + Math.random() * 1.5;
      const normalizedIndex = sortedIndex / totalNpcs;

      const organicDelay = this.migrationConfig.staggerDelayMin +
        (Math.pow(randomBase * normalizedIndex, randomPower) *
          (this.migrationConfig.staggerDelayMax - this.migrationConfig.staggerDelayMin));

      const speedVariation = (Math.random() - 0.5) * this.migrationConfig.speedVariation;
      const verticalVariation = (Math.random() - 0.5) * this.migrationConfig.verticalSpeedVariation;

      const uniqueFrequency = 0.5 + Math.random();
      const uniquePhase = Math.random() * Math.PI * 2;
      const oscillationAmplitude = 5 + Math.random() * 10;

      const globalVelocity = {
        x: baseVelocity.x + speedVariation,
        y: baseVelocity.y + verticalVariation,
        oscillation: {
          frequency: uniqueFrequency,
          phase: uniquePhase,
          amplitude: oscillationAmplitude,
        },
      };

      this.scene.time.delayedCall(organicDelay, () => {
        this.startNpcOrganismMigration(npcData.npc, globalVelocity, npcData.originalIndex);
      });
    });

    this.migrationDebugData = npcsWithDistance.map((npcData: any, sortedIndex: number) => ({
      npc: npcData.npc,
      originalIndex: npcData.originalIndex,
      sortedIndex: sortedIndex,
      distanceFromCenter: npcData.distanceFromCenter,
      migrationStarted: false,
    }));

    this.createMigrationDebugVisual();
  }

  startNpcOrganismMigration(npc: any, globalVelocity: any, originalIndex: number): void {
    if (!npc.targetPosition) {
      console.warn(`⚠️ NPC #${originalIndex} n'a pas de targetPosition!`);
      return;
    }

    const organicVariation = {
      x: globalVelocity.x + (Math.random() - 0.5) * 10,
      y: globalVelocity.y + (Math.random() - 0.5) * 5,
    };

    npc.startOrganismMigration(npc.targetPosition, organicVariation);

    this.updateMigrationDebugForNpc(originalIndex);
  }

  startNpcMigrationIndividual(npc: any, originalIndex: number, sortedIndex: number | null = null, distanceFromCenter: number | null = null): void {
    if (!npc.targetPosition) {
      console.warn(`⚠️ NPC #${originalIndex} n'a pas de targetPosition!`);
      return;
    }

    npc.startMigration(npc.targetPosition);

    this.updateMigrationDebugForNpc(originalIndex);
  }

  createMigrationDebugVisual(): void {
    if (!this.isDebugMode() || !this.migrationDebugData.length) {
      return;
    }

    if (!this.debugGraphics) {
      this.debugGraphics = this.scene.add.graphics();
      this.debugGraphics.setDepth(999);
    }

    this.redrawMigrationDebugVisual();
  }

  redrawMigrationDebugVisual(): void {
    if (!this.debugGraphics || !this.isDebugMode()) {
      return;
    }

    this.debugGraphics.clear();

    this.migrationDebugData.forEach((debugData: any, index: number) => {
      const npc = debugData.npc;
      const targetPos = npc.targetPosition;

      if (!targetPos || !npc.sprite) return;

      const currentDistance = Math.sqrt(
        Math.pow(targetPos.x - npc.sprite.x, 2) +
        Math.pow(targetPos.y - npc.sprite.y, 2)
      );

      const color = this.getColorForMigrationOrder(debugData.sortedIndex, this.migrationDebugData.length);

      let alpha = 0.8;
      if (debugData.migrationStarted) {
        alpha = Math.max(0.3, Math.min(0.7, currentDistance / 200));
      }

      this.debugGraphics.fillStyle(color, alpha);
      this.debugGraphics.fillCircle(targetPos.x, targetPos.y, 6);

      this.debugGraphics.lineStyle(1, color, alpha + 0.2);
      this.debugGraphics.strokeCircle(targetPos.x, targetPos.y, 6);

      if (currentDistance > 10) {
        const lineWidth = debugData.migrationStarted ? 2 : 1;
        const lineAlpha = debugData.migrationStarted ? alpha * 0.8 : alpha * 0.6;

        this.debugGraphics.lineStyle(lineWidth, color, lineAlpha);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(npc.sprite.x, npc.sprite.y);
        this.debugGraphics.lineTo(targetPos.x, targetPos.y);
        this.debugGraphics.strokePath();

        const arrowSize = debugData.migrationStarted ? 10 : 8;
        const angle = Math.atan2(targetPos.y - npc.sprite.y, targetPos.x - npc.sprite.x);
        const arrowX1 = targetPos.x - Math.cos(angle - 0.5) * arrowSize;
        const arrowY1 = targetPos.y - Math.sin(angle - 0.5) * arrowSize;
        const arrowX2 = targetPos.x - Math.cos(angle + 0.5) * arrowSize;
        const arrowY2 = targetPos.y - Math.sin(angle + 0.5) * arrowSize;

        this.debugGraphics.lineStyle(lineWidth + 1, color, lineAlpha + 0.2);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(targetPos.x, targetPos.y);
        this.debugGraphics.lineTo(arrowX1, arrowY1);
        this.debugGraphics.moveTo(targetPos.x, targetPos.y);
        this.debugGraphics.lineTo(arrowX2, arrowY2);
        this.debugGraphics.strokePath();
      }
    });
  }

  updateMigrationDebugForNpc(originalIndex: number): void {
    const debugData = this.migrationDebugData.find((data: any) => data.originalIndex === originalIndex);
    if (debugData) {
      debugData.migrationStarted = true;
    }
  }

  getColorForMigrationOrder(sortedIndex: number, totalNpcs: number): number {
    const ratio = sortedIndex / (totalNpcs - 1);

    if (ratio <= 0.5) {
      const localRatio = ratio * 2;
      const red = 255;
      const green = Math.floor(localRatio * 255);
      const blue = 0;
      return (red << 16) | (green << 8) | blue;
    } else {
      const localRatio = (ratio - 0.5) * 2;
      const red = Math.floor((1 - localRatio) * 255);
      const green = 255;
      const blue = 0;
      return (red << 16) | (green << 8) | blue;
    }
  }

  isDebugMode(): boolean {
    return !!(window as any).game && ((window as any).game.debugPhysics || (window as any).game.debugShoutRadius || (window as any).game.debugNpcs);
  }

  createDebugDataForAllNpcs(): void {
    if (this.npcs.length === 0) return;

    const groupCenter = this.getCenterPosition();

    this.migrationDebugData = this.npcs.map((npc: any, index: number) => {
      const dx = npc.targetPosition ? npc.targetPosition.x - groupCenter.x : 0;
      const dy = npc.targetPosition ? npc.targetPosition.y - groupCenter.y : 0;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

      return {
        npc: npc,
        originalIndex: index,
        sortedIndex: index,
        distanceFromCenter: distanceFromCenter,
        migrationStarted: true,
      };
    });

    console.log(`🔍 Données de debug recréées pour ${this.npcs.length} NPCs`);
  }

  clearMigrationDebugVisual(): void {
    if (this.debugGraphics) {
      this.debugGraphics.clear();
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
    this.migrationDebugData = [];
  }

  checkMigrationComplete(): void {
    if (!this.migrationActive || this.npcs.length === 0) return;

    const migrating = this.npcs.filter((npc: any) =>
      npc.state === 'migrating' || npc.state === 'organism_migrating'
    );

    if (migrating.length === 0) {
      this.migrationActive = false;

      this.clearMigrationDebugVisual();

      console.log('🎯 Tous les NPCs ont terminé leur migration');
      this.scene.events.emit('npcMigrationComplete');
    }
  }

  update(delta: number): void {
    if (this.migrationActive) {
      this.checkMigrationComplete();
    }

    const shouldShowDebug = this.isDebugMode();

    if (shouldShowDebug) {
      if (this.migrationDebugData.length === 0 && this.npcs.length > 0) {
        this.createDebugDataForAllNpcs();
      }

      if (!this.debugGraphics && this.migrationDebugData.length > 0) {
        this.createMigrationDebugVisual();
      }

      if (this.debugGraphics && this.debugGraphics.visible !== shouldShowDebug) {
        this.debugGraphics.setVisible(shouldShowDebug);
      }

      if (this.debugGraphics && this.debugGraphics.visible) {
        this.redrawMigrationDebugVisual();
      }
    } else if (this.debugGraphics) {
      this.debugGraphics.setVisible(false);
    }
  }

  getAllNpcs(): any[] {
    return [...this.npcs];
  }

  getTotalNpcCount(): number {
    return this.npcs.length;
  }

  getCenterPosition(): Vector2 {
    return { x: this.centerX, y: this.centerY };
  }

  getSpawnStats(): any {
    return {
      totalGroups: 1,
      totalNpcs: this.npcs.length,
      groupSizes: [this.npcs.length],
      groupColors: [this.groupColor],
      groupPositions: [this.getCenterPosition()],
    };
  }

  cleanup(): void {
    this.scene.events.off('playerIntroStarted');

    this.clearMigrationDebugVisual();

    this.npcs.forEach((npc: any) => {
      if (this.entityManager && npc.id !== undefined) {
        this.entityManager.removeEntity(npc.id);
      } else {
        npc.destroy();
      }
    });

    this.npcs = [];
    this.migrationActive = false;
  }

  respawnGroups(playerPosition: Vector2): void {
    this.clearMigrationDebugVisual();
    this.cleanup();
    this.spawnGroups(playerPosition);
  }

  getGroups(): any[] {
    return [{
      getNpcs: () => this.npcs,
      getSize: () => this.npcs.length,
      getColor: () => this.groupColor,
      getId: () => this.groupId,
      getCenterPosition: () => this.getCenterPosition(),
    }];
  }

  getCentralGroup(): any {
    return {
      getNpcs: () => this.npcs,
      getSize: () => this.npcs.length,
      getColor: () => this.groupColor,
      getId: () => this.groupId,
      getCenterPosition: () => this.getCenterPosition(),
    };
  }
}
