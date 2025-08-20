/**
 * 🎯 SYSTÈME SOLID : FloatingTextBehavior
 * Gère l'affichage de textes flottants avec des conditions d'apparition/disparition
 */
export class FloatingTextBehavior {
  constructor(scene, config = {}) {
    this.scene = scene;
    this.config = {
      fontFamily: 'Caveat',
      fontSize: 32,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      autoHideOnPlayerMovement: true,
      ...config
    };
    
    this.textObjects = new Map(); // Map des textes actifs par ID
    this.isPlayerMoving = false; // Flag pour détecter le mouvement du joueur
    this.playerMovementThreshold = 0.1; // Seuil très bas pour détecter le moindre mouvement
    this.lastPlayerPosition = null;
    
    // Écouter les événements de mouvement du joueur
    this.setupPlayerMovementDetection();
  }

  /**
   * Créer un texte flottant
   * @param {string} id - Identifiant unique du texte
   * @param {string} text - Texte à afficher
   * @param {number} x - Position X
   * @param {number} y - Position Y
   * @param {Object} options - Options spécifiques
   */
  createText(id, text, x, y, options = {}) {
    // Détruire l'ancien texte s'il existe
    this.destroyText(id);
    
    const config = {
      ...this.config,
      ...options
    };
    
    console.log(`📝 DEBUG: Création texte "${text}" (id: ${id})`);
    console.log(`📝 DEBUG: Position: (${x}, ${y})`);
    console.log(`📝 DEBUG: Config:`, config);
    
    // Créer le texte Phaser
    const textObject = this.scene.add.text(x, y, text, {
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize}px`,
      color: config.color,
      stroke: config.stroke,
      strokeThickness: config.strokeThickness,
      align: 'center'
    });
    
    console.log(`📝 DEBUG: Texte Phaser créé:`, textObject);
    
    // Centrer le texte
    textObject.setOrigin(0.5, 0.5);
    
    // Définir la profondeur
    textObject.setDepth(1000);
    
    // Vérifier que le texte est visible
    console.log(`📝 DEBUG: Texte visible: ${textObject.visible}`);
    console.log(`📝 DEBUG: Texte alpha: ${textObject.alpha}`);
    console.log(`📝 DEBUG: Position finale: (${textObject.x}, ${textObject.y})`);
    
    // Stocker les métadonnées
    const textData = {
      object: textObject,
      id: id,
      config: config,
      visible: true,
      autoHideOnPlayerMovement: config.autoHideOnPlayerMovement
    };
    
    this.textObjects.set(id, textData);
    
    // ✅ Sécuriser le rendu de la police dans le canvas (certaines plateformes swap après le premier draw)
    const forceFontRefresh = (label) => {
      if (textObject && textObject.active) {
        textObject.setFontFamily(config.fontFamily);
        textObject.setText(textObject.text);
        console.log(`📝 DEBUG: Re-render texte (${label}) pour garantir la police correcte`);
      }
    };

    // 1) Re-render lorsque toutes les fonts du document sont prêtes
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => forceFontRefresh('fonts.ready'));
    }

    // 2) Re-render exactement quand la promesse de la scène (chargement explicite FontFace) se résout
    if (this.scene && this.scene.caveatFontReady && typeof this.scene.caveatFontReady.then === 'function') {
      this.scene.caveatFontReady.then(() => forceFontRefresh('scene.caveatFontReady'));
    }

    // 3) Fallback: petit délai pour couvrir les cas où les deux précédents sont déjà résolus avant la création
    if (this.scene && this.scene.time && this.scene.time.delayedCall) {
      this.scene.time.delayedCall(100, () => forceFontRefresh('delayedCall-100ms'));
    }

    console.log(`📝 Texte créé: "${text}" à (${x}, ${y})`);
    return textObject;
  }

  /**
   * Détruire un texte spécifique
   * @param {string} id - Identifiant du texte
   */
  destroyText(id) {
    const textData = this.textObjects.get(id);
    if (textData) {
      textData.object.destroy();
      this.textObjects.delete(id);
      console.log(`📝 Texte détruit: ${id}`);
    }
  }

  /**
   * Mettre à jour la position d'un texte
   * @param {string} id - Identifiant du texte
   * @param {number} x - Nouvelle position X
   * @param {number} y - Nouvelle position Y
   */
  updateTextPosition(id, x, y) {
    const textData = this.textObjects.get(id);
    if (textData && textData.visible) {
      textData.object.setPosition(x, y);
    }
  }

  /**
   * Masquer un texte
   * @param {string} id - Identifiant du texte
   */
  hideText(id) {
    console.log(`📝 DEBUG FloatingTextBehavior.hideText: Tentative masquage texte "${id}"`);
    
    const textData = this.textObjects.get(id);
    if (textData) {
      console.log(`📝 DEBUG FloatingTextBehavior.hideText: Texte "${id}" trouvé, début fade-out...`);
      
      // Fade-out léger
      this.scene.tweens.add({
        targets: textData.object,
        alpha: 0,
        duration: 800, // 800ms de fade-out
        ease: 'Power2',
        onComplete: () => {
          // Une fois le fade terminé, on masque et on met à jour le statut
          textData.object.setVisible(false);
          textData.visible = false;
          console.log(`📝 DEBUG FloatingTextBehavior.hideText: Fade-out "${id}" terminé`);
        }
      });
      
      console.log(`📝 DEBUG FloatingTextBehavior.hideText: Fade-out "${id}" démarré`);
    } else {
      console.log(`📝 DEBUG FloatingTextBehavior.hideText: Texte "${id}" NON TROUVÉ`);
      console.log(`📝 DEBUG FloatingTextBehavior.hideText: Textes disponibles:`, Array.from(this.textObjects.keys()));
    }
  }

  /**
   * Afficher un texte
   * @param {string} id - Identifiant du texte
   */
  showText(id) {
    const textData = this.textObjects.get(id);
    if (textData) {
      textData.object.setVisible(true);
      textData.visible = true;
      console.log(`📝 Texte affiché: ${id}`);
    }
  }

  /**
   * Configurer la détection de mouvement du joueur
   */
  setupPlayerMovementDetection() {
    // Obtenir la référence du joueur
    const player = this.getPlayer();
    if (player && player.sprite) {
      this.lastPlayerPosition = {
        x: player.sprite.x,
        y: player.sprite.y
      };
    }
  }

  /**
   * Mettre à jour la détection de mouvement
   * @param {number} delta - Temps écoulé
   */
  update(delta) {
    // La détection de mouvement est maintenant gérée par TutorialTextManager
    // pour les textes tutorial. Cette méthode reste pour la compatibilité
    // avec d'autres utilisations potentielles de FloatingTextBehavior.
    
    if (!this.config.autoHideOnPlayerMovement) return;
    
    // Logique simplifiée - ne fait plus rien pour les textes tutorial
    // car ils ont autoHideOnPlayerMovement: false
  }

  /**
   * Appelé quand le joueur commence à bouger
   */
  onPlayerStartMoving() {
    console.log('📝 Joueur en mouvement - délégation au TutorialTextManager');
    
    // Ne plus masquer immédiatement les textes, laisser le TutorialTextManager gérer
    // avec son délai de 1 seconde
    this.notifyTutorialManagerMovement();
  }

  /**
   * 📝 NOUVEAU: Notifier le TutorialTextManager du mouvement du joueur
   */
  notifyTutorialManagerMovement() {
    // Accéder au TutorialTextManager via la scene et déclencher sa logique d'input
    if (this.scene.currentLevel && this.scene.currentLevel.tutorialTextManager) {
      this.scene.currentLevel.tutorialTextManager.onPlayerInput();
      console.log('📝 DEBUG: Mouvement du joueur délégué au TutorialTextManager');
    }
  }

  /**
   * Obtenir la référence du joueur
   */
  getPlayer() {
    if (this.scene.currentLevel && this.scene.currentLevel.player) {
      return this.scene.currentLevel.player;
    }
    return null;
  }

  /**
   * Nettoyer tous les textes
   */
  destroy() {
    this.textObjects.forEach((textData, id) => {
      textData.object.destroy();
    });
    this.textObjects.clear();
    console.log('📝 FloatingTextBehavior détruit');
  }

  /**
   * Obtenir le statut de tous les textes
   */
  getStatus() {
    const status = {};
    this.textObjects.forEach((textData, id) => {
      status[id] = {
        visible: textData.visible,
        position: {
          x: textData.object.x,
          y: textData.object.y
        }
      };
    });
    return status;
  }
} 