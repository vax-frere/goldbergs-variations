/**
 * 🎯 SOLID: NpcMigrationController
 * Responsabilité : Gestion de toutes les migrations (normale + organisme)
 */
export class NpcMigrationController {
  constructor(npc) {
    this.npc = npc;
    
    // Propriétés de migration
    this.targetPosition = null;
    this.migrationSpeed = 120;
    this.migrationTolerance = 15;
    
    // Propriétés pour migration d'organisme
    this.organicVelocity = null;
    this.oscillation = {
      frequency: 1,
      phase: 0,
      amplitude: 0
    };
    
    console.log('🚚 NpcMigrationController créé');
  }

  /**
   * Démarrer la migration normale vers une position cible
   */
  startMigration(targetPos, stateController) {
    this.targetPosition = { x: targetPos.x, y: targetPos.y };
    stateController.setState('migrating');
    
    console.log(`🚚 NPC ${this.npc.groupId} commence migration vers (${targetPos.x}, ${targetPos.y})`);
  }

  /**
   * Démarrer la migration d'organisme unifié
   */
  startOrganismMigration(targetPos, organicVelocity, stateController) {
    this.targetPosition = { x: targetPos.x, y: targetPos.y };
    this.organicVelocity = organicVelocity;
    
    // Stocker les paramètres d'oscillation
    this.oscillation = organicVelocity.oscillation || {
      frequency: 1,
      phase: 0,
      amplitude: 0
    };
    
    stateController.setState('organism_migrating');
    
    console.log(`🌊 NPC ${this.npc.groupId} commence migration d'organisme avec vélocité (${organicVelocity.x.toFixed(1)}, ${organicVelocity.y.toFixed(1)})`);
  }

  /**
   * Mettre à jour la migration normale
   */
  updateMigration(movementController, stateController, delta) {
    if (!this.targetPosition || !this.npc.sprite) return;
    
    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;
    
    // Calculer la distance vers la cible
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Vérifier si arrivé à destination
    if (distance <= this.migrationTolerance) {
      this.onMigrationComplete(stateController);
      return;
    }
    
    // Calculer la direction normalisée
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Définir la vélocité de migration
    const migrationVelocity = {
      x: dirX * this.migrationSpeed,
      y: dirY * this.migrationSpeed
    };
    
    movementController.setVelocity(migrationVelocity);
  }

  /**
   * Mettre à jour la migration d'organisme unifié
   */
  updateOrganismMigration(movementController, stateController, delta) {
    if (!this.targetPosition || !this.npc.sprite || !this.organicVelocity) return;
    
    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;
    
    // Calculer la distance vers la destination finale
    const distance = Math.sqrt((targetX - currentX) ** 2 + (targetY - currentY) ** 2);
    
    let finalVelocity;
    
    // Si on est proche de la destination finale, ralentir et viser précisément
    if (distance <= 50) {
      // Mode précision : viser directement la destination
      const dirX = (targetX - currentX) / distance;
      const dirY = (targetY - currentY) / distance;
      const precisionSpeed = Math.min(this.migrationSpeed * 0.3, distance * 2);
      
      finalVelocity = {
        x: dirX * precisionSpeed,
        y: dirY * precisionSpeed
      };
      
      // Vérifier si arrivé
      if (distance <= this.migrationTolerance) {
        this.onOrganismMigrationComplete(stateController);
        return;
      }
    } else {
      // Mode organisme : utiliser la vélocité organique avec ondulations
      const stateTimer = stateController.getStateTimer();
      const time = stateTimer * 0.001; // Convertir en secondes
      
      // Oscillations personnalisées
      const oscillationX = Math.sin(time * this.oscillation.frequency * Math.PI * 2 + this.oscillation.phase) 
        * this.oscillation.amplitude;
      const oscillationY = Math.cos(time * this.oscillation.frequency * Math.PI * 2 + this.oscillation.phase) 
        * this.oscillation.amplitude;
      
      // Ajouter un effet de "swarm" basé sur la position
      const swarmX = Math.sin(currentY * 0.01 + time) * 2;
      const swarmY = Math.cos(currentX * 0.008 + time * 1.5) * 1;
      
      finalVelocity = {
        x: this.organicVelocity.x + oscillationX + swarmX,
        y: this.organicVelocity.y + oscillationY + swarmY
      };
    }
    
    movementController.setVelocity(finalVelocity);
  }

  /**
   * Migration normale terminée
   */
  onMigrationComplete(stateController) {
    console.log(`✅ NPC ${this.npc.groupId} migration terminée`);
    
    // Arrêter le mouvement
    if (this.npc.movementController) {
      this.npc.movementController.stop();
    }
    
    // Mettre à jour la position de base pour le comportement normal
    if (this.npc.sprite) {
      // 🎯 CRUCIAL: Mettre à jour la spawnPosition pour le wander
      if (this.npc.behaviorController) {
        this.npc.behaviorController.spawnPosition.x = this.npc.sprite.x;
        this.npc.behaviorController.spawnPosition.y = this.npc.sprite.y;
      }
    }
    
    // 🎯 AAA: Forcer l'orientation vers le bas après migration (intro)
    if (this.npc.animationBehavior) {
      this.npc.animationBehavior.setFacing('down');
    }
    
    // Nettoyer et retourner à l'état normal
    this.targetPosition = null;
    stateController.returnToNormal();
  }

  /**
   * Migration d'organisme terminée
   */
  onOrganismMigrationComplete(stateController) {
    console.log(`🌊 NPC ${this.npc.groupId} arrivé à destination en mode organisme`);
    
    // Forcer l'animation idle-down
    if (this.npc.animationBehavior) {
      this.npc.animationBehavior.setFacing('down');
      this.npc.animationBehavior.setMoving(false);
    }
    
    // Réutiliser la logique standard de fin
    this.onMigrationComplete(stateController);
  }

  /**
   * Calculer la vélocité de migration (sans modifier l'état)
   */
  calculateMigrationVelocity() {
    if (!this.targetPosition || !this.npc.sprite) return { x: 0, y: 0 };
    
    const currentX = this.npc.sprite.x;
    const currentY = this.npc.sprite.y;
    const targetX = this.targetPosition.x;
    const targetY = this.targetPosition.y;
    
    // Calculer la distance vers la cible
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Vérifier si arrivé à destination
    if (distance <= this.migrationTolerance) {
      return { x: 0, y: 0 };
    }
    
    // Calculer la direction normalisée
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Retourner la velocity de migration
    return {
      x: dirX * this.migrationSpeed,
      y: dirY * this.migrationSpeed
    };
  }

  /**
   * Vérifier si en migration
   */
  isMigrating(state) {
    return state === 'migrating' || state === 'organism_migrating';
  }

  /**
   * Obtenir la position cible
   */
  getTargetPosition() {
    return this.targetPosition;
  }

  /**
   * Configurer les paramètres de migration
   */
  configure(options = {}) {
    if (options.migrationSpeed !== undefined) {
      this.migrationSpeed = options.migrationSpeed;
    }
    
    if (options.migrationTolerance !== undefined) {
      this.migrationTolerance = options.migrationTolerance;
    }
    
    console.log(`⚙️ NpcMigrationController reconfiguré:`, {
      migrationSpeed: this.migrationSpeed,
      migrationTolerance: this.migrationTolerance
    });
  }

  /**
   * Nettoyer le composant
   */
  destroy() {
    this.targetPosition = null;
    this.organicVelocity = null;
    console.log('🗑️ NpcMigrationController détruit');
  }
} 