import { BaseEntity } from './BaseEntity';
import { NpcBehaviorController } from './behaviors/NpcBehaviorController';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';
import { StarEffectBehavior } from './behaviors/StarEffectBehavior';

// 🎯 NOUVEAUX COMPOSANTS SOLID
import { NpcStateController } from './npc/NpcStateController';
import { NpcMovementController } from './npc/NpcMovementController';
import { NpcFollowController } from './npc/NpcFollowController';
import { NpcMigrationController } from './npc/NpcMigrationController';

/**
 * 🎯 SOLID REFACTOR: NPC simplifié
 * Responsabilité unique : Coordonner les composants du NPC
 * Délègue les responsabilités spécialisées aux composants dédiés
 */
export class Npc extends BaseEntity {
  constructor(scene, x, y, config = {}) {
    super(scene, x, y, 'character-spritesheet', true);
    
    this.entityType = 'npc';
    this.groupId = config.groupId || 0;
    
    // 🎯 NOUVEAUX COMPOSANTS SOLID
    this.stateController = new NpcStateController(this);
    this.movementController = new NpcMovementController(this);
    this.followController = new NpcFollowController(this);
    this.migrationController = new NpcMigrationController(this);
    
    // Appliquer les valeurs temporaires stockées pendant super()
    const speed = config.speed || this._tempSpeed || 150;
    this.movementController.setSpeed(speed);
    
    if (this._tempVelocity) {
      this.movementController.setVelocity(this._tempVelocity);
      delete this._tempVelocity;
    }
    
    if (this._tempTargetPosition) {
      this.migrationController.targetPosition = this._tempTargetPosition;
      delete this._tempTargetPosition;
    }
    
    if (this._tempState) {
      this.state = this._tempState; // Utiliser le setter pour appliquer correctement
      delete this._tempState;
    }
    
    if (this._tempFollowTarget !== undefined) {
      this.followTarget = this._tempFollowTarget; // Utiliser le setter pour appliquer correctement
      delete this._tempFollowTarget;
    }
    
    // Nettoyer les valeurs temporaires
    delete this._tempSpeed;
    
    // Behaviors existants (déjà bien organisés)
    this.behaviorController = new NpcBehaviorController(this, {
      trembleIntensity: 3
    });
    
    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(0.8, 0.3);
    
    this.starEffectBehavior = new StarEffectBehavior(this, {
      offsetY: -65,
      scale: 0.2,
      duration: 600,
      moveUpDistance: 25,
      fadeOutDelay: 150
    });
    
    // Configuration du sprite
    this.setupSprite();
    
    // S'enregistrer dans le système de tri par profondeur
    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this, 'characters');
    }
    
    console.log(`🤖 NPC SOLID créé (ID: ${this.groupId}) avec composants spécialisés`);
  }

  setupSprite() {
    // Ajustement de l'échelle à 0.6
    this.sprite.setScale(0.6);
    this.sprite.setTint(0xFFFFFF);
    
    // Configuration physique pour les NPCs
    if (this.sprite.body) {
      this.sprite.body.setMass(0.5); // Plus léger que le joueur
    }
    
    this.sprite.entity = this;
  }

  // ================================
  // 🎯 API PUBLIQUE SIMPLIFIÉE
  // ================================

  /**
   * Réaction au cri du joueur (délégué au StateController)
   */
  onShoutHit(force, distance, maxRadius) {
    this.stateController.onShoutHit(force, distance, maxRadius);
  }

  /**
   * Commencer à suivre le joueur
   */
  startFollowing(player) {
    this.stateController.startFollowing(player);
    
    // 🎯 Reset du système AAA
    this.followController.resetFollowState();
    
    // Créer l'effet d'étoile
    this.starEffectBehavior.createStarEffect();
    
    // Jouer le son touch
    if (this.scene.soundManager) {
      this.scene.soundManager.playTouch();
    }
  }

  /**
   * Démarrer la migration normale
   */
  startMigration(targetPos) {
    this.migrationController.startMigration(targetPos, this.stateController);
  }

  /**
   * Démarrer la migration d'organisme unifié
   */
  startOrganismMigration(targetPos, organicVelocity) {
    this.migrationController.startOrganismMigration(targetPos, organicVelocity, this.stateController);
  }

  /**
   * Retourner à l'état normal
   */
  returnToNormal() {
    this.stateController.returnToNormal();
    this.movementController.stop();
  }

  // ================================
  // 🎯 GETTERS POUR COMPATIBILITÉ
  // ================================

  get state() {
    return this.stateController ? this.stateController.getState() : 'normal';
  }

  set state(value) {
    if (this.stateController) {
      // Utiliser les méthodes appropriées du stateController selon la valeur
      if (value === 'normal') {
        this.stateController.returnToNormal();
      } else {
        // Pour autres états, utiliser setState directement
        this.stateController.setState(value);
      }
    } else {
      // Stocker temporairement si les composants ne sont pas encore créés
      this._tempState = value;
    }
  }

  get velocity() {
    return this.movementController ? this.movementController.getVelocity() : { x: 0, y: 0 };
  }

  set velocity(value) {
    if (this.movementController) {
      this.movementController.setVelocity(value);
    } else {
      // Stocker temporairement si les composants ne sont pas encore créés
      this._tempVelocity = value;
    }
  }

  get speed() {
    return this.movementController ? this.movementController.speed : this._tempSpeed || 150;
  }

  set speed(value) {
    if (this.movementController) {
      this.movementController.setSpeed(value);
    } else {
      // Stocker temporairement si les composants ne sont pas encore créés
      this._tempSpeed = value;
    }
  }

  get followTarget() {
    return this.stateController ? this.stateController.getFollowTarget() : null;
  }

  set followTarget(value) {
    if (this.stateController) {
      // Si on définit followTarget à null, retourner à l'état normal
      if (value === null) {
        this.stateController.returnToNormal();
      } else {
        // Sinon commencer à suivre la target
        this.stateController.startFollowing(value);
      }
    } else {
      // Stocker temporairement si les composants ne sont pas encore créés
      this._tempFollowTarget = value;
    }
  }

  get tremblingCollisionRadius() {
    return this.stateController ? this.stateController.getTremblingCollisionRadius() : 25;
  }

  get targetPosition() {
    return this.migrationController ? this.migrationController.getTargetPosition() : null;
  }

  set targetPosition(value) {
    if (this.migrationController) {
      this.migrationController.targetPosition = value;
    } else {
      // Stocker temporairement si les composants ne sont pas encore créés
      this._tempTargetPosition = value;
    }
  }

  get migrationSpeed() {
    return this.migrationController ? this.migrationController.migrationSpeed : 120;
    }
    
  set migrationSpeed(value) {
    if (this.migrationController) {
      this.migrationController.migrationSpeed = value;
    }
  }

  get migrationTolerance() {
    return this.migrationController ? this.migrationController.migrationTolerance : 15;
  }

  set migrationTolerance(value) {
    if (this.migrationController) {
      this.migrationController.migrationTolerance = value;
    }
  }

  // ================================
  // 🎯 MÉTHODES LEGACY (compatibilité)
  // ================================

  /**
   * Vérifier si au repos (système AAA)
   */
  isAtRest() {
    return this.followController ? this.followController.isAtRest() : false;
  }

  /**
   * Vérifier si une position est valide
   */
  isPositionValid(x, y) {
    return this.movementController ? this.movementController.isPositionValid(x, y) : true;
  }

  /**
   * Calculer les forces de following
   */
  calculateFollowingForces(delta) {
    return this.followController ? this.followController.calculateFollowingForces(delta) : { x: 0, y: 0 };
  }

  /**
   * Obtenir le joueur
   */
  getPlayer() {
    if (this.scene.currentLevel && this.scene.currentLevel.player) {
      return this.scene.currentLevel.player;
  }
    return null;
  }

  // ================================
  // 🎯 CYCLE DE VIE
  // ================================

  /**
   * Mettre à jour le NPC (orchestration des composants)
   */
  update(delta) {
    // NE PAS appeler super.update(delta) pour éviter double mouvement
    
    if (!this.sprite) return;
    
    // Clamp delta pour la physique seulement; garder le delta brut pour l'animation
    const clampedDelta = Math.min(delta, 33);
    
    // 1. Mettre à jour la logique d'état
    this.stateController.updateStateLogic(clampedDelta);
    
    // 2. Mettre à jour le système de suivi AAA
    this.followController.updateFollowState(this.stateController);
    
    // 3. Calculer et appliquer la vélocité finale
    const currentState = this.stateController.getState();
    let finalVelocity = { x: 0, y: 0 };
    
    // 4. Déterminer la source de vélocité selon l'état
    if (currentState === 'migrating') {
      this.migrationController.updateMigration(this.movementController, this.stateController, clampedDelta);
      finalVelocity = this.movementController.getVelocity();
    } else if (currentState === 'organism_migrating') {
      this.migrationController.updateOrganismMigration(this.movementController, this.stateController, clampedDelta);
      finalVelocity = this.movementController.getVelocity();
    } else {
      // Utiliser le MovementController pour calculer la vélocité
      finalVelocity = this.movementController.calculateVelocity(currentState, this.stateController, clampedDelta);
      
      // Ajouter les forces de following si nécessaire
      if (currentState === 'following') {
        const followingForces = this.followController.calculateFollowingForces(clampedDelta);
        finalVelocity.x += followingForces.x;
        finalVelocity.y += followingForces.y;
      }
      
      // RE-CAP: garantir le plafond de vitesse après toutes additions
      finalVelocity = this.movementController.capVelocity(finalVelocity, currentState);
    }
    
    // 5. Appliquer la vélocité finale
    this.movementController.applyVelocity(finalVelocity);
    
    // 6. Mettre à jour tous les composants
    this.movementController.update(clampedDelta);
    
    // 7. Mettre à jour les behaviors existants
    this.starEffectBehavior.update(clampedDelta);
    // IMPORTANT: utiliser le delta brut pour la vitesse réelle de l'animation
    this.animationBehavior.update(delta);
  }

  /**
   * Gérer les collisions (délégué au MovementController)
   */
  onCollision(other) {
    if (!this.sprite) return;
    this.movementController.onCollision(other);
  }

  /**
   * Nettoyer le NPC
   */
  destroy() {
    // Réinitialiser l'état des animations
    if (this.animationBehavior && this.animationBehavior.resetState) {
      this.animationBehavior.resetState();
    }
    
    // Nettoyer les références de follow
    const followTarget = this.stateController.getFollowTarget();
    if (followTarget && followTarget.removeFollower) {
      followTarget.removeFollower(this);
    }
    
    // Détruire tous les composants SOLID
    this.stateController.destroy();
    this.movementController.destroy();
    this.followController.destroy();
    this.migrationController.destroy();
    
    // Détruire les behaviors
    if (this.starEffectBehavior) {
      this.starEffectBehavior.destroy();
    }
    
    // Se retirer du système de tri par profondeur
    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }
    
    console.log(`🚮 NPC SOLID détruit (ID: ${this.groupId})`);
    super.destroy();
  }

  // ================================
  // 🎯 API D'INFORMATION/DEBUG
  // ================================

  /**
   * Obtenir des statistiques complètes du NPC
   */
  getNpcStats() {
    return {
      groupId: this.groupId,
      position: { x: this.sprite.x, y: this.sprite.y },
      state: this.stateController.getState(),
      stateTimer: this.stateController.getStateTimer(),
      movement: {
        speed: this.speed,
        velocity: this.velocity,
        isMoving: this.movementController.isMoving()
      },
      follow: this.followController.getFollowStats(),
      migration: {
        targetPosition: this.targetPosition,
        migrationSpeed: this.migrationSpeed,
        migrationTolerance: this.migrationTolerance
      },
      trembling: {
        collisionRadius: this.tremblingCollisionRadius
      }
    };
  }

  /**
   * Afficher les stats dans la console
   */
  logStats() {
    const stats = this.getNpcStats();
    console.log(`📊 NPC ${this.groupId} Stats:`, stats);
  }
} 