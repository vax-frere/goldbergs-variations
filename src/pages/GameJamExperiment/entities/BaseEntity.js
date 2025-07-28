import { IUpdateable, IMovable, ICollidable } from '../core/interfaces';

export class BaseEntity extends IUpdateable {
  constructor(scene, x, y, texture, useSprite = false) {
    super();
    this.scene = scene;
    
    // Utiliser sprite pour les animations, image pour les textures statiques
    if (useSprite || texture === 'yume-nikki-player') {
      this.sprite = scene.add.sprite(x, y, texture);
    } else {
      this.sprite = scene.add.image(x, y, texture);
    }
    
    this.sprite.setOrigin(0.5, 0.5);
    this.id = null;
    this.entityType = this.constructor.name;
    
    // Propriétés de base
    this.speed = 100;
    this.health = 100;
    this.isActive = true;
    
    // Position et mouvement
    this.velocity = { x: 0, y: 0 };
    this.lastPosition = { x: x, y: y };
  }

  update(delta) {
    if (!this.isActive) return;
    
    // Sauvegarder la position précédente AVANT le mouvement
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    // Mettre à jour la position avec la vélocité
    this.sprite.x += this.velocity.x * delta * 0.001;
    this.sprite.y += this.velocity.y * delta * 0.001;
    
    // Réduire la vélocité (friction)
    this.velocity.x *= 0.9;
    this.velocity.y *= 0.9;
    
    // Arrêter si la vélocité est très faible
    if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
  }

  getPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y
    };
  }

  setPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  getBounds() {
    return {
      x: this.sprite.x - this.sprite.width / 2,
      y: this.sprite.y - this.sprite.height / 2,
      width: this.sprite.width,
      height: this.sprite.height
    };
  }

  // Vérifier si l'entité est dans les limites de l'écran
  isInBounds(bounds) {
    const entityBounds = this.getBounds();
    return (
      entityBounds.x >= bounds.x &&
      entityBounds.x + entityBounds.width <= bounds.x + bounds.width &&
      entityBounds.y >= bounds.y &&
      entityBounds.y + entityBounds.height <= bounds.y + bounds.height
    );
  }

  // Appliquer des dégâts
  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy();
    }
  }

  // Soigner l'entité
  heal(amount) {
    this.health = Math.min(this.health + amount, 100);
  }

  // Activer/désactiver l'entité
  setActive(active) {
    this.isActive = active;
    this.sprite.setVisible(active);
  }

  // Détruire l'entité
  destroy() {
    this.isActive = false;
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  // Obtenir la distance vers une autre entité
  getDistanceTo(otherEntity) {
    const pos1 = this.getPosition();
    const pos2 = otherEntity.getPosition();
    
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Obtenir la direction vers une autre entité
  getDirectionTo(otherEntity) {
    const pos1 = this.getPosition();
    const pos2 = otherEntity.getPosition();
    
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    
    return Math.atan2(dy, dx);
  }
} 