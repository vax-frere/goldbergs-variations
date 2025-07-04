/**
 * CameraMetricsManager - Gestionnaire centralisé des métriques de caméra
 * 
 * Patterns utilisés:
 * - Singleton pattern pour une seule source de vérité
 * - Observer pattern pour les subscribers
 * - Event-driven updates au lieu de polling
 * - Throttling intelligent pour les performances
 * - Métriques temps réel pour jeux vidéo
 */

import React from 'react';
import { Vector3 } from 'three';

// Types de métriques disponibles
export const METRIC_TYPES = {
  SPEED: 'speed',
  POSITION: 'position',
  ROTATION: 'rotation',
  ACCELERATION: 'acceleration',
  DISTANCE_TO_CENTER: 'distanceToCenter',
  ORIENTATION_VELOCITY: 'orientationVelocity',
  FLIGHT_STATE: 'flightState'
};

// Configuration des throttling par type de métrique
const THROTTLE_CONFIG = {
  [METRIC_TYPES.SPEED]: 50,           // 20 FPS pour la vitesse (critique pour HUD)
  [METRIC_TYPES.POSITION]: 100,       // 10 FPS pour la position
  [METRIC_TYPES.ROTATION]: 100,       // 10 FPS pour la rotation
  [METRIC_TYPES.ACCELERATION]: 200,   // 5 FPS pour l'accélération
  [METRIC_TYPES.DISTANCE_TO_CENTER]: 200, // 5 FPS pour la distance
  [METRIC_TYPES.ORIENTATION_VELOCITY]: 50, // 20 FPS pour l'orientation (audio)
  [METRIC_TYPES.FLIGHT_STATE]: 500    // 2 FPS pour l'état général
};

class CameraMetricsManager {
  constructor() {
    if (CameraMetricsManager.instance) {
      return CameraMetricsManager.instance;
    }

    // État des métriques
    this.metrics = {
      [METRIC_TYPES.SPEED]: 0,
      [METRIC_TYPES.POSITION]: new Vector3(),
      [METRIC_TYPES.ROTATION]: { yaw: 0, pitch: 0, roll: 0 },
      [METRIC_TYPES.ACCELERATION]: 1,
      [METRIC_TYPES.DISTANCE_TO_CENTER]: 0,
      [METRIC_TYPES.ORIENTATION_VELOCITY]: { yaw: 0, pitch: 0, roll: 0 },
      [METRIC_TYPES.FLIGHT_STATE]: 'normal'
    };

    // Subscribers par type de métrique
    this.subscribers = {};
    Object.values(METRIC_TYPES).forEach(type => {
      this.subscribers[type] = new Set();
    });

    // Throttling state
    this.lastUpdate = {};
    Object.values(METRIC_TYPES).forEach(type => {
      this.lastUpdate[type] = 0;
    });

    // Performance monitoring
    this.performanceStats = {
      updateCount: 0,
      subscriberNotifications: 0,
      throttledUpdates: 0,
      startTime: Date.now()
    };

    // Références pour les calculs
    this.previousPosition = new Vector3();
    this.previousTime = 0;
    this.smoothedSpeed = 0;
    this.speedSmoothingFactor = 0.1;

    CameraMetricsManager.instance = this;
  }

  /**
   * Subscribe à un type de métrique spécifique
   * @param {string} metricType - Type de métrique (METRIC_TYPES)
   * @param {function} callback - Fonction appelée lors des updates
   * @param {object} options - Options (throttle, immediate)
   * @returns {function} Fonction de désabonnement
   */
  subscribe(metricType, callback, options = {}) {
    if (!this.subscribers[metricType]) {
      console.warn(`[CameraMetricsManager] Type de métrique inconnu: ${metricType}`);
      return () => {};
    }

    const subscriber = {
      callback,
      throttle: options.throttle || THROTTLE_CONFIG[metricType],
      lastNotified: 0,
      immediate: options.immediate || false
    };

    this.subscribers[metricType].add(subscriber);

    // Notification immédiate si demandée
    if (subscriber.immediate) {
      callback(this.metrics[metricType], metricType);
    }

    // Retourner la fonction de désabonnement
    return () => {
      this.subscribers[metricType].delete(subscriber);
    };
  }

  /**
   * Update une métrique spécifique
   * @param {string} metricType - Type de métrique
   * @param {*} value - Nouvelle valeur
   * @param {boolean} force - Forcer l'update même si throttlé
   */
  updateMetric(metricType, value, force = false) {
    const now = Date.now();
    
    // Vérifier le throttling
    if (!force && (now - this.lastUpdate[metricType]) < THROTTLE_CONFIG[metricType]) {
      this.performanceStats.throttledUpdates++;
      return;
    }

    // Mettre à jour la métrique
    const oldValue = this.metrics[metricType];
    this.metrics[metricType] = value;
    this.lastUpdate[metricType] = now;
    this.performanceStats.updateCount++;

    // Notifier les subscribers
    this.notifySubscribers(metricType, value, oldValue);
  }

  /**
   * Update complet depuis les données de caméra (appelé par le FlightController)
   * @param {object} cameraData - Données complètes de la caméra
   */
  updateFromCamera(cameraData) {
    const {
      position,
      velocity,
      orientationVelocity,
      accelerationFactor,
      flightState,
      delta
    } = cameraData;

    const now = Date.now();

    // Calculer la vitesse réelle (distance/temps)
    let realSpeed = 0;
    if (this.previousTime > 0 && delta > 0) {
      const distance = position.distanceTo(this.previousPosition);
      realSpeed = distance / delta;
      
      // Lisser la vitesse pour éviter les pics
      this.smoothedSpeed = this.smoothedSpeed * (1 - this.speedSmoothingFactor) + 
                          realSpeed * this.speedSmoothingFactor;
    }

    // Utiliser la vitesse du vecteur velocity si disponible, sinon la vitesse calculée
    const finalSpeed = velocity ? velocity.length() : this.smoothedSpeed;

    // Updates des métriques
    this.updateMetric(METRIC_TYPES.SPEED, finalSpeed);
    this.updateMetric(METRIC_TYPES.POSITION, position.clone());
    this.updateMetric(METRIC_TYPES.DISTANCE_TO_CENTER, position.length());
    
    if (orientationVelocity) {
      this.updateMetric(METRIC_TYPES.ORIENTATION_VELOCITY, { ...orientationVelocity });
    }
    
    if (accelerationFactor !== undefined) {
      this.updateMetric(METRIC_TYPES.ACCELERATION, accelerationFactor);
    }
    
    if (flightState) {
      this.updateMetric(METRIC_TYPES.FLIGHT_STATE, flightState);
    }

    // Sauvegarder pour le prochain calcul
    this.previousPosition.copy(position);
    this.previousTime = now;
  }

  /**
   * Notifier les subscribers d'un type de métrique
   * @param {string} metricType - Type de métrique
   * @param {*} newValue - Nouvelle valeur
   * @param {*} oldValue - Ancienne valeur
   */
  notifySubscribers(metricType, newValue, oldValue) {
    const subscribers = this.subscribers[metricType];
    const now = Date.now();

    subscribers.forEach(subscriber => {
      // Vérifier le throttling du subscriber
      if ((now - subscriber.lastNotified) >= subscriber.throttle) {
        try {
          subscriber.callback(newValue, metricType, oldValue);
          subscriber.lastNotified = now;
          this.performanceStats.subscriberNotifications++;
        } catch (error) {
          console.error(`[CameraMetricsManager] Erreur dans subscriber ${metricType}:`, error);
        }
      }
    });
  }

  /**
   * Obtenir une métrique spécifique
   * @param {string} metricType - Type de métrique
   * @returns {*} Valeur de la métrique
   */
  getMetric(metricType) {
    return this.metrics[metricType];
  }

  /**
   * Obtenir toutes les métriques
   * @returns {object} Toutes les métriques
   */
  getAllMetrics() {
    return { ...this.metrics };
  }

  /**
   * Obtenir les statistiques de performance
   * @returns {object} Stats de performance
   */
  getPerformanceStats() {
    const uptime = Date.now() - this.performanceStats.startTime;
    return {
      ...this.performanceStats,
      uptime,
      updatesPerSecond: (this.performanceStats.updateCount / uptime) * 1000,
      notificationsPerSecond: (this.performanceStats.subscriberNotifications / uptime) * 1000,
      throttleEfficiency: this.performanceStats.throttledUpdates / this.performanceStats.updateCount
    };
  }

  /**
   * Reset des statistiques de performance
   */
  resetPerformanceStats() {
    this.performanceStats = {
      updateCount: 0,
      subscriberNotifications: 0,
      throttledUpdates: 0,
      startTime: Date.now()
    };
  }

  /**
   * Cleanup - désabonner tous les subscribers
   */
  cleanup() {
    Object.values(this.subscribers).forEach(subscriberSet => {
      subscriberSet.clear();
    });
    this.resetPerformanceStats();
  }
}

// Export du singleton
export const cameraMetricsManager = new CameraMetricsManager();

// Hook React pour utiliser les métriques de caméra
export const useCameraMetric = (metricType, options = {}) => {
  const [value, setValue] = React.useState(cameraMetricsManager.getMetric(metricType));

  React.useEffect(() => {
    const unsubscribe = cameraMetricsManager.subscribe(
      metricType,
      (newValue) => setValue(newValue),
      options
    );

    return unsubscribe;
  }, [metricType, options.throttle]);

  return value;
};

// Hook pour plusieurs métriques
export const useCameraMetrics = (metricTypes, options = {}) => {
  const [metrics, setMetrics] = React.useState({});

  React.useEffect(() => {
    const unsubscribers = metricTypes.map(metricType => 
      cameraMetricsManager.subscribe(
        metricType,
        (newValue) => setMetrics(prev => ({ ...prev, [metricType]: newValue })),
        options
      )
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [metricTypes, options.throttle]);

  return metrics;
};

export default cameraMetricsManager; 