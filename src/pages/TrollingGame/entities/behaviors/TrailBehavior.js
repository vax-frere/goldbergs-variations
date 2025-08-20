/**
 * Système réutilisable pour gérer le trail (traînée) derrière une entité
 * Peut être utilisé par le Player et potentiellement d'autres entités
 * Respecte les principes SOLID et l'architecture du jeu
 */
export class TrailBehavior {
  constructor(owner, config = {}) {
    this.owner = owner; // L'entité qui possède ce comportement
    this.scene = owner.scene;
    
    // Configuration par défaut, peut être surchargée
    this.config = {
      maxPoints: config.maxPoints || 50, // Nombre maximum de points dans le trail
      minDistanceToAdd: config.minDistanceToAdd || 5, // Distance minimum pour ajouter un nouveau point
      lineWidth: config.lineWidth || 2, // Épaisseur de la ligne
      lineColor: config.lineColor || 0x00ff00, // Couleur de la ligne (vert par défaut)
      alpha: config.alpha || 0.7, // Transparence de la ligne
      fadeEnabled: config.fadeEnabled !== false, // Active le fade progressif
      debugOnly: config.debugOnly !== false, // Visible seulement en mode debug
      updateThreshold: config.updateThreshold || 1.0, // Seuil de mouvement pour mise à jour
      ...config
    };
    
    // État interne du trail
    this.trailPoints = []; // Points {x, y, timestamp} du trail
    this.graphics = null; // Object Phaser Graphics pour dessiner la ligne
    this.lastPosition = { x: 0, y: 0 }; // Dernière position enregistrée
    this.isVisible = false; // État de visibilité actuel
    
    // Système de points de suivi pour les followers
    this.followPoints = []; // Points de suivi calculés {x, y, index, occupied}
    this.followersPerPoint = config.followersPerPoint || 3; // Nombre de followers par point
    this.followPointDistance = config.followPointDistance || 40; // Distance entre les points de suivi
    this.followPointsGraphics = null; // Graphics pour dessiner les points de suivi en debug
    
    // Initialiser le système
    this.init();
  }

  /**
   * Initialiser le système de trail
   */
  init() {
    // Créer l'objet graphique pour dessiner la ligne
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(1000); // Au-dessus des autres éléments
    this.graphics.name = 'trail-debug'; // 🎯 AJOUT: Nom pour le nettoyage global
    
    // Créer l'objet graphique pour dessiner les points de suivi
    this.followPointsGraphics = this.scene.add.graphics();
    this.followPointsGraphics.setDepth(1001); // Au-dessus du trail
    this.followPointsGraphics.name = 'trail-points-debug'; // 🎯 AJOUT: Nom pour le nettoyage global
    
    // Position initiale
    if (this.owner.sprite) {
      this.lastPosition.x = this.owner.sprite.x;
      this.lastPosition.y = this.owner.sprite.y;
    }
    
    // Visibilité initielle selon le mode debug
    this.updateVisibility();
  }

  /**
   * Mettre à jour le trail
   * @param {number} delta - Temps écoulé depuis la dernière frame
   */
  update(delta) {
    if (!this.owner.sprite || !this.graphics) return;
    
    const currentPosition = {
      x: this.owner.sprite.x,
      y: this.owner.sprite.y
    };
    
    // Vérifier si l'entité a bougé suffisamment
    const distanceMoved = this.calculateDistance(this.lastPosition, currentPosition);
    
    if (distanceMoved >= this.config.updateThreshold) {
      // Ajouter un nouveau point si la distance est suffisante
      if (distanceMoved >= this.config.minDistanceToAdd) {
        this.addTrailPoint(currentPosition.x, currentPosition.y);
      }
      
      // Mettre à jour la position précédente
      this.lastPosition.x = currentPosition.x;
      this.lastPosition.y = currentPosition.y;
    }
    
    // Nettoyer les anciens points
    this.cleanupOldPoints();
    
    // Mettre à jour les points de suivi pour les followers
    this.updateFollowPoints();
    
    // Mettre à jour la visibilité
    this.updateVisibility();
    
    // Redessiner la ligne et les points de suivi
    this.redrawTrail();
    this.redrawFollowPoints();
  }

  /**
   * Ajouter un nouveau point au trail
   * @param {number} x - Coordonnée X
   * @param {number} y - Coordonnée Y
   */
  addTrailPoint(x, y) {
    const point = {
      x: x,
      y: y,
      timestamp: Date.now()
    };
    
    this.trailPoints.push(point);
    
    // Log temporaire pour debug
    if (this.trailPoints.length <= 5) {
      console.log(`📍 Point ajouté: (${x.toFixed(1)}, ${y.toFixed(1)}) - Total: ${this.trailPoints.length}`);
    }
    
    // Limiter le nombre de points
    if (this.trailPoints.length > this.config.maxPoints) {
      this.trailPoints.shift(); // Retirer le plus ancien
    }
  }

  /**
   * Nettoyer les points trop anciens (optionnel)
   */
  cleanupOldPoints() {
    // Pour l'instant, on se base seulement sur maxPoints
    // Mais on pourrait ajouter un système de temps ici si nécessaire
    while (this.trailPoints.length > this.config.maxPoints) {
      this.trailPoints.shift();
    }
  }

  /**
   * Redessiner le trail
   */
  redrawTrail() {
    // Ne pas dessiner si invisible
    
    if (!this.graphics || !this.isVisible || this.trailPoints.length < 2) {
      if (this.graphics) {
        this.graphics.clear();
        // 🎯 CORRECTION: Seulement forcer setVisible(false) si vraiment invisible
        if (!this.isVisible) {
          this.graphics.setVisible(false);
          // console.log(`🧹 Graphics cleared et setVisible(false) forcé car invisible`);
        } else {
          console.log(`🧹 Graphics cleared mais pas assez de points (${this.trailPoints.length})`);
        }
      }
      return;
    }
    
    // Log temporaire pour debug
    if (this.trailPoints.length === 2) {
      console.log(`🎨 Premier dessin du trail: ${this.trailPoints.length} points, visible: ${this.isVisible}`);
    }
    
    this.graphics.clear();
    // 🎯 COULEUR UNIFORME: Appliquer le style une seule fois pour tout le trail
    this.graphics.lineStyle(this.config.lineWidth, this.config.lineColor, this.config.alpha);
    
    // Dessiner la ligne en reliant tous les points avec une couleur uniforme
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const point1 = this.trailPoints[i];
      const point2 = this.trailPoints[i + 1];
      
      // Dessiner le segment sans changer le style
      this.graphics.beginPath();
      this.graphics.moveTo(point1.x, point1.y);
      this.graphics.lineTo(point2.x, point2.y);
      this.graphics.strokePath();
    }
  }

  /**
   * Mettre à jour la visibilité selon le mode debug
   */
  updateVisibility() {
    const debugMode = this.isDebugMode();
    const shouldBeVisible = this.config.debugOnly ? debugMode : true;
    
    // Mise à jour de la visibilité selon le mode debug
    
    if (shouldBeVisible !== this.isVisible) {
      this.isVisible = shouldBeVisible;
      console.log(`🔄 Trail CHANGEMENT: Visible=${this.isVisible}, Points=${this.trailPoints.length}`);
      
      if (this.graphics) {
        if (this.isVisible) {
          // 🎯 FIX PHASER: Forcer une régénération complète quand on réactive
          this.graphics.destroy();
          this.graphics = this.scene.add.graphics();
          this.graphics.setDepth(1000);
          this.graphics.name = 'trail-debug';
          this.graphics.setVisible(true);
        } else {
          this.graphics.setVisible(false);
        }
      } else {
        console.warn('⚠️ Pas de graphics pour trail');
      }
      
      if (this.followPointsGraphics) {
        if (this.isVisible) {
          // 🎯 FIX PHASER: Régénérer aussi les followPointsGraphics
          this.followPointsGraphics.destroy();
          this.followPointsGraphics = this.scene.add.graphics();
          this.followPointsGraphics.setDepth(1001);
          this.followPointsGraphics.name = 'trail-points-debug';
          this.followPointsGraphics.setVisible(true);
        } else {
          this.followPointsGraphics.setVisible(false);
        }
      } else {
        console.warn('⚠️ Pas de followPointsGraphics pour trail');
      }
    }
  }

  /**
   * Vérifier si le mode debug est activé
   */
  isDebugMode() {
    // 🎯 DIAGNOSTIC: Logs détaillés pour debug le toggle
    const hasGame = !!window.game;
    const debugPhysics = window.game?.debugPhysics || false;
    const debugShout = window.game?.debugShoutRadius || false;
    const result = hasGame && (debugPhysics || debugShout);
    
    // Log seulement lors des changements d'état pour éviter le spam
    if (this._lastDebugState !== result) {
      console.log(`🔍 TrailBehavior.isDebugMode(): hasGame=${hasGame}, debugPhysics=${debugPhysics}, debugShout=${debugShout} → ${result}`);
      this._lastDebugState = result;
    }
    
    return result;
  }

  /**
   * Mettre à jour les points de suivi pour les followers
   */
  updateFollowPoints() {
    if (this.trailPoints.length < 2) {
      this.followPoints = [];
      return;
    }

    // 🎯 CALCUL DYNAMIQUE: Déterminer combien de points on a besoin
    const currentFollowers = this.owner.followers ? this.owner.followers.length : 0;
    const minPointsNeeded = Math.ceil(currentFollowers / this.followersPerPoint);
    const maxPointsToGenerate = Math.max(minPointsNeeded + 2, 15); // Au moins 2 points d'avance, max 15 points

    const newFollowPoints = [];
    let currentDistance = 0;
    let pointIndex = 0;

    // Parcourir le trail à rebours (du plus récent au plus ancien)
    for (let i = this.trailPoints.length - 1; i > 0; i--) {
      const point1 = this.trailPoints[i];
      const point2 = this.trailPoints[i - 1];
      
      const segmentDistance = this.calculateDistance(point1, point2);
      
      // Vérifier si on doit placer un point de suivi sur ce segment
      while (currentDistance + segmentDistance >= this.followPointDistance * (pointIndex + 1)) {
        const targetDistance = this.followPointDistance * (pointIndex + 1);
        const remainingDistance = targetDistance - currentDistance;
        const ratio = remainingDistance / segmentDistance;
        
        // Interpoler la position sur le segment
        const followPoint = {
          x: point1.x + (point2.x - point1.x) * ratio,
          y: point1.y + (point2.y - point1.y) * ratio,
          index: pointIndex,
          assignedFollowers: []
        };
        
        newFollowPoints.push(followPoint);
        pointIndex++;
        
        // Stopper seulement si on a atteint le maximum ET qu'on a assez pour tous les followers
        if (pointIndex >= maxPointsToGenerate && pointIndex >= minPointsNeeded) {
          break;
        }
      }
      
      currentDistance += segmentDistance;
      if (pointIndex >= maxPointsToGenerate && pointIndex >= minPointsNeeded) break;
    }

    this.followPoints = newFollowPoints;
    
    // 🔍 VÉRIFICATION FINALE
    const pointsGenerated = this.followPoints.length;
    const maxFollowersSupported = pointsGenerated * this.followersPerPoint;
    
    if (currentFollowers > maxFollowersSupported) {
      console.warn(`⚠️ ATTENTION: ${currentFollowers} followers mais seulement ${maxFollowersSupported} places disponibles!`);
    }
  }

  /**
   * Redessiner les points de suivi en mode debug
   */
  redrawFollowPoints() {
    if (!this.followPointsGraphics || !this.isVisible || this.followPoints.length === 0) {
      if (this.followPointsGraphics) {
        this.followPointsGraphics.clear();
      }
      return;
    }

    this.followPointsGraphics.clear();

    this.followPoints.forEach((point, index) => {
      // 🎯 COULEUR UNIFORME: Même vert pour tous les cercles
      const color = 0x00FF88; // Vert menthe comme le trail

      // 🎯 CERCLES un peu plus grands (6px)
      this.followPointsGraphics.fillStyle(color, 0.6);
      this.followPointsGraphics.fillCircle(point.x, point.y, 6);
      
      // Contour
      this.followPointsGraphics.lineStyle(1, color, 0.8);
      this.followPointsGraphics.strokeCircle(point.x, point.y, 6);
    });
  }

  /**
   * Obtenir le point de suivi pour un follower spécifique
   * @param {number} followerIndex - Index du follower (0-based)
   * @returns {Object|null} Point de suivi {x, y} ou null
   */
  getFollowPointForFollower(followerIndex) {
    const pointIndex = Math.floor(followerIndex / this.followersPerPoint);
    const positionInGroup = followerIndex % this.followersPerPoint;
    
    if (pointIndex >= this.followPoints.length) {
      // 🛠️ TENTATIVE DE RÉGÉNÉRATION si pas assez de points
      this.updateFollowPoints();
      
      // Vérifier à nouveau après régénération
      if (pointIndex >= this.followPoints.length) {
        // Toujours pas assez, utiliser la stratégie de redistribution
        if (this.followPoints.length > 0) {
          // Répartir équitablement sur les points existants
          const redistributedPointIndex = followerIndex % this.followPoints.length;
          const redistributedPositionInGroup = Math.floor(followerIndex / this.followPoints.length);
          
          const followPoint = this.followPoints[redistributedPointIndex];
          
          // Offset plus grand pour éviter la superposition des followers redistribués
          const offsetAngle = (redistributedPositionInGroup * 2 * Math.PI) / 8; // 8 positions autour du point
          const offsetDistance = 20 + (redistributedPositionInGroup * 5); // Distance croissante
          
          const finalPoint = {
            x: followPoint.x + Math.cos(offsetAngle) * offsetDistance,
            y: followPoint.y + Math.sin(offsetAngle) * offsetDistance
          };
          
          return finalPoint;
        }
        
        return null;
      }
    }
    
    const followPoint = this.followPoints[pointIndex];
    
    // Ajouter un petit offset pour éviter que tous les followers du même point se superposent
    const offsetAngle = (positionInGroup / this.followersPerPoint) * Math.PI * 2;
    const offsetDistance = 15; // 15px de rayon pour la dispersion
    
    const finalPoint = {
      x: followPoint.x + Math.cos(offsetAngle) * offsetDistance,
      y: followPoint.y + Math.sin(offsetAngle) * offsetDistance
    };
    
    return finalPoint;
  }

  /**
   * Calculer la distance entre deux points
   */
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Obtenir une copie des points du trail pour usage externe
   * Respecte le principe SOLID - Open/Closed
   */
  getTrailPoints() {
    return [...this.trailPoints]; // Copie pour éviter la mutation externe
  }

  /**
   * Obtenir le dernier point du trail
   */
  getLastPoint() {
    return this.trailPoints.length > 0 ? 
      { ...this.trailPoints[this.trailPoints.length - 1] } : null;
  }

  /**
   * Obtenir la longueur totale du trail
   */
  getTrailLength() {
    if (this.trailPoints.length < 2) return 0;
    
    let totalLength = 0;
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      totalLength += this.calculateDistance(this.trailPoints[i], this.trailPoints[i + 1]);
    }
    
    return totalLength;
  }

  /**
   * Effacer le trail actuel
   */
  clearTrail() {
    this.trailPoints = [];
    if (this.graphics) {
      this.graphics.clear();
    }
  }

  /**
   * Forcer la visibilité (outrepasser le mode debug)
   */
  setForceVisible(visible) {
    this.isVisible = visible;
    if (this.graphics) {
      this.graphics.setVisible(visible);
    }
  }

  /**
   * Nettoyer le système de trail
   */
  destroy() {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    if (this.followPointsGraphics) {
      this.followPointsGraphics.destroy();
      this.followPointsGraphics = null;
    }
    
    this.trailPoints = [];
    this.followPoints = [];
    this.owner = null;
    this.scene = null;
  }

  /**
   * Vérifier si le trail est actif
   */
  isActive() {
    return this.trailPoints.length > 0;
  }

  /**
   * Obtenir des statistiques sur le trail
   */
  getStats() {
    return {
      pointCount: this.trailPoints.length,
      totalLength: this.getTrailLength(),
      isVisible: this.isVisible,
      lastUpdate: this.trailPoints.length > 0 ? 
        this.trailPoints[this.trailPoints.length - 1].timestamp : null
    };
  }

  /**
   * Forcer la création de points de suivi supplémentaires si pas assez de trail naturel
   * @param {number} minPointsRequired - Nombre minimum de points requis
   */
  forceMoreTrailPoints(minPointsRequired) {
    const currentPoints = this.followPoints.length;
    const pointsToAdd = minPointsRequired - currentPoints;
    
    if (pointsToAdd <= 0) {
      return;
    }
    
    // Si on a au moins un point de trail existant, en créer d'autres derrière
    if (this.trailPoints.length > 0) {
      const lastTrailPoint = this.trailPoints[this.trailPoints.length - 1];
      let baseX = lastTrailPoint.x;
      let baseY = lastTrailPoint.y;
      
      // Calculer une direction "vers l'arrière" basée sur les derniers points du trail
      let directionX = 0;
      let directionY = 1; // Par défaut vers le bas
      
      if (this.trailPoints.length >= 2) {
        const prevPoint = this.trailPoints[this.trailPoints.length - 2];
        directionX = lastTrailPoint.x - prevPoint.x;
        directionY = lastTrailPoint.y - prevPoint.y;
        
        // Normaliser la direction
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
          directionX /= length;
          directionY /= length;
        }
      }
      
      // Créer les points manquants le long de cette direction
      for (let i = 0; i < pointsToAdd; i++) {
        const pointIndex = currentPoints + i;
        const distance = this.followPointDistance * (pointIndex + 1);
        
        const artificialPoint = {
          x: baseX + directionX * distance,
          y: baseY + directionY * distance,
          index: pointIndex,
          assignedFollowers: [],
          artificial: true // Marquer comme artificiel pour debug
        };
        
        this.followPoints.push(artificialPoint);
      }
    } else {
      // Pas de trail du tout, créer des points autour du joueur
      const playerX = this.owner.sprite?.x || 400;
      const playerY = this.owner.sprite?.y || 300;
      
      for (let i = 0; i < pointsToAdd; i++) {
        const pointIndex = currentPoints + i;
        const angle = (i / pointsToAdd) * Math.PI * 2; // Répartir en cercle
        const distance = this.followPointDistance + (i * 20); // Distance croissante
        
        const artificialPoint = {
          x: playerX + Math.cos(angle) * distance,
          y: playerY + Math.sin(angle) * distance,
          index: pointIndex,
          assignedFollowers: [],
          artificial: true
        };
        
        this.followPoints.push(artificialPoint);
      }
    }
  }
} 