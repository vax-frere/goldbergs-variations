/**
 * Re-exports and abstract classes for backward compatibility.
 * Types are in ../types/types.ts; this file provides runtime classes for extends.
 */
import type { Bounds } from '../types/types';

export { PlayerStates } from '../types/types';

/**
 * Abstract class for IUpdateable - BaseEntity extends this.
 */
export abstract class IUpdateable {
  update(_delta: number): void {
    throw new Error('Method update() must be implemented');
  }
}

/**
 * Abstract class for ICollidable - used for instanceof checks in CollisionSystem.
 */
export abstract class ICollidable {
  getBounds(): Bounds {
    throw new Error('Method getBounds() must be implemented');
  }
  onCollision(_other: unknown): void {
    throw new Error('Method onCollision() must be implemented');
  }
}

/**
 * Abstract class for IInteractable - used for instanceof checks in CollisionSystem.
 */
export abstract class IInteractable {
  onInteraction(_interactor: unknown): void {
    throw new Error('Method onInteraction() must be implemented');
  }
  canInteract(_interactor: unknown): boolean {
    throw new Error('Method canInteract() must be implemented');
  }
}

/**
 * Abstract class for IMovable - Player uses this.
 */
export abstract class IMovable {
  move(_direction: unknown, _speed: number): void {
    throw new Error('Method move() must be implemented');
  }
  getPosition(): { x: number; y: number } {
    throw new Error('Method getPosition() must be implemented');
  }
  setPosition(_x: number, _y: number): void {
    throw new Error('Method setPosition() must be implemented');
  }
}

/**
 * Base class for levels. Kept for old code (PiedPiperLevel, ShepherdsGateLevel, ScapegoatLevel) that extends it.
 */
export abstract class ILevel {
  abstract init(): void;
  abstract update(time: number, delta: number): void;
  abstract cleanup(): void;
}
