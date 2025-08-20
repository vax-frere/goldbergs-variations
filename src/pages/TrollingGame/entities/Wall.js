import { ICollidable } from '../core/interfaces';

export class Wall {
  constructor(scene, x, y, invisible = true) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.entityType = 'wall';
    this.isStatic = true;
    
    // Taille des murs
    this.width = 40;
    this.height = 40;
    
    // 🎯 NOUVEAU : Créer uniquement un body physique, pas de sprite
    this.body = this.scene.physics.add.staticBody(x, y, this.width, this.height);
    
    // Configurer le body
    this.body.setSize(this.width, this.height);
    this.body.setOffset(0, 0);
    
    // Référence pour les collisions
    this.body.entity = this;
    
    // ID unique pour l'EntityManager
    this.id = `wall_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🧱 Mur créé (collision only) à (${x}, ${y}) - taille: ${this.width}x${this.height}`);
  }

  // Propriété pour compatibilité avec l'ancien code qui accède à wall.sprite
  get sprite() {
    return {
      x: this.x,
      y: this.y,
      body: this.body,
      destroy: () => {
        if (this.body) {
          this.body.destroy();
          this.body = null;
        }
      }
    };
  }

  update(delta) {
    // Les murs n'ont pas besoin de mise à jour
    // Ils sont statiques
  }

  // Implémenter ICollidable
  onCollision(other) {
    // Les murs bloquent le mouvement
    if (other.entityType === 'player') {
      // Le joueur gère sa propre collision avec les murs
      // Pas besoin d'action spécifique ici
    }
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  // Méthodes utilitaires
  isBlocking() {
    return true;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    if (this.body) {
      this.body.setSize(width, height);
    }
  }

  // 🎯 NOUVEAU : Méthode pour enable/disable le body
  setEnabled(enabled) {
    if (this.body) {
      this.body.enable = enabled;
    }
  }

  // 🎯 NOUVEAU : Méthode de destruction propre
  destroy() {
    if (this.body) {
      this.body.destroy();
      this.body = null;
    }
  }
} 