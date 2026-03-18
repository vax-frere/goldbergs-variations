/**
 * 🎯 SYSTÈME SOLID : StarEffectBehavior
 * Gère l'animation d'étoile qui apparaît au-dessus des NPCs quand ils commencent à suivre
 */
export class StarEffectBehavior {
  owner: any;
  scene: any;
  activeStars: any[];
  config: Record<string, any>;
  depthSortingSystem: any;

  constructor(owner: any, config: Record<string, any> = {}) {
    this.owner = owner;
    this.scene = owner.scene;
    this.activeStars = [];

    this.config = {
      offsetY: config.offsetY || -60,
      offsetX: config.offsetX || 0,
      scale: config.scale || 0.4,
      duration: config.duration || 800,
      moveUpDistance: config.moveUpDistance || 30,
      fadeOutDelay: config.fadeOutDelay || 200,
      ...config,
    };

    this.depthSortingSystem = this.scene.depthSortingSystem;
  }

  createStarEffect(): any {
    if (!this.owner.sprite) return;

    const sprite = this.scene.add.image(0, 0, 'star-effect');
    sprite.setScale(this.config.scale);
    sprite.setAlpha(1.0);
    sprite.setOrigin(0.5, 0.5);

    const star = {
      type: 'star-effect',
      entityType: 'star-effect',
      sprite: sprite,
      startTime: Date.now(),
      duration: this.config.duration,
      offsetX: this.config.offsetX,
      offsetY: this.config.offsetY,
      initialY: this.owner.sprite.y + this.config.offsetY,
      targetY:
        this.owner.sprite.y +
        this.config.offsetY -
        this.config.moveUpDistance,
      scale: this.config.scale,
      alpha: 1.0,
    };

    this.activeStars.push(star);

    this.updateStarPosition(star);

    if (this.depthSortingSystem) {
      this.depthSortingSystem.addEntity(star, 'effects');
    }

    console.log('⭐ Étoile créée pour NPC follow effect');
    return star;
  }

  updateStarPosition(star: any): void {
    if (!star.sprite || !this.owner.sprite) return;

    star.sprite.x = this.owner.sprite.x + star.offsetX;

    const elapsed = Date.now() - star.startTime;
    const progress = Math.min(elapsed / star.duration, 1.0);

    const easeProgress = this.easeOutQuad(progress);
    star.sprite.y =
      star.initialY + (star.targetY - star.initialY) * easeProgress;
  }

  easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  update(_delta: number): void {
    const currentTime = Date.now();

    for (let i = this.activeStars.length - 1; i >= 0; i--) {
      const star = this.activeStars[i];
      const elapsed = currentTime - star.startTime;
      const progress = elapsed / star.duration;

      this.updateStarPosition(star);

      if (elapsed > this.config.fadeOutDelay) {
        const fadeProgress =
          (elapsed - this.config.fadeOutDelay) /
          (star.duration - this.config.fadeOutDelay);
        const newAlpha = Math.max(0, 1.0 - fadeProgress);
        star.sprite.setAlpha(newAlpha);
      }

      if (elapsed >= star.duration) {
        if (this.depthSortingSystem) {
          this.depthSortingSystem.removeEntity(star);
        }

        star.sprite.destroy();
        this.activeStars.splice(i, 1);
        console.log('⭐ Étoile détruite (animation terminée)');
      }
    }
  }

  destroy(): void {
    this.activeStars.forEach((star: any) => {
      if (this.depthSortingSystem) {
        this.depthSortingSystem.removeEntity(star);
      }

      if (star.sprite) {
        star.sprite.destroy();
      }
    });
    this.activeStars = [];
    console.log('⭐ StarEffectBehavior détruit');
  }

  getActiveStarCount(): number {
    return this.activeStars.length;
  }

  hasActiveStars(): boolean {
    return this.activeStars.length > 0;
  }
}
