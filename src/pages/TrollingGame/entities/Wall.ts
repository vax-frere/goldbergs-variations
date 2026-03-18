import type { Bounds, ICollidable } from '../types/types';

export class Wall implements ICollidable {
  scene: any;
  x: number;
  y: number;
  entityType: string;
  isStatic: boolean;
  width: number;
  height: number;
  body: any;
  id: string;

  constructor(scene: any, x: number, y: number, invisible = true) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.entityType = 'wall';
    this.isStatic = true;

    this.width = 40;
    this.height = 40;

    this.body = this.scene.physics.add.staticBody(x, y, this.width, this.height);

    this.body.setSize(this.width, this.height);
    this.body.setOffset(0, 0);

    this.body.entity = this;

    this.id = `wall_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🧱 Mur créé (collision only) à (${x}, ${y}) - taille: ${this.width}x${this.height}`);
  }

  get sprite() {
    return {
      x: this.x,
      y: this.y,
      body: this.body,
      destroy: () => {
        if (this.body) {
          this.body.destroy();
          this.body = null;
        }
      },
    };
  }

  update(_delta: number): void {
    // Les murs n'ont pas besoin de mise à jour
  }

  onCollision(other: any): void {
    if (other.entityType === 'player') {
      // Le joueur gère sa propre collision avec les murs
    }
  }

  getBounds(): Bounds {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  isBlocking(): boolean {
    return true;
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.body) {
      this.body.setSize(width, height);
    }
  }

  setEnabled(enabled: boolean): void {
    if (this.body) {
      this.body.enable = enabled;
    }
  }

  destroy(): void {
    if (this.body) {
      this.body.destroy();
      this.body = null;
    }
  }
}
