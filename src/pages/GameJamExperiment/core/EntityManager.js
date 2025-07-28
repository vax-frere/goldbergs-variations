import { IUpdateable } from './interfaces';

export class EntityManager {
  constructor() {
    this.entities = new Map();
    this.player = null;
    this.students = [];
    this.walls = [];
    this.nextId = 0;
  }

  addEntity(entity, type = 'generic') {
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
    }
    
    return id;
  }

  removeEntity(id) {
    const entityData = this.entities.get(id);
    if (!entityData) return false;
    
    const { entity, type } = entityData;
    
    // Nettoyer les références spécifiques
    switch (type) {
      case 'player':
        this.player = null;
        break;
      case 'student':
        this.students = this.students.filter(s => s.id !== id);
        break;
      case 'wall':
        this.walls = this.walls.filter(w => w.id !== id);
        break;
    }
    
    // Nettoyer l'entité si elle a une méthode destroy
    if (entity.destroy) {
      entity.destroy();
    }
    
    this.entities.delete(id);
    return true;
  }

  getEntity(id) {
    const entityData = this.entities.get(id);
    return entityData ? entityData.entity : null;
  }

  getPlayer() {
    return this.player;
  }

  getStudents() {
    return this.students;
  }

  getWalls() {
    return this.walls;
  }

  getEntitiesByType(type) {
    const result = [];
    for (const [id, entityData] of this.entities) {
      if (entityData.type === type) {
        result.push(entityData.entity);
      }
    }
    return result;
  }

  getAllEntities() {
    const result = [];
    for (const [id, entityData] of this.entities) {
      result.push(entityData.entity);
    }
    return result;
  }

  update(delta) {
    // Mettre à jour toutes les entités qui implémentent IUpdateable
    for (const [id, entityData] of this.entities) {
      const entity = entityData.entity;
      if (entity instanceof IUpdateable || entity.update) {
        entity.update(delta);
      }
    }
  }

  clear() {
    // Nettoyer toutes les entités
    for (const [id, entityData] of this.entities) {
      const entity = entityData.entity;
      if (entity.destroy) {
        entity.destroy();
      }
    }
    
    this.entities.clear();
    this.player = null;
    this.students = [];
    this.walls = [];
    this.nextId = 0;
  }

  // Alias pour la méthode clear()
  cleanup() {
    this.clear();
  }
} 