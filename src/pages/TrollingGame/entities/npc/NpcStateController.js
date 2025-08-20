/**
 * 🎯 SOLID: NpcStateController
 * Responsabilité : Gestion des états du NPC et réactions aux événements
 */
export class NpcStateController {
  constructor(npc) {
    this.npc = npc;
    
    // États possibles
    this.state = 'normal'; // 'normal', 'fleeing', 'trembling', 'following', 'migrating', 'organism_migrating'
    this.stateTimer = 0;
    this.stateDuration = 0;
    
    // Configuration des états
    this.config = {
      fleeing: {
        minDuration: 1500,
        maxDuration: 2500,
        speedMultiplier: 0.30
      },
      trembling: {
        baseDuration: 2000,
        durationPerFollower: 50,
        // Tremblement visuel plus discret
        baseIntensity: 1.2,
        intensityPerFollower: 0.05,
        baseCollisionRadius: 25,
        radiusPerFollower: 0.8
      }
    };
    
    // Propriétés pour trembling
    this.basePosition = { x: 0, y: 0 };
    this.tremblingOffset = { x: 0, y: 0 };
    this.tremblingIntensity = 3;
    this.tremblingCollisionRadius = 25;
    
    // Propriétés pour fleeing  
    this.fleeDirection = { x: 0, y: 0 };
    this.followTarget = null;
    
    console.log('🎭 NpcStateController créé');
  }

  /**
   * Obtenir l'état actuel
   */
  getState() {
    return this.state;
  }

  /**
   * Obtenir le timer de l'état actuel
   */
  getStateTimer() {
    return this.stateTimer;
  }

  /**
   * Réaction au cri du joueur
   */
  onShoutHit(force, distance, maxRadius) {
    // Ignorer si déjà en train de suivre
    if (this.state === 'following') return;
    
    // 🕳️ SHEPHERD MODE: NPCs Shepherd ne tremblent JAMAIS - juste peur
    if (this.npc.shepherdMode || this.npc.canTremble === false) {
      this.startFleeing();
      return;
    }
    
    // 🎯 LOGIQUE NORMALE pour les autres niveaux
    const player = this.getPlayer();
    const followersCount = player && player.followers ? player.followers.length : 0;
    
    // Calculer l'intensité basée sur la distance (plus proche = plus fort)
    const intensity = 1.0 - (distance / maxRadius);
    const effectiveForce = force * intensity;
    
    // Ajouter un facteur aléatoire pour la réaction (±30%)
    const randomFactor = 0.7 + Math.random() * 0.6; // Entre 0.7 et 1.3
    const finalForce = effectiveForce * randomFactor;
    
    // 🎯 Augmenter la chance de trembler avec le nombre de followers
    const baseTremblingChance = 0.25;
    const forceBasedChance = Math.max(0, (finalForce - 0.6) / 1.0);
    const followersBonus = Math.min(0.2, followersCount * 0.05);
    const totalTremblingChance = Math.min(0.9, baseTremblingChance + forceBasedChance + followersBonus);
    
    // Décision aléatoire basée sur la force et le hasard
    if (Math.random() < totalTremblingChance) {
      // Le NPC tremble avec intensité variable selon les followers
      this.startTrembling(followersCount);
    } else {
      // Le NPC fuit
      this.startFleeing();
    }
  }

  /**
   * Commencer l'état fleeing
   */
  startFleeing() {
    this.state = 'fleeing';
    this.stateTimer = 0;
    // Quitter toute animation forcée (ex: headholdinpain)
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }
    
    // Durée variable de fuite
    const config = this.config.fleeing;
    this.stateDuration = config.minDuration + Math.random() * (config.maxDuration - config.minDuration);
    
    // Calculer la direction de fuite (opposée au joueur)
    const player = this.getPlayer();
    if (player && player.sprite) {
      const dx = this.npc.sprite.x - player.sprite.x;
      const dy = this.npc.sprite.y - player.sprite.y;
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
    
    console.log(`🏃 NPC ${this.npc.groupId} commence à fuir`);
  }

  /**
   * Commencer l'état trembling
   */
  startTrembling(followersCount = 0) {
    this.state = 'trembling';
    this.stateTimer = 0;
    
    const config = this.config.trembling;
    
    // 🎯 Durée et intensité variables selon le nombre de followers
    const durationBonus = Math.min(1000, followersCount * config.durationPerFollower);
    this.stateDuration = config.baseDuration + Math.random() * 2000 + durationBonus;
    
    // 🎯 Intensité du tremblement augmente avec les followers
    const intensityBonus = Math.min(3, followersCount * config.intensityPerFollower);
    this.tremblingIntensity = config.baseIntensity + intensityBonus;
    
    // 🎯 Rayon de collision du tremblement
    const radiusBonus = Math.min(20, followersCount * config.radiusPerFollower);
    this.tremblingCollisionRadius = config.baseCollisionRadius + radiusBonus;
    
    // Sauvegarder la position de base
    this.basePosition.x = this.npc.sprite.x;
    this.basePosition.y = this.npc.sprite.y;
    
    // 🎨 Forcer l'animation visuelle de douleur/tremblement
    if (this.npc.animationBehavior && this.npc.animationBehavior.setForcedAnimation) {
      this.npc.animationBehavior.setForcedAnimation('headholdinpain');
    }
    
    console.log(`😰 NPC ${this.npc.groupId} commence à trembler (intensité: ${this.tremblingIntensity.toFixed(1)})`);
  }

  /**
   * Commencer l'état following
   */
  startFollowing(player) {
    // 🕳️ SHEPHERD MODE: NPCs Shepherd ne suivent JAMAIS
    if (this.npc.shepherdMode || this.npc.canFollow === false) {
      console.log('🚫 NPC Shepherd refuse de suivre le joueur');
      return;
    }
    
    this.state = 'following';
    this.followTarget = player;
    this.stateTimer = 0;
    this.stateDuration = Infinity; // Suit indéfiniment
    // Revenir aux animations normales (idle/walk)
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }
    
    console.log(`👥 NPC ${this.npc.groupId} commence à suivre le joueur`);
  }

  /**
   * Définir l'état de migration
   */
  setState(newState, duration = 0) {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;
    this.stateDuration = duration;
    // Par défaut, toute transition hors trembling annule l'animation forcée
    if (newState !== 'trembling' && this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }
    
    console.log(`🔄 NPC ${this.npc.groupId}: ${oldState} → ${newState}`);
  }

  /**
   * Retourner à l'état normal
   */
  returnToNormal() {
    this.state = 'normal';
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.followTarget = null;
    
    // 🎯 RESTAURER L'ORIGINE NORMALE si on était en trembling
    if (this.npc.sprite) {
      this.npc.sprite.setOrigin(0.5, 0.5);
    }
    // 🎨 Retirer l'animation forcée éventuelle
    if (this.npc.animationBehavior && this.npc.animationBehavior.clearForcedAnimation) {
      this.npc.animationBehavior.clearForcedAnimation();
    }
    
    console.log(`✅ NPC ${this.npc.groupId} retourne à l'état normal`);
  }

  /**
   * Mettre à jour la logique d'état
   */
  updateStateLogic(delta) {
    if (this.state === 'normal') return;
    
    this.stateTimer += delta;
    
    switch (this.state) {
      case 'trembling':
        this.updateTremblingLogic(delta);
        break;
        
      case 'fleeing':
        // Vérifier si la fuite est terminée
        if (this.stateTimer >= this.stateDuration) {
          this.returnToNormal();
        }
        break;
        
      case 'following':
        // Le following n'a pas de limite de temps
        break;
    }
  }

  /**
   * Logique de tremblement
   */
  updateTremblingLogic(delta) {
    // Générer un tremblement aléatoire
    this.tremblingOffset.x = (Math.random() - 0.5) * this.tremblingIntensity;
    this.tremblingOffset.y = (Math.random() - 0.5) * this.tremblingIntensity;
    
    // 🎯 AAA: VISUAL TREMBLING ONLY - Ne pas déplacer la physique !
    // Garder la position physique fixe (collision box ne bouge pas)
    this.npc.sprite.x = this.basePosition.x;
    this.npc.sprite.y = this.basePosition.y;
    
    // ✅ APPLIQUER LE TREMBLEMENT AU VISUEL SEULEMENT
    // Utiliser setOrigin pour décaler l'affichage sans affecter la physique
    const baseOriginX = 0.5;
    const baseOriginY = 0.5;
    const offsetFactorX = this.tremblingOffset.x / (this.npc.sprite.displayWidth || 64);
    const offsetFactorY = this.tremblingOffset.y / (this.npc.sprite.displayHeight || 64);
    
    this.npc.sprite.setOrigin(
      baseOriginX - offsetFactorX,
      baseOriginY - offsetFactorY
    );
    
    // Vérifier si le tremblement est terminé
    if (this.stateTimer >= this.stateDuration) {
      // 🎯 RESTAURER L'ORIGINE NORMALE
      this.npc.sprite.setOrigin(baseOriginX, baseOriginY);
      this.returnToNormal();
    }
  }

  /**
   * Obtenir les données pour le mouvement fleeing
   */
  getFleeingData() {
    return {
      direction: this.fleeDirection,
      speedMultiplier: this.config.fleeing.speedMultiplier
    };
  }

  /**
   * Obtenir la target de follow
   */
  getFollowTarget() {
    return this.followTarget;
  }

  /**
   * Obtenir le rayon de collision trembling
   */
  getTremblingCollisionRadius() {
    return this.tremblingCollisionRadius;
  }

  /**
   * Obtenir le joueur
   */
  getPlayer() {
    if (this.npc.scene.currentLevel && this.npc.scene.currentLevel.player) {
      return this.npc.scene.currentLevel.player;
    }
    return null;
  }

  /**
   * Nettoyer le composant
   */
  destroy() {
    this.followTarget = null;
    console.log('🗑️ NpcStateController détruit');
  }
} 