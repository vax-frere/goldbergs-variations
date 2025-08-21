/**
 * 🎯 SOLID: NpcMovementController
 * Responsabilité : Gestion du mouvement et de la vélocité du NPC
 */
export class NpcMovementController {
  constructor(npc) {
    this.npc = npc;
    
    // Propriétés de mouvement (alignées sur le joueur)
    this.speed = 150; // Vitesse de base px/s – même valeur que le joueur
    this.velocity = { x: 0, y: 0 };
    this.lastPosition = { x: 0, y: 0 };
    
    // Configuration des vitesses selon les états (même référentiel que le joueur)
    this.speedConfig = {
      normal: 150,
      following: 150,
      fleeing: 200, // Fuite rapide (déclenche potentiellement le run)
      migrating: 120,
      trembling: 0
    };
    
    console.log('🏃 NpcMovementController créé');
  }

  /**
   * Définir la vitesse de base
   */
  setSpeed(speed) {
    this.speed = speed;
    this.speedConfig.normal = speed;
    this.speedConfig.following = speed;
    this.speedConfig.fleeing = 200; // Fuite fixée à 200px/s
  }

  /**
   * Obtenir la vitesse actuelle selon l'état
   */
  getCurrentSpeed(state) {
    return this.speedConfig[state] || this.speedConfig.normal;
  }

  /**
   * Calculer la vélocité finale pour un état donné
   */
  calculateVelocity(state, stateController, delta) {
    // 🎯 PRIORITÉ ABSOLUE: Si le NPC est en train de crier, il ne peut pas bouger
    if (this.npc.shoutBehavior && this.npc.shoutBehavior.isScreaming) {
      return { x: 0, y: 0 };
    }
    
    let finalVelocity = { x: 0, y: 0 };
    
    switch (state) {
      case 'normal':
      case 'following':
        // Utiliser NpcBehaviorController pour le mouvement de base
        if (this.npc.behaviorController) {
          const movementVelocity = this.npc.behaviorController.calculateVelocity(delta);
          finalVelocity.x = movementVelocity.x;
          finalVelocity.y = movementVelocity.y;
        }
        break;
        
      case 'fleeing':
        finalVelocity = this.calculateFleeingVelocity(stateController, delta);
        break;
        
      case 'trembling':
        finalVelocity = { x: 0, y: 0 }; // Pas de mouvement en tremblant
        break;
        
      case 'migrating':
      case 'organism_migrating':
        // La vélocité est gérée par NpcMigrationController
        finalVelocity = this.velocity;
        break;
        
      default:
        finalVelocity = { x: 0, y: 0 };
    }
    
    return this.capVelocity(finalVelocity, state);
  }

  /**
   * Calculer la vélocité de fuite
   */
  calculateFleeingVelocity(stateController, delta) {
    const fleeData = stateController.getFleeingData();
    const fleeSpeed = this.getCurrentSpeed('fleeing');
    
    return {
      x: fleeData.direction.x * fleeSpeed,
      y: fleeData.direction.y * fleeSpeed
    };
  }

  /**
   * Appliquer la vélocité au sprite et à la physique
   */
  applyVelocity(velocity) {
    // Stocker la vélocité
    this.velocity = velocity;
    
    // Appliquer au body physique de Phaser
    if (this.npc.sprite && this.npc.sprite.body) {
      this.npc.sprite.body.setVelocity(velocity.x, velocity.y);
    }
  }

  /**
   * Limiter la vélocité selon l'état
   */
  capVelocity(velocity, state) {
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const maxSpeed = this.getCurrentSpeed(state);
    
    // Si la vitesse dépasse le maximum, on la limite
    if (currentSpeed > maxSpeed) {
      const ratio = maxSpeed / currentSpeed;
      
      return {
        x: velocity.x * ratio,
        y: velocity.y * ratio
      };
    }
    
    return velocity; // Vitesse OK, pas de modification
  }

  /**
   * Sauvegarder la position précédente
   */
  saveLastPosition() {
    if (this.npc.sprite) {
      this.lastPosition.x = this.npc.sprite.x;
      this.lastPosition.y = this.npc.sprite.y;
    }
  }

  /**
   * Restaurer la position précédente (pour les collisions)
   */
  restoreLastPosition() {
    if (this.npc.sprite) {
      this.npc.sprite.x = this.lastPosition.x;
      this.npc.sprite.y = this.lastPosition.y;
    }
  }

  /**
   * Vérifier si une position est valide
   */
  isPositionValid(x, y) {
    if (!this.npc.sprite) return false;
    
    const radius = 8; // Rayon du cercle
    const screenWidth = this.npc.scene.scale.width;
    const screenHeight = this.npc.scene.scale.height;
    
    return (
      x - radius >= 0 &&
      x + radius <= screenWidth &&
      y - radius >= 0 &&
      y + radius <= screenHeight
    );
  }

  /**
   * Obtenir la vélocité actuelle
   */
  getVelocity() {
    return this.velocity;
  }

  /**
   * Définir la vélocité manuellement
   */
  setVelocity(velocity) {
    this.velocity = velocity;
  }

  /**
   * Obtenir la vélocité physique réelle (après collisions)
   */
  getRealVelocity() {
    if (this.npc.sprite && this.npc.sprite.body) {
      return {
        x: this.npc.sprite.body.velocity.x,
        y: this.npc.sprite.body.velocity.y
      };
    }
    return this.velocity;
  }

  /**
   * Arrêter le mouvement
   */
  stop() {
    this.velocity = { x: 0, y: 0 };
    if (this.npc.sprite && this.npc.sprite.body) {
      this.npc.sprite.body.setVelocity(0, 0);
    }
  }

  /**
   * Vérifier si le NPC bouge
   */
  isMoving() {
    const threshold = 0.1;
    return Math.abs(this.velocity.x) > threshold || Math.abs(this.velocity.y) > threshold;
  }

  /**
   * Mettre à jour le mouvement
   */
  update(delta) {
    // Sauvegarder la position pour les collisions
    this.saveLastPosition();
  }

  /**
   * Gérer les collisions
   */
  onCollision(other) {
    // Revenir à la position précédente en cas de collision
    if (other.entityType === 'wall' || other.entityType === 'npc' || other.entityType === 'player') {
      this.restoreLastPosition();
    }
  }

  /**
   * Nettoyer le composant
   */
  destroy() {
    this.velocity = { x: 0, y: 0 };
    console.log('🗑️ NpcMovementController détruit');
  }
} 