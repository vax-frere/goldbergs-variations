/**
 * 🎯 SOLID: GroupFleeingSystem
 * 
 * Responsabilité unique : Détecter quand déclencher la fuite de groupe des NPCs
 * 
 * Principe : Quand il ne reste que 2-3 NPCs qui ne suivent pas le joueur,
 * ils prennent peur et fuient naturellement en courant.
 * 
 * Architecture SOLID :
 * - Single Responsibility : Surveille uniquement les conditions de fuite de groupe
 * - Open/Closed : Extensible pour d'autres types de déclencheurs
 * - Dependency Inversion : Dépend d'abstractions (EntityManager, Player)
 */
export class GroupFleeingSystem {
  constructor(scene, entityManager) {
    this.scene = scene;
    this.entityManager = entityManager;
    
    // Configuration du système
    this.config = {
      triggerThreshold: 8, // Seuil : 8 NPCs non-followers ou moins
      checkInterval: 500,  // Vérifier toutes les 500ms
      fleeRange: 300,      // Distance à partir de laquelle fuir le joueur
      minNpcsForFlee: 1    // Minimum de NPCs pour déclencher la fuite
    };
    
    // État du système
    this.lastCheckTime = 0;
    this.isGroupFleeingActive = false;
    this.affectedNpcs = new Set(); // NPCs actuellement en fuite de groupe
    
    console.log('👥 GroupFleeingSystem créé - Seuil:', this.config.triggerThreshold, 'NPCs non-followers, Range:', this.config.fleeRange, 'px');
  }

  /**
   * 🎯 INTERFACE PUBLIQUE: Mettre à jour le système
   */
  update(time, delta) {
    // Vérification périodique pour éviter la surcharge
    if (time - this.lastCheckTime < this.config.checkInterval) {
      return;
    }
    
    this.lastCheckTime = time;
    
    // Évaluer les conditions de fuite de groupe
    this.evaluateGroupFleeingConditions();
  }

  /**
   * 🎯 CORE LOGIC: Évaluer si la fuite de groupe doit être maintenue (comportement continu)
   */
  evaluateGroupFleeingConditions() {
    const player = this.getPlayer();
    if (!player) return;

    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);
    const shouldTriggerFlee = this.shouldTriggerGroupFleeing(nonFollowerNpcs);

    if (shouldTriggerFlee) {
      // 🎯 COMPORTEMENT CONTINU: Forcer la fuite tant que les conditions sont remplies
      this.maintainGroupFleeing(nonFollowerNpcs, player);
      if (!this.isGroupFleeingActive) {
        this.isGroupFleeingActive = true;
        console.log(`👥 🏃 FUITE CONSTANTE activée ! ${nonFollowerNpcs.length} NPCs en fuite permanente`);
      }
    } else if (this.isGroupFleeingActive) {
      this.stopGroupFleeing();
    }
  }

  /**
   * 🎯 BUSINESS LOGIC: Déterminer si la fuite de groupe doit être déclenchée
   */
  shouldTriggerGroupFleeing(nonFollowerNpcs) {
    return nonFollowerNpcs.length <= this.config.triggerThreshold && 
           nonFollowerNpcs.length >= this.config.minNpcsForFlee;
  }

  /**
   * 🎯 ACTION: Déclencher la fuite de groupe (legacy - utilisé pour tests manuels)
   */
  triggerGroupFleeing(nonFollowerNpcs, player) {
    console.log(`👥 🏃 FUITE DE GROUPE déclenchée ! ${nonFollowerNpcs.length} NPCs vont fuir`);
    
    this.isGroupFleeingActive = true;
    
    nonFollowerNpcs.forEach(npc => {
      if (this.isNpcInFleeRange(npc, player)) {
        this.makeNpcFleeFromGroup(npc, player);
      }
    });
  }

  /**
   * 🎯 NOUVEAU: Maintenir la fuite de groupe en continu (comportement permanent)
   */
  maintainGroupFleeing(nonFollowerNpcs, player) {
    nonFollowerNpcs.forEach(npc => {
      if (this.isNpcInFleeRange(npc, player)) {
        // Forcer constamment l'état de fuite tant que les conditions sont remplies
        this.ensureNpcIsFleeing(npc, player);
      }
    });
  }

  /**
   * 🎯 HELPER: S'assurer qu'un NPC est en état de fuite permanent (sauf si états prioritaires)
   */
  ensureNpcIsFleeing(npc, player) {
    if (!npc.stateController) return;

    const currentState = npc.stateController.getState();
    
    // 🎯 ÉTATS PRIORITAIRES: Ne pas interrompre ces comportements
    if (npc.shoutBehavior && npc.shoutBehavior.isScreaming) {
      return; // Cri en cours
    }
    
    if (currentState === 'trembling') {
      return; // Tremblement après cri - état prioritaire sur la fuite
    }

    // Si le NPC n'est pas en fuite, le forcer à fuir
    if (currentState !== 'fleeing') {
      npc.stateController.startFleeing();
      this.affectedNpcs.add(npc);
      console.log(`👥 🔄 NPC ${npc.groupId} forcé en fuite constante (était en état: ${currentState})`);
    }
    
    // Si déjà en fuite, s'assurer qu'il continue de fuir (réinitialiser le timer si nécessaire)
    else {
      // Prolonger la fuite si elle est sur le point de se terminer
      if (npc.stateController.stateTimer > (npc.stateController.stateDuration - 1000)) {
        npc.stateController.stateTimer = 0; // Reset du timer pour continuer la fuite
        console.log(`👥 ♻️ NPC ${npc.groupId} fuite prolongée (maintien constant)`);
      }
    }
  }

  /**
   * 🎯 ACTION: Arrêter la fuite de groupe constante
   */
  stopGroupFleeing() {
    console.log(`👥 ✋ FUITE CONSTANTE terminée - Les NPCs peuvent reprendre leurs comportements normaux`);
    
    this.isGroupFleeingActive = false;
    
    // Permettre aux NPCs de revenir à leur état normal
    // (ils finiront leur fuite actuelle naturellement sans être re-forcés)
    this.affectedNpcs.clear();
  }

  /**
   * 🎯 NPC LOGIC: Faire fuir un NPC spécifique
   */
  makeNpcFleeFromGroup(npc, player) {
    if (!npc.stateController) return;

    // Vérifier si le NPC n'est pas déjà en fuite ou en cri
    const currentState = npc.stateController.getState();
    if (currentState === 'fleeing' || 
        (npc.shoutBehavior && npc.shoutBehavior.isScreaming)) {
      return;
    }

    // Déclencher la fuite via le système existant
    npc.stateController.startFleeing();
    this.affectedNpcs.add(npc);
    
    console.log(`👥 🏃 NPC ${npc.groupId} fuit le groupe !`);
  }

  /**
   * 🎯 HELPER: Vérifier si un NPC est dans la portée de fuite
   */
  isNpcInFleeRange(npc, player) {
    if (!npc.sprite || !player.sprite) return false;
    
    const distance = Phaser.Math.Distance.Between(
      npc.sprite.x, npc.sprite.y,
      player.sprite.x, player.sprite.y
    );
    
    return distance <= this.config.fleeRange;
  }

  /**
   * 🎯 DATA FILTER: Obtenir les NPCs qui ne suivent pas le joueur
   */
  getNonFollowerNpcs(allNpcs) {
    return allNpcs.filter(npc => {
      if (!npc.stateController) return false;
      
      const state = npc.stateController.getState();
      return state !== 'following';
    });
  }

  /**
   * 🎯 DEPENDENCY: Obtenir le joueur (Dependency Inversion)
   */
  getPlayer() {
    return this.scene.currentLevel?.player;
  }

  /**
   * 🎯 INTERFACE PUBLIQUE: Obtenir les statistiques du système
   */
  getSystemStats() {
    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);
    
    return {
      totalNpcs: allNpcs.length,
      nonFollowerNpcs: nonFollowerNpcs.length,
      threshold: this.config.triggerThreshold,
      isActive: this.isGroupFleeingActive,
      affectedNpcsCount: this.affectedNpcs.size,
      shouldTrigger: this.shouldTriggerGroupFleeing(nonFollowerNpcs)
    };
  }

  /**
   * 🎯 CONFIGURATION: Modifier la configuration à chaud
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('👥 Configuration GroupFleeingSystem mise à jour:', this.config);
  }

  /**
   * 🎯 DEBUG: Forcer la fuite de groupe pour les tests
   */
  forceGroupFleeing() {
    const player = this.getPlayer();
    if (!player) return false;

    const allNpcs = this.entityManager.getNpcs();
    const nonFollowerNpcs = this.getNonFollowerNpcs(allNpcs);
    
    console.log(`👥 🧪 FORCE Group Fleeing - ${nonFollowerNpcs.length} NPCs non-followers`);
    this.triggerGroupFleeing(nonFollowerNpcs, player);
    
    return true;
  }

  /**
   * 🎯 DEBUG: Arrêter la fuite de groupe manuellement
   */
  forceStopGroupFleeing() {
    console.log('👥 🛑 FORCE Stop Group Fleeing');
    this.stopGroupFleeing();
  }

  /**
   * 🎯 CLEANUP: Nettoyer le système
   */
  destroy() {
    this.affectedNpcs.clear();
    this.isGroupFleeingActive = false;
    console.log('👥 GroupFleeingSystem détruit');
  }
}
