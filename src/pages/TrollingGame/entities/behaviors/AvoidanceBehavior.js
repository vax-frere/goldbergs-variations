/**
 * Comportement d'évitement modulaire pour les NPCs
 * Peut être combiné avec d'autres comportements via NpcBehaviorController
 */
export class AvoidanceBehavior {
  constructor(entity, config = {}) {
    this.entity = entity;
    
    // Configuration de l'évitement
    this.config = {
      exclusionRadius: config.exclusionRadius || 80,        // Distance d'évitement
      maxAvoidanceForce: config.maxAvoidanceForce || 100,   // Force max d'évitement
      avoidanceStrength: config.avoidanceStrength || 1.0,   // Multiplicateur de force
      followingBonus: config.followingBonus || 1.3,         // 🎯 NOUVEAU: +30% de force en mode following
      ...config
    };
  }

  /**
   * Calculer la force d'évitement d'une entité cible
   * @param {Object} targetEntity - Entité à éviter (généralement le joueur)
   * @returns {Object} {x, y} Force d'évitement
   */
  calculateAvoidanceForce(targetEntity) {
    if (!targetEntity || !targetEntity.sprite || !this.entity.sprite) {
      return { x: 0, y: 0 };
    }

    const dx = this.entity.sprite.x - targetEntity.sprite.x;
    const dy = this.entity.sprite.y - targetEntity.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Pas d'évitement si assez loin
    if (distance > this.config.exclusionRadius || distance <= 0) {
      return { x: 0, y: 0 };
    }

    // Direction d'éloignement (normalisée)
    const avoidDirection = { x: dx / distance, y: dy / distance };
    
    // Force inversement proportionnelle à la distance (plus proche = plus forte)
    const intensity = (this.config.exclusionRadius - distance) / this.config.exclusionRadius;
    
    // Appliquer la force selon l'état de l'entité
    let effectiveStrength = this.config.avoidanceStrength;
    if (this.entity.state === 'following') {
      effectiveStrength *= this.config.followingBonus; // 🎯 PLUS fort en mode following
    }
    
    const force = intensity * this.config.maxAvoidanceForce * effectiveStrength;

    return {
      x: avoidDirection.x * force,
      y: avoidDirection.y * force
    };
  }

  /**
   * Interface principale : calculer l'évitement du joueur
   * @returns {Object} {x, y} Force d'évitement
   */
  calculate() {
    const player = this.getPlayer();
    if (!player) return { x: 0, y: 0 };
    
    return this.calculateAvoidanceForce(player);
  }

  /**
   * Obtenir le joueur depuis la scène
   */
  getPlayer() {
    if (this.entity.scene.currentLevel && this.entity.scene.currentLevel.player) {
      return this.entity.scene.currentLevel.player;
    }
    return null;
  }

  /**
   * Calculer le poids d'évitement - PRIORITÉ À L'ÉVITEMENT en mode following
   */
  calculateSafeAvoidanceWeight() {
    if (this.entity.state !== 'following') {
      return 1.0; // Évitement total en mode normal
    }

    // 🎯 NOUVEAU: Évitement prioritaire en mode following
    const player = this.getPlayer();
    if (!player) return 0.6;

    const dx = this.entity.sprite.x - player.sprite.x;
    const dy = this.entity.sprite.y - player.sprite.y;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);

    // Plus le joueur est proche, plus l'évitement prend le contrôle
    if (distanceToPlayer < 50) {
      return 0.85; // 85% d'évitement si très proche du joueur
    }
    
    if (distanceToPlayer < 70) {
      return 0.70; // 70% d'évitement si proche du joueur
    }

    // Mode repos : évitement modéré (le NPC peut fuir même au repos)
    if (this.entity.followState && this.entity.followState.mode === "AT_REST") {
      return 0.50; // 50% d'évitement même au repos
    }

    // Distance normale : évitement prioritaire sur le suivi
    return 0.60; // 60% d'évitement par défaut en mode following
  }
} 