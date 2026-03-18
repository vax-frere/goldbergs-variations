import { BaseEntity } from './BaseEntity';
import { NpcBehaviorController } from './behaviors/NpcBehaviorController';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';
import { StarEffectBehavior } from './behaviors/StarEffectBehavior';
import { ShoutBehavior } from './behaviors/ShoutBehavior';

import { NpcStateController } from './npc/NpcStateController';
import { NpcMovementController } from './npc/NpcMovementController';
import { NpcFollowController } from './npc/NpcFollowController';
import { NpcMigrationController } from './npc/NpcMigrationController';

import type { NpcConfig } from '../types/types';

/**
 * 🎯 SOLID REFACTOR: NPC simplifié
 * Responsabilité unique : Coordonner les composants du NPC
 */
export class Npc extends BaseEntity {
  groupId: number;
  stateController: NpcStateController;
  movementController: NpcMovementController;
  followController: NpcFollowController;
  migrationController: NpcMigrationController;
  behaviorController: NpcBehaviorController;
  animationBehavior: CharacterAnimationBehavior;
  starEffectBehavior: StarEffectBehavior;
  shoutBehavior: ShoutBehavior;
  _tempSpeed?: number;
  _tempVelocity?: { x: number; y: number };
  _tempTargetPosition?: { x: number; y: number };
  _tempState?: string;
  _tempFollowTarget?: any;

  constructor(scene: any, x: number, y: number, config: NpcConfig = {}) {
    super(scene, x, y, 'character-spritesheet', true);

    this.entityType = 'npc';
    this.groupId = config.groupId || 0;

    this.stateController = new NpcStateController(this);
    this.movementController = new NpcMovementController(this);
    this.followController = new NpcFollowController(this);
    this.migrationController = new NpcMigrationController(this);

    const speed = config.speed || this._tempSpeed || 150;
    this.movementController.setSpeed(speed);

    if (this._tempVelocity) {
      this.movementController.setVelocity(this._tempVelocity);
      delete this._tempVelocity;
    }

    if (this._tempTargetPosition) {
      this.migrationController.targetPosition = this._tempTargetPosition;
      delete this._tempTargetPosition;
    }

    if (this._tempState) {
      this.state = this._tempState;
      delete this._tempState;
    }

    if (this._tempFollowTarget !== undefined) {
      this.followTarget = this._tempFollowTarget;
      delete this._tempFollowTarget;
    }

    delete this._tempSpeed;

    this.behaviorController = new NpcBehaviorController(this, {
      trembleIntensity: 3,
    });

    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(0.8, 0.3);

    this.starEffectBehavior = new StarEffectBehavior(this, {
      offsetY: -65,
      scale: 0.2,
      duration: 600,
      moveUpDistance: 25,
      fadeOutDelay: 150,
    });

    this.shoutBehavior = new ShoutBehavior(this, {
      duration: 750,
    });

    this.setupSprite();

    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this, 'characters');
    }

    console.log(`🤖 NPC SOLID créé (ID: ${this.groupId}) avec composants spécialisés`);
  }

  setupSprite(): void {
    this.sprite.setScale(0.6);
    this.sprite.setTint(0xffffff);

    if (this.sprite.body) {
      this.sprite.body.setMass(0.5);
    }

    this.sprite.entity = this;
  }

  onShoutHit(force: number, distance: number, maxRadius: number): void {
    this.stateController.onShoutHit(force, distance, maxRadius);
  }

  startFollowing(player: any): void {
    this.stateController.startFollowing(player);

    this.followController.resetFollowState();

    this.starEffectBehavior.createStarEffect();

    if (this.scene.soundManager) {
      this.scene.soundManager.playTouch();
    }
  }

  stopFollowing(): void {
    this.stateController.returnToNormal();
    const followTarget = this.stateController.getFollowTarget();
    if (followTarget && followTarget.removeFollower) {
      followTarget.removeFollower(this);
    }
  }

  startMigration(targetPos: { x: number; y: number }): void {
    this.migrationController.startMigration(targetPos, this.stateController);
  }

  startOrganismMigration(
    targetPos: { x: number; y: number },
    organicVelocity: any,
  ): void {
    this.migrationController.startOrganismMigration(
      targetPos,
      organicVelocity,
      this.stateController
    );
  }

  returnToNormal(): void {
    this.stateController.returnToNormal();
    this.movementController.stop();
  }

  shout(): void {
    if (this.shoutBehavior) {
      this.shoutBehavior.shout();
    }
  }

  get state(): string {
    return this.stateController ? this.stateController.getState() : 'normal';
  }

  set state(value: string) {
    if (this.stateController) {
      if (value === 'normal') {
        this.stateController.returnToNormal();
      } else {
        this.stateController.setState(value);
      }
    } else {
      this._tempState = value;
    }
  }

  get velocity(): { x: number; y: number } {
    return this.movementController
      ? this.movementController.getVelocity()
      : { x: 0, y: 0 };
  }

  set velocity(value: { x: number; y: number }) {
    if (this.movementController) {
      this.movementController.setVelocity(value);
    } else {
      this._tempVelocity = value;
    }
  }

  get speed(): number {
    return this.movementController
      ? this.movementController.speed
      : this._tempSpeed || 150;
  }

  set speed(value: number) {
    if (this.movementController) {
      this.movementController.setSpeed(value);
    } else {
      this._tempSpeed = value;
    }
  }

  get followTarget(): any {
    return this.stateController ? this.stateController.getFollowTarget() : null;
  }

  set followTarget(value: any) {
    if (this.stateController) {
      if (value === null) {
        this.stateController.returnToNormal();
      } else {
        this.stateController.startFollowing(value);
      }
    } else {
      this._tempFollowTarget = value;
    }
  }

  get tremblingCollisionRadius(): number {
    return this.stateController
      ? this.stateController.getTremblingCollisionRadius()
      : 25;
  }

  get targetPosition(): { x: number; y: number } | null {
    return this.migrationController
      ? this.migrationController.getTargetPosition()
      : null;
  }

  set targetPosition(value: { x: number; y: number } | null) {
    if (this.migrationController) {
      this.migrationController.targetPosition = value;
    } else {
      this._tempTargetPosition = value;
    }
  }

  get migrationSpeed(): number {
    return this.migrationController
      ? this.migrationController.migrationSpeed
      : 120;
  }

  set migrationSpeed(value: number) {
    if (this.migrationController) {
      this.migrationController.migrationSpeed = value;
    }
  }

  get migrationTolerance(): number {
    return this.migrationController
      ? this.migrationController.migrationTolerance
      : 15;
  }

  set migrationTolerance(value: number) {
    if (this.migrationController) {
      this.migrationController.migrationTolerance = value;
    }
  }

  isAtRest(): boolean {
    return this.followController ? this.followController.isAtRest() : false;
  }

  isPositionValid(x: number, y: number): boolean {
    return this.movementController
      ? this.movementController.isPositionValid(x, y)
      : true;
  }

  calculateFollowingForces(delta: number): { x: number; y: number } {
    return this.followController
      ? this.followController.calculateFollowingForces(delta)
      : { x: 0, y: 0 };
  }

  getPlayer(): any {
    if (this.scene.currentLevel && this.scene.currentLevel.player) {
      return this.scene.currentLevel.player;
    }
    return null;
  }

  update(delta: number): void {
    if (!this.sprite) return;

    const clampedDelta = Math.min(delta, 33);

    this.stateController.updateStateLogic(clampedDelta);

    this.followController.updateFollowState(this.stateController);

    const currentState = this.stateController.getState();
    let finalVelocity = { x: 0, y: 0 };

    if (currentState === 'migrating') {
      this.migrationController.updateMigration(
        this.movementController,
        this.stateController,
        clampedDelta
      );
      finalVelocity = this.movementController.getVelocity();
    } else if (currentState === 'organism_migrating') {
      this.migrationController.updateOrganismMigration(
        this.movementController,
        this.stateController,
        clampedDelta
      );
      finalVelocity = this.movementController.getVelocity();
    } else {
      finalVelocity = this.movementController.calculateVelocity(
        currentState,
        this.stateController,
        clampedDelta
      );

      if (currentState === 'following') {
        const followingForces =
          this.followController.calculateFollowingForces(clampedDelta);
        finalVelocity.x += followingForces.x;
        finalVelocity.y += followingForces.y;
      }

      finalVelocity = this.movementController.capVelocity(
        finalVelocity,
        currentState
      );
    }

    this.movementController.applyVelocity(finalVelocity);

    this.movementController.update(clampedDelta);

    this.starEffectBehavior.update(clampedDelta);
    this.shoutBehavior.update(clampedDelta);
    this.animationBehavior.update(delta);
  }

  onCollision(other: any): void {
    if (!this.sprite) return;
    this.movementController.onCollision(other);
  }

  destroy(): void {
    if (this.animationBehavior && this.animationBehavior.resetState) {
      this.animationBehavior.resetState();
    }

    const followTarget = this.stateController.getFollowTarget();
    if (followTarget && followTarget.removeFollower) {
      followTarget.removeFollower(this);
    }

    this.stateController.destroy();
    this.movementController.destroy();
    this.followController.destroy();
    this.migrationController.destroy();

    if (this.starEffectBehavior) {
      this.starEffectBehavior.destroy();
    }

    if (this.shoutBehavior) {
      this.shoutBehavior.destroy();
    }

    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }

    console.log(`🚮 NPC SOLID détruit (ID: ${this.groupId})`);
    super.destroy();
  }

  getNpcStats(): Record<string, any> {
    return {
      groupId: this.groupId,
      position: { x: this.sprite.x, y: this.sprite.y },
      state: this.stateController.getState(),
      stateTimer: this.stateController.getStateTimer(),
      movement: {
        speed: this.speed,
        velocity: this.velocity,
        isMoving: this.movementController.isMoving(),
      },
      follow: this.followController.getFollowStats(),
      migration: {
        targetPosition: this.targetPosition,
        migrationSpeed: this.migrationSpeed,
        migrationTolerance: this.migrationTolerance,
      },
      trembling: {
        collisionRadius: this.tremblingCollisionRadius,
      },
    };
  }

  logStats(): void {
    const stats = this.getNpcStats();
    console.log(`📊 NPC ${this.groupId} Stats:`, stats);
  }
}
