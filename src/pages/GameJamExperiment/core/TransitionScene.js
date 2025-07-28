import Phaser from 'phaser';

export class TransitionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TransitionScene' });
  }

  preload() {
    // Les assets sont déjà chargés dans GameScene
    // Pas besoin de recharger ici
  }

  create() {
    // Récupérer les données de transition passées depuis la scène précédente
    const transitionData = this.scene.settings.data || {};
    const { targetLevel = 'level2', levelTitle = 'Niveau 2' } = transitionData;
    
    // Créer l'overlay de transition
    this.createTransitionOverlay(levelTitle);
    
    // Jouer le son de transition
    this.playTransitionSound();
    
    // Démarrer l'animation de transition
    this.startTransitionAnimation(targetLevel);
  }

  createTransitionOverlay(levelTitle) {
    // Fond noir qui couvre tout l'écran
    this.overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
    this.overlay.setDepth(1000);
    
    // Créer les lettres individuelles pour l'animation staggered
    this.letterObjects = [];
    this.createLetterByLetterTitle(levelTitle);
  }

  createLetterByLetterTitle(levelTitle) {
    // Configuration du texte
    const fontSize = 40;
    const letterSpacing = 24;
    const spaceWidth = 16; // Largeur pour les espaces
    
    // Calculer la largeur totale pour centrer
    let totalWidth = 0;
    for (let i = 0; i < levelTitle.length; i++) {
      totalWidth += levelTitle[i] === ' ' ? spaceWidth : letterSpacing;
    }
    
    const startX = 400 - totalWidth / 2;
    const startY = 300;
    let currentX = startX;
    
    // Créer chaque lettre individuellement
    for (let i = 0; i < levelTitle.length; i++) {
      const letter = levelTitle[i];
      
      // Gérer les espaces différemment
      if (letter === ' ') {
        currentX += spaceWidth;
        continue;
      }
      
      // Créer l'objet texte pour la lettre
      const letterObj = this.add.text(currentX, startY, letter, {
        fontSize: `${fontSize}px`,
        fill: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold'
      });
      
      letterObj.setOrigin(0.5, 0.5);
      letterObj.setDepth(1001);
      letterObj.setAlpha(0); // Invisible au début
      
      // Stocker les propriétés pour l'animation
      letterObj.originalY = startY;
      letterObj.letterIndex = i;
      
      this.letterObjects.push(letterObj);
      currentX += letterSpacing;
    }
  }

  playTransitionSound() {
    try {
      // Son de transition (si disponible)
      if (this.sound.get('transition-sound')) {
        this.sound.play('transition-sound', { volume: 0.5, rate: 1.2 }); // Volume plus fort et plus rapide
      }
    } catch (error) {
      console.log('Son de transition non disponible, on continue sans son');
    }
  }

  startTransitionAnimation(targetLevel) {
    // Phase 1: Fade in de l'overlay (plus rapide)
    this.tweens.add({
      targets: this.overlay,
      alpha: 1,
      duration: 200, // Réduit de 300ms à 200ms
      ease: 'Power2',
      onComplete: () => {
        // Phase 2: Animation des lettres staggered
        this.animateLettersStaggered(targetLevel);
      }
    });
  }

  animateLettersStaggered(targetLevel) {
    // Délai entre chaque lettre (en millisecondes) - plus rapide
    const staggerDelay = 30; // Réduit de 50ms à 30ms
    
    // Animer chaque lettre avec un délai progressif
    this.letterObjects.forEach((letterObj, index) => {
      // Délai pour cette lettre
      const delay = index * staggerDelay;
      
      // Phase 1: Apparition + montée subtile
      this.time.delayedCall(delay, () => {
        // Rendre la lettre visible
        letterObj.setAlpha(1);
        
        // Animation: montée subtile puis retour à la position normale
        this.tweens.add({
          targets: letterObj,
          y: letterObj.originalY - 10, // Mouvement encore plus subtil (10px au lieu de 15px)
          duration: 100, // Plus rapide (100ms au lieu de 150ms)
          ease: 'Power1.easeOut',
          onComplete: () => {
            // Phase 2: Redescendre à la position finale
            this.tweens.add({
              targets: letterObj,
              y: letterObj.originalY,
              duration: 120, // Plus rapide (120ms au lieu de 200ms)
              ease: 'Power1.easeOut'
            });
          }
        });
      });
    });
    
    // Calculer le temps total d'animation - beaucoup plus court
    const totalAnimationTime = (this.letterObjects.length * staggerDelay) + 250; // Réduit de 400ms à 250ms
    
    // Attendre la fin de l'animation puis charger directement le niveau
    this.time.delayedCall(totalAnimationTime, () => {
      this.loadLevel(targetLevel);
    });
  }

  loadLevel(targetLevel) {
    // Jouer le son d'entrée de niveau
    try {
      if (this.sound.get('level-enter')) {
        this.sound.play('level-enter', { volume: 0.4 });
      }
    } catch (error) {
      console.log('Son d\'entrée de niveau non disponible');
    }
    
        // Charger directement le niveau sans animation de sortie
    this.scene.start('GameScene', { targetLevel });
  }
} 