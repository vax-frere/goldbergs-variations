import Phaser from 'phaser';
import { BaseEntity } from './BaseEntity';
import { PlayerState } from '../core/PlayerState';
import { ShoutBehavior } from './behaviors/ShoutBehavior';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';
import { TrailBehavior } from './behaviors/TrailBehavior';

import { PlayerMovementController } from './player/PlayerMovementController';
import { PlayerFollowerManager } from './player/PlayerFollowerManager';
import { PlayerCollisionDetector } from './player/PlayerCollisionDetector';
import { PlayerForceCalculator } from './player/PlayerForceCalculator';
import { PlayerDebugRenderer } from './player/PlayerDebugRenderer';

/**
 * 🎯 SOLID REFACTOR: Player simplifié
 * Responsabilité unique : Coordonner les composants du joueur
 */
export class Player extends BaseEntity {
  playerState: PlayerState;
  inputEnabled: boolean;
  movementController: PlayerMovementController;
  followerManager: PlayerFollowerManager;
  collisionDetector: PlayerCollisionDetector;
  forceCalculator: PlayerForceCalculator;
  debugRenderer: PlayerDebugRenderer;
  animationBehavior: CharacterAnimationBehavior;
  shoutBehavior: ShoutBehavior;
  trailBehavior: TrailBehavior;
  canShout: boolean;
  shoutCooldown: number;
  lastShoutTime: number;
  tremblingRadiusMultiplierPerFollower: number;
  aura: any;
  _auraLayers: Array<{ radius: number; color: number; alpha: number }>;

  constructor(scene: any, x: number, y: number) {
    super(scene, x, y, 'character-spritesheet');
    this.entityType = 'player';

    this.sprite.setScale(0.6);

    this._createAura(scene);

    this.playerState = new PlayerState(this);
    this.inputEnabled = false;

    this.movementController = new PlayerMovementController(this);
    this.followerManager = new PlayerFollowerManager(this);
    this.collisionDetector = new PlayerCollisionDetector(this);
    this.forceCalculator = new PlayerForceCalculator(this);
    this.debugRenderer = new PlayerDebugRenderer(this);

    this.speed = 150;

    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(1.2, 0.5);

    this.shoutBehavior = new ShoutBehavior(this, {
      offsetX: 60,
      offsetY: -10,
      scale: 0.3,
      duration: 750,
    });

    this.trailBehavior = new TrailBehavior(this, {
      chainLength: 20,
      linkDistance: 30,
      constraintStrength: 0.9,
      damping: 0.88,
      lineWidth: 3,
      lineColor: 0x00ff88,
      alpha: 0.8,
      debugOnly: true,
      followersPerPoint: 8,
      followPointDistance: 80,
    });

    this.canShout = true;
    this.shoutCooldown = 500;
    this.lastShoutTime = 0;

    this.tremblingRadiusMultiplierPerFollower = 0.01;

    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this, 'characters');
    }

    console.log('🎮 Player SOLID créé avec composants spécialisés');
  }

  _createAura(scene: any): void {
    this.aura = scene.add.graphics();
    this.aura.setDepth(999);
    this._auraLayers = [
      { radius: 70, color: 0x2a0845, alpha: 0.06 },
      { radius: 55, color: 0x320a50, alpha: 0.08 },
      { radius: 40, color: 0x3d0f5c, alpha: 0.1 },
      { radius: 25, color: 0x4a1568, alpha: 0.12 },
    ];
  }

  _updateAura(): void {
    if (!this.aura || !this.sprite) return;
    this.aura.clear();
    const px = this.sprite.x;
    const py = this.sprite.y;
    for (const l of this._auraLayers) {
      this.aura.fillStyle(l.color, l.alpha);
      this.aura.fillCircle(px, py, l.radius);
    }
    this.aura.setDepth(this.sprite.depth - 1);
  }

  setMovement(directions: { up: boolean; down: boolean; left: boolean; right: boolean }, forceMovement = false): void {
    this.movementController.setMovement(directions, forceMovement);
  }

  shout(): void {
    const currentTime = Date.now();

    if (currentTime - this.lastShoutTime < this.shoutCooldown) {
      return;
    }

    if (!this.canShout) {
      return;
    }

    if (this.shoutBehavior && this.shoutBehavior.isScreaming) {
      return;
    }

    this.lastShoutTime = currentTime;

    this.updateShoutPower();

    if (this.scene.soundManager) {
      this.scene.soundManager.playRandomChildShout();
    }

    this.createShoutShape();

    this.makeFollowersShout();

    this.affectNearbyNpcs();

    const followerCount = this.followerManager.getFollowerCount();
    const force = this.forceCalculator.getCurrentShoutForce();
    const radius = this.forceCalculator.getCurrentShoutRadius();

    console.log(
      `📢 Joueur crie ! Force: ${force.toFixed(2)}, Rayon: ${radius.toFixed(0)}px, Suiveurs: ${followerCount}`
    );
  }

  updateShoutPower(): void {
    this.forceCalculator.updateCalculations();

    if (this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.forceUpdateDebugVisuals();
    }
  }

  createShoutShape(): void {
    this.shoutBehavior.shout();
  }

  makeFollowersShout(): void {
    const followers = this.followerManager.getFollowers();
    const followerCount = followers.length;

    if (followerCount === 0) return;

    const shoutersCount = Math.max(1, Math.floor(followerCount * 0.2));

    const shuffledFollowers = [...followers].sort(() => Math.random() - 0.5);
    const shoutersArray = shuffledFollowers.slice(0, shoutersCount);

    console.log(`📢 ${shoutersCount}/${followerCount} followers vont crier (20%)`);

    if (shoutersCount > 0 && this.scene.soundManager) {
      this.scene.soundManager.playMultipleChildShouts(shoutersCount);
    }

    shoutersArray.forEach((follower: any, index: number) => {
      if (follower && follower.shout) {
        const baseDelay = index * 25;
        const randomOffset = Math.random() * 300;
        const totalDelay = baseDelay + randomOffset;

        setTimeout(() => {
          follower.shout();
        }, totalDelay);
      }
    });
  }

  affectNearbyNpcs(): void {
    const entityManager = this.scene.currentLevel?.entityManager;
    if (!entityManager) return;

    const npcs = entityManager.getNpcs();
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;
    const currentRadius = this.forceCalculator.getCurrentShoutRadius();
    const currentForce = this.forceCalculator.getCurrentShoutForce();

    let affectedCount = 0;

    npcs.forEach((npc: any) => {
      if (!npc.sprite) return;

      const distance = Phaser.Math.Distance.Between(
        playerX,
        playerY,
        npc.sprite.x,
        npc.sprite.y
      );

      if (distance <= currentRadius) {
        npc.onShoutHit(currentForce, distance, currentRadius);
        affectedCount++;
      }
    });

    console.log(
      `💥 ${affectedCount} NPCs affectés par le cri dans un rayon de ${currentRadius.toFixed(0)}px`
    );
  }

  getFollowTargetPosition(follower: any): { x: number; y: number } {
    if (!this.trailBehavior) {
      return {
        x: this.sprite.x,
        y: this.sprite.y + 60,
      };
    }

    const followers = this.followerManager.getFollowers();
    const followerIndex = followers.indexOf(follower);

    if (followerIndex === -1) {
      if (follower.state === 'following' && follower.followTarget === this) {
        const added = this.followerManager.addFollower(follower);
        if (added) {
          return this.getFollowTargetPosition(follower);
        } else {
          return {
            x: this.sprite.x - 30,
            y: this.sprite.y + 80,
          };
        }
      } else {
        return {
          x: this.sprite.x + 30,
          y: this.sprite.y + 80,
        };
      }
    }

    const trailPoint = this.trailBehavior.getFollowPointForFollower(followerIndex);

    if (trailPoint) {
      return trailPoint;
    } else {
      console.error(
        `🚨 PAS DE TRAIL: Follower ${followerIndex} n'a pas reçu de point ! Génération d'urgence...`
      );

      const requiredPoints = Math.ceil(
        followers.length / this.trailBehavior.followersPerPoint
      );
      this.trailBehavior.forceMoreTrailPoints(requiredPoints);

      const secondAttempt = this.trailBehavior.getFollowPointForFollower(followerIndex);
      if (secondAttempt) {
        return secondAttempt;
      }

      console.error(`💀 DERNIÈRE CHANCE: Follower ${followerIndex} → Position d'urgence`);
      return {
        x: this.sprite.x + followerIndex * 20 - 100,
        y: this.sprite.y + 100,
      };
    }
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  setDebugEnabled(enabled: boolean): void {
    this.debugRenderer.setDebugEnabled(enabled);
  }

  setWorldBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.movementController.setWorldBounds(bounds);
  }

  clearAllFollowers(): void {
    this.followerManager.clearAllFollowers();
  }

  removeFollower(npc: any): boolean {
    return this.followerManager.removeFollower(npc);
  }

  setPosition(x: number, y: number): void {
    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }
  }

  get speed(): number {
    return this.movementController ? this.movementController.speed : 0;
  }

  set speed(value: number) {
    if (this.movementController) {
      this.movementController.speed = value;
    }
  }

  get velocity(): { x: number; y: number } {
    return this.movementController ? this.movementController.velocity : { x: 0, y: 0 };
  }

  set velocity(value: { x: number; y: number }) {
    if (this.movementController) {
      this.movementController.velocity = value;
    }
  }

  get followers(): any[] {
    return this.followerManager.getFollowers();
  }

  get currentShoutRadius(): number {
    return this.forceCalculator.getCurrentShoutRadius();
  }

  get currentShoutForce(): number {
    return this.forceCalculator.getCurrentShoutForce();
  }

  get tremblingCollisionRadius(): number {
    return this.collisionDetector.getTremblingCollisionRadius();
  }

  checkTremblingNpcCollisions(): void {
    return this.collisionDetector.checkTremblingNpcCollisions();
  }

  updateShoutRadiusDebug(): void {
    if (this.debugRenderer && this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.updateShoutRadiusDebug();
    }
  }

  updateTremblingRadiusDebug(): void {
    if (this.debugRenderer && this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.updateTremblingRadiusDebug();
    }
  }

  forceUpdateAllDebugVisuals(): void {
    if (this.debugRenderer) {
      this.debugRenderer.forceUpdateDebugVisuals();
    }
  }

  isPositionValid(x: number, y: number): boolean {
    return this.movementController.isPositionValid(x, y);
  }

  update(delta: number): void {
    if (!this.sprite) return;

    const clampedDelta = Math.min(delta, 33);

    this.movementController.update(clampedDelta);
    this.followerManager.update(clampedDelta);
    this.collisionDetector.update(clampedDelta);
    this.forceCalculator.update(clampedDelta);
    this.debugRenderer.update(clampedDelta);

    this.shoutBehavior.update(clampedDelta);
    this.animationBehavior.update(delta);
    this.trailBehavior.update(clampedDelta);

    this._updateAura();
  }

  onCollision(other: any): void {
    if (!this.sprite) return;
    this.collisionDetector.onCollision(other);
  }

  destroy(): void {
    if (this.animationBehavior && this.animationBehavior.resetState) {
      this.animationBehavior.resetState();
    }

    this.movementController.destroy();
    this.followerManager.destroy();
    this.collisionDetector.destroy();
    this.forceCalculator.destroy();
    this.debugRenderer.destroy();

    if (this.shoutBehavior) {
      this.shoutBehavior.destroy();
    }

    if (this.trailBehavior) {
      this.trailBehavior.destroy();
    }

    if (this.aura) {
      this.aura.destroy();
      this.aura = null;
    }

    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }

    console.log('🚮 Player SOLID détruit');
    super.destroy();
  }

  getPlayerStats(): Record<string, any> {
    return {
      position: { x: this.sprite.x, y: this.sprite.y },
      movement: {
        speed: this.speed,
        velocity: this.velocity,
        isMoving: this.movementController.isMoving(),
      },
      followers: this.followerManager.getStats(),
      forces: this.forceCalculator.getForceStats(),
      collision: {
        tremblingRadius: this.tremblingCollisionRadius,
      },
      debug: this.debugRenderer.getDebugStatus(),
      state: this.playerState.getState(),
      inputEnabled: this.inputEnabled,
    };
  }

  logStats(): void {
    const stats = this.getPlayerStats();
    console.log('📊 Player Stats:', stats);
  }
}
