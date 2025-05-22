import useGameStore from "../store";
import { getInputManager } from "../AdvancedCameraController/inputManager";

/**
 * Service qui gère le retour à l'accueil (position initiale et désactivation du cluster actif)
 * Ce service est conçu pour être léger et indépendant de l'AdvancedCameraController
 */

// Fonction pour retourner à l'accueil
export const returnToHome = () => {
  // Récupérer le store global
  const { setActiveCluster } = useGameStore.getState();

  // 1. Désactiver le cluster actif
  setActiveCluster(null, null, null);

  // 2. Retourner à la position initiale via la fonction globale exposée par AdvancedCameraController
  if (typeof window.__animateToCameraPosition === "function") {
    // Position 0 = vue globale, true = activer orbite ensuite
    window.__animateToCameraPosition(0, true);

    // Afficher un message dans le HUD si disponible
    if (window.__showHUDMessage) {
      window.__showHUDMessage("Retour à l'accueil", 2000);
    }

    console.log("Retour à l'accueil exécuté");
    return true;
  }

  console.warn("Fonction d'animation caméra non disponible");
  return false;
};

// Initialise les écouteurs d'événements pour le retour à l'accueil
export const initHomeReturnListeners = () => {
  // Référence pour éviter les appels répétés rapides
  let lastCallTime = 0;
  const THROTTLE_TIME = 500; // Ms entre deux appels

  // Fonction qui vérifie si on peut exécuter l'action en respectant le throttle
  const canExecuteAction = () => {
    const now = Date.now();
    if (now - lastCallTime > THROTTLE_TIME) {
      lastCallTime = now;
      return true;
    }
    return false;
  };

  // Fonction appelée quand l'action de retour est détectée
  const handleHomeAction = () => {
    if (canExecuteAction()) {
      // S'il y a un cluster actif, exécuter le retour
      const { activeClusterId } = useGameStore.getState();
      if (activeClusterId !== null) {
        returnToHome();
      }
    }
  };

  // Surveiller l'événement clavier pour la touche Espace
  const handleKeyDown = (event) => {
    if (event.code === "Space") {
      // S'il y a un cluster actif, éviter que le navigateur traite l'événement
      const { activeClusterId } = useGameStore.getState();
      if (activeClusterId !== null) {
        event.preventDefault();
        handleHomeAction();
      }
    }
  };

  // Abonnement au InputManager pour surveiller le bouton A de la manette
  const subscribeToGamepad = () => {
    // Récupérer le InputManager, s'il existe
    const inputManager = getInputManager();
    if (!inputManager) return null;

    // S'abonner aux changements d'entrées en utilisant addListener au lieu de subscribe
    return inputManager.addListener((inputs) => {
      // Détecter une pression sur le bouton A (nextPosition dans l'InputManager)
      if (inputs.nextPosition) {
        handleHomeAction();
      }
    });
  };

  // Ajouter les écouteurs d'événements
  window.addEventListener("keydown", handleKeyDown);
  const unsubscribeGamepad = subscribeToGamepad();

  // Retourner une fonction de nettoyage
  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    if (unsubscribeGamepad) {
      unsubscribeGamepad();
    }
  };
};

export default { returnToHome, initHomeReturnListeners };
