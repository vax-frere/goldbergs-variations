import * as THREE from "three";
import { create } from "zustand";

// Variables pour le système de son positionnel
let audioListener = null;
let audioLoader = null;
let audioBuffers = {}; // Stocker plusieurs buffers

// Fonction pour initialiser le système audio positionnel
const initializePositionalAudio = (camera) => {
  if (typeof window !== "undefined" && camera && !audioListener) {
    try {
      // Créer l'AudioListener et l'attacher à la caméra
      audioListener = new THREE.AudioListener();
      camera.add(audioListener);

      // Créer l'AudioLoader
      audioLoader = new THREE.AudioLoader();

      console.log("AudioService: Positional audio system initialized");
    } catch (error) {
      console.warn(
        "AudioService: Could not initialize positional audio:",
        error
      );
    }
  }
};

// Fonction pour charger un fichier audio
const loadAudioBuffer = (soundPath, soundKey) => {
  if (!audioLoader || audioBuffers[soundKey]) {
    return; // Déjà chargé ou pas d'audioLoader
  }

  audioLoader.load(
    soundPath,
    (buffer) => {
      audioBuffers[soundKey] = buffer;
      console.log(`AudioService: ${soundKey} buffer loaded successfully`);
    },
    undefined,
    (error) => {
      console.warn(`AudioService: Could not load ${soundKey}:`, error);
    }
  );
};

// Fonction pour jouer un son positionnel
const playPositionalSound = (soundKey, volume = 0.25, position = null) => {
  if (!audioListener || !audioBuffers[soundKey]) {
    console.warn(
      `AudioService: Cannot play ${soundKey} - not loaded or no listener`,
      { audioListener: !!audioListener, buffer: !!audioBuffers[soundKey] }
    );
    return null;
  }

  try {
    // Créer une nouvelle instance Audio pour chaque son
    const sound = new THREE.Audio(audioListener);
    sound.setBuffer(audioBuffers[soundKey]);
    sound.setVolume(volume);

    // Si une position est fournie, utiliser PositionalAudio
    if (position) {
      const positionalSound = new THREE.PositionalAudio(audioListener);
      positionalSound.setBuffer(audioBuffers[soundKey]);
      positionalSound.setVolume(volume);
      positionalSound.position.copy(position);

      // Jouer le son
      positionalSound.play();

      // Nettoyer automatiquement quand le son se termine
      positionalSound.onEnded = () => {
        positionalSound.disconnect();
      };

      return positionalSound;
    } else {
      // Son non-positionnel (global)
      sound.play();

      // Nettoyer automatiquement quand le son se termine
      sound.onEnded = () => {
        sound.disconnect();
      };

      return sound;
    }
  } catch (error) {
    console.warn(`AudioService: Could not play ${soundKey}:`, error);
    return null;
  }
};

/**
 * Service centralisé pour gérer l'audio positionnel
 * Utilise Zustand pour fournir un état global et des méthodes utilitaires
 */
const useAudioService = create((set, get) => ({
  // État du service
  isInitialized: false,
  loadedSounds: {},

  /**
   * Initialise le système audio positionnel
   * @param {THREE.Camera} camera - Caméra à laquelle attacher l'AudioListener
   */
  initializeAudio: (camera) => {
    initializePositionalAudio(camera);

    // Charger les sons par défaut
    loadAudioBuffer("/sounds/hover.mp3", "hover");
    loadAudioBuffer("/sounds/cluster-off.mp3", "clusterOff");

    set({ isInitialized: true });
  },

  /**
   * Charge un nouveau fichier audio
   * @param {string} soundPath - Chemin vers le fichier audio
   * @param {string} soundKey - Clé pour identifier le son
   */
  loadSound: (soundPath, soundKey) => {
    loadAudioBuffer(soundPath, soundKey);
    set((state) => ({
      loadedSounds: { ...state.loadedSounds, [soundKey]: soundPath },
    }));
  },

  /**
   * Joue un son hover
   */
  playHoverSound: () => {
    return playPositionalSound("hover", 0.25);
  },

  /**
   * Joue le son de cluster visité
   */
  playClusterOffSound: () => {
    return playPositionalSound("clusterOff", 0.1);
  },

  /**
   * Joue un son personnalisé
   * @param {string} soundKey - Clé du son à jouer
   * @param {number} volume - Volume (0-1)
   * @param {THREE.Vector3} position - Position 3D optionnelle pour l'audio positionnel
   */
  playSound: (soundKey, volume = 0.25, position = null) => {
    return playPositionalSound(soundKey, volume, position);
  },

  /**
   * Vérifie si un son est chargé
   * @param {string} soundKey - Clé du son
   * @returns {boolean}
   */
  isSoundLoaded: (soundKey) => {
    return !!audioBuffers[soundKey];
  },

  /**
   * Obtient la liste des sons chargés
   * @returns {Object}
   */
  getLoadedSounds: () => {
    return { ...get().loadedSounds };
  },
}));

export default useAudioService;
