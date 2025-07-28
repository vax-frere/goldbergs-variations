import Phaser from 'phaser';

/**
 * 🎵 SCENE PERSISTANTE pour le son d'ambiance
 * Cette scène ne redémarre JAMAIS - elle coexiste avec GameScene
 */
export class AmbientScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AmbientScene' });
    this.ambientSound = null;
    this.isInitialized = false;
  }

  preload() {
    // 🎵 Charger le son d'ambiance
    this.load.audio('ambient', 'sounds/ambiant.mp3');
    console.log('🎵 AmbientScene: Chargement ambiant.mp3');
  }

  create() {
    console.log('🎵 AmbientScene: Initialisation');
    
    // 🎯 CRÉER et DÉMARRER le son d'ambiance
    this.initAmbientSound();
    
    // 🎯 MARQUER comme initialisé
    this.isInitialized = true;
    
    // 🎯 EXPOSER globalement pour debug/contrôle
    window.ambientScene = this;
    
    console.log('✅ AmbientScene: Son d\'ambiance actif et persistant');
    
    // 🎮 DÉMARRER GameScene maintenant que l'ambiance est prête
    console.log('🎮 AmbientScene: Lancement de GameScene...');
    this.scene.start('GameScene');
  }

  /**
   * 🎵 Initialiser le son d'ambiance
   */
  initAmbientSound() {
    if (this.ambientSound) {
      console.log('🎵 Son d\'ambiance déjà créé');
      return;
    }

    try {
      // Créer le son avec les paramètres parfaits
      this.ambientSound = this.sound.add('ambient', {
        volume: 0.025,  // Très léger comme demandé
        loop: true     // Boucle infinie
      });

      // Démarrer immédiatement
      this.ambientSound.play();
      
      console.log('🎵 Son d\'ambiance démarré - Volume: 0.15, Boucle: ∞');
      console.log('🎯 Scene persistante: JAMAIS de coupure !');
      
    } catch (error) {
      console.error('❌ Erreur création son d\'ambiance:', error);
    }
  }

  /**
   * 🔊 Contrôles du son d'ambiance
   */
  setVolume(volume) {
    if (this.ambientSound) {
      this.ambientSound.setVolume(volume);
      console.log(`🎵 Volume ambiance: ${volume}`);
    }
  }

  mute() {
    if (this.ambientSound) {
      this.ambientSound.setMute(true);
      console.log('🔇 Ambiance muette');
    }
  }

  unmute() {
    if (this.ambientSound) {
      this.ambientSound.setMute(false);
      console.log('🔊 Ambiance rétablie');
    }
  }

  /**
   * ⚠️ Cette scène ne doit JAMAIS être détruite !
   */
  destroy() {
    console.warn('⚠️ AmbientScene.destroy() appelé - IGNORÉ pour préserver l\'ambiance');
    // Volontairement vide - on ne détruit jamais cette scène !
  }
} 