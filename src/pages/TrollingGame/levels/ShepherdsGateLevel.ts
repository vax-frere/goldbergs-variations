import Phaser from 'phaser';
import { BaseLevel } from './BaseLevel';
import { LEVEL } from '../types/constants';
import type { TrollingGameScene, Vector2 } from '../types/types';

/**
 * 🕳️ SHEPHERD'S GATE - POUSSER LA FOULE DANS LE TROU
 *
 * Mécanique : Le joueur doit pousser tous les NPCs dans un trou central
 * Victoire : Quand tous les NPCs sont tombés dans le trou
 */
export class ShepherdsGateLevel extends BaseLevel {
  override disableNpcFollowing = true;

  protected holeGraphics: Phaser.GameObjects.Graphics | null = null;
  protected holeZone: any = null;
  protected fallenNpcs = new Set<string | number>();
  protected holeCenter: Vector2 = { x: 0, y: 0 };

  override readonly levelConfig = {
    name: "Shepherd's Gate",
    mechanic: 'PUSH_TO_HOLE',
    description: 'Poussez tous les NPCs dans le trou central !',
    npcCount: LEVEL.SHEPHERDS_GATE.NPC_COUNT,
    holeRadius: LEVEL.SHEPHERDS_GATE.HOLE_RADIUS,
    holeColor: 0xffffff,
    requiredFallen: LEVEL.SHEPHERDS_GATE.REQUIRED_FALLEN,
    respawnDistance: LEVEL.SHEPHERDS_GATE.HOLE_RADIUS * 4,
  };

  constructor(
    scene: TrollingGameScene,
    entityManager: any,
    collisionSystem: any,
    footstepsSystem: any = null,
  ) {
    super(scene, entityManager, collisionSystem, footstepsSystem);
  }

  protected override onBeforePlayerCreate(): void {
    this.createCentralHole();
  }

  protected override getPlayerSpawnPosition(): Vector2 {
    return {
      x: this.scene.scale.width * 0.2,
      y: this.scene.scale.height / 2,
    };
  }

  protected override onAfterPlayerCreate(): void {
    this.enhancePlayerPushForce();
  }

  protected override createNpcSpawner(): void {
    super.createNpcSpawner();
    this.configureShepherdSpawner();
  }

  protected override spawnNpcs(): void {
    if (!this.npcSpawner || !this.player) return;
    const spawner = this.npcSpawner as any;
    spawner.centerX = this.holeCenter.x;
    spawner.centerY = this.holeCenter.y;
    spawner.spawnGroups({ x: this.holeCenter.x, y: this.holeCenter.y });
  }

  protected override onAfterSpawn(): void {
    this.setupShepherdNpcBehavior();
  }

  protected override onInitComplete(): void {
    // Hole detection runs in updateLevel
  }

  private createCentralHole(): void {
    this.holeCenter.x = this.scene.scale.width / 2;
    this.holeCenter.y = this.scene.scale.height / 2;

    this.holeGraphics = this.scene.add.graphics();
    this.drawHole();

    this.holeZone = this.scene.add.zone(
      this.holeCenter.x,
      this.holeCenter.y,
      this.levelConfig.holeRadius * 2,
      this.levelConfig.holeRadius * 2,
    );
    this.holeZone.setCircleDropZone(this.levelConfig.holeRadius);
  }

  private drawHole(): void {
    if (!this.holeGraphics) return;
    this.holeGraphics.clear();
    this.holeGraphics.fillStyle(this.levelConfig.holeColor);
    this.holeGraphics.fillCircle(this.holeCenter.x, this.holeCenter.y, this.levelConfig.holeRadius);
  }

  private enhancePlayerPushForce(): void {
    if (this.player?.sprite?.body) {
      this.player.sprite.body.setMass(2.0);
      this.player.sprite.body.setDrag(60, 60);
    }
  }

  private configureShepherdSpawner(): void {
    if (!this.npcSpawner) return;
    this.npcSpawner.groupSize = this.levelConfig.npcCount;
    (this.npcSpawner as any).spawnRadius = this.levelConfig.respawnDistance;
    (this.npcSpawner as any).centerX = this.holeCenter.x;
    (this.npcSpawner as any).centerY = this.holeCenter.y;
    (this.npcSpawner as any).migrationActive = false;
    (this.npcSpawner as any).migrationConfig = {
      staggerDelayMin: 0,
      staggerDelayMax: 0,
      speedMin: 0,
      speedMax: 0,
      migrationSpeed: 0,
      spawnMargin: 0,
      verticalVariation: 50,
      speedVariation: 0,
      verticalSpeedVariation: 0,
    };
  }

  private setupShepherdNpcBehavior(): void {
    if (!this.npcSpawner) return;
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc: any) => {
      if (npc.sprite?.body) {
        npc.sprite.body.setMass(0.5);
        npc.sprite.body.setDrag(20, 20);
        npc.sprite.body.setBounce(0.3, 0.3);
        npc.state = 'normal';
        npc.followTarget = null;
        npc.velocity = npc.velocity || { x: 0, y: 0 };
        npc.velocity.x = 0;
        npc.velocity.y = 0;
        npc.canTremble = false;
        npc.canFollow = false;
        npc.shepherdMode = true;
        npc.hasFallen = false;
      }
    });
  }

  private checkNpcsInHole(): void {
    if (!this.npcSpawner) return;
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc: any) => {
      if (npc.hasFallen) return;
      const distance = Phaser.Math.Distance.Between(
        npc.sprite.x,
        npc.sprite.y,
        this.holeCenter.x,
        this.holeCenter.y,
      );
      if (distance <= this.levelConfig.holeRadius) {
        this.makeNpcFall(npc);
      }
    });
  }

  private makeNpcFall(npc: any): void {
    if (npc.hasFallen) return;
    npc.hasFallen = true;
    this.fallenNpcs.add(npc.id);

    this.scene.tweens.add({
      targets: npc.sprite,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        npc.sprite.setVisible(false);
        npc.sprite.body.setEnable(false);
      },
    });

    if ((this.scene as any).soundManager?.playTouch) {
      (this.scene as any).soundManager.playTouch();
    }
  }

  override checkLevelCompletion(): boolean {
    return this.fallenNpcs.size >= this.levelConfig.requiredFallen;
  }

  protected override updateLevel(time: number, delta: number): void {
    this.checkNpcsInHole();
  }

  override handleResize(width: number, height: number): void {
    this.updateBackground();
    this.createPerimeterWalls();
    this.updatePlayerBounds();
    this.holeCenter.x = width / 2;
    this.holeCenter.y = height / 2;
    this.drawHole();
    if (this.npcSpawner && this.player) {
      (this.npcSpawner as any).centerX = this.holeCenter.x;
      (this.npcSpawner as any).centerY = this.holeCenter.y;
      this.npcSpawner.respawnGroups({ x: this.holeCenter.x, y: this.holeCenter.y });
      this.setupShepherdNpcBehavior();
    }
    this.setupCollisions();
  }

  protected override cleanupLevel(): void {
    this.holeGraphics?.destroy();
    this.holeGraphics = null;
    this.holeZone?.destroy();
    this.holeZone = null;
    this.fallenNpcs.clear();
  }

  override getLevelStats(): Record<string, any> {
    const totalNpcs = this.levelConfig.npcCount;
    const fallenCount = this.fallenNpcs.size;
    return {
      name: this.levelConfig.name,
      type: 'SHEPHERD_GATE',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: totalNpcs,
      fallenNpcs: fallenCount,
      completionRate: totalNpcs > 0 ? ((fallenCount / totalNpcs) * 100).toFixed(1) + '%' : '0%',
      holeRadius: this.levelConfig.holeRadius,
      remaining: totalNpcs - fallenCount,
    };
  }
}
