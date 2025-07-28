/**
 * Système réutilisable pour gérer les onomatopées de cri
 * Peut être utilisé par le Player et les NPCs pour éviter la duplication de code
 */
export class ShoutBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement (Player ou Npc)
    this.scene = owner.scene;
    this.shoutShapes = []; // Onomatopées actives
    
    // Configuration par défaut, peut être surchargée
    this.config = {
      offsetY: config.offsetY || -50, // Distance au-dessus de l'entité
      offsetX: config.offsetX || 0, // Décalage horizontal
      scale: config.scale || 0.3, // Taille de l'onomatopée
      duration: config.duration || 750, // Durée en millisecondes
      growthFactor: config.growthFactor || 0.2, // Facteur de croissance pendant le fade
      ...config
    };
    
    // Référence au système de depth sorting pour les onomatopées
    this.depthSortingSystem = this.scene.depthSortingSystem;
  }

  /**
   * Créer une onomatopée de cri
   * @param {number} onomatopeNumber - Numéro de l'onomatopée (1-11)
   * @param {number} delay - Délai avant d'afficher (en ms)
   */
  createShoutShape(onomatopeNumber, delay = 0) {
    if (!this.owner.sprite || !onomatopeNumber) return;
    
    const createShape = () => {
      const onomatopeKey = `onomatope-${onomatopeNumber}`;
      
      // Créer le sprite d'onomatopée
      const sprite = this.scene.add.image(0, 0, onomatopeKey);
      sprite.setScale(this.config.scale);
      sprite.setAlpha(1.0);
      
      const shape = {
        type: 'onomatope',
        entityType: 'onomatope', // Pour le depth sorting
        sprite: sprite,
        startTime: Date.now(),
        duration: this.config.duration,
        offsetX: this.config.offsetX,
        offsetY: this.config.offsetY,
        scale: this.config.scale,
        initialScale: this.config.scale,
        alpha: 1.0
      };
      
      // Ajouter à la liste des formes actives
      this.shoutShapes.push(shape);
      
      // Positionner l'onomatopée
      this.updateShapePosition(shape);
      
      // Ajouter au système de depth sorting (layer effects)
      if (this.depthSortingSystem) {
        this.depthSortingSystem.addEntity(shape, 'effects');
      }
      
      return shape;
    };

    if (delay > 0) {
      // Créer avec délai
      this.scene.time.delayedCall(delay, createShape);
    } else {
      // Créer immédiatement
      createShape();
    }
  }

  /**
   * Créer un cri spécial pour les NPCs followers (utilise npc-shout.svg)
   * @param {number} delay - Délai avant d'afficher (en ms)
   */
  createFollowerShout(delay = 0) {
    if (!this.owner.sprite) return;
    
    const createShape = () => {
      // Utiliser l'image spéciale pour les followers
      const sprite = this.scene.add.image(0, 0, 'npc-shout');
      sprite.setScale(this.config.scale);
      sprite.setAlpha(1.0);
      
      const shape = {
        type: 'npc-shout',
        entityType: 'npc-shout', // Pour le depth sorting
        sprite: sprite,
        startTime: Date.now(),
        duration: this.config.duration,
        offsetX: this.config.offsetX,
        offsetY: this.config.offsetY,
        scale: this.config.scale,
        initialScale: this.config.scale,
        alpha: 1.0
      };
      
      // Ajouter à la liste des formes actives
      this.shoutShapes.push(shape);
      
      // Positionner l'image
      this.updateShapePosition(shape);
      
      // Ajouter au système de depth sorting (layer effects)
      if (this.depthSortingSystem) {
        this.depthSortingSystem.addEntity(shape, 'effects');
      }
      
      return shape;
    };

    if (delay > 0) {
      // Créer avec délai
      this.scene.time.delayedCall(delay, createShape);
    } else {
      // Créer immédiatement
      createShape();
    }
  }

  /**
   * Créer une onomatopée orientée pour le joueur (gère l'orientation et la taille)
   * @param {number} onomatopeNumber - Numéro de l'onomatopée (1-11)
   * @param {Object} options - Options d'orientation { scale, offsetX, flipX, facing }
   * @param {number} delay - Délai avant d'afficher (en ms)
   */
  createOrientedShoutShape(onomatopeNumber, options = {}, delay = 0) {
    if (!this.owner.sprite || !onomatopeNumber) return;
    
    const createShape = () => {
      const onomatopeKey = `onomatope-${onomatopeNumber}`;
      
      // Créer le sprite d'onomatopée
      const sprite = this.scene.add.image(0, 0, onomatopeKey);
      sprite.setScale(options.scale || this.config.scale);
      sprite.setAlpha(1.0);
      
      // 🎯 NOUVEAU: Appliquer le flip horizontal si nécessaire
      if (options.flipX) {
        sprite.setFlipX(true);
      }
      
      const shape = {
        type: 'onomatope',
        entityType: 'onomatope', // Pour le depth sorting
        sprite: sprite,
        startTime: Date.now(),
        duration: this.config.duration,
        offsetX: options.offsetX !== undefined ? options.offsetX : this.config.offsetX,
        offsetY: this.config.offsetY,
        scale: options.scale || this.config.scale,
        initialScale: options.scale || this.config.scale,
        alpha: 1.0,
        facing: options.facing || 'right' // Pour debug/référence
      };
      
      // Ajouter à la liste des formes actives
      this.shoutShapes.push(shape);
      
      // Positionner l'onomatopée
      this.updateShapePosition(shape);
      
      // Ajouter au système de depth sorting (layer effects)
      if (this.depthSortingSystem) {
        this.depthSortingSystem.addEntity(shape, 'effects');
      }
      
      return shape;
    };

    if (delay > 0) {
      // Créer avec délai
      this.scene.time.delayedCall(delay, createShape);
    } else {
      // Créer immédiatement
      createShape();
    }
  }

  /**
   * Positionner une onomatopée par rapport à l'entité propriétaire
   */
  updateShapePosition(shape) {
    if (!shape.sprite || !this.owner.sprite) return;
    
    shape.sprite.x = this.owner.sprite.x + shape.offsetX;
    shape.sprite.y = this.owner.sprite.y + shape.offsetY;
  }

  /**
   * Mettre à jour toutes les onomatopées actives
   */
  update(delta) {
    const currentTime = Date.now();
    
    for (let i = this.shoutShapes.length - 1; i >= 0; i--) {
      const shape = this.shoutShapes[i];
      const elapsed = currentTime - shape.startTime;
      
      // Positionner l'onomatopée (suit l'entité)
      this.updateShapePosition(shape);
      
      // Animation différente selon le type de forme
      const fadeProgress = elapsed / shape.duration;
      
      if (shape.type === 'npc-shout') {
        // 🎯 ANIMATION SPÉCIALE pour npc-shout : effet de pulse + fade
        const newAlpha = Math.max(0, 1.0 - fadeProgress);
        shape.sprite.setAlpha(newAlpha);
        
        // Effet de pulse : oscillation de la taille
        const pulseFrequency = 4; // 4 pulses pendant la durée
        const pulsePhase = (elapsed / shape.duration) * pulseFrequency * Math.PI * 2;
        const pulseAmplitude = 0.15; // Amplitude du pulse (±15%)
        const pulseScale = 1.0 + Math.sin(pulsePhase) * pulseAmplitude * (1.0 - fadeProgress); // Diminue avec le fade
        const newScale = shape.initialScale * pulseScale;
        shape.sprite.setScale(newScale);
        
      } else {
        // Animation classique pour les onomatopées normales
      const newAlpha = Math.max(0, 1.0 - fadeProgress);
      shape.sprite.setAlpha(newAlpha);
      
      // Animation de croissance légère
      const scaleProgress = fadeProgress * this.config.growthFactor;
      const newScale = shape.initialScale * (1.0 + scaleProgress);
      shape.sprite.setScale(newScale);
      }
      
      // Supprimer si terminé
      if (elapsed >= shape.duration) {
        // Retirer du système de depth sorting
        if (this.depthSortingSystem) {
          this.depthSortingSystem.removeEntity(shape);
        }
        
        shape.sprite.destroy();
        this.shoutShapes.splice(i, 1);
      }
    }
  }

  /**
   * Nettoyer toutes les onomatopées
   */
  destroy() {
    this.shoutShapes.forEach(shape => {
      // Retirer du système de depth sorting
      if (this.depthSortingSystem) {
        this.depthSortingSystem.removeEntity(shape);
      }
      
      if (shape.sprite) {
        shape.sprite.destroy();
      }
    });
    this.shoutShapes = [];
  }

  /**
   * Obtenir le nombre d'onomatopées actives
   */
  getActiveShapeCount() {
    return this.shoutShapes.length;
  }

  /**
   * Vérifier si des onomatopées sont actives
   */
  hasActiveShapes() {
    return this.shoutShapes.length > 0;
  }
} 