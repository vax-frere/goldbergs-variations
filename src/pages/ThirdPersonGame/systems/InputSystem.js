/**
 * Système d'input pour le jeu Third Person
 * Suit le principe Single Responsibility - gère uniquement les inputs
 */

import { CONTROLS } from '../utils/constants';

export class InputSystem {
  constructor() {
    this.keys = new Set();
    this.listeners = new Map();
    this.isActive = false;
    this.mouseDelta = { x: 0, y: 0 };
    this.mouseSensitivity = 0.002; // Sensibilité de la souris
    this.isPointerLocked = false;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Active le système d'input
   */
  activate() {
    if (this.isActive) return;
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('click', this.handleClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.isActive = true;
  }

  /**
   * Désactive le système d'input
   */
  deactivate() {
    if (!this.isActive) return;
    
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('click', this.handleClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.isActive = false;
    this.keys.clear();
    this.exitPointerLock();
  }

  /**
   * Gestionnaire keydown
   */
  handleKeyDown(event) {
    // Gérer la touche Échap pour libérer la souris
    if (event.code === 'Escape' && this.isPointerLocked) {
      this.exitPointerLock();
      return;
    }
    
    // Gérer les commandes spéciales
    if (this.isAnyKeyPressed(CONTROLS.DEBUG_DOWNLOAD_SPRITESHEET)) {
      this.notifyListeners('debug_download_spritesheet');
      return;
    }
    
    this.keys.add(event.code);
    this.notifyListeners('keydown', event.code);
  }

  /**
   * Gestionnaire keyup
   */
  handleKeyUp(event) {
    this.keys.delete(event.code);
    this.notifyListeners('keyup', event.code);
  }

  /**
   * Gestionnaire de mouvement souris
   */
  handleMouseMove(event) {
    if (!this.isPointerLocked) return;
    
    this.mouseDelta.x = -event.movementX * this.mouseSensitivity; // Inversé gauche/droite
    this.mouseDelta.y = event.movementY * this.mouseSensitivity;
  }

  /**
   * Gestionnaire de clic pour activer pointer lock
   */
  handleClick(event) {
    if (!this.isPointerLocked) {
      this.requestPointerLock();
    }
  }

  /**
   * Gestionnaire de changement de pointer lock
   */
  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement !== null;
    console.log('🖱️ Pointer lock:', this.isPointerLocked ? 'activé' : 'désactivé');
  }

  /**
   * Demande le pointer lock
   */
  requestPointerLock() {
    document.body.requestPointerLock();
  }

  /**
   * Sort du pointer lock
   */
  exitPointerLock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  /**
   * Vérifie si une touche est pressée
   */
  isKeyPressed(keyCode) {
    return this.keys.has(keyCode);
  }

  /**
   * Vérifie si une des touches d'un groupe est pressée
   */
  isAnyKeyPressed(keyCodes) {
    return keyCodes.some(key => this.keys.has(key));
  }

  /**
   * Obtient le vecteur de mouvement basé sur les contrôles AZERTY
   * Z/S avant/arrière, Q/D strafe gauche/droite
   */
  getMovementVector() {
    const movement = { x: 0, z: 0 };

    if (this.isAnyKeyPressed(CONTROLS.FORWARD)) { // Z
      movement.z -= 1;
    }
    if (this.isAnyKeyPressed(CONTROLS.BACKWARD)) { // S
      movement.z += 1;
    }
    if (this.isAnyKeyPressed(CONTROLS.STRAFE_LEFT)) { // Q
      movement.x -= 1;
    }
    if (this.isAnyKeyPressed(CONTROLS.STRAFE_RIGHT)) { // D
      movement.x += 1;
    }

    // Normalisation pour mouvement diagonal
    if (movement.x !== 0 && movement.z !== 0) {
      const length = Math.sqrt(movement.x * movement.x + movement.z * movement.z);
      movement.x /= length;
      movement.z /= length;
    }

    return movement;
  }

  /**
   * Obtient le delta de la souris pour la rotation et le reset
   */
  getMouseDelta() {
    const delta = { ...this.mouseDelta };
    // Reset du delta après lecture pour éviter l'accumulation
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }

  /**
   * Vérifie si la souris est capturée
   */
  isMouseCaptured() {
    return this.isPointerLocked;
  }

  /**
   * Vérifie si des commandes de debug sont pressées
   */
  getDebugCommands() {
    const commands = {};

    if (this.isAnyKeyPressed(CONTROLS.DEBUG_DOWNLOAD_SPRITESHEET)) {
      commands.downloadSpritesheet = true;
    }

    return commands;
  }

  /**
   * Ajoute un listener pour les événements d'input
   */
  addListener(id, callback) {
    this.listeners.set(id, callback);
  }

  /**
   * Supprime un listener
   */
  removeListener(id) {
    this.listeners.delete(id);
  }

  /**
   * Notifie tous les listeners
   */
  notifyListeners(type, key) {
    this.listeners.forEach(callback => {
      callback(type, key);
    });
  }

  /**
   * Nettoyage
   */
  dispose() {
    this.deactivate();
    this.listeners.clear();
  }
}

// Instance singleton pour l'application
export const inputSystem = new InputSystem(); 