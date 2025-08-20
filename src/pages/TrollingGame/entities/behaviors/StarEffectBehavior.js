/**
 * 🎯 SYSTÈME SOLID : StarEffectBehavior
 * Gère l'animation d'étoile qui apparaît au-dessus des NPCs quand ils commencent à suivre
 */
export class StarEffectBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement (typiquement un Npc)
    this.scene = owner.scene;
    this.activeStars = []; // Étoiles actives
    
    // Configuration par défaut, peut être surchargée
    this.config = {
      offsetY: config.offsetY || -60, // Distance au-dessus de l'entité
      offsetX: config.offsetX || 0,   // Centré horizontalement
      scale: config.scale || 0.4,     // Taille de l'étoile
      duration: config.duration || 800, // Durée en millisecondes (rapide)
      moveUpDistance: config.moveUpDistance || 30, // Distance vers le haut
      fadeOutDelay: config.fadeOutDelay || 200, // Délai avant fade out (ms)
      ...config
    };
    
    // Référence au système de depth sorting pour les étoiles
    this.depthSortingSystem = this.scene.depthSortingSystem;
  }

  /**
   * Créer une étoile qui apparaît et monte avec fade out
   */
  createStarEffect() {
    if (!this.owner.sprite) return;
    
    // Créer le sprite d'étoile
    const sprite = this.scene.add.image(0, 0, 'star-effect');
    sprite.setScale(this.config.scale);
    sprite.setAlpha(1.0);
    sprite.setOrigin(0.5, 0.5); // Centré
    
    const star = {
      type: 'star-effect',
      entityType: 'star-effect', // Pour le depth sorting
      sprite: sprite,
      startTime: Date.now(),
      duration: this.config.duration,
      offsetX: this.config.offsetX,
      offsetY: this.config.offsetY,
      initialY: this.owner.sprite.y + this.config.offsetY,
      targetY: this.owner.sprite.y + this.config.offsetY - this.config.moveUpDistance,
      scale: this.config.scale,
      alpha: 1.0
    };
    
    // Ajouter à la liste des étoiles actives
    this.activeStars.push(star);
    
    // Positionner l'étoile
    this.updateStarPosition(star);
    
    // Ajouter au système de depth sorting (layer effects)
    if (this.depthSortingSystem) {
      this.depthSortingSystem.addEntity(star, 'effects');
    }
    
    console.log('⭐ Étoile créée pour NPC follow effect');
    return star;
  }

  /**
   * Positionner une étoile par rapport à l'entité propriétaire
   */
  updateStarPosition(star) {
    if (!star.sprite || !this.owner.sprite) return;
    
    // Position X fixe par rapport au NPC
    star.sprite.x = this.owner.sprite.x + star.offsetX;
    
    // Position Y animée (monte vers le haut)
    const elapsed = Date.now() - star.startTime;
    const progress = Math.min(elapsed / star.duration, 1.0);
    
    // Interpolation smooth de la position Y
    const easeProgress = this.easeOutQuad(progress);
    star.sprite.y = star.initialY + (star.targetY - star.initialY) * easeProgress;
  }

  /**
   * Fonction d'easing smooth pour l'animation
   */
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  /**
   * Mettre à jour toutes les étoiles actives
   */
  update(delta) {
    const currentTime = Date.now();
    
    for (let i = this.activeStars.length - 1; i >= 0; i--) {
      const star = this.activeStars[i];
      const elapsed = currentTime - star.startTime;
      const progress = elapsed / star.duration;
      
      // Mettre à jour la position (animation vers le haut)
      this.updateStarPosition(star);
      
      // Animation de fade out après le délai
      if (elapsed > this.config.fadeOutDelay) {
        const fadeProgress = (elapsed - this.config.fadeOutDelay) / (star.duration - this.config.fadeOutDelay);
        const newAlpha = Math.max(0, 1.0 - fadeProgress);
        star.sprite.setAlpha(newAlpha);
      }
      
      // Supprimer si terminé
      if (elapsed >= star.duration) {
        // Retirer du système de depth sorting
        if (this.depthSortingSystem) {
          this.depthSortingSystem.removeEntity(star);
        }
        
        star.sprite.destroy();
        this.activeStars.splice(i, 1);
        console.log('⭐ Étoile détruite (animation terminée)');
      }
    }
  }

  /**
   * Nettoyer toutes les étoiles
   */
  destroy() {
    this.activeStars.forEach(star => {
      // Retirer du système de depth sorting
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

  /**
   * Obtenir le nombre d'étoiles actives
   */
  getActiveStarCount() {
    return this.activeStars.length;
  }

  /**
   * Vérifier si des étoiles sont actives
   */
  hasActiveStars() {
    return this.activeStars.length > 0;
  }
} 