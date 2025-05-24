// Constantes de navigation pour l'ensemble de l'application
// Ce fichier centralise tous les paramètres liés à la navigation 3D

// Positions fixes pour l'oscillation de la caméra
import { Vector3 } from "three";

// Paramètres des positions de caméra
export const CAMERA_POSITIONS = [
  { position: new Vector3(0, 0, 2000), target: new Vector3(0, 0, 0) }, // Position vue globale à 2000 unités
  // { position: new Vector3(200, 100, 300), target: new Vector3(0, 0, 0) },
  // { position: new Vector3(-200, 50, 150), target: new Vector3(50, 0, 0) },
  // { position: new Vector3(0, 200, 100), target: new Vector3(0, 0, 0) },
  // { position: new Vector3(150, -100, 200), target: new Vector3(0, 50, 0) },
];

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
    gamepad: "A",
    description: "Position suivante",
  },
  TOGGLE_MODE: {
    key: "Tab",
    gamepad: "Y",
    description: "Changer de mode",
  },
  INTERACT: {
    key: "T",
    gamepad: "X",
    gamepadIndex: 2,
    description: "Interagir",
  },
};

// Paramètres du champ de vision
export const CAMERA_FOV = 50;

// Paramètres des limites spatiales
export const BASE_CAMERA_DISTANCE = 2000;
export const BOUNDING_SPHERE_RADIUS = 2400; // Rayon de la sphère limite au-delà de laquelle on revient à la position par défaut
export const ACCELERATION_DISTANCE_THRESHOLD = 10; // Distance à partir de laquelle on applique l'accélération
export const ORBIT_DISTANCE = 2000; // Distance fixe pour le mode d'orbite automatique

// Configuration du mode vol
export const DEFAULT_FLIGHT_CONFIG = {
  maxSpeed: 300, // Maintenu pour la vitesse maximale
  acceleration: 400, // Réduit pour une accélération plus progressive (était 800)
  deceleration: 0.92, // Augmenté pour une décélération plus longue (était 0.85)
  rotationSpeed: 1.2, // Augmenté pour une rotation plus sensible (était 0.5)
  deadzone: 0.08, // Maintenu pour la sensibilité
};

// Facteurs d'accélération
export const ACCELERATION_FACTORS = {
  DEFAULT: 1,
  DISTANT: 3,
  TRANSITION_SPEED: 0.04, // Réduit pour une transition plus progressive (était 0.08)
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
