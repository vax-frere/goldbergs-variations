import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { NpcSpawner } from '../systems/NpcSpawner';
import { IntroSequence } from '../systems/IntroSequence';
import { OutroSequence } from '../systems/OutroSequence';
import { PlayerStates } from '../core/PlayerState';
import { LEVEL } from '../types/constants';
import type { TrollingGameScene, BaseLevelConfig, Vector2 } from '../types/types';

/**
 * Shared infrastructure for all levels.
 * Subclasses only implement their unique mechanic.
 */
export abstract class BaseLevel {
  protected scene: TrollingGameScene;
  protected entityManager: any;
  protected collisionSystem: any;
  protected footstepsSystem: any;

  player: Player | null = null;
  protected walls: Wall[] = [];
  protected background: Phaser.GameObjects.Graphics | null = null;

  npcSpawner: NpcSpawner | null = null;
  protected introSequence: IntroSequence | null = null;
  outroSequence: OutroSequence | null = null;

  protected levelActive = false;
  private levelCreatedAt = 0;

  /** Subclass must set `disableNpcFollowing = true` to prevent following. */
  disableNpcFollowing = false;

  abstract readonly levelConfig: BaseLevelConfig & Record<string, any>;

  constructor(
    scene: TrollingGameScene,
    entityManager: any,
    collisionSystem: any,
    footstepsSystem: any = null,
  ) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.collisionSystem = collisionSystem;
    this.footstepsSystem = footstepsSystem;
  }

  // ================================
  // TEMPLATE METHOD — override hooks
  // ================================

  init(): void {
    this.levelCreatedAt = performance.now();
    this.createBackground();
    this.createPerimeterWalls();
    this.onBeforePlayerCreate();
    this.createPlayer();
    this.onAfterPlayerCreate();
    this.createNpcSpawner();
    this.setupLevelEventListeners();
    this.spawnNpcs();
    this.onAfterSpawn();
    this.createIntroSequence();
    this.createOutroSequence();
    this.setupCollisions();
    this.onInitComplete();
  }

  /** Hook: before player is created (e.g. create a hole). */
  protected onBeforePlayerCreate(): void {}

  /** Hook: after player is created (e.g. enhance push force). */
  protected onAfterPlayerCreate(): void {}

  /** Hook: after NPCs are spawned (e.g. designate scapegoat, configure behaviors). */
  protected onAfterSpawn(): void {}

  /** Hook: after all init is done (e.g. setup hole detection). */
  protected onInitComplete(): void {}

  /** Hook: subclass provides the position where the player walks to during intro. */
  protected getIntroTargetPosition(): Vector2 {
    return {
      x: this.scene.scale.width / 3,
      y: this.scene.scale.height / 2,
    };
  }

  /** Hook: subclass provides the initial player spawn position. */
  protected getPlayerSpawnPosition(): Vector2 {
    return {
      x: this.scene.scale.width / 2,
      y: this.scene.scale.height / 2,
    };
  }

  /** Hook: called when intro + tutorial are done. Override to add level-specific activation. */
  protected onLevelActivated(): void {}

  /** Subclass must implement: is the level complete? */
  abstract checkLevelCompletion(): boolean;

  /** Subclass must implement: level-specific update logic. */
  protected abstract updateLevel(time: number, delta: number): void;

  /** Hook: level-specific cleanup beyond the base cleanup. */
  protected cleanupLevel(): void {}

  /** Hook: level-specific resize logic. */
  protected resizeLevel(width: number, height: number): void {}

  /** Subclass provides stats. */
  abstract getLevelStats(): Record<string, any>;

  // ================================
  // BACKGROUND
  // ================================

  protected createBackground(): void {
    this.background = this.scene.add.graphics();
    this.updateBackground();
  }

  protected updateBackground(): void {
    if (!this.background) return;
    this.background.clear();
    this.background.fillStyle(0x000000);
    this.background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
  }

  // ================================
  // WALLS
  // ================================

  protected createPerimeterWalls(): void {
    this.clearWalls();

    const wallSize = LEVEL.WALL_SIZE;
    const wallThickness = LEVEL.WALL_THICKNESS;
    const npcHeight = LEVEL.NPC_HEIGHT;
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    for (let x = 0; x < w; x += wallSize) {
      this.addWall(x, -wallThickness + npcHeight);
    }
    for (let x = 0; x < w; x += wallSize) {
      this.addWall(x, h - 10);
    }
    for (let y = wallSize; y < h - wallSize; y += wallSize) {
      this.addWall(-wallThickness + 10, y);
    }
    for (let y = wallSize; y < h - wallSize; y += wallSize) {
      this.addWall(w - 10, y);
    }
  }

  private addWall(x: number, y: number): void {
    const wall = new Wall(this.scene, x, y, true);
    this.walls.push(wall);
    this.entityManager.addEntity(wall, 'wall');
  }

  protected clearWalls(): void {
    for (const wall of this.walls) {
      if (wall.id !== undefined) {
        this.entityManager.removeEntity(wall.id);
      }
      wall.destroy();
    }
    this.walls = [];
  }

  disablePerimeterWalls(): void {
    for (const wall of this.walls) wall.setEnabled(false);
  }

  enablePerimeterWalls(): void {
    for (const wall of this.walls) wall.setEnabled(true);
  }

  // ================================
  // PLAYER
  // ================================

  protected createPlayer(): void {
    const { x, y } = this.getPlayerSpawnPosition();

    if (!this.player) {
      this.player = new Player(this.scene as any, x, y);
      this.entityManager.addEntity(this.player, 'player');
    } else {
      this.player.sprite.x = x;
      this.player.sprite.y = y;
    }

    this.player.playerState.setState(PlayerStates.INTRO);
    this.player.setInputEnabled(false);
    this.player.clearAllFollowers();
    this.updatePlayerBounds();

    if ((window as any).game?.debugShoutRadius) {
      this.player.setDebugEnabled(true);
    }
  }

  protected updatePlayerBounds(): void {
    this.player?.setWorldBounds({
      x: 0,
      y: 0,
      width: this.scene.scale.width,
      height: this.scene.scale.height,
    });
  }

  // ================================
  // NPC SPAWNER
  // ================================

  protected createNpcSpawner(): void {
    this.npcSpawner = new NpcSpawner(this.scene, this.entityManager, this.collisionSystem);
    this.npcSpawner.groupSize = this.levelConfig.npcCount;
  }

  protected spawnNpcs(): void {
    if (!this.npcSpawner || !this.player) return;
    this.npcSpawner.spawnGroups({
      x: this.player.sprite.x,
      y: this.player.sprite.y,
    });
  }

  // ================================
  // INTRO / OUTRO
  // ================================

  protected createIntroSequence(): void {
    if (!this.player) return;
    this.introSequence = new IntroSequence(this.scene as any, this.player, this);
    const target = this.getIntroTargetPosition();
    this.disablePerimeterWalls();
    this.introSequence.start(target.x, target.y);
  }

  protected createOutroSequence(): void {
    if (!this.player) return;
    this.outroSequence = new OutroSequence(this.scene as any, this.player, this);
  }

  // ================================
  // EVENTS
  // ================================

  protected setupLevelEventListeners(): void {
    this.scene.events.on('introSequenceComplete', () => this.onIntroComplete());
    this.scene.events.on('introCompletelyFinished', () => {
      if (!this.levelActive) this.onIntroComplete();
    });
  }

  protected onIntroComplete(): void {
    this.activatePlayerControls();
    this.levelActive = true;
    this.onLevelActivated();
  }

  protected activatePlayerControls(): void {
    if (!this.player?.playerState) return;
    this.player.playerState.setState(PlayerStates.PLAYING);
    this.enablePerimeterWalls();
  }

  // ================================
  // COLLISIONS
  // ================================

  protected setupCollisions(): void {
    const allNpcs = this.entityManager.getNpcs();

    for (const wall of this.walls) {
      if (wall.body && this.player?.sprite?.body) {
        this.scene.physics.add.collider(this.player.sprite, wall.body);
      }
    }

    for (const npc of allNpcs) {
      for (const wall of this.walls) {
        if (wall.body && npc.sprite?.body) {
          this.scene.physics.add.collider(npc.sprite, wall.body);
        }
      }
    }

    for (let i = 0; i < allNpcs.length; i++) {
      for (let j = i + 1; j < allNpcs.length; j++) {
        if (allNpcs[i].sprite?.body && allNpcs[j].sprite?.body) {
          this.scene.physics.add.collider(allNpcs[i].sprite, allNpcs[j].sprite);
        }
      }
    }

    for (const npc of allNpcs) {
      if (npc.sprite?.body && this.player?.sprite?.body) {
        this.scene.physics.add.collider(this.player.sprite, npc.sprite);
      }
    }
  }

  // ================================
  // HELPERS
  // ================================

  disableWorldBoundsForAllNpcs(): void {
    const allNpcs = this.npcSpawner?.getAllNpcs() ?? [];
    for (const npc of allNpcs) {
      npc.sprite?.body?.setCollideWorldBounds(false);
    }
  }

  /** Force all NPCs out of 'following' state. Used by levels that disable following. */
  protected enforceNoFollowing(): void {
    if (!this.npcSpawner) return;
    for (const npc of this.npcSpawner.getAllNpcs()) {
      if (npc.state === 'following') {
        npc.state = 'normal';
        npc.followTarget = null;
        npc.velocity = { x: 0, y: 0 };
      }
    }
  }

  // ================================
  // UPDATE
  // ================================

  update(time: number, delta: number): void {
    this.introSequence?.update();
    this.entityManager.update(time, delta);

    if (this.disableNpcFollowing) {
      this.enforceNoFollowing();
    }

    this.npcSpawner?.update(delta);
    this.updateLevel(time, delta);

    if (this.levelActive && this.outroSequence) {
      if (!this.outroSequence.isActive && this.checkLevelCompletion()) {
        this.outroSequence.start('right');
      }
      if (this.outroSequence.isActive) {
        this.outroSequence.update();
      }
    }

    // Fallback activation (uses real elapsed time since level init, not Phaser clock)
    if (!this.levelActive) {
      const elapsed = performance.now() - this.levelCreatedAt;
      if (elapsed > LEVEL.FALLBACK_ACTIVATION_TIME) {
        console.warn('⚠️ Fallback: forced level activation');
        this.levelActive = true;
        this.activatePlayerControls();
      }
    }
  }

  // ================================
  // RESIZE
  // ================================

  handleResize(width: number, height: number): void {
    this.updateBackground();
    this.createPerimeterWalls();
    this.updatePlayerBounds();

    if (this.npcSpawner && this.player) {
      this.npcSpawner.respawnGroups({
        x: this.player.sprite.x,
        y: this.player.sprite.y,
      });
    }

    this.resizeLevel(width, height);
    this.setupCollisions();
  }

  // ================================
  // CLEANUP
  // ================================

  cleanup(): void {
    this.cleanupLevel();

    this.introSequence?.destroy();
    this.introSequence = null;
    this.outroSequence?.destroy();
    this.outroSequence = null;
    this.npcSpawner?.cleanup();
    this.npcSpawner = null;
    this.footstepsSystem?.destroy();
    this.background?.destroy();
    this.background = null;
    this.clearWalls();
    this.entityManager.clear();
    this.player = null;
    this.levelActive = false;
  }
}
