/**
 * Système de tri par profondeur pour la vue 3/4
 * Les objets plus bas à l'écran (Y plus grand) apparaissent devant
 */
export class DepthSortingSystem {
  scene: any;
  layers: Record<string, {
    name: string;
    baseDepth: number;
    depthRange: number;
    entities: Set<any>;
    description: string;
  }> = {};
  depthMultiplier: number = 1;
  lastUpdatePositions: Map<any, { x: number; y: number }> = new Map();
  updateThreshold: number = 2;

  constructor(scene: any) {
    this.scene = scene;

    this.layers = {
      characters: {
        name: 'characters',
        baseDepth: 1000,
        depthRange: 1000,
        entities: new Set(),
        description: 'Player et NPCs',
      },
      effects: {
        name: 'effects',
        baseDepth: 3000,
        depthRange: 1000,
        entities: new Set(),
        description: 'Onomatopées et effets visuels',
      },
    };

    console.log('🎭 DepthSortingSystem initialisé - Tri multi-layer par position Y');
    console.log('📊 Layers configurés:', Object.keys(this.layers).map((key) => {
      const layer = this.layers[key];
      return `${layer.name}: ${layer.baseDepth}-${layer.baseDepth + layer.depthRange - 1}`;
    }).join(', '));
  }

  addEntity(entity: any, layerName: string = 'characters'): void {
    if (!entity || !entity.sprite) return;

    let layer = this.layers[layerName];
    if (!layer) {
      console.warn(`🎭 Layer "${layerName}" inexistant, utilisation de 'characters' par défaut`);
      layerName = 'characters';
    }

    this.layers[layerName].entities.add(entity);

    (entity as any)._depthLayer = layerName;

    this.updateEntityDepth(entity, layerName);

    console.log(`🎭 Entité ${entity.entityType} ajoutée au layer "${layerName}"`);
  }

  removeEntity(entity: any): void {
    if (!entity) return;

    let removed = false;
    Object.values(this.layers).forEach((layer) => {
      if (layer.entities.has(entity)) {
        layer.entities.delete(entity);
        removed = true;
      }
    });

    this.lastUpdatePositions.delete(entity);
    if ((entity as any)._depthLayer) {
      delete (entity as any)._depthLayer;
    }

    if (removed) {
      console.log(`🎭 Entité ${entity.entityType} retirée du depth sorting`);
    }
  }

  updateEntityDepth(entity: any, layerName: string | null = null): void {
    if (!entity || !entity.sprite) return;

    const targetLayer = layerName || (entity as any)._depthLayer || 'characters';
    const layer = this.layers[targetLayer];

    if (!layer) {
      console.warn(`🎭 Layer "${targetLayer}" introuvable pour l'entité ${entity.entityType}`);
      return;
    }

    const normalizedY = Math.max(0, Math.min(1, entity.sprite.y / this.scene.scale.height));

    const depthInRange = normalizedY * (layer.depthRange - 1);
    const finalDepth = layer.baseDepth + depthInRange;

    entity.sprite.setDepth(Math.round(finalDepth));

    this.lastUpdatePositions.set(entity, {
      x: entity.sprite.x,
      y: entity.sprite.y,
    });
  }

  hasEntityMoved(entity: any): boolean {
    const lastPos = this.lastUpdatePositions.get(entity);
    if (!lastPos) return true;

    const currentX = entity.sprite.x;
    const currentY = entity.sprite.y;

    const deltaX = Math.abs(currentX - lastPos.x);
    const deltaY = Math.abs(currentY - lastPos.y);

    return deltaX >= this.updateThreshold || deltaY >= this.updateThreshold;
  }

  update(): void {
    Object.values(this.layers).forEach((layer) => {
      const entitiesToRemove: any[] = [];

      for (const entity of layer.entities) {
        if (!entity || !entity.sprite) {
          entitiesToRemove.push(entity);
          continue;
        }

        if (this.hasEntityMoved(entity)) {
          this.updateEntityDepth(entity);
        }
      }

      entitiesToRemove.forEach((entity) => this.removeEntity(entity));
    });
  }

  sortAllEntities(): void {
    let totalSorted = 0;

    Object.values(this.layers).forEach((layer) => {
      const entitiesArray = Array.from(layer.entities)
        .filter((entity) => entity && entity.sprite)
        .sort((a, b) => a.sprite.y - b.sprite.y);

      entitiesArray.forEach((entity, index) => {
        const depth = layer.baseDepth + index;
        entity.sprite.setDepth(depth);
      });

      totalSorted += entitiesArray.length;
      console.log(`🎭 Layer "${layer.name}": ${entitiesArray.length} entités triées`);
    });

    console.log(`🎭 Tri en lot total: ${totalSorted} entités effectué`);
  }

  configure(options: Record<string, any> = {}): void {
    if (options.depthMultiplier !== undefined) {
      this.depthMultiplier = options.depthMultiplier;
    }

    if (options.updateThreshold !== undefined) {
      this.updateThreshold = options.updateThreshold;
    }

    if (options.layers) {
      Object.keys(options.layers).forEach((layerName) => {
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

    console.log('🎭 DepthSortingSystem reconfiguré:', {
      depthMultiplier: this.depthMultiplier,
      updateThreshold: this.updateThreshold,
      layers: Object.keys(this.layers).map((key) => {
        const layer = this.layers[key];
        return `${layer.name}: ${layer.baseDepth}-${layer.baseDepth + layer.depthRange - 1}`;
      }).join(', '),
    });
  }

  getStats(): any {
    const layerStats: Record<string, any> = {};
    let totalEntities = 0;

    Object.keys(this.layers).forEach((layerName) => {
      const layer = this.layers[layerName];
      const count = layer.entities.size;
      layerStats[layerName] = {
        entities: count,
        baseDepth: layer.baseDepth,
        depthRange: layer.depthRange,
        description: layer.description,
      };
      totalEntities += count;
    });

    return {
      totalEntities,
      layers: layerStats,
      depthMultiplier: this.depthMultiplier,
      updateThreshold: this.updateThreshold,
    };
  }

  destroy(): void {
    Object.values(this.layers).forEach((layer) => {
      layer.entities.clear();
    });

    this.lastUpdatePositions.clear();
    console.log('🎭 DepthSortingSystem détruit');
  }
}
