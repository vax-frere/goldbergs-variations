import { useState, useEffect } from "react";

// Classe pour la gestion unifiée des entrées (clavier et manette)
export class InputManager {
  constructor() {
    // État des entrées
    this.inputs = {
      // Déplacement
      moveForward: 0, // -1 à 1
      moveRight: 0, // -1 à 1
      moveUp: 0, // -1 à 1

      // Rotation
      lookHorizontal: 0, // -1 à 1
      lookVertical: 0, // -1 à 1
      roll: 0, // -1 à 1

      // Actions
      toggleMode: false,
      nextPosition: false,
      action1: false,
      action2: false,
    };

    // Entrées séparées pour clavier et manette pour les combiner correctement
    this.keyboardInputs = { ...this.inputs };
    this.gamepadInputs = { ...this.inputs };

    // Configuration
    this.config = {
      deadzone: 0.1,
      keyboardSensitivity: 1.5,
      keyboardMovementMultiplier: 1.0,
      keyboardLookMultiplier: 1.8,
    };

    // États internes
    this.keysPressed = {};
    this.previousButtonStates = {};
    this.listeners = [];
    this.gamepadConnected = false;

    // Démarre les écouteurs d'événements
    this.bindEvents();
  }

  // Ajouter un écouteur pour recevoir les mises à jour d'entrée
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  // Notifier tous les écouteurs d'une mise à jour des entrées
  notifyListeners() {
    for (const listener of this.listeners) {
      listener({ ...this.inputs });
    }
  }

  // Combiner les entrées du clavier et de la manette
  combineInputs() {
    // Entrées analogiques (addition avec limite)
    this.inputs.moveForward = Math.max(
      -1,
      Math.min(
        1,
        this.keyboardInputs.moveForward + this.gamepadInputs.moveForward
      )
    );
    this.inputs.moveRight = Math.max(
      -1,
      Math.min(1, this.keyboardInputs.moveRight + this.gamepadInputs.moveRight)
    );
    this.inputs.moveUp = Math.max(
      -1,
      Math.min(1, this.keyboardInputs.moveUp + this.gamepadInputs.moveUp)
    );
    this.inputs.lookHorizontal = Math.max(
      -1,
      Math.min(
        1,
        this.keyboardInputs.lookHorizontal + this.gamepadInputs.lookHorizontal
      )
    );
    this.inputs.lookVertical = Math.max(
      -1,
      Math.min(
        1,
        this.keyboardInputs.lookVertical + this.gamepadInputs.lookVertical
      )
    );
    this.inputs.roll = Math.max(
      -1,
      Math.min(1, this.keyboardInputs.roll + this.gamepadInputs.roll)
    );

    // Entrées booléennes (combinaison OU)
    this.inputs.toggleMode =
      this.keyboardInputs.toggleMode || this.gamepadInputs.toggleMode;
    this.inputs.nextPosition =
      this.keyboardInputs.nextPosition || this.gamepadInputs.nextPosition;
    this.inputs.action1 =
      this.keyboardInputs.action1 || this.gamepadInputs.action1;
    this.inputs.action2 =
      this.keyboardInputs.action2 || this.gamepadInputs.action2;
  }

  // Configurer les écouteurs d'événements
  bindEvents() {
    // Gestion du clavier
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    // Gestion des événements de manette
    window.addEventListener("gamepadconnected", this.handleGamepadConnected);
    window.addEventListener(
      "gamepaddisconnected",
      this.handleGamepadDisconnected
    );

    // Démarrer la boucle de polling pour la manette
    this.startGamepadPolling();
  }

  // Nettoyer les écouteurs d'événements
  unbindEvents() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("gamepadconnected", this.handleGamepadConnected);
    window.removeEventListener(
      "gamepaddisconnected",
      this.handleGamepadDisconnected
    );

    if (this.gamepadIntervalId) {
      clearInterval(this.gamepadIntervalId);
    }
  }

  // Gestion des événements clavier
  handleKeyDown = (event) => {
    this.keysPressed[event.code] = true;

    // Gestion d'actions spéciales
    if (event.code === "Tab") {
      event.preventDefault();
      this.keyboardInputs.toggleMode = true;
    }

    if (event.code === "Space") {
      event.preventDefault();
      // Seulement activer si ce n'était pas déjà activé
      if (!this.keyboardInputs.nextPosition) {
        this.keyboardInputs.nextPosition = true;
      }
    }

    // Traiter les entrées après avoir géré les actions spéciales
    this.processKeyboardInput();

    // Combiner les entrées et notifier
    this.combineInputs();
    this.notifyListeners();
  };

  handleKeyUp = (event) => {
    this.keysPressed[event.code] = false;

    // Réinitialiser les actions après notification
    if (event.code === "Tab") {
      this.keyboardInputs.toggleMode = false;
    }

    if (event.code === "Space") {
      // Délai court pour s'assurer que l'action est bien traitée avant réinitialisation
      setTimeout(() => {
        this.keyboardInputs.nextPosition = false;
        this.combineInputs();
        this.notifyListeners();
      }, 50);
    }

    // Traiter les entrées
    this.processKeyboardInput();
  };

  // Traitement des entrées clavier
  processKeyboardInput() {
    // Application des multiplicateurs pour le clavier
    const moveMultiplier = this.config.keyboardMovementMultiplier;
    const lookMultiplier = this.config.keyboardLookMultiplier;

    // Mouvement avant/arrière (ZQSD - maintenant W/S)
    const rawMoveForward =
      (this.keysPressed["KeyW"] ? 1 : 0) - (this.keysPressed["KeyS"] ? 1 : 0);

    // Mouvement latéral (ZQSD - maintenant A/D)
    const rawMoveRight =
      (this.keysPressed["KeyD"] ? 1 : 0) - (this.keysPressed["KeyA"] ? 1 : 0);

    // Mouvement vertical (E/C) - inchangé
    const rawMoveUp =
      (this.keysPressed["KeyE"] ? 1 : 0) - (this.keysPressed["KeyC"] ? 1 : 0);

    // Second stick virtuel (flèches) pour les rotations
    const rawLookVertical =
      (this.keysPressed["ArrowUp"] ? 1 : 0) -
      (this.keysPressed["ArrowDown"] ? 1 : 0);

    const rawLookHorizontal =
      (this.keysPressed["ArrowRight"] ? 1 : 0) -
      (this.keysPressed["ArrowLeft"] ? 1 : 0);

    // Appliquer les multiplicateurs appropriés
    this.keyboardInputs.moveForward = rawMoveForward * moveMultiplier;
    this.keyboardInputs.moveRight = rawMoveRight * moveMultiplier;
    this.keyboardInputs.moveUp = rawMoveUp * moveMultiplier;

    // Rotation avec les flèches (second stick) - sensibilité réduite
    this.keyboardInputs.lookHorizontal = rawLookHorizontal * lookMultiplier;
    this.keyboardInputs.lookVertical = rawLookVertical * lookMultiplier;

    // Roll avec Q/E - inchangé
    this.keyboardInputs.roll =
      (this.keysPressed["KeyQ"] ? 1 : 0) - (this.keysPressed["KeyE"] ? 1 : 0);

    // Combiner et notifier
    this.combineInputs();
    this.notifyListeners();
  }

  // Gestion de la manette
  handleGamepadConnected = (event) => {
    console.log("Manette connectée:", event.gamepad.id);
    this.gamepadConnected = true;
  };

  handleGamepadDisconnected = (event) => {
    console.log("Manette déconnectée");
    this.gamepadConnected = false;

    // Réinitialiser les entrées de la manette
    this.resetGamepadInputs();
    this.combineInputs();
    this.notifyListeners();
  };

  startGamepadPolling() {
    // Intervalle de polling pour la manette (60fps)
    this.gamepadIntervalId = setInterval(() => this.pollGamepad(), 16);
  }

  pollGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[0]; // On utilise la première manette

    if (!gamepad) {
      if (this.gamepadConnected) {
        this.gamepadConnected = false;
        this.resetGamepadInputs();
        this.combineInputs();
        this.notifyListeners();
      }
      return;
    }

    // Mettre à jour l'état de connexion si nécessaire
    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
    }

    // Appliquer une zone morte aux sticks
    const applyDeadzone = (value) =>
      Math.abs(value) > this.config.deadzone ? value : 0;

    // Nouvelle fonction pour appliquer une courbe de réponse exponentielle aux mouvements de caméra
    // Cette fonction amplifie les petits mouvements du joystick pour une meilleure réactivité
    const applyLookCurve = (value) => {
      // Première étape: appliquer la zone morte
      const deadzonedValue = applyDeadzone(value);
      if (deadzonedValue === 0) return 0;

      // Appliquer une courbe exponentielle pour amplifier les petits mouvements
      // Math.sign préserve le signe (direction), Math.pow crée la courbe
      const curveIntensity = 0.5; // Plus cette valeur est basse, plus l'effet est fort
      return (
        Math.sign(deadzonedValue) *
        Math.pow(Math.abs(deadzonedValue), curveIntensity)
      );
    };

    // Mouvements (stick gauche)
    this.gamepadInputs.moveForward = -applyDeadzone(gamepad.axes[1]);
    this.gamepadInputs.moveRight = applyDeadzone(gamepad.axes[0]);

    // Mouvements sur l'axe vertical (gâchettes)
    this.gamepadInputs.moveUp =
      (gamepad.buttons[5]?.value || 0) - (gamepad.buttons[4]?.value || 0);

    // Rotation caméra (stick droit) - Utiliser la courbe pour plus de sensibilité
    this.gamepadInputs.lookHorizontal = applyLookCurve(gamepad.axes[2]);
    this.gamepadInputs.lookVertical = -applyLookCurve(gamepad.axes[3]);

    // Roll (L1/R1 ou équivalent)
    this.gamepadInputs.roll =
      (gamepad.buttons[7]?.pressed ? 1 : 0) -
      (gamepad.buttons[6]?.pressed ? 1 : 0);

    // Actions (avec gestion d'état pour éviter répétition)
    // Changement de mode (bouton X ou carré)
    if (gamepad.buttons[2]?.pressed && !this.previousButtonStates.mode) {
      this.gamepadInputs.toggleMode = true;
    } else {
      this.gamepadInputs.toggleMode = false;
    }
    this.previousButtonStates.mode = gamepad.buttons[2]?.pressed;

    // Position suivante (bouton A ou croix)
    if (
      gamepad.buttons[0]?.pressed &&
      !this.previousButtonStates.nextPosition
    ) {
      this.gamepadInputs.nextPosition = true;
    } else {
      this.gamepadInputs.nextPosition = false;
    }
    this.previousButtonStates.nextPosition = gamepad.buttons[0]?.pressed;

    // Autres actions
    this.gamepadInputs.action1 = gamepad.buttons[1]?.pressed || false; // B ou cercle
    this.gamepadInputs.action2 = gamepad.buttons[3]?.pressed || false; // Y ou triangle

    // // Log the state of the joysticks
    // console.log("État des joysticks:", {
    //   moveForward: this.gamepadInputs.moveForward,
    //   moveRight: this.gamepadInputs.moveRight,
    //   moveUp: this.gamepadInputs.moveUp,
    //   lookHorizontal: this.gamepadInputs.lookHorizontal,
    //   lookVertical: this.gamepadInputs.lookVertical,
    //   roll: this.gamepadInputs.roll,
    // });

    // Combiner et notifier
    this.combineInputs();
    this.notifyListeners();
  }

  resetGamepadInputs() {
    // Réinitialiser les entrées de la manette à zéro
    Object.keys(this.gamepadInputs).forEach((key) => {
      if (typeof this.gamepadInputs[key] === "number") {
        this.gamepadInputs[key] = 0;
      } else if (typeof this.gamepadInputs[key] === "boolean") {
        this.gamepadInputs[key] = false;
      }
    });
  }

  resetKeyboardInputs() {
    // Réinitialiser les entrées du clavier à zéro
    Object.keys(this.keyboardInputs).forEach((key) => {
      if (typeof this.keyboardInputs[key] === "number") {
        this.keyboardInputs[key] = 0;
      } else if (typeof this.keyboardInputs[key] === "boolean") {
        this.keyboardInputs[key] = false;
      }
    });
  }

  resetInputs() {
    // Réinitialiser toutes les entrées
    this.resetGamepadInputs();
    this.resetKeyboardInputs();
    this.combineInputs();
  }

  // Mettre à jour la configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Méthode pour nettoyer et libérer les ressources
  dispose() {
    this.unbindEvents();
    this.listeners = [];
  }

  // Vérifier si une manette est connectée
  isGamepadConnected() {
    return this.gamepadConnected;
  }

  // Méthode pour simuler l'action de changement de position
  triggerNextPositionAction() {
    console.log("InputManager: Simulation de l'action nextPosition");

    // Réinitialiser d'abord toutes les entrées pour éviter des conflits
    this.resetInputs();

    // Définir nextPosition à true (comme si l'utilisateur avait appuyé sur la touche)
    this.keyboardInputs.nextPosition = true;

    // Combiner et notifier
    this.combineInputs();
    this.notifyListeners();

    // Puis remettre à false au prochain cycle (simule le relâchement de la touche)
    setTimeout(() => {
      this.keyboardInputs.nextPosition = false;
      this.combineInputs();
      this.notifyListeners();
      console.log("InputManager: Action nextPosition terminée");
    }, 50);
  }

  /**
   * Fait vibrer la manette lorsqu'elle est connectée
   * @param {number} duration - Durée de la vibration en ms
   * @param {number} weakMagnitude - Intensité de la vibration faible (0-1)
   * @param {number} strongMagnitude - Intensité de la vibration forte (0-1)
   * @returns {Promise|null} - Une promesse qui se résout lorsque la vibration est terminée, ou null si la manette n'est pas disponible
   */
  vibrateGamepad(duration = 200, weakMagnitude = 0.5, strongMagnitude = 0.8) {
    // Vérifier si au moins une manette est connectée
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gamepad = gamepads[0]; // On utilise la première manette

    if (!gamepad || !this.gamepadConnected) {
      console.log("Pas de manette disponible pour la vibration");
      return null;
    }

    // Tenter d'utiliser vibrationActuator (plus largement supporté)
    if (
      gamepad.vibrationActuator &&
      typeof gamepad.vibrationActuator.playEffect === "function"
    ) {
      console.log("Vibration via vibrationActuator");
      return gamepad.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: duration,
        weakMagnitude: weakMagnitude,
        strongMagnitude: strongMagnitude,
      });
    }
    // Alternative : utiliser hapticActuators si disponible
    else if (gamepad.hapticActuators && gamepad.hapticActuators.length > 0) {
      console.log("Vibration via hapticActuators");
      return gamepad.hapticActuators[0].pulse(strongMagnitude, duration);
    } else {
      console.log("Cette manette ne prend pas en charge la vibration");
      return null;
    }
  }
}

// Instance singleton pour partager le même gestionnaire d'entrées
let inputManagerInstance = null;

export const getInputManager = () => {
  if (!inputManagerInstance) {
    inputManagerInstance = new InputManager();
  }
  return inputManagerInstance;
};

// Hook React pour utiliser le gestionnaire d'entrées dans les composants
export const useInputs = () => {
  const [inputs, setInputs] = useState(getInputManager().inputs);

  useEffect(() => {
    // S'abonner aux mises à jour d'entrées
    const unsubscribe = getInputManager().addListener((newInputs) => {
      setInputs({ ...newInputs });
    });

    // Nettoyer l'abonnement
    return unsubscribe;
  }, []);

  return inputs;
};
