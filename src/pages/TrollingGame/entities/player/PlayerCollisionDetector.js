/**
 * 🎯 SOLID REFACTOR: PlayerCollisionDetector
 * Responsabilité unique : Détecter et gérer les collisions du joueur avec les NPCs
 */
export class PlayerCollisionDetector {
  constructor(player) {
    this.player = player;
    this.sprite = player.sprite;
    
    // Configuration des rayons de collision
    this.baseTremblingCollisionRadius = 70;
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius;
    
    console.log('🔍 PlayerCollisionDetector initialisé - rayon trembling:', this.tremblingCollisionRadius);
  }

  /**
   * Vérifier les collisions avec les NPCs qui tremblent
   */
  checkTremblingNpcCollisions() {
    if (!this.sprite || !this.player.scene.currentLevel) return;
    
    const entityManager = this.player.scene.currentLevel.entityManager;
    if (!entityManager) return;
    
const npcs = entityManager.getNpcs();
    const playerPos = { x: this.sprite.x, y: this.sprite.y };
    
    npcs.forEach(npc => {
      if (!npc || !npc.sprite || npc.state !== 'trembling') return;
      
      const npcPos = { x: npc.sprite.x, y: npc.sprite.y };
      const distance = this.calculateDistance(playerPos, npcPos);
      
      if (distance <= this.tremblingCollisionRadius) {
        this.handleTremblingNpcCollision(npc);
      }
    });
  }

  /**
   * Gérer la collision avec un NPC qui tremble
   */
  handleTremblingNpcCollision(npc) {
    // Vérifier si le niveau actuel permet les followers
    const currentLevel = this.player.scene.currentLevel;
    if (currentLevel && currentLevel.disableNpcFollowing) {
      // Dans Shepherd's Gate, les NPCs ne peuvent pas suivre
      return;
    }
    
    // Vérifier si le NPC peut devenir un follower
    if (npc.canFollow === false) {
      return;
    }
    
    // Ajouter le NPC comme follower via le FollowerManager
    if (this.player.followerManager) {
      const success = this.player.followerManager.addFollower(npc);
      if (success) {
        npc.startFollowing(this.player);
        console.log(`🤝 NPC ${npc.entityId || 'unknown'} commence à suivre le joueur`);
      }
    }
  }

  /**
   * Calculer la distance entre deux points
   */
  calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Mettre à jour le rayon de collision basé sur le nombre de followers
   */
  updateCollisionRadius(followerCount) {
    const multiplier = 1 + (followerCount * (this.player.tremblingRadiusMultiplierPerFollower || 0.01));
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius * multiplier;
  }

  /**
   * Obtenir le rayon de collision actuel
   */
  getTremblingCollisionRadius() {
    return this.tremblingCollisionRadius;
  }

  /**
   * Définir le rayon de collision de base
   */
  setBaseTremblingCollisionRadius(radius) {
    this.baseTremblingCollisionRadius = Math.max(10, radius);
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius;
    console.log('🔍 Nouveau rayon de collision trembling:', this.baseTremblingCollisionRadius);
  }

  /**
   * Vérifier collision avec un point spécifique
   */
  isCollidingWithPoint(x, y, radius = 10) {
    if (!this.sprite) return false;
    
    const distance = this.calculateDistance(
      { x: this.sprite.x, y: this.sprite.y },
      { x, y }
    );
    
    return distance <= radius;
  }

  /**
   * Vérifier collision avec un rectangle
   */
  isCollidingWithRect(x, y, width, height) {
    if (!this.sprite) return false;
    
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;
    const playerRadius = this.sprite.displayWidth / 2;
    
    // Collision cercle-rectangle
    const closestX = Math.max(x, Math.min(playerX, x + width));
    const closestY = Math.max(y, Math.min(playerY, y + height));
    
    const distance = this.calculateDistance(
      { x: playerX, y: playerY },
      { x: closestX, y: closestY }
    );
    
    return distance <= playerRadius;
  }

  /**
   * Obtenir tous les NPCs dans un rayon donné
   */
  getNpcsInRadius(radius, filterState = null) {
    if (!this.player.scene.currentLevel) return [];
    
    const entityManager = this.player.scene.currentLevel.entityManager;
    if (!entityManager) return [];
    
    const npcs = entityManager.getNpcs();
    const playerPos = { x: this.sprite.x, y: this.sprite.y };
    
    return npcs.filter(npc => {
      if (!npc || !npc.sprite) return false;
      if (filterState && npc.state !== filterState) return false;
      
      const npcPos = { x: npc.sprite.x, y: npc.sprite.y };
      const distance = this.calculateDistance(playerPos, npcPos);
      
      return distance <= radius;
    });
  }

  /**
   * Mettre à jour (appelé chaque frame)
   */
  update(delta) {
    // Mettre à jour le rayon basé sur le nombre de followers
    if (this.player.followerManager) {
      const followerCount = this.player.followerManager.getFollowerCount();
      this.updateCollisionRadius(followerCount);
    }
    
    // Vérifier les collisions avec les NPCs tremblants
    this.checkTremblingNpcCollisions();
  }

  /**
   * Gérer les collisions générales (appelé par le système de collision)
   */
  onCollision(other) {
    if (!this.sprite || !other) return;
    
    // Logique de collision spécifique selon le type d'objet
    if (other.entityType === 'npc') {
      this.handleNpcCollision(other);
    } else if (other.entityType === 'wall') {
      this.handleWallCollision(other);
    }
  }

  /**
   * Gérer collision avec un NPC
   */
  handleNpcCollision(npc) {
    // Collision avec NPCs - délégué aux systèmes spécialisés
    console.log('🔄 Collision Player-NPC détectée:', npc.entityId || 'unknown');
  }

  /**
   * Gérer collision avec un mur
   */
  handleWallCollision(wall) {
    // Collision avec mur - pas d'action spéciale nécessaire
    // La physique Phaser gère automatiquement l'arrêt
    console.log('🧱 Collision Player-Wall détectée');
  }

  /**
   * Nettoyer
   */
  destroy() {
    console.log('🚮 PlayerCollisionDetector détruit');
  }
} 