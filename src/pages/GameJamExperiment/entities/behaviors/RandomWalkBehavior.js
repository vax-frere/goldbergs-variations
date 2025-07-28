import { IBehavior } from '../../core/interfaces';

export class RandomWalkBehavior extends IBehavior {
  constructor(config = {}) {
    super();
    
    // Configuration du comportement
    this.minWalkTime = config.minWalkTime || 1000;
    this.maxWalkTime = config.maxWalkTime || 3000;
    this.minPauseTime = config.minPauseTime || 2000;
    this.maxPauseTime = config.maxPauseTime || 5000;
    this.changeDirectionProbability = config.changeDirectionProbability || 0.1;
    
    // État interne
    this.currentState = 'paused'; // 'walking' ou 'paused'
    this.stateTimer = 0;
    this.stateDuration = 0;
    this.currentDirection = null;
    this.directions = ['up', 'down', 'left', 'right'];
    
    this.initializeState();
  }

  initializeState() {
    // Commencer par une pause
    this.currentState = 'paused';
    this.stateTimer = 0;
    this.stateDuration = this.getRandomPauseTime();
    this.currentDirection = this.getRandomDirection();
  }

  execute(entity, delta) {
    this.stateTimer += delta;
    
    if (this.stateTimer >= this.stateDuration) {
      this.switchState();
    }
    
    if (this.currentState === 'walking') {
      this.executeWalk(entity, delta);
    }
  }

  executeWalk(entity, delta) {
    // Parfois changer de direction pendant la marche
    if (Math.random() < this.changeDirectionProbability * (delta / 1000)) {
      this.currentDirection = this.getRandomDirection();
    }
    
    // Déplacer l'entité
    const moveSpeed = entity.speed * (delta / 1000);
    let newX = entity.sprite.x;
    let newY = entity.sprite.y;
    
    switch (this.currentDirection) {
      case 'up':
        newY -= moveSpeed;
        break;
      case 'down':
        newY += moveSpeed;
        break;
      case 'left':
        newX -= moveSpeed;
        break;
      case 'right':
        newX += moveSpeed;
        break;
    }
    
    // Vérifier si la nouvelle position est valide
    if (entity.isPositionValid && entity.isPositionValid(newX, newY)) {
      entity.sprite.x = newX;
      entity.sprite.y = newY;
    } else {
      // Changer de direction si on ne peut pas bouger
      this.currentDirection = this.getRandomDirection();
    }
  }

  switchState() {
    if (this.currentState === 'walking') {
      // Passer en pause
      this.currentState = 'paused';
      this.stateDuration = this.getRandomPauseTime();
    } else {
      // Passer en marche
      this.currentState = 'walking';
      this.stateDuration = this.getRandomWalkTime();
      this.currentDirection = this.getRandomDirection();
    }
    
    this.stateTimer = 0;
  }

  getRandomDirection() {
    return this.directions[Math.floor(Math.random() * this.directions.length)];
  }

  getRandomWalkTime() {
    return Math.random() * (this.maxWalkTime - this.minWalkTime) + this.minWalkTime;
  }

  getRandomPauseTime() {
    return Math.random() * (this.maxPauseTime - this.minPauseTime) + this.minPauseTime;
  }

  // Forcer un changement de direction
  forceDirectionChange() {
    this.currentDirection = this.getRandomDirection();
  }

  // Forcer une pause
  forcePause(duration = null) {
    this.currentState = 'paused';
    this.stateTimer = 0;
    this.stateDuration = duration || this.getRandomPauseTime();
  }

  // Forcer la marche
  forceWalk(duration = null) {
    this.currentState = 'walking';
    this.stateTimer = 0;
    this.stateDuration = duration || this.getRandomWalkTime();
    this.currentDirection = this.getRandomDirection();
  }

  // Obtenir l'état actuel
  getState() {
    return {
      currentState: this.currentState,
      currentDirection: this.currentDirection,
      stateTimer: this.stateTimer,
      stateDuration: this.stateDuration,
      remainingTime: this.stateDuration - this.stateTimer
    };
  }

  // Configurer les paramètres
  setConfig(config) {
    if (config.minWalkTime !== undefined) this.minWalkTime = config.minWalkTime;
    if (config.maxWalkTime !== undefined) this.maxWalkTime = config.maxWalkTime;
    if (config.minPauseTime !== undefined) this.minPauseTime = config.minPauseTime;
    if (config.maxPauseTime !== undefined) this.maxPauseTime = config.maxPauseTime;
    if (config.changeDirectionProbability !== undefined) {
      this.changeDirectionProbability = config.changeDirectionProbability;
    }
  }
} 