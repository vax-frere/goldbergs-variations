export class SoundManager {
  scene: any;
  sounds: Map<string, any>;
  isInitialized: boolean;

  constructor(scene: any) {
    this.scene = scene;
    this.sounds = new Map();
    this.isInitialized = false;
  }

  init(): void {
    if (this.isInitialized) return;

    // Charger et créer tous les sons de footsteps
    this.createFootstepSounds();

    this.isInitialized = true;
    console.log('🔊 SoundManager initialisé');
  }

  createFootstepSounds(): void {
    const footstepSounds: any[] = [];

    // Créer les 11 sons de pas
    for (let i = 1; i <= 11; i++) {
      const sound = this.scene.sound.add(`foot-${i}`, { volume: 0.1 });
      footstepSounds.push(sound);
    }

    this.sounds.set('footsteps', footstepSounds);

    // Créer les sons de cri d'enfants (child-shout)
    const childShoutSounds: any[] = [];
    for (let i = 1; i <= 4; i++) {
      const sound = this.scene.sound.add(`child-shout-${i}`, { volume: 0.1 });
      childShoutSounds.push(sound);
    }

    this.sounds.set('childShouts', childShoutSounds);

    // Créer le son de cri (legacy)
    const crySound = this.scene.sound.add('cry', { volume: 0.1 });
    this.sounds.set('cry', crySound);

    // Créer le son de touch (quand un NPC commence à suivre)
    const touchSound = this.scene.sound.add('touch', { volume: 0.1 });
    this.sounds.set('touch', touchSound);

    // Créer le son de célébration pour l'outro
    const clapsSound = this.scene.sound.add('claps', { volume: 0.4 });
    this.sounds.set('claps', clapsSound);

    // Créer le son splat pour les textes tutorial
    const splatSound = this.scene.sound.add('splat', { volume: 0.4 });
    this.sounds.set('splat', splatSound);
  }

  getRandomFootstep(): any {
    const footsteps = this.sounds.get('footsteps');
    if (!footsteps || footsteps.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * footsteps.length);
    return footsteps[randomIndex];
  }

  playRandomFootstep(): any {
    const footstep = this.getRandomFootstep();
    if (footstep) {
      footstep.play();
      return footstep;
    }
    return null;
  }

  getRandomChildShout(): any {
    const childShouts = this.sounds.get('childShouts');
    if (!childShouts || childShouts.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * childShouts.length);
    return childShouts[randomIndex];
  }

  playRandomChildShout(): any {
    const childShout = this.getRandomChildShout();
    if (childShout) {
      childShout.play();
      console.log(`🔊 Child shout joué aléatoirement`);
      return childShout;
    }
    return null;
  }

  /**
   * Jouer plusieurs child-shout pour les followers avec délais progressifs
   * @param count - Nombre de sons à jouer (max 4-5)
   */
  playMultipleChildShouts(count: number): any[] {
    const maxShouts = Math.min(count, 5); // Limiter à 5 maximum
    const playedSounds: any[] = [];

    for (let i = 0; i < maxShouts; i++) {
      const delay = i * 100; // 100ms entre chaque son

      setTimeout(() => {
        const childShout = this.getRandomChildShout();
        if (childShout) {
          childShout.play();
          playedSounds.push(childShout);
        }
      }, delay);
    }

    console.log(`🔊 ${maxShouts} child-shout joués avec délais progressifs`);
    return playedSounds;
  }

  playCry(): any {
    const crySound = this.sounds.get('cry');
    if (!crySound) return null;

    // Jouer avec le volume fixe
    crySound.play();

    console.log(`🔊 Cri joué`);
    return crySound;
  }

  playTouch(): any {
    const touchSound = this.sounds.get('touch');
    if (!touchSound) return null;

    touchSound.play();
    console.log('🔊 Son touch joué (NPC commence à suivre)');
    return touchSound;
  }

  playClaps(): any {
    const clapsSound = this.sounds.get('claps');
    if (!clapsSound) return null;

    clapsSound.play();
    console.log('🔊 Son claps joué (célébration outro)');
    return clapsSound;
  }

  playSplat(): any {
    const splatSound = this.sounds.get('splat');
    if (!splatSound) return null;

    splatSound.play();
    console.log('🔊 Son splat joué (tutorial text)');
    return splatSound;
  }

  stopAllSounds(): void {
    // Arrêter tous les sons de cette scène
    this.sounds.forEach((soundArray) => {
      if (Array.isArray(soundArray)) {
        soundArray.forEach((sound: any) => sound.stop());
      } else {
        soundArray.stop();
      }
    });

    // 🎵 NOTE: Son d'ambiance dans AmbientScene (scène séparée) - non affecté
    console.log('🔇 Sons du niveau arrêtés');
  }

  destroy(): void {
    this.stopAllSounds();
    this.sounds.clear();
    this.isInitialized = false;
  }
}
