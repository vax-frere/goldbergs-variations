// Constantes de navigation pour l'ensemble de l'application
// Ce fichier centralise tous les paramètres liés à la navigation 3D

// Positions fixes pour l'oscillation de la caméra
import { Vector3 } from "three";

// Mappings des actions pour l'interface utilisateur
export const INPUT_ACTIONS = {
  MOVE_FORWARD: {
    key: "W",
    keyAlt: "ArrowUp",
    gamepad: "Left Stick Up",
    description: "Avancer",
  },
  MOVE_BACKWARD: {
    key: "S",
    keyAlt: "ArrowDown",
    gamepad: "Left Stick Down",
    description: "Reculer",
  },
  MOVE_LEFT: {
    key: "A",
    keyAlt: "ArrowLeft",
    gamepad: "Left Stick Left",
    description: "Gauche",
  },
  MOVE_RIGHT: {
    key: "D",
    keyAlt: "ArrowRight",
    gamepad: "Left Stick Right",
    description: "Droite",
  },
  MOVE_UP: {
    key: "E",
    keyAlt: "Space",
    gamepad: "R2",
    description: "Monter",
  },
  MOVE_DOWN: {
    key: "C",
    keyAlt: "Shift",
    gamepad: "L2",
    description: "Descendre",
  },
  ROLL_LEFT: {
    key: "Q",
    gamepad: "L1",
    description: "Roulis gauche",
  },
  ROLL_RIGHT: {
    key: "E",
    gamepad: "R1",
    description: "Roulis droit",
  },
  NEXT_POSITION: {
    key: "Space",
    gamepad: "X",
    gamepadIndex: 2,
    description: "Position suivante",
  },
  TOGGLE_MODE: {
    key: "Tab",
    gamepad: "Y",
    gamepadIndex: 3,
    description: "Changer de mode",
  },
  INTERACT: {
    key: "T",
    gamepad: "A",
    gamepadIndex: 0,
    description: "Interagir",
  },
  RETURN_HOME: {
    key: "Escape",
    gamepad: "B",
    gamepadIndex: 1,
    description: "Retour à l'accueil",
  },
};

// Types de périphériques d'entrée
export const INPUT_DEVICE_TYPES = {
  KEYBOARD: "keyboard",
  GAMEPAD: "gamepad",
  TOUCH: "touch", // Pour une future extension mobile
};

// Paramètres du champ de vision
export const CAMERA_FOV = 50;

// Paramètres des limites spatiales
export const BASE_CAMERA_DISTANCE = 1900;
export const BOUNDING_SPHERE_RADIUS = 2400; // Rayon de la sphère limite au-delà de laquelle on revient à la position par défaut
export const ACCELERATION_DISTANCE_THRESHOLD = 10; // Distance à partir de laquelle on applique l'accélération
export const ORBIT_DISTANCE = 1600; // Distance fixe pour le mode d'orbite automatique

// Paramètres des positions de caméra
export const CAMERA_POSITIONS = [
  {
    position: new Vector3(0, 0, BASE_CAMERA_DISTANCE),
    target: new Vector3(0, 0, 0),
  }, // Position vue globale à 2000 unités
  // { position: new Vector3(200, 100, 300), target: new Vector3(0, 0, 0) },
  // { position: new Vector3(-200, 50, 150), target: new Vector3(50, 0, 0) },
  // { position: new Vector3(0, 200, 100), target: new Vector3(0, 0, 0) },
  // { position: new Vector3(150, -100, 200), target: new Vector3(0, 50, 0) },
];

// Configuration de base (valeurs par défaut)
const BASE_FLIGHT_CONFIG = {
  maxSpeed: 300,
  acceleration: 400,
  deceleration: 0.92,
  rotationSpeed: 1.2,
  deadzone: 0.08,
};

// Configurations spécifiques par périphérique
export const DEVICE_SPECIFIC_CONFIGS = {
  [INPUT_DEVICE_TYPES.KEYBOARD]: {
    ...BASE_FLIGHT_CONFIG,
    // Clavier : plus précis mais nécessite plus d'accélération pour compenser le binaire on/off
    acceleration: 500, // Plus élevé pour compenser les entrées binaires
    maxSpeed: 1000, // Légèrement plus rapide pour le clavier
    rotationSpeed: 1.5, // Plus sensible en rotation
    // Multiplicateurs spécifiques au clavier
    keyboardSensitivity: 1.5,
    keyboardMovementMultiplier: 1.0,
    keyboardLookMultiplier: 1.8,
    // Paramètres de douceur pour l'orientation
    orientationSmoothFactor: 0.05, // Lissage au relâchement (plus bas = plus doux)
    orientationInertiaFactor: 0.06, // Inertie au démarrage (plus bas = plus d'inertie)
    // Courbe de réponse (pour les futures améliorations)
    responseCurve: "linear",
  },
  [INPUT_DEVICE_TYPES.GAMEPAD]: {
    ...BASE_FLIGHT_CONFIG,
    // Manette : plus fluide avec les sticks analogiques
    acceleration: 350, // Plus doux grâce aux entrées analogiques
    maxSpeed: 280, // Légèrement plus lent pour plus de contrôle
    rotationSpeed: 1.0, // Moins sensible, compensé par la courbe exponentielle
    deadzone: 0.08,
    // Paramètres spécifiques à la manette
    lookSensitivity: 1.2, // Sensibilité du stick droit
    lookCurveIntensity: 0.5, // Intensité de la courbe exponentielle pour les mouvements de caméra
    vibrationEnabled: true, // Support de la vibration
    // Paramètres de douceur pour l'orientation
    orientationSmoothFactor: 0.12, // Lissage au relâchement
    orientationInertiaFactor: 0.18, // Plus réactif au démarrage pour la manette
    // Courbe de réponse
    responseCurve: "exponential",
  },
  [INPUT_DEVICE_TYPES.TOUCH]: {
    ...BASE_FLIGHT_CONFIG,
    // Configuration pour une future extension mobile
    acceleration: 300,
    maxSpeed: 250,
    rotationSpeed: 0.8,
    deadzone: 0.12, // Plus large pour les écrans tactiles
    touchSensitivity: 1.0,
    // Paramètres de douceur pour l'orientation
    orientationSmoothFactor: 0.1, // Lissage au relâchement
    orientationInertiaFactor: 0.15, // Inertie au démarrage
    responseCurve: "smooth",
  },
};

// Configuration par défaut (fallback)
export const DEFAULT_FLIGHT_CONFIG =
  DEVICE_SPECIFIC_CONFIGS[INPUT_DEVICE_TYPES.KEYBOARD];

// Fonction utilitaire pour obtenir la configuration selon le périphérique actif
export const getFlightConfigForDevice = (deviceType) => {
  return DEVICE_SPECIFIC_CONFIGS[deviceType] || DEFAULT_FLIGHT_CONFIG;
};

// Fonction pour mélanger les configurations (pour les cas où plusieurs périphériques sont actifs)
export const blendConfigs = (
  primaryDevice,
  secondaryDevice,
  blendFactor = 0.5
) => {
  const primaryConfig = getFlightConfigForDevice(primaryDevice);
  const secondaryConfig = getFlightConfigForDevice(secondaryDevice);

  const blendedConfig = { ...primaryConfig };

  // Mélanger les valeurs numériques
  Object.keys(primaryConfig).forEach((key) => {
    if (
      typeof primaryConfig[key] === "number" &&
      typeof secondaryConfig[key] === "number"
    ) {
      blendedConfig[key] =
        primaryConfig[key] * (1 - blendFactor) +
        secondaryConfig[key] * blendFactor;
    }
  });

  return blendedConfig;
};

// Facteurs d'accélération (maintenant aussi spécifiques par périphérique)
export const ACCELERATION_FACTORS = {
  [INPUT_DEVICE_TYPES.KEYBOARD]: {
    DEFAULT: 1.5,
    DISTANT: 3.2, // Plus élevé pour le clavier
    TRANSITION_SPEED: 0.08,
  },
  [INPUT_DEVICE_TYPES.GAMEPAD]: {
    DEFAULT: 1.3, // Plus doux pour la manette
    DISTANT: 2.8,
    TRANSITION_SPEED: 0.06, // Plus lent pour plus de fluidité
  },
  [INPUT_DEVICE_TYPES.TOUCH]: {
    DEFAULT: 1.2,
    DISTANT: 2.5,
    TRANSITION_SPEED: 0.05,
  },
};

// Fonction utilitaire pour obtenir les facteurs d'accélération selon le périphérique
export const getAccelerationFactorsForDevice = (deviceType) => {
  return (
    ACCELERATION_FACTORS[deviceType] ||
    ACCELERATION_FACTORS[INPUT_DEVICE_TYPES.KEYBOARD]
  );
};

// Modes de contrôle de caméra disponibles
export const CAMERA_MODES = {
  ORBIT: "orbit",
  FLIGHT: "flight",
};

// Paramètres de temporisation
export const AUTO_ROTATE_DELAY = 10000; // ms avant rotation automatique
export const AUTO_ORBIT_DELAY = 60000; // ms avant mode orbite
export const TRANSITION_DURATION = 2000; // ms pour la durée des transitions

// Paramètres du mode orbite
export const ORBIT_SETTINGS = {
  SPEED: 0.05, // Vitesse de déplacement orbital
  YAW: 0.8, // Vitesse de rotation sur l'axe Y
  PITCH: 0.02, // Vitesse de tangage
  ACCELERATION_TIME: 4.0, // Augmenté pour une accélération plus longue (était 2.0)
  AUTO_ROTATE_SPEED: 0.025, // Vitesse de rotation automatique
};

// Paramètres de retour à la position par défaut
export const DEFAULT_POSITION = new Vector3(0, 0, 2000);
export const DEFAULT_TARGET = new Vector3(0, 0, 0);
export const RETURN_VELOCITY = 10;
export const RETURN_ROTATION_SPEED = 0.1;
export const RETURN_DURATION = 2000;

// Paramètres audio
export const AUDIO_SETTINGS = {
  FADE_STEPS: 20, // Augmenté pour des transitions sonores plus longues (était 10)
  FADE_INTERVAL: 30, // Augmenté pour des transitions sonores plus longues (était 20)
};
