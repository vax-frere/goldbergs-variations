/**
 * 🎯 SOLID REFACTOR: PlayerMovementController
 * Responsabilité unique : Gérer le mouvement et la physique du joueur
 */
export class PlayerMovementController {
  constructor(player) {
    this.player = player;
    this.sprite = player.sprite;
    
    // Configuration du mouvement
    this.speed = 150;
    this.velocity = { x: 0, y: 0 };
    this.canMove = true;
    this.lastPosition = { x: 0, y: 0 };
    this.isSprinting = false;
    this.sprintSpeed = 220; // Vitesse de course (doit dépasser le seuil run)
    
    // Limites du monde
    this.worldBounds = {
      x: 0,
      y: 0,
      width: player.scene.sys.canvas.width,
      height: player.scene.sys.canvas.height
    };
    
    this.setupPhysics();
  }

  /**
   * Configuration physique spéciale pour le joueur
   */
  setupPhysics() {
    if (this.sprite.body) {
      this.sprite.body.setMass(5000); // Plus lourd pour pousser les NPCs
      this.sprite.body.setDrag(60, 60); // Drag uniforme cohérent avec le niveau
      this.sprite.body.setBounce(0.1, 0.1); // Moins de rebond pour stabilité de vitesse
      console.log('💪 PlayerMovement: masse=5000, drag=60, bounce=0.1');
    }
  }

  /**
   * Définir le mouvement en 8 directions
   */
  setMovement(directions, forceMovement = false) {
    if (!this.sprite) return;
    if (!forceMovement && (!this.canMove || !this.player.inputEnabled || this.player.shoutBehavior?.isScreaming)) return;
    
    // Réinitialiser la vélocité
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    // Calculer la vélocité basée sur les directions
    if (directions.up) this.velocity.y -= 1;
    if (directions.down) this.velocity.y += 1;
    if (directions.left) this.velocity.x -= 1;
    if (directions.right) this.velocity.x += 1;
    
    // Normaliser pour les mouvements diagonaux
    const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (magnitude > 0) {
      this.velocity.x = (this.velocity.x / magnitude);
      this.velocity.y = (this.velocity.y / magnitude);
      
      // Protection supplémentaire contre les valeurs > 1
      const finalMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (finalMagnitude > 1.0) {
        this.velocity.x = this.velocity.x / finalMagnitude;
        this.velocity.y = this.velocity.y / finalMagnitude;
      }
    }
    
    // INTRO FIX: Appliquer immédiatement si mouvement forcé
    if (forceMovement && this.sprite.body) {
      const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
      const physicsVelocityX = this.velocity.x * currentSpeed;
      const physicsVelocityY = this.velocity.y * currentSpeed;
      
      this.sprite.body.setVelocity(physicsVelocityX, physicsVelocityY);
    }
  }

  /**
   * Arrêter tout mouvement
   */
  stopMovement() {
    this.setMovement({ up: false, down: false, left: false, right: false }, true);
  }

  /**
   * Mettre à jour le mouvement (appelé chaque frame)
   */
  update(delta) {
    if (!this.sprite) return;
    
    // Clamp delta pour éviter les téléportations
    const clampedDelta = Math.min(delta, 33);
    
    // Sauvegarder position précédente
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    // Appliquer la vélocité via physique Phaser
    const isMoving = (this.velocity.x !== 0 || this.velocity.y !== 0);
    
    if (isMoving) {
      if (this.sprite.body) {
        const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;
        this.sprite.body.setVelocity(
          this.velocity.x * currentSpeed,
          this.velocity.y * currentSpeed
        );
      }
    } else {
      if (this.sprite.body) {
        this.sprite.body.setVelocity(0, 0);
      }
    }
  }

  /**
   * Activer/désactiver le sprint (Shift maintenu)
   */
  setSprintEnabled(enabled) {
    this.isSprinting = !!enabled;
  }

  /**
   * Obtenir la vélocité physique réelle (après collisions, drag, etc.)
   */
  getRealVelocity() {
    return this.sprite.body ? {
      x: this.sprite.body.velocity.x,
      y: this.sprite.body.velocity.y
    } : this.velocity;
  }

  /**
   * Vérifier si le joueur bouge
   */
  isMoving() {
    return this.velocity.x !== 0 || this.velocity.y !== 0;
  }

  /**
   * Définir les limites du monde
   */
  setWorldBounds(bounds) {
    this.worldBounds = bounds;
  }

  /**
   * Vérifier si une position est valide
   */
  isPositionValid(x, y) {
    const sprite = this.sprite;
    if (!sprite) return false;
    
    const halfWidth = sprite.displayWidth / 2;
    const halfHeight = sprite.displayHeight / 2;
    const screenWidth = this.player.scene.scale.width;
    const screenHeight = this.player.scene.scale.height;
    
    return (
      x - halfWidth >= 0 &&
      x + halfWidth <= screenWidth &&
      y - halfHeight >= 0 &&
      y + halfHeight <= screenHeight
    );
  }

  /**
   * Activer/désactiver le mouvement
   */
  setCanMove(canMove) {
    this.canMove = canMove;
  }

  /**
   * Nettoyer
   */
  destroy() {
    // Rien de spécial à nettoyer pour le mouvement
    console.log('🚮 PlayerMovementController détruit');
  }
} 