import { useState, useEffect } from "react";
import { getInputManager } from "./inputManager";
import { INPUT_ACTIONS } from "./navigationConstants";

/**
 * Indicateur de connexion de manette
 */
const GamepadIndicator = ({ isCompact = false }) => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const inputManager = getInputManager();

    const checkGamepadStatus = () => {
      setIsConnected(inputManager.isGamepadConnected());
    };

    // Vérifier immédiatement l'état
    checkGamepadStatus();

    // Vérifier périodiquement l'état de la manette
    const intervalId = setInterval(checkGamepadStatus, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Ne rien afficher si aucun gamepad n'est connecté
  if (!isConnected) {
    return null;
  }

  // Style pour le conteneur, différent selon le mode d'affichage
  const containerStyle = {
    display: "flex",
    alignItems: "center",
  };

  // Style du séparateur
  const separatorStyle = {
    height: "12px",
    width: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: "10px",
    marginLeft: "6px",
  };

  // Style pour l'indicateur
  const indicatorStyle = {
    width: isCompact ? "8px" : "10px",
    height: isCompact ? "8px" : "10px",
    borderRadius: "50%",
    backgroundColor: "#00ff00",
    marginRight: "10px",
  };

  // Style du texte
  const textStyle = {
    color: "white",
    fontSize: isCompact ? "12px" : "14px",
    opacity: isCompact ? 0.5 : 1,
  };

  return (
    <div style={containerStyle}>
      <div style={separatorStyle}></div>
      <div style={indicatorStyle}></div>
      <span style={textStyle}>Gamepad connected</span>
    </div>
  );
};

/**
 * Hook personnalisé pour obtenir le texte d'interaction en fonction du périphérique
 * @returns {Object} Un objet contenant le texte d'interaction et si une manette est connectée
 */
export const useInteractionText = () => {
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);
  const [interactionText, setInteractionText] = useState(
    `Press ${INPUT_ACTIONS.INTERACT.key} to interact`
  );

  useEffect(() => {
    const inputManager = getInputManager();

    const checkGamepadStatus = () => {
      const connected = inputManager.isGamepadConnected();
      setIsGamepadConnected(connected);

      // Mettre à jour le texte en fonction du périphérique
      if (connected) {
        setInteractionText(
          `Press ${INPUT_ACTIONS.INTERACT.gamepad} to interact`
        );
      } else {
        setInteractionText(`Press ${INPUT_ACTIONS.INTERACT.key} to interact`);
      }
    };

    // Vérifier immédiatement l'état
    checkGamepadStatus();

    // Vérifier périodiquement l'état de la manette
    const intervalId = setInterval(checkGamepadStatus, 1000);

    // Exposer l'information de façon globale
    window.__interactionKey = INPUT_ACTIONS.INTERACT.key;
    window.__interactionGamepad = INPUT_ACTIONS.INTERACT.gamepad;

    return () => {
      clearInterval(intervalId);
      delete window.__interactionKey;
      delete window.__interactionGamepad;
    };
  }, []);

  return {
    interactionText,
    isGamepadConnected,
    interactionKey: isGamepadConnected
      ? INPUT_ACTIONS.INTERACT.gamepad
      : INPUT_ACTIONS.INTERACT.key,
  };
};

/**
 * Fonction utilitaire pour obtenir le texte d'action en fonction du périphérique
 * Sans utiliser de hook (pour les composants non-React)
 * @param {string} actionKey - Clé de l'action dans INPUT_ACTIONS
 * @returns {string} Le texte approprié pour l'action
 */
export const getActionText = (actionKey) => {
  const inputManager = getInputManager();
  const isGamepadConnected = inputManager.isGamepadConnected();

  if (!INPUT_ACTIONS[actionKey]) {
    return "Unknown action";
  }

  const action = INPUT_ACTIONS[actionKey];
  return isGamepadConnected ? action.gamepad : action.key;
};

/**
 * Composant affichant une croix au centre de l'écran (viseur)
 */
const CrosshairIndicator = () => {
  // Style pour le conteneur qui centre le viseur
  const containerStyle = {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none", // Ne pas intercepter les clics de souris
    zIndex: 999,
  };

  // Styles pour les quatre segments du viseur (au lieu de deux lignes complètes)
  // Cela évite la superposition au centre
  const segmentStyle = {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Blanc transparent
  };

  // Segment horizontal gauche
  const leftSegmentStyle = {
    ...segmentStyle,
    width: "7px",
    height: "1px",
    top: "50%",
    right: "50%",
    marginRight: "2px", // Espace entre le segment et le centre
    transform: "translateY(-50%)",
  };

  // Segment horizontal droit
  const rightSegmentStyle = {
    ...segmentStyle,
    width: "7px",
    height: "1px",
    top: "50%",
    left: "50%",
    marginLeft: "2px", // Espace entre le segment et le centre
    transform: "translateY(-50%)",
  };

  // Segment vertical haut
  const topSegmentStyle = {
    ...segmentStyle,
    width: "1px",
    height: "7px",
    bottom: "50%",
    left: "50%",
    marginBottom: "2px", // Espace entre le segment et le centre
    transform: "translateX(-50%)",
  };

  // Segment vertical bas
  const bottomSegmentStyle = {
    ...segmentStyle,
    width: "1px",
    height: "7px",
    top: "50%",
    left: "50%",
    marginTop: "2px", // Espace entre le segment et le centre
    transform: "translateX(-50%)",
  };

  // Style pour le point central
  const centerDotStyle = {
    position: "absolute",
    width: "2px",
    height: "2px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  };

  return (
    <div style={containerStyle}>
      <div style={leftSegmentStyle}></div>
      <div style={rightSegmentStyle}></div>
      <div style={topSegmentStyle}></div>
      <div style={bottomSegmentStyle}></div>
      <div style={centerDotStyle}></div>
    </div>
  );
};

// Fonction pour envoyer un signal de démarrage du comptage des posts
export const sendStartCountingSignal = () => {
  console.log(
    `🔔 COMPTAGE: Envoi du signal de comptage (timestamp: ${Date.now()})`
  );

  // Utiliser un événement DOM pour la communication intra-page
  try {
    const startCountingEvent = new CustomEvent("startCounting", {
      detail: { timestamp: Date.now() },
    });
    window.dispatchEvent(startCountingEvent);
    console.log(`✅ COMPTAGE: Événement DOM dispatché avec succès`);
  } catch (error) {
    console.log(
      `❌ COMPTAGE: Erreur lors du dispatch de l'événement DOM:`,
      error
    );
  }

  // Exposer une fonction globale pour les tests manuels
  window.__sendStartCountingSignal = () => {
    console.log(
      `🧪 TEST MANUEL: Envoi du signal de comptage (timestamp: ${Date.now()})`
    );

    // Utiliser un événement DOM pour les tests manuels
    try {
      const testEvent = new CustomEvent("startCounting", {
        detail: { timestamp: Date.now(), source: "manual_test" },
      });
      window.dispatchEvent(testEvent);
      console.log(`✅ TEST MANUEL: Événement DOM dispatché avec succès`);
    } catch (error) {
      console.log(
        `❌ TEST MANUEL: Erreur lors du dispatch de l'événement DOM:`,
        error
      );
    }
  };
};

export { GamepadIndicator, CrosshairIndicator };
