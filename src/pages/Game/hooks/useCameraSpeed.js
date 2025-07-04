/**
 * useCameraSpeed - Hook optimisé pour la vitesse de caméra
 * 
 * Patterns production grade:
 * - Throttling intelligent basé sur l'usage
 * - Smoothing pour éviter les pics
 * - Normalisation pour différents contextes (HUD, audio, debug)
 * - Performance monitoring
 */

import { useCameraMetric, METRIC_TYPES } from '../services/CameraMetricsManager';

// Presets de throttling pour différents usages
export const SPEED_USAGE_PRESETS = {
  HUD: { throttle: 50, smooth: true },        // 20 FPS, lissé pour l'affichage
  AUDIO: { throttle: 33, smooth: false },     // 30 FPS, brut pour l'audio
  DEBUG: { throttle: 100, smooth: true },     // 10 FPS, lissé pour le debug
  ANALYTICS: { throttle: 1000, smooth: true } // 1 FPS, lissé pour les stats
};

/**
 * Hook pour obtenir la vitesse de caméra optimisée selon l'usage
 * @param {string} usage - Type d'usage (HUD, AUDIO, DEBUG, ANALYTICS)
 * @param {object} options - Options personnalisées
 * @returns {number} Vitesse de caméra
 */
export const useCameraSpeed = (usage = 'HUD', options = {}) => {
  const preset = SPEED_USAGE_PRESETS[usage] || SPEED_USAGE_PRESETS.HUD;
  const config = { ...preset, ...options };
  
  const rawSpeed = useCameraMetric(METRIC_TYPES.SPEED, { 
    throttle: config.throttle,
    immediate: config.immediate 
  });

  // Appliquer le smoothing si demandé
  if (config.smooth && typeof rawSpeed === 'number') {
    // Le smoothing est déjà fait dans le CameraMetricsManager
    return rawSpeed;
  }

  return rawSpeed || 0;
};

/**
 * Hook pour obtenir la vitesse normalisée (0-1) pour les barres de progression
 * @param {number} maxSpeed - Vitesse maximale pour la normalisation
 * @param {string} usage - Type d'usage
 * @returns {number} Vitesse normalisée entre 0 et 1
 */
export const useNormalizedCameraSpeed = (maxSpeed = 300, usage = 'HUD') => {
  const speed = useCameraSpeed(usage);
  return Math.min(speed / maxSpeed, 1);
};

/**
 * Hook pour obtenir la vitesse avec des seuils de couleur (pour l'UI)
 * @param {object} thresholds - Seuils { low: 100, medium: 200, high: 300 }
 * @param {string} usage - Type d'usage
 * @returns {object} { speed, level, color }
 */
export const useCameraSpeedWithLevels = (
  thresholds = { low: 100, medium: 200, high: 300 },
  usage = 'HUD'
) => {
  const speed = useCameraSpeed(usage);
  
  let level = 'low';
  let color = '#4CAF50'; // Vert
  
  if (speed > thresholds.high) {
    level = 'critical';
    color = '#ff6b6b'; // Rouge
  } else if (speed > thresholds.medium) {
    level = 'high';
    color = '#ffcc00'; // Jaune
  } else if (speed > thresholds.low) {
    level = 'medium';
    color = '#ff9800'; // Orange
  }
  
  return {
    speed: Math.round(speed * 100) / 100, // 2 décimales
    level,
    color,
    normalized: Math.min(speed / thresholds.high, 1)
  };
};

export default useCameraSpeed; 