import { AvoidanceBehavior } from './AvoidanceBehavior';

// Système de mouvement simple inspiré de KIDS
export class NpcBehaviorController {
  constructor(entity, config = {}) {
    this.entity = entity;
    
    // Configuration simple
    this.wanderRadius = config.wanderRadius || 100; // Rayon de balade aléatoire
    this.wanderSpeed = config.wanderSpeed || 20;    // Vitesse de balade
    this.followSpeed = config.followSpeed || 40;    // Vitesse de suivi
    this.fleeSpeed = config.fleeSpeed || 60;        // Vitesse de fuite
    this.trembleIntensity = config.trembleIntensity || 2; // Force du tremblement
    
    // 🎯 NOUVEAU: Système de comportements modulaires
    this.avoidanceBehavior = new AvoidanceBehavior(entity, {
      exclusionRadius: 80,        // Distance d'évitement
      maxAvoidanceForce: 180,     // Force d'évitement augmentée
      avoidanceStrength: 1.0,     // Force normale
      followingBonus: 1.4         // 🎯 40% plus fort en mode following
    });
    
    // État interne
    this.wanderTarget = null;
    this.wanderTimer = 0;
    this.wanderDelay = 2000 + Math.random() * 3000; // 2-5 secondes entre mouvements
    
    // Position de spawn pour le wander
    this.spawnPosition = {
      x: entity.sprite.x,
      y: entity.sprite.y
    };
  }

  update(delta) {
    if (!this.entity || !this.entity.sprite) return;

    switch (this.entity.state) {
      case 'normal':
        // 🚫 WANDER SUPPRIMÉ - NPCs immobiles en état normal
        this.entity.velocity.x = 0;
        this.entity.velocity.y = 0;
        break;
      case 'following':
        this.updateFollow(delta);
        break;
      case 'trembling':
        this.updateTremble(delta);
        break;
      case 'fleeing':
        this.updateFlee(delta);
        break;
    }
  }

  // ÉTAT FOLLOW : Suit les points du trail du joueur
  updateFollow(delta) {
    const player = this.getPlayer();
    if (!player) return;

    // SYSTÈME DE TRAIL OBLIGATOIRE
    const trailTarget = player.getFollowTargetPosition(this.entity);
    
    if (!trailTarget) {
      console.error(`🚨 NpcBehaviorController: NPC ${this.entity.groupId || this.entity.id} n'a PAS reçu de point de trail !`);
      return; // Pas de mouvement plutôt qu'un mauvais mouvement
    }

    const target = {
      x: trailTarget.x,
      y: trailTarget.y
    };

    // Vitesse de suivi
    const followSpeed = this.entity.speed * 1.2; // 20% plus rapide que la vitesse de base
    const velocity = this.moveTowards(target, followSpeed);
    this.entity.velocity.x = velocity.x;
    this.entity.velocity.y = velocity.y;
  }

  // ÉTAT TREMBLE : Petits mouvements vibratoires
  updateTremble(delta) {
    // Mouvement de tremblement aléatoire
    const trembleX = (Math.random() - 0.5) * this.trembleIntensity;
    const trembleY = (Math.random() - 0.5) * this.trembleIntensity;

    this.entity.velocity.x = trembleX;
    this.entity.velocity.y = trembleY;
  }

  // ÉTAT FUITE : Fuit à l'opposé du joueur
  updateFlee(delta) {
    const player = this.getPlayer();
    if (!player) return;

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Direction opposée au joueur
      const fleeTarget = {
        x: this.entity.sprite.x + (dx / distance) * 100,
        y: this.entity.sprite.y + (dy / distance) * 100
      };

      // 🎯 CORRIGÉ: Vitesse de fuite normale (plus de cumul avec Npc.updateFleeingLogic)
      const fleeSpeed = this.entity.speed * 1.0; // Vitesse normale pour fuite via NpcBehaviorController
      const velocity = this.moveTowards(fleeTarget, fleeSpeed);
      this.entity.velocity.x = velocity.x;
      this.entity.velocity.y = velocity.y;
    }
  }

  // Utilitaires
  pickNewWanderTarget() {
    // Choisir un point aléatoire dans un rayon autour du spawn
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.wanderRadius;
    
    this.wanderTarget = {
      x: this.spawnPosition.x + Math.cos(angle) * distance,
      y: this.spawnPosition.y + Math.sin(angle) * distance
    };
  }

  moveTowards(target, speed) {
    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // CORRECTION: Arrêt complet si très proche pour éviter les oscillations
    if (distance < 5.0) {
      return { x: 0, y: 0 };
    }

    if (distance > 0) {
      // Mouvement doux et fluide style KIDS
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      // Force progressive - plus proche = moins de force (évite les oscillations)
      const force = Math.min(distance / 20, 1.0);
      
      return {
        x: normalizedX * speed * force,
        y: normalizedY * speed * force
      };
    }

    return { x: 0, y: 0 };
  }

  /**
   * Version pour trail - vitesse constante sans limitation de force
   */
  moveTowardsConstant(target, speed) {
    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Arrêt si très proche
    if (distance < 3.0) {
      return { x: 0, y: 0 };
    }

    if (distance > 0) {
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      // 🎯 VITESSE CONSTANTE - pas de limitation de force
      return {
        x: normalizedX * speed,
        y: normalizedY * speed
      };
    }

    return { x: 0, y: 0 };
  }

  isCloseToTarget(target, threshold) {
    if (!target) return false;
    
    const dx = this.entity.sprite.x - target.x;
    const dy = this.entity.sprite.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < threshold;
  }

  getPlayer() {
    if (this.entity.scene.currentLevel && this.entity.scene.currentLevel.player) {
      return this.entity.scene.currentLevel.player;
    }
    return null;
  }

  // Reset position de spawn pour wander
  setSpawnPosition(x, y) {
    this.spawnPosition.x = x;
    this.spawnPosition.y = y;
  }

  // ===========================================
  // NOUVELLE INTERFACE CLEAN pour MovementController
  // ===========================================

  /**
   * 🎯 NOUVEAU: Architecture Layered Behaviors
   * Interface clean qui combine primary + secondary behaviors
   */
  calculateVelocity(delta) {
    if (!this.entity || !this.entity.sprite) return { x: 0, y: 0 };

    // LAYER 1: Mouvement principal (priorité absolue)
    const primaryMovement = this.calculatePrimaryMovement(delta);
    
    // LAYER 2: Comportements secondaires (influence limitée)
    const secondaryBehaviors = this.calculateSecondaryBehaviors(delta);
    
    // FUSION: Protéger le mouvement principal tout en ajoutant les behaviors
    return this.blendBehaviors(primaryMovement, secondaryBehaviors);
  }

  /**
   * 🎯 LAYER 1: Mouvement principal selon l'état (INTOUCHABLE)
   */
  calculatePrimaryMovement(delta) {
    switch (this.entity.state) {
      case 'normal':
        return this.calculateWanderVelocity(delta);
      case 'following':
        return this.calculateFollowVelocity(delta); // SYSTÈME DE TRAIL PROTÉGÉ
      case 'trembling':
        return this.calculateTrembleVelocity(delta);
      case 'fleeing':
        return this.calculateFleeVelocity(delta);
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * 🎯 LAYER 2: Comportements secondaires modulaires
   */
  calculateSecondaryBehaviors(delta) {
    const avoidance = this.avoidanceBehavior.calculate();
    
    // Futur: Ajouter d'autres behaviors ici
    // const flocking = this.flockingBehavior?.calculate() || { x: 0, y: 0 };
    // const curiosity = this.curiosityBehavior?.calculate() || { x: 0, y: 0 };
    
    return {
      avoidance: avoidance
      // flocking: flocking,
      // curiosity: curiosity
    };
  }

  /**
   * 🎯 FUSION: Combine primary et secondary - VITESSE DE FOLLOW PRÉSERVÉE
   */
  blendBehaviors(primary, secondary) {
    // RÈGLE 1: Mode normal = évitement pur (pas de mouvement principal)
    if (this.entity.state === 'normal') {
      return secondary.avoidance; // Évitement remplace complètement l'immobilité
    }

    // RÈGLE 2: Mode following = vitesse de follow préservée + évitement additionnel
    if (this.entity.state === 'following') {
      return this.blendFollowWithAvoidance(primary, secondary.avoidance);
    }

    // RÈGLE 3: Autres états = fusion pondérée classique
    const avoidanceWeight = this.avoidanceBehavior.calculateSafeAvoidanceWeight();
    
    return {
      x: primary.x * (1 - avoidanceWeight) + secondary.avoidance.x * avoidanceWeight,
      y: primary.y * (1 - avoidanceWeight) + secondary.avoidance.y * avoidanceWeight
    };
  }

  /**
   * 🎯 NOUVEAU: Fusion spéciale pour le mode following
   * MÊME INFLUENCE d'évitement + vitesse follow à 100%
   */
  blendFollowWithAvoidance(followMovement, avoidanceForce) {
    // Vitesse originale du follow (vitesse cible à maintenir)
    const followSpeed = Math.sqrt(followMovement.x ** 2 + followMovement.y ** 2);
    
    // Si pas de mouvement de follow, utiliser l'évitement pur
    if (followSpeed < 0.1) {
      return avoidanceForce;
    }

    // Calculer le poids d'évitement (MÊME logique qu'avant)
    const avoidanceWeight = this.avoidanceBehavior.calculateSafeAvoidanceWeight();
    
    // 🎯 ÉTAPE 1: Calculer la DIRECTION finale avec blend pondéré (influence conservée)
    const blendedX = followMovement.x * (1 - avoidanceWeight) + avoidanceForce.x * avoidanceWeight;
    const blendedY = followMovement.y * (1 - avoidanceWeight) + avoidanceForce.y * avoidanceWeight;
    
    // Normaliser la direction
    const blendedMagnitude = Math.sqrt(blendedX ** 2 + blendedY ** 2);
    
    if (blendedMagnitude < 0.1) {
      return followMovement; // Fallback
    }
    
    const directionX = blendedX / blendedMagnitude;
    const directionY = blendedY / blendedMagnitude;
    
    // 🎯 ÉTAPE 2: Appliquer cette direction à la vitesse COMPLÈTE de follow
    // Résultat: même influence d'évitement + vitesse follow préservée
    return {
      x: directionX * followSpeed,
      y: directionY * followSpeed
    };
  }

  /**
   * Version CLEAN de updateWander qui retourne la velocity
   */
  calculateWanderVelocity(delta) {
    // 🚫 SYSTÈME WANDER SUPPRIMÉ - NPCs immobiles en état normal
    return { x: 0, y: 0 };
  }

  /**
   * Version CLEAN de updateFollow qui retourne la velocity
   */
  calculateFollowVelocity(delta) {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };

    // 🎯 NOUVEAU: Vérifier si au repos avant de bouger
    if (this.entity.isAtRest && this.entity.isAtRest()) {
      return { x: 0, y: 0 }; // Arrêt complet si au repos
    }

    // SYSTÈME DE TRAIL OBLIGATOIRE
    const trailTarget = player.getFollowTargetPosition(this.entity);
    
    if (!trailTarget) {
      return { x: 0, y: 0 }; // Pas de mouvement plutôt qu'un mauvais mouvement
    }

    const target = {
      x: trailTarget.x,
      y: trailTarget.y
    };

    // 🎯 NOUVEAU: Arrêt automatique si très proche du point de trail
    const dx = target.x - this.entity.sprite.x;
    const dy = target.y - this.entity.sprite.y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceToTarget < 20) { // 🎯 COHÉRENT : Arrêt à 20px (système stuck détecte à 25px)
      return { x: 0, y: 0 };
    }

    // Vitesse de suivi
    const followSpeed = this.entity.speed * 1.2; // 20% plus rapide que la vitesse de base
    
    // 🎯 UTILISER LA VERSION CONSTANTE pour le trail (pas de limitation de force)
    return this.moveTowardsConstant(target, followSpeed);
  }

  /**
   * Version CLEAN de updateTremble qui retourne la velocity
   */
  calculateTrembleVelocity(delta) {
    // Mouvement de tremblement aléatoire
    const trembleX = (Math.random() - 0.5) * this.trembleIntensity;
    const trembleY = (Math.random() - 0.5) * this.trembleIntensity;

    return { x: trembleX, y: trembleY };
  }

  /**
   * Version CLEAN de updateFlee qui retourne la velocity
   */
  calculateFleeVelocity(delta) {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      // Direction opposée au joueur
      const fleeTarget = {
        x: this.entity.sprite.x + (dx / distance) * 100,
        y: this.entity.sprite.y + (dy / distance) * 100
      };

      // CORRECTION: Utiliser vitesse de base de l'entité (plus rapide pour fuir)
      const fleeSpeed = this.entity.speed * 1.0; // 🎯 CORRIGÉ: Vitesse normale (plus de cumul)
      return this.moveTowards(fleeTarget, fleeSpeed);
    }

    return { x: 0, y: 0 };
  }
} 