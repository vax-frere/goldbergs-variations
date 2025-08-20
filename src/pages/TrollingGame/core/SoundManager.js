export class SoundManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // Charger et créer tous les sons de footsteps
    this.createFootstepSounds();
    
    this.isInitialized = true;
    console.log('🔊 SoundManager initialisé');
  }

  createFootstepSounds() {
    const footstepSounds = [];
    
    // Créer les 11 sons de pas
    for (let i = 1; i <= 11; i++) {
      const sound = this.scene.sound.add(`foot-${i}`, { volume: 0.1 });
      footstepSounds.push(sound);
    }
    
    this.sounds.set('footsteps', footstepSounds);
    
    // Créer le son de cri
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

  getRandomFootstep() {
    const footsteps = this.sounds.get('footsteps');
    if (!footsteps || footsteps.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * footsteps.length);
    return footsteps[randomIndex];
  }

  playRandomFootstep() {
    const footstep = this.getRandomFootstep();
    if (footstep) {
      footstep.play();
      return footstep;
    }
    return null;
  }

  playCry() {
    const crySound = this.sounds.get('cry');
    if (!crySound) return null;
    
    
    // Jouer avec le volume fixe
    crySound.play();
    
    console.log(`🔊 Cri joué`);
    return crySound;
  }

  playTouch() {
    const touchSound = this.sounds.get('touch');
    if (!touchSound) return null;
    
    touchSound.play();
    console.log('🔊 Son touch joué (NPC commence à suivre)');
    return touchSound;
  }

  playClaps() {
    const clapsSound = this.sounds.get('claps');
    if (!clapsSound) return null;
    
    clapsSound.play();
    console.log('🔊 Son claps joué (célébration outro)');
    return clapsSound;
  }

  playSplat() {
    const splatSound = this.sounds.get('splat');
    if (!splatSound) return null;
    
    splatSound.play();
    console.log('🔊 Son splat joué (tutorial text)');
    return splatSound;
  }

  stopAllSounds() {
    // Arrêter tous les sons de cette scène
    this.sounds.forEach(soundArray => {
      if (Array.isArray(soundArray)) {
        soundArray.forEach(sound => sound.stop());
      } else {
        soundArray.stop();
      }
    });
    
    // 🎵 NOTE: Son d'ambiance dans AmbientScene (scène séparée) - non affecté
    console.log('🔇 Sons du niveau arrêtés');
  }

  destroy() {
    this.stopAllSounds();
    this.sounds.clear();
    this.isInitialized = false;
  }
} 