import { IUpdateable } from '../core/interfaces';
import type { Bounds } from '../types/types';

export class BaseEntity extends IUpdateable {
  scene: any;
  sprite: any;
  id: string | null;
  entityType: string;
  speed: number;
  health: number;
  isActive: boolean;
  velocity: { x: number; y: number };
  lastPosition: { x: number; y: number };

  constructor(scene: any, x: number, y: number, texture: string, useSprite = false) {
    super();
    this.scene = scene;

    if (useSprite || texture === 'character-spritesheet') {
      this.sprite = scene.add.sprite(x, y, texture);
    } else {
      this.sprite = scene.add.image(x, y, texture);
    }

    this.sprite.setOrigin(0.5, 0.5);

    scene.physics.add.existing(this.sprite, false);

    const radius = 28;
    const offsetX = (this.sprite.width * this.sprite.scaleX) / 2 - radius;
    const offsetY = (this.sprite.height * this.sprite.scaleY) / 1.2 - radius;

    this.sprite.body.setCircle(radius, offsetX, offsetY);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0.0, 0.0);
    this.sprite.body.setDrag(10, 10);

    console.log(`🔵 Corps physique dynamique créé pour ${texture}`);

    this.id = null;
    this.entityType = this.constructor.name;

    this.speed = 100;
    this.health = 100;
    this.isActive = true;

    this.velocity = { x: 0, y: 0 };
    this.lastPosition = { x: x, y: y };
  }

  update(delta: number): void {
    if (!this.isActive) return;

    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
  }

  getPosition(): { x: number; y: number } {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
    };
  }

  setPosition(x: number, y: number): void {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  getBounds(): Bounds {
    return {
      x: this.sprite.x - this.sprite.displayWidth / 2,
      y: this.sprite.y - this.sprite.displayHeight / 2,
      width: this.sprite.displayWidth,
      height: this.sprite.displayHeight,
    };
  }

  isInBounds(bounds: Bounds): boolean {
    const entityBounds = this.getBounds();
    return (
      entityBounds.x >= bounds.x &&
      entityBounds.x + entityBounds.width <= bounds.x + bounds.width &&
      entityBounds.y >= bounds.y &&
      entityBounds.y + entityBounds.height <= bounds.y + bounds.height
    );
  }

  takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy();
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.health + amount, 100);
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.sprite.setVisible(active);
  }

  destroy(): void {
    this.isActive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  getDistanceTo(otherEntity: any): number {
    const pos1 = this.getPosition();
    const pos2 = otherEntity.getPosition();

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  getDirectionTo(otherEntity: any): number {
    const pos1 = this.getPosition();
    const pos2 = otherEntity.getPosition();

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;

    return Math.atan2(dy, dx);
  }
}
