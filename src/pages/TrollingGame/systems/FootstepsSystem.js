export class FootstepsSystem {
  constructor(soundManager) {
    this.soundManager = soundManager;
    
    // 🎯 SYSTÈME AAA UNIFIÉ : Gestion individuelle pour Player ET NPCs
    this.entityFootstepsData = new Map(); // Map<entityId, footstepData> - pour tous
    
    // Pool de sons global unifié pour TOUS
    this.soundPool = {
      maxConcurrent: 2, // Max 2 sons simultanés (player + 1 NPC)
      activeSounds: [],
      globalCooldown: 200, // TOUS respectent ce cooldown minimum
      lastGlobalStep: 0
    };
    
    // Configuration AAA unifiée et équilibrée
    this.config = {
      // Player config (plus lent pour éviter spam)
      playerBaseStepInterval: 550,   // Augmenté de 200ms à 350ms
      playerRandomVariation: 0.15,  // Réduit pour plus de cohérence
      
      // NPC config
      npcBaseStepInterval: 550,      // Intervalle de base pour NPCs
      npcRandomVariation: 0.15,       // ±30% de variation temporelle
      
      // Global config
      spatialClusterRadius: 400,     // Rayon pour clustering spatial
      maxPerCluster: 3,              // Max 1 son par zone pour éviter cacophonie
    };
  }

  // 🎯 AAA UNIFIÉ: Initialisation des données de footstep pour toute entité
  initializeEntityFootsteps(entityId, isPlayer = false) {
    if (!this.entityFootstepsData.has(entityId)) {
      this.entityFootstepsData.set(entityId, {
        lastStepTime: Date.now() + Math.random() * 1000, // Décalage initial aléatoire
        personalRhythm: isPlayer ? 1.0 : (0.8 + Math.random() * 0.4), // Player fixe, NPCs variés
        isMoving: false,
        isPlayer: isPlayer
      });
    }
  }

  // 🎯 SYSTÈME AAA UNIFIÉ : Player utilise la même logique que NPCs
  updatePlayerFootsteps(player, delta) {
    const currentTime = Date.now();
    
    // 🎯 AAA: Utiliser le système d'animation pour détecter le mouvement
    if (!player.animationBehavior) {
      console.warn('Player sans animationBehavior - FootstepsSystem désactivé');
      return;
    }
    
    const isMoving = player.animationBehavior.isMoving;
    const playerId = player.id || 'player';
    
    // Initialiser les données du joueur
    this.initializeEntityFootsteps(playerId, true);
    const footstepData = this.entityFootstepsData.get(playerId);
    
    // Si le joueur vient de commencer à bouger ou s'arrêter
    if (isMoving !== footstepData.isMoving) {
      footstepData.isMoving = isMoving;
      if (isMoving) {
        // Premier pas seulement si cooldown global respecté
        if (currentTime - this.soundPool.lastGlobalStep >= this.soundPool.globalCooldown) {
          this.playUnifiedFootstep(player, currentTime);
          footstepData.lastStepTime = currentTime;
        }
      }
      return;
    }
    
    // Si le joueur ne bouge pas, pas de son
    if (!isMoving) return;
    
    // 🎯 COOLDOWN GLOBAL UNIFIÉ : Player aussi doit attendre
    if (currentTime - this.soundPool.lastGlobalStep < this.soundPool.globalCooldown) {
      return;
    }
    
    // 🎯 AAA: Calculer l'intervalle basé sur la vitesse physique réelle
    const realVelocity = player.sprite.body ? {
      x: player.sprite.body.velocity.x,
      y: player.sprite.body.velocity.y
    } : { x: 0, y: 0 };
    
    const speed = Math.sqrt(realVelocity.x ** 2 + realVelocity.y ** 2);
    const speedFactor = Math.max(0.4, Math.min(1.8, speed / player.speed)); // Réduit la plage
    const personalInterval = this.config.playerBaseStepInterval / speedFactor * footstepData.personalRhythm;
    
    // Ajouter variation aléatoire minimale pour le joueur
    const randomVariation = 1 + (Math.random() - 0.5) * this.config.playerRandomVariation;
    const finalInterval = personalInterval * randomVariation;
    
    // Jouer le son si assez de temps s'est écoulé
    if (currentTime - footstepData.lastStepTime >= finalInterval) {
      this.playUnifiedFootstep(player, currentTime);
      footstepData.lastStepTime = currentTime;
    }
  }

  // 🎯 SYSTÈME AAA : Gestion avancée des NPCs
  updateNpcFootsteps(npcs) {
    const currentTime = Date.now();
    
    // Nettoyage global
    this.cleanupSoundPool();
    
    // 1. CLUSTERING SPATIAL : Grouper les NPCs par zones
    const clusters = this.createSpatialClusters(npcs);
    
    // 2. TRAITEMENT PAR CLUSTER pour éviter saturation locale
    for (const cluster of clusters) {
      this.processClusterFootsteps(cluster, currentTime);
    }
  }

  // 🎯 AAA: Création de clusters spatials
  createSpatialClusters(npcs) {
    const clusters = [];
    const processed = new Set();
    
    for (const npc of npcs) {
      if (processed.has(npc.id)) continue;
      
      const cluster = {
        center: { x: npc.sprite.x, y: npc.sprite.y },
        npcs: [npc],
        activeSounds: 0
      };
      
      // Trouver les NPCs proches
      for (const otherNpc of npcs) {
        if (otherNpc.id === npc.id || processed.has(otherNpc.id)) continue;
        
        const distance = Math.sqrt(
          (npc.sprite.x - otherNpc.sprite.x) ** 2 + 
          (npc.sprite.y - otherNpc.sprite.y) ** 2
        );
        
        if (distance <= this.config.spatialClusterRadius) {
          cluster.npcs.push(otherNpc);
          processed.add(otherNpc.id);
        }
      }
      
      processed.add(npc.id);
      clusters.push(cluster);
    }
    
    return clusters;
  }

  // 🎯 AAA: Traitement intelligent par cluster
  processClusterFootsteps(cluster, currentTime) {
    // Filtrer les NPCs en mouvement selon leur système d'animation
    const movingNpcs = cluster.npcs.filter(npc => {
      return npc.animationBehavior && npc.animationBehavior.isMoving;
    });
    
    if (movingNpcs.length === 0) return;
    
    // Respecter le cooldown global unifié
    if (currentTime - this.soundPool.lastGlobalStep < this.soundPool.globalCooldown) {
      return;
    }
    
    // Compter les sons actifs pour ce cluster
    const activeSoundsInCluster = this.soundPool.activeSounds.filter(sound => 
      sound.clusterId === cluster.id
    ).length;
    
    // Limite par cluster
    if (activeSoundsInCluster >= this.config.maxPerCluster) return;
    
    // 🎯 SÉLECTION INTELLIGENTE : Prioriser par timing individuel
    const candidateNpcs = [];
    
    for (const npc of movingNpcs) {
      const npcId = npc.id || `npc-${npc.groupId}`;
      this.initializeEntityFootsteps(npcId, false);
      const footstepData = this.entityFootstepsData.get(npcId);
      
      // Calculer l'intervalle basé sur la vitesse physique réelle
      const realVelocity = npc.sprite.body ? {
        x: npc.sprite.body.velocity.x,
        y: npc.sprite.body.velocity.y
      } : { x: 0, y: 0 };
      
      const speed = Math.sqrt(realVelocity.x ** 2 + realVelocity.y ** 2);
      const speedFactor = Math.max(0.5, Math.min(2.0, speed / 50));
      const personalInterval = this.config.npcBaseStepInterval / speedFactor * footstepData.personalRhythm;
      
      // Ajouter variation aléatoire
      const randomVariation = 1 + (Math.random() - 0.5) * this.config.npcRandomVariation;
      const finalInterval = personalInterval * randomVariation;
      
      // Vérifier si c'est le moment pour ce NPC
      if (currentTime - footstepData.lastStepTime >= finalInterval) {
        candidateNpcs.push({
          npc,
          priority: currentTime - footstepData.lastStepTime,
          interval: finalInterval
        });
      }
    }
    
    if (candidateNpcs.length === 0) return;
    
    // Trier par priorité (plus en retard en premier)
    candidateNpcs.sort((a, b) => b.priority - a.priority);
    
    // Jouer le son pour le NPC le plus prioritaire
    const chosen = candidateNpcs[0];
    this.playUnifiedFootstep(chosen.npc, currentTime, cluster);
  }

  // 🎯 AAA UNIFIÉ: Une seule méthode pour jouer les sons (Player + NPCs)
  playUnifiedFootstep(entity, currentTime, cluster = null) {
    // Vérifier si on peut jouer un son (pool pas plein)
    if (this.soundPool.activeSounds.length >= this.soundPool.maxConcurrent) {
      return;
    }
    
    const sound = this.soundManager.playRandomFootstep();
    if (sound) {
      // Métadonnées pour tracking
      sound.entityId = entity.id || (entity.entityType === 'player' ? 'player' : `npc-${entity.groupId}`);
      sound.entityType = entity.entityType;
      sound.clusterId = cluster?.id || null;
      sound.playTime = currentTime;
      
      // Ajouter au pool unifié
      this.soundPool.activeSounds.push(sound);
      this.soundPool.lastGlobalStep = currentTime;
      
      // Mettre à jour les données de l'entité
      const entityId = sound.entityId;
      const footstepData = this.entityFootstepsData.get(entityId);
      if (footstepData) {
        footstepData.lastStepTime = currentTime;
      }
      
      // Gestion de fin de son
      sound.once('complete', () => {
        this.removeFromPool(sound);
      });
      
      return sound;
    }
  }

  cleanupSoundPool() {
    // Retirer les sons qui ne jouent plus
    this.soundPool.activeSounds = this.soundPool.activeSounds.filter(sound => {
      return sound.isPlaying;
    });
  }

  removeFromPool(sound) {
    const index = this.soundPool.activeSounds.indexOf(sound);
    if (index > -1) {
      this.soundPool.activeSounds.splice(index, 1);
    }
  }

  // 🎯 AAA: Configuration unifiée
  setPlayerStepInterval(interval) {
    this.config.playerBaseStepInterval = Math.max(200, interval);
  }

  setNpcMaxConcurrent(max) {
    this.soundPool.maxConcurrent = Math.max(1, Math.min(12, max));
  }

  // 🎯 AAA: Configuration avancée
  setAAASoundConfig(config) {
    Object.assign(this.config, config);
  }

  destroy() {
    // Arrêter tous les sons actifs
    this.soundPool.activeSounds.forEach(sound => sound.stop());
    this.soundPool.activeSounds = [];
    this.entityFootstepsData.clear();
  }
} 