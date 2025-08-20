/**
 * 🎯 SOLID REFACTOR: PlayerDebugRenderer
 * Responsabilité unique : Gérer l'affichage des éléments de debug pour le joueur
 */
export class PlayerDebugRenderer {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;
    this.sprite = player.sprite;
    
    // Éléments de debug
    this.shoutRadiusDebugGraphic = null;
    this.tremblingRadiusDebugGraphic = null;
    this.shoutRadiusDebugText = null;
    this.tremblingRadiusDebugText = null;
    
    this.isDebugEnabled = false;
    
    // Base index pour les éléments de debug
    this.DEBUG_BASE_INDEX = 10000;
    
    console.log('🔧 PlayerDebugRenderer initialisé');
  }

  /**
   * Activer/désactiver le mode debug
   */
  setDebugEnabled(enabled) {
    this.isDebugEnabled = enabled;
    
    if (enabled) {
      this.createDebugVisuals();
    } else {
      this.destroyDebugVisuals();
    }
    
    console.log(`🔧 Debug Player ${enabled ? 'activé' : 'désactivé'}`);
  }

  /**
   * Créer tous les visuels de debug
   */
  createDebugVisuals() {
    this.createShoutRadiusDebug();
    this.createTremblingRadiusDebug();
  }

  /**
   * Créer le debug du rayon de cri
   */
  createShoutRadiusDebug() {
    if (this.shoutRadiusDebugGraphic) {
      this.destroyShoutRadiusDebug();
    }
    
    // Cercle du rayon de cri
    this.shoutRadiusDebugGraphic = this.scene.add.graphics();
    this.shoutRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 1);
    
    // Texte du rayon
    this.shoutRadiusDebugText = this.scene.add.text(0, 0, '', {
      fontSize: '12px',
      fill: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    });
    this.shoutRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 2);
    this.shoutRadiusDebugText.setOrigin(0.5, 0.5);
    
    console.log('🔧 Debug rayon de cri créé');
  }

  /**
   * Créer le debug du rayon de collision trembling
   */
  createTremblingRadiusDebug() {
    if (this.tremblingRadiusDebugGraphic) {
      this.destroyTremblingRadiusDebug();
    }
    
    // Cercle du rayon de collision trembling
    this.tremblingRadiusDebugGraphic = this.scene.add.graphics();
    this.tremblingRadiusDebugGraphic.setDepth(this.DEBUG_BASE_INDEX + 3);
    
    // Texte du rayon trembling
    this.tremblingRadiusDebugText = this.scene.add.text(0, 0, '', {
      fontSize: '10px',
      fill: '#ffaa00',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    });
    this.tremblingRadiusDebugText.setDepth(this.DEBUG_BASE_INDEX + 4);
    this.tremblingRadiusDebugText.setOrigin(0.5, 0.5);
    
    console.log('🔧 Debug rayon collision trembling créé');
  }

  /**
   * Mettre à jour le debug du rayon de cri
   */
  updateShoutRadiusDebug() {
    if (!this.isDebugEnabled || !this.shoutRadiusDebugGraphic || !this.sprite) return;
    
    // 🔧 PROTECTION: Ne pas mettre à jour si les textes ont été détruits
    if (!this.shoutRadiusDebugText) return;
    
    const radius = this.player.forceCalculator ? 
      this.player.forceCalculator.getCurrentShoutRadius() : 125;
    const force = this.player.forceCalculator ? 
      this.player.forceCalculator.getCurrentShoutForce() : 1.0;
    
    // Redessiner le cercle
    this.shoutRadiusDebugGraphic.clear();
    this.shoutRadiusDebugGraphic.lineStyle(2, 0x00ff00, 0.7);
    this.shoutRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, radius);
    
    // Mettre à jour le texte
    if (this.shoutRadiusDebugText) {
      this.shoutRadiusDebugText.setPosition(
        this.sprite.x,
        this.sprite.y - radius - 20
      );
      this.shoutRadiusDebugText.setText(`R: ${radius.toFixed(1)} F: ${force.toFixed(2)}`);
    }
  }

  /**
   * Mettre à jour le debug du rayon de collision trembling
   */
  updateTremblingRadiusDebug() {
    if (!this.isDebugEnabled || !this.tremblingRadiusDebugGraphic || !this.sprite) return;
    
    // 🔧 PROTECTION: Ne pas mettre à jour si les textes ont été détruits
    if (!this.tremblingRadiusDebugText) return;
    
    const radius = this.player.collisionDetector ? 
      this.player.collisionDetector.getTremblingCollisionRadius() : 70;
    
    // Redessiner le cercle
    this.tremblingRadiusDebugGraphic.clear();
    this.tremblingRadiusDebugGraphic.lineStyle(2, 0xffaa00, 0.5);
    this.tremblingRadiusDebugGraphic.strokeCircle(this.sprite.x, this.sprite.y, radius);
    
    // Mettre à jour le texte
    if (this.tremblingRadiusDebugText) {
      this.tremblingRadiusDebugText.setPosition(
        this.sprite.x + radius + 10,
        this.sprite.y
      );
      this.tremblingRadiusDebugText.setText(`T: ${radius.toFixed(1)}`);
    }
  }

  /**
   * Dessiner des informations de debug additionnelles
   */
  drawDebugInfo() {
    if (!this.isDebugEnabled) return;
    
    // Info followers
    const followerCount = this.player.followerManager ? 
      this.player.followerManager.getFollowerCount() : 0;
    
    // Info mouvement
    const velocity = this.player.movementController ? 
      this.player.movementController.velocity : { x: 0, y: 0 };
    
    console.log(`🔧 DEBUG Player - Pos: (${this.sprite.x.toFixed(1)}, ${this.sprite.y.toFixed(1)}) Vel: (${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}) Followers: ${followerCount}`);
  }

  /**
   * Détruire le debug du rayon de cri
   */
  destroyShoutRadiusDebug() {
    if (this.shoutRadiusDebugGraphic) {
      this.shoutRadiusDebugGraphic.destroy();
      this.shoutRadiusDebugGraphic = null;
    }
    
    if (this.shoutRadiusDebugText) {
      this.shoutRadiusDebugText.destroy();
      this.shoutRadiusDebugText = null;
    }
  }

  /**
   * Détruire le debug du rayon de collision trembling
   */
  destroyTremblingRadiusDebug() {
    if (this.tremblingRadiusDebugGraphic) {
      this.tremblingRadiusDebugGraphic.destroy();
      this.tremblingRadiusDebugGraphic = null;
    }
    
    if (this.tremblingRadiusDebugText) {
      this.tremblingRadiusDebugText.destroy();
      this.tremblingRadiusDebugText = null;
    }
  }

  /**
   * Détruire tous les visuels de debug
   */
  destroyDebugVisuals() {
    this.destroyShoutRadiusDebug();
    this.destroyTremblingRadiusDebug();
  }

  /**
   * Mettre à jour tous les éléments de debug
   */
  update(delta) {
    if (!this.isDebugEnabled) return;
    
    this.updateShoutRadiusDebug();
    this.updateTremblingRadiusDebug();
    
    // Debug périodique (1 fois par seconde environ)
    if (Math.random() < 0.02) { // 2% de chance par frame
      this.drawDebugInfo();
    }
  }

  /**
   * Forcer la mise à jour des visuels de debug
   */
  forceUpdateDebugVisuals() {
    if (!this.isDebugEnabled) return;
    
    this.updateShoutRadiusDebug();
    this.updateTremblingRadiusDebug();
  }

  /**
   * Obtenir le statut du debug
   */
  getDebugStatus() {
    return {
      enabled: this.isDebugEnabled,
      shoutRadius: !!this.shoutRadiusDebugGraphic,
      tremblingRadius: !!this.tremblingRadiusDebugGraphic,
      shoutText: !!this.shoutRadiusDebugText,
      tremblingText: !!this.tremblingRadiusDebugText
    };
  }

  /**
   * Nettoyer complètement
   */
  destroy() {
    this.destroyDebugVisuals();
    console.log('🚮 PlayerDebugRenderer détruit');
  }
} 