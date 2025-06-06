import * as THREE from "three";
import { create } from "zustand";
import useGameStore from "../store";
import useAssetStore from "./AssetManager";

/**
 * Types de sons gérés par l'AudioManager
 */
export const AUDIO_TYPES = {
  AMBIENT: "ambient",
  SFX: "sfx",
  ACCELERATION: "acceleration",
  FRAGMENT: "fragment",
  POSITIONAL: "positional",
};

/**
 * Événements audio
 */
export const AUDIO_EVENTS = {
  SOUND_STARTED: "sound_started",
  SOUND_STOPPED: "sound_stopped",
  SOUND_LOADED: "sound_loaded",
  SOUND_ERROR: "sound_error",
  VOLUME_CHANGED: "volume_changed",
  SOUND_ENDED: "sound_ended",
};

/**
 * Configuration par défaut pour chaque type de son
 */
const DEFAULT_CONFIGS = {
  [AUDIO_TYPES.AMBIENT]: {
    loop: true,
    volume: 0.1,
    fadeInDuration: 2000,
    fadeOutDuration: 1000,
  },
  [AUDIO_TYPES.SFX]: {
    loop: false,
    volume: 0.25,
    fadeInDuration: 0,
    fadeOutDuration: 0,
  },
  [AUDIO_TYPES.ACCELERATION]: {
    loop: true,
    volume: 1.0,
    fadeInDuration: 100,
    fadeOutDuration: 200,
  },
  [AUDIO_TYPES.FRAGMENT]: {
    loop: false,
    volume: 0.7,
    fadeInDuration: 500,
    fadeOutDuration: 500,
  },
  [AUDIO_TYPES.POSITIONAL]: {
    loop: false,
    volume: 0.25,
    fadeInDuration: 0,
    fadeOutDuration: 0,
  },
};

/**
 * Classe pour gérer une instance audio
 */
class AudioInstance {
  constructor(id, type, config = {}) {
    this.id = id;
    this.type = type;
    this.config = { ...DEFAULT_CONFIGS[type], ...config };
    this.audioObject = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVolume = 0;
    this.targetVolume = this.config.volume;
    this.currentPitch = 1.0;
    this.targetPitch = 1.0;
    this.fadeInterval = null;
    this.listeners = new Set();
  }

  /**
   * Initialise l'objet audio THREE.js ou HTML5
   */
  initialize(audioListener, buffer, isPositional = false, position = null) {
    if (isPositional && audioListener) {
      this.audioObject = new THREE.PositionalAudio(audioListener);
      if (position) {
        this.audioObject.position.copy(position);
      }
    } else if (audioListener) {
      this.audioObject = new THREE.Audio(audioListener);
    } else {
      // Fallback HTML5 Audio pour les fragments
      this.audioObject = new Audio();
      this.audioObject.src = buffer; // buffer est une URL dans ce cas
    }

    if (this.audioObject.setBuffer && buffer instanceof AudioBuffer) {
      this.audioObject.setBuffer(buffer);
    }

    this.audioObject.setLoop(this.config.loop);
    this.audioObject.setVolume(0); // Commencer à 0 pour le fade-in

    return this;
  }

  /**
   * Démarre la lecture avec fade-in
   */
  async play() {
    if (!this.audioObject) return false;

    try {
      await this.audioObject.play();
      this.isPlaying = true;
      this.isPaused = false;

      // Ajouter un listener pour nettoyer automatiquement les sons non-loop terminés
      if (this.audioObject.source && !this.config.loop) {
        this.audioObject.source.onended = () => {
          console.log(`🔊 [AudioInstance] Sound ${this.id} ended naturally`);
          this.isPlaying = false;
          this.emit(AUDIO_EVENTS.SOUND_ENDED, { id: this.id, type: this.type });
        };
      }

      // Fade-in si configuré
      if (this.config.fadeInDuration > 0) {
        this.fadeToVolume(this.targetVolume, this.config.fadeInDuration);
      } else {
        this.audioObject.setVolume(this.targetVolume);
        this.currentVolume = this.targetVolume;
      }

      this.emit(AUDIO_EVENTS.SOUND_STARTED, { id: this.id, type: this.type });
      return true;
    } catch (error) {
      console.error(`[AudioManager] Error playing ${this.id}:`, error);
      this.emit(AUDIO_EVENTS.SOUND_ERROR, { id: this.id, error });
      return false;
    }
  }

  /**
   * Arrête la lecture avec fade-out
   */
  async stop() {
    if (!this.audioObject || !this.isPlaying) return;

    if (this.config.fadeOutDuration > 0) {
      await this.fadeToVolume(0, this.config.fadeOutDuration);
    }

    this.audioObject.stop();
    this.isPlaying = false;
    this.isPaused = false;
    this.currentVolume = 0;

    this.emit(AUDIO_EVENTS.SOUND_STOPPED, { id: this.id, type: this.type });
  }

  /**
   * Met en pause
   */
  pause() {
    if (this.audioObject && this.isPlaying) {
      this.audioObject.pause();
      this.isPaused = true;
    }
  }

  /**
   * Reprend la lecture
   */
  resume() {
    if (this.audioObject && this.isPaused) {
      this.audioObject.play();
      this.isPaused = false;
    }
  }

  /**
   * Met à jour le volume et le pitch en temps réel
   */
  updateAudio(volume, pitch = 1.0, smoothing = 0.1) {
    if (!this.audioObject) return;

    // Lissage des valeurs
    this.targetVolume = volume;
    this.targetPitch = pitch;

    // Application progressive
    this.currentVolume += (this.targetVolume - this.currentVolume) * smoothing;
    this.currentPitch += (this.targetPitch - this.currentPitch) * smoothing;

    this.audioObject.setVolume(this.currentVolume);

    // Pitch pour THREE.js Audio seulement
    if (this.audioObject.setPlaybackRate) {
      this.audioObject.setPlaybackRate(this.currentPitch);
    }
  }

  /**
   * Fade vers un volume cible
   */
  fadeToVolume(targetVolume, duration) {
    return new Promise((resolve) => {
      if (this.fadeInterval) {
        clearInterval(this.fadeInterval);
      }

      const startVolume = this.currentVolume;
      const volumeDiff = targetVolume - startVolume;
      const steps = Math.max(duration / 50, 1); // 50ms par step
      const volumeStep = volumeDiff / steps;
      let currentStep = 0;

      this.fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = startVolume + volumeStep * currentStep;

        if (currentStep >= steps) {
          this.currentVolume = targetVolume;
          this.audioObject.setVolume(targetVolume);
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
          resolve();
        } else {
          this.currentVolume = newVolume;
          this.audioObject.setVolume(newVolume);
        }
      }, 50);
    });
  }

  /**
   * Ajoute un listener d'événements
   */
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  /**
   * Émet un événement
   */
  emit(event, data) {
    this.listeners.forEach(({ event: listenerEvent, callback }) => {
      if (listenerEvent === event) {
        callback(data);
      }
    });
  }

  /**
   * Nettoie l'instance
   */
  dispose() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
    if (this.audioObject) {
      if (this.isPlaying) {
        this.audioObject.stop();
      }
      this.audioObject.disconnect?.();
    }
    this.listeners.clear();
  }
}

/**
 * AudioManager principal - Singleton
 */
class AudioManager {
  constructor() {
    this.audioListener = null;
    this.audioLoader = null;
    this.audioBuffers = new Map();
    this.audioInstances = new Map();
    this.isInitialized = false;
    this.globalListeners = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * Initialise le système audio
   */
  async initialize(camera) {
    if (this.isInitialized) return true;

    try {
      console.log("🎵 [AudioManager] Initializing audio system...");

      // Initialiser THREE.js Audio
      if (camera && typeof window !== "undefined") {
        this.audioListener = new THREE.AudioListener();
        camera.add(this.audioListener);
        this.audioLoader = new THREE.AudioLoader();
      }

      // Précharger les sons essentiels
      await this.preloadEssentialSounds();

      // Démarrer le nettoyage périodique des instances mortes
      this.startPeriodicCleanup();

      this.isInitialized = true;
      console.log("✅ [AudioManager] Audio system initialized");

      this.emit(AUDIO_EVENTS.SOUND_LOADED, {
        type: "system",
        status: "initialized",
      });
      return true;
    } catch (error) {
      console.error("❌ [AudioManager] Failed to initialize:", error);
      return false;
    }
  }

  /**
   * Précharge les sons essentiels
   */
  async preloadEssentialSounds() {
    const essentialSounds = [
      { key: "hover", path: "/sounds/hover.mp3", type: AUDIO_TYPES.SFX },
      {
        key: "cluster-off",
        path: "/sounds/cluster-off.mp3",
        type: AUDIO_TYPES.SFX,
      },
      {
        key: "acceleration",
        path: "/sounds/acceleration.mp3",
        type: AUDIO_TYPES.ACCELERATION,
      },
      {
        key: "ambiant",
        path: "/sounds/ambiant.mp3",
        type: AUDIO_TYPES.AMBIENT,
      },
      // Sons de cassette pour les fragments audio
      {
        key: "cassette-in.mp3",
        path: "/sounds/cassette-in.mp3",
        type: AUDIO_TYPES.SFX,
      },
      {
        key: "cassette-out.mp3",
        path: "/sounds/cassette-out.mp3",
        type: AUDIO_TYPES.SFX,
      },
    ];

    const loadPromises = essentialSounds.map((sound) =>
      this.loadSound(sound.key, sound.path, sound.type)
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Charge un fichier audio
   */
  async loadSound(key, path, type = AUDIO_TYPES.SFX) {
    if (this.audioBuffers.has(key)) {
      return this.audioBuffers.get(key);
    }

    // Éviter les chargements multiples
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const loadPromise = new Promise((resolve, reject) => {
      console.log(`🔊 [AudioManager] Loading ${key} from ${path}...`);

      if (type === AUDIO_TYPES.FRAGMENT) {
        // Pour les fragments, on stocke juste l'URL
        this.audioBuffers.set(key, path);
        console.log(`✅ [AudioManager] Fragment ${key} URL stored`);
        resolve(path);
        return;
      }

      if (!this.audioLoader) {
        console.warn(`⚠️ [AudioManager] No audio loader available for ${key}`);
        resolve(null);
        return;
      }

      this.audioLoader.load(
        path,
        (buffer) => {
          this.audioBuffers.set(key, buffer);
          console.log(`✅ [AudioManager] ${key} loaded successfully`);
          this.emit(AUDIO_EVENTS.SOUND_LOADED, { key, type });
          resolve(buffer);
        },
        (progress) => {
          console.log(
            `🔊 [AudioManager] Loading ${key}... ${Math.round(
              (progress.loaded / progress.total) * 100
            )}%`
          );
        },
        (error) => {
          console.error(`❌ [AudioManager] Failed to load ${key}:`, error);
          this.emit(AUDIO_EVENTS.SOUND_ERROR, { key, error });
          reject(error);
        }
      );
    });

    this.loadingPromises.set(key, loadPromise);

    try {
      const result = await loadPromise;
      this.loadingPromises.delete(key);
      return result;
    } catch (error) {
      this.loadingPromises.delete(key);
      throw error;
    }
  }

  /**
   * Joue un son
   */
  async playSound(key, options = {}) {
    console.log(`🔊 [AudioManager] playSound called with key: ${key}`, options);

    const gameStore = useGameStore.getState();
    if (!gameStore.audioEnabled) {
      console.log(`🔇 [AudioManager] Audio disabled, skipping ${key}`);
      return null;
    }

    const {
      type = AUDIO_TYPES.SFX,
      volume,
      pitch = 1.0,
      loop,
      position = null,
      instanceId = null,
    } = options;

    // Charger le son s'il n'est pas déjà chargé
    if (!this.audioBuffers.has(key)) {
      console.warn(
        `⚠️ [AudioManager] Sound ${key} not loaded, attempting to load...`
      );
      // Ici on pourrait essayer de charger dynamiquement
      return null;
    }

    const buffer = this.audioBuffers.get(key);
    console.log(
      `🔊 [AudioManager] Buffer for ${key}:`,
      buffer ? "✅ Found" : "❌ Missing"
    );

    const id =
      instanceId ||
      `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Créer l'instance audio
    const config = {
      ...DEFAULT_CONFIGS[type],
      ...(volume !== undefined && { volume }),
      ...(loop !== undefined && { loop }),
    };

    console.log(
      `🔊 [AudioManager] Creating instance ${id} with config:`,
      config
    );

    const instance = new AudioInstance(id, type, config);

    // Ajouter un listener pour nettoyer automatiquement les instances terminées
    instance.addEventListener(AUDIO_EVENTS.SOUND_ENDED, () => {
      console.log(`🧹 [AudioManager] Auto-cleaning ended instance: ${id}`);
      this.audioInstances.delete(id);
      instance.dispose();
    });

    // Initialiser selon le type
    const isPositional = position !== null;
    instance.initialize(this.audioListener, buffer, isPositional, position);

    console.log(
      `🔊 [AudioManager] Instance ${id} initialized, audioListener:`,
      this.audioListener ? "✅ Present" : "❌ Missing"
    );

    // Stocker l'instance
    this.audioInstances.set(id, instance);

    // Démarrer la lecture
    const success = await instance.play();

    if (success) {
      console.log(`🎵 [AudioManager] Playing ${key} with ID ${id}`);
      return id;
    } else {
      console.error(`❌ [AudioManager] Failed to play ${key} with ID ${id}`);
      this.audioInstances.delete(id);
      return null;
    }
  }

  /**
   * Arrête un son
   */
  async stopSound(instanceId) {
    const instance = this.audioInstances.get(instanceId);
    if (instance) {
      await instance.stop();
      instance.dispose();
      this.audioInstances.delete(instanceId);
      console.log(`🛑 [AudioManager] Stopped sound ${instanceId}`);
    }
  }

  /**
   * Met à jour un son continu (pour l'accélération)
   */
  updateContinuousSound(instanceId, volume, pitch = 1.0, smoothing = 0.1) {
    const instance = this.audioInstances.get(instanceId);
    if (instance) {
      instance.updateAudio(volume, pitch, smoothing);
    }
  }

  /**
   * Vérifie si un son est chargé
   */
  isSoundLoaded(key) {
    return this.audioBuffers.has(key);
  }

  /**
   * Obtient la liste des sons chargés
   */
  getLoadedSounds() {
    return Array.from(this.audioBuffers.keys());
  }

  /**
   * Joue un son de hover
   */
  playHoverSound() {
    return this.playSound("hover", { type: AUDIO_TYPES.SFX });
  }

  /**
   * Joue le son de cluster visité
   */
  playClusterOffSound() {
    return this.playSound("cluster-off", { type: AUDIO_TYPES.SFX });
  }

  /**
   * Démarre le son d'accélération
   */
  startAccelerationSound(initialVolume = 1.0) {
    console.log(
      "🔊 [AudioManager] startAccelerationSound called with volume:",
      initialVolume
    );
    console.log(
      "🔊 [AudioManager] Audio enabled:",
      useGameStore.getState().audioEnabled
    );
    console.log(
      "🔊 [AudioManager] Is acceleration sound loaded:",
      this.isSoundLoaded("acceleration")
    );

    // Vérifier si l'instance existe déjà et est en cours de lecture
    const existingInstance = this.audioInstances.get("acceleration_main");
    if (existingInstance && existingInstance.isPlaying) {
      console.log(
        "🔊 [AudioManager] Acceleration sound already playing, skipping"
      );
      return "acceleration_main";
    }

    // Arrêter l'instance existante seulement si elle n'est pas en cours de lecture
    if (existingInstance && !existingInstance.isPlaying) {
      console.log("🔊 [AudioManager] Stopping dead acceleration instance");
      this.stopSound("acceleration_main");
    }

    const result = this.playSound("acceleration", {
      type: AUDIO_TYPES.ACCELERATION,
      volume: initialVolume,
      instanceId: "acceleration_main", // ID fixe pour pouvoir le contrôler
    });

    console.log("🔊 [AudioManager] startAccelerationSound result:", result);
    return result;
  }

  /**
   * Met à jour le son d'accélération
   */
  updateAccelerationSound(volume, pitch = 1.0) {
    // Lissage plus doux pour éviter le flickering
    this.updateContinuousSound("acceleration_main", volume, pitch, 0.02); // Réduit de 0.05 à 0.02
  }

  /**
   * Arrête le son d'accélération
   */
  stopAccelerationSound() {
    return this.stopSound("acceleration_main");
  }

  /**
   * Démarre l'audio ambiant
   */
  async startAmbientAudio() {
    const instanceId = await this.playSound("ambiant", {
      type: AUDIO_TYPES.AMBIENT,
      instanceId: "ambient_main",
    });

    return instanceId;
  }

  /**
   * Arrête l'audio ambiant
   */
  stopAmbientAudio() {
    return this.stopSound("ambient_main");
  }

  /**
   * Utilitaire pour attendre
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Ajoute un listener global
   */
  addEventListener(event, callback) {
    this.globalListeners.add({ event, callback });
  }

  /**
   * Émet un événement global
   */
  emit(event, data) {
    this.globalListeners.forEach(({ event: listenerEvent, callback }) => {
      if (listenerEvent === event) {
        callback(data);
      }
    });
  }

  /**
   * Nettoie et dispose le gestionnaire audio
   */
  dispose() {
    // Arrêter toutes les instances audio
    this.audioInstances.forEach((instance) => {
      instance.dispose();
    });
    this.audioInstances.clear();

    // Nettoyer les buffers
    this.audioBuffers.clear();

    // Nettoyer les listeners
    this.globalListeners.clear();

    // Arrêter le nettoyage périodique
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Réinitialiser l'état
    this.isInitialized = false;
    this.audioListener = null;
    this.audioLoader = null;

    console.log("🧹 [AudioManager] Disposed");
  }

  /**
   * Démarre le nettoyage périodique des instances audio mortes
   */
  startPeriodicCleanup() {
    // Nettoyer toutes les 5 secondes
    this.cleanupInterval = setInterval(() => {
      this.cleanupDeadInstances();
    }, 5000);
  }

  /**
   * Nettoie les instances audio mortes (non en cours de lecture et non en pause)
   */
  cleanupDeadInstances() {
    const deadInstances = [];

    this.audioInstances.forEach((instance, id) => {
      // Supprimer les instances qui ne sont ni en lecture ni en pause
      if (!instance.isPlaying && !instance.isPaused) {
        deadInstances.push(id);
      }
    });

    if (deadInstances.length > 0) {
      console.log(
        `🧹 [AudioManager] Cleaning up ${deadInstances.length} dead instances:`,
        deadInstances
      );

      deadInstances.forEach((id) => {
        const instance = this.audioInstances.get(id);
        if (instance) {
          instance.dispose();
          this.audioInstances.delete(id);
        }
      });
    }
  }
}

// Instance singleton
const audioManager = new AudioManager();

/**
 * Store Zustand pour l'AudioManager
 */
const useAudioManager = create((set, get) => ({
  // État
  isInitialized: false,
  loadedSounds: [],
  playingSounds: [],

  // Actions
  initialize: async (camera) => {
    const success = await audioManager.initialize(camera);
    set({ isInitialized: success });
    return success;
  },

  playSound: (key, options) => audioManager.playSound(key, options),
  stopSound: (instanceId) => audioManager.stopSound(instanceId),
  updateContinuousSound: (instanceId, volume, pitch, smoothing) =>
    audioManager.updateContinuousSound(instanceId, volume, pitch, smoothing),

  // Méthodes spécialisées
  playHoverSound: () => audioManager.playHoverSound(),
  playClusterOffSound: () => audioManager.playClusterOffSound(),

  startAccelerationSound: (volume) =>
    audioManager.startAccelerationSound(volume),
  updateAccelerationSound: (volume, pitch) =>
    audioManager.updateAccelerationSound(volume, pitch),
  stopAccelerationSound: () => audioManager.stopAccelerationSound(),

  startAmbientAudio: () => audioManager.startAmbientAudio(),
  stopAmbientAudio: () => audioManager.stopAmbientAudio(),

  // Utilitaires
  isSoundLoaded: (key) => audioManager.isSoundLoaded(key),
  getLoadedSounds: () => audioManager.getLoadedSounds(),

  // Méthodes de debug
  getActiveInstances: () => {
    const instances = [];
    audioManager.audioInstances.forEach((instance, id) => {
      instances.push({
        id,
        type: instance.type,
        isPlaying: instance.isPlaying,
        isPaused: instance.isPaused,
        currentVolume: instance.currentVolume,
        targetVolume: instance.targetVolume,
        currentPitch: instance.currentPitch,
        targetPitch: instance.targetPitch,
        config: instance.config,
      });
    });
    return instances;
  },

  getAudioManagerInstance: () => audioManager,

  dispose: () => {
    audioManager.dispose();
    set({ isInitialized: false, loadedSounds: [], playingSounds: [] });
  },
}));

export default useAudioManager;
export { audioManager, AudioInstance };
