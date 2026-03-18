/**
 * 🎯 SOLID REFACTOR: PlayerMovementController
 * Responsabilité unique : Gérer le mouvement et la physique du joueur
 */
export class PlayerMovementController {
  player: any;
  sprite: any;
  speed: number;
  velocity: { x: number; y: number };
  canMove: boolean;
  lastPosition: { x: number; y: number };
  isSprinting: boolean;
  sprintSpeed: number;
  worldBounds: { x: number; y: number; width: number; height: number };

  constructor(player: any) {
    this.player = player;
    this.sprite = player.sprite;

    this.speed = 150;
    this.velocity = { x: 0, y: 0 };
    this.canMove = true;
    this.lastPosition = { x: 0, y: 0 };
    this.isSprinting = false;
    this.sprintSpeed = 220;

    this.worldBounds = {
      x: 0,
      y: 0,
      width: player.scene.sys.canvas.width,
      height: player.scene.sys.canvas.height,
    };

    this.setupPhysics();
  }

  setupPhysics(): void {
    if (this.sprite.body) {
      this.sprite.body.setMass(5000);
      this.sprite.body.setDrag(60, 60);
      this.sprite.body.setBounce(0.1, 0.1);
      console.log('💪 PlayerMovement: masse=5000, drag=60, bounce=0.1');
    }
  }

  setMovement(directions: { up: boolean; down: boolean; left: boolean; right: boolean }, forceMovement = false): void {
    if (!this.sprite) return;
    if (!forceMovement && (!this.canMove || !this.player.inputEnabled || this.player.shoutBehavior?.isScreaming)) return;

    this.velocity.x = 0;
    this.velocity.y = 0;

    if (directions.up) this.velocity.y -= 1;
    if (directions.down) this.velocity.y += 1;
    if (directions.left) this.velocity.x -= 1;
    if (directions.right) this.velocity.x += 1;

    const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (magnitude > 0) {
      this.velocity.x = this.velocity.x / magnitude;
      this.velocity.y = this.velocity.y / magnitude;

      const finalMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (finalMagnitude > 1.0) {
        this.velocity.x = this.velocity.x / finalMagnitude;
        this.velocity.y = this.velocity.y / finalMagnitude;
      }
    }

    if (forceMovement && this.sprite.body) {
      const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
      const physicsVelocityX = this.velocity.x * currentSpeed;
      const physicsVelocityY = this.velocity.y * currentSpeed;

      this.sprite.body.setVelocity(physicsVelocityX, physicsVelocityY);
    }
  }

  stopMovement(): void {
    this.setMovement({ up: false, down: false, left: false, right: false }, true);
  }

  update(delta: number): void {
    if (!this.sprite) return;

    const clampedDelta = Math.min(delta, 33);

    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;

    const isMoving = this.velocity.x !== 0 || this.velocity.y !== 0;

    if (isMoving) {
      if (this.sprite.body) {
        const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
        this.sprite.body.setVelocity(
          this.velocity.x * currentSpeed,
          this.velocity.y * currentSpeed
        );
      }
    } else {
      if (this.sprite.body) {
        this.sprite.body.setVelocity(0, 0);
      }
    }
  }

  setSprintEnabled(enabled: boolean): void {
    this.isSprinting = !!enabled;
  }

  getRealVelocity(): { x: number; y: number } {
    return this.sprite.body
      ? {
          x: this.sprite.body.velocity.x,
          y: this.sprite.body.velocity.y,
        }
      : this.velocity;
  }

  isMoving(): boolean {
    return this.velocity.x !== 0 || this.velocity.y !== 0;
  }

  setWorldBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.worldBounds = bounds;
  }

  isPositionValid(x: number, y: number): boolean {
    const sprite = this.sprite;
    if (!sprite) return false;

    const halfWidth = sprite.displayWidth / 2;
    const halfHeight = sprite.displayHeight / 2;
    const screenWidth = this.player.scene.scale.width;
    const screenHeight = this.player.scene.scale.height;

    return (
      x - halfWidth >= 0 &&
      x + halfWidth <= screenWidth &&
      y - halfHeight >= 0 &&
      y + halfHeight <= screenHeight
    );
  }

  setCanMove(canMove: boolean): void {
    this.canMove = canMove;
  }

  destroy(): void {
    console.log('🚮 PlayerMovementController détruit');
  }
}
