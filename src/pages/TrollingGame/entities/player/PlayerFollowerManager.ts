/**
 * 🎯 SOLID REFACTOR: PlayerFollowerManager
 * Responsabilité unique : Gérer les NPCs qui suivent le joueur
 */
export class PlayerFollowerManager {
  player: any;
  followers: any[];
  maxFollowers: number;

  constructor(player: any) {
    this.player = player;
    this.followers = [];
    this.maxFollowers = 40;

    console.log('👥 PlayerFollowerManager initialisé - max followers:', this.maxFollowers);
  }

  addFollower(npc: any): boolean {
    if (!npc || this.followers.includes(npc)) return false;

    if (this.followers.length >= this.maxFollowers) {
      console.warn('👥 Limite de followers atteinte:', this.maxFollowers);
      return false;
    }

    this.followers.push(npc);
    console.log(`👥 Nouveau suiveur: ${npc.entityId || 'unknown'} (total: ${this.followers.length})`);

    this.player.scene.events.emit('followerAdded', { npc, totalFollowers: this.followers.length });

    return true;
  }

  removeFollower(npc: any): boolean {
    const index = this.followers.indexOf(npc);
    if (index === -1) return false;

    this.followers.splice(index, 1);
    console.log(`👥 Suiveur retiré: ${npc.entityId || 'unknown'} (total: ${this.followers.length})`);

    this.player.scene.events.emit('followerRemoved', { npc, totalFollowers: this.followers.length });

    return true;
  }

  clearAllFollowers(): void {
    const count = this.followers.length;

    this.followers.forEach((npc: any) => {
      if (npc && npc.stopFollowing) {
        npc.stopFollowing();
      }
    });

    this.followers = [];
    console.log(`👥 Tous les followers supprimés (${count} au total)`);

    this.player.scene.events.emit('allFollowersCleared', { previousCount: count });
  }

  getFollowerCount(): number {
    return this.followers.length;
  }

  getFollowers(): any[] {
    return [...this.followers];
  }

  isFollower(npc: any): boolean {
    return this.followers.includes(npc);
  }

  getFollowerPercentage(): number {
    return (this.followers.length / this.maxFollowers) * 100;
  }

  isAtMaxCapacity(): boolean {
    return this.followers.length >= this.maxFollowers;
  }

  setMaxFollowers(max: number): void {
    this.maxFollowers = Math.max(0, max);

    while (this.followers.length > this.maxFollowers) {
      const removed = this.followers.pop();
      if (removed && removed.stopFollowing) {
        removed.stopFollowing();
      }
    }

    console.log(`👥 Limite de followers mise à jour: ${this.maxFollowers}`);
  }

  getStats(): Record<string, number> {
    return {
      current: this.followers.length,
      max: this.maxFollowers,
      percentage: this.getFollowerPercentage(),
      remaining: Math.max(0, this.maxFollowers - this.followers.length),
    };
  }

  cleanup(): void {
    const initialCount = this.followers.length;

    this.followers = this.followers.filter((npc: any) => {
      return npc && npc.sprite && !npc.isDestroyed;
    });

    const removedCount = initialCount - this.followers.length;
    if (removedCount > 0) {
      console.log(`👥 Nettoyage: ${removedCount} followers invalides supprimés`);
    }
  }

  update(_delta: number): void {
    if (Math.random() < 0.01) {
      this.cleanup();
    }
  }

  destroy(): void {
    this.clearAllFollowers();
    console.log('🚮 PlayerFollowerManager détruit');
  }
}
