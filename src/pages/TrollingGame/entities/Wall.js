import { BaseEntity } from './BaseEntity';
import { ICollidable } from '../core/interfaces';

export class Wall extends BaseEntity {
  constructor(scene, x, y, invisible = false) {
    super(scene, x, y, 'wall');
    this.entityType = 'wall';
    this.isStatic = true;
    
    // Les murs ne bougent pas
    this.speed = 0;
    
    // Configurer l'apparence - MURS PLUS ÉPAIS
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(40, 40); // 🎯 ÉPAISSI : 32x32 → 40x40 pour éviter les fuites de NPCs
    
    // Rendre invisible si demandé
    if (invisible) {
      this.sprite.setVisible(false);
      // Garder la physique mais rendre visuellement invisible
      this.sprite.setAlpha(0);
    }
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
      x: this.sprite.x - this.sprite.width / 2,
      y: this.sprite.y - this.sprite.height / 2,
      width: this.sprite.width,
      height: this.sprite.height
    };
  }

  // Méthodes utilitaires
  isBlocking() {
    return true;
  }

  setSize(width, height) {
    this.sprite.setDisplaySize(width, height);
  }

  setColor(color) {
    this.sprite.setTint(color);
  }
} 