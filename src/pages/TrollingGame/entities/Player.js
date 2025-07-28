import { BaseEntity } from './BaseEntity';
import { IMovable, ICollidable } from '../core/interfaces';
import { PlayerState, PlayerStates } from '../core/PlayerState';
import { ShoutBehavior } from './behaviors/ShoutBehavior';
import { CharacterAnimationBehavior } from './behaviors/CharacterAnimationBehavior';
import { TrailBehavior } from './behaviors/TrailBehavior';

export class Player extends BaseEntity {
  constructor(scene, x, y) {
    super(scene, x, y, 'character-spritesheet');
    this.speed = 150;
    this.entityType = 'player';
    
    // AJOUT: Configuration physique spéciale pour le joueur - plus de "force" dans les foules
    if (this.sprite.body) {
      this.sprite.body.setMass(5000); // 3x plus lourd que les NPCs (défaut = 1) pour pousser à travers les foules
      this.sprite.body.setDrag(200, 200); // Drag réduit (200 vs 500 des NPCs) pour glisser plus facilement
      this.sprite.body.setBounce(0.3, 0.3); // Légère élasticité pour "pousser" les NPCs
      console.log('💪 Joueur configuré avec masse=3, drag=200, bounce=0.1 pour naviguer dans les foules');
    }
    
    // Réduire la taille du sprite
    this.sprite.setScale(0.5);
    
    // Système d'état du joueur
    this.playerState = new PlayerState(this);
    this.inputEnabled = false; // Désactivé par défaut (sera activé après l'intro)
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION pour les animations
    this.animationBehavior = new CharacterAnimationBehavior(this);
    this.animationBehavior.setMovementThresholds(1.2, 0.5); // Seuils adaptés au joueur
    
    // Propriétés de mouvement
    this.canMove = true;
    
    // Vélocité pour le mouvement en 8 directions
    this.velocity = { x: 0, y: 0 };
    
    // Système de cri
    this.shoutBehavior = new ShoutBehavior(this, {
      offsetX: 60, // Position à droite du joueur
      offsetY: -70, // Position au-dessus du joueur
      scale: 0.3, // Taille des onomatopées du joueur
      duration: 750 // Durée des animations
    });
    this.canShout = true;
    this.shoutCooldown = 500; // 500ms entre les cris
    this.lastShoutTime = 0;
    this.lastOnomatopeNumber = null; // Pour éviter la répétition
    
    // Système de trail avec points de suivi pour les followers
    this.trailBehavior = new TrailBehavior(this, {
      maxPoints: 300, // Trail BEAUCOUP plus long (était 150)
      minDistanceToAdd: 1, // Plus agressif pour générer plus de points (était 2)
      lineWidth: 3, // Ligne un peu plus épaisse pour bien voir
      lineColor: 0x00ff88, // Vert menthe agréable
      alpha: 0.8, // Plus visible
      fadeEnabled: true, // Fade progressif pour un effet élégant
      debugOnly: true, // Visible seulement en mode debug
      updateThreshold: 0.5, // Plus réactif pour générer plus de points (était 1.0)
      // Configuration des points de suivi pour followers
      followersPerPoint: 6, // 🎯 AJUSTÉ : 6 followers par point de suivi (était 7)
      followPointDistance: 100 // 🎯 RAPPROCHÉ : Distance de 130px entre chaque point (était 150px)
    });
    
    // Système de force du cri
    this.baseShoutForce = 1.0; // Force de base
    this.currentShoutForce = this.baseShoutForce;
    this.baseShoutRadius = 125; // Rayon de base en pixels
    this.currentShoutRadius = this.baseShoutRadius;
    this.forceMultiplierPerFollower = 0.1; // +50% de force par suiveur
    this.radiusMultiplierPerFollower = 0.025; // +5% de rayon de cri par suiveur
    this.tremblingRadiusMultiplierPerFollower = 0.01; // +1% de rayon de collision tremblant par suiveur
    
    // NPCs qui suivent le joueur
    this.followers = [];
    this.maxFollowers = 60; // 🎯 AUGMENTÉ : Limite pour supporter beaucoup plus de suiveurs
    
    // Limites du monde (seront mises à jour par le niveau)
    this.worldBounds = {
      x: 0,
      y: 0,
      width: scene.sys.canvas.width,
      height: scene.sys.canvas.height
    };
    
    // Debug du rayon de cri
    this.shoutRadiusDebugGraphic = null;
    this.isDebugEnabled = false;
    
    // 🎯 BASE INDEX pour tous les éléments de debug du Player
    this.DEBUG_BASE_INDEX = 10000;
    
    // AJOUT: Rayon de collision avec les NPCs tremblants et debug
    this.baseTremblingCollisionRadius = 70; // Rayon de base
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius; // Rayon pour collecter les NPCs tremblants
    this.tremblingRadiusDebugGraphic = null;
    
    // S'enregistrer dans le système de tri par profondeur
    if (scene.depthSortingSystem) {
      scene.depthSortingSystem.addEntity(this);
    }
  }



  // Méthode pour activer/désactiver les contrôles du joueur
  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    this.canMove = enabled && this.playerState.canMove();
    
    console.log(`🎮 Contrôles joueur: ${enabled ? 'ACTIVÉS' : 'DÉSACTIVÉS'}`);
  }

  // Méthode pour activer/désactiver le debug du rayon de cri
  setDebugEnabled(enabled) {
    this.isDebugEnabled = enabled;
    
    if (enabled) {
      // Créer la visualisation debug du rayon de cri
      this.createShoutRadiusDebug();
      // AJOUT: Créer la visualisation debug du rayon de collision tremblant
      this.createTremblingRadiusDebug();
    } else {
      // Détruire la visualisation debug du rayon de cri
      this.destroyShoutRadiusDebug();
      // AJOUT: Détruire la visualisation debug du rayon de collision tremblant
      this.destroyTremblingRadiusDebug();
    }
    
    console.log(`🔍 Debug rayon de cri: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  // Créer la visualisation du rayon de cri
  createShoutRadiusDebug() {
    if (this.shoutRadiusDebugGraphic) {
      this.shoutRadiusDebugGraphic.destroy();
    }
    
    this.shoutRadiusDebugGraphic = this.scene.add.graphics();
    this.shoutRadiusDebugGraphic.name = 'shout-radius-debug'; // 🎯 AJOUT: Nom pour le nettoyage
    this.shoutRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 0); // 🎯 Shout radius graphic
    this.updateShoutRadiusDebug();
  }

  // Mettre à jour la visualisation du rayon de cri
  updateShoutRadiusDebug() {
    // 🎯 SIMPLIFICATION: Seulement redessiner si les graphics existent
    if (!this.shoutRadiusDebugGraphic || !this.sprite) return;
    
    this.shoutRadiusDebugGraphic.clear();
    
    // Cercle rouge semi-transparent
    this.shoutRadiusDebugGraphic.lineStyle(2, 0xff0000, 0.8);
    this.shoutRadiusDebugGraphic.fillStyle(0xff0000, 0.1);
    this.shoutRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, this.currentShoutRadius);
    this.shoutRadiusDebugGraphic.fillCircle(this.sprite.x, this.sprite.y, this.currentShoutRadius);
    
    if (!this.shoutRadiusDebugText) {
      this.shoutRadiusDebugText = this.scene.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      });
      this.shoutRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 2); // 🎯 Shout radius text
    }
    
    // 🎯 SÉCURITÉ: Vérifier que le debug text existe encore
    if (!this.shoutRadiusDebugText || !this.shoutRadiusDebugText.active) {
      console.warn('⚠️ Debug text détruit, recréation...');
      this.shoutRadiusDebugText = this.scene.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      });
      this.shoutRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 2); // 🎯 Shout radius text
    }
    
    try {
      const debugInfo = `Radius: ${this.currentShoutRadius.toFixed(0)}px\nForce: ${this.currentShoutForce.toFixed(1)}\nFollowers: ${this.followers.length}`;
    this.shoutRadiusDebugText.setText(debugInfo);
    this.shoutRadiusDebugText.setPosition(this.sprite.x + this.currentShoutRadius + 10, this.sprite.y - 30);
    } catch (error) {
      console.warn('⚠️ Erreur updateShoutRadiusDebug:', error);
      // Nettoyer le debug text défaillant
      this.destroyShoutRadiusDebug();
    }
  }

  // Détruire la visualisation du rayon de cri
  destroyShoutRadiusDebug() {
    if (this.shoutRadiusDebugGraphic) {
      this.shoutRadiusDebugGraphic.destroy();
      this.shoutRadiusDebugGraphic = null;
    }
    
    // 🎯 DESTRUCTION ROBUSTE du texte debug
    if (this.shoutRadiusDebugText) {
      try {
        this.shoutRadiusDebugText.destroy();
        console.log('🗑️ Debug text shout détruit');
      } catch (error) {
        console.warn('⚠️ Erreur destruction debug text shout:', error);
      }
      this.shoutRadiusDebugText = null;
    }
  }

  // AJOUT: Méthodes pour la visualisation debug du rayon de collision tremblant
  createTremblingRadiusDebug() {
    if (this.tremblingRadiusDebugGraphic) {
      this.tremblingRadiusDebugGraphic.destroy();
    }
    
    this.tremblingRadiusDebugGraphic = this.scene.add.graphics();
    this.tremblingRadiusDebugGraphic.name = 'trembling-radius-debug'; // 🎯 AJOUT: Nom pour le nettoyage
    this.tremblingRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 1); // 🎯 Trembling radius graphic
    this.updateTremblingRadiusDebug();
  }

  updateTremblingRadiusDebug() {
    // 🎯 SIMPLIFICATION: Seulement redessiner si les graphics existent
    if (!this.tremblingRadiusDebugGraphic || !this.sprite) return;
    
    this.tremblingRadiusDebugGraphic.clear();
    
    // Cercle vert semi-transparent pour le rayon de collision tremblant
    this.tremblingRadiusDebugGraphic.lineStyle(3, 0x00ff00, 0.8); // Vert, plus épais
    this.tremblingRadiusDebugGraphic.fillStyle(0x00ff00, 0.1); // Vert semi-transparent
    this.tremblingRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, this.tremblingCollisionRadius);
    this.tremblingRadiusDebugGraphic.fillCircle(this.sprite.x, this.sprite.y, this.tremblingCollisionRadius);
    
    // 🎯 NOUVEAU: Ajouter du texte avec les informations du rayon tremblant
    if (!this.tremblingRadiusDebugText) {
      this.tremblingRadiusDebugText = this.scene.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      });
      this.tremblingRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 3); // 🎯 Trembling radius text
    }
    
    // 🎯 SÉCURITÉ: Vérifier que le debug text existe encore
    if (!this.tremblingRadiusDebugText || !this.tremblingRadiusDebugText.active) {
      console.warn('⚠️ Trembling debug text détruit, recréation...');
      this.tremblingRadiusDebugText = this.scene.add.text(0, 0, '', {
        fontSize: '12px',
        fill: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      });
      this.tremblingRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 3); // 🎯 Trembling radius text
    }
    
    try {
      const debugInfo = `Follow Radius: ${this.tremblingCollisionRadius.toFixed(0)}px\nMultiplier: x${this.tremblingRadiusMultiplierPerFollower}\nFollowers: ${this.followers.length}`;
      this.tremblingRadiusDebugText.setText(debugInfo);
      this.tremblingRadiusDebugText.setPosition(this.sprite.x + this.tremblingCollisionRadius + 10, this.sprite.y + 10); // À droite et légèrement en bas
    } catch (error) {
      console.warn('⚠️ Erreur updateTremblingRadiusDebug:', error);
      // Nettoyer le debug text défaillant
      this.destroyTremblingRadiusDebug();
    }
    
    // 🎯 SUPPRIMÉ: setDepth déjà défini lors de la création, pas besoin de le redéfinir ici
  }

  destroyTremblingRadiusDebug() {
    if (this.tremblingRadiusDebugGraphic) {
      this.tremblingRadiusDebugGraphic.destroy();
      this.tremblingRadiusDebugGraphic = null;
    }
    
    // 🎯 DESTRUCTION ROBUSTE du texte debug trembling
    if (this.tremblingRadiusDebugText) {
      try {
        this.tremblingRadiusDebugText.destroy();
        console.log('🗑️ Debug text trembling détruit');
      } catch (error) {
        console.warn('⚠️ Erreur destruction debug text trembling:', error);
      }
      this.tremblingRadiusDebugText = null;
    }
  }

  // Méthode pour gérer le mouvement en 8 directions
  setMovement(directions, forceMovement = false) {
    // Pendant l'intro, seul le mouvement forcé (automatique) est autorisé
    if (!this.sprite) return;
    if (!forceMovement && (!this.canMove || !this.inputEnabled)) return;
    
    // Réinitialiser la vélocité de façon explicite
    this.velocity.x = 0;
    this.velocity.y = 0;
    
    // Calculer la vélocité basée sur les directions actives
    if (directions.up) this.velocity.y -= 1;
    if (directions.down) this.velocity.y += 1;
    if (directions.left) this.velocity.x -= 1;
    if (directions.right) this.velocity.x += 1;
    
    // Normaliser la vélocité pour les mouvements diagonaux
    const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (magnitude > 0) {
      this.velocity.x = (this.velocity.x / magnitude);
      this.velocity.y = (this.velocity.y / magnitude);
      
      // Protection supplémentaire : s'assurer que la vélocité reste normalisée
      const finalMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (finalMagnitude > 1.0) {
        this.velocity.x = this.velocity.x / finalMagnitude;
        this.velocity.y = this.velocity.y / finalMagnitude;
      }
    } else {
      // Forcer explicitement à zéro
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
  }

  // Nouvelle méthode : Crier avec des formes primitives
  shout() {
    const currentTime = Date.now();
    
    // Vérifier le cooldown
    if (!this.canShout || (currentTime - this.lastShoutTime) < this.shoutCooldown) {
      return;
    }
    
    this.lastShoutTime = currentTime;
    
    // Mettre à jour la force et le rayon basés sur les suiveurs
    this.updateShoutPower();
    
    // Jouer le son de cri avec intensité variable
    if (this.scene.soundManager) {
      this.scene.soundManager.playCry(this.currentShoutForce);
    }
    
    // Créer une forme aléatoire orientée selon la direction du joueur
    this.createShoutShape();
    
    // Faire crier les followers avec la même onomatopée
    this.makeFollowersShout();
    
    // Détecter et affecter les NPCs à portée
    this.affectNearbyNpcs();
    
    console.log(`📢 Joueur crie ! Force: ${this.currentShoutForce.toFixed(2)}, Rayon: ${this.currentShoutRadius.toFixed(0)}px, Suiveurs: ${this.followers.length}`);
  }

  updateShoutPower() {
    // Calculer la force et le rayon basés sur le nombre de suiveurs
    const followersCount = this.followers.length;
    this.currentShoutForce = this.baseShoutForce * (1 + (followersCount * this.forceMultiplierPerFollower));
    this.currentShoutRadius = this.baseShoutRadius * (1 + (followersCount * this.radiusMultiplierPerFollower));
    
    // 🎯 DÉCORRÉLÉ: Rayon de collision tremblant avec son propre multiplicateur
    this.tremblingCollisionRadius = this.baseTremblingCollisionRadius * (1 + (followersCount * this.tremblingRadiusMultiplierPerFollower));
    
    // Mettre à jour la visualisation debug si activée
    this.updateShoutRadiusDebug();
    this.updateTremblingRadiusDebug(); // 🎯 AJOUT: Mettre à jour aussi le debug du rayon tremblant
  }

  affectNearbyNpcs() {
    // Obtenir tous les NPCs de la scène
    const entityManager = this.scene.currentLevel?.entityManager;
    if (!entityManager) return;

    const npcs = entityManager.getNpcs();
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;

    npcs.forEach(npc => {
      if (!npc.sprite) return;

      // Calculer la distance
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        npc.sprite.x, npc.sprite.y
      );

      // Vérifier si le NPC est à portée
      if (distance <= this.currentShoutRadius) {
        // Envoyer l'effet du cri au NPC
        npc.onShoutHit(this.currentShoutForce, distance, this.currentShoutRadius);
      }
    });
  }

  // Ajouter un NPC comme suiveur
  addFollower(npc) {
    if (this.followers.length >= this.maxFollowers) {
      return false;
    }

    if (!this.followers.includes(npc)) {
      this.followers.push(npc);
      
      // 🎯 GÉNÉRATION IMMÉDIATE de points pour le nouveau follower
      if (this.trailBehavior) {
        const requiredPoints = Math.ceil(this.followers.length / this.trailBehavior.followersPerPoint);
        const currentPoints = this.trailBehavior.followPoints.length;
        
        if (currentPoints < requiredPoints) {
          this.trailBehavior.updateFollowPoints();
          
          const newPointCount = this.trailBehavior.followPoints.length;
          
          // Si toujours pas assez, on force plus de trail
          if (newPointCount < requiredPoints) {
            this.trailBehavior.forceMoreTrailPoints(requiredPoints);
          }
        }
      }
      
      // Mettre à jour la puissance du cri
      this.updateShoutPower();
      return true;
    }
    return false;
  }

  // Retirer un NPC des suiveurs
  removeFollower(npc) {
    const index = this.followers.indexOf(npc);
    if (index !== -1) {
      this.followers.splice(index, 1);
      console.log(`👋 Suiveur parti ! Total: ${this.followers.length}`);
      
      // Mettre à jour la puissance du cri
      this.updateShoutPower();
      return true;
    }
    return false;
  }

  /**
   * Obtenir la position cible pour un follower basée sur le trail
   * @param {Object} follower - Le NPC follower
   * @returns {Object} Position {x, y} - JAMAIS null
   */
  getFollowTargetPosition(follower) {
    if (!this.trailBehavior) {
      console.error(`🚨 Player.getFollowTargetPosition: Pas de trailBehavior ! Création d'urgence...`);
      // Retourner une position d'urgence près du joueur
      return {
        x: this.sprite.x,
        y: this.sprite.y + 60
      };
    }
    
    const followerIndex = this.followers.indexOf(follower);
    
    if (followerIndex === -1) {
      // 🛠️ CORRECTION AUTOMATIQUE : NPC pas dans la liste mais essaie de suivre
      if (follower.state === 'following' && follower.followTarget === this) {
        // L'ajouter automatiquement à la liste
        const added = this.addFollower(follower);
        if (added) {
          // Réessayer avec le nouvel index
          return this.getFollowTargetPosition(follower); // Récursion pour réessayer
        } else {
          // Retourner quand même une position d'urgence
          return {
            x: this.sprite.x - 30,
            y: this.sprite.y + 80
          };
        }
      } else {
        // Retourner quand même une position d'urgence
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
      const requiredPoints = Math.ceil(this.followers.length / this.trailBehavior.followersPerPoint);
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

  // Vérifier les collisions avec les NPCs qui tremblent
  checkTremblingNpcCollisions() {
    const entityManager = this.scene.currentLevel?.entityManager;
    if (!entityManager) return;

    const npcs = entityManager.getNpcs();
    const playerX = this.sprite.x;
    const playerY = this.sprite.y;

    npcs.forEach(npc => {
      if (!npc.sprite || npc.state !== 'trembling') return;

      // MODIFICATION: Utiliser la distance circulaire au lieu de rectangles
      const distance = Phaser.Math.Distance.Between(
        playerX, playerY,
        npc.sprite.x, npc.sprite.y
      );
      
      // Vérifier si le NPC tremblant est dans le rayon de collision
      if (distance <= this.tremblingCollisionRadius) {
        // Le joueur touche un NPC qui tremble -> il devient suiveur
        npc.startFollowing(this);
        this.addFollower(npc);
      }
    });
  }

  createShoutShape() {
    // Choisir une onomatopée aléatoire (1 à 11) différente de la précédente
    let onomatopeNumber;
    do {
      onomatopeNumber = Math.floor(Math.random() * 11) + 1;
    } while (onomatopeNumber === this.lastOnomatopeNumber);
    
    // Mémoriser pour éviter la répétition la prochaine fois
    this.lastOnomatopeNumber = onomatopeNumber;
    
    // 🎯 NOUVEAU: Récupérer l'orientation du joueur
    const playerState = this.animationBehavior.getState();
    const facing = playerState.facing;
    
    // Déterminer si le joueur regarde vers la gauche ou la droite
    const leftDirections = ['left', 'up-left', 'down-left'];
    const isLookingLeft = leftDirections.includes(facing);
    
    // 🎯 NOUVEAU: Taille plus petite de base et variable selon la puissance
    const baseScale = 0.2; // 🎯 RÉDUIT de 0.3 à 0.2
    const forceMultiplier = 0.4; // Facteur de croissance selon la force
    const forceScale = 1.0 + (this.currentShoutForce - 1.0) * forceMultiplier;
    const finalScale = baseScale * forceScale;
    
    // 🎯 NOUVEAU: Ajuster l'offset X selon l'orientation
    const baseOffsetDistance = 35; // Distance de base de la tête
    const offsetX = isLookingLeft ? -baseOffsetDistance : baseOffsetDistance;
    
    // Créer l'onomatopée via le behavior avec orientation
    this.shoutBehavior.createOrientedShoutShape(onomatopeNumber, {
      scale: finalScale,
      offsetX: offsetX,
      flipX: isLookingLeft,
      facing: facing
    });
  }

  // Faire crier ALÉATOIREMENT certains followers avec la même onomatopée 
  makeFollowersShout() {
    if (this.followers.length === 0) return;
    
    // Utiliser la même onomatopée que le joueur (déjà sélectionnée)
    const onomatopeNumber = this.lastOnomatopeNumber;
    
    // Calculer la probabilité de cri basée sur le nombre de followers
    // Plus il y a de followers, moins la probabilité est élevée (évite le spam)
    const baseProbability = 0.6; // 60% de base
    const crowdPenalty = Math.max(0, (this.followers.length - 3) * 0.05); // -5% par follower au-delà de 3
    const finalProbability = Math.max(0.2, baseProbability - crowdPenalty); // Minimum 20%
    
    let followersWhoWillShout = 0;
    
    // Faire crier chaque follower avec probabilité + délai aléatoire
    this.followers.forEach(follower => {
      if (follower && follower.sprite && follower.shoutBehavior) {
        // Test de probabilité
        if (Math.random() < finalProbability) {
          // Délai aléatoire pour plus de naturel (200-400ms)
          const randomDelay = 200 + Math.random() * 200;
          
          // 🎯 NOUVEAU: Utiliser l'image spéciale npc-shout pour les followers
          follower.shoutBehavior.createFollowerShout(randomDelay);
          followersWhoWillShout++;
        }
      }
    });
    
    console.log(`👥 ${followersWhoWillShout}/${this.followers.length} followers crieront (probabilité: ${(finalProbability * 100).toFixed(0)}%) avec npc-shout!`);
  }





  isPositionValid(x, y) {
    if (!this.sprite) return false;
    
    const halfWidth = (this.sprite.width * this.sprite.scaleX) / 2;
    const halfHeight = (this.sprite.height * this.sprite.scaleY) / 2;
    
    // Limites strictes : le joueur ne peut pas dépasser les bords de l'écran
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    return (
      x - halfWidth >= 0 &&
      x + halfWidth <= screenWidth &&
      y - halfHeight >= 0 &&
      y + halfHeight <= screenHeight
    );
  }

  update(delta) {
    // NE PAS appeler super.update(delta) pour éviter le double mouvement !
    // BaseEntity.update() applique automatiquement this.velocity, ce qui crée une accumulation
    
    if (!this.sprite) return;
    
    // Protection contre les deltas énormes au début (évite les téléportations)
    const clampedDelta = Math.min(delta, 33); // Maximum 33ms (30fps minimum)
    
    // Sauvegarder la position précédente
    this.lastPosition.x = this.sprite.x;
    this.lastPosition.y = this.sprite.y;
    
    // UTILISER LA PHYSIQUE PHASER pour le mouvement
    const isMoving = (this.velocity.x !== 0 || this.velocity.y !== 0);
    
    if (isMoving) {
      // Appliquer la vélocité directement à travers la physique Phaser
      if (this.sprite.body) {
        this.sprite.body.setVelocity(
          this.velocity.x * this.speed,
          this.velocity.y * this.speed
        );
      }
    } else {
      // Arrêter le mouvement
      if (this.sprite.body) {
        this.sprite.body.setVelocity(0, 0);
      }
    }
    
    // CORRECTION: Utiliser la velocity physique RÉELLE pour l'animation
    // Pas this.velocity normalisée, mais celle après physique (collisions, drag, etc.)
    const realVelocity = this.sprite.body ? {
      x: this.sprite.body.velocity.x,
      y: this.sprite.body.velocity.y
    } : this.velocity;
    
    // Mettre à jour les onomatopées via le behavior
    this.shoutBehavior.update(delta);
    
    // 🎯 AAA: ACTUAL MOVEMENT DETECTION pour les animations
    this.animationBehavior.update(clampedDelta);
    
    // Mettre à jour le trail via le behavior
    this.trailBehavior.update(clampedDelta);
    
    // Vérifier les collisions avec les NPCs qui tremblent
    this.checkTremblingNpcCollisions();
    
    // 🎯 CORRECTION: Mettre à jour la position des cercles de debug (s'ils existent)
    if (this.isDebugEnabled) {
      this.updateShoutRadiusDebug();
      this.updateTremblingRadiusDebug();
    }
  }



  // Gérer les collisions
  onCollision(other) {
    if (!this.sprite) return;
    
    // Collision avec les murs : revenir à la position précédente
    if (other.entityType === 'wall') {
      this.sprite.x = this.lastPosition.x;
      this.sprite.y = this.lastPosition.y;
    }
  }

  // Méthodes utilitaires
  enableMovement() {
    this.canMove = true;
  }

  disableMovement() {
    this.canMove = false;
  }

  getFacing() {
    return this.facing;
  }

  setWorldBounds(bounds) {
    this.worldBounds = bounds;
  }

  // Nettoyer les onomatopées lors de la destruction
  destroy() {
    // Nettoyer le système de cri
    if (this.shoutBehavior) {
      this.shoutBehavior.destroy();
    }
    
    // Nettoyer le système de trail
    if (this.trailBehavior) {
      this.trailBehavior.destroy();
    }
    
    // Nettoyer les éléments de debug
    this.destroyShoutRadiusDebug();
    this.destroyTremblingRadiusDebug(); // 🎯 NOUVEAU: Nettoyer aussi le debug du rayon tremblant
    
    // Se retirer du système de tri par profondeur
    if (this.scene.depthSortingSystem) {
      this.scene.depthSortingSystem.removeEntity(this);
    }
    
    super.destroy();
  }
} 