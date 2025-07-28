import { BaseEntity } from './BaseEntity';
import { IInteractable, ICollidable } from '../core/interfaces';
import { RandomWalkBehavior } from './behaviors/RandomWalkBehavior';

export class Student extends BaseEntity {
  constructor(scene, x, y) {
    super(scene, x, y, 'yume-nikki-player');
    this.speed = 50;
    this.entityType = 'student';
    
    // Propriétés d'animation (comme le joueur)
    this.isMoving = false;
    this.facing = 'down'; // Direction par défaut
    this.currentAnimation = 'idle-down';
    
    // Sauvegarder la position précédente pour les collisions
    this.lastPosition = { x: x, y: y };
    
    // Configurer le sprite avec le même système que le joueur
    this.sprite.setScale(0.4); // Plus petit que le joueur (0.5) pour les différencier
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setTint(0xccccff); // Teinte légèrement bleue pour les différencier
    
    // Démarrer avec l'animation d'arrêt
    this.sprite.play('idle-down');
    
    // Propriétés spécifiques à l'étudiant
    this.behavior = new RandomWalkBehavior();
    this.interactionCooldown = 0;
    this.maxInteractionCooldown = 3000; // 3 secondes
    this.hasInteracted = false;
    
    // Limites de mouvement
    this.movementBounds = {
      x: 50,
      y: 50,
      width: scene.sys.canvas.width - 100,
      height: scene.sys.canvas.height - 100
    };
    
    // État de l'étudiant
    this.isWalking = false;
    this.walkTimer = 0;
    this.walkDuration = 0;
    this.pauseTimer = 0;
    this.pauseDuration = 0;
    
    this.initRandomMovement();
    
    // Debug : créer les hitboxes
    this.createDebugHitboxes();
    
    console.log(`🎓 Étudiant créé à (${x}, ${y}), taille: ${this.sprite.width}x${this.sprite.height}`);
  }

  initRandomMovement() {
    // Initialiser le mouvement aléatoire
    this.setRandomWalkParameters();
  }

  setRandomWalkParameters() {
    // Durée de marche aléatoire (1-3 secondes)
    this.walkDuration = Math.random() * 2000 + 1000;
    // Durée de pause aléatoire (2-5 secondes)
    this.pauseDuration = Math.random() * 3000 + 2000;
    
    // Direction aléatoire
    this.currentDirection = this.getRandomDirection();
  }

  getRandomDirection() {
    const directions = ['up', 'down', 'left', 'right'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  update(delta) {
    super.update(delta);
    
    // Mettre à jour le cooldown d'interaction
    if (this.interactionCooldown > 0) {
      this.interactionCooldown -= delta;
    }
    
    // Gérer le mouvement aléatoire
    this.updateRandomMovement(delta);
    
    // Gérer les animations
    this.updateAnimations();
    
    // Mettre à jour les hitboxes de debug
    this.updateDebugHitboxes();
  }

  updateAnimations() {
    if (!this.sprite) return;
    
    // Si l'étudiant ne bouge plus, passer à l'animation d'arrêt
    if (!this.isMoving) {
      const idleAnimation = `idle-${this.facing}`;
      if (this.currentAnimation !== idleAnimation) {
        this.sprite.play(idleAnimation);
        this.currentAnimation = idleAnimation;
      }
    }
    
    // Réinitialiser le mouvement (sera mis à jour par updateRandomMovement)
    this.isMoving = false;
  }

  updateRandomMovement(delta) {
    if (this.isWalking) {
      // En cours de marche
      this.walkTimer += delta;
      
      if (this.walkTimer >= this.walkDuration) {
        // Arrêter de marcher et commencer la pause
        this.isWalking = false;
        this.walkTimer = 0;
        this.pauseTimer = 0;
      } else {
        // Continuer à marcher
        this.moveInDirection(this.currentDirection);
      }
    } else {
      // En pause
      this.pauseTimer += delta;
      
      if (this.pauseTimer >= this.pauseDuration) {
        // Recommencer à marcher
        this.isWalking = true;
        this.pauseTimer = 0;
        this.walkTimer = 0;
        this.setRandomWalkParameters();
      }
    }
  }

  moveInDirection(direction) {
    // Sauvegarder la position précédente AVANT le mouvement
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    let newX = this.sprite.x;
    let newY = this.sprite.y;
    
    const moveSpeed = this.speed * 0.016;
    
    // Mettre à jour l'état de mouvement et la direction
    this.isMoving = true;
    this.facing = direction;
    
    // Jouer l'animation de marche appropriée
    const walkAnimation = `walk-${direction}`;
    if (this.currentAnimation !== walkAnimation) {
      this.sprite.play(walkAnimation);
      this.currentAnimation = walkAnimation;
    }
    
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
    
    // Vérifier les limites
    if (this.isPositionValid(newX, newY)) {
      this.sprite.x = newX;
      this.sprite.y = newY;
    } else {
      // Changer de direction si on atteint une limite
      this.currentDirection = this.getRandomDirection();
      this.isMoving = false; // Arrêter le mouvement temporairement
    }
  }

  isPositionValid(x, y) {
    // Utiliser la taille réelle du sprite après scaling (comme le joueur)
    const halfWidth = (this.sprite.width * this.sprite.scaleX) / 2;
    const halfHeight = (this.sprite.height * this.sprite.scaleY) / 2;
    
    return (
      x - halfWidth >= this.movementBounds.x &&
      x + halfWidth <= this.movementBounds.x + this.movementBounds.width &&
      y - halfHeight >= this.movementBounds.y &&
      y + halfHeight <= this.movementBounds.y + this.movementBounds.height
    );
  }

  // Implémenter IInteractable
  canInteract(interactor) {
    return this.interactionCooldown <= 0 && interactor.entityType === 'player';
  }

  onInteraction(interactor) {
    if (!this.canInteract(interactor)) return;
    
    this.hasInteracted = true;
    this.interactionCooldown = this.maxInteractionCooldown;
    
    // Réaction à l'interaction
    this.reactToPlayer(interactor);
  }

  onPlayerInteraction(player) {
    this.onInteraction(player);
  }

  reactToPlayer(player) {
    // Arrêter le mouvement temporairement
    this.isWalking = false;
    this.isMoving = false;
    this.pauseTimer = 0;
    this.pauseDuration = 1000; // Pause plus courte après interaction
    
    // Forcer l'animation d'arrêt
    const idleAnimation = `idle-${this.facing}`;
    this.sprite.play(idleAnimation);
    this.currentAnimation = idleAnimation;
    
    // Changer légèrement la teinte pour indiquer l'interaction
    this.sprite.setTint(0xffffcc); // Teinte jaune-blanc
    
    // Restaurer la teinte originale après un délai
    this.scene.time.delayedCall(500, () => {
      this.sprite.setTint(0xccccff); // Retour à la teinte bleue originale
    });
  }

  // Méthodes utilitaires
  setMovementBounds(bounds) {
    this.movementBounds = bounds;
  }

  pauseMovement(duration = 2000) {
    this.isWalking = false;
    this.pauseTimer = 0;
    this.pauseDuration = duration;
  }

  resumeMovement() {
    this.isWalking = true;
    this.walkTimer = 0;
    this.setRandomWalkParameters();
  }

  // Obtenir l'état de l'étudiant
  getState() {
    return {
      isWalking: this.isWalking,
      hasInteracted: this.hasInteracted,
      interactionCooldown: this.interactionCooldown,
      currentDirection: this.currentDirection
    };
  }

  // Debug : créer les hitboxes visuelles
  createDebugHitboxes() {
    // Hitbox de collision principale (rectangle vert) - invisible par défaut
    this.collisionHitbox = this.scene.add.graphics();
    this.collisionHitbox.lineStyle(2, 0x00ff00, 1); // Vert
    this.collisionHitbox.setDepth(1002);
    this.collisionHitbox.setVisible(false); // Invisible par défaut
    
    // Zone d'effet de bruit autour de l'étudiant (cercle jaune) - invisible par défaut
    this.noiseEffectRange = this.scene.add.graphics();
    this.noiseEffectRange.lineStyle(2, 0xffff00, 0.6); // Jaune
    this.noiseEffectRange.setDepth(1002);
    this.noiseEffectRange.setVisible(false); // Invisible par défaut
    
    // Texte de debug avec ID de l'étudiant - invisible par défaut
    this.debugText = this.scene.add.text(this.sprite.x, this.sprite.y - 40, `Student ${this.id || '?'}`, {
      fontSize: '10px',
      fill: '#ffff00',
      backgroundColor: '#000000',
      padding: { x: 2, y: 2 }
    });
    this.debugText.setDepth(1003);
    this.debugText.setOrigin(0.5, 0.5);
    this.debugText.setVisible(false); // Invisible par défaut
    
    console.log(`🔍 Debug hitboxes créées pour l'étudiant à (${this.sprite.x}, ${this.sprite.y})`);
  }

  // Debug : mettre à jour les hitboxes visuelles
  updateDebugHitboxes() {
    if (!this.collisionHitbox) return;
    
    // Effacer les dessins précédents
    this.collisionHitbox.clear();
    this.noiseEffectRange.clear();
    
    // Position de l'étudiant
    const x = this.sprite.x;
    const y = this.sprite.y;
    
    // Taille réelle du sprite après scaling (comme le joueur)
    const halfWidth = (this.sprite.width * this.sprite.scaleX) / 2;
    const halfHeight = (this.sprite.height * this.sprite.scaleY) / 2;
    
    // Dessiner la hitbox de collision (rectangle vert)
    this.collisionHitbox.lineStyle(2, 0x00ff00, 1);
    this.collisionHitbox.strokeRect(x - halfWidth, y - halfHeight, halfWidth * 2, halfHeight * 2);
    
    // Dessiner la zone d'effet de bruit (cercle jaune)
    // Montrer la zone dans laquelle le joueur peut être affecté par cet étudiant
    this.noiseEffectRange.lineStyle(2, 0xffff00, 0.4);
    this.noiseEffectRange.strokeCircle(x, y, 150); // maxEffectDistance
    
    // Mettre à jour le texte de debug
    this.debugText.setPosition(x, y - 40);
    this.debugText.setText([
      `S${this.id || '?'}`,
      `(${Math.round(x)}, ${Math.round(y)})`,
      this.isWalking ? '🚶' : '🧍'
    ].join('\n'));
  }

  // Nettoyer les éléments de debug lors de la destruction
  destroy() {
    // Nettoyer les hitboxes de debug
    if (this.collisionHitbox) {
      this.collisionHitbox.destroy();
      this.collisionHitbox = null;
    }
    if (this.noiseEffectRange) {
      this.noiseEffectRange.destroy();
      this.noiseEffectRange = null;
    }
    if (this.debugText) {
      this.debugText.destroy();
      this.debugText = null;
    }
    
    console.log(`🔍 Debug hitboxes détruites pour l'étudiant`);
    
    // Appeler la méthode destroy() parente
    super.destroy();
  }

  // Méthode pour activer/désactiver le debug
  toggleDebugHitboxes(show = true) {
    if (this.collisionHitbox) {
      this.collisionHitbox.setVisible(show);
      this.noiseEffectRange.setVisible(show);
      this.debugText.setVisible(show);
    }
  }

  // Implémenter ICollidable
  onCollision(other) {
    if (!this.sprite) return;
    
    // Gérer les collisions avec d'autres entités
    if (other.entityType === 'player') {
      // Revenir à la position précédente en cas de collision avec le joueur
      this.sprite.x = this.lastPosition.x;
      this.sprite.y = this.lastPosition.y;
      
      // Arrêter le mouvement et changer de direction
      this.isWalking = false;
      this.isMoving = false;
      this.pauseTimer = 0;
      this.pauseDuration = 500; // Pause courte après collision
      this.currentDirection = this.getRandomDirection();
      
      // Déclencher l'interaction si possible
      if (this.canInteract(other)) {
        this.onInteraction(other);
      }
    }
  }
} 