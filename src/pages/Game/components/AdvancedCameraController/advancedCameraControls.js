import { Vector3, Euler, Quaternion } from "three";
import {
  CAMERA_POSITIONS,
  DEFAULT_FLIGHT_CONFIG,
  CAMERA_MODES,
  BOUNDING_SPHERE_RADIUS,
  ACCELERATION_DISTANCE_THRESHOLD,
  ACCELERATION_FACTORS,
  DEFAULT_POSITION,
  DEFAULT_TARGET,
  RETURN_VELOCITY,
  RETURN_ROTATION_SPEED,
  RETURN_DURATION,
  INPUT_DEVICE_TYPES,
  getFlightConfigForDevice,
  getAccelerationFactorsForDevice,
} from "./navigationConstants";
import { cameraMetricsManager, METRIC_TYPES } from "../../services/CameraMetricsManager";

// Re-export des constantes importantes
export { CAMERA_POSITIONS, DEFAULT_FLIGHT_CONFIG, CAMERA_MODES };

// Hook rbit gérer les entrées clavier pour le vol
export function useKeyboardFlightControls(onInput) {
  const keysPressed = {};

  const handleKeyDown = (event) => {
    keysPressed[event.code] = true;
    processKeys();
  };

  const handleKeyUp = (event) => {
    keysPressed[event.code] = false;
    processKeys();
  };

  const processKeys = () => {
    // Mouvement avant/arrière (Z/S)
    const thrust =
      (keysPressed["KeyW"] || keysPressed["ArrowUp"] ? 1 : 0) -
      (keysPressed["KeyS"] || keysPressed["ArrowDown"] ? 1 : 0);

    // Mouvement latéral (Q/D)
    const lateral =
      (keysPressed["KeyD"] || keysPressed["ArrowRight"] ? 1 : 0) -
      (keysPressed["KeyA"] || keysPressed["ArrowLeft"] ? 1 : 0);

    // Mouvement vertical (E/C)
    const upDown =
      (keysPressed["KeyE"] || keysPressed["Space"] ? 1 : 0) -
      (keysPressed["KeyC"] || keysPressed["ShiftLeft"] ? 1 : 0);

    // Rotation (Q/E pour le lacet, Z/S pour le tangage, A/D pour le roulis)
    const yaw = (keysPressed["KeyQ"] ? 1 : 0) - (keysPressed["KeyE"] ? 1 : 0);
    const pitch = (keysPressed["KeyZ"] ? 1 : 0) - (keysPressed["KeyX"] ? 1 : 0);
    const roll = (keysPressed["KeyR"] ? 1 : 0) - (keysPressed["KeyF"] ? 1 : 0);

    // Envoyer les entrées au gestionnaire
    onInput({
      thrust,
      lateral,
      upDown,
      yaw,
      pitch,
      roll,
    });
  };

  return {
    bind: () => {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    },
    unbind: () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
  };
}

// Utilitaire pour calculer la transition entre deux positions de caméra
export function calculateCameraTransition(
  camera,
  controls,
  startPos,
  endPos,
  progress,
  easing = true
) {
  // Appliquer une fonction d'easing cubique si demandé
  const t = easing
    ? progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2
    : progress;

  // Position temporaire pour l'interpolation
  const tempPos = new Vector3();
  const tempTarget = new Vector3();

  // Interpoler la position de la caméra
  tempPos.lerpVectors(startPos.position, endPos.position, t);
  tempTarget.lerpVectors(startPos.target, endPos.target, t);

  // Mettre à jour la caméra et les contrôles
  camera.position.copy(tempPos);

  if (controls && controls.target) {
    controls.target.copy(tempTarget);
    controls.update();
  } else {
    // En mode vol, on doit orienter la caméra manuellement vers la cible
    // Calculer une direction de la caméra vers la cible
    const lookDirection = new Vector3()
      .subVectors(tempTarget, tempPos)
      .normalize();

    // Créer un vecteur "up" pour l'orientation
    const upVector = new Vector3(0, 1, 0);

    // Orienter la caméra vers la cible
    camera.lookAt(tempTarget);

    // Option: ajuster l'orientation up de la caméra si nécessaire
    camera.up.copy(upVector);
  }

  return { position: tempPos, target: tempTarget };
}

// Gestionnaire du mode vol
export class FlightController {
  constructor(camera, config = DEFAULT_FLIGHT_CONFIG) {
    this.camera = camera;
    this._config = { ...DEFAULT_FLIGHT_CONFIG, ...config };
    this.velocity = new Vector3();
    this.tempVector = new Vector3();
    this.euler = new Euler(0, 0, 0, "YXZ");
    this.direction = new Vector3();

    // Paramètres pour la sphère limite
    this.boundingSphereRadius = BOUNDING_SPHERE_RADIUS;
    this.defaultPosition = DEFAULT_POSITION;
    this.defaultTarget = DEFAULT_TARGET;
    this.isReturningToDefault = false;

    // Périphérique actif et configurations dynamiques
    this.activeDevice = INPUT_DEVICE_TYPES.KEYBOARD;
    this.deviceConfig = getFlightConfigForDevice(this.activeDevice);
    this.deviceAccelerationFactors = getAccelerationFactorsForDevice(
      this.activeDevice
    );

    // Facteurs d'accélération pour la transition
    this.currentAccelerationFactor = this.deviceAccelerationFactors.DEFAULT;
    this.targetAccelerationFactor = this.deviceAccelerationFactors.DEFAULT;
    this.accelerationTransitionSpeed =
      this.deviceAccelerationFactors.TRANSITION_SPEED;

    // Entrées actuelles
    this.input = {
      thrust: 0,
      lateral: 0,
      upDown: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Entrées cibles (pour le lissage)
    this.targetInput = { ...this.input };

    // Vitesses d'orientation actuelles (pour l'inertie au démarrage)
    this.orientationVelocity = {
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Vitesse actuelle
    this.velocity = new Vector3(0, 0, 0);

    // Vecteur temporaire pour les calculs
    this.tempVector = new Vector3();

    // Pour les rotations
    this.quaternionTemp = new Quaternion();

    // Pour la transition entre positions
    this.transitionStart = null;
    this.transitionEnd = null;
    this.transitionProgress = 0;
    this.transitionDuration = RETURN_DURATION;
    this.isTransitioning = false;
    this.orbitControlsAfterTransition = false;

    // Limiter l'espace de jeu
    this.returnVelocity = RETURN_VELOCITY;
    this.returnRotationSpeed = RETURN_ROTATION_SPEED;
    this.returnStartPos = null;
    this.returnStartRot = null;
    this.returnProgress = 0;
    this.returnDuration = RETURN_DURATION;

    // Stockage des positions
    this.predefinedPositions = [];
    this.currentPredefinedPosition = -1;
  }

  // Accesseur pour la configuration
  get config() {
    return this._config;
  }

  // Mutateur pour la configuration
  set config(newConfig) {
    this._config = { ...DEFAULT_FLIGHT_CONFIG, ...newConfig };
  }

  // Nouvelle méthode pour mettre à jour le périphérique actif
  setActiveDevice(deviceType) {
    if (this.activeDevice !== deviceType) {
      console.log(
        `🎮 FLIGHT: Switching device configuration from ${this.activeDevice} to ${deviceType}`
      );

      this.activeDevice = deviceType;
      this.deviceConfig = getFlightConfigForDevice(deviceType);
      this.deviceAccelerationFactors =
        getAccelerationFactorsForDevice(deviceType);

      // Mettre à jour les facteurs d'accélération
      this.accelerationTransitionSpeed =
        this.deviceAccelerationFactors.TRANSITION_SPEED;

      // Exposer les informations pour le debug
      window.__activeDevice = deviceType;
      window.__deviceConfig = this.deviceConfig;

      console.log(
        `🎮 FLIGHT: New config - acceleration: ${this.deviceConfig.acceleration}, maxSpeed: ${this.deviceConfig.maxSpeed}`
      );
    }
  }

  // Obtenir la configuration effective (mélange entre config de base et config du périphérique)
  getEffectiveConfig() {
    return {
      ...this._config,
      ...this.deviceConfig,
    };
  }

  setInput(input) {
    // Mettre à jour les entrées cibles, pas directement les entrées actuelles
    this.targetInput = { ...this.targetInput, ...input };
  }

  update(delta) {
    // Protection contre les erreurs si la caméra n'est pas disponible
    if (!this.camera) return;

    // Si on est en train de retourner à la position par défaut, ne pas appliquer les contrôles normaux
    if (this.isReturningToDefault) {
      return;
    }

    // Utiliser la configuration effective (base + périphérique)
    const config = this.getEffectiveConfig();

    // Calculer la distance par rapport au centre pour déterminer le facteur d'accélération cible
    const distanceFromCenter = this.camera.position.length();
    this.targetAccelerationFactor =
      distanceFromCenter > ACCELERATION_DISTANCE_THRESHOLD
        ? this.deviceAccelerationFactors.DISTANT
        : this.deviceAccelerationFactors.DEFAULT;

    // Interpolation linéaire vers le facteur d'accélération cible
    if (
      Math.abs(this.currentAccelerationFactor - this.targetAccelerationFactor) >
      0.01
    ) {
      if (this.currentAccelerationFactor < this.targetAccelerationFactor) {
        this.currentAccelerationFactor += this.accelerationTransitionSpeed;
        if (this.currentAccelerationFactor > this.targetAccelerationFactor) {
          this.currentAccelerationFactor = this.targetAccelerationFactor;
        }
      } else {
        this.currentAccelerationFactor -= this.accelerationTransitionSpeed;
        if (this.currentAccelerationFactor < this.targetAccelerationFactor) {
          this.currentAccelerationFactor = this.targetAccelerationFactor;
        }
      }
    }

    // Utiliser le facteur d'accélération interpolé
    const accelerationFactor = this.currentAccelerationFactor;

    // Préparer les données pour le CameraMetricsManager
    const orientationVel = {
      yaw: Math.abs(this.orientationVelocity.yaw),
      pitch: Math.abs(this.orientationVelocity.pitch),
      roll: Math.abs(this.orientationVelocity.roll),
    };

    // Maintenir la compatibilité avec les variables globales pour le debug
    window.__accelerationFactor = accelerationFactor;
    window.__activeDeviceInFlight = this.activeDevice;
    window.__orientationVelocity = orientationVel;

    // Système d'inertie pour l'orientation avec accélération progressive
    // Mouvement (utilise le lissage simple)
    this.input.thrust +=
      (this.targetInput.thrust - this.input.thrust) *
      this.deviceConfig.orientationSmoothFactor;
    this.input.lateral +=
      (this.targetInput.lateral - this.input.lateral) *
      this.deviceConfig.orientationSmoothFactor;
    this.input.upDown +=
      (this.targetInput.upDown - this.input.upDown) *
      this.deviceConfig.orientationSmoothFactor;

    // Orientation (utilise le système d'inertie)
    // Yaw (lacet)
    const targetYawVelocity = this.targetInput.yaw * config.rotationSpeed;
    this.orientationVelocity.yaw +=
      (targetYawVelocity - this.orientationVelocity.yaw) *
      this.deviceConfig.orientationInertiaFactor;
    // Décélération quand pas d'entrée
    if (Math.abs(this.targetInput.yaw) < 0.001) {
      this.orientationVelocity.yaw *=
        1 - this.deviceConfig.orientationSmoothFactor;
    }
    this.input.yaw = this.orientationVelocity.yaw / config.rotationSpeed;

    // Pitch (tangage)
    const targetPitchVelocity = this.targetInput.pitch * config.rotationSpeed;
    this.orientationVelocity.pitch +=
      (targetPitchVelocity - this.orientationVelocity.pitch) *
      this.deviceConfig.orientationInertiaFactor;
    // Décélération quand pas d'entrée
    if (Math.abs(this.targetInput.pitch) < 0.001) {
      this.orientationVelocity.pitch *=
        1 - this.deviceConfig.orientationSmoothFactor;
    }
    this.input.pitch = this.orientationVelocity.pitch / config.rotationSpeed;

    // Roll (roulis)
    const targetRollVelocity = this.targetInput.roll * config.rotationSpeed;
    this.orientationVelocity.roll +=
      (targetRollVelocity - this.orientationVelocity.roll) *
      this.deviceConfig.orientationInertiaFactor;
    // Décélération quand pas d'entrée
    if (Math.abs(this.targetInput.roll) < 0.001) {
      this.orientationVelocity.roll *=
        1 - this.deviceConfig.orientationSmoothFactor;
    }
    this.input.roll = this.orientationVelocity.roll / config.rotationSpeed;

    // Calculer l'accélération dans la direction de vue (avant/arrière)
    if (Math.abs(this.input.thrust) > 0.001) {
      this.tempVector
        .set(0, 0, -1)
        .applyQuaternion(this.camera.quaternion)
        .multiplyScalar(
          this.input.thrust * config.acceleration * delta * accelerationFactor
        );
      this.velocity.add(this.tempVector);
    }

    // Mouvement latéral (gauche/droite)
    if (Math.abs(this.input.lateral) > 0.001) {
      this.tempVector
        .set(1, 0, 0)
        .applyQuaternion(this.camera.quaternion)
        .multiplyScalar(
          this.input.lateral * config.acceleration * delta * accelerationFactor
        );
      this.velocity.add(this.tempVector);
    }

    // Mouvement vertical (haut/bas)
    if (Math.abs(this.input.upDown) > 0.001) {
      this.tempVector
        .set(0, 1, 0)
        .multiplyScalar(
          this.input.upDown * config.acceleration * delta * accelerationFactor
        );
      this.velocity.add(this.tempVector);
    }

    // Appliquer la décélération
    this.velocity.multiplyScalar(config.deceleration);

    // Limiter la vitesse maximale
    const currentSpeed = this.velocity.length();
    // Ajuster la vitesse maximale en fonction du facteur d'accélération
    const adjustedMaxSpeed = config.maxSpeed * accelerationFactor;
    
    // Maintenir la compatibilité avec les variables globales pour le debug
    window.__adjustedMaxSpeed = adjustedMaxSpeed;
    window.__cameraSpeed = currentSpeed;

    // **NOUVEAU SYSTÈME PRODUCTION GRADE**
    // Envoyer toutes les métriques au gestionnaire centralisé
    cameraMetricsManager.updateFromCamera({
      position: this.camera.position,
      velocity: this.velocity,
      orientationVelocity: orientationVel,
      accelerationFactor: accelerationFactor,
      flightState: this.isReturningToDefault ? 'returning' : 'normal',
      delta: delta
    });

    if (currentSpeed > adjustedMaxSpeed) {
      this.velocity.multiplyScalar(adjustedMaxSpeed / currentSpeed);
    }

    // Appliquer le mouvement
    this.camera.position.add(this.velocity.clone().multiplyScalar(delta));

    // Vérifier si le joueur est en dehors de la sphère limite
    if (distanceFromCenter > this.boundingSphereRadius) {
      // Afficher un message dans le HUD
      if (window.__showHUDMessage) {
        window.__showHUDMessage(
          "Navigation limit reached - Returning home",
          3000
        );
      }

      this.returnToDefaultPosition();
      return;
    }

    // Obtenir l'orientation actuelle de la caméra
    this.euler.setFromQuaternion(this.camera.quaternion);

    // APPLICATION DIRECTE: Appliquer directement les entrées de rotation
    // Lacet (yaw - rotation horizontale)
    if (Math.abs(this.input.yaw) > 0.001) {
      this.euler.y -= this.input.yaw * config.rotationSpeed * delta;
    }

    // Tangage (pitch - rotation verticale)
    if (Math.abs(this.input.pitch) > 0.001) {
      // Limiter le tangage (pitch) pour éviter de tourner à 180°
      this.euler.x = Math.max(
        -Math.PI / 2,
        Math.min(
          Math.PI / 2,
          this.euler.x + this.input.pitch * config.rotationSpeed * delta
        )
      );
    }

    // Roulis (roll - rotation sur l'axe de visée)
    if (Math.abs(this.input.roll) > 0.001) {
      // Limiter le roulis (roll)
      this.euler.z = Math.max(
        -Math.PI / 4,
        Math.min(
          Math.PI / 4,
          this.euler.z + this.input.roll * config.rotationSpeed * delta
        )
      );
    } else {
      // Auto-stabilisation du roulis quand pas d'entrée
      this.euler.z *= 0.95; // Facteur de stabilisation
    }

    // Appliquer les rotations
    this.camera.quaternion.setFromEuler(this.euler);
  }

  // Méthode pour retourner à la position par défaut
  returnToDefaultPosition() {
    // Éviter des appels multiples
    if (this.isReturningToDefault) return;

    console.log(
      `Limite de ${this.boundingSphereRadius} dépassée - Simulation d'une action utilisateur pour transition fluide`
    );
    this.isReturningToDefault = true;

    // Réinitialiser la vitesse et la rotation
    this.velocity.set(0, 0, 0);

    // Pour simuler exactement l'action d'un utilisateur qui appuie sur une touche de position,
    // on va accéder directement au gestionnaire d'entrées global et déclencher le nextPosition
    if (window.getInputManager) {
      const inputManager = window.getInputManager();
      if (inputManager) {
        // Déclencher l'action nextPosition comme si l'utilisateur avait appuyé sur la touche
        inputManager.triggerNextPositionAction();

        // Réactiver les contrôles après la transition (après le délai d'animation)
        setTimeout(() => {
          this.isReturningToDefault = false;
        }, this.returnDuration + 500);
        return;
      }
    }

    // Si le gestionnaire d'entrées n'est pas disponible, on essaie avec l'animation directe
    if (typeof window.__animateToCameraPosition === "function") {
      console.log("Appel direct de la fonction d'animation");
      // Appel direct de l'animation (position 0 = vue globale, true = activer orbite ensuite)
      window.__animateToCameraPosition(0, true);

      setTimeout(() => {
        this.isReturningToDefault = false;
      }, this.returnDuration + 500);
    } else {
      // Solution de dernier recours - téléportation directe
      this.camera.position.copy(this.defaultPosition);
      this.camera.lookAt(this.defaultTarget);

      // Définir les valeurs globales pour cohérence
      window.__cameraPosition = {
        x: this.defaultPosition.x,
        y: this.defaultPosition.y,
        z: this.defaultPosition.z,
      };
      window.__orbitModeActive = true;

      setTimeout(() => {
        this.isReturningToDefault = false;
      }, 500);
    }
  }

  reset() {
    this.velocity.set(0, 0, 0);
    this.isReturningToDefault = false;

    this.input = {
      thrust: 0,
      lateral: 0,
      upDown: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Réinitialiser aussi les entrées cibles
    this.targetInput = {
      thrust: 0,
      lateral: 0,
      upDown: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Réinitialiser les vitesses d'orientation
    this.orientationVelocity = {
      yaw: 0,
      pitch: 0,
      roll: 0,
    };

    // Réinitialiser le roulis à zéro pour une vue normale
    if (this.camera) {
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.z = 0;
      this.camera.quaternion.setFromEuler(this.euler);
    }
  }
}
