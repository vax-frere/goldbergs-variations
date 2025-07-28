// Interfaces pour les entités du jeu (principes SOLID)

// Interface pour les entités qui peuvent être mises à jour
export class IUpdateable {
  update(delta) {
    throw new Error('Method update() must be implemented');
  }
}

// Interface pour les entités qui peuvent être rendues
export class IRenderable {
  render() {
    throw new Error('Method render() must be implemented');
  }
}

// Interface pour les entités qui peuvent interagir
export class IInteractable {
  onInteraction(interactor) {
    throw new Error('Method onInteraction() must be implemented');
  }
  
  canInteract(interactor) {
    throw new Error('Method canInteract() must be implemented');
  }
}

// Interface pour les entités qui peuvent avoir des collisions
export class ICollidable {
  getBounds() {
    throw new Error('Method getBounds() must be implemented');
  }
  
  onCollision(other) {
    throw new Error('Method onCollision() must be implemented');
  }
}

// Interface pour les entités qui peuvent se déplacer
export class IMovable {
  move(direction, speed) {
    throw new Error('Method move() must be implemented');
  }
  
  getPosition() {
    throw new Error('Method getPosition() must be implemented');
  }
  
  setPosition(x, y) {
    throw new Error('Method setPosition() must be implemented');
  }
}

// Interface pour les comportements IA
export class IBehavior {
  execute(entity, delta) {
    throw new Error('Method execute() must be implemented');
  }
}

// Interface pour les effets
export class IEffect {
  apply(target) {
    throw new Error('Method apply() must be implemented');
  }
  
  remove(target) {
    throw new Error('Method remove() must be implemented');
  }
  
  isFinished() {
    throw new Error('Method isFinished() must be implemented');
  }
}

// Interface pour les niveaux
export class ILevel {
  init(scene) {
    throw new Error('Method init() must be implemented');
  }
  
  update(delta) {
    throw new Error('Method update() must be implemented');
  }
  
  cleanup() {
    throw new Error('Method cleanup() must be implemented');
  }
} 