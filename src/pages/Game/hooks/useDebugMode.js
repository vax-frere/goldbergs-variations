import { useEffect } from "react";
import useGameStore from "../store";

// Constante pour la clé de stockage
const DEBUG_MODE_STORAGE_KEY = "goldbergs_debug_mode";

/**
 * Récupère l'état du mode debug depuis le localStorage
 * @returns {boolean} État du mode debug stocké ou false par défaut
 */
export function getStoredDebugMode() {
  try {
    const storedValue = localStorage.getItem(DEBUG_MODE_STORAGE_KEY);
    return storedValue === "true"; // Conversion explicite en booléen
  } catch (error) {
    console.warn("Erreur lors de la lecture du localStorage:", error);
    return false;
  }
}

/**
 * Enregistre l'état du mode debug dans le localStorage
 * @param {boolean} isDebugEnabled - État du mode debug à stocker
 */
export function storeDebugMode(isDebugEnabled) {
  try {
    localStorage.setItem(DEBUG_MODE_STORAGE_KEY, String(isDebugEnabled));
  } catch (error) {
    console.warn("Erreur lors de l'écriture dans le localStorage:", error);
  }
}

/**
 * Hook to manage debug mode functionality
 * Toggles debug mode with 'P' key
 * The debug state is managed in the game store
 */
function useDebugMode() {
  const toggleDebug = useGameStore((state) => state.toggleDebug);

  useEffect(() => {
    // Utiliser une closure pour limiter les appels à toggleDebug (debounce)
    let lastToggleTime = 0;
    const toggleCooldown = 300; // ms

    const handleKeyDown = (event) => {
      if (event.key === "p" || event.key === "P") {
        const now = performance.now();
        if (now - lastToggleTime > toggleCooldown) {
          console.log("Key P pressed, toggling debug mode");
          lastToggleTime = now;
          toggleDebug();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleDebug]);
}

export default useDebugMode;
