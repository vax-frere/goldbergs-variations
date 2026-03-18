import Phaser from 'phaser';

/**
 * 🎵 SCENE PERSISTANTE pour le son d'ambiance
 * Cette scène ne redémarre JAMAIS - elle coexiste avec GameScene
 */
export class AmbientScene extends Phaser.Scene {
  ambientSound: any;
  isInitialized: boolean;

  constructor() {
    super({ key: 'AmbientScene' });
    this.ambientSound = null;
    this.isInitialized = false;
  }

  preload(): void {
    this.load.audio('ambient', 'sounds/trolling-game/crowd.mp3');
    console.log('🎵 AmbientScene: Chargement crowd.mp3');
  }

  create(): void {
    console.log('🎵 AmbientScene: Initialisation');

    this.initAmbientSound();

    this.isInitialized = true;

    (window as any).ambientScene = this;

    console.log("✅ AmbientScene: Son d'ambiance actif et persistant");

    console.log('🎮 AmbientScene: Lancement de GameScene...');
    this.scene.start('GameScene', { targetLevel: 'scapegoat' });
  }

  initAmbientSound(): void {
    if (this.ambientSound) {
      console.log("🎵 Son d'ambiance déjà créé");
      return;
    }

    try {
      this.ambientSound = this.sound.add('ambient', {
        volume: 0.075,
        loop: true,
      });

      this.ambientSound.play();

      console.log('🎵 Son d\'ambiance démarré - Volume: 0.15, Boucle: ∞');
      console.log('🎯 Scene persistante: JAMAIS de coupure !');
    } catch (error) {
      console.error('❌ Erreur création son d\'ambiance:', error);
    }
  }

  setVolume(volume: number): void {
    if (this.ambientSound) {
      this.ambientSound.setVolume(volume);
      console.log(`🎵 Volume ambiance: ${volume}`);
    }
  }

  mute(): void {
    if (this.ambientSound) {
      this.ambientSound.setMute(true);
      console.log('🔇 Ambiance muette');
    }
  }

  unmute(): void {
    if (this.ambientSound) {
      this.ambientSound.setMute(false);
      console.log('🔊 Ambiance rétablie');
    }
  }

  destroy(): void {
    console.warn(
      "⚠️ AmbientScene.destroy() appelé - IGNORÉ pour préserver l'ambiance"
    );
  }
}
