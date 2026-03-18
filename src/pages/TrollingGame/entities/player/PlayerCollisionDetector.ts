/**
 * 🎯 SOLID REFACTOR: PlayerCollisionDetector
 * Responsabilité unique : Détecter et gérer les collisions du joueur avec les NPCs
 */
export class PlayerCollisionDetector {
  player: any;
  sprite: any;
  baseTremblingCollisionRadius: number;
  tremblingCollisionRadius: number;

  constructor(player: any) {
    this.player = player;
    this.sprite = player.sprite;

    this.baseTremblingCollisionRadius = 70;
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius;

    console.log('🔍 PlayerCollisionDetector initialisé - rayon trembling:', this.tremblingCollisionRadius);
  }

  checkTremblingNpcCollisions(): void {
    if (!this.sprite || !this.player.scene.currentLevel) return;

    const entityManager = this.player.scene.currentLevel.entityManager;
    if (!entityManager) return;

    const npcs = entityManager.getNpcs();
    const playerPos = { x: this.sprite.x, y: this.sprite.y };

    npcs.forEach((npc: any) => {
      if (!npc || !npc.sprite || npc.state !== 'trembling') return;

      const npcPos = { x: npc.sprite.x, y: npc.sprite.y };
      const distance = this.calculateDistance(playerPos, npcPos);

      if (distance <= this.tremblingCollisionRadius) {
        this.handleTremblingNpcCollision(npc);
      }
    });
  }

  handleTremblingNpcCollision(npc: any): void {
    const currentLevel = this.player.scene.currentLevel;
    if (currentLevel && currentLevel.disableNpcFollowing) {
      return;
    }

    if (npc.canFollow === false) {
      return;
    }

    if (this.player.followerManager) {
      const success = this.player.followerManager.addFollower(npc);
      if (success) {
        npc.startFollowing(this.player);
        console.log(`🤝 NPC ${npc.entityId || 'unknown'} commence à suivre le joueur`);
      }
    }
  }

  calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  updateCollisionRadius(followerCount: number): void {
    const multiplier = 1 + followerCount * (this.player.tremblingRadiusMultiplierPerFollower || 0.01);
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius * multiplier;
  }

  getTremblingCollisionRadius(): number {
    return this.tremblingCollisionRadius;
  }

  setBaseTremblingCollisionRadius(radius: number): void {
    this.baseTremblingCollisionRadius = Math.max(10, radius);
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius;
    console.log('🔍 Nouveau rayon de collision trembling:', this.baseTremblingCollisionRadius);
  }

  isCollidingWithPoint(x: number, y: number, radius = 10): boolean {
    if (!this.sprite) return false;

    const distance = this.calculateDistance(
      { x: this.sprite.x, y: this.sprite.y },
      { x, y }
    );

    return distance <= radius;
  }

  isCollidingWithRect(x: number, y: number, width: number, height: number): boolean {
    if (!this.sprite) return false;

    const playerX = this.sprite.x;
    const playerY = this.sprite.y;
    const playerRadius = this.sprite.displayWidth / 2;

    const closestX = Math.max(x, Math.min(playerX, x + width));
    const closestY = Math.max(y, Math.min(playerY, y + height));

    const distance = this.calculateDistance(
      { x: playerX, y: playerY },
      { x: closestX, y: closestY }
    );

    return distance <= playerRadius;
  }

  getNpcsInRadius(radius: number, filterState: string | null = null): any[] {
    if (!this.player.scene.currentLevel) return [];

    const entityManager = this.player.scene.currentLevel.entityManager;
    if (!entityManager) return [];

    const npcs = entityManager.getNpcs();
    const playerPos = { x: this.sprite.x, y: this.sprite.y };

    return npcs.filter((npc: any) => {
      if (!npc || !npc.sprite) return false;
      if (filterState && npc.state !== filterState) return false;

      const npcPos = { x: npc.sprite.x, y: npc.sprite.y };
      const distance = this.calculateDistance(playerPos, npcPos);

      return distance <= radius;
    });
  }

  update(delta: number): void {
    if (this.player.followerManager) {
      const followerCount = this.player.followerManager.getFollowerCount();
      this.updateCollisionRadius(followerCount);
    }

    this.checkTremblingNpcCollisions();
  }

  onCollision(other: any): void {
    if (!this.sprite || !other) return;

    if (other.entityType === 'npc') {
      this.handleNpcCollision(other);
    } else if (other.entityType === 'wall') {
      this.handleWallCollision(other);
    }
  }

  handleNpcCollision(npc: any): void {
    console.log('🔄 Collision Player-NPC détectée:', npc.entityId || 'unknown');
  }

  handleWallCollision(_wall: any): void {
    console.log('🧱 Collision Player-Wall détectée');
  }

  destroy(): void {
    console.log('🚮 PlayerCollisionDetector détruit');
  }
}
