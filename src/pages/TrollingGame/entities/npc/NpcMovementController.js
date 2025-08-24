/**
 * 🎯 SOLID: NpcMovementController
 * Responsabilité : Gestion du mouvement et de la vélocité du NPC
 */
export class NpcMovementController {
  constructor(npc) {
    this.npc = npc;
    
    // Propriétés de mouvement (alignées sur le joueur)
    this.speed = 150; // Vitesse de base px/s – même valeur que le joueur
    this.velocity = { x: 0, y: 0 };
    this.lastPosition = { x: 0, y: 0 };
    
    // Configuration fuite (centrée flow-field)
    this.fleeConfig = {
      smoothFactor: 0.25,     // Lissage de direction pour éviter l'oscillation
      preTrembleRadius: 110,  // Rayon joueur pour déclencher trembling avant capture
      nearWallThreshold: 42   // Utilisé uniquement pour l'arrêt net au contact
    };
    
    // Détection de blocage → trembling
    this.stuck = {
      timerMs: 0,
      triggerMs: 420,
      lastX: 0,
      lastY: 0,
      distanceEpsilon: 1.2,
      minRealSpeed: 12
    };

    // Mémoire de fuite pour stabiliser la direction
    this.fleeMemory = {
      lastDir: { x: 0, y: 0 }
    };
    
    // Configuration des vitesses selon les états (même référentiel que le joueur)
    this.speedConfig = {
      normal: 150,
      following: 150,
      fleeing: 200, // Fuite rapide (déclenche potentiellement le run)
      migrating: 120,
      trembling: 0
    };
    
    console.log('🏃 NpcMovementController créé');
  }

  /**
   * Définir la vitesse de base
   */
  setSpeed(speed) {
    this.speed = speed;
    this.speedConfig.normal = speed;
    this.speedConfig.following = speed;
    this.speedConfig.fleeing = 200; // Fuite fixée à 200px/s
  }

  /**
   * Obtenir la vitesse actuelle selon l'état
   */
  getCurrentSpeed(state) {
    return this.speedConfig[state] || this.speedConfig.normal;
  }

  /**
   * Calculer la vélocité finale pour un état donné
   */
  calculateVelocity(state, stateController, delta) {
    // 🎯 PRIORITÉ ABSOLUE: Si le NPC est en train de crier, il ne peut pas bouger
    if (this.npc.shoutBehavior && this.npc.shoutBehavior.isScreaming) {
      return { x: 0, y: 0 };
    }
    
    let finalVelocity = { x: 0, y: 0 };
    
    switch (state) {
      case 'normal':
      case 'following':
        // Utiliser NpcBehaviorController pour le mouvement de base
        if (this.npc.behaviorController) {
          const movementVelocity = this.npc.behaviorController.calculateVelocity(delta);
          finalVelocity.x = movementVelocity.x;
          finalVelocity.y = movementVelocity.y;
        }
        break;
        
      case 'fleeing':
        finalVelocity = this.calculateFleeingVelocity(stateController, delta);
        break;
        
      case 'trembling':
        finalVelocity = { x: 0, y: 0 }; // Pas de mouvement en tremblant
        break;
        
      case 'migrating':
      case 'organism_migrating':
        // La vélocité est gérée par NpcMigrationController
        finalVelocity = this.velocity;
        break;
        
      default:
        finalVelocity = { x: 0, y: 0 };
    }
    
    return this.capVelocity(finalVelocity, state);
  }

  /**
   * Calculer la vélocité de fuite
   */
  calculateFleeingVelocity(stateController, delta) {
    const fleeData = stateController.getFleeingData();
    const fleeSpeed = this.getCurrentSpeed('fleeing');
    
    // 1) Direction via flow-field si dispo, sinon opposée au joueur
    const awayDir = this.normalizeVector(fleeData.direction);
    let desired = awayDir;
    const level = this.npc.scene.currentLevel;
    if (level && level.flowFieldService) {
      const fieldDir = level.flowFieldService.sampleDirection(this.npc.sprite.x, this.npc.sprite.y);
      if (Math.abs(fieldDir.x) + Math.abs(fieldDir.y) > 0.0001) desired = fieldDir;
    }

    // 2) Lissage directionnel pour éviter l'oscillation
    const sm = this.fleeConfig.smoothFactor;
    const blended = {
      x: this.fleeMemory.lastDir.x * (1 - sm) + desired.x * sm,
      y: this.fleeMemory.lastDir.y * (1 - sm) + desired.y * sm
    };
    const bestDir = this.normalizeVector(blended);
    this.fleeMemory.lastDir = bestDir;
    
    // 3) Vecteur principal issu du flow-field
    const base = { x: bestDir.x * fleeSpeed, y: bestDir.y * fleeSpeed };
    
    return { x: base.x, y: base.y };
  }

  // Détecter l'angle et engager une direction d'échappement pendant une courte durée
  maybeStartCornerEscape() {
    if (!this.npc || !this.npc.sprite || !this.npc.scene || !this.npc.scene.scale) return { active: false };
    if (this.cornerEscape.active) return { active: true, dir: this.cornerEscape.dir };
    
    const margin = this.cornerEscape.detectMargin;
    const w = this.npc.scene.scale.width || 0;
    const h = this.npc.scene.scale.height || 0;
    const x = this.npc.sprite.x;
    const y = this.npc.sprite.y;
    
    const nearLeft = x < margin;
    const nearRight = x > w - margin;
    const nearTop = y < margin;
    const nearBottom = y > h - margin;
    
    // Coin détecté si proche en X et Y
    if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
      // Choisir TANGENTE au mur: deux options selon le coin, on prend la meilleure clearance
      let candidates = [];
      if (nearLeft && nearTop) candidates = [{ x: 1, y: 0 }, { x: 0, y: 1 }];
      else if (nearRight && nearTop) candidates = [{ x: -1, y: 0 }, { x: 0, y: 1 }];
      else if (nearLeft && nearBottom) candidates = [{ x: 1, y: 0 }, { x: 0, y: -1 }];
      else if (nearRight && nearBottom) candidates = [{ x: -1, y: 0 }, { x: 0, y: -1 }];

      let best = { dir: candidates[0], score: -Infinity };
      for (const c of candidates) {
        const sc = this.computeBoundaryClearanceScore(c);
        if (sc > best.score) best = { dir: c, score: sc };
      }
      const dir = this.normalizeVector(best.dir);
      this.cornerEscape.active = true;
      this.cornerEscape.dir = dir;
      this.cornerEscape.timerMs = this.cornerEscape.durationMs;
      return { active: true, dir };
    }
    
    return { active: false };
  }

  /**
   * Best-of-N sampling dans un cône opposé au joueur, avec scoring
   */
  computeBestFleeDirection(awayDir) {
    const cfg = this.fleePlannerConfig;
    const samples = Math.max(3, cfg.samples | 0);
    const coneRad = Math.max(0, Math.min(180, cfg.coneDegrees)) * Math.PI / 180;
    
    const baseAngle = Math.atan2(awayDir.y, awayDir.x);
    let best = { dir: awayDir, score: -Infinity };
    const seed = (this.npc.groupId || 0) * 9176 + 1357;
    
    for (let i = 0; i < samples; i++) {
      const t = samples === 1 ? 0.0 : (i / (samples - 1)) - 0.5; // [-0.5, 0.5]
      const jitter = (this.seededNoise(seed + i) - 0.5) * 0.25;  // ±12.5%
      const offset = (t + jitter) * coneRad;
      const ang = baseAngle + offset;
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      
      const sAway = Math.max(0, this.dot(dir, awayDir));
      const sClear = this.computeBoundaryClearanceScore(dir);
      const score = sAway * cfg.weightAway + sClear * cfg.weightClearance;
      
      if (score > best.score) {
        best.dir = dir;
        best.score = score;
      }
    }
    
    return this.normalizeVector(best.dir);
  }

  /**
   * Score [0..1] selon la distance d'intersection avec les bords (plus loin = mieux)
   */
  computeBoundaryClearanceScore(dir) {
    if (!this.npc || !this.npc.sprite || !this.npc.scene || !this.npc.scene.scale) return 0.5;
    const x = this.npc.sprite.x;
    const y = this.npc.sprite.y;
    const w = this.npc.scene.scale.width || 0;
    const h = this.npc.scene.scale.height || 0;
    
    const d = this.rayToRectDistance(x, y, dir, w, h);
    const m = this.boundaryAvoidanceConfig.margin;
    const norm = Math.min(1, d / (m * 2));
    return Math.max(0, norm);
  }

  /**
   * Distance positive jusqu'au bord le plus proche le long de dir (ray vs rectangle écran)
   */
  rayToRectDistance(x, y, dir, w, h) {
    const dx = dir.x;
    const dy = dir.y;
    const eps = 1e-6;
    let tMin = Infinity;
    
    if (dx > eps) {
      const t = (w - x) / dx; if (t > eps) tMin = Math.min(tMin, t);
    } else if (dx < -eps) {
      const t = (0 - x) / dx; if (t > eps) tMin = Math.min(tMin, t);
    }
    if (dy > eps) {
      const t = (h - y) / dy; if (t > eps) tMin = Math.min(tMin, t);
    } else if (dy < -eps) {
      const t = (0 - y) / dy; if (t > eps) tMin = Math.min(tMin, t);
    }
    
    if (!isFinite(tMin)) return 0;
    return Math.max(0, tMin);
  }

  // (wall slide supprimé - flow-field gère la direction)

  // Utilitaires vecteur et bruit
  normalizeVector(v) {
    const m = Math.hypot(v.x, v.y);
    if (m === 0) return { x: 0, y: 0 };
    return { x: v.x / m, y: v.y / m };
  }
  dot(a, b) { return a.x * b.x + a.y * b.y; }
  projectOnto(v, onto) {
    const on = this.normalizeVector(onto);
    const d = this.dot(v, on);
    return { x: on.x * d, y: on.y * d };
  }
  // (helpers supprimés: seededNoise, boundary repulsion)

  /**
   * Appliquer la vélocité au sprite et à la physique
   */
  applyVelocity(velocity) {
    // Stocker la vélocité
    this.velocity = velocity;
    
    // Appliquer au body physique de Phaser
    if (this.npc.sprite && this.npc.sprite.body) {
      this.npc.sprite.body.setVelocity(velocity.x, velocity.y);
    }
  }

  /**
   * Limiter la vélocité selon l'état
   */
  capVelocity(velocity, state) {
    const currentSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const maxSpeed = this.getCurrentSpeed(state);
    
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
   * Sauvegarder la position précédente
   */
  saveLastPosition() {
    if (this.npc.sprite) {
      this.lastPosition.x = this.npc.sprite.x;
      this.lastPosition.y = this.npc.sprite.y;
    }
  }

  /**
   * Restaurer la position précédente (pour les collisions)
   */
  restoreLastPosition() {
    if (this.npc.sprite) {
      this.npc.sprite.x = this.lastPosition.x;
      this.npc.sprite.y = this.lastPosition.y;
    }
  }

  /**
   * Vérifier si une position est valide
   */
  isPositionValid(x, y) {
    if (!this.npc.sprite) return false;
    
    const radius = 8; // Rayon du cercle
    const screenWidth = this.npc.scene.scale.width;
    const screenHeight = this.npc.scene.scale.height;
    
    return (
      x - radius >= 0 &&
      x + radius <= screenWidth &&
      y - radius >= 0 &&
      y + radius <= screenHeight
    );
  }

  /**
   * Obtenir la vélocité actuelle
   */
  getVelocity() {
    return this.velocity;
  }

  /**
   * Définir la vélocité manuellement
   */
  setVelocity(velocity) {
    this.velocity = velocity;
  }

  /**
   * Obtenir la vélocité physique réelle (après collisions)
   */
  getRealVelocity() {
    if (this.npc.sprite && this.npc.sprite.body) {
      return {
        x: this.npc.sprite.body.velocity.x,
        y: this.npc.sprite.body.velocity.y
      };
    }
    return this.velocity;
  }

  /**
   * Arrêter le mouvement
   */
  stop() {
    this.velocity = { x: 0, y: 0 };
    if (this.npc.sprite && this.npc.sprite.body) {
      this.npc.sprite.body.setVelocity(0, 0);
    }
  }

  /**
   * Vérifier si le NPC bouge
   */
  isMoving() {
    const threshold = 0.1;
    return Math.abs(this.velocity.x) > threshold || Math.abs(this.velocity.y) > threshold;
  }

  /**
   * Mettre à jour le mouvement
   */
  update(delta) {
    // Sauvegarder la position pour les collisions
    this.saveLastPosition();
    
    // Détection de blocage pendant la fuite → arrêter et déclencher trembling (précoce si proche joueur)
    if (this.npc && this.npc.stateController && this.npc.stateController.getState() === 'fleeing') {
      const real = this.getRealVelocity();
      const speed = Math.hypot(real.x, real.y);
      const sx = this.npc.sprite.x;
      const sy = this.npc.sprite.y;
      const moved = Math.hypot(sx - this.stuck.lastX, sy - this.stuck.lastY);
      
      // Si collé à un mur (zone slide) et quasi immobile → arrêter net
      const near = this.fleeConfig.nearWallThreshold;
      const w = this.npc.scene.scale.width || 0;
      const h = this.npc.scene.scale.height || 0;
      const nearWall = (sx < near) || (sx > w - near) || (sy < near) || (sy > h - near);
      if (nearWall && speed < this.stuck.minRealSpeed) {
        this.stop();
      }
      
      // Pré-trembling si proche du joueur pour rendre la transition visible
      let preTremble = false;
      const player = this.npc.stateController.getPlayer && this.npc.stateController.getPlayer();
      if (player && player.sprite) {
        const dx = sx - player.sprite.x;
        const dy = sy - player.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < (this.fleeConfig.preTrembleRadius || 110)) {
          preTremble = true;
        }
      }
      
      if (speed < this.stuck.minRealSpeed && moved < this.stuck.distanceEpsilon) {
        // Accélérer le compteur si proche du joueur
        this.stuck.timerMs += preTremble ? (delta * 1.8) : delta;
        if (this.stuck.timerMs >= this.stuck.triggerMs) {
          if (this.npc.stateController && this.npc.stateController.startTrembling) {
            this.npc.stateController.startTrembling();
          }
          this.stuck.timerMs = 0;
        }
      } else {
        this.stuck.timerMs = 0;
      }
      this.stuck.lastX = sx;
      this.stuck.lastY = sy;
    } else {
      this.stuck.timerMs = 0;
      if (this.npc && this.npc.sprite) {
        this.stuck.lastX = this.npc.sprite.x;
        this.stuck.lastY = this.npc.sprite.y;
      }
    }
  }

  /**
   * Gérer les collisions
   */
  onCollision(other) {
    // Revenir à la position précédente en cas de collision
    if (other.entityType === 'wall' || other.entityType === 'npc' || other.entityType === 'player') {
      this.restoreLastPosition();
    }
  }

  /**
   * Nettoyer le composant
   */
  destroy() {
    this.velocity = { x: 0, y: 0 };
    console.log('🗑️ NpcMovementController détruit');
  }
} 