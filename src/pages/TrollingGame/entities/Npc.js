import { BaseEntity } from './BaseEntity';
import { NpcBehaviorController } from './behaviors/NpcBehaviorController';
import { ShoutBehavior } from './behaviors/ShoutBehavior';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';

export class Npc extends BaseEntity {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, 'character-spritesheet', true); // Utiliser le spritesheet avec animations
    
    this.entityType = 'npc';
    this.speed = config.speed || 150; // 🎯 NORMALISÉ : Même vitesse de base que le Player
    this.groupId = config.groupId || 0;
    
    // Système NpcBehaviorController - SIMPLE ET EFFICACE inspiré de KIDS
    this.behaviorController = new NpcBehaviorController(this, {
      trembleIntensity: 3      // Intensité du tremblement
    });
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION pour les animations
    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(0.8, 0.3); // Seuils adaptés aux NPCs
    
    // États du NPC
    this.state = 'normal'; // 'normal', 'fleeing', 'trembling', 'following', 'migrating'
    this.stateTimer = 0;
    this.stateDuration = 0;
    
    // Propriétés pour les différents états
    this.fleeingSpeed = this.speed * 0.30; // 🎯 RÉAJUSTÉ : 0.9x en fuite (même un peu plus lent pour panique)
    this.fleeDirection = { x: 0, y: 0 };
    this.tremblingIntensity = 3; // Amplitude du tremblement
    this.followTarget = null; // Joueur à suivre
    
    // Propriétés pour la migration (intro)
    this.targetPosition = null; // Position finale de migration
    this.migrationSpeed = 120; // Vitesse de migration (plus rapide que normal)
    this.migrationTolerance = 15; // Tolérance d'arrivée en pixels
    
    // 🎯 SYSTÈME AAA : Zone de confort + détection de progrès
    this.followState = {
      mode: "MOVING",                 // "MOVING" ou "AT_REST"
      lastDistanceToTarget: null,     // Distance précédente au point de trail
      recentProgress: [],             // Historique du progrès des dernières frames
      comfortZone: 25,                // Zone de confort (px) - peut s'arrêter si dedans
      minProgressRate: 0.3,           // Progrès minimum requis (px par frame)
      wakeUpDistance: 50              // Target doit bouger de 50px pour réveiller
    };
    
    // Sauvegarde de la position pour le tremblement
    this.basePosition = { x: x, y: y };
    this.tremblingOffset = { x: 0, y: 0 };
    
    // 🎯 NOUVEAU: Rayon de collision du tremblement (variable selon les followers du player)
    this.tremblingCollisionRadius = 25; // Valeur de base, sera ajustée dans startTrembling()
    
    // Vélocité pour le mouvement
    this.velocity = { x: 0, y: 0 };
    
    // Configurer le sprite
    this.setupSprite();
    
    // Position précédente pour les collisions
    this.lastPosition = { x: x, y: y };
    

    
    // Système de cri (pour les followers) - même taille que le joueur
    this.shoutBehavior = new ShoutBehavior(this, {
      offsetY: -50, // Même distance que le joueur
      scale: 0.3, // Même taille que le joueur
      duration: 750 // Même durée que le joueur
    });
    
    // S'enregistrer dans le système de tri par profondeur
    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this);
    }
  }

  setupSprite() {
    // Le sprite est déjà créé par BaseEntity avec le spritesheet
    // On configure juste la taille et la teinte
    this.sprite.setScale(0.5); // Même taille que le joueur
    this.sprite.setTint(0xFFFFFF); // Toujours blanc
    
    // AJOUT: Configuration physique spéciale pour les NPCs - plus facilement poussés par le joueur
    if (this.sprite.body) {
      this.sprite.body.setMass(0.5); // 2x plus léger que le joueur (joueur=3, NPC=0.5) pour être facilement poussé
    }
    
    // Ajouter une référence vers cette entité
    this.sprite.entity = this;
  }





  // Réaction au cri du joueur
  onShoutHit(force, distance, maxRadius) {
    // Ignorer si déjà en train de suivre
    if (this.state === 'following') return;
    
    // 🎯 NOUVEAU: Obtenir le nombre de followers du player pour intensifier le tremblement
    const player = this.getPlayer();
    const followersCount = player && player.followers ? player.followers.length : 0;
    
    // Calculer l'intensité basée sur la distance (plus proche = plus fort)
    const intensity = 1.0 - (distance / maxRadius);
    const effectiveForce = force * intensity;
    
    // Ajouter un facteur aléatoire pour la réaction (±30%)
    const randomFactor = 0.7 + Math.random() * 0.6; // Entre 0.7 et 1.3
    const finalForce = effectiveForce * randomFactor;
    
    // 🎯 NOUVEAU: Augmenter la chance de trembler avec le nombre de followers
    const baseTremblingChance = 0.25; // 🎯 AUGMENTÉ de 15% à 25% pour plus de chance de base
    const forceBasedChance = Math.max(0, (finalForce - 0.6) / 1.0); // Graduel entre 0.6 et 1.6
    const followersBonus = Math.min(0.2, followersCount * 0.05); // +1% par follower, max +20%
    const totalTremblingChance = Math.min(0.9, baseTremblingChance + forceBasedChance + followersBonus); // Maximum 90%
    

    
    // Décision aléatoire basée sur la force et le hasard
    if (Math.random() < totalTremblingChance) {
      // Le NPC tremble avec intensité variable selon les followers
      this.startTrembling(followersCount);
    } else {
      // Le NPC fuit
      this.startFleeing();
    }
  }

  startFleeing() {
    this.state = 'fleeing';
    this.stateTimer = 0;
    // Durée variable de fuite (1.5-2.5 secondes)
    this.stateDuration = 1500 + Math.random() * 1000;
    
    // Calculer la direction de fuite (opposée au joueur)
    const player = this.getPlayer();
    if (player && player.sprite) {
      const dx = this.sprite.x - player.sprite.x;
      const dy = this.sprite.y - player.sprite.y;
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      
      if (magnitude > 0) {
        this.fleeDirection.x = dx / magnitude;
        this.fleeDirection.y = dy / magnitude;
      } else {
        // Direction aléatoire si superposé
        const angle = Math.random() * Math.PI * 2;
        this.fleeDirection.x = Math.cos(angle);
        this.fleeDirection.y = Math.sin(angle);
      }
    }
  }

  startTrembling(followersCount = 0) {
    this.state = 'trembling';
    this.stateTimer = 0;
    
    // 🎯 NOUVEAU: Durée et intensité variables selon le nombre de followers
    const baseDuration = 2000; // 2 secondes de base
    const durationBonus = Math.min(1000, followersCount * 50); // +50ms par follower, max +1s
    this.stateDuration = baseDuration + Math.random() * 2000 + durationBonus;
    
    // 🎯 NOUVEAU: Intensité du tremblement augmente avec les followers
    const baseIntensity = 3;
    const intensityBonus = Math.min(3, followersCount * 0.15); // +0.15 par follower, max +3
    this.tremblingIntensity = baseIntensity + intensityBonus;
    
    // 🎯 NOUVEAU: Rayon de collision du tremblement (effet sur autres NPCs)
    const baseCollisionRadius = 25;
    const radiusBonus = Math.min(20, followersCount * 0.8); // +0.8px par follower, max +20px
    this.tremblingCollisionRadius = baseCollisionRadius + radiusBonus;
    
    // Sauvegarder la position de base
    this.basePosition.x = this.sprite.x;
    this.basePosition.y = this.sprite.y;
    
    // Arrêter le mouvement normal
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  startFollowing(player) {
    this.state = 'following';
    this.followTarget = player;
    this.stateTimer = 0;
    this.stateDuration = Infinity; // Suit indéfiniment
    
    // 🎯 NOUVEAU: Reset du système AAA
    this.followState.mode = "MOVING";
    this.followState.recentProgress = [];
    this.followState.lastDistanceToTarget = null;
    
    // 🔊 NOUVEAU: Jouer le son touch quand un NPC commence à suivre
    if (this.scene.soundManager) {
      this.scene.soundManager.playTouch();
    }
  }

  /**
   * Démarrer la migration vers la position cible
   * @param {Object} targetPos - Position finale {x, y}
   */
  startMigration(targetPos) {
    this.targetPosition = { x: targetPos.x, y: targetPos.y };
    this.state = 'migrating';
    this.stateTimer = 0;
  }

  /**
   * Migration terminée - passer en état normal
   */
  onMigrationComplete() {
    // Arrêter le mouvement
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    // Mettre à jour la position de base pour le comportement normal
    this.basePosition.x = this.sprite.x;
    this.basePosition.y = this.sprite.y;
    
    // 🎯 CRUCIAL: Mettre à jour la spawnPosition pour le wander
    if (this.behaviorController) {
      this.behaviorController.spawnPosition.x = this.sprite.x;
      this.behaviorController.spawnPosition.y = this.sprite.y;
    }
    
    // 🎯 AAA: Forcer l'orientation vers le bas après migration (intro)
    if (this.animationBehavior) {
      this.animationBehavior.setFacing('down');
    }
    
    // Passer en état normal
    this.state = 'normal';
    this.targetPosition = null;
    this.stateTimer = 0;
  }

  returnToNormal() {
    this.state = 'normal';
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.followTarget = null;
    
    // Réinitialiser la vélocité
    this.velocity.x = 0;
    this.velocity.y = 0;
  }

  update(delta) {
    // NE PAS appeler super.update(delta) pour éviter le double mouvement !
    // BaseEntity.update() applique automatiquement this.velocity, mais les NPCs
    // gèrent leur mouvement différemment selon leur état
    
    if (!this.sprite) return;
    
    // Protection contre les deltas énormes
    const clampedDelta = Math.min(delta, 33);
    
    // Sauvegarder la position précédente
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    // CORRECTION: Debug vélocité pour diagnostiquer les animations incorrectes
    const velocityMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    // DEBUG retiré pour éviter le spam maintenant que la répulsion est active
    // if (velocityMagnitude > 0.1 && this.state === 'normal') {
    //   console.log(`🐛 NPC ${this.groupId} a de la vélocité en état normal: ${velocityMagnitude.toFixed(2)}, velocity: x=${this.velocity.x.toFixed(2)}, y=${this.velocity.y.toFixed(2)}`);
    // }
    
    // Mettre à jour la logique d'état en premier
    this.updateStateLogic(clampedDelta);
    
    // 🎯 NOUVEAU: Système AAA zone de confort
    this.updateFollowState();
    
    // SOLUTION CLEAN: Calculer velocity finale UNE SEULE FOIS
    let finalVelocity = { x: 0, y: 0 };
    
    // Déterminer si on doit utiliser NpcBehaviorController ou la logique d'état
    const shouldUseBehaviorController = this.state === 'following' || this.state === 'normal';
    
    if (shouldUseBehaviorController && this.behaviorController) {
      // 🎯 NOUVEAU: Utiliser NpcBehaviorController pour following et normal
      const movementVelocity = this.behaviorController.calculateVelocity(clampedDelta);
      finalVelocity.x = movementVelocity.x;
      finalVelocity.y = movementVelocity.y;
      
      // Ajouter les forces additionnelles pour following
      if (this.state === 'following') {
        const followingForces = this.calculateFollowingForces(clampedDelta);
        finalVelocity.x += followingForces.x;
        finalVelocity.y += followingForces.y;
      }
      // Ajouter l'évitement du player pour l'état normal
      else if (this.state === 'normal') {
        const player = this.getPlayer();
        if (player && player.sprite) {
          const avoidanceForce = this.applyPlayerAvoidance(player, 100, 50);
          finalVelocity.x += avoidanceForce.x;
          finalVelocity.y += avoidanceForce.y;
        }
      }
      
    } else if (this.state === 'fleeing') {
      // 🎯 PRÉSERVER: Velocity calculée par updateFleeingLogic
      finalVelocity = this.velocity;
    } else {
      // Autres états (trembling, migrating) gèrent leur propre velocity
      finalVelocity = this.velocity;
    }
    
    // 🎯 NOUVEAU: LIMITATION VITESSE OBLIGATOIRE - Jamais dépasser la vitesse de base !
    finalVelocity = this.capVelocity(finalVelocity);
    
    // Appliquer la vélocité finale
    this.velocity = finalVelocity;
    
    // Appliquer également au body physique de Phaser
    if (this.sprite.body) {
      this.sprite.body.setVelocity(finalVelocity.x, finalVelocity.y);
    }

    // 4. CORRECTION: Utiliser la velocity physique RÉELLE pour l'animation
    // Pas finalVelocity calculée, mais celle après physique (collisions, drag, etc.)
    const realVelocity = this.sprite.body ? {
      x: this.sprite.body.velocity.x,
      y: this.sprite.body.velocity.y
    } : finalVelocity;
    
    // 5. Mettre à jour les onomatopées de cri via le behavior
    this.shoutBehavior.update(clampedDelta);
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION pour les animations
    this.animationBehavior.update(clampedDelta);
  }

  onCollision(other) {
    if (!this.sprite) return;
    
    // Revenir à la position précédente en cas de collision
    if (other.entityType === 'wall' || other.entityType === 'npc' || other.entityType === 'player') {
      this.sprite.x = this.lastPosition.x;
      this.sprite.y = this.lastPosition.y;
    }
  }

  destroy() {
    // Nettoyer les références
    if (this.followTarget) {
      this.followTarget.removeFollower(this);
    }
    
    // Nettoyer le système de cri
    if (this.shoutBehavior) {
      this.shoutBehavior.destroy();
    }
    
    // Se retirer du système de tri par profondeur
    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }
    
    super.destroy();
  }



  // Éviter de se superposer avec le joueur (zone d'exclusion)
  applyPlayerAvoidance(player, exclusionRadius = 20, avoidanceWeight = 1.0) {
    const steer = { x: 0, y: 0 };
    
    if (!player || !player.sprite || !this.sprite) return steer;
    
    const dx = this.sprite.x - player.sprite.x;
    const dy = this.sprite.y - player.sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
    // Si trop proche du joueur, forcer l'éloignement
    if (distance > 0 && distance < exclusionRadius) {
      // Direction d'éloignement du joueur
      const avoidDirection = { x: dx / distance, y: dy / distance };
      
      // Force inversement proportionnelle à la distance (plus proche = plus forte)
      const intensity = (exclusionRadius - distance) / exclusionRadius;
      
      steer.x = avoidDirection.x * intensity * avoidanceWeight;
      steer.y = avoidDirection.y * intensity * avoidanceWeight;
    }
    
    return steer;
  }

  /**
   * NOUVELLE VERSION CLEAN : Calcule la velocity de migration sans modifier this.velocity
   */
  calculateMigrationVelocity(delta) {
    if (!this.targetPosition || !this.sprite) return { x: 0, y: 0 };
    
    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;
    
    // Calculer la distance vers la cible
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Vérifier si arrivé à destination
    if (distance <= this.migrationTolerance) {
      // Migration terminée sera gérée par updateStateLogic()
      return { x: 0, y: 0 };
    }
    
    // Calculer la direction normalisée
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Retourner la velocity de migration
    return {
      x: dirX * this.migrationSpeed,
      y: dirY * this.migrationSpeed
    };
  }

  updateStateLogic(delta) {
    if (this.state === 'normal') return;
    
    this.stateTimer += delta;
    
    switch (this.state) {
      case 'fleeing':
        this.updateFleeingLogic(delta);
        break;
        
      case 'trembling':
        this.updateTremblingLogic(delta);
        break;
        
      case 'following':
        // Le nouveau système AAA gère tout automatiquement
        break;
        
      case 'migrating':
        this.updateMigration(delta);
        break;
    }
  }

  updateMigration(delta) {
    if (!this.targetPosition || !this.sprite) return;
    
    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;
    
    // Calculer la distance vers la cible
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Vérifier si arrivé à destination
    if (distance <= this.migrationTolerance) {
      this.onMigrationComplete();
      return;
    }
    
    // Calculer la direction normalisée
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Appliquer la vitesse de migration
    this.velocity.x = dirX * this.migrationSpeed;
    this.velocity.y = dirY * this.migrationSpeed;
  }

  updateFleeingLogic(delta) {
    // Mouvement de fuite
    const deltaSeconds = Math.min(delta, 33) * 0.001;
    const fleeSpeed = this.fleeingSpeed;
    
    // Force de fuite
    const fleeForce = {
      x: this.fleeDirection.x * fleeSpeed,
      y: this.fleeDirection.y * fleeSpeed
    };
    
    const newX = this.sprite.x + (fleeForce.x * deltaSeconds);
    const newY = this.sprite.y + (fleeForce.y * deltaSeconds);
    
    if (this.isPositionValid(newX, newY)) {
      this.sprite.x = newX;
      this.sprite.y = newY;
    }
    
    // Mettre à jour la vélocité pour les animations
    this.velocity.x = fleeForce.x;
    this.velocity.y = fleeForce.y;
    
    // Vérifier si la fuite est terminée
    if (this.stateTimer >= this.stateDuration) {
      this.returnToNormal();
    }
  }

  updateTremblingLogic(delta) {
    // Générer un tremblement aléatoire
    this.tremblingOffset.x = (Math.random() - 0.5) * this.tremblingIntensity;
    this.tremblingOffset.y = (Math.random() - 0.5) * this.tremblingIntensity;
    
    // 🎯 AAA: VISUAL TREMBLING ONLY - Ne pas déplacer la physique !
    // Garder la position physique fixe (collision box ne bouge pas)
    this.sprite.x = this.basePosition.x;
    this.sprite.y = this.basePosition.y;
    
    // ✅ APPLIQUER LE TREMBLEMENT AU VISUEL SEULEMENT
    // Utiliser setOrigin pour décaler l'affichage sans affecter la physique
    const baseOriginX = 0.5;
    const baseOriginY = 0.5;
    const offsetFactorX = this.tremblingOffset.x / (this.sprite.displayWidth || 64);
    const offsetFactorY = this.tremblingOffset.y / (this.sprite.displayHeight || 64);
    
    this.sprite.setOrigin(
      baseOriginX - offsetFactorX,
      baseOriginY - offsetFactorY
    );
    
    // Mettre la vélocité à zéro pour l'animation d'arrêt
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    // Vérifier si le tremblement est terminé
    if (this.stateTimer >= this.stateDuration) {
      // 🎯 RESTAURER L'ORIGINE NORMALE
      this.sprite.setOrigin(baseOriginX, baseOriginY);
      this.returnToNormal();
    }
  }

  isPositionValid(x, y) {
    if (!this.sprite) return false;
    
    const radius = 8; // Rayon du cercle
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    return (
      x - radius >= 0 &&
      x + radius <= screenWidth &&
      y - radius >= 0 &&
      y + radius <= screenHeight
    );
  }

  // Méthode pour obtenir le joueur
  getPlayer() {
    if (this.scene.currentLevel && this.scene.currentLevel.player) {
      return this.scene.currentLevel.player;
    }
    return null;
  }

  /**
   * 🎯 LIMITATION VITESSE : Garantir que la vitesse ne dépasse jamais la vitesse de base
   */
  capVelocity(velocity) {
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Vitesse maximum selon l'état
    let maxSpeed = this.speed; // Vitesse de base
    
    if (this.state === 'fleeing') {
      maxSpeed = this.fleeingSpeed; // Exception pour la fuite
    } else if (this.state === 'migrating') {
      maxSpeed = this.migrationSpeed; // Exception pour la migration
    }
    
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
   * 🎯 SYSTÈME AAA : Zone de confort avec détection de progrès
   */
  updateFollowState() {
    if (this.state !== 'following') return;
    
    const trailTarget = this.followTarget.getFollowTargetPosition(this);
    if (!trailTarget) return;
    
    const currentDistance = Math.sqrt(
      (trailTarget.x - this.sprite.x)**2 + (trailTarget.y - this.sprite.y)**2
    );
    

    
    // Calculer le progrès (distance qui diminue = progrès positif)
    let progress = 0;
    if (this.followState.lastDistanceToTarget !== null) {
      progress = this.followState.lastDistanceToTarget - currentDistance;
    }
    
    // Garder historique des 10 dernières frames
    this.followState.recentProgress.push(progress);
    if (this.followState.recentProgress.length > 10) {
      this.followState.recentProgress.shift();
    }
    
    // Calculer progrès moyen
    const avgProgress = this.followState.recentProgress.length > 0 
      ? this.followState.recentProgress.reduce((a, b) => a + b, 0) / this.followState.recentProgress.length
      : 0;
    
    // LOGIQUE AAA
    if (this.followState.mode === "MOVING") {
      // Mode actif : vérifier si on peut se reposer
      const inComfortZone = currentDistance < this.followState.comfortZone;
      const poorProgress = avgProgress < this.followState.minProgressRate;
      
      if (inComfortZone && poorProgress && this.followState.recentProgress.length >= 5) {
        this.followState.mode = "AT_REST";
      }
      
    } else if (this.followState.mode === "AT_REST") {
      // Mode repos : vérifier si la target a bougé suffisamment
      const farFromComfort = currentDistance > this.followState.wakeUpDistance;
      
      if (farFromComfort) {
        this.followState.mode = "MOVING";
        this.followState.recentProgress = []; // Reset historique
      }
    }
    
    this.followState.lastDistanceToTarget = currentDistance;
  }

  /**
   * 🎯 SYSTÈME AAA : Vérifier si au repos
   */
  isAtRest() {
    return this.state === 'following' && this.followState.mode === "AT_REST";
  }

  /**
   * 🎯 SIMPLIFIÉ : Forces additionnelles pour following
   */
  calculateFollowingForces(delta) {
    if (!this.followTarget || !this.followTarget.sprite) {
      return { x: 0, y: 0 };
    }
    
    // 🎯 NOUVEAU : Aucune force si au repos
    if (this.isAtRest()) {
      return { x: 0, y: 0 };
    }
    
    // Pas de forces supplémentaires actuellement - géré par la physique Phaser
    return { x: 0, y: 0 };
  }
} 