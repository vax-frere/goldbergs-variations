import { SmartTrailAssignment } from './SmartTrailAssignment';

/**
 * Système réutilisable pour gérer le trail avec contraintes physiques
 * Chaque point est lié au précédent par une distance fixe (système de chaîne organique)
 * Peut être utilisé par le Player et potentiellement d'autres entités
 * Respecte les principes SOLID et l'architecture du jeu
 * 
 * 🎯 AAA UPDATE: Intègre désormais SmartTrailAssignment pour une répartition optimale
 */
export class TrailBehavior {
  owner: any;
  scene: any;
  config: Record<string, any>;
  trailPoints: any[];
  graphics: any;
  isVisible: boolean;
  isInitialized: boolean;
  followPoints: any[];
  followersPerPoint: number;
  followPointDistance: number;
  followPointsGraphics: any;
  useSmartAssignment: boolean;
  smartAssignment: SmartTrailAssignment | null;

  constructor(owner: any, config: Record<string, any> = {}) {
    this.owner = owner; // L'entité qui possède ce comportement
    this.scene = owner.scene;
    
    // Configuration par défaut, peut être surchargée
    this.config = {
      // 🎯 SYSTÈME DE CONTRAINTES PHYSIQUES
      chainLength: config.chainLength || 15, // Nombre fixe de points dans la chaîne (plus court = plus réactif)
      linkDistance: config.linkDistance || 30, // Distance fixe entre chaque point (plus grand = plus fluide)
      constraintStrength: config.constraintStrength || 0.85, // Force des contraintes (0-1, plus élevé = plus rigide)
      damping: config.damping || 0.92, // Amortissement des mouvements (plus bas = plus d'inertie)
      
      // Configuration visuelle (conservée)
      lineWidth: config.lineWidth || 2, // Épaisseur de la ligne
      lineColor: config.lineColor || 0x00ff00, // Couleur de la ligne (vert par défaut)
      alpha: config.alpha || 0.7, // Transparence de la ligne
      debugOnly: config.debugOnly !== false, // Visible seulement en mode debug
      
      // Paramètres legacy conservés pour compatibilité
      maxPoints: config.chainLength || 15, // Alias pour chainLength
      updateThreshold: config.updateThreshold || 1.0, // Seuil de mouvement pour mise à jour
      ...config
    };
    
    // 🎯 SYSTÈME UNIFIÉ - Les trailPoints sont maintenant des contraintes physiques
    this.trailPoints = []; // Points avec contraintes physiques {x, y, prevX, prevY, index, velocity}
    this.graphics = null; // Object Phaser Graphics pour dessiner la ligne
    this.isVisible = false; // État de visibilité actuel
    this.isInitialized = false; // Flag pour l'initialisation de la chaîne
    
    // Système de points de suivi pour les followers
    this.followPoints = []; // Points de suivi calculés {x, y, index, occupied}
    this.followersPerPoint = config.followersPerPoint || 3; // Nombre de followers par point
    this.followPointDistance = config.followPointDistance || 40; // Distance entre les points de suivi
    this.followPointsGraphics = null; // Graphics pour dessiner les points de suivi en debug
    
    // 🎯 AAA SMART ASSIGNMENT SYSTEM
    this.useSmartAssignment = config.useSmartAssignment !== false; // Activé par défaut
    this.smartAssignment = null;
    
    // Initialiser le système
    this.init();
  }

  /**
   * 🎯 COMPATIBILITÉ LEGACY: Alias pour chainPoints
   * Permet l'accès à trailPoints via l'ancien nom
   */
  get chainPoints() {
    return this.trailPoints;
  }

  set chainPoints(value) {
    this.trailPoints = value;
  }

  /**
   * Initialiser le système de trail avec contraintes
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
    
    // 🎯 AAA: Initialiser le système d'assignment intelligent
    if (this.useSmartAssignment) {
      this.smartAssignment = new SmartTrailAssignment(this, {
        // Capacité par point = nombre de voies (remplit une rangée par point)
        maxFollowersPerPoint: 4,
        reassignmentCooldown: 800, // Plus réactif
        stabilityThreshold: 25, // Seuil d'amélioration
        debugAssignment: false, // Pas de debug par défaut pour éviter le spam
        // 🎯 Formation bus par défaut (peut être tunée via config du Player)
        // laneCount: nombre de voies latérales autour de l'axe du trail (épaisseur de la file)
        laneCount: 4,
        // laneSpacing: écart (en px) entre deux voies adjacentes (plus petit = file plus serrée)
        laneSpacing: 6,
        // staggerRatio: proportion de followPointDistance utilisée comme décalage longitudinal entre colonnes
        // ex: 0.4 avec followPointDistance=80px → 32px de décalage par colonne vers l'arrière
        staggerRatio: 0.4,
        // jitterPx: micro-jitter aléatoire (en px) appliqué pour casser l'alignement parfait
        jitterPx: 6,
        // Bonus pour favoriser le remplissage des points proches du joueur
        frontFillBias: 120
      });
      console.log(`🧠 SmartTrailAssignment activé pour ${this.owner.constructor.name} (${this.followersPerPoint} par point)`);
    }
    
    // 🎯 NOUVEAU: Initialiser la chaîne de contraintes
    this.initializeChain();
    
    // Visibilité initielle selon le mode debug
    this.updateVisibility();
  }

  /**
   * 🎯 CLEAN: Initialiser la chaîne de points avec contraintes (adaptation tutoriel)
   */
  initializeChain() {
    if (!this.owner.sprite) return;
    
    const startX = this.owner.sprite.x;
    const startY = this.owner.sprite.y;
    
    this.trailPoints = [];
    
    // 🎯 ADAPTATION TUTORIEL: Direction intelligente basée sur la position du joueur
    let directionX = -1; // Par défaut vers la gauche (classique)
    let directionY = 0;
    
    // Si le joueur est très à gauche (intro sequence), la chaîne doit partir vers la gauche aussi
    // pour qu'elle puisse suivre naturellement quand il se déplace vers la droite
    if (startX < 100) {
      // Joueur en intro - chaîne vers la gauche (direction normale)
      directionX = -1;
      directionY = 0;
      console.log(`🎯 Chaîne configurée pour intro: joueur en X=${startX}, chaîne vers la gauche`);
    } else {
      // Joueur normal - détecter la direction du mouvement récent si possible
      directionX = -1; // Par défaut vers la gauche
      directionY = 0;
    }
    
    // Créer la chaîne initiale dans la direction calculée
    for (let i = 0; i < this.config.chainLength; i++) {
      const distance = (i + 1) * this.config.linkDistance;
      const point = {
        x: startX + directionX * distance,
        y: startY + directionY * distance,
        prevX: startX + directionX * distance,
        prevY: startY + directionY * distance,
        index: i,
        velocity: { x: 0, y: 0 }, // Vélocité pour l'inertie
        timestamp: Date.now() // 🎯 COMPATIBILITÉ: Pour l'API legacy
      };
      
      this.trailPoints.push(point);
    }
    
    this.isInitialized = true;
    console.log(`🔗 Chaîne initialisée: ${this.config.chainLength} points, distance: ${this.config.linkDistance}px, direction: [${directionX}, ${directionY}]`);
  }

  /**
   * 🎯 NOUVEAU: Mettre à jour le trail avec contraintes physiques
   * @param {number} delta - Temps écoulé depuis la dernière frame
   */
  update(delta: number): void {
    if (!this.owner.sprite || !this.graphics) return;
    
    // Initialiser la chaîne si ce n'est pas encore fait
    if (!this.isInitialized) {
      this.initializeChain();
    }
    
    // 🎯 RÉINITIALISATION INTELLIGENTE: Si la chaîne devient trop désorganisée
    this.checkAndReinitializeIfNeeded();
    
    // Appliquer les contraintes de distance pour maintenir la chaîne
    this.updateConstraints(delta);
    
    // Mettre à jour les points de suivi pour les followers
    this.updateFollowPoints();
    
    // Mettre à jour la visibilité
    this.updateVisibility();
    
    // Redessiner la ligne et les points de suivi
    this.redrawTrail();
    this.redrawFollowPoints();
  }

  /**
   * 🎯 NOUVEAU: Vérifier si la chaîne a besoin d'être réinitialisée
   */
  checkAndReinitializeIfNeeded() {
    if (this.trailPoints.length === 0) return;
    
    const playerPosition = { x: this.owner.sprite.x, y: this.owner.sprite.y };
    const firstPoint = this.trailPoints[0];
    
    // Distance entre le joueur et le premier point de la chaîne
    const distanceToFirstPoint = this.calculateDistance(playerPosition, firstPoint);
    
    // Si le premier point est trop loin du joueur (chaîne cassée), réinitialiser
    if (distanceToFirstPoint > this.config.linkDistance * 3) {
      console.log(`🔄 Réinitialisation de la chaîne: premier point trop loin (${distanceToFirstPoint.toFixed(1)}px > ${this.config.linkDistance * 3}px)`);
      this.initializeChain();
      return;
    }
    
    // Vérifier la cohérence générale de la chaîne
    let brokenLinks = 0;
    for (let i = 1; i < this.trailPoints.length; i++) {
      const distance = this.calculateDistance(this.trailPoints[i - 1], this.trailPoints[i]);
      if (Math.abs(distance - this.config.linkDistance) > this.config.linkDistance * 0.5) {
        brokenLinks++;
      }
    }
    
    // Si plus de la moitié des liens sont cassés, réinitialiser
    if (brokenLinks > this.trailPoints.length / 2) {
      console.log(`🔄 Réinitialisation de la chaîne: trop de liens cassés (${brokenLinks}/${this.trailPoints.length})`);
      this.initializeChain();
    }
  }

  /**
   * 🎯 CLEAN: Appliquer les contraintes de distance pour chaque point de la chaîne
   * @param {number} delta - Temps écoulé depuis la dernière frame
   */
  updateConstraints(delta) {
    if (this.trailPoints.length === 0) return;
    
    const playerPosition = {
      x: this.owner.sprite.x,
      y: this.owner.sprite.y
    };
    
    // 🎯 ADAPTATION INTRO: Détecter mouvement rapide du joueur pour contraintes plus fortes
    const playerSpeed = this.owner.movementController ? 
      Math.sqrt(Math.pow(this.owner.movementController.velocity.x || 0, 2) + 
               Math.pow(this.owner.movementController.velocity.y || 0, 2)) : 0;
    
    const isMovingFast = playerSpeed > 100; // Seuil pour mouvement rapide (intro)
    const adaptiveStrength = isMovingFast ? 
      Math.min(this.config.constraintStrength * 1.5, 0.95) : // Plus fort pendant mouvement rapide
      this.config.constraintStrength; // Normal sinon
    
    // Appliquer les contraintes pour chaque point de la chaîne
    for (let i = 0; i < this.trailPoints.length; i++) {
      const currentPoint = this.trailPoints[i];
      
      // Déterminer le point de référence (joueur pour le premier point, point précédent pour les autres)
      const referencePoint = i === 0 ? playerPosition : this.trailPoints[i - 1];
      
      // Calculer la distance actuelle
      const currentDistance = this.calculateDistance(currentPoint, referencePoint);
      
      // Tolérance adaptative : plus stricte pendant mouvement rapide
      const tolerance = isMovingFast ? 0.5 : 0.1;
      
      // Si la distance n'est pas exacte, projeter le point sur la circonférence
      if (Math.abs(currentDistance - this.config.linkDistance) > tolerance) {
        // Calculer la direction du point de référence vers le point actuel
        let directionX = currentPoint.x - referencePoint.x;
        let directionY = currentPoint.y - referencePoint.y;
        
        // Normaliser la direction
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
          directionX /= length;
          directionY /= length;
        } else {
          // Si les points sont superposés, utiliser la direction opposée au mouvement du joueur
          if (this.owner.movementController) {
            const velX = this.owner.movementController.velocity.x || 0;
            const velY = this.owner.movementController.velocity.y || 0;
            const velLength = Math.sqrt(velX * velX + velY * velY);
            
            if (velLength > 0) {
              directionX = -velX / velLength; // Direction opposée au mouvement
              directionY = -velY / velLength;
            } else {
              directionX = -1; // Vers la gauche par défaut
              directionY = 0;
            }
          } else {
            directionX = -1; // Vers la gauche par défaut
            directionY = 0;
          }
        }
        
        // 🎯 CONTRAINTE RIGIDE: Projeter sur la circonférence à distance exacte
        const targetX = referencePoint.x + directionX * this.config.linkDistance;
        const targetY = referencePoint.y + directionY * this.config.linkDistance;
        
        // Appliquer avec amortissement adaptatif
        currentPoint.x += (targetX - currentPoint.x) * adaptiveStrength;
        currentPoint.y += (targetY - currentPoint.y) * adaptiveStrength;
        
        // Appliquer l'amortissement pour un mouvement fluide et naturel
        const velocityX = currentPoint.x - currentPoint.prevX;
        const velocityY = currentPoint.y - currentPoint.prevY;
        
        currentPoint.velocity.x = currentPoint.velocity.x * this.config.damping + velocityX * (1 - this.config.damping);
        currentPoint.velocity.y = currentPoint.velocity.y * this.config.damping + velocityY * (1 - this.config.damping);
        
        // Sauvegarder la position précédente pour l'inertie
        currentPoint.prevX = currentPoint.x;
        currentPoint.prevY = currentPoint.y;
      }
    }
  }

  /**
   * 🎯 COMPATIBILITÉ LEGACY: addTrailPoint (stub - système de contraintes)
   * Dans le nouveau système, les points sont gérés automatiquement par les contraintes
   */
  addTrailPoint(x, y) {
    // Cette méthode ne fait rien dans le nouveau système de contraintes
    // Les points sont automatiquement positionnés par updateConstraints()
    console.log(`📍 addTrailPoint() appelé mais ignoré (système de contraintes actif)`);
  }

  /**
   * 🎯 COMPATIBILITÉ LEGACY: cleanupOldPoints (stub - système de contraintes)
   * Dans le nouveau système, la chaîne a une longueur fixe
   */
  cleanupOldPoints() {
    // Cette méthode ne fait rien dans le nouveau système de contraintes
    // La longueur de la chaîne est fixe
  }

  /**
   * 🎯 CLEAN: Redessiner le trail avec la chaîne de contraintes
   */
  redrawTrail() {
    if (!this.graphics || !this.isVisible || this.trailPoints.length < 1) {
      if (this.graphics) {
        this.graphics.clear();
        if (!this.isVisible) {
          this.graphics.setVisible(false);
        }
      }
      return;
    }
    
    this.graphics.clear();
    // 🎯 STYLE UNIFORME: Appliquer le style une seule fois pour toute la chaîne
    this.graphics.lineStyle(this.config.lineWidth, this.config.lineColor, this.config.alpha);
    
    // Dessiner la chaîne depuis le joueur jusqu'au dernier point
    const playerPosition = {
      x: this.owner.sprite.x,
      y: this.owner.sprite.y
    };
    
    // Première liaison : Joueur → Premier point de la chaîne
    if (this.trailPoints.length > 0) {
      this.graphics.beginPath();
      this.graphics.moveTo(playerPosition.x, playerPosition.y);
      this.graphics.lineTo(this.trailPoints[0].x, this.trailPoints[0].y);
      this.graphics.strokePath();
    }
    
    // Liaisons suivantes : Point i → Point i+1
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      const point1 = this.trailPoints[i];
      const point2 = this.trailPoints[i + 1];
      
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
  isDebugMode(): boolean {
    // 🎯 DIAGNOSTIC: Logs détaillés pour debug le toggle
    const hasGame = !!(window as any).game;
    const debugPhysics = (window as any).game?.debugPhysics || false;
    const debugShout = (window as any).game?.debugShoutRadius || false;
    const result = hasGame && (debugPhysics || debugShout);
    
    // Log seulement lors des changements d'état pour éviter le spam
    if (this._lastDebugState !== result) {
      console.log(`🔍 TrailBehavior.isDebugMode(): hasGame=${hasGame}, debugPhysics=${debugPhysics}, debugShout=${debugShout} → ${result}`);
      this._lastDebugState = result;
    }
    
    return result;
  }

  /**
   * 🎯 CLEAN: Mettre à jour les points de suivi pour les followers (basé sur la chaîne)
   */
  updateFollowPoints() {
    if (this.trailPoints.length < 1) {
      this.followPoints = [];
      return;
    }

    // 🎯 CALCUL DYNAMIQUE: Déterminer combien de points on a besoin
    const currentFollowers = this.owner.followers ? this.owner.followers.length : 0;
    // Utiliser la capacité effective par point (SmartAssignment si dispo), sinon fallback sur followersPerPoint
    const effectiveFollowersPerPoint = (this.smartAssignment && this.smartAssignment.config && this.smartAssignment.config.maxFollowersPerPoint)
      ? this.smartAssignment.config.maxFollowersPerPoint
      : this.followersPerPoint;
    const minPointsNeeded = Math.ceil(Math.max(1, currentFollowers) / Math.max(1, effectiveFollowersPerPoint));
    const maxPointsToGenerate = Math.max(minPointsNeeded + 2, 6);

    const newFollowPoints = [];
    let currentDistance = 0;
    let pointIndex = 0;

    // 🎯 UTILISER LA CHAÎNE: Parcourir les points de la chaîne pour créer les points de suivi
    const playerPosition = { x: this.owner.sprite.x, y: this.owner.sprite.y };
    const allTrailPoints = [playerPosition, ...this.trailPoints]; // Inclure le joueur comme premier point
    
    // Parcourir la chaîne du joueur vers la fin
    for (let i = 0; i < allTrailPoints.length - 1; i++) {
      const point1 = allTrailPoints[i];
      const point2 = allTrailPoints[i + 1];
      
      const segmentDistance = this.calculateDistance(point1, point2);
      
      // Vérifier si on doit placer un point de suivi sur ce segment
      while (currentDistance + segmentDistance >= this.followPointDistance * (pointIndex + 1)) {
        const targetDistance = this.followPointDistance * (pointIndex + 1);
        const remainingDistance = targetDistance - currentDistance;
        const ratio = remainingDistance / segmentDistance;
        
        // Interpoler la position sur le segment
        // Calculer la tangente (direction du segment) et la normale (perpendiculaire)
        let tx = point2.x - point1.x;
        let ty = point2.y - point1.y;
        const mag = Math.sqrt(tx * tx + ty * ty) || 1;
        tx /= mag;
        ty /= mag;
        // Normale à gauche
        const nx = -ty;
        const ny = tx;

        const followPoint = {
          x: point1.x + (point2.x - point1.x) * ratio,
          y: point1.y + (point2.y - point1.y) * ratio,
          index: pointIndex,
          assignedFollowers: [],
          // 🎯 NOUVEAU: vecteurs de direction pour formations multi-voies
          tangent: { x: tx, y: ty },
          normal: { x: nx, y: ny }
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
    const maxFollowersSupported = pointsGenerated * effectiveFollowersPerPoint;
    
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
   * 🎯 AAA: Obtenir le point de suivi pour un follower spécifique
   * Utilise le nouveau SmartTrailAssignment si activé, sinon utilise l'ancien système
   * @param {number} followerIndex - Index du follower (0-based) 
   * @returns {Object|null} Point de suivi {x, y} ou null
   */
  getFollowPointForFollower(followerIndex: number): { x: number; y: number } | null {
    // 🧠 NOUVEAU: Utiliser SmartAssignment si disponible
    if (this.useSmartAssignment && this.smartAssignment) {
      // Pour SmartAssignment, on a besoin du NPC lui-même, pas juste de l'index
      // On va extraire le NPC à partir de l'index dans la liste des followers
      const followers = this.owner.followers || [];
      const npc = followers[followerIndex];
      
      if (npc) {
        const assignedPoint = this.smartAssignment.getAssignedPoint(npc);
        if (assignedPoint) {
          return assignedPoint;
        }
        // Fallback vers l'ancien système si SmartAssignment échoue
        console.warn(`⚠️ SmartAssignment échoué pour NPC ${npc.groupId}, fallback vers ancien système`);
      }
    }
    
    // 🔄 ANCIEN SYSTÈME (fallback ou si SmartAssignment désactivé)
    return this.getLegacyFollowPoint(followerIndex);
  }

  /**
   * 🔄 LEGACY: Ancien système de répartition séquentielle
   */
  getLegacyFollowPoint(followerIndex) {
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
   * 🎯 CLEAN: Obtenir une copie des points de la chaîne pour usage externe
   * Respecte le principe SOLID - Open/Closed
   */
  getTrailPoints() {
    return [...this.trailPoints]; // Copie pour éviter la mutation externe
  }

  /**
   * 🎯 CLEAN: Obtenir le dernier point de la chaîne
   */
  getLastPoint() {
    return this.trailPoints.length > 0 ? 
      { ...this.trailPoints[this.trailPoints.length - 1] } : null;
  }

  /**
   * 🎯 CLEAN: Obtenir la longueur totale de la chaîne
   */
  getTrailLength() {
    if (this.trailPoints.length < 1) return 0;
    
    // Inclure la distance du joueur au premier point
    let totalLength = 0;
    const playerPosition = { x: this.owner.sprite?.x || 0, y: this.owner.sprite?.y || 0 };
    
    if (this.trailPoints.length > 0) {
      totalLength += this.calculateDistance(playerPosition, this.trailPoints[0]);
    }
    
    // Ajouter les distances entre les points de la chaîne
    for (let i = 0; i < this.trailPoints.length - 1; i++) {
      totalLength += this.calculateDistance(this.trailPoints[i], this.trailPoints[i + 1]);
    }
    
    return totalLength;
  }

  /**
   * 🎯 CLEAN: Effacer la chaîne actuelle
   */
  clearTrail() {
    this.trailPoints = [];
    this.isInitialized = false;
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
   * 🎯 AAA: Activer/désactiver le SmartAssignment à la volée
   */
  setSmartAssignmentEnabled(enabled) {
    this.useSmartAssignment = enabled;
    
    if (enabled && !this.smartAssignment) {
      // Créer le système s'il n'existe pas
      this.smartAssignment = new SmartTrailAssignment(this, {
        maxFollowersPerPoint: this.followersPerPoint, // Utiliser la capacité exacte
        reassignmentCooldown: 800,
        stabilityThreshold: 25
      });
      console.log(`🧠 SmartTrailAssignment activé dynamiquement (${this.followersPerPoint} par point)`);
    } else if (!enabled && this.smartAssignment) {
      // Nettoyer le système
      this.smartAssignment.destroy();
      this.smartAssignment = null;
      console.log('🔄 SmartTrailAssignment désactivé, retour au système legacy');
    }
  }

  /**
   * 🎯 Obtenir les statistiques du système d'assignment
   */
  getAssignmentStats() {
    if (this.useSmartAssignment && this.smartAssignment) {
      return {
        system: 'SmartAssignment',
        ...this.smartAssignment.getStats()
      };
    } else {
      // Stats du système legacy
      const followers = this.owner.followers || [];
      return {
        system: 'Legacy',
        totalNpcs: followers.length,
        pointsAvailable: this.followPoints.length,
        followersPerPoint: this.followersPerPoint
      };
    }
  }

  /**
   * 🎯 CLEAN: Nettoyer le système de chaîne
   */
  destroy() {
    // 🎯 AAA: Nettoyer SmartAssignment
    if (this.smartAssignment) {
      this.smartAssignment.destroy();
      this.smartAssignment = null;
    }
    
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
    this.isInitialized = false;
    
    console.log('🗑️ TrailBehavior détruit (avec SmartAssignment)');
  }

  /**
   * 🎯 CLEAN: Vérifier si la chaîne est active
   */
  isActive() {
    return this.trailPoints.length > 0;
  }

  /**
   * 🎯 CLEAN: Obtenir des statistiques sur la chaîne
   */
  getStats() {
    return {
      pointCount: this.trailPoints.length,
      totalLength: this.getTrailLength(),
      isVisible: this.isVisible,
      isInitialized: this.isInitialized,
      linkDistance: this.config.linkDistance,
      constraintStrength: this.config.constraintStrength
    };
  }

  /**
   * 🎯 CLEAN: Forcer la création de points de chaîne supplémentaires si nécessaire
   * @param {number} minPointsRequired - Nombre minimum de points requis
   */
  forceMoreTrailPoints(minPointsRequired) {
    const currentFollowPoints = this.followPoints.length;
    const pointsToAdd = minPointsRequired - currentFollowPoints;
    
    if (pointsToAdd <= 0) {
      return;
    }
    
    // 🎯 STRATÉGIE: Étendre la chaîne pour avoir plus de points de suivi
    const currentChainLength = this.trailPoints.length;
    const neededChainPoints = Math.ceil(minPointsRequired * this.followPointDistance / this.config.linkDistance);
    
    if (neededChainPoints > currentChainLength) {
      // Étendre la chaîne
      const pointsToAddToChain = neededChainPoints - currentChainLength;
      
      // Calculer la direction de la chaîne actuelle
      let directionX = -1; // Par défaut vers la gauche
      let directionY = 0;
      
      if (this.trailPoints.length >= 2) {
        const lastPoint = this.trailPoints[this.trailPoints.length - 1];
        const beforeLastPoint = this.trailPoints[this.trailPoints.length - 2];
        directionX = lastPoint.x - beforeLastPoint.x;
        directionY = lastPoint.y - beforeLastPoint.y;
        
        // Normaliser
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
          directionX /= length;
          directionY /= length;
        }
      } else if (this.trailPoints.length === 1) {
        const playerX = this.owner.sprite?.x || 0;
        const playerY = this.owner.sprite?.y || 0;
        const firstPoint = this.trailPoints[0];
        directionX = firstPoint.x - playerX;
        directionY = firstPoint.y - playerY;
        
        // Normaliser
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
          directionX /= length;
          directionY /= length;
        }
      }
      
      // Ajouter les nouveaux points à la chaîne
      for (let i = 0; i < pointsToAddToChain; i++) {
        const lastPoint = this.trailPoints[this.trailPoints.length - 1];
        
        const newPoint = {
          x: lastPoint.x + directionX * this.config.linkDistance,
          y: lastPoint.y + directionY * this.config.linkDistance,
          prevX: lastPoint.x + directionX * this.config.linkDistance,
          prevY: lastPoint.y + directionY * this.config.linkDistance,
          index: this.trailPoints.length,
          velocity: { x: 0, y: 0 },
          timestamp: Date.now(), // 🎯 COMPATIBILITÉ: Pour l'API legacy
          artificial: true // Marquer comme artificiel
        };
        
        this.trailPoints.push(newPoint);
      }
      
      console.log(`🔗 Chaîne étendue de ${currentChainLength} à ${this.trailPoints.length} points pour supporter ${minPointsRequired} followers`);
    }
    
    // Régénérer les points de suivi avec la chaîne étendue
    this.updateFollowPoints();
  }
} 