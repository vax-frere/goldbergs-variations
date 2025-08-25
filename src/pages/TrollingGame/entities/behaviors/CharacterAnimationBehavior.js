/**
 * 🎯 SYSTÈME AAA : ACTUAL MOVEMENT DETECTION
 * Détecte le mouvement physique réel au lieu de la vélocité théorique
 * Parfait pour les NPCs poussés par d'autres !
 * ✨ VERSION ANTI-FLICKERING avec hysteresis amélioré
 * 🎨 NOUVEAU : Support du spritesheet multi-animations
 */
export class CharacterAnimationBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement
    this.scene = owner.scene;
    
    // Configuration
    this.config = {
      spriteKey: config.spriteKey || 'character-spritesheet',
      frameRate: config.frameRate || 8,
      idleAnimation: config.idleAnimation || 'idle9', // Animation d'inactivité
      walkAnimation: config.walkAnimation || 'walking', // Animation de marche
      runAnimation: config.runAnimation || 'running',   // Animation de course
      runningSpeedThreshold: config.runningSpeedThreshold || 160, // px/s (aligné sur fuite)
      ...config
    };
    
    // État d'animation
    this.isMoving = false;
    this.facing = 'down'; // Direction par défaut
    this.currentAnimation = ''; // Pas d'animation au démarrage
    
    // Animation forcée (ex: trembling spécifique)
    this.forcedAnimationName = null; // ex: 'headholdinpain'
    
    // Vitesse réelle (px/s) mesurée par déplacement effectif frame-à-frame
    this.realSpeedPxPerSec = 0;
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION
    this.lastPosition = {
      x: owner.sprite.x,
      y: owner.sprite.y
    };
    
    // 🛠️ AMÉLIORATION : Hysteresis renforcé pour éliminer le flickering
    this.movementBuffer = []; // Buffer des derniers mouvements
    this.bufferSize = 3; // Nombre de frames à analyser
    this.movingFramesRequired = 2; // Frames consécutives requises pour considérer un mouvement
    this.stoppedFramesRequired = 3; // Frames consécutives requises pour s'arrêter
    
    // 🛠️ AMÉLIORATION : Seuils plus stables
    this.movementThreshold = 0.5; // Seuil pour détecter un mouvement
    this.idleThreshold = 0.3; // Seuil pour détecter l'arrêt (plus bas)
    
    // Stabilisation pour éviter le flickering
    this.lastDirectionChange = 0;
    this.directionChangeDelay = 200; // 200ms minimum entre changements (augmenté)
    this.directionBuffer = []; // Buffer pour la direction
    this.directionStabilityRequired = 2; // Frames requises pour changer de direction
    
    // 🎨 NOUVEAU : Mapping des directions (ancien format -> nouveau spritesheet)
    this.directions = ['up', 'up-right', 'right', 'down-right', 'down', 'down-left', 'left', 'up-left'];
    // Mapping direct entre les directions logiques (jeu) et les lignes du spritesheet
    // Spritesheet directions (par ligne) : front, frontright, right, backright, back, backleft, left, frontleft
    this.directionMapping = {
      'up': 'back',
      'up-right': 'backright',
      'right': 'right',
      'down-right': 'frontright',
      'down': 'front',
      'down-left': 'frontleft',
      'left': 'left',
      'up-left': 'backleft'
    };
    
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
    
    // 🎨 NOUVEAU : Métadonnées du spritesheet multi-animations
    this.spritesheetMetadata = null;
    this.metadataLoaded = false;
    // Désynchronisation légère des animations bouclées (appliquée une seule fois par clé)
    this._randomizedLoopKeys = new Set();
    
    // 🛠️ AMÉLIORATION : Créer les animations une seule fois de manière thread-safe
    this.loadMetadataAndCreateAnimations();
  }

  /**
   * 🎨 NOUVEAU : Charger les métadonnées depuis Phaser cache et créer les animations
   */
  loadMetadataAndCreateAnimations() {
    // Attendre que Phaser ait chargé les métadonnées
    if (this.scene.cache.json.exists('character-metadata')) {
      this.spritesheetMetadata = this.scene.cache.json.get('character-metadata');
      this.metadataLoaded = true;
      
      console.log('🎨 Métadonnées du spritesheet chargées depuis Phaser:', this.spritesheetMetadata.animations);
      
      // Créer les animations maintenant qu'on a les métadonnées
    this.ensureAnimationsExist();
    } else {
      // Réessayer plus tard si les métadonnées ne sont pas encore chargées
      this.scene.time.delayedCall(100, () => this.loadMetadataAndCreateAnimations());
    }
  }

  /**
   * 🛠️ AMÉLIORATION : Gestion thread-safe des animations globales
   */
  ensureAnimationsExist() {
    // Vérifier si les animations existent déjà (créées par une autre entité)
    const walkAnimationsExist = this.scene.anims.exists('walk-down');
    const zombiescreamAnimationsExist = this.scene.anims.exists('zombiescream-down');
    const cheerAnimationsExist = this.scene.anims.exists('cheerwithbothhandsup-down');
    const headHoldInPainAnimationsExist = this.scene.anims.exists('headholdinpain-down');
    const runAnimationsExist = this.scene.anims.exists('running-down');

    if (!walkAnimationsExist || !zombiescreamAnimationsExist || !cheerAnimationsExist || !headHoldInPainAnimationsExist || !runAnimationsExist) {
      this.createAnimations();
    }
  }

  /**
   * 🎨 NOUVEAU : Créer toutes les animations en utilisant les métadonnées JSON
   */
  createAnimations() {
    if (!this.metadataLoaded || !this.spritesheetMetadata) {
      console.warn('⚠️ Métadonnées non chargées, utilisation du fallback');
      this.createFallbackAnimations();
      return;
    }

    // 🛠️ SÉCURITÉ : Vérifier si les animations existent déjà avant de créer
    const walkExists = this.scene.anims.exists(`${this.config.walkAnimation}-front`);
    const zombiescreamExists = this.scene.anims.exists('zombiescream-front');
    const cheerExists = this.scene.anims.exists('cheerwithbothhandsup-front');
    const runExists = this.scene.anims.exists(`${this.config.runAnimation}-front`);
    if (walkExists && zombiescreamExists && cheerExists && runExists) {
      return; // Les animations existent déjà, ne pas les recréer
    }

    console.log('🎬 Création des animations multi-animations...');

    // Vérifier que les animations requises existent dans les métadonnées
    const idleAnimData = this.spritesheetMetadata.animations[this.config.idleAnimation];
    const walkAnimData = this.spritesheetMetadata.animations[this.config.walkAnimation];

    if (!idleAnimData || !walkAnimData) {
      console.error(`❌ Animations manquantes: idle=${this.config.idleAnimation}, walk=${this.config.walkAnimation}`);
      this.createFallbackAnimations();
      return;
    }

    // Créer les animations pour les 8 directions
    this.directions.forEach(direction => {
      const spritesheetDirection = this.directionMapping[direction];
      
      // 🎨 Animation IDLE utilisant les métadonnées
      const idleFrames = idleAnimData.frameData[spritesheetDirection];
      if (idleFrames && idleFrames.frames.length > 0) {
        this.scene.anims.create({
          key: `idle-${direction}`,
          frames: idleFrames.frames.map(frameData => ({
            key: this.config.spriteKey,
            frame: this.calculateFrameIndex(frameData.x, frameData.y)
          })),
          frameRate: 3, // Idle plus lent
          repeat: -1
        });
      }

      // 🎨 Animation WALK utilisant les métadonnées
      const walkFrames = walkAnimData.frameData[spritesheetDirection];
      if (walkFrames && walkFrames.frames.length > 0) {
        this.scene.anims.create({
          key: `walk-${direction}`,
          frames: walkFrames.frames.map(frameData => ({
            key: this.config.spriteKey,
            frame: this.calculateFrameIndex(frameData.x, frameData.y)
          })),
          frameRate: this.config.frameRate,
          repeat: -1
        });
      }

      // 🎨 Animation ZOMBIESCREAM utilisant les métadonnées
      const zombiescreamAnimData = this.spritesheetMetadata.animations['zombiescream'];
      console.log(`🧟 DEBUG zombiescream pour ${direction} (${spritesheetDirection}):`, {
        zombiescreamExists: !!zombiescreamAnimData,
        allAnimations: Object.keys(this.spritesheetMetadata.animations)
      });
      
      if (zombiescreamAnimData) {
        const zombiescreamFrames = zombiescreamAnimData.frameData[spritesheetDirection];
        console.log(`🧟 Frames pour ${spritesheetDirection}:`, {
          framesExist: !!zombiescreamFrames,
          frameCount: zombiescreamFrames?.frames?.length || 0,
          frameDataKeys: zombiescreamAnimData.frameData ? Object.keys(zombiescreamAnimData.frameData) : []
        });
        
        if (zombiescreamFrames && zombiescreamFrames.frames.length > 0) {
          this.scene.anims.create({
            key: `zombiescream-${direction}`,
            frames: zombiescreamFrames.frames.map(frameData => ({
              key: this.config.spriteKey,
              frame: this.calculateFrameIndex(frameData.x, frameData.y)
            })),
            frameRate: 24, // Vitesse du cri (3x plus rapide)
            repeat: 0 // Ne pas répéter, jouer une seule fois
          });
          console.log(`✅ Animation zombiescream-${direction} créée avec ${zombiescreamFrames.frames.length} frames`);
        } else {
          console.warn(`⚠️ Pas de frames zombiescream pour ${spritesheetDirection}`);
        }
      } else {
        console.error(`❌ Données zombiescream non trouvées dans les métadonnées`);
      }
      
      // 🎨 Animation HEADHOLDINPAIN (trembling visuel) si présente dans les métadonnées
      const headHoldInPainData = this.spritesheetMetadata.animations['headholdinpain'];
      if (headHoldInPainData) {
        const headPainFrames = headHoldInPainData.frameData[spritesheetDirection];
        if (headPainFrames && headPainFrames.frames.length > 0) {
          this.scene.anims.create({
            key: `headholdinpain-${direction}`,
            frames: headPainFrames.frames.map(frameData => ({
              key: this.config.spriteKey,
              frame: this.calculateFrameIndex(frameData.x, frameData.y)
            })),
            frameRate: 10,
            repeat: 0 // jouer une fois, utilisé pour sortir de trembling sur animationcomplete
          });
        }
      }

      // 🎨 Animation CHEERWITHBOTHHANDSUP (célébration NPCs)
      const cheerAnimData = this.spritesheetMetadata.animations['cheerwithbothhandsup'];
      if (cheerAnimData) {
        const cheerFrames = cheerAnimData.frameData[spritesheetDirection];
        if (cheerFrames && cheerFrames.frames.length > 0) {
          this.scene.anims.create({
            key: `cheerwithbothhandsup-${direction}`,
            frames: cheerFrames.frames.map(frameData => ({
              key: this.config.spriteKey,
              frame: this.calculateFrameIndex(frameData.x, frameData.y)
            })),
            frameRate: 12, // Vitesse modérée pour la célébration
            repeat: 0 // Ne pas répéter
          });
          console.log(`✅ Animation cheerwithbothhandsup-${direction} créée avec ${cheerFrames.frames.length} frames`);
        } else {
          console.warn(`⚠️ Pas de frames cheerwithbothhandsup pour ${spritesheetDirection}`);
        }
      } else {
        console.warn(`⚠️ Données cheerwithbothhandsup non trouvées dans les métadonnées`);
      }

      // 🎨 Animation RUNNING utilisant les métadonnées
      const runAnimData = this.spritesheetMetadata.animations[this.config.runAnimation];
      if (runAnimData) {
        const runFrames = runAnimData.frameData[spritesheetDirection];
        if (runFrames && runFrames.frames.length > 0) {
          this.scene.anims.create({
            key: `running-${direction}`,
            frames: runFrames.frames.map(frameData => ({
              key: this.config.spriteKey,
              frame: this.calculateFrameIndex(frameData.x, frameData.y)
            })),
            frameRate: Math.max(this.config.frameRate, 12),
            repeat: -1
          });
        }
      }
    });

    console.log('✅ Animations multi-animations créées avec succès (idle, walk, zombiescream, cheerwithbothhandsup)');
  }

  /**
   * 🎨 NOUVEAU : Calculer l'index de frame basé sur les coordonnées X,Y
   */
  calculateFrameIndex(x, y) {
    const spriteWidth = this.spritesheetMetadata.spritesheet.spriteWidth;
    const spriteHeight = this.spritesheetMetadata.spritesheet.spriteHeight;
    const totalWidth = this.spritesheetMetadata.spritesheet.width;
    
    const col = Math.floor(x / spriteWidth);
    const row = Math.floor(y / spriteHeight);
    const maxCols = Math.floor(totalWidth / spriteWidth);
    
    return row * maxCols + col;
  }

  /**
   * 🛠️ FALLBACK : Créer les animations avec l'ancien système si les métadonnées échouent
   */
  createFallbackAnimations() {
    console.log('🎬 Création des animations (mode fallback)...');

    // Créer les animations pour les 8 directions avec l'ancien système
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

      // Animations zombiescream (estimation pour le fallback)
      // Note: En mode fallback, on utilise une estimation simple
      const zombiescreamStartFrame = (index + 2) * 23; // Estimation basée sur la structure
      const zombiescreamEndFrame = zombiescreamStartFrame + 22; // 23 frames pour zombiescream
      
      this.scene.anims.create({
        key: `zombiescream-${direction}`,
        frames: this.scene.anims.generateFrameNumbers(this.config.spriteKey, { 
          start: zombiescreamStartFrame, 
          end: zombiescreamEndFrame 
        }),
        frameRate: 24, // 3x plus rapide
        repeat: 0 // Ne pas répéter
      });

      // Animations cheerwithbothhandsup (estimation pour le fallback)
      const cheerStartFrame = (index + 3) * 23; // Estimation basée sur la structure après zombiescream
      const cheerEndFrame = cheerStartFrame + 22; // 23 frames pour cheerwithbothhandsup
      
      this.scene.anims.create({
        key: `cheerwithbothhandsup-${direction}`,
        frames: this.scene.anims.generateFrameNumbers(this.config.spriteKey, { 
          start: cheerStartFrame, 
          end: cheerEndFrame 
        }),
        frameRate: 12, // Vitesse modérée pour la célébration
        repeat: 0 // Ne pas répéter
      });
    });

    console.log('✅ Animations fallback créées (idle, walk, zombiescream, cheerwithbothhandsup)');
  }

  /**
   * 🎯 AAA: ACTUAL MOVEMENT DETECTION avec anti-flickering amélioré
   * @param {number} delta - Temps écoulé depuis la dernière frame
   */
  update(delta = 16) {
    if (!this.owner || !this.owner.sprite) {
      return;
    }

    const currentTime = this.scene.time.now; // 🛠️ AMÉLIORATION : Utiliser le timer de Phaser
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
    // Vitesse réelle (px/s) basée sur le déplacement net, indépendante de la vélocité du body
    const deltaSeconds = Math.max(0.001, delta / 1000);
    this.realSpeedPxPerSec = realDistance / deltaSeconds;
    
    // 🛠️ AMÉLIORATION : Buffer des mouvements pour hysteresis renforcé
    this.movementBuffer.push(realDistance);
    if (this.movementBuffer.length > this.bufferSize) {
      this.movementBuffer.shift();
    }

    // 🛠️ AMÉLIORATION : Analyse du buffer pour déterminer l'état
    const movingFrames = this.movementBuffer.filter(dist => dist > this.movementThreshold).length;
    const stoppedFrames = this.movementBuffer.filter(dist => dist < this.idleThreshold).length;

    // 🛠️ AMÉLIORATION : Logique d'hysteresis strict
    if (this.isMoving) {
      // Déjà en mouvement: nécessite plusieurs frames d'arrêt pour s'arrêter
      if (stoppedFrames >= this.stoppedFramesRequired) {
        this.isMoving = false;
      }
    } else {
      // Immobile: nécessite plusieurs frames de mouvement pour bouger
      if (movingFrames >= this.movingFramesRequired) {
        this.isMoving = true;
      }
    }

    // 🛠️ AMÉLIORATION : Gestion de direction avec buffer de stabilité
    if (this.isMoving && realDistance > this.movementThreshold) {
      // Empêcher les changements de direction trop fréquents
      if (currentTime - this.lastDirectionChange >= this.directionChangeDelay) {
        const newFacing = this.calculateDirectionFromMovement(realMovement);
        
        // 🛠️ AMÉLIORATION : Buffer de direction pour plus de stabilité
        this.directionBuffer.push(newFacing);
        if (this.directionBuffer.length > this.directionStabilityRequired) {
          this.directionBuffer.shift();
        }
        
        // Changer de direction seulement si la nouvelle direction est stable
        const stableDirection = this.directionBuffer.every(dir => dir === newFacing);
        if (stableDirection && newFacing !== this.facing) {
          this.facing = newFacing;
          this.lastDirectionChange = currentTime;
          this.directionBuffer = []; // Reset du buffer après changement
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
   * 🛠️ AMÉLIORATION : Hysteresis plus strict pour les directions
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
    
    // 🛠️ AMÉLIORATION : Hystérésis plus strict
    const hysteresisThreshold = Math.PI / 12; // 30 degrés (plus strict)
    
    // Rester sur la direction actuelle si le changement n'est pas assez significatif
    if (minAngleDiff >= hysteresisThreshold && this.facing !== closestDirection) {
      return this.facing;
    }
    
    return closestDirection;
  }

  /**
   * Mettre à jour l'animation selon l'état actuel
   * 🛠️ AMÉLIORATION : Vérification plus stricte avant changement
   */
  updateAnimation() {
    // Ne pas changer d'animation si un cri est en cours
    if (this.owner && this.owner.shoutBehavior && this.owner.shoutBehavior.isScreaming) {
      return;
    }
    // Priorité à une animation forcée (ex: trembling spécifique)
    if (this.forcedAnimationName) {
      const forcedKey = `${this.forcedAnimationName}-${this.facing}`;
      if (this.scene.anims.exists(forcedKey)) {
        if (this.currentAnimation !== forcedKey || this.owner?.sprite?.anims?.currentAnim?.key !== forcedKey) {
          this.playAnimation(forcedKey);
        }
        return;
      }
    }
    // Choisir run vs walk selon la vitesse réelle
    let targetAnimation = `idle-${this.facing}`;
    if (this.isMoving) {
      // Vitesse effective: max(deplacement reel, velocite du body)
      let speedReal = this.realSpeedPxPerSec || 0;
      let speedBody = 0;
      try {
        const body = this.owner?.sprite?.body;
        if (body && body.velocity) {
          speedBody = Math.hypot(body.velocity.x, body.velocity.y);
        }
      } catch (_) {}
      const effectiveSpeed = Math.max(speedReal, speedBody);

      // Politique simple: on n'autorise le run que si l'état courant a une vitesse max >= seuil run (ex: fuite à 200)
      // Par défaut, autoriser le run si la vitesse dépasse le seuil
      // (NPCs pourront le restreindre via leur vitesse d'état)
      let canRun = true;
      try {
        const state = this.owner?.stateController?.getState?.();
        const mc = this.owner?.movementController;
        if (state && mc && mc.getCurrentSpeed) {
          const stateMax = mc.getCurrentSpeed(state);
          // Si on connaît une vitesse max d'état, n'autoriser le run que si ce max dépasse le seuil
          if (typeof stateMax === 'number') {
            canRun = stateMax >= (this.config.runningSpeedThreshold - 0.5);
          }
        }
      } catch (_) {}

      const triggerThreshold = this.config.runningSpeedThreshold * 0.95; // petite marge

      if (canRun && effectiveSpeed >= triggerThreshold && this.scene.anims.exists(`running-${this.facing}`)) {
        targetAnimation = `running-${this.facing}`;
      } else {
        targetAnimation = `walk-${this.facing}`;
      }
    }

    // 🛠️ AMÉLIORATION : Ne changer que si vraiment nécessaire et que l'animation existe
    if (this.scene.anims.exists(targetAnimation)) {
      const spriteCurrentKey = this.owner?.sprite?.anims?.currentAnim?.key;
      if (this.currentAnimation !== targetAnimation || spriteCurrentKey !== targetAnimation) {
        this.playAnimation(targetAnimation);
      }
    }
  }

  /**
   * 🎯 AAA: Appliquer l'animation calculée par ACTUAL MOVEMENT DETECTION
   * 🛠️ AMÉLIORATION : Gestion d'erreur plus robuste
   */
  playAnimation(animationKey) {
    try {
      // 🔍 VÉRIFICATIONS de sécurité
      if (!this.owner.sprite || !this.scene.anims.exists(animationKey)) {
        return;
      }
      
      // 🛠️ AMÉLIORATION : Vérifier que le sprite n'est pas déjà en train de jouer cette animation
      if (this.owner.sprite.anims.currentAnim?.key === animationKey) {
        return; // Animation déjà en cours
      }
      
      // ✅ APPLIQUE l'animation au sprite
      this.owner.sprite.play(animationKey, true); // Force restart si même animation
      
      // ✅ CONSERVÉ: Tracking d'état
      this.currentAnimation = animationKey;
      
      // 🎯 Désynchroniser légèrement les cycles bouclés (walk/idle/running) une seule fois
      if ((animationKey.startsWith('walk-') || animationKey.startsWith('idle-') || animationKey.startsWith('running-')) &&
          !this._randomizedLoopKeys.has(animationKey) && this.owner?.sprite?.anims) {
        const progress = Math.random();
        this.owner.sprite.anims.setProgress(progress);
        this._randomizedLoopKeys.add(animationKey);
      }
      
    } catch (error) {
      console.warn(`🎬 Erreur lors de la lecture de l'animation ${animationKey}:`, error);
    }
  }

  /**
   * Forcer une direction sans vélocité (8 directions supportées)
   */
  setFacing(direction) {
    if (this.directions.includes(direction)) {
      this.facing = direction;
      this.lastDirectionChange = this.scene.time.now; // 🛠️ AMÉLIORATION : Utiliser le timer de Phaser
      this.directionBuffer = []; // Reset du buffer
      this.updateAnimation();
    }
  }

  /**
   * Forcer un état (moving/idle)
   */
  setMoving(moving) {
    this.isMoving = moving;
    this.movementBuffer = []; // Reset du buffer
    this.updateAnimation();
  }

  /**
   * Forcer une animation (par nom logique sans direction, ex: 'headholdinpain')
   */
  setForcedAnimation(name) {
    this.forcedAnimationName = name;
    this.updateAnimation();
  }

  /**
   * Retirer l'animation forcée et revenir au système idle/walk
   */
  clearForcedAnimation() {
    this.forcedAnimationName = null;
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
   * 🛠️ AMÉLIORATION : Reset des buffers lors du changement de seuils
   */
  setMovementThresholds(movementThreshold, idleThreshold) {
    this.movementThreshold = movementThreshold;
    this.idleThreshold = idleThreshold;
    // Reset des buffers pour éviter les conflits
    this.movementBuffer = [];
    this.directionBuffer = [];
  }

  /**
   * 🎨 NOUVEAU : Changer d'animation (idle9, walking, running, etc.)
   */
  setAnimations(idleAnimation, walkAnimation) {
    this.config.idleAnimation = idleAnimation;
    this.config.walkAnimation = walkAnimation;
    
    // Recréer les animations avec les nouvelles données
    if (this.metadataLoaded && this.spritesheetMetadata) {
      this.createAnimations();
    }
  }

  /**
   * 🛠️ NOUVEAU : Méthode pour nettoyer l'état lors du reload
   */
  resetState() {
    this.isMoving = false;
    this.facing = 'down';
    this.currentAnimation = '';
    this.movementBuffer = [];
    this.directionBuffer = [];
    this.lastDirectionChange = 0;
    
    // Réinitialiser la position de référence
    if (this.owner && this.owner.sprite) {
      this.lastPosition = {
        x: this.owner.sprite.x,
        y: this.owner.sprite.y
      };
    }
  }

  /**
   * 🎨 NOUVEAU : Obtenir les animations disponibles
   */
  getAvailableAnimations() {
    if (!this.metadataLoaded || !this.spritesheetMetadata) {
      return [];
    }
    
    return Object.keys(this.spritesheetMetadata.animations);
  }
}