/**
 * Hook SOLID pour gérer l'audio de navigation
 * Remplace l'ancien useAccelerationAudio avec une architecture découplée
 */

import { useEffect, useRef } from "react";
import { useNavigationAudioService } from "../services/NavigationAudioService";
import useAudioManager from "../services/AudioManager";

/**
 * Hook pour gérer l'audio de navigation de manière SOLID
 * @param {Object} options - Options de configuration
 * @param {boolean} options.enabled - Si l'audio est activé (défaut: true)
 * @param {boolean} options.autoInitialize - Si l'initialisation est automatique (défaut: true)
 */
const useNavigationAudio = ({ enabled = true, autoInitialize = true } = {}) => {
  const audioManager = useAudioManager();
  const navigationAudioService = useNavigationAudioService();
  const isInitializedRef = useRef(false);

  // Initialisation automatique du service
  useEffect(() => {
    if (autoInitialize && audioManager && !isInitializedRef.current) {
      // Obtenir l'instance réelle de l'AudioManager depuis le store
      const audioManagerInstance = audioManager.getAudioManagerInstance();

      console.log("🎵 [useNavigationAudio] Tentative d'initialisation avec:", {
        storeInitialized: audioManager.isInitialized,
        instanceInitialized: audioManagerInstance?.isInitialized,
      });

      if (audioManagerInstance && audioManagerInstance.isInitialized) {
        const success = navigationAudioService.initialize(audioManagerInstance);
        if (success) {
          isInitializedRef.current = true;
          console.log(
            "🎵 [useNavigationAudio] Service initialisé automatiquement"
          );
        }
      } else {
        console.log(
          "🎵 [useNavigationAudio] AudioManager pas encore initialisé, attente..."
        );
      }
    }
  }, [
    audioManager,
    audioManager?.isInitialized,
    autoInitialize,
    navigationAudioService,
  ]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      if (isInitializedRef.current) {
        navigationAudioService.dispose();
        isInitializedRef.current = false;
      }
    };
  }, [navigationAudioService]);

  /**
   * Met à jour l'état de navigation pour l'audio
   * @param {Object} navigationState - État de navigation
   * @param {number} navigationState.movementSpeed - Vitesse de mouvement
   * @param {number} navigationState.rotationSpeed - Vitesse de rotation
   * @param {number} navigationState.deltaTime - Temps écoulé
   */
  const updateNavigationState = (navigationState) => {
    if (!enabled || !isInitializedRef.current) {
      return;
    }

    navigationAudioService.update(navigationState);
  };

  /**
   * Force l'arrêt de l'audio (utile pour les transitions)
   */
  const forceStop = () => {
    if (isInitializedRef.current) {
      navigationAudioService.forceStop();
    }
  };

  /**
   * Obtient l'état actuel du service audio
   */
  const getAudioState = () => {
    if (!isInitializedRef.current) {
      return {
        isInitialized: false,
        currentActivity: "idle",
        activityIntensity: 0,
        isAudioActive: false,
        smoothedIntensity: 0,
      };
    }

    return navigationAudioService.getState();
  };

  /**
   * Vérifie si l'audio de navigation est actif
   */
  const isNavigationAudioActive = () => {
    const state = getAudioState();
    return state.isAudioActive;
  };

  return {
    // Méthodes principales
    updateNavigationState,
    forceStop,

    // État et informations
    getAudioState,
    isNavigationAudioActive,
    isInitialized: isInitializedRef.current,

    // Service sous-jacent (pour les cas avancés)
    navigationAudioService: isInitializedRef.current
      ? navigationAudioService
      : null,
  };
};

export default useNavigationAudio;
