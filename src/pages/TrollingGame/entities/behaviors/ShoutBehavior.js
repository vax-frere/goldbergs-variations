/**
 * 🎯 SYSTÈME DE CRI DIFFÉRENCIÉ
 * Player : Animation zombiescream (cri effrayant)
 * NPCs : Animation cheerwithbothhandsup (célébration/encouragement)
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
      console.error(`🧟 ❌ ${this.owner.entityType}: Sprite ou animationBehavior manquant`);
      return;
    }

    // 🎯 DIAGNOSTIC: Vérifier que les animations de cri existent
    const diagnosticData = {
      entityType: this.owner.entityType,
      hasAnimationBehavior: !!this.owner.animationBehavior,
      facing: this.owner.animationBehavior.facing
    };
    
    if (this.owner.entityType === 'npc') {
      // Diagnostic pour les animations cheerwithbothhandsup des NPCs
      diagnosticData.cheerDownExists = this.scene.anims.exists('cheerwithbothhandsup-down');
      diagnosticData.cheerUpExists = this.scene.anims.exists('cheerwithbothhandsup-up');
      diagnosticData.cheerLeftExists = this.scene.anims.exists('cheerwithbothhandsup-left');
      diagnosticData.cheerRightExists = this.scene.anims.exists('cheerwithbothhandsup-right');
    } else {
      // Diagnostic pour les animations zombiescream du joueur
      diagnosticData.zombiescreamDownExists = this.scene.anims.exists('zombiescream-down');
      diagnosticData.zombiescreamUpExists = this.scene.anims.exists('zombiescream-up');
      diagnosticData.zombiescreamLeftExists = this.scene.anims.exists('zombiescream-left');
      diagnosticData.zombiescreamRightExists = this.scene.anims.exists('zombiescream-right');
    }
    
    console.log(`🎭 🔍 ${this.owner.entityType} diagnostic animations:`, diagnosticData);

    // S'assurer que les animations existent pour cette entité
    if (this.owner.animationBehavior.ensureAnimationsExist) {
      this.owner.animationBehavior.ensureAnimationsExist();
    }

    // Sauvegarder l'animation actuelle pour y revenir plus tard
    this.originalAnimation = this.owner.animationBehavior.currentAnimation;
      
    // Marquer comme en train de crier
    this.isScreaming = true;
    this.screamStartTime = Date.now();
      
    // Arrêter le mouvement pendant le cri
    if (this.owner.movementController) {
      // Utiliser la bonne méthode selon le type d'entité
      if (this.owner.movementController.stopMovement) {
        this.owner.movementController.stopMovement(); // Player
      } else if (this.owner.movementController.stop) {
        this.owner.movementController.stop(); // NPC
      }
    }
    
    // Déterminer la direction du cri basée sur la direction actuelle
    const facing = this.owner.animationBehavior.facing || 'down';
    
    // 🎯 DIFFÉRENCIATION: Animation selon le type d'entité
    let screamAnimation, fallbackKey, animationType;
    
    if (this.owner.entityType === 'npc') {
      // 🙌 NPCs utilisent cheerwithbothhandsup (célébration)
      screamAnimation = `cheerwithbothhandsup-${facing}`;
      fallbackKey = 'cheerwithbothhandsup-down';
      animationType = 'cheer';
    } else {
      // 🧟 Player garde zombiescream (cri effrayant)
      screamAnimation = `zombiescream-${facing}`;
      fallbackKey = 'zombiescream-down';
      animationType = 'scream';
    }
    
    console.log(`🎭 ${this.owner.entityType} ${animationType} → facing=${facing}, animationKey=${screamAnimation}`);
      
    // Jouer l'animation appropriée
    if (this.scene.anims.exists(screamAnimation)) {
      console.log(`🎭 ✅ ${this.owner.entityType} commence à ${animationType} ! Animation: ${screamAnimation}`);
      this.owner.sprite.play(screamAnimation);
    } else {
      console.warn(`🎭 ⚠️ ${this.owner.entityType} Animation ${animationType} non trouvée: ${screamAnimation}`);
      // Fallback cohérent sur une direction sûre
      if (this.scene.anims.exists(fallbackKey)) {
        console.log(`🎭 🔄 ${this.owner.entityType} Fallback vers: ${fallbackKey}`);
        this.owner.sprite.play(fallbackKey);
      } else {
        console.error(`🎭 💀 ${this.owner.entityType} AUCUNE animation ${animationType} disponible !`);
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
    
    // 🎯 NOUVEAU: Reprendre le mouvement pour les NPCs après le cri
    if (this.owner.movementController && this.owner.entityType === 'npc') {
      // Les NPCs reprennent automatiquement leur logique de mouvement normale
      // (following, migrating, etc.) via leur update cycle
    }
    
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