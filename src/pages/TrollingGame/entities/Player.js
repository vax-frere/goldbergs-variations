import { BaseEntity } from './BaseEntity';
import { IMovable, ICollidable } from '../core/interfaces';
import { PlayerState, PlayerStates } from '../core/PlayerState';
import { ShoutBehavior } from './behaviors/ShoutBehavior';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';
import { TrailBehavior } from './behaviors/TrailBehavior';

// 🎯 NOUVEAUX COMPOSANTS SOLID
import { PlayerMovementController } from './player/PlayerMovementController';
import { PlayerFollowerManager } from './player/PlayerFollowerManager';
import { PlayerCollisionDetector } from './player/PlayerCollisionDetector';
import { PlayerForceCalculator } from './player/PlayerForceCalculator';
import { PlayerDebugRenderer } from './player/PlayerDebugRenderer';

/**
 * 🎯 SOLID REFACTOR: Player simplifié
 * Responsabilité unique : Coordonner les composants du joueur
 * Délègue les responsabilités spécialisées aux composants dédiés
 */
export class Player extends BaseEntity {
  constructor(scene, x, y) {
    // 🎯 CRÉER D'ABORD les composants avant super() pour éviter les erreurs d'ordre
    const tempSprite = { setScale: () => {} }; // Sprite temporaire pour les composants
    
    super(scene, x, y, 'character-spritesheet');
    this.entityType = 'player';
    
    // Ajustement de l'échelle à 0.6
    this.sprite.setScale(0.6);
    
    // Système d'état du joueur
    this.playerState = new PlayerState(this);
    this.inputEnabled = false; // Désactivé par défaut
    
    // 🎯 NOUVEAUX COMPOSANTS SOLID (maintenant que this.sprite existe)
    this.movementController = new PlayerMovementController(this);
    this.followerManager = new PlayerFollowerManager(this);
    this.collisionDetector = new PlayerCollisionDetector(this);
    this.forceCalculator = new PlayerForceCalculator(this);
    this.debugRenderer = new PlayerDebugRenderer(this);
    
    // Maintenant définir la vitesse via le movementController
    this.speed = 150;
    
    // Behaviors existants (déjà bien organisés)
    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(1.2, 0.5);
    
    this.shoutBehavior = new ShoutBehavior(this, {
      offsetX: 60,
      offsetY: -10,
      scale: 0.3,
      duration: 750
    });
    
    this.trailBehavior = new TrailBehavior(this, {
      maxPoints: 300,
      minDistanceToAdd: 1,
      lineWidth: 3,
      lineColor: 0x00ff88,
      alpha: 0.8,
      fadeEnabled: true,
      debugOnly: true,
      updateThreshold: 0.5,
      followersPerPoint: 6,
      followPointDistance: 100
    });
    
    // Propriétés de cri
    this.canShout = true;
    this.shoutCooldown = 500;
    this.lastShoutTime = 0;
    
    // Legacy properties pour compatibilité (seront supprimées progressivement)
    this.tremblingRadiusMultiplierPerFollower = 0.01;
    
    // 🎯 CORRECTION: S'enregistrer dans le système de tri par profondeur
    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this, 'characters');
    }
    
    console.log('🎮 Player SOLID créé avec composants spécialisés');
  }

  // ================================
  // 🎯 API PUBLIQUE SIMPLIFIÉE
  // ================================

  /**
   * Définir le mouvement (délégué au MovementController)
   */
  setMovement(directions, forceMovement = false) {
    this.movementController.setMovement(directions, forceMovement);
  }

  /**
   * Crier (logique complète restaurée)
   */
  shout() {
    const currentTime = Date.now();
    
    if (currentTime - this.lastShoutTime < this.shoutCooldown) {
      return; // Cooldown pas écoulé
    }
    
    if (!this.canShout) {
      return; // Cri désactivé
    }
    
    // 🎯 NOUVEAU: Empêcher de crier si déjà en train de crier (animation en cours)
    if (this.shoutBehavior && this.shoutBehavior.isScreaming) {
      return; // Animation de cri en cours
    }
    
    this.lastShoutTime = currentTime;
    
    // 🎯 ÉTAPE 1: Mettre à jour la force et le rayon basés sur les followers
    this.updateShoutPower();
    
    // 🎯 ÉTAPE 2: Jouer son aléatoire child-shout via le SoundManager
    if (this.scene.soundManager) {
      this.scene.soundManager.playRandomChildShout();
    }
    
    // 🎯 ÉTAPE 3: Créer onomatopée orientée selon direction du joueur
    this.createShoutShape();
    
    // 🎯 ÉTAPE 4: Faire crier les followers avec la même onomatopée
    this.makeFollowersShout();
    
    // 🎯 ÉTAPE 5: Détecter et affecter les NPCs à portée (LE PLUS IMPORTANT!)
    this.affectNearbyNpcs();
    
    const followerCount = this.followerManager.getFollowerCount();
    const force = this.forceCalculator.getCurrentShoutForce();
    const radius = this.forceCalculator.getCurrentShoutRadius();
    
    console.log(`📢 Joueur crie ! Force: ${force.toFixed(2)}, Rayon: ${radius.toFixed(0)}px, Suiveurs: ${followerCount}`);
  }

  /**
   * 🎯 RESTAURÉ: Mettre à jour la puissance du cri (délégué aux composants)
   */
  updateShoutPower() {
    // Déléguer aux composants SOLID
    this.forceCalculator.updateCalculations();
    
    // 🔧 CORRECTION: Mettre à jour les debug visuals SEULEMENT si debug activé
    if (this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.forceUpdateDebugVisuals();
    }
  }

  /**
   * 🎯 RESTAURÉ: Créer une onomatopée orientée
   */
  createShoutShape() {
    // Pour l'instant, utiliser l'onomatopée aléatoire du ShoutBehavior
    // TODO: Améliorer avec orientation basée sur la direction du joueur
    this.shoutBehavior.shout();
  }

  /**
   * 🎯 RESTAURÉ: Faire crier les followers avec sons child-shout et animations (20% seulement)
   */
  makeFollowersShout() {
    const followers = this.followerManager.getFollowers();
    const followerCount = followers.length;
    
    if (followerCount === 0) return;
    
    // 🎯 NOUVEAU: Sélectionner seulement 20% des followers pour crier
    const shoutersCount = Math.max(1, Math.floor(followerCount * 0.2)); // Au moins 1 si il y a des followers
    
    // Sélectionner aléatoirement les followers qui vont crier
    const shuffledFollowers = [...followers].sort(() => Math.random() - 0.5);
    const shoutersArray = shuffledFollowers.slice(0, shoutersCount);
    
    console.log(`📢 ${shoutersCount}/${followerCount} followers vont crier (20%)`);
    
    // Jouer les sons child-shout pour les followers qui crient via le SoundManager
    if (shoutersCount > 0 && this.scene.soundManager) {
      this.scene.soundManager.playMultipleChildShouts(shoutersCount);
    }
    
    // Faire crier les NPCs followers sélectionnés (animation zombiescream + arrêt de mouvement)
    shoutersArray.forEach((follower, index) => {
      if (follower && follower.shout) {
        // Délai progressif pour les followers (effet de vague rapide)
        const baseDelay = index * 25; // 3ms entre chaque follower qui crie
        
        // 🎯 NOUVEAU: Ajouter un décalage aléatoire de 0-100ms pour plus de naturel
        const randomOffset = Math.random() * 300; // 0-100ms aléatoire
        const totalDelay = baseDelay + randomOffset;
        
        setTimeout(() => {
          follower.shout(); // Appel direct de la méthode shout() du NPC (inclut l'arrêt automatique)
        }, totalDelay);
      }
    });
  }

  /**
   * 🎯 RESTAURÉ: Affecter les NPCs proches (LOGIQUE PRINCIPALE!)
   */
  affectNearbyNpcs() {
    // Obtenir tous les NPCs via l'EntityManager
    const entityManager = this.scene.currentLevel?.entityManager;
    if (!entityManager) return;

    const npcs = entityManager.getNpcs();
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;
    const currentRadius = this.forceCalculator.getCurrentShoutRadius();
    const currentForce = this.forceCalculator.getCurrentShoutForce();

    let affectedCount = 0;

    npcs.forEach(npc => {
      if (!npc.sprite) return;

      // Calculer la distance
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        npc.sprite.x, npc.sprite.y
      );

      // Vérifier si le NPC est à portée
      if (distance <= currentRadius) {
        // Envoyer l'effet du cri au NPC
        npc.onShoutHit(currentForce, distance, currentRadius);
        affectedCount++;
      }
    });

    console.log(`💥 ${affectedCount} NPCs affectés par le cri dans un rayon de ${currentRadius.toFixed(0)}px`);
  }

  /**
   * 🎯 RESTAURÉ: Obtenir la position cible pour un follower (CRITIQUE pour NPCs!)
   */
  getFollowTargetPosition(follower) {
    if (!this.trailBehavior) {
      console.error(`🚨 Player.getFollowTargetPosition: Pas de trailBehavior ! Position d'urgence...`);
      // Retourner une position d'urgence près du joueur
      return {
        x: this.sprite.x,
        y: this.sprite.y + 60
      };
    }
    
    // Utiliser le FollowerManager pour obtenir l'index
    const followers = this.followerManager.getFollowers();
    const followerIndex = followers.indexOf(follower);
    
    if (followerIndex === -1) {
      // 🛠️ CORRECTION AUTOMATIQUE : NPC pas dans la liste mais essaie de suivre
      if (follower.state === 'following' && follower.followTarget === this) {
        // L'ajouter automatiquement via le FollowerManager
        const added = this.followerManager.addFollower(follower);
        if (added) {
          // Réessayer avec le nouvel index (récursion)
          return this.getFollowTargetPosition(follower);
        } else {
          // Retourner une position d'urgence si ajout impossible
          return {
            x: this.sprite.x - 30,
            y: this.sprite.y + 80
          };
        }
      } else {
        // Retourner une position d'urgence générique
        return {
          x: this.sprite.x + 30,
          y: this.sprite.y + 80
        };
      }
    }
    
    // Obtenir le point de suivi pour ce follower via le trail
    const trailPoint = this.trailBehavior.getFollowPointForFollower(followerIndex);
    
    if (trailPoint) {
      return trailPoint;
    } else {
      // 🚨 JAMAIS DE NULL - Forcer la génération
      console.error(`🚨 PAS DE TRAIL: Follower ${followerIndex} n'a pas reçu de point ! Génération d'urgence...`);
      
      // Forcer la génération immédiate
      const requiredPoints = Math.ceil(followers.length / this.trailBehavior.followersPerPoint);
      this.trailBehavior.forceMoreTrailPoints(requiredPoints);
      
      // Réessayer une fois
      const secondAttempt = this.trailBehavior.getFollowPointForFollower(followerIndex);
      if (secondAttempt) {
        return secondAttempt;
      }
      
      // Dernière chance absolue
      console.error(`💀 DERNIÈRE CHANCE: Follower ${followerIndex} → Position d'urgence`);
      return {
        x: this.sprite.x + (followerIndex * 20) - 100,
        y: this.sprite.y + 100
      };
    }
  }

  /**
   * Activer/désactiver les inputs
   */
  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
  }

  /**
   * Activer/désactiver le debug
   */
  setDebugEnabled(enabled) {
    this.debugRenderer.setDebugEnabled(enabled);
  }

  /**
   * Définir les limites du monde
   */
  setWorldBounds(bounds) {
    this.movementController.setWorldBounds(bounds);
  }

  /**
   * Vider tous les followers
   */
  clearAllFollowers() {
    this.followerManager.clearAllFollowers();
  }

  /**
   * Définir la position
   */
  setPosition(x, y) {
    if (this.sprite) {
      this.sprite.setPosition(x, y);
    }
  }

  // ================================
  // 🎯 GETTERS POUR COMPATIBILITÉ
  // ================================

  get speed() {
    return this.movementController ? this.movementController.speed : 0;
  }

  set speed(value) {
    if (this.movementController) {
      this.movementController.speed = value;
    }
  }

  get velocity() {
    return this.movementController ? this.movementController.velocity : { x: 0, y: 0 };
  }

  set velocity(value) {
    if (this.movementController) {
      this.movementController.velocity = value;
    }
  }

  get followers() {
    return this.followerManager.getFollowers();
  }

  get currentShoutRadius() {
    return this.forceCalculator.getCurrentShoutRadius();
  }

  get currentShoutForce() {
    return this.forceCalculator.getCurrentShoutForce();
  }

  get tremblingCollisionRadius() {
    return this.collisionDetector.getTremblingCollisionRadius();
  }

  // ================================
  // 🎯 MÉTHODES LEGACY (compatibilité)
  // ================================

  /**
   * Vérifier les collisions avec les NPCs tremblants
   */
  checkTremblingNpcCollisions() {
    return this.collisionDetector.checkTremblingNpcCollisions();
  }

  /**
   * Mettre à jour les debug visuals
   */
  updateShoutRadiusDebug() {
    // 🎯 DÉPRÉCIÉ: Déléguer au PlayerDebugRenderer
    if (this.debugRenderer && this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.updateShoutRadiusDebug();
    }
  }

  updateTremblingRadiusDebug() {
    // 🎯 DÉPRÉCIÉ: Déléguer au PlayerDebugRenderer  
    if (this.debugRenderer && this.debugRenderer.isDebugEnabled) {
      this.debugRenderer.updateTremblingRadiusDebug();
    }
  }

  /**
   * Forcer la mise à jour des debug visuals
   */
  forceUpdateAllDebugVisuals() {
    // 🎯 DÉPRÉCIÉ: Déléguer au PlayerDebugRenderer
    if (this.debugRenderer) {
      this.debugRenderer.forceUpdateDebugVisuals();
    }
  }

  /**
   * Vérifier si une position est valide
   */
  isPositionValid(x, y) {
    return this.movementController.isPositionValid(x, y);
  }

  // ================================
  // 🎯 CYCLE DE VIE
  // ================================

  /**
   * Mettre à jour le joueur (orchestration des composants)
   */
  update(delta) {
    // NE PAS appeler super.update(delta) pour éviter double mouvement
    
    if (!this.sprite) return;
    
    // Clamp delta pour la physique seulement; garder delta brut pour l'animation
    const clampedDelta = Math.min(delta, 33);
    
    // Mettre à jour tous les composants
    this.movementController.update(clampedDelta);
    this.followerManager.update(clampedDelta);
    this.collisionDetector.update(clampedDelta);
    this.forceCalculator.update(clampedDelta);
    this.debugRenderer.update(clampedDelta);
    
    // Mettre à jour les behaviors existants
    this.shoutBehavior.update(clampedDelta);
    // IMPORTANT: delta brut pour la vitesse réelle
    this.animationBehavior.update(delta);
    this.trailBehavior.update(clampedDelta);
  }

  /**
   * Gérer les collisions (délégué au CollisionDetector)
   */
  onCollision(other) {
    if (!this.sprite) return;
    this.collisionDetector.onCollision(other);
  }

  /**
   * Nettoyer le joueur
   */
  destroy() {
    // Réinitialiser l'état des animations
    if (this.animationBehavior && this.animationBehavior.resetState) {
      this.animationBehavior.resetState();
    }
    
    // Détruire tous les composants SOLID
    this.movementController.destroy();
    this.followerManager.destroy();
    this.collisionDetector.destroy();
    this.forceCalculator.destroy();
    this.debugRenderer.destroy();
    
    // Détruire les behaviors
    if (this.shoutBehavior) {
      this.shoutBehavior.destroy();
    }
    
    if (this.trailBehavior) {
      this.trailBehavior.destroy();
    }
    
    // Se retirer du système de tri par profondeur
    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }
    
    console.log('🚮 Player SOLID détruit');
    super.destroy();
  }

  // ================================
  // 🎯 API D'INFORMATION/DEBUG
  // ================================

  /**
   * Obtenir des statistiques complètes du joueur
   */
  getPlayerStats() {
    return {
      position: { x: this.sprite.x, y: this.sprite.y },
      movement: {
        speed: this.speed,
        velocity: this.velocity,
        isMoving: this.movementController.isMoving()
      },
      followers: this.followerManager.getStats(),
      forces: this.forceCalculator.getForceStats(),
      collision: {
        tremblingRadius: this.tremblingCollisionRadius
      },
      debug: this.debugRenderer.getDebugStatus(),
      state: this.playerState.getState(),
      inputEnabled: this.inputEnabled
    };
  }

  /**
   * Afficher les stats dans la console
   */
  logStats() {
    const stats = this.getPlayerStats();
    console.log('📊 Player Stats:', stats);
  }
} 