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
   * Interface clean qui retourne velocity sans modifier l'entité
   */
  calculateVelocity(delta) {
    if (!this.entity || !this.entity.sprite) return { x: 0, y: 0 };

    switch (this.entity.state) {
      case 'normal':
        return this.calculateWanderVelocity(delta);
      case 'following':
        return this.calculateFollowVelocity(delta);
      case 'trembling':
        return this.calculateTrembleVelocity(delta);
      case 'fleeing':
        return this.calculateFleeVelocity(delta);
      default:
        return { x: 0, y: 0 };
    }
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