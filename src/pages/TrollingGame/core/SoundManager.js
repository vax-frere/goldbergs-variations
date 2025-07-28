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
    const crySound = this.scene.sound.add('cry', { volume: 0.6 });
    this.sounds.set('cry', crySound);
    
    // Créer le son de touch (quand un NPC commence à suivre)
    const touchSound = this.scene.sound.add('touch', { volume: 0.1 });
    this.sounds.set('touch', touchSound);
    
    // Créer le son de célébration pour l'outro
    const clapsSound = this.scene.sound.add('claps', { volume: 0.7 });
    this.sounds.set('claps', clapsSound);
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

  playCry(force = 1.0) {
    const crySound = this.sounds.get('cry');
    if (!crySound) return null;
    
    // Calculer le volume basé sur la force (entre 0.3 et 1.0)
    const baseVolume = 0.3;
    const maxVolume = 1.0;
    const volumeRange = maxVolume - baseVolume;
    
    // Normaliser la force (généralement entre 1.0 et ~3.0)
    const normalizedForce = Math.max(0, Math.min(1, (force - 1.0) / 2.0));
    const finalVolume = baseVolume + (volumeRange * normalizedForce);
    
    // Jouer avec le volume calculé
    crySound.play({ volume: finalVolume });
    
    console.log(`🔊 Cri joué - Force: ${force.toFixed(2)}, Volume: ${finalVolume.toFixed(2)}`);
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