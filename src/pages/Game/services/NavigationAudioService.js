/**
 * NavigationAudioService - Service SOLID pour gérer l'audio de navigation
 * Version recalibrée avec volumes corrects
 */

import useAudioManager from "./AudioManager";

// Types d'activité de navigation
export const NAVIGATION_ACTIVITY_TYPES = {
  MOVEMENT: "movement",
  ROTATION: "rotation",
  COMBINED: "combined",
  IDLE: "idle",
};

/**
 * Configuration audio recalibrée avec volumes max 1.0
 * Basée sur l'analyse des ranges réels :
 * - realSpeed : 0 à ~600 (maxSpeed 300-1000 selon device)
 * - orientationSpeed : 0 à ~3 (rotationSpeed ~1.2)
 */
const AUDIO_CONFIG = {
  [NAVIGATION_ACTIVITY_TYPES.MOVEMENT]: {
    baseVolume: 0.05,
    volumeMultiplier: 2.0, // Plus fort pour l'accélération
    pitchRange: [0.8, 1.4],
  },
  [NAVIGATION_ACTIVITY_TYPES.ROTATION]: {
    baseVolume: 0.1, // Plus fort pour la rotation
    volumeMultiplier: 8.0, // Beaucoup plus fort car orientationSpeed est petit (0-3)
    pitchRange: [0.9, 1.3],
  },
  [NAVIGATION_ACTIVITY_TYPES.COMBINED]: {
    baseVolume: 0.08,
    volumeMultiplier: 3.0,
    pitchRange: [0.7, 1.6],
  },
};

/**
 * Seuils recalibrés selon les ranges réels
 */
const THRESHOLDS = {
  startThreshold: 0.02, // Plus haut pour éviter les déclenchements parasites
  stopThreshold: 0.01,
  smoothingFactor: 0.4, // Lissage réduit pour plus de réactivité
};

/**
 * Classe principale du service audio de navigation - VERSION RECALIBRÉE
 */
class NavigationAudioService {
  constructor() {
    this.audioManager = null;
    this.isInitialized = false;
    this.currentActivity = NAVIGATION_ACTIVITY_TYPES.IDLE;
    this.activityIntensity = 0;
    this.isAudioActive = false;
    this.smoothedIntensity = 0;

    console.log(
      "🎵 [NavigationAudioService] Service créé (version recalibrée)"
    );
  }

  /**
   * Initialise le service avec l'AudioManager
   */
  initialize(audioManager) {
    if (!audioManager) {
      console.error("🎵 [NavigationAudioService] AudioManager requis");
      return false;
    }

    this.audioManager = audioManager;
    this.isInitialized = true;
    console.log("🎵 [NavigationAudioService] Service initialisé");
    return true;
  }

  /**
   * Met à jour l'audio - VERSION RECALIBRÉE
   */
  update(navigationData) {
    if (!this.isInitialized || !this.audioManager?.isInitialized) return;

    const { realSpeed, orientationSpeed, combinedSpeed } = navigationData;

    // Protection contre NaN
    const safeRealSpeed =
      isNaN(realSpeed) || realSpeed === undefined ? 0 : realSpeed;
    const safeOrientationSpeed =
      isNaN(orientationSpeed) || orientationSpeed === undefined
        ? 0
        : orientationSpeed;
    const safeCombinedSpeed =
      isNaN(combinedSpeed) || combinedSpeed === undefined ? 0 : combinedSpeed;

    // Normalisation des vitesses selon leurs ranges réels
    // realSpeed: 0-600 -> 0-1
    const normalizedRealSpeed = Math.min(safeRealSpeed / 600, 1);
    // orientationSpeed: 0-3 -> 0-1
    const normalizedOrientationSpeed = Math.min(safeOrientationSpeed / 3, 1);
    // combinedSpeed: max des deux
    const normalizedCombinedSpeed = Math.max(
      normalizedRealSpeed,
      normalizedOrientationSpeed
    );

    // Calcul de l'intensité basé sur les vitesses normalisées
    const rawIntensity = Math.max(
      normalizedRealSpeed,
      normalizedOrientationSpeed,
      normalizedCombinedSpeed
    );

    // Protection contre NaN dans le lissage
    if (isNaN(this.smoothedIntensity)) {
      this.smoothedIntensity = 0;
    }

    // Lissage
    this.smoothedIntensity =
      this.smoothedIntensity * (1 - THRESHOLDS.smoothingFactor) +
      rawIntensity * THRESHOLDS.smoothingFactor;

    // Déterminer l'activité principale
    let activity = NAVIGATION_ACTIVITY_TYPES.MOVEMENT;
    if (normalizedOrientationSpeed > normalizedRealSpeed * 1.2) {
      activity = NAVIGATION_ACTIVITY_TYPES.ROTATION;
    } else if (normalizedRealSpeed > 0.1 && normalizedOrientationSpeed > 0.1) {
      activity = NAVIGATION_ACTIVITY_TYPES.COMBINED;
    }

    this.currentActivity = activity;
    this.activityIntensity = rawIntensity;

    // Debug occasionnel avec valeurs normalisées
    if (Math.random() < 0.02) {
      console.log(
        `🎵 Audio - Real: ${normalizedRealSpeed.toFixed(
          3
        )}, Orient: ${normalizedOrientationSpeed.toFixed(
          3
        )}, Intensity: ${this.smoothedIntensity.toFixed(
          3
        )}, Activity: ${activity}`
      );
    }

    // Logique audio
    if (
      !this.isAudioActive &&
      this.smoothedIntensity > THRESHOLDS.startThreshold
    ) {
      this._startAudio(activity, this.smoothedIntensity);
    } else if (
      this.isAudioActive &&
      this.smoothedIntensity < THRESHOLDS.stopThreshold
    ) {
      this._stopAudio();
    } else if (this.isAudioActive) {
      this._updateAudio(activity, this.smoothedIntensity);
    }
  }

  /**
   * Démarre l'audio avec volume correct
   */
  _startAudio(activity, intensity) {
    console.log(
      `🎵 Starting audio - Activity: ${activity}, Intensity: ${intensity.toFixed(
        3
      )}`
    );

    if (!this.audioManager?.isInitialized) return;

    const config =
      AUDIO_CONFIG[activity] ||
      AUDIO_CONFIG[NAVIGATION_ACTIVITY_TYPES.MOVEMENT];
    let volume = config.baseVolume + intensity * config.volumeMultiplier;

    // GARANTIR que le volume ne dépasse JAMAIS 1.0
    volume = Math.min(volume, 1.0);

    console.log(
      `🎵 Volume calculé: ${volume.toFixed(3)} (base: ${
        config.baseVolume
      }, multiplier: ${config.volumeMultiplier})`
    );

    this.audioManager.startAccelerationSound(volume);
    this.isAudioActive = true;
  }

  /**
   * Met à jour l'audio avec volume correct
   */
  _updateAudio(activity, intensity) {
    const config =
      AUDIO_CONFIG[activity] ||
      AUDIO_CONFIG[NAVIGATION_ACTIVITY_TYPES.MOVEMENT];
    let volume = config.baseVolume + intensity * config.volumeMultiplier;

    // GARANTIR que le volume ne dépasse JAMAIS 1.0
    volume = Math.min(volume, 1.0);

    const pitchRange = config.pitchRange;
    const pitch =
      pitchRange[0] +
      (pitchRange[1] - pitchRange[0]) * Math.min(intensity * 2, 1);

    this.audioManager.updateAccelerationSound(volume, pitch);
  }

  /**
   * Arrête l'audio
   */
  _stopAudio() {
    console.log("🎵 Stopping audio");

    if (!this.isAudioActive) return;

    this.audioManager.stopAccelerationSound();
    this.isAudioActive = false;
  }

  /**
   * Force l'arrêt immédiat
   */
  forceStop() {
    console.log("🎵 Force stopping audio");

    if (!this.audioManager) return;

    this.audioManager.stopAccelerationSound();
    this.isAudioActive = false;
  }

  /**
   * Retourne l'état actuel
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      currentActivity: this.currentActivity,
      activityIntensity: this.activityIntensity,
      isAudioActive: this.isAudioActive,
      smoothedIntensity: this.smoothedIntensity,
    };
  }

  /**
   * Nettoie le service
   */
  dispose() {
    this.forceStop();
    this.audioManager = null;
    this.isInitialized = false;
    console.log("🎵 Service nettoyé");
  }
}

// Instance singleton
let navigationAudioServiceInstance = null;

/**
 * Hook pour utiliser le NavigationAudioService
 */
export const useNavigationAudioService = () => {
  if (!navigationAudioServiceInstance) {
    navigationAudioServiceInstance = new NavigationAudioService();
  }
  return navigationAudioServiceInstance;
};

export default NavigationAudioService;
