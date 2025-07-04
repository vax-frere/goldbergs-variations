/**
 * Système d'animation des sprites
 * Gère les animations du spritesheet 3x4 (3 colonnes x 4 directions)
 */

import { SPRITE_CONFIG, PLAYER_CONFIG } from '../utils/constants';

export class SpriteAnimationSystem {
  constructor() {
    this.currentDirection = SPRITE_CONFIG.DIRECTIONS.DOWN;
    this.currentFrame = SPRITE_CONFIG.IDLE_FRAME;
    this.animationTime = 0;
    this.isAnimating = false;
    this.uvOffset = [0, 0];
    this.uvScale = [1/SPRITE_CONFIG.COLS, 1/SPRITE_CONFIG.ROWS];
    
    this.updateUVOffset();
  }

  /**
   * Met à jour la direction basée sur le vecteur de mouvement
   */
  updateDirection(movementVector) {
    if (movementVector.x === 0 && movementVector.z === 0) {
      // Pas de mouvement - arrêter l'animation
      this.stopAnimation();
      return;
    }

    // Démarrer l'animation si pas déjà en cours
    if (!this.isAnimating) {
      this.startAnimation();
    }

    // Déterminer la direction principale basée sur le mouvement
    const absX = Math.abs(movementVector.x);
    const absZ = Math.abs(movementVector.z);

    if (absX > absZ) {
      // Mouvement horizontal prédominant
      this.currentDirection = movementVector.x > 0 
        ? SPRITE_CONFIG.DIRECTIONS.RIGHT 
        : SPRITE_CONFIG.DIRECTIONS.LEFT;
    } else {
      // Mouvement vertical prédominant
      this.currentDirection = movementVector.z > 0 
        ? SPRITE_CONFIG.DIRECTIONS.DOWN 
        : SPRITE_CONFIG.DIRECTIONS.UP;
    }
  }

  /**
   * Démarre l'animation
   */
  startAnimation() {
    this.isAnimating = true;
    this.animationTime = 0;
  }

  /**
   * Arrête l'animation et revient à la frame idle
   */
  stopAnimation() {
    this.isAnimating = false;
    this.currentFrame = SPRITE_CONFIG.IDLE_FRAME;
    this.animationTime = 0;
    this.updateUVOffset();
  }

  /**
   * Met à jour l'animation
   */
  update(deltaTime) {
    if (!this.isAnimating) return;

    this.animationTime += deltaTime;

    // Calculer la frame actuelle basée sur le temps
    const frameIndex = Math.floor(this.animationTime / PLAYER_CONFIG.ANIMATION_SPEED) % SPRITE_CONFIG.COLS;
    
    if (frameIndex !== this.currentFrame) {
      this.currentFrame = frameIndex;
      this.updateUVOffset();
    }
  }

  /**
   * Met à jour les coordonnées UV pour le spritesheet
   */
  updateUVOffset() {
    // Calculer la position dans le spritesheet
    const col = this.currentFrame;
    const row = this.currentDirection;

    // Calculer l'offset UV (origine en bas-gauche pour Three.js)
    this.uvOffset[0] = col / SPRITE_CONFIG.COLS;
    this.uvOffset[1] = 1 - (row + 1) / SPRITE_CONFIG.ROWS; // Inverser Y pour Three.js
  }

  /**
   * Obtient l'offset UV actuel
   */
  getUVOffset() {
    return [...this.uvOffset];
  }

  /**
   * Obtient l'échelle UV
   */
  getUVScale() {
    return [...this.uvScale];
  }

  /**
   * Obtient les informations d'animation actuelles
   */
  getAnimationState() {
    return {
      direction: this.currentDirection,
      frame: this.currentFrame,
      isAnimating: this.isAnimating,
      uvOffset: this.getUVOffset(),
      uvScale: this.getUVScale()
    };
  }

  /**
   * Force une direction spécifique (utile pour le debug)
   */
  setDirection(direction) {
    if (direction in Object.values(SPRITE_CONFIG.DIRECTIONS)) {
      this.currentDirection = direction;
      this.updateUVOffset();
    }
  }

  /**
   * Force une frame spécifique (utile pour le debug)
   */
  setFrame(frame) {
    if (frame >= 0 && frame < SPRITE_CONFIG.COLS) {
      this.currentFrame = frame;
      this.updateUVOffset();
    }
  }

  /**
   * Reset du système
   */
  reset() {
    this.currentDirection = SPRITE_CONFIG.DIRECTIONS.DOWN;
    this.currentFrame = SPRITE_CONFIG.IDLE_FRAME;
    this.animationTime = 0;
    this.isAnimating = false;
    this.updateUVOffset();
  }
} 