import { FloatingTextBehavior } from '../entities/behaviors/FloatingTextBehavior.js';

/**
 * 🎯 SOLID REFACTOR: TutorialTextManager complet mais découplé
 * Responsabilité : gérer l'affichage complet du tutorial (you, them, image)
 * Émet des events - NE CONTRÔLE PLUS les états du joueur
 */
export class TutorialTextManager {
  constructor(scene) {
    this.scene = scene;
    this.floatingTextBehavior = new FloatingTextBehavior(scene);
    
    // Flags tutorial
    this.playerArrivedAtDestination = false;
    this.allNpcsArrived = false;
    this.tutorialShown = false;
    this.inputDetected = false;
    this.youTextShown = false;
    this.themTextShown = false;
    this.hideTimer = null;
    this.tutorialFinished = false;
    
    // Détection mouvement
    this.lastPlayerPosition = null;
    this.playerMovementThreshold = 0.1;
    
    // Images tutorial
    this.tutorialImages = new Map();
    
    // Position sauvée pour l'image tutorial
    this.youTextPosition = null;
    
    // Setup
    this.setupEventListeners();
    this.setupInputListeners();
    this.setupFallbackTimer();
  }

  setupFallbackTimer() {
    // Fallback : si rien ne se passe, émettre tutorialFinished après 10s
    this.fallbackTimer = this.scene.time.delayedCall(10000, () => {
      if (!this.tutorialFinished) {
        console.log('🎮 FALLBACK: Tutorial timeout - émission tutorialFinished');
        this.emitTutorialFinished();
      }
    });
  }

  setupEventListeners() {
    this.scene.events.on('playerArrivedAtDestination', () => {
      this.onPlayerArrivedAtDestination();
    });
    
    this.scene.events.on('allNpcsArrived', () => {
      this.onAllNpcsArrived();
    });
    
    this.scene.events.on('npcMigrationComplete', () => {
      this.onAllNpcsArrived();
    });
  }

  setupInputListeners() {
    // Écouter les touches de mouvement spécifiques
    const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    
    this.keydownHandler = (event) => {
      if (movementKeys.includes(event.code)) {
        this.onPlayerInput();
      }
    };
    
    document.addEventListener('keydown', this.keydownHandler);
  }

  shouldShowTutorial() {
    return window.game && window.game.shouldShowTutorial();
  }

  markTutorialAsShown() {
    if (window.game) {
      window.game.markTutorialAsShown();
    }
  }

  onPlayerArrivedAtDestination() {
    this.playerArrivedAtDestination = true;
    
    console.log('📝 Tutorial: Joueur arrivé à destination');
    
    if (this.shouldShowTutorial()) {
      this.showYouText();
      console.log('📝 Tutorial: Affichage de "you" sous le joueur');
    } else {
      console.log('📝 Tutorial: Pas de tutorial - émission directe');
      this.emitTutorialFinished();
    }
  }

  onAllNpcsArrived() {
    this.allNpcsArrived = true;
    
    console.log('📝 Tutorial: Tous les NPCs sont arrivés');
    
    if (this.shouldShowTutorial() && this.youTextShown) {
      this.showThemText();
      console.log('📝 Tutorial: Affichage de "them" sous les NPCs');
      
      // Marquer le tutorial comme affiché
      this.markTutorialAsShown();
    }
  }

  showYouText() {
    const player = this.getPlayer();
    if (!player || !player.sprite) {
      console.warn('📝 WARN: Impossible d\'afficher "you" - pas de joueur trouvé');
      return;
    }
    
    // 🎯 VÉRIFIER QUE CAVEAT EST PRÊTE avant de l'utiliser
    if (!this.isCaveatFontReady()) {
      console.warn('📝 WARN: Police Caveat pas encore prête - report de l\'affichage');
      // Reporter l'affichage de 200ms
      this.scene.time.delayedCall(200, () => this.showYouText());
      return;
    }
    
    const offsetY = 75; // Distance sous le joueur
    const x = player.sprite.x-5;
    const y = player.sprite.y + offsetY;
    
    console.log(`📝 Création texte "you" à (${x.toFixed(1)}, ${y.toFixed(1)}) - Caveat confirmée prête`);
    
    this.floatingTextBehavior.createText('tutorial-you', 'you', x, y, {
      fontFamily: 'Caveat',
      fontSize: 40,
      autoHideOnPlayerMovement: false
    });
    
    // Stocker la position pour l'image tutorial
    this.youTextPosition = { x, y };
    
    // Jouer le son splat
    this.playSplatSound();
    
    this.youTextShown = true;
    
    // Vérifier si on peut afficher l'image tutorial
    this.checkAndShowTutorialImage();
  }

  showThemText() {
    const npcSpawner = this.getNpcSpawner();
    if (!npcSpawner) {
      console.warn('📝 WARN: Impossible d\'afficher "them" - pas de npcSpawner trouvé');
      return;
    }
    
    // 🎯 VÉRIFIER QUE CAVEAT EST PRÊTE avant de l'utiliser
    if (!this.isCaveatFontReady()) {
      console.warn('📝 WARN: Police Caveat pas encore prête - report de l\'affichage');
      // Reporter l'affichage de 200ms
      this.scene.time.delayedCall(200, () => this.showThemText());
      return;
    }
    
    const centerPos = npcSpawner.getCenterPosition();
    const offsetY = 250; // Distance sous le centre du groupe
    const x = centerPos.x;
    const y = centerPos.y + offsetY;
    
    console.log(`📝 Création texte "them" à (${x.toFixed(1)}, ${y.toFixed(1)}) - Caveat confirmée prête`);
    
    this.floatingTextBehavior.createText('tutorial-them', 'them', x, y, {
      fontFamily: 'Caveat',
      fontSize: 40,
      autoHideOnPlayerMovement: false
    });
    
    // Jouer le son splat
    this.playSplatSound();
    
    this.themTextShown = true;
    
    // Vérifier si on peut afficher l'image tutorial
    this.checkAndShowTutorialImage();
  }

  playSplatSound() {
    // Accéder au SoundManager via la scene
    if (this.scene.soundManager) {
      this.scene.soundManager.playSplat();
    } else {
      console.warn('📝 WARN: SoundManager non disponible pour le son splat');
    }
  }

  checkAndShowTutorialImage() {
    console.log('📝 checkAndShowTutorialImage: youTextShown=', this.youTextShown, 'themTextShown=', this.themTextShown, 'youTextPosition=', this.youTextPosition);
    
    if (this.youTextShown && this.themTextShown && this.youTextPosition) {
      console.log('📝 Les deux textes sont affichés - affichage de l\'image tutorial avec délai');
      
      // Attendre 800ms puis afficher l'image tutorial à position fixe
      this.scene.time.delayedCall(800, () => {
        console.log('📝 Délai de 800ms écoulé - début fade-in tutorial.svg');
        this.showTutorialImage(
          this.youTextPosition.x,
          this.youTextPosition.y + 100 // 100px en dessous de "you"
        );
      });
    } else {
      console.log('📝 Conditions pas remplies pour afficher tutorial.svg');
    }
  }

  showTutorialImage(x, y) {
    console.log('📝 showTutorialImage début - Contrôles ENCORE BLOQUÉS');
    
    // Détruire l'ancienne image si elle existe
    this.hideTutorialImage('tutorial-controls');
    
    // Créer l'image Phaser
    const tutorialImage = this.scene.add.image(x, y, 'tutorial');
    tutorialImage.setOrigin(0.5, 0.5);
    tutorialImage.setDepth(1000);
    tutorialImage.setAlpha(0); // Commencer invisible pour le fade-in
    tutorialImage.setScale(0.7); // Légèrement plus petite
    
    // Stocker l'image
    this.tutorialImages.set('tutorial-controls', tutorialImage);
    
    console.log('📝 tutorial.svg créé - début fade-in 600ms');
    
    // Fade-in puis attendre input
    this.scene.tweens.add({
      targets: tutorialImage,
      alpha: 1,
      duration: 600, // 600ms de fade-in
      ease: 'Power2',
      onComplete: () => {
        console.log('📝 Fade-in tutorial.svg TERMINÉ - En attente input utilisateur');
        // Ne plus activer automatiquement - attendre l'input
      }
    });
    
    console.log(`📝 Image tutorial créée à (${x.toFixed(1)}, ${y.toFixed(1)}) avec fade-in`);
  }

  onPlayerInput() {
    console.log('📝 onPlayerInput: inputDetected =', this.inputDetected);
    console.log('📝 onPlayerInput: youTextShown =', this.youTextShown);
    console.log('📝 onPlayerInput: themTextShown =', this.themTextShown);
    
    // 🚫 NE PAS terminer le tutorial si le joueur est encore en intro !
    const player = this.getPlayer();
    if (player && player.playerState && player.playerState.getState() === 'intro') {
      return;
    }
    
    if (!this.inputDetected) {
      this.inputDetected = true;
      console.log('📝 Input joueur détecté - délai de 1s avant masquage');
      
      // Annuler le timer précédent si il existe
      this.cancelHideTimer();
      
      // Démarrer un timer de 1 seconde avant masquage
      this.hideTimer = this.scene.time.delayedCall(1000, () => {
        console.log('📝 TIMER EXPIRÉ - masquage des textes et images maintenant !');
        this.hideAllTexts();
        this.hideAllTutorialImages();
        this.hideTimer = null;
        
        // 🎯 NOUVEAU: Émettre l'event après avoir masqué
        this.emitTutorialFinished();
      });
      
      console.log('📝 Timer de 1s créé:', this.hideTimer);
    } else {
      console.log('📝 Input déjà détecté, timer déjà en cours');
    }
  }

  /**
   * 🎯 NOUVEAU: Émettre l'event "tutorialFinished"
   * Le niveau décidera quoi faire avec cet event
   */
  emitTutorialFinished() {
    if (this.tutorialFinished) return;
    
    this.tutorialFinished = true;
    console.log('📝 ✅ TUTORIAL TERMINÉ - Émission event "tutorialFinished"');
    
    // Annuler le fallback timer
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }
    
    // 🎯 ÉMETTRE L'EVENT - Le niveau prendra le relais
    this.scene.events.emit('tutorialFinished');
  }

  hideTutorialImage(id) {
    const image = this.tutorialImages.get(id);
    if (image) {
      // Fade-out léger
      this.scene.tweens.add({
        targets: image,
        alpha: 0,
        duration: 800, // 800ms de fade-out (même durée que les textes)
        ease: 'Power2',
        onComplete: () => {
          image.destroy();
          this.tutorialImages.delete(id);
          console.log(`📝 Image tutorial fade-out terminé: ${id}`);
        }
      });
      console.log(`📝 Image tutorial fade-out démarré: ${id}`);
    }
  }

  hideAllTutorialImages() {
    console.log('📝 hideAllTutorialImages: Tentative de masquage des images');
    console.log('📝 hideAllTutorialImages: Images disponibles:', Array.from(this.tutorialImages.keys()));
    
    this.tutorialImages.forEach((image, id) => {
      console.log(`📝 Début fade-out de l'image: ${id}`);
      this.hideTutorialImage(id); // Utilise la méthode avec fade-out
    });
    
    console.log('📝 hideAllTutorialImages: Fade-out de toutes les images démarré');
  }

  hideAllTexts() {
    console.log('📝 hideAllTexts: Tentative de masquage des textes');
    console.log('📝 hideAllTexts: Textes disponibles:', this.floatingTextBehavior.getStatus());
    
    this.floatingTextBehavior.hideText('tutorial-you');
    this.floatingTextBehavior.hideText('tutorial-them');
    
    console.log('📝 hideAllTexts: Commandes de masquage envoyées');
  }

  cancelHideTimer() {
    if (this.hideTimer) {
      this.hideTimer.destroy();
      this.hideTimer = null;
      console.log('📝 Timer de masquage annulé');
    }
  }

  update(delta) {
    // Mettre à jour les textes flottants
    this.floatingTextBehavior.update(delta);
    
    // Détection de mouvement pour tutorial
    this.detectPlayerMovement();
  }

  detectPlayerMovement() {
    const player = this.getPlayer();
    if (!player) return;

    // 🚫 NE PAS détecter le mouvement pendant l'intro !
    if (player.playerState && player.playerState.getState() === 'intro') {
      return;
    }

    // Ne détecter le mouvement que si des textes sont affichés et pas encore d'input détecté
    if (this.inputDetected) {
      return; // Input déjà détecté, ne plus surveiller
    }
    
    if (!this.youTextShown && !this.themTextShown) {
      return; // Pas de textes à surveiller
    }

    const currentPosition = { x: player.sprite.x, y: player.sprite.y };

    if (this.lastPlayerPosition) {
      const deltaX = Math.abs(currentPosition.x - this.lastPlayerPosition.x);
      const deltaY = Math.abs(currentPosition.y - this.lastPlayerPosition.y);
      const totalMovement = deltaX + deltaY;

      if (totalMovement > this.playerMovementThreshold) {
        console.log(`📝 Mouvement détecté! Distance: ${totalMovement.toFixed(2)}px`);
        this.onPlayerInput(); // Déclencher la logique de masquage avec délai
      }
      
      // Mettre à jour la position
      this.lastPlayerPosition = currentPosition;
    } else {
      // Initialiser la position
      this.lastPlayerPosition = currentPosition;
      console.log('📝 Position joueur initialisée pour tutorial:', currentPosition);
    }
  }

  /**
   * 🎯 VÉRIFIER QUE LA POLICE CAVEAT EST PRÊTE
   * Utilise l'API document.fonts pour vérifier si Caveat est chargée
   */
  isCaveatFontReady() {
    // Utiliser UNIQUEMENT le flag de chargement explicite pour éviter les faux positifs de document.fonts.check
    return !!(this.scene && this.scene.caveatFontLoaded);
  }

  getPlayer() {
    return this.scene.currentLevel?.player || null;
  }
  
  getNpcSpawner() {
    return this.scene.currentLevel?.npcSpawner || null;
  }

  destroy() {
    // Nettoyer les event listeners
    document.removeEventListener('keydown', this.keydownHandler);
    
    // Nettoyer les images
    this.tutorialImages.forEach(image => image.destroy());
    this.tutorialImages.clear();
    
    // Nettoyer les timers
    if (this.hideTimer) {
      this.hideTimer.destroy();
    }
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
    }
    
    // Annuler le timer de masquage
    this.cancelHideTimer();
    
    // Nettoyer behavior
    if (this.floatingTextBehavior) {
      this.floatingTextBehavior.destroy();
    }
    
    console.log('📝 TutorialTextManager détruit');
  }
} 