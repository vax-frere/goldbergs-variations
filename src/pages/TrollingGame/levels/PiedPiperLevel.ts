import Phaser from 'phaser';
import { BaseLevel } from './BaseLevel';
import { TutorialTextManager } from '../systems/TutorialTextManager';
import { GroupFleeingSystem } from '../systems/GroupFleeingSystem';
import { FlowFieldService } from '../systems/FlowFieldService';
import { PlayerStates } from '../core/PlayerState';
import { LEVEL } from '../types/constants';
import type { TrollingGameScene } from '../types/types';

/**
 * 🎵 PIED PIPER - MENER LA FOULE AVEC SON CRI
 *
 * Mécanique : Le joueur utilise son cri pour attirer et faire suivre tous les NPCs
 * Victoire : Quand tous les NPCs suivent le joueur
 */
export class PiedPiperLevel extends BaseLevel {
  protected tutorialTextManager: any = null;
  protected groupFleeingSystem: any = null;
  protected flowFieldService: any = null;

  private groupFleeKey: Phaser.Input.Keyboard.Key | null = null;
  private forceFleeKey: Phaser.Input.Keyboard.Key | null = null;
  private stopFleeKey: Phaser.Input.Keyboard.Key | null = null;
  private smartAssignmentToggleKey: Phaser.Input.Keyboard.Key | null = null;
  private assignmentStatsKey: Phaser.Input.Keyboard.Key | null = null;
  private optimizeKey: Phaser.Input.Keyboard.Key | null = null;
  private emergencyActivateKey: Phaser.Input.Keyboard.Key | null = null;
  private debugAssignmentKey: Phaser.Input.Keyboard.Key | null = null;

  private groupFleeKeyPressed = false;
  private forceFleeKeyPressed = false;
  private stopFleeKeyPressed = false;
  private smartAssignmentToggleKeyPressed = false;
  private assignmentStatsKeyPressed = false;
  private optimizeKeyPressed = false;
  private emergencyActivateKeyPressed = false;
  private debugAssignmentKeyPressed = false;

  private stuckCheckTimer = 0;
  private introStartTime: number | null = null;

  override readonly levelConfig = {
    name: 'Pied Piper',
    mechanic: 'ATTRACT_AND_FOLLOW',
    description: 'Attirez tous les NPCs avec votre cri pour les faire suivre !',
    npcCount: LEVEL.PIED_PIPER.NPC_COUNT,
    followRadius: 100,
    difficulty: 'STANDARD',
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
    this.tutorialTextManager = new TutorialTextManager(this.scene);
    this.groupFleeingSystem = new GroupFleeingSystem(this.scene, this.entityManager);
    this.groupFleeingSystem.updateConfig({
      triggerThreshold: 8,
      checkInterval: 200,
      fleeRange: 300,
      minNpcsForFlee: 1,
    });
    this.flowFieldService = new FlowFieldService(this.scene, {
      cellSize: 50,
      updateIntervalMs: 200,
      weightBorders: 1.1,
      weightPlayer: 1.4,
      weightCenter: -0.25,
      playerSigma: 180,
      borderMargin: 140,
      blurPasses: 2,
    });
  }

  protected override onAfterSpawn(): void {
    this.setupNpcWallCollisions();
  }

  protected override setupLevelEventListeners(): void {
    super.setupLevelEventListeners();
    this.scene.events.on('tutorialFinished', () => this.onTutorialFinished());
    this.setupGroupFleeingDebugControls();
  }

  protected override onIntroComplete(): void {
    if (!this.tutorialTextManager?.shouldShowTutorial?.()) {
      this.activatePlayerControls();
      this.levelActive = true;
      this.onLevelActivated();
    }
  }

  private onTutorialFinished(): void {
    this.activatePlayerControls();
    this.levelActive = true;
    this.onLevelActivated();
  }

  private setupGroupFleeingDebugControls(): void {
    this.groupFleeKey = this.scene.input.keyboard.addKey('G');
    this.forceFleeKey = this.scene.input.keyboard.addKey('F');
    this.stopFleeKey = this.scene.input.keyboard.addKey('H');
    this.smartAssignmentToggleKey = this.scene.input.keyboard.addKey('S');
    this.assignmentStatsKey = this.scene.input.keyboard.addKey('A');
    this.optimizeKey = this.scene.input.keyboard.addKey('O');
    this.emergencyActivateKey = this.scene.input.keyboard.addKey('E');
    this.debugAssignmentKey = this.scene.input.keyboard.addKey('D');
  }

  private setupNpcWallCollisions(): void {
    if (!this.npcSpawner) return;
    const allNpcs = this.npcSpawner.getAllNpcs();
    allNpcs.forEach((npc: any) => {
      for (const wall of this.walls) {
        this.collisionSystem.addCollisionPair(npc, wall);
      }
    });
  }

  private forceActivateIfStuck(): boolean {
    if (!this.player?.playerState) return false;
    const currentState = this.player.playerState.getState();
    if (currentState !== PlayerStates.INTRO) return false;

    if (this.introSequence && typeof (this.introSequence as any).forceComplete === 'function') {
      (this.introSequence as any).forceComplete();
    } else {
      this.scene.events.emit('introSequenceComplete');
    }
    if (this.tutorialTextManager?.tutorialFinished === false) {
      if (typeof (this.tutorialTextManager as any).emitTutorialFinished === 'function') {
        (this.tutorialTextManager as any).emitTutorialFinished();
      } else {
        this.scene.events.emit('tutorialFinished');
      }
    }
    this.activatePlayerControls();
    this.levelActive = true;
    this.onLevelActivated();
    return true;
  }

  override checkLevelCompletion(): boolean {
    if (!this.npcSpawner || !this.player) return false;
    const allNpcs = this.npcSpawner.getAllNpcs();
    if (allNpcs.length === 0) return false;
    const followingNpcs = allNpcs.filter((npc: any) => npc.state === 'following');
    return followingNpcs.length === allNpcs.length;
  }

  protected override updateLevel(time: number, delta: number): void {
    this.checkForStuckPlayer(time);
    this.tutorialTextManager?.update?.(delta);
    this.groupFleeingSystem?.update?.(time, delta);
    this.flowFieldService?.update?.(time, delta);
    this.handleGroupFleeingDebugInput();
  }

  private checkForStuckPlayer(time: number): void {
    if (!this.player?.playerState) return;
    if (!this.stuckCheckTimer) {
      this.stuckCheckTimer = time;
      return;
    }
    if (time - this.stuckCheckTimer < 3000) return;
    this.stuckCheckTimer = time;
    const playerState = this.player.playerState.getState();
    if (playerState === PlayerStates.INTRO) {
      if (this.introStartTime == null) this.introStartTime = time;
      else if (time - this.introStartTime > 15000) {
        this.forceActivateIfStuck();
        this.introStartTime = null;
      }
    } else {
      this.introStartTime = null;
    }
  }

  private handleGroupFleeingDebugInput(): void {
    if (!this.groupFleeKey || !this.forceFleeKey || !this.stopFleeKey) return;

    if (this.groupFleeKey.isDown && !this.groupFleeKeyPressed) {
      this.groupFleeKeyPressed = true;
      if (this.groupFleeingSystem?.getSystemStats) {
        console.log('👥 [PIPER] Group Fleeing System Stats:', this.groupFleeingSystem.getSystemStats());
      }
    }
    if (!this.groupFleeKey.isDown) this.groupFleeKeyPressed = false;

    if (this.forceFleeKey.isDown && !this.forceFleeKeyPressed) {
      this.forceFleeKeyPressed = true;
      this.groupFleeingSystem?.forceGroupFleeing?.();
    }
    if (!this.forceFleeKey.isDown) this.forceFleeKeyPressed = false;

    if (this.stopFleeKey.isDown && !this.stopFleeKeyPressed) {
      this.stopFleeKeyPressed = true;
      this.groupFleeingSystem?.forceStopGroupFleeing?.();
    }
    if (!this.stopFleeKey.isDown) this.stopFleeKeyPressed = false;

    if (this.smartAssignmentToggleKey?.isDown && !this.smartAssignmentToggleKeyPressed) {
      this.smartAssignmentToggleKeyPressed = true;
      const trail = (this.player as any)?.trailBehavior;
      if (trail?.setSmartAssignmentEnabled) {
        trail.setSmartAssignmentEnabled(!trail.useSmartAssignment);
      }
    }
    if (this.smartAssignmentToggleKey && !this.smartAssignmentToggleKey.isDown) {
      this.smartAssignmentToggleKeyPressed = false;
    }

    if (this.assignmentStatsKey?.isDown && !this.assignmentStatsKeyPressed) {
      this.assignmentStatsKeyPressed = true;
      const trail = (this.player as any)?.trailBehavior;
      if (trail?.getAssignmentStats) {
        console.log('📊 [PIPER] Assignment Stats:', trail.getAssignmentStats());
      }
    }
    if (this.assignmentStatsKey && !this.assignmentStatsKey.isDown) {
      this.assignmentStatsKeyPressed = false;
    }

    if (this.optimizeKey?.isDown && !this.optimizeKeyPressed) {
      this.optimizeKeyPressed = true;
      const smartAssignment = (this.player as any)?.trailBehavior?.smartAssignment;
      smartAssignment?.performGlobalOptimization?.();
    }
    if (this.optimizeKey && !this.optimizeKey.isDown) this.optimizeKeyPressed = false;

    if (this.emergencyActivateKey?.isDown && !this.emergencyActivateKeyPressed) {
      this.emergencyActivateKeyPressed = true;
      this.forceActivateIfStuck();
    }
    if (this.emergencyActivateKey && !this.emergencyActivateKey.isDown) {
      this.emergencyActivateKeyPressed = false;
    }

    if (this.debugAssignmentKey?.isDown && !this.debugAssignmentKeyPressed) {
      this.debugAssignmentKeyPressed = true;
      const smartAssignment = (this.player as any)?.trailBehavior?.smartAssignment;
      if (smartAssignment?.setDebugEnabled) {
        smartAssignment.setDebugEnabled(!smartAssignment.config?.debugAssignment);
      }
    }
    if (this.debugAssignmentKey && !this.debugAssignmentKey.isDown) {
      this.debugAssignmentKeyPressed = false;
    }
  }

  protected override resizeLevel(width: number, height: number): void {
    if (this.npcSpawner && this.player) {
      this.setupNpcWallCollisions();
    }
  }

  protected override cleanupLevel(): void {
    this.tutorialTextManager?.destroy?.();
    this.tutorialTextManager = null;
    this.groupFleeingSystem?.destroy?.();
    this.groupFleeingSystem = null;
    this.flowFieldService = null;
  }

  override getLevelStats(): Record<string, any> {
    const allNpcs = this.npcSpawner?.getAllNpcs() ?? [];
    const following = allNpcs.filter((npc: any) => npc.state === 'following').length;
    const rate = allNpcs.length > 0 ? ((following / allNpcs.length) * 100).toFixed(1) + '%' : '0%';
    return {
      name: this.levelConfig.name,
      type: 'PIED_PIPER',
      mechanic: this.levelConfig.mechanic,
      description: this.levelConfig.description,
      npcCount: this.levelConfig.npcCount,
      difficulty: this.levelConfig.difficulty,
      completionRate: rate,
    };
  }
}
