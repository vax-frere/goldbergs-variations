import { ICollidable, IInteractable } from './interfaces';
import type { Bounds } from '../types/types';

interface CollisionPair {
  entity1: any;
  entity2: any;
  callback: ((e1: any, e2: any) => void) | null;
}

export class CollisionSystem {
  collisionPairs: CollisionPair[];
  interactionCallbacks: Map<string, (interactor: any, target: any) => void>;

  constructor() {
    this.collisionPairs = [];
    this.interactionCallbacks = new Map();
  }

  // Ajouter une paire d'entités à vérifier pour les collisions
  addCollisionPair(
    entity1: any,
    entity2: any,
    callback: ((e1: any, e2: any) => void) | null = null
  ): void {
    this.collisionPairs.push({ entity1, entity2, callback });
  }

  // Ajouter un callback pour les interactions
  addInteractionCallback(
    entityType: string,
    callback: (interactor: any, target: any) => void
  ): void {
    this.interactionCallbacks.set(entityType, callback);
  }

  // Vérifier les collisions entre deux entités
  checkCollision(entity1: any, entity2: any): boolean {
    if (!entity1 || !entity2) return false;

    const bounds1 = this.getBounds(entity1);
    const bounds2 = this.getBounds(entity2);

    if (!bounds1 || !bounds2) return false;

    return (
      bounds1.x < bounds2.x + bounds2.width &&
      bounds1.x + bounds1.width > bounds2.x &&
      bounds1.y < bounds2.y + bounds2.height &&
      bounds1.y + bounds1.height > bounds2.y
    );
  }

  // Obtenir les limites d'une entité
  getBounds(entity: any): Bounds | null {
    if (entity instanceof ICollidable) {
      return entity.getBounds();
    }

    // Fallback pour les entités Phaser
    if (entity.sprite) {
      return {
        x: entity.sprite.x - entity.sprite.width / 2,
        y: entity.sprite.y - entity.sprite.height / 2,
        width: entity.sprite.width,
        height: entity.sprite.height,
      };
    }

    return null;
  }

  // Calculer la distance entre deux entités
  getDistance(entity1: any, entity2: any): number {
    const pos1 =
      entity1.getPosition != null
        ? entity1.getPosition()
        : { x: entity1.sprite.x, y: entity1.sprite.y };
    const pos2 =
      entity2.getPosition != null
        ? entity2.getPosition()
        : { x: entity2.sprite.x, y: entity2.sprite.y };

    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // Vérifier si deux entités sont proches pour l'interaction
  isInInteractionRange(
    entity1: any,
    entity2: any,
    range: number = 40
  ): boolean {
    return this.getDistance(entity1, entity2) <= range;
  }

  // Gérer l'interaction entre deux entités
  handleInteraction(interactor: any, target: any): boolean {
    if (target instanceof IInteractable) {
      if (target.canInteract(interactor)) {
        target.onInteraction(interactor);
        return true;
      }
    }

    // Vérifier les callbacks d'interaction
    const targetType = target.entityType || target.constructor.name;
    const callback = this.interactionCallbacks.get(targetType);
    if (callback) {
      callback(interactor, target);
      return true;
    }

    return false;
  }

  // Mettre à jour toutes les collisions
  update(): void {
    // Vérifier toutes les paires de collision enregistrées
    for (const pair of this.collisionPairs) {
      const { entity1, entity2, callback } = pair;

      if (this.checkCollision(entity1, entity2)) {
        // Déclencher les callbacks de collision
        if (entity1 instanceof ICollidable) {
          entity1.onCollision(entity2);
        }
        if (entity2 instanceof ICollidable) {
          entity2.onCollision(entity1);
        }

        if (callback) {
          callback(entity1, entity2);
        }
      }
    }
  }

  // Nettoyer les paires de collision
  clear(): void {
    this.collisionPairs = [];
    this.interactionCallbacks.clear();
  }

  // Trouver toutes les entités dans un rayon donné
  findEntitiesInRange(
    centerEntity: any,
    entities: any[],
    range: number
  ): any[] {
    const result: any[] = [];
    const centerPos =
      centerEntity.getPosition != null
        ? centerEntity.getPosition()
        : {
            x: centerEntity.sprite.x,
            y: centerEntity.sprite.y,
          };

    for (const entity of entities) {
      if (entity === centerEntity) continue;

      const entityPos =
        entity.getPosition != null
          ? entity.getPosition()
          : { x: entity.sprite.x, y: entity.sprite.y };

      const distance = Math.sqrt(
        Math.pow(entityPos.x - centerPos.x, 2) +
          Math.pow(entityPos.y - centerPos.y, 2)
      );

      if (distance <= range) {
        result.push(entity);
      }
    }

    return result;
  }
}
