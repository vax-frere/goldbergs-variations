/**
 * 🎯 SYSTÈME AAA : ACTUAL MOVEMENT DETECTION
 * Détecte le mouvement physique réel au lieu de la vélocité théorique
 * Parfait pour les NPCs poussés par d'autres !
 */
export class CharacterAnimationBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement
    this.scene = owner.scene;
    
    // Configuration
    this.config = {
      spriteKey: config.spriteKey || 'character-spritesheet',
      frameRate: config.frameRate || 8,
      ...config
    };
    
    // État d'animation
    this.isMoving = false;
    this.facing = 'down'; // Direction par défaut
    this.currentAnimation = ''; // Pas d'animation au démarrage - sera définie par ACTUAL MOVEMENT DETECTION
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION
    this.lastPosition = {
      x: owner.sprite.x,
      y: owner.sprite.y
    };
    this.movementHistory = []; // Historique des mouvements
    this.realMovementThreshold = 0.8; // Distance réelle minimum pour "bouger" (px/frame)
    this.realIdleThreshold = 0.3; // En dessous = idle (px/frame)
    
    // Stabilisation pour éviter le flickering
    this.lastDirectionChange = 0;
    this.directionChangeDelay = 150; // 150ms minimum entre changements
    
    // Mapping des 8 directions
    this.directions = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'];
    this.directionAngles = [
      { dir: 'up', angle: -Math.PI/2, range: Math.PI/8 },
      { dir: 'up-right', angle: -Math.PI/4, range: Math.PI/8 },
      { dir: 'right', angle: 0, range: Math.PI/8 },
      { dir: 'down-right', angle: Math.PI/4, range: Math.PI/8 },
      { dir: 'down', angle: Math.PI/2, range: Math.PI/8 },
      { dir: 'down-left', angle: 3*Math.PI/4, range: Math.PI/8 },
      { dir: 'left', angle: Math.PI, range: Math.PI/8 },
      { dir: 'up-left', angle: -3*Math.PI/4, range: Math.PI/8 }
    ];
    
    // Créer les animations si elles n'existent pas
    this.createAnimations();
    
    // 🚫 SUPPRIMÉ: Démarrage automatique en idle - seul ACTUAL MOVEMENT DETECTION contrôle
    // this.playAnimation('idle-down');
  }

  /**
   * Créer toutes les animations de personnage (8 directions)
   */
  createAnimations() {
    // Vérifier si les animations existent déjà pour éviter les doublons
    if (this.scene.anims.exists('walk-up')) return;

    // Créer les animations pour les 8 directions
    this.directions.forEach((direction, index) => {
      // Animations idle (première ligne du spritesheet)
      this.scene.anims.create({
        key: `idle-${direction}`,
        frames: [{ key: this.config.spriteKey, frame: index }], // Frame 0-7 pour les idles
        frameRate: 1
      });

      // Animations de marche (lignes 2-9 du spritesheet, 8 frames par ligne)
      const walkStartFrame = (index + 1) * 8; // Ligne 1+ * 8 frames par ligne
      const walkEndFrame = walkStartFrame + 7; // 8 frames par cycle
      
      this.scene.anims.create({
        key: `walk-${direction}`,
        frames: this.scene.anims.generateFrameNumbers(this.config.spriteKey, { 
          start: walkStartFrame, 
          end: walkEndFrame 
        }),
        frameRate: this.config.frameRate,
        repeat: -1
      });
    });
  }

  /**
   * 🎯 AAA: ACTUAL MOVEMENT DETECTION - Détecte le mouvement physique réel
   * @param {number} delta - Temps écoulé depuis la dernière frame
   */
  update(delta = 16) {
    if (!this.owner || !this.owner.sprite) {
      console.warn(`🎬 WARN: owner ou sprite manquant pour ${this.owner?.entityType || 'unknown'}`);
      return;
    }

    const currentTime = Date.now();
    const currentPosition = {
      x: this.owner.sprite.x,
      y: this.owner.sprite.y
    };

    // 🎯 CALCUL DU MOUVEMENT PHYSIQUE RÉEL
    const realMovement = {
      x: currentPosition.x - this.lastPosition.x,
      y: currentPosition.y - this.lastPosition.y
    };
    
    // Distance réellement parcourue (physique)
    const realDistance = Math.sqrt(realMovement.x * realMovement.x + realMovement.y * realMovement.y);
    

    // 🎯 SIMPLE: Détection directe sans moyennes compliquées
    const isCurrentlyMoving = realDistance > 0.5; // Seuil simple: 0.5px par frame
    
    // Simple hysteresis: différents seuils pour entrer/sortir
    if (this.isMoving) {
      // Déjà en mouvement: seuil plus bas pour continuer (évite flickering)
      this.isMoving = realDistance > 0.1;
    } else {
      // Immobile: seuil plus élevé pour commencer
      this.isMoving = realDistance > 0.3;
    }



    // Calculer la direction du mouvement réel (si suffisant)
    if (this.isMoving && realDistance > 0.3) {
      // Empêcher les changements de direction trop fréquents
      if (currentTime - this.lastDirectionChange >= this.directionChangeDelay) {
        const newFacing = this.calculateDirectionFromMovement(realMovement);
        
        if (newFacing !== this.facing) {
          this.facing = newFacing;
          this.lastDirectionChange = currentTime;
          
 
        }
      }
    }

    // Sauvegarder position pour la prochaine frame
    this.lastPosition.x = currentPosition.x;
    this.lastPosition.y = currentPosition.y;

    // Appliquer l'animation appropriée
    this.updateAnimation();
  }

  /**
   * 🎯 AAA: Calculer la direction selon le mouvement physique réel (8 directions)
   */
  calculateDirectionFromMovement(realMovement) {
    // Calculer l'angle du vecteur de mouvement réel
    const angle = Math.atan2(realMovement.y, realMovement.x);
    
    // Trouver la direction la plus proche
    let closestDirection = this.facing;
    let minAngleDiff = Math.PI;
    
    this.directionAngles.forEach(directionData => {
      let angleDiff = Math.abs(angle - directionData.angle);
      
      // Gérer le wraparound des angles (ex: -π et π sont proches)
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
      
      if (angleDiff < minAngleDiff) {
        minAngleDiff = angleDiff;
        closestDirection = directionData.dir;
      }
    });
    
    // Hystérésis : ne changer que si la différence d'angle est assez significative
    const hysteresisThreshold = Math.PI / 16; // 22.5 degrés
    
    if (minAngleDiff < hysteresisThreshold || this.facing === closestDirection) {
      return closestDirection;
    }
    
    // Si le changement n'est pas assez significatif, garder la direction actuelle
    return this.facing;
  }

  /**
   * Mettre à jour l'animation selon l'état actuel
   */
  updateAnimation() {
    const targetAnimation = this.isMoving ? `walk-${this.facing}` : `idle-${this.facing}`;
    

    if (this.currentAnimation !== targetAnimation) {

      this.playAnimation(targetAnimation);
    }
  }

  /**
   * 🎯 AAA: Appliquer l'animation calculée par ACTUAL MOVEMENT DETECTION
   */
  playAnimation(animationKey) {
    // 🔍 DEBUG: Vérifications
    if (!this.owner.sprite) {
      console.error(`🎬 ERROR: owner.sprite n'existe pas pour ${this.owner.entityType}`);
      return;
    }
    
    if (!this.scene.anims.exists(animationKey)) {
      console.error(`🎬 ERROR: Animation ${animationKey} n'existe pas`);
      return;
    }
    
    // ✅ APPLIQUE l'animation au sprite (déclenchée par ACTUAL MOVEMENT DETECTION)
    this.owner.sprite.play(animationKey);
    
    // ✅ CONSERVÉ: Tracking d'état pour ACTUAL MOVEMENT DETECTION
    this.currentAnimation = animationKey;
  }

  /**
   * Forcer une direction sans vélocité (8 directions supportées)
   */
  setFacing(direction) {
    if (this.directions.includes(direction)) {
      this.facing = direction;
      this.lastDirectionChange = Date.now();
      this.updateAnimation();
    }
  }

  /**
   * Forcer un état (moving/idle)
   */
  setMoving(moving) {
    this.isMoving = moving;
    this.updateAnimation();
  }

  /**
   * Obtenir l'état actuel
   */
  getState() {
    return {
      facing: this.facing,
      isMoving: this.isMoving,
      currentAnimation: this.currentAnimation
    };
  }

  /**
   * 🎯 AAA: Configurer les seuils de mouvement physique réel
   */
  setMovementThresholds(movementThreshold, idleThreshold) {
    this.realMovementThreshold = movementThreshold;
    this.realIdleThreshold = idleThreshold;
  }
} 