import { useRef, useCallback, useState } from "react";
import useAudioManager from "../services/AudioManager";
import useGameStore from "../store";

/**
 * Hook simplifié pour gérer le son d'accélération avec le nouveau AudioManager
 * @param {Object} options - Options de configuration
 * @param {number} options.speedThreshold - Seuil de vitesse pour démarrer le son (défaut: 0.02)
 * @param {number} options.stopThreshold - Seuil pour arrêter le son (défaut: 0.01)
 * @param {number} options.orientationThreshold - Seuil d'orientation pour arrêter le son (défaut: 0.05)
 * @param {number} options.maxVolume - Volume maximum (défaut: 0.4)
 * @param {number} options.maxPitch - Pitch maximum (défaut: 1.8)
 * @param {number} options.orientationSensitivity - Sensibilité à l'orientation (défaut: 2.0)
 * @param {number} options.speedSensitivity - Sensibilité à la vitesse (défaut: 1.2)
 */
const useAccelerationAudio = ({
  minVolume = 0.5,
  maxVolume = 1.0,
  minPitch = 0.8,
  maxPitch = 2.0,
  threshold = 0.1,
} = {}) => {
  const audioManager = useAudioManager();
  const lastSpeedRef = useRef(0);

  const startAcceleration = useCallback(
    (speed) => {
      if (!audioManager || !audioManager.isInitialized) {
        console.warn("🔊 [useAccelerationAudio] AudioManager not initialized");
        return;
      }

      // Vérifier l'état réel de l'instance dans l'AudioManager
      const activeInstances = audioManager.getActiveInstances();
      const accelerationInstance = activeInstances.find(
        (instance) => instance.id === "acceleration_main" && instance.isPlaying
      );

      // Ne redémarrer que si aucune instance n'est active
      if (!accelerationInstance) {
        console.log("🔊 [useAccelerationAudio] Starting acceleration sound");
        audioManager.startAccelerationSound(1.0); // Volume initial au maximum
      }

      // Toujours mettre à jour le volume et le pitch
      updateAcceleration(speed);
    },
    [audioManager]
  );

  const updateAcceleration = useCallback(
    (speed) => {
      if (!audioManager) return;

      // Éviter les mises à jour trop fréquentes
      const speedDiff = Math.abs(speed - lastSpeedRef.current);
      if (speedDiff < 0.005) return; // Seuil encore plus bas

      lastSpeedRef.current = speed;

      // Calculer le volume et le pitch basés sur la vitesse
      const normalizedSpeed = Math.min(speed / 5, 1); // Normaliser sur 5 unités pour plus de sensibilité
      const volume = minVolume + (maxVolume - minVolume) * normalizedSpeed;
      const pitch = minPitch + (maxPitch - minPitch) * normalizedSpeed;

      audioManager.updateAccelerationSound(volume, pitch);
    },
    [audioManager, minVolume, maxVolume, minPitch, maxPitch]
  );

  const stopAccelerationSound = useCallback(() => {
    audioManager.stopAccelerationSound();
  }, [audioManager]);

  const isAccelerationSoundPlaying = useCallback(() => {
    if (!audioManager) return false;

    // Vérifier l'état réel dans l'AudioManager
    const activeInstances = audioManager.getActiveInstances();
    return activeInstances.some(
      (instance) => instance.id === "acceleration_main" && instance.isPlaying
    );
  }, [audioManager]);

  return {
    startAcceleration,
    updateAcceleration,
    stopAccelerationSound,
    isAccelerationSoundPlaying,
  };
};

export default useAccelerationAudio;
