import { IUpdateable } from './interfaces';

type EntityType = 'generic' | 'player' | 'student' | 'wall' | 'npc';

interface EntityData {
  entity: any;
  type: EntityType;
}

export class EntityManager {
  entities: Map<number, EntityData>;
  player: any;
  students: any[];
  walls: any[];
  npcs: any[];
  nextId: number;

  constructor() {
    this.entities = new Map();
    this.player = null;
    this.students = [];
    this.walls = [];
    this.npcs = [];
    this.nextId = 0;
  }

  addEntity(entity: any, type: EntityType = 'generic'): number {
    const id = this.nextId++;
    entity.id = id;
    this.entities.set(id, { entity, type });

    // Organiser par type pour un accès rapide
    switch (type) {
      case 'player':
        this.player = entity;
        break;
      case 'student':
        this.students.push(entity);
        break;
      case 'wall':
        this.walls.push(entity);
        break;
      case 'npc':
        this.npcs.push(entity);
        break;
    }

    return id;
  }

  removeEntity(id: number): boolean {
    const entityData = this.entities.get(id);
    if (!entityData) return false;

    const { entity, type } = entityData;

    // Nettoyer les références spécifiques
    switch (type) {
      case 'player':
        this.player = null;
        break;
      case 'student':
        this.students = this.students.filter((s: any) => s.id !== id);
        break;
      case 'wall':
        this.walls = this.walls.filter((w: any) => w.id !== id);
        break;
      case 'npc':
        this.npcs = this.npcs.filter((n: any) => n.id !== id);
        break;
    }

    // Nettoyer l'entité si elle a une méthode destroy
    if (entity.destroy) {
      entity.destroy();
    }

    this.entities.delete(id);
    return true;
  }

  getEntity(id: number): any {
    const entityData = this.entities.get(id);
    return entityData ? entityData.entity : null;
  }

  getPlayer(): any {
    return this.player;
  }

  getStudents(): any[] {
    return this.students;
  }

  getWalls(): any[] {
    return this.walls;
  }

  getNpcs(): any[] {
    return this.npcs;
  }

  getEntitiesByType(type: EntityType): any[] {
    const result: any[] = [];
    for (const [, entityData] of this.entities) {
      if (entityData.type === type) {
        result.push(entityData.entity);
      }
    }
    return result;
  }

  getAllEntities(): any[] {
    const result: any[] = [];
    for (const [, entityData] of this.entities) {
      result.push(entityData.entity);
    }
    return result;
  }

  update(delta: number): void {
    // Mettre à jour toutes les entités qui implémentent IUpdateable
    for (const [, entityData] of this.entities) {
      const entity = entityData.entity;
      if (entity instanceof IUpdateable || entity.update) {
        entity.update(delta);
      }
    }
  }

  clear(): void {
    // Nettoyer toutes les entités
    for (const [, entityData] of this.entities) {
      const entity = entityData.entity;
      if (entity.destroy) {
        entity.destroy();
      }
    }

    this.entities.clear();
    this.player = null;
    this.students = [];
    this.walls = [];
    this.npcs = [];
    this.nextId = 0;
  }

  // Alias pour la méthode clear()
  cleanup(): void {
    this.clear();
  }
}
