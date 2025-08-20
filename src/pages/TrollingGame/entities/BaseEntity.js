import { IUpdateable, IMovable, ICollidable } from '../core/interfaces';

export class BaseEntity extends IUpdateable {
  constructor(scene, x, y, texture, useSprite = false) {
    super();
    this.scene = scene;
    
    // Utiliser sprite pour les animations, image pour les textures statiques
    if (useSprite || texture === 'character-spritesheet') {
      this.sprite = scene.add.sprite(x, y, texture);
    } else {
      this.sprite = scene.add.image(x, y, texture);
    }
    
    this.sprite.setOrigin(0.5, 0.5);
    
    // AJOUTER PHYSIQUE CIRCULAIRE - COLLISION NON DÉPASSABLE
    // Note: Les Wall ne passent plus par BaseEntity, ils gèrent leur propre physique
    scene.physics.add.existing(this.sprite, false); // Toujours dynamique pour BaseEntity
    
      // NPCs et joueur : corps circulaire dynamique
      const radius = 28; // Rayon réduit (36→28px) pour collision plus proportionnelle aux sprites
      
      // CENTRER le cercle par rapport au sprite
      const offsetX = (this.sprite.width * this.sprite.scaleX) / 2 - radius;
      const offsetY = (this.sprite.height * this.sprite.scaleY) / 1.2 - radius;
      
      this.sprite.body.setCircle(radius, offsetX, offsetY); // Rayon + offset pour centrer
      this.sprite.body.setCollideWorldBounds(true); // Reste dans les limites
      this.sprite.body.setBounce(0.0, 0.0); // CORRECTION: Pas d'élasticité pour éviter les micro-rebonds
      this.sprite.body.setDrag(10, 10); // 🎯 FAIBLE DRAG : pour éviter le glissement sans ralentir
    
    console.log(`🔵 Corps physique dynamique créé pour ${texture}`);
    
    this.id = null;
    this.entityType = this.constructor.name;
    
    // Propriétés de base
    this.speed = 100;
    this.health = 100;
    this.isActive = true;
    
    // Position et mouvement - maintenant géré par Phaser physics
    this.velocity = { x: 0, y: 0 };
    this.lastPosition = { x: x, y: y };
  }

  update(delta) {
    if (!this.isActive) return;
    
    // Sauvegarder la position précédente AVANT le mouvement
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    // 🚫 DÉSACTIVÉ : NE PAS écraser la velocity calculée par les entités enfants (Npc, Player)
    // Les entités gèrent maintenant leur propre velocity via leurs systèmes spécialisés
    // UTILISER LA PHYSIQUE PHASER au lieu de manipulation directe
    // Les forces sont appliquées via setVelocity() sur le body physique
    // if (this.sprite.body) {
    //   // Appliquer la velocité à travers la physique Phaser
    //   this.sprite.body.setVelocity(this.velocity.x, this.velocity.y);
    //   
    //   // La friction est gérée par le drag du body physique
    //   // Les collisions sont automatiques
    // }
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
      x: this.sprite.x - this.sprite.displayWidth / 2,
      y: this.sprite.y - this.sprite.displayHeight / 2,
      width: this.sprite.displayWidth,
      height: this.sprite.displayHeight
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