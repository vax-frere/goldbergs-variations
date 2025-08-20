/**
 * 🎯 NOUVEAU : Système de cri avec animation zombiescream
 * Remplace les onomatopées visuelles par l'animation zombiescream du personnage
 */
export class ShoutBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement (Player ou Npc)
    this.scene = owner.scene;
    
    // Configuration par défaut
    this.config = {
      duration: config.duration || 800, // Durée du cri en millisecondes (réduite car animation 3x plus rapide)
      ...config
    };
    
    // État du cri
    this.isScreaming = false;
    this.screamStartTime = 0;
    this.originalAnimation = null; // Pour revenir à l'animation précédente
  }

  /**
   * 🎯 API PUBLIQUE: Méthode principale pour crier
   * Déclenche l'animation zombiescream
   */
  shout() {
    if (this.isScreaming) {
      return; // Déjà en train de crier
    }
    
    this.startScreamAnimation();
  }

  /**
   * Démarrer l'animation de cri
   */
  startScreamAnimation() {
    if (!this.owner.sprite || !this.owner.animationBehavior) {
      return;
    }

    // Sauvegarder l'animation actuelle pour y revenir plus tard
    this.originalAnimation = this.owner.animationBehavior.currentAnimation;
      
    // Marquer comme en train de crier
    this.isScreaming = true;
    this.screamStartTime = Date.now();
      
    // Arrêter le mouvement pendant le cri
    if (this.owner.movementController) {
      this.owner.movementController.stopMovement();
    }
    
    // Déterminer la direction du cri basée sur la direction actuelle
    // IMPORTANT: les clés d'animations créées sont `zombiescream-<facing>`
    // où <facing> ∈ {up, up-right, right, down-right, down, down-left, left, up-left}
    const facing = this.owner.animationBehavior.facing || 'down';
    const screamAnimation = `zombiescream-${facing}`;
    console.log(`🧟 Scream → facing=${facing}, animationKey=${screamAnimation}`);
      
    // Jouer l'animation zombiescream
    if (this.scene.anims.exists(screamAnimation)) {
      console.log(`🧟 ${this.owner.entityType} commence à crier ! Animation: ${screamAnimation}`);
      this.owner.sprite.play(screamAnimation);
    } else {
      console.warn(`⚠️ Animation de cri non trouvée: ${screamAnimation}`);
      // Fallback cohérent sur une direction sûre
      const fallbackKey = 'zombiescream-down';
      if (this.scene.anims.exists(fallbackKey)) {
        this.owner.sprite.play(fallbackKey);
      }
    }
    
    // Programmer l'arrêt du cri
    this.scene.time.delayedCall(this.config.duration, () => {
      this.stopScreamAnimation();
    });
      }
      
  /**
   * Arrêter l'animation de cri et revenir à l'animation précédente
   */
  stopScreamAnimation() {
    if (!this.isScreaming) {
      return;
      }
      
    console.log(`🧟 ${this.owner.entityType} arrête de crier`);
    
    this.isScreaming = false;
    this.screamStartTime = 0;
    
    // Reprendre le comportement d'animation normal
    if (this.owner.animationBehavior) {
      // Forcer une mise à jour de l'animation pour revenir au comportement normal
      this.owner.animationBehavior.updateAnimation();
    }
  }

  /**
   * Mise à jour du comportement (appelée chaque frame)
   */
  update(delta) {
    // Vérifier si le cri doit s'arrêter (sécurité au cas où le timer échoue)
    if (this.isScreaming) {
      const elapsed = Date.now() - this.screamStartTime;
      if (elapsed >= this.config.duration) {
        this.stopScreamAnimation();
      }
    }
  }

  /**
   * Nettoyage
   */
  destroy() {
    if (this.isScreaming) {
      this.stopScreamAnimation();
      }
  }

  /**
   * Vérifier si en train de crier
   */
  hasActiveShapes() {
    return this.isScreaming;
  }

  /**
   * Obtenir le nombre de cris actifs (0 ou 1)
   */
  getActiveShapeCount() {
    return this.isScreaming ? 1 : 0;
  }
} 