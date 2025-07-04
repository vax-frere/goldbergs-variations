/**
 * Système de physique pour le jeu Third Person
 * Suit le principe Single Responsibility - gère uniquement la physique et les collisions
 * Utilise Rapier pour les collisions sans physique complète (mode kinématique)
 */

export class PhysicsSystem {
  constructor() {
    this.isActive = false;
    this.collisionCallbacks = new Map();
  }

  /**
   * Active le système de physique
   */
  activate() {
    if (this.isActive) return;
    
    console.log('🔧 Système de physique activé');
    this.isActive = true;
  }

  /**
   * Désactive le système de physique  
   */
  deactivate() {
    if (!this.isActive) return;
    
    console.log('🔧 Système de physique désactivé');
    this.isActive = false;
    this.collisionCallbacks.clear();
  }

  /**
   * Enregistre un callback de collision pour un objet
   * @param {string} objectId - Identifiant unique de l'objet
   * @param {Function} callback - Fonction appelée lors d'une collision
   */
  addCollisionCallback(objectId, callback) {
    this.collisionCallbacks.set(objectId, callback);
  }

  /**
   * Supprime un callback de collision
   * @param {string} objectId - Identifiant de l'objet
   */
  removeCollisionCallback(objectId) {
    this.collisionCallbacks.delete(objectId);
  }

  /**
   * Vérifie si un mouvement est valide (pas de collision)
   * Cette méthode sera appelée par le Player avant de bouger
   * @param {Vector3} currentPosition - Position actuelle
   * @param {Vector3} targetPosition - Position cible
   * @param {number} radius - Rayon de collision du joueur
   * @returns {Vector3} - Position corrigée (ou position cible si pas de collision)
   */
  validateMovement(currentPosition, targetPosition, radius = 0.5) {
    // Pour l'instant, on retourne la position cible telle quelle
    // Les vraies collisions seront gérées par les RigidBody Rapier
    return targetPosition;
  }

  /**
   * Notifie une collision détectée
   * @param {string} objectA - ID du premier objet
   * @param {string} objectB - ID du second objet
   * @param {Object} collisionData - Données de collision
   */
  notifyCollision(objectA, objectB, collisionData) {
    const callbackA = this.collisionCallbacks.get(objectA);
    const callbackB = this.collisionCallbacks.get(objectB);

    if (callbackA) {
      callbackA(objectB, collisionData);
    }
    if (callbackB) {
      callbackB(objectA, collisionData);
    }
  }

  /**
   * Nettoyage du système
   */
  dispose() {
    this.deactivate();
  }
}

// Instance singleton pour l'application
export const physicsSystem = new PhysicsSystem(); 