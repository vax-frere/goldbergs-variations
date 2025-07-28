/**
 * Système de tri par profondeur pour la vue 3/4
 * Les objets plus bas à l'écran (Y plus grand) apparaissent devant
 */
export class DepthSortingSystem {
  constructor(scene) {
    this.scene = scene;
    
    // Configuration des layers avec des gammes de depth séparées
    this.layers = {
      characters: {
        name: 'characters',
        baseDepth: 1000,
        depthRange: 1000, // 1000-1999
        entities: new Set(),
        description: 'Player et NPCs'
      },
      effects: {
        name: 'effects', 
        baseDepth: 3000,
        depthRange: 1000, // 3000-3999
        entities: new Set(),
        description: 'Onomatopées et effets visuels'
      }
    };
    
    // Configuration globale
    this.depthMultiplier = 1; // Multiplicateur pour accentuer l'effet
    
    // Cache pour optimiser les performances
    this.lastUpdatePositions = new Map();
    this.updateThreshold = 2; // Seuil minimum de mouvement pour mise à jour (en pixels)
    
    console.log('🎭 DepthSortingSystem initialisé - Tri multi-layer par position Y');
    console.log('📊 Layers configurés:', Object.keys(this.layers).map(key => {
      const layer = this.layers[key];
      return `${layer.name}: ${layer.baseDepth}-${layer.baseDepth + layer.depthRange - 1}`;
    }).join(', '));
  }

  /**
   * Ajouter une entité au système de tri
   * @param {Object} entity - L'entité à ajouter
   * @param {string} layerName - Le layer de destination ('characters' ou 'effects')
   */
  addEntity(entity, layerName = 'characters') {
    if (!entity || !entity.sprite) return;
    
    const layer = this.layers[layerName];
    if (!layer) {
      console.warn(`🎭 Layer "${layerName}" inexistant, utilisation de 'characters' par défaut`);
      layerName = 'characters';
    }
    
    // Ajouter à la set du layer approprié
    this.layers[layerName].entities.add(entity);
    
    // Stocker le layer sur l'entité pour référence
    entity._depthLayer = layerName;
    
    this.updateEntityDepth(entity, layerName);
    
    console.log(`🎭 Entité ${entity.entityType} ajoutée au layer "${layerName}"`);
  }

  /**
   * Retirer une entité du système de tri
   */
  removeEntity(entity) {
    if (!entity) return;
    
    // Chercher et retirer de tous les layers
    let removed = false;
    Object.values(this.layers).forEach(layer => {
      if (layer.entities.has(entity)) {
        layer.entities.delete(entity);
        removed = true;
      }
    });
    
    // Nettoyer les références
    this.lastUpdatePositions.delete(entity);
    if (entity._depthLayer) {
      delete entity._depthLayer;
    }
    
    if (removed) {
      console.log(`🎭 Entité ${entity.entityType} retirée du depth sorting`);
    }
  }

  /**
   * Mettre à jour la profondeur d'une entité basée sur sa position Y
   * @param {Object} entity - L'entité à mettre à jour
   * @param {string} layerName - Le layer (optionnel, récupéré de l'entité si absent)
   */
  updateEntityDepth(entity, layerName = null) {
    if (!entity || !entity.sprite) return;
    
    // Déterminer le layer
    const targetLayer = layerName || entity._depthLayer || 'characters';
    const layer = this.layers[targetLayer];
    
    if (!layer) {
      console.warn(`🎭 Layer "${targetLayer}" introuvable pour l'entité ${entity.entityType}`);
      return;
    }
    
    // Calculer la profondeur normalisée dans la gamme du layer (0-1)
    const normalizedY = Math.max(0, Math.min(1, entity.sprite.y / this.scene.scale.height));
    
    // Calculer la nouvelle profondeur dans la gamme du layer
    // Plus Y est grand (plus bas à l'écran), plus la profondeur est grande
    const depthInRange = normalizedY * (layer.depthRange - 1);
    const finalDepth = layer.baseDepth + depthInRange;
    
    // Appliquer la profondeur au sprite
    entity.sprite.setDepth(Math.round(finalDepth));
    
    // Mettre à jour le cache de position
    this.lastUpdatePositions.set(entity, {
      x: entity.sprite.x,
      y: entity.sprite.y
    });
  }

  /**
   * Vérifier si une entité a suffisamment bougé pour justifier une mise à jour
   */
  hasEntityMoved(entity) {
    const lastPos = this.lastUpdatePositions.get(entity);
    if (!lastPos) return true; // Première fois, forcer la mise à jour
    
    const currentX = entity.sprite.x;
    const currentY = entity.sprite.y;
    
    const deltaX = Math.abs(currentX - lastPos.x);
    const deltaY = Math.abs(currentY - lastPos.y);
    
    return deltaX >= this.updateThreshold || deltaY >= this.updateThreshold;
  }

  /**
   * Mettre à jour toutes les entités trackées dans tous les layers
   */
  update() {
    // Traiter chaque layer séparément
    Object.values(this.layers).forEach(layer => {
      const entitiesToRemove = [];
      
      // Optimisation : ne traiter que les entités qui ont bougé
      for (const entity of layer.entities) {
        if (!entity || !entity.sprite) {
          // Marquer pour suppression
          entitiesToRemove.push(entity);
          continue;
        }
        
        // Mettre à jour seulement si l'entité a suffisamment bougé
        if (this.hasEntityMoved(entity)) {
          this.updateEntityDepth(entity);
        }
      }
      
      // Nettoyer les entités supprimées
      entitiesToRemove.forEach(entity => this.removeEntity(entity));
    });
  }

  /**
   * Tri en lot de toutes les entités par layer (pour réorganisation complète)
   */
  sortAllEntities() {
    let totalSorted = 0;
    
    Object.values(this.layers).forEach(layer => {
      const entitiesArray = Array.from(layer.entities)
        .filter(entity => entity && entity.sprite)
        .sort((a, b) => a.sprite.y - b.sprite.y);

      // Appliquer les nouvelles profondeurs dans la gamme du layer
      entitiesArray.forEach((entity, index) => {
        const depth = layer.baseDepth + index;
        entity.sprite.setDepth(depth);
      });
      
      totalSorted += entitiesArray.length;
      console.log(`🎭 Layer "${layer.name}": ${entitiesArray.length} entités triées`);
    });

    console.log(`🎭 Tri en lot total: ${totalSorted} entités effectué`);
  }

  /**
   * Configurer les paramètres du tri
   */
  configure(options = {}) {
    if (options.depthMultiplier !== undefined) {
      this.depthMultiplier = options.depthMultiplier;
    }
    
    if (options.updateThreshold !== undefined) {
      this.updateThreshold = options.updateThreshold;
    }
    
    // Configuration par layer
    if (options.layers) {
      Object.keys(options.layers).forEach(layerName => {
        if (this.layers[layerName]) {
          const layerConfig = options.layers[layerName];
          if (layerConfig.baseDepth !== undefined) {
            this.layers[layerName].baseDepth = layerConfig.baseDepth;
          }
          if (layerConfig.depthRange !== undefined) {
            this.layers[layerName].depthRange = layerConfig.depthRange;
          }
        }
      });
    }
    
    console.log(`🎭 DepthSortingSystem reconfiguré:`, {
      depthMultiplier: this.depthMultiplier,
      updateThreshold: this.updateThreshold,
      layers: Object.keys(this.layers).map(key => {
        const layer = this.layers[key];
        return `${layer.name}: ${layer.baseDepth}-${layer.baseDepth + layer.depthRange - 1}`;
      }).join(', ')
    });
  }

  /**
   * Obtenir les statistiques du système
   */
  getStats() {
    const layerStats = {};
    let totalEntities = 0;
    
    Object.keys(this.layers).forEach(layerName => {
      const layer = this.layers[layerName];
      const count = layer.entities.size;
      layerStats[layerName] = {
        entities: count,
        baseDepth: layer.baseDepth,
        depthRange: layer.depthRange,
        description: layer.description
      };
      totalEntities += count;
    });
    
    return {
      totalEntities,
      layers: layerStats,
      depthMultiplier: this.depthMultiplier,
      updateThreshold: this.updateThreshold
    };
  }

  /**
   * Nettoyer le système
   */
  destroy() {
    // Nettoyer tous les layers
    Object.values(this.layers).forEach(layer => {
      layer.entities.clear();
    });
    
    this.lastUpdatePositions.clear();
    console.log('🎭 DepthSortingSystem détruit');
  }
} 