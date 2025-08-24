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
      // Durée générique minimale (fallback global)
      duration: config.duration || 800,
      // Fallbacks spécifiques plus sûrs par type
      playerDurationMs: config.playerDurationMs || config.duration || 800, // scream (player)
      npcCheerDurationMs: config.npcCheerDurationMs || 1800, // cheer (npc) souvent plus long
      ...config
    };
    
    // État du cri
    this.isScreaming = false;
    this.screamStartTime = 0;
    this.originalAnimation = null; // Pour revenir à l'animation précédente
    // Gestion des timers/écouteurs
    this.screamTimer = null;
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;
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
    let playedKey = null;
    if (this.scene.anims.exists(screamAnimation)) {
      console.log(`🎭 ✅ ${this.owner.entityType} commence à ${animationType} ! Animation: ${screamAnimation}`);
      this.owner.sprite.play(screamAnimation);
      playedKey = screamAnimation;
    } else {
      console.warn(`🎭 ⚠️ ${this.owner.entityType} Animation ${animationType} non trouvée: ${screamAnimation}`);
      // Fallback cohérent sur une direction sûre
      if (this.scene.anims.exists(fallbackKey)) {
        console.log(`🎭 🔄 ${this.owner.entityType} Fallback vers: ${fallbackKey}`);
        this.owner.sprite.play(fallbackKey);
        playedKey = fallbackKey;
      } else {
        console.error(`🎭 💀 ${this.owner.entityType} AUCUNE animation ${animationType} disponible !`);
      }
    }

    // Arrêt synchronisé sur la fin réelle de l'animation + timer de secours
    if (playedKey) {
      // Listener one-shot sur la fin de l'animation (clé spécifique)
      this._onAnimationEventName = `animationcomplete-${playedKey}`;
      this._onAnimationComplete = () => {
        this.stopScreamAnimation();
      };
      this.owner.sprite.once(this._onAnimationEventName, this._onAnimationComplete);

      // Calcul de la durée réelle estimée de l'animation
      // Base: fallback par type (NPC cheer plus long que le player scream)
      const baseFallback = (this.owner.entityType === 'npc')
        ? (this.config.npcCheerDurationMs || this.config.duration)
        : (this.config.playerDurationMs || this.config.duration);
      let safetyMs = baseFallback;
      try {
        const animObj = this.scene.anims.get(playedKey);
        if (animObj) {
          const frameCount = Array.isArray(animObj.frames) ? animObj.frames.length : (animObj.getTotalFrames ? animObj.getTotalFrames() : 0);
          const rate = animObj.frameRate || 24;
          if (frameCount > 0 && rate > 0) {
            const estimated = Math.ceil((frameCount / rate) * 1000) + 120; // petite marge +120ms
            safetyMs = Math.max(safetyMs, estimated);
          }
        }
      } catch (_) {}

      // Timer de secours pour s'assurer de la sortie du cri même si l'évènement ne se déclenche pas
      this.screamTimer = this.scene.time.delayedCall(safetyMs, () => {
        this.stopScreamAnimation();
      });
    } else {
      // Si rien n'a été joué, fallback spécifique par type
      const fallbackMs = (this.owner.entityType === 'npc')
        ? (this.config.npcCheerDurationMs || this.config.duration)
        : (this.config.playerDurationMs || this.config.duration);
      this.screamTimer = this.scene.time.delayedCall(fallbackMs, () => {
        this.stopScreamAnimation();
      });
    }
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

    // Nettoyage des timers et écouteurs
    try {
      if (this.screamTimer && this.screamTimer.remove) {
        this.screamTimer.remove(false);
      }
    } catch (_) {}
    this.screamTimer = null;
    if (this._onAnimationComplete) {
      const ev = this._onAnimationEventName || 'animationcomplete';
      try { this.owner?.sprite?.off(ev, this._onAnimationComplete); } catch (_) {}
    }
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;
    
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
    // Plus d'arrêt basé sur config.duration ici.
    // On s'appuie sur l'évènement 'animationcomplete-<key>' et le timer de secours.
  }

  /**
   * Nettoyage
   */
  destroy() {
    if (this.isScreaming) {
      this.stopScreamAnimation();
      }
    // Nettoyage défensif
    try {
      if (this.screamTimer && this.screamTimer.remove) {
        this.screamTimer.remove(false);
      }
    } catch (_) {}
    this.screamTimer = null;
    if (this._onAnimationComplete) {
      const ev = this._onAnimationEventName || 'animationcomplete';
      try { this.owner?.sprite?.off(ev, this._onAnimationComplete); } catch (_) {}
    }
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;
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