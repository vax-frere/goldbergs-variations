/**
 * 🎯 SOLID REFACTOR: PlayerFollowerManager
 * Responsabilité unique : Gérer les NPCs qui suivent le joueur
 */
export class PlayerFollowerManager {
  constructor(player) {
    this.player = player;
    this.followers = [];
    this.maxFollowers = 40; // 🎯 Optimisé pour 40 places dans le trail
    
    console.log('👥 PlayerFollowerManager initialisé - max followers:', this.maxFollowers);
  }

  /**
   * Ajouter un NPC suiveur
   */
  addFollower(npc) {
    if (!npc || this.followers.includes(npc)) return false;
    
    if (this.followers.length >= this.maxFollowers) {
      console.warn('👥 Limite de followers atteinte:', this.maxFollowers);
      return false;
    }
    
    this.followers.push(npc);
    console.log(`👥 Nouveau suiveur: ${npc.entityId || 'unknown'} (total: ${this.followers.length})`);
    
    // Émettre event pour les systèmes qui écoutent
    this.player.scene.events.emit('followerAdded', { npc, totalFollowers: this.followers.length });
    
    return true;
  }

  /**
   * Retirer un NPC suiveur
   */
  removeFollower(npc) {
    const index = this.followers.indexOf(npc);
    if (index === -1) return false;
    
    this.followers.splice(index, 1);
    console.log(`👥 Suiveur retiré: ${npc.entityId || 'unknown'} (total: ${this.followers.length})`);
    
    // Émettre event pour les systèmes qui écoutent
    this.player.scene.events.emit('followerRemoved', { npc, totalFollowers: this.followers.length });
    
    return true;
  }

  /**
   * Vider tous les followers
   */
  clearAllFollowers() {
    const count = this.followers.length;
    
    // Notifier chaque NPC qu'il n'est plus suivi
    this.followers.forEach(npc => {
      if (npc && npc.stopFollowing) {
        npc.stopFollowing();
      }
    });
    
    this.followers = [];
    console.log(`👥 Tous les followers supprimés (${count} au total)`);
    
    // Émettre event global
    this.player.scene.events.emit('allFollowersCleared', { previousCount: count });
  }

  /**
   * Obtenir le nombre de followers
   */
  getFollowerCount() {
    return this.followers.length;
  }

  /**
   * Obtenir la liste des followers
   */
  getFollowers() {
    return [...this.followers]; // Copie pour éviter les modifications externes
  }

  /**
   * Vérifier si un NPC est un suiveur
   */
  isFollower(npc) {
    return this.followers.includes(npc);
  }

  /**
   * Obtenir le pourcentage de followers par rapport au maximum
   */
  getFollowerPercentage() {
    return (this.followers.length / this.maxFollowers) * 100;
  }

  /**
   * Vérifier si la limite de followers est atteinte
   */
  isAtMaxCapacity() {
    return this.followers.length >= this.maxFollowers;
  }

  /**
   * Définir la limite de followers
   */
  setMaxFollowers(max) {
    this.maxFollowers = Math.max(0, max);
    
    // Si on a trop de followers, retirer les plus récents
    while (this.followers.length > this.maxFollowers) {
      const removed = this.followers.pop();
      if (removed && removed.stopFollowing) {
        removed.stopFollowing();
      }
    }
    
    console.log(`👥 Limite de followers mise à jour: ${this.maxFollowers}`);
  }

  /**
   * Obtenir des statistiques sur les followers
   */
  getStats() {
    return {
      current: this.followers.length,
      max: this.maxFollowers,
      percentage: this.getFollowerPercentage(),
      remaining: Math.max(0, this.maxFollowers - this.followers.length)
    };
  }

  /**
   * Nettoyer les followers invalides (supprimés, etc.)
   */
  cleanup() {
    const initialCount = this.followers.length;
    
    this.followers = this.followers.filter(npc => {
      // Vérifier si le NPC existe encore et a un sprite valide
      return npc && npc.sprite && !npc.isDestroyed;
    });
    
    const removedCount = initialCount - this.followers.length;
    if (removedCount > 0) {
      console.log(`👥 Nettoyage: ${removedCount} followers invalides supprimés`);
    }
  }

  /**
   * Mettre à jour (appelé chaque frame si nécessaire)
   */
  update(delta) {
    // Nettoyage périodique des followers invalides
    if (Math.random() < 0.01) { // 1% de chance par frame (environ 1 fois par seconde à 60fps)
      this.cleanup();
    }
  }

  /**
   * Nettoyer complètement
   */
  destroy() {
    this.clearAllFollowers();
    console.log('🚮 PlayerFollowerManager détruit');
  }
} 