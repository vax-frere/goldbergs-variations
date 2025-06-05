import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import useSound from "use-sound";
import {
  FlightController,
  calculateCameraTransition,
} from "./advancedCameraControls";
import {
  CAMERA_POSITIONS,
  CAMERA_MODES,
  DEFAULT_FLIGHT_CONFIG,
  CAMERA_FOV,
  AUTO_ROTATE_DELAY,
  AUTO_ORBIT_DELAY,
  TRANSITION_DURATION,
  ORBIT_SETTINGS,
  AUDIO_SETTINGS,
  ORBIT_DISTANCE,
} from "./navigationConstants";
import { getInputManager, useInputs } from "./inputManager";
import {
  GamepadIndicator,
  CrosshairIndicator,
  sendStartCountingSignal,
} from "./CameraIndicators";
import useGameStore from "../../store";

/**
 * Contrôleur de caméra avancé en mode vol libre uniquement
 */
export function AdvancedCameraController({
  config = DEFAULT_FLIGHT_CONFIG,
  disabled = false,
}) {
  const { camera, gl } = useThree();
  const setCamera = useGameStore((state) => state.setCamera);
  const controlsRef = useRef(null);
  const [mode, setMode] = useState(CAMERA_MODES.FLIGHT);
  const [positionIndex, setPositionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const flightController = useRef(null);
  const transitioning = useRef({
    active: false,
    startTime: 0,
    duration: TRANSITION_DURATION / 1000, // Convertir ms en secondes
    startPosition: new Vector3(),
    startTarget: new Vector3(),
    endPosition: new Vector3(),
    endTarget: new Vector3(),
  });

  // Définir la valeur de FOV constante
  const fov = CAMERA_FOV;

  // Appliquer le FOV à la caméra quand elle change
  useEffect(() => {
    if (camera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  // Variables for automatic rotation
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const lastInteractionTime = useRef(Date.now());
  const autoRotateTimerId = useRef(null);
  const AUTO_ROTATE_SPEED = ORBIT_SETTINGS.AUTO_ROTATE_SPEED;
  const [orbitModeActive, setOrbitModeActive] = useState(false);
  const orbitTimerId = useRef(null);
  const orbitAttempted = useRef(false); // Nouvel état pour suivre les tentatives d'activation

  // Paramètres d'orbite et de rotation
  const ORBIT_SPEED = ORBIT_SETTINGS.SPEED;
  const ORBIT_YAW = ORBIT_SETTINGS.YAW;
  const ORBIT_PITCH = ORBIT_SETTINGS.PITCH;
  const ORBIT_ACCELERATION_TIME = ORBIT_SETTINGS.ACCELERATION_TIME;

  // Timers et références pour l'accélération
  const orbitStartTime = useRef(null);

  // Sound for acceleration - utiliser deux instances pour des transitions douces
  const [
    playAcceleration1,
    { stop: stopAcceleration1, sound: accelerationSound1 },
  ] = useSound(`${import.meta.env.BASE_URL}sounds/acceleration.mp3`, {
    volume: 0,
    loop: true,
    interrupt: false,
    soundEnabled: true,
    playbackRate: 1,
  });

  const [
    playAcceleration2,
    { stop: stopAcceleration2, sound: accelerationSound2 },
  ] = useSound(`${import.meta.env.BASE_URL}sounds/acceleration.mp3`, {
    volume: 0,
    loop: true,
    interrupt: false,
    soundEnabled: true,
    playbackRate: 1,
  });

  // Référence à l'instance active du son
  const activeAccelerationSound = useRef(null);
  const accelerationPlaying = useRef(false);
  const currentAccelerationVolume = useRef(0);
  const currentAccelerationPitch = useRef(1);

  // Référence pour stocker la position précédente de la caméra
  const previousCameraPosition = useRef(new Vector3());
  // Référence pour stocker la vitesse réelle calculée de la caméra
  const realCameraSpeed = useRef(0);

  // Fonction pour démarrer le son avec un fondu
  const startAccelerationSound = () => {
    if (!accelerationPlaying.current) {
      // Déterminer quelle instance utiliser (alterner entre les deux)
      const useFirstInstance =
        !activeAccelerationSound.current ||
        activeAccelerationSound.current === accelerationSound2;

      // Stopper l'instance précédente si elle existe
      if (activeAccelerationSound.current) {
        if (activeAccelerationSound.current === accelerationSound1) {
          stopAcceleration1();
        } else {
          stopAcceleration2();
        }
      }

      // Configurer et démarrer la nouvelle instance
      if (useFirstInstance) {
        // Démarrer la première instance à volume zéro
        accelerationSound1.volume(0);
        playAcceleration1();
        activeAccelerationSound.current = accelerationSound1;
      } else {
        // Démarrer la seconde instance à volume zéro
        accelerationSound2.volume(0);
        playAcceleration2();
        activeAccelerationSound.current = accelerationSound2;
      }

      accelerationPlaying.current = true;

      // S'assurer que le volume commence à zéro
      currentAccelerationVolume.current = 0;
    }
  };

  // Fonction pour arrêter le son avec un fondu
  const stopAccelerationSound = () => {
    if (accelerationPlaying.current && activeAccelerationSound.current) {
      // Créer un fondu de sortie progressif
      const currentVolume = currentAccelerationVolume.current;
      let fadeStep = currentVolume / AUDIO_SETTINGS.FADE_STEPS;
      let currentStep = 0;

      // Utiliser un intervalle pour créer un fondu de sortie manuel
      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, currentVolume - fadeStep * currentStep);

        if (activeAccelerationSound.current) {
          activeAccelerationSound.current.volume(newVolume);
        }

        if (currentStep >= AUDIO_SETTINGS.FADE_STEPS || newVolume <= 0) {
          clearInterval(fadeInterval);

          // Arrêter le son une fois le fondu terminé
          if (activeAccelerationSound.current === accelerationSound1) {
            stopAcceleration1();
          } else {
            stopAcceleration2();
          }

          accelerationPlaying.current = false;
          activeAccelerationSound.current = null;
        }
      }, AUDIO_SETTINGS.FADE_INTERVAL); // Intervalles de 20ms
    }
  };

  // Récupérer les entrées unifiées (clavier et manette)
  const inputs = useInputs();
  const prevInputs = useRef({});

  // Exposer l'état global pour d'autres composants
  useEffect(() => {
    window.__cameraAnimating = false;
    window.__cameraMode = mode;
    window.__orbitModeActive = false;
    window.__cameraPosition = null;
    window.__cameraTarget = null;
    window.__cameraSpeed = 0;

    return () => {
      window.__cameraAnimating = undefined;
      window.__cameraMode = undefined;
      window.__orbitModeActive = undefined;
      window.__cameraPosition = undefined;
      window.__cameraTarget = undefined;
      window.__cameraSpeed = undefined;
    };
  }, []);

  // Mise à jour de l'état global quand le mode change
  useEffect(() => {
    window.__cameraMode = mode;
  }, [mode]);

  // Mise à jour de l'état global quand l'animation change
  useEffect(() => {
    window.__cameraAnimating = isTransitioning;
  }, [isTransitioning]);

  // Mise à jour de l'état global quand le mode orbite change
  useEffect(() => {
    // Mémoriser l'état précédent
    const prevOrbitMode = window.__orbitModeActive;

    window.__orbitModeActive = orbitModeActive;

    // Afficher les changements d'état
    console.log(
      `🔄 TRANSITION: ${
        orbitModeActive ? "Orbit mode ENABLED" : "Orbit mode DISABLED"
      }`
    );

    // Si l'orbite est activée, enregistrer le temps de démarrage pour l'accélération
    if (orbitModeActive) {
      orbitStartTime.current = Date.now();
      console.log(
        `🌐 MODE: Orbit active, position: [${camera.position.x.toFixed(
          2
        )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`
      );

      // Afficher un message dans le HUD
      if (window.__showHUDMessage) {
        window.__showHUDMessage("Auto-orbit enabled", 3000);
      }
    }

    // Si on vient de désactiver le mode orbite, réinitialiser le FlightController
    // pour éviter que la rotation continue avec l'inertie
    if (!orbitModeActive && flightController.current) {
      flightController.current.reset();
      // Réinitialiser le timer d'accélération
      orbitStartTime.current = null;
      console.log(
        `🏃‍♂️ MODE: Free flight resumed at [${camera.position.x.toFixed(
          2
        )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`
      );

      // Si on passe effectivement du mode orbite au mode normal
      // (et non pas lors de l'initialisation où prevOrbitMode est undefined)
      if (prevOrbitMode === true) {
        console.log(`📊 TRACKING: Post counter reset after exiting orbit mode`);
        // Redémarrer le compteur de posts
        sendStartCountingSignal();

        // Afficher un message dans le HUD
        if (window.__showHUDMessage) {
          window.__showHUDMessage("Free flight mode", 3000);
        }
      }
    }

    // Forcer une vérification supplémentaire après un court délai
    // pour s'assurer que l'état global est bien synchronisé
    setTimeout(() => {
      if (window.__orbitModeActive !== orbitModeActive) {
        window.__orbitModeActive = orbitModeActive;
      }
    }, 100);
  }, [orbitModeActive, camera]);

  // Configurer le gestionnaire d'entrées
  useEffect(() => {
    // Mettre à jour la configuration du gestionnaire d'entrées
    const inputManager = getInputManager();
    inputManager.updateConfig({
      deadzone: config.deadzone,
    });

    // Cleanup
    return () => {
      // Rien à faire ici, car le gestionnaire d'entrées est un singleton global
    };
  }, [config]);

  // Initialiser la caméra à la position 0 (vue globale à 2000 unités)
  useEffect(() => {
    if (camera) {
      // Définir la position initiale de la caméra avec un délai pour permettre
      // au système de se stabiliser au démarrage

      // On commence par désactiver toute transition ou orbite
      transitioning.current.active = false;
      setIsTransitioning(false);
      setOrbitModeActive(false);

      // Puis on place la caméra à sa position initiale
      animateToCameraPosition(0);

      // Une fois la position initiale définie, on démarrer le timer d'inactivité
      // avec un délai pour éviter les conflits avec la transition initiale
      setTimeout(() => {
        detectUserActivity();
      }, 2000); // Délai de 2 secondes
    }
  }, [camera]);

  // Fonction pour détecter l'activité utilisateur et gérer les timers d'inactivité
  const detectUserActivity = () => {
    const previousState = {
      autoRotate: autoRotateEnabled,
      orbit: orbitModeActive,
    };

    lastInteractionTime.current = Date.now();
    orbitAttempted.current = false; // Réinitialiser également cet état

    // Exposer le temps d'inactivité et le temps restant pour l'interface
    window.__lastInteractionTime = lastInteractionTime.current;
    window.__autoOrbitDelay = AUTO_ORBIT_DELAY;

    // If auto rotation or orbit mode is enabled, disable it
    if (autoRotateEnabled) {
      setAutoRotateEnabled(false);
    }

    if (orbitModeActive) {
      setOrbitModeActive(false);

      // Réinitialiser le FlightController pour éviter l'effet d'inertie de rotation
      if (flightController.current) {
        flightController.current.reset();
      }

      // Redémarrer le compteur de posts quand le mode orbite est désactivé par detectUserActivity
      console.log(
        `📊 COMPTAGE: Redémarrage du compteur de posts après désactivation du mode orbite`
      );
      sendStartCountingSignal();
    }

    // Log les changements d'état
    if (
      previousState.autoRotate !== autoRotateEnabled ||
      previousState.orbit !== orbitModeActive
    ) {
      console.log(
        `🔄 TRANSITION: User activity detected - State changes: auto-rotation: ${autoRotateEnabled}, orbit: ${orbitModeActive}`
      );
    }

    // Cancel existing timers
    if (autoRotateTimerId.current) {
      clearTimeout(autoRotateTimerId.current);
      autoRotateTimerId.current = null;
    }

    if (orbitTimerId.current) {
      clearTimeout(orbitTimerId.current);
    }

    // Ne programmer les timers que si on est en mode normal
    // (pas en transition et pas en mode orbite)
    if (!transitioning.current.active && !orbitModeActive) {
      // Program auto rotation activation after delay
      autoRotateTimerId.current = setTimeout(() => {
        // Vérifier à nouveau qu'on n'est pas en transition ou en orbite avant d'activer
        if (!transitioning.current.active && !orbitModeActive) {
          console.log(
            `🔄 TRANSITION: Auto-rotation activated after inactivity`
          );
          setAutoRotateEnabled(true);
        }
      }, AUTO_ROTATE_DELAY);

      // Program orbit mode activation after delay
      orbitTimerId.current = setTimeout(() => {
        // Vérifier à nouveau qu'on n'est pas en transition ou en orbite avant d'activer
        if (!transitioning.current.active && !orbitModeActive) {
          orbitAttempted.current = true;
          console.log(
            `📅 SCHEDULED: Auto-orbit mode after extended inactivity`
          );

          // Déclencher également un événement personnalisé pour la communication intra-page
          try {
            const resetEvent = new CustomEvent("resetVisitedPosts", {
              detail: { timestamp: Date.now() },
            });
            window.dispatchEvent(resetEvent);
          } catch (error) {
            // Silencieux en cas d'erreur
          }

          // Retourner à la position initiale directement
          console.log(
            `Retour à la position initiale après inactivité et activation du mode orbite`
          );

          // Animer la caméra vers la position 0 (vue d'ensemble) et activer le mode orbite
          animateToCameraPosition(0, true);
        }
      }, AUTO_ORBIT_DELAY);
    }
  };

  // Add event listeners for mouse movements and clicks
  useEffect(() => {
    const handleMouseActivity = () => detectUserActivity();

    // Add event listeners to window level
    window.addEventListener("mousemove", handleMouseActivity);
    window.addEventListener("mousedown", handleMouseActivity);
    window.addEventListener("mouseup", handleMouseActivity);
    window.addEventListener("keydown", handleMouseActivity);
    window.addEventListener("wheel", handleMouseActivity);
    window.addEventListener("touchstart", handleMouseActivity);
    window.addEventListener("touchmove", handleMouseActivity);

    // Add specifically to Three.js canvas event listeners
    // These listeners are essential to detect user interaction
    if (gl && gl.domElement) {
      window.addEventListener("mousemove", handleMouseActivity, {
        passive: true,
      });
      window.addEventListener("mousedown", handleMouseActivity, {
        passive: true,
      });
      window.addEventListener("mouseup", handleMouseActivity, {
        passive: true,
      });
      window.addEventListener("touchstart", handleMouseActivity, {
        passive: true,
      });
      window.addEventListener("touchmove", handleMouseActivity, {
        passive: true,
      });
      window.addEventListener("wheel", handleMouseActivity, {
        passive: true,
      });
    }

    // Start initial timer
    detectUserActivity();

    // Cleanup on unmount
    return () => {
      // Cleanup window event listeners
      window.removeEventListener("mousemove", handleMouseActivity);
      window.removeEventListener("mousedown", handleMouseActivity);
      window.removeEventListener("mouseup", handleMouseActivity);
      window.removeEventListener("keydown", handleMouseActivity);
      window.removeEventListener("wheel", handleMouseActivity);
      window.removeEventListener("touchstart", handleMouseActivity);
      window.removeEventListener("touchmove", handleMouseActivity);

      // Cleanup canvas event listeners
      if (gl && gl.domElement) {
        gl.domElement.removeEventListener("mousemove", handleMouseActivity);
        gl.domElement.removeEventListener("mousedown", handleMouseActivity);
        gl.domElement.removeEventListener("mouseup", handleMouseActivity);
        gl.domElement.removeEventListener("touchstart", handleMouseActivity);
        gl.domElement.removeEventListener("touchmove", handleMouseActivity);
        gl.domElement.removeEventListener("wheel", handleMouseActivity);
      }

      if (autoRotateTimerId.current) {
        clearTimeout(autoRotateTimerId.current);
      }
    };
  }, [gl]); // Add dependencies to recreate listeners if necessary

  // Handle unified inputs
  useEffect(() => {
    // Si on est en mode orbite et que n'importe quelle entrée est détectée, désactiver l'orbite
    if (orbitModeActive) {
      const hasAnyInput =
        inputs.moveForward !== 0 ||
        inputs.moveRight !== 0 ||
        inputs.moveUp !== 0 ||
        inputs.lookHorizontal !== 0 ||
        inputs.lookVertical !== 0 ||
        inputs.roll !== 0 ||
        inputs.toggleMode ||
        inputs.nextPosition ||
        inputs.action1 ||
        inputs.action2 ||
        inputs.returnHome;

      if (hasAnyInput) {
        console.log(`👆 INTERACTION: Orbit mode disabled by user input`);
        setOrbitModeActive(false);

        // Réinitialiser le FlightController pour éviter l'effet d'inertie de rotation
        if (flightController.current) {
          flightController.current.reset();
        }

        // Redémarrer le compteur de posts quand l'utilisateur sort manuellement du mode orbite
        console.log(`📊 TRACKING: Post counter reset after user interaction`);
        sendStartCountingSignal();

        detectUserActivity();
      }
    }

    // Si des entrées non-nulles sont détectées, signaler l'activité
    const hasNonZeroInput =
      inputs.moveForward !== 0 ||
      inputs.moveRight !== 0 ||
      inputs.moveUp !== 0 ||
      inputs.lookHorizontal !== 0 ||
      inputs.lookVertical !== 0 ||
      inputs.roll !== 0 ||
      inputs.toggleMode ||
      inputs.nextPosition ||
      inputs.returnHome;

    if (hasNonZeroInput) {
      detectUserActivity();
    }

    // React to return home request
    if (
      inputs.returnHome &&
      !prevInputs.current.returnHome &&
      !isTransitioning
    ) {
      console.log("🏠 ACTION: Return home requested");
      animateToCameraPosition(0, true);
    }

    // React to following position request
    if (
      inputs.nextPosition &&
      !prevInputs.current.nextPosition &&
      !isTransitioning
    ) {
      const nextIndex = (positionIndex + 1) % CAMERA_POSITIONS.length;
      animateToCameraPosition(nextIndex);
    }

    // Update previous inputs
    prevInputs.current = { ...inputs };
  }, [inputs, isTransitioning, positionIndex, orbitModeActive]);

  // Fonction pour calculer la vitesse réelle de la caméra
  const calculateRealCameraSpeed = (camera, delta) => {
    if (!camera || !previousCameraPosition.current || delta === 0) {
      return 0;
    }

    // Calculer la distance parcourue depuis la dernière frame
    const distance = camera.position.distanceTo(previousCameraPosition.current);

    // Calculer la vitesse (distance / temps)
    const speed = distance / delta;

    // Mettre à jour la position précédente
    previousCameraPosition.current.copy(camera.position);

    // Lisser la vitesse pour éviter les changements brusques
    realCameraSpeed.current = realCameraSpeed.current * 0.9 + speed * 0.1;

    // Normaliser la vitesse par rapport à la vitesse max du FlightController
    // Utiliser une valeur plus faible pour augmenter la sensibilité
    const normalizedSpeed = realCameraSpeed.current / (config.maxSpeed * 2);

    // Exposer la vitesse pour le débogage
    window.__cameraSpeed = realCameraSpeed.current;

    return Math.min(normalizedSpeed, 1);
  };

  // Animation by frame for flight mode and transitions
  useFrame((state, delta) => {
    // Initialiser la position précédente si c'est la première frame
    if (!previousCameraPosition.current.x && camera) {
      previousCameraPosition.current.copy(camera.position);
    }

    // Calculer la vitesse réelle de la caméra pour tous les modes
    const realSpeed = calculateRealCameraSpeed(camera, delta);

    // Gestion du son d'accélération basée sur la vitesse réelle
    // Abaisser le seuil pour plus de sensibilité
    if (realSpeed > 0.01) {
      if (!accelerationPlaying.current) {
        startAccelerationSound();
      }

      // Ajuster le volume et le pitch en fonction de la vitesse réelle
      if (activeAccelerationSound.current && accelerationPlaying.current) {
        // Volume basé sur la vitesse (augmenter la sensibilité)
        const targetVolume = Math.min(realSpeed * 4, 1);
        currentAccelerationVolume.current =
          currentAccelerationVolume.current * 0.95 + targetVolume * 0.05;

        // Pitch basé sur la vitesse
        const targetPitch = 0.8 + realSpeed * 0.8; // Range from 0.8 to 1.6
        currentAccelerationPitch.current =
          (currentAccelerationPitch.current || 1) * 0.95 + targetPitch * 0.05;

        // Appliquer les changements
        activeAccelerationSound.current.volume(
          currentAccelerationVolume.current
        );

        // Appliquer la modulation de hauteur (pitch)
        try {
          if (typeof activeAccelerationSound.current.rate === "function") {
            activeAccelerationSound.current.rate(
              currentAccelerationPitch.current
            );
          } else if (
            activeAccelerationSound.current._sounds &&
            activeAccelerationSound.current._sounds.length > 0
          ) {
            activeAccelerationSound.current._sounds.forEach((sound) => {
              if (
                sound._node &&
                typeof sound._node.playbackRate !== "undefined"
              ) {
                sound._node.playbackRate.value =
                  currentAccelerationPitch.current;
              }
            });
          }
        } catch (error) {
          // Silencieux en cas d'erreur
        }
      }
    } else if (realSpeed <= 0.01 && accelerationPlaying.current) {
      stopAccelerationSound();
    }

    // Exposer les positions de la caméra et de sa cible pour l'interface utilisateur
    if (camera) {
      // Exposer la position actuelle
      window.__cameraPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };

      // Calculer et exposer une approximation de la cible
      const target = new Vector3(0, 0, -100)
        .applyQuaternion(camera.quaternion)
        .add(camera.position);
      window.__cameraTarget = {
        x: target.x,
        y: target.y,
        z: target.z,
      };

      // Mise à jour du temps restant avant l'activation de l'auto-orbite
      // seulement si nous ne sommes ni en transition ni en orbite
      if (
        !transitioning.current.active &&
        !orbitModeActive &&
        window.__lastInteractionTime
      ) {
        const elapsedTime = Date.now() - window.__lastInteractionTime;
        const remainingTime = Math.max(
          0,
          window.__autoOrbitDelay - elapsedTime
        );
        window.__timeBeforeAutoOrbit = remainingTime;
      } else if (transitioning.current.active || orbitModeActive) {
        // Si en transition ou en orbite, il n'y a pas de compte à rebours
        window.__timeBeforeAutoOrbit = null;
      }
    }

    // Handle camera transitions
    if (transitioning.current.active) {
      const elapsed = (Date.now() - transitioning.current.startTime) / 1000;
      const progress = Math.min(elapsed / transitioning.current.duration, 1);

      // Calculer la nouvelle position et orientation de la caméra
      calculateCameraTransition(
        camera,
        null, // On n'utilise plus controlsRef ici
        {
          position: transitioning.current.startPosition,
          target: transitioning.current.startTarget,
        },
        {
          position: transitioning.current.endPosition,
          target: transitioning.current.endTarget,
        },
        progress
      );

      // Exposer l'état d'animation pour l'interface utilisateur
      window.__cameraAnimating = true;

      if (progress >= 1) {
        transitioning.current.active = false;
        setIsTransitioning(false);
        window.__cameraAnimating = false;

        // Une fois la transition terminée, réinitialiser le FlightController pour éviter des mouvements brusques
        if (flightController.current) {
          flightController.current.reset();
        }

        console.log(
          `📊 MODE: Transition complétée, position finale: [${camera.position.x.toFixed(
            2
          )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}]`
        );

        // Reset input handler for allowing new transitions
        const inputManager = getInputManager();
        if (inputManager.inputs.nextPosition) {
          setTimeout(() => {
            // Force nextPosition state reset
            inputManager.inputs.nextPosition = false;
            inputManager.notifyListeners();
          }, 100);
        }
      }
    }
    // Mode orbite automatique
    else if (orbitModeActive && flightController.current) {
      // En mode orbite, on applique une rotation lente autour de la sphère
      // Log moins fréquent pour éviter de saturer la console
      if (Math.random() < 0.01) {
        // Log occasionnel pour montrer la progression de l'accélération
      }

      // S'assurer que le mode orbite est correctement reflété dans l'état global
      window.__orbitModeActive = true;

      // Calculer le facteur d'accélération entre 0 et 1
      let accelerationFactor = 1.0; // Par défaut, vitesse complète

      if (orbitStartTime.current) {
        const elapsedTime = (Date.now() - orbitStartTime.current) / 1000; // en secondes

        if (elapsedTime < ORBIT_ACCELERATION_TIME) {
          // Utiliser une courbe d'accélération cubique (easeInOutCubic)
          // qui démarre doucement, accélère au milieu, puis ralentit l'accélération vers la fin
          const progress = elapsedTime / ORBIT_ACCELERATION_TIME;

          // Courbe easeInOutCubic
          accelerationFactor =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          if (Math.random() < 0.05) {
            // Log occasionnel pour montrer la progression de l'accélération
          }
        } else {
          // Après la période d'accélération, vitesse constante maximale
          accelerationFactor = 1.0;
          // On peut réinitialiser la référence pour économiser les calculs
          orbitStartTime.current = null;
        }
      }

      // Appliquer le facteur d'accélération aux paramètres de rotation
      const orbitInput = {
        thrust: 0,
        lateral: 0,
        upDown: 0,
        yaw: ORBIT_YAW * accelerationFactor,
        pitch: ORBIT_PITCH * accelerationFactor,
        roll: 0,
      };

      // Calculer un mouvement orbital RÉEL autour du centre
      // Obtenir la position actuelle par rapport au centre
      const position = camera.position.clone();
      const distance = position.length();

      // Maintenir la distance avec le centre (0,0,0)
      if (Math.abs(distance - ORBIT_DISTANCE) > 10) {
        const direction = position.clone().normalize();
        const targetPos = direction.multiplyScalar(ORBIT_DISTANCE);
        camera.position.lerp(targetPos, 0.05);
      }

      // ---------- AJOUT DU MOUVEMENT ORBITAL ----------
      // Créer un mouvement orbital en déplaçant la caméra autour du centre
      // en plus de la rotation de la caméra elle-même

      // 1. Calculer l'angle actuel dans le plan XZ
      const angleXZ = Math.atan2(camera.position.x, camera.position.z);

      // 2. Créer un nouvel angle en ajoutant une rotation (plus rapide que le yaw pour un effet visible)
      // Appliquer également le facteur d'accélération à la vitesse de déplacement orbital
      const orbitSpeed = ORBIT_SPEED * delta * accelerationFactor;
      const newAngleXZ = angleXZ + orbitSpeed;

      // 3. Calculer la nouvelle position en conservant la même hauteur et distance
      const horizontalDistance = Math.sqrt(
        camera.position.x * camera.position.x +
          camera.position.z * camera.position.z
      );
      const newX = Math.sin(newAngleXZ) * horizontalDistance;
      const newZ = Math.cos(newAngleXZ) * horizontalDistance;

      // 4. Appliquer la nouvelle position tout en maintenant la hauteur (Y)
      camera.position.x = newX;
      camera.position.z = newZ;

      // Fin des ajouts pour le mouvement orbital

      // Appliquer la rotation de la caméra elle-même (pour qu'elle tourne sur elle-même)
      flightController.current.setInput(orbitInput);
      flightController.current.update(delta);

      // S'assurer que la caméra pointe toujours vers le centre
      camera.lookAt(0, 0, 0);
    }
    // On est en mode vol, mais pas en transition ni en mode orbite
    else if (flightController.current && !transitioning.current.active) {
      // S'assurer que le mode orbite est correctement reflété dans l'état global
      window.__orbitModeActive = false;

      // In flight mode, apply inputs to flight controller
      const flightInput = {
        thrust: inputs.moveForward,
        lateral: inputs.moveRight,
        upDown: inputs.moveUp,
        yaw: inputs.lookHorizontal,
        pitch: inputs.lookVertical,
        roll: inputs.roll,
      };

      // Si une entrée est détectée, arrêter l'orbite automatique
      if (
        inputs.moveForward !== 0 ||
        inputs.moveRight !== 0 ||
        inputs.moveUp !== 0 ||
        inputs.lookHorizontal !== 0 ||
        inputs.lookVertical !== 0 ||
        inputs.roll !== 0
      ) {
        if (orbitModeActive) {
          setOrbitModeActive(false);
          detectUserActivity();
        }
      }

      flightController.current.setInput(flightInput);
      flightController.current.update(delta);

      // Exposer l'état d'animation pour l'interface utilisateur
      window.__cameraAnimating = false;

      // If auto rotation is enabled, apply a slow rotation
      if (autoRotateEnabled && !isTransitioning && !flightInput.yaw) {
        // Add slight horizontal rotation
        flightController.current.setInput({
          ...flightInput,
          yaw: AUTO_ROTATE_SPEED,
        });
      }
    }
  });

  // Function to animate to a predefined camera position
  const animateToCameraPosition = (index, activateOrbitAfter = false) => {
    const targetPos = CAMERA_POSITIONS[index];
    if (!targetPos) return;

    // Ensure camera is available
    if (!camera) {
      return;
    }

    // Si on était en mode orbite, désactiver temporairement pendant la transition
    const wasOrbiting = orbitModeActive;
    if (wasOrbiting) {
      setOrbitModeActive(false);
    }

    // Log la position actuelle et la position cible
    console.log(
      `🔄 TRANSITION: From [${camera.position.x.toFixed(
        2
      )}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(
        2
      )}] to home position`
    );

    // Marker l'état de transition
    setIsTransitioning(true);
    window.__cameraAnimating = true;

    // Initialize transition
    const trans = transitioning.current;
    trans.active = true;
    trans.startTime = Date.now();
    trans.startPosition.copy(camera.position);

    // Méthode améliorée pour calculer la cible actuelle de la caméra
    // Projeter un point à 100 unités devant la caméra
    const direction = new Vector3(0, 0, -100).applyQuaternion(
      camera.quaternion
    );
    trans.startTarget.copy(camera.position).add(direction);

    // Copier les positions cibles finales
    trans.endPosition.copy(targetPos.position);
    trans.endTarget.copy(targetPos.target);

    // Mettre à jour l'état de l'interface utilisateur
    setPositionIndex(index);
    setIsTransitioning(true);
    window.__cameraAnimating = true;

    // Afficher un message dans le HUD
    if (window.__showHUDMessage) {
      window.__showHUDMessage(`Returning home`, 2000);
    }

    // Si on doit activer l'orbite après la transition, programmer un délai
    if (activateOrbitAfter) {
      // Programmer l'activation de l'orbite une fois la transition terminée
      const orbiteActivationDelay = trans.duration * 1000 + 100;

      console.log(
        `📅 PLANIFICATION: Mode orbite programmé après transition vers position ${index}`
      );

      setTimeout(() => {
        if (!transitioning.current.active) {
          console.log(
            `🌐 TRANSITION: Activation du mode orbite après transition`
          );
          setOrbitModeActive(true);
          // Force update global state immediately
          window.__orbitModeActive = true;
        } else {
          // Si toujours en transition, réessayer dans un moment
          setTimeout(() => {
            console.log(
              `🌐 TRANSITION: Seconde tentative d'activation du mode orbite`
            );
            setOrbitModeActive(true);
            // Force update global state immediately
            window.__orbitModeActive = true;
          }, 500);
        }
      }, orbiteActivationDelay);
    }

    // Ne pas réinitialiser les timers d'inactivité pendant une transition automatique vers l'orbite
    if (!activateOrbitAfter) {
      // Reset auto rotation timer
      detectUserActivity();
    }
  };

  // Initialize flight controller once camera is available
  useEffect(() => {
    if (camera && !flightController.current) {
      flightController.current = new FlightController(camera, config);

      // Exposer la fonction animateToCameraPosition au niveau global
      window.__animateToCameraPosition = animateToCameraPosition;

      // Exposer également le gestionnaire d'entrées au niveau global pour le FlightController
      window.getInputManager = getInputManager;

      // Écouter les changements de périphérique actif
      const inputManager = getInputManager();
      const unsubscribeDeviceChange = inputManager.addDeviceChangeListener(
        (newDevice) => {
          if (flightController.current) {
            flightController.current.setActiveDevice(newDevice);
          }
        }
      );

      // Définir le périphérique initial
      const initialDevice = inputManager.getActiveDevice();
      flightController.current.setActiveDevice(initialDevice);

      // Nettoyer l'écouteur lors du démontage
      return () => {
        unsubscribeDeviceChange();
      };
    }
  }, [camera, config]);

  // Update flight controller configuration when it changes
  useEffect(() => {
    if (flightController.current) {
      flightController.current.config = config;
    }
  }, [config]);

  // Nettoyer la référence globale lors du démontage
  useEffect(() => {
    return () => {
      // Supprimer la référence globale quand le composant est démonté
      if (window.__animateToCameraPosition === animateToCameraPosition) {
        window.__animateToCameraPosition = null;
      }

      // Nettoyer les timers d'autorotation et d'orbite
      if (autoRotateTimerId.current) {
        clearTimeout(autoRotateTimerId.current);
      }

      if (orbitTimerId.current) {
        clearTimeout(orbitTimerId.current);
      }

      // Arrêter le son d'accélération
      if (accelerationPlaying.current) {
        if (activeAccelerationSound.current === accelerationSound1) {
          stopAcceleration1();
        } else if (activeAccelerationSound.current === accelerationSound2) {
          stopAcceleration2();
        }
        accelerationPlaying.current = false;
      }
    };
  }, [stopAcceleration1, stopAcceleration2]);

  // Stocker la référence à la caméra dans le store du jeu pour le service de collision
  useEffect(() => {
    if (camera) {
      setCamera(camera);

      // Nettoyer la référence lors du démontage
      return () => setCamera(null);
    }
  }, [camera, setCamera]);

  // Aucun élément visuel n'est rendu maintenant puisqu'on n'a plus besoin d'OrbitControls
  return null;
}

// Export le composant principal et re-export de GamepadIndicator et CrosshairIndicator
export { GamepadIndicator, CrosshairIndicator, sendStartCountingSignal };
export default AdvancedCameraController;
