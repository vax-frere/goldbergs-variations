import { BaseEntity } from './BaseEntity';
import { IMovable, ICollidable } from '../core/interfaces';

export class Player extends BaseEntity {
  constructor(scene, x, y) {
    super(scene, x, y, 'yume-nikki-player');
    this.speed = 350;
    this.entityType = 'player';
    
    // Réduire la taille du sprite (le spritesheet est trop grand)
    this.sprite.setScale(0.5); // Réduire à 25% de la taille originale
    
    // Propriétés spécifiques au joueur
    this.isMoving = false;
    this.facing = 'down';
    this.canMove = true;
    this.currentAnimation = 'idle-down';
    
    // Initialiser l'animation d'arrêt
    this.sprite.play('idle-down');
    
    // Limites du monde (ajustées pour la vraie taille du sprite)
    this.worldBounds = {
      x: 16,
      y: 16,
      width: scene.sys.canvas.width - 32,
      height: scene.sys.canvas.height - 32
    };
    
    // Debug : créer les hitboxes visuelles
    this.createDebugHitboxes();
  }

  move(direction, speed) {
    if (!this.canMove || !this.sprite) return;
    
    // Sauvegarder la position précédente AVANT le mouvement
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    this.isMoving = true;
    const previousFacing = this.facing;
    this.facing = direction;
    
    // Jouer l'animation de marche appropriée
    const walkAnimation = `walk-${direction}`;
    if (this.currentAnimation !== walkAnimation) {
      this.sprite.play(walkAnimation);
      this.currentAnimation = walkAnimation;
    }
    
    // Calculer la nouvelle position
    let newX = this.sprite.x;
    let newY = this.sprite.y;
    
    const moveSpeed = speed * 0.016; // Normaliser pour 60fps
    
    switch (direction) {
      case 'up':
        newY -= moveSpeed;
        break;
      case 'down':
        newY += moveSpeed;
        break;
      case 'left':
        newX -= moveSpeed;
        break;
      case 'right':
        newX += moveSpeed;
        break;
    }
    
    // Vérifier les limites du monde
    if (this.isPositionValid(newX, newY)) {
      this.sprite.x = newX;
      this.sprite.y = newY;
    }
  }

  isPositionValid(x, y) {
    if (!this.sprite) return false;
    
    // Utiliser la taille réelle du sprite après scaling
    const halfWidth = (this.sprite.width * this.sprite.scaleX) / 2;
    const halfHeight = (this.sprite.height * this.sprite.scaleY) / 2;
    
    return (
      x - halfWidth >= this.worldBounds.x &&
      x + halfWidth <= this.worldBounds.x + this.worldBounds.width &&
      y - halfHeight >= this.worldBounds.y &&
      y + halfHeight <= this.worldBounds.y + this.worldBounds.height
    );
  }

  update(delta) {
    super.update(delta);
    
    if (!this.sprite) return;
    
    // Si le joueur ne bouge plus, passer à l'animation d'arrêt
    if (!this.isMoving) {
      const idleAnimation = `idle-${this.facing}`;
      if (this.currentAnimation !== idleAnimation) {
        this.sprite.play(idleAnimation);
        this.currentAnimation = idleAnimation;
      }
    }
    
    // Réinitialiser le mouvement (sera mis à jour par les contrôles)
    this.isMoving = false;
    
    // Mettre à jour les hitboxes de debug
    this.updateDebugHitboxes();
  }

  // Implémenter ICollidable
  onCollision(other) {
    if (!this.sprite) return;
    
    // Gérer les collisions avec d'autres entités
    if (other.entityType === 'wall') {
      // Revenir à la position précédente en cas de collision avec un mur
      this.sprite.x = this.lastPosition.x;
      this.sprite.y = this.lastPosition.y;
    } else if (other.entityType === 'student') {
      // Revenir à la position précédente en cas de collision avec un étudiant
      this.sprite.x = this.lastPosition.x;
      this.sprite.y = this.lastPosition.y;
      
      // Déclencher l'interaction si possible (optionnel)
      if (other.canInteract && other.canInteract(this)) {
        other.onInteraction(this);
      }
    }
  }

  // Debug : créer les hitboxes visuelles
  createDebugHitboxes() {
    // Hitbox de collision principale (rectangle rouge) - invisible par défaut
    this.collisionHitbox = this.scene.add.graphics();
    this.collisionHitbox.lineStyle(2, 0xff0000, 1); // Rouge
    this.collisionHitbox.setDepth(1002); // Au-dessus des autres éléments
    this.collisionHitbox.setVisible(false); // Invisible par défaut
    
    // Zone d'effet de bruit maximale (cercle orange) - invisible par défaut
    this.noiseMaxRange = this.scene.add.graphics();
    this.noiseMaxRange.lineStyle(2, 0xff8800, 0.7); // Orange
    this.noiseMaxRange.setDepth(1002);
    this.noiseMaxRange.setVisible(false); // Invisible par défaut
    
    // Zone d'effet de bruit minimale (cercle rouge) - invisible par défaut
    this.noiseMinRange = this.scene.add.graphics();
    this.noiseMinRange.lineStyle(2, 0xff0000, 0.8); // Rouge
    this.noiseMinRange.setDepth(1002);
    this.noiseMinRange.setVisible(false); // Invisible par défaut
    
    // Zone d'interaction (cercle bleu) - invisible par défaut
    this.interactionRange = this.scene.add.graphics();
    this.interactionRange.lineStyle(2, 0x0088ff, 0.6); // Bleu
    this.interactionRange.setDepth(1002);
    this.interactionRange.setVisible(false); // Invisible par défaut
    
    // Texte de debug compact - invisible par défaut
    this.debugText = this.scene.add.text(this.scene.sys.canvas.width - 10, 10, '', {
      fontSize: '10px',
      fill: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 }
    });
    this.debugText.setDepth(1003);
    this.debugText.setOrigin(1, 0); // Ancré en haut à droite
    this.debugText.setVisible(false); // Invisible par défaut
    
    console.log('🔍 Debug hitboxes créées pour le joueur');
  }

  // Debug : mettre à jour les hitboxes visuelles
  updateDebugHitboxes() {
    if (!this.collisionHitbox || !this.sprite) return;
    
    // Effacer les dessins précédents
    this.collisionHitbox.clear();
    this.noiseMaxRange.clear();
    this.noiseMinRange.clear();
    this.interactionRange.clear();
    
    // Position du joueur
    const x = this.sprite.x;
    const y = this.sprite.y;
    
    // Taille réelle du sprite après scaling
    const halfWidth = (this.sprite.width * this.sprite.scaleX) / 2;
    const halfHeight = (this.sprite.height * this.sprite.scaleY) / 2;
    
    // Dessiner la hitbox de collision (rectangle rouge)
    this.collisionHitbox.lineStyle(2, 0xff0000, 1);
    this.collisionHitbox.strokeRect(x - halfWidth, y - halfHeight, halfWidth * 2, halfHeight * 2);
    
    // Dessiner les zones d'effet de bruit (cercles)
    // Zone maximale d'effet (150px selon SchoolLevel.js)
    this.noiseMaxRange.lineStyle(2, 0xff8800, 0.5);
    this.noiseMaxRange.strokeCircle(x, y, 150);
    
    // Zone minimale d'effet (20px selon SchoolLevel.js)
    this.noiseMinRange.lineStyle(2, 0xff0000, 0.7);
    this.noiseMinRange.strokeCircle(x, y, 20);
    
    // Zone d'interaction (40px selon getNearbyEntities)
    this.interactionRange.lineStyle(2, 0x0088ff, 0.6);
    this.interactionRange.strokeCircle(x, y, 40);
    
    // Mettre à jour le texte de debug compact
    this.debugText.setText([
      `Pos: (${Math.round(x)}, ${Math.round(y)})`,
      `Dir: ${this.facing}`,
      `Anim: ${this.currentAnimation}`,
      '',
      'DEBUG [P]',
      '🔴 Collision',
      '🟠 Bruit max',
      '🔴 Bruit min',
      '🔵 Interaction'
    ].join('\n'));
  }

  // Méthodes spécifiques au joueur
  enableMovement() {
    this.canMove = true;
  }

  disableMovement() {
    this.canMove = false;
  }

  getFacing() {
    return this.facing;
  }

  setWorldBounds(bounds) {
    this.worldBounds = bounds;
  }

  // Obtenir les entités à proximité
  getNearbyEntities(entityManager, range = 40) {
    const allEntities = entityManager.getAllEntities();
    const nearbyEntities = [];
    
    for (const entity of allEntities) {
      if (entity !== this && this.getDistanceTo(entity) <= range) {
        nearbyEntities.push(entity);
      }
    }
    
    return nearbyEntities;
  }

  // Interagir avec les entités proches
  interact(entityManager, effectManager) {
    const nearbyEntities = this.getNearbyEntities(entityManager, 40);
    
    for (const entity of nearbyEntities) {
      if (entity.entityType === 'student') {
        // Déclencher l'interaction avec l'étudiant
        entity.onPlayerInteraction(this);
        
        // Appliquer l'effet de bruit
        if (effectManager) {
          effectManager.applyNoiseEffect();
        }
      }
    }
  }

  // Méthode pour changer d'animation manuellement si nécessaire
  playAnimation(animationKey) {
    if (this.currentAnimation !== animationKey) {
      this.sprite.play(animationKey);
      this.currentAnimation = animationKey;
    }
  }

  // Nettoyer les éléments de debug lors de la destruction
  destroy() {
    // Nettoyer les hitboxes de debug
    if (this.collisionHitbox) {
      this.collisionHitbox.destroy();
      this.collisionHitbox = null;
    }
    if (this.noiseMaxRange) {
      this.noiseMaxRange.destroy();
      this.noiseMaxRange = null;
    }
    if (this.noiseMinRange) {
      this.noiseMinRange.destroy();
      this.noiseMinRange = null;
    }
    if (this.interactionRange) {
      this.interactionRange.destroy();
      this.interactionRange = null;
    }
    if (this.debugText) {
      this.debugText.destroy();
      this.debugText = null;
    }
    
    console.log('🔍 Debug hitboxes détruites pour le joueur');
    
    // Appeler la méthode destroy() parente
    super.destroy();
  }

  // Méthode pour activer/désactiver le debug
  toggleDebugHitboxes(show = true) {
    if (this.collisionHitbox) {
      this.collisionHitbox.setVisible(show);
      this.noiseMaxRange.setVisible(show);
      this.noiseMinRange.setVisible(show);
      this.interactionRange.setVisible(show);
      this.debugText.setVisible(show);
    }
  }
} 