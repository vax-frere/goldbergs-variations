import { FloatingTextBehavior } from '../entities/behaviors/FloatingTextBehavior';

/**
 * 🎯 SOLID REFACTOR: TutorialTextManager complet mais découplé
 * Responsabilité : gérer l'affichage complet du tutorial (you, them, image)
 * Émet des events - NE CONTRÔLE PLUS les états du joueur
 */
export class TutorialTextManager {
  scene: any;
  floatingTextBehavior: any;
  playerArrivedAtDestination: boolean = false;
  allNpcsArrived: boolean = false;
  tutorialShown: boolean = false;
  inputDetected: boolean = false;
  youTextShown: boolean = false;
  themTextShown: boolean = false;
  hideTimer: any = null;
  tutorialFinished: boolean = false;
  lastPlayerPosition: { x: number; y: number } | null = null;
  playerMovementThreshold: number = 0.1;
  tutorialImages: Map<string, any> = new Map();
  youTextPosition: { x: number; y: number } | null = null;
  keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  fallbackTimer: any = null;

  constructor(scene: any) {
    this.scene = scene;
    this.floatingTextBehavior = new FloatingTextBehavior(scene);

    this.setupEventListeners();
    this.setupInputListeners();
    this.setupFallbackTimer();
  }

  setupFallbackTimer(): void {
    this.fallbackTimer = this.scene.time.delayedCall(10000, () => {
      if (!this.tutorialFinished) {
        console.log('🎮 FALLBACK: Tutorial timeout - émission tutorialFinished');
        this.emitTutorialFinished();
      }
    });
  }

  setupEventListeners(): void {
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

  setupInputListeners(): void {
    const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];

    this.keydownHandler = (event: KeyboardEvent) => {
      if (movementKeys.includes(event.code)) {
        this.onPlayerInput();
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  shouldShowTutorial(): boolean {
    return !!(window as any).game && (window as any).game.shouldShowTutorial();
  }

  markTutorialAsShown(): void {
    if ((window as any).game) {
      (window as any).game.markTutorialAsShown();
    }
  }

  onPlayerArrivedAtDestination(): void {
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

  onAllNpcsArrived(): void {
    this.allNpcsArrived = true;

    console.log('📝 Tutorial: Tous les NPCs sont arrivés');

    if (this.shouldShowTutorial() && this.youTextShown) {
      this.showThemText();
      console.log('📝 Tutorial: Affichage de "them" sous les NPCs');

      this.markTutorialAsShown();
    }
  }

  showYouText(): void {
    const player = this.getPlayer();
    if (!player || !player.sprite) {
      console.warn('📝 WARN: Impossible d\'afficher "you" - pas de joueur trouvé');
      return;
    }

    if (!this.isCaveatFontReady()) {
      console.warn('📝 WARN: Police Caveat pas encore prête - report de l\'affichage');
      this.scene.time.delayedCall(200, () => this.showYouText());
      return;
    }

    const offsetY = 75;
    const x = player.sprite.x - 5;
    const y = player.sprite.y + offsetY;

    console.log(`📝 Création texte "you" à (${x.toFixed(1)}, ${y.toFixed(1)}) - Caveat confirmée prête`);

    this.floatingTextBehavior.createText('tutorial-you', 'you', x, y, {
      fontFamily: 'Caveat',
      fontSize: 40,
      autoHideOnPlayerMovement: false,
    });

    this.youTextPosition = { x, y };

    this.playSplatSound();

    this.youTextShown = true;

    this.checkAndShowTutorialImage();
  }

  showThemText(): void {
    const npcSpawner = this.getNpcSpawner();
    if (!npcSpawner) {
      console.warn('📝 WARN: Impossible d\'afficher "them" - pas de npcSpawner trouvé');
      return;
    }

    if (!this.isCaveatFontReady()) {
      console.warn('📝 WARN: Police Caveat pas encore prête - report de l\'affichage');
      this.scene.time.delayedCall(200, () => this.showThemText());
      return;
    }

    const centerPos = npcSpawner.getCenterPosition();
    const offsetY = 250;
    const x = centerPos.x;
    const y = centerPos.y + offsetY;

    console.log(`📝 Création texte "them" à (${x.toFixed(1)}, ${y.toFixed(1)}) - Caveat confirmée prête`);

    this.floatingTextBehavior.createText('tutorial-them', 'them', x, y, {
      fontFamily: 'Caveat',
      fontSize: 40,
      autoHideOnPlayerMovement: false,
    });

    this.playSplatSound();

    this.themTextShown = true;

    this.checkAndShowTutorialImage();
  }

  playSplatSound(): void {
    if (this.scene.soundManager) {
      this.scene.soundManager.playSplat();
    } else {
      console.warn('📝 WARN: SoundManager non disponible pour le son splat');
    }
  }

  checkAndShowTutorialImage(): void {
    console.log('📝 checkAndShowTutorialImage: youTextShown=', this.youTextShown, 'themTextShown=', this.themTextShown, 'youTextPosition=', this.youTextPosition);

    if (this.youTextShown && this.themTextShown && this.youTextPosition) {
      console.log('📝 Les deux textes sont affichés - affichage de l\'image tutorial avec délai');

      this.scene.time.delayedCall(800, () => {
        console.log('📝 Délai de 800ms écoulé - début fade-in tutorial.svg');
        this.showTutorialImage(
          this.youTextPosition!.x,
          this.youTextPosition!.y + 100
        );
      });
    } else {
      console.log('📝 Conditions pas remplies pour afficher tutorial.svg');
    }
  }

  showTutorialImage(x: number, y: number): void {
    console.log('📝 showTutorialImage début - Contrôles ENCORE BLOQUÉS');

    this.hideTutorialImage('tutorial-controls');

    const tutorialImage = this.scene.add.image(x, y, 'tutorial');
    tutorialImage.setOrigin(0.5, 0.5);
    tutorialImage.setDepth(1000);
    tutorialImage.setAlpha(0);
    tutorialImage.setScale(0.7);

    this.tutorialImages.set('tutorial-controls', tutorialImage);

    console.log('📝 tutorial.svg créé - début fade-in 600ms');

    this.scene.tweens.add({
      targets: tutorialImage,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        console.log('📝 Fade-in tutorial.svg TERMINÉ - En attente input utilisateur');
      },
    });

    console.log(`📝 Image tutorial créée à (${x.toFixed(1)}, ${y.toFixed(1)}) avec fade-in`);
  }

  onPlayerInput(): void {
    console.log('📝 onPlayerInput: inputDetected =', this.inputDetected);
    console.log('📝 onPlayerInput: youTextShown =', this.youTextShown);
    console.log('📝 onPlayerInput: themTextShown =', this.themTextShown);

    const player = this.getPlayer();
    if (player && player.playerState && player.playerState.getState() === 'intro') {
      return;
    }

    if (!this.inputDetected) {
      this.inputDetected = true;
      console.log('📝 Input joueur détecté - délai de 1s avant masquage');

      this.cancelHideTimer();

      this.hideTimer = this.scene.time.delayedCall(1000, () => {
        console.log('📝 TIMER EXPIRÉ - masquage des textes et images maintenant !');
        this.hideAllTexts();
        this.hideAllTutorialImages();
        this.hideTimer = null;

        this.emitTutorialFinished();
      });

      console.log('📝 Timer de 1s créé:', this.hideTimer);
    } else {
      console.log('📝 Input déjà détecté, timer déjà en cours');
    }
  }

  emitTutorialFinished(): void {
    if (this.tutorialFinished) return;

    this.tutorialFinished = true;
    console.log('📝 ✅ TUTORIAL TERMINÉ - Émission event "tutorialFinished"');

    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
      this.fallbackTimer = null;
    }

    this.scene.events.emit('tutorialFinished');
  }

  hideTutorialImage(id: string): void {
    const image = this.tutorialImages.get(id);
    if (image) {
      this.scene.tweens.add({
        targets: image,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          image.destroy();
          this.tutorialImages.delete(id);
          console.log(`📝 Image tutorial fade-out terminé: ${id}`);
        },
      });
      console.log(`📝 Image tutorial fade-out démarré: ${id}`);
    }
  }

  hideAllTutorialImages(): void {
    console.log('📝 hideAllTutorialImages: Tentative de masquage des images');
    console.log('📝 hideAllTutorialImages: Images disponibles:', Array.from(this.tutorialImages.keys()));

    this.tutorialImages.forEach((image, id) => {
      console.log(`📝 Début fade-out de l'image: ${id}`);
      this.hideTutorialImage(id);
    });

    console.log('📝 hideAllTutorialImages: Fade-out de toutes les images démarré');
  }

  hideAllTexts(): void {
    console.log('📝 hideAllTexts: Tentative de masquage des textes');
    console.log('📝 hideAllTexts: Textes disponibles:', this.floatingTextBehavior.getStatus());

    this.floatingTextBehavior.hideText('tutorial-you');
    this.floatingTextBehavior.hideText('tutorial-them');

    console.log('📝 hideAllTexts: Commandes de masquage envoyées');
  }

  cancelHideTimer(): void {
    if (this.hideTimer) {
      this.hideTimer.destroy();
      this.hideTimer = null;
      console.log('📝 Timer de masquage annulé');
    }
  }

  update(delta: number): void {
    this.floatingTextBehavior.update(delta);

    this.detectPlayerMovement();
  }

  detectPlayerMovement(): void {
    const player = this.getPlayer();
    if (!player) return;

    if (player.playerState && player.playerState.getState() === 'intro') {
      return;
    }

    if (this.inputDetected) {
      return;
    }

    if (!this.youTextShown && !this.themTextShown) {
      return;
    }

    const currentPosition = { x: player.sprite.x, y: player.sprite.y };

    if (this.lastPlayerPosition) {
      const deltaX = Math.abs(currentPosition.x - this.lastPlayerPosition.x);
      const deltaY = Math.abs(currentPosition.y - this.lastPlayerPosition.y);
      const totalMovement = deltaX + deltaY;

      if (totalMovement > this.playerMovementThreshold) {
        console.log(`📝 Mouvement détecté! Distance: ${totalMovement.toFixed(2)}px`);
        this.onPlayerInput();
      }

      this.lastPlayerPosition = currentPosition;
    } else {
      this.lastPlayerPosition = currentPosition;
      console.log('📝 Position joueur initialisée pour tutorial:', currentPosition);
    }
  }

  isCaveatFontReady(): boolean {
    return !!(this.scene && this.scene.caveatFontLoaded);
  }

  getPlayer(): any {
    return this.scene.currentLevel?.player || null;
  }

  getNpcSpawner(): any {
    return this.scene.currentLevel?.npcSpawner || null;
  }

  destroy(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }

    this.tutorialImages.forEach((image) => image.destroy());
    this.tutorialImages.clear();

    if (this.hideTimer) {
      this.hideTimer.destroy();
    }
    if (this.fallbackTimer) {
      this.fallbackTimer.destroy();
    }

    this.cancelHideTimer();

    if (this.floatingTextBehavior) {
      this.floatingTextBehavior.destroy();
    }

    console.log('📝 TutorialTextManager détruit');
  }
}
