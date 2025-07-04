/**
 * RetroWindowService - Service SOLID pour gérer les fenêtres rétro
 * Gère l'ouverture, fermeture et état des fenêtres rétro dans le jeu
 */

import { create } from "zustand";

/**
 * États possibles d'une fenêtre rétro
 */
export const RETRO_WINDOW_STATES = {
  CLOSED: "closed",
  OPENING: "opening", 
  OPEN: "open",
  CLOSING: "closing",
};

/**
 * Store Zustand pour l'état des fenêtres rétro
 */
const createRetroWindowStore = create((set, get) => ({
  windows: new Map(), // Map<windowId, windowData>
  maxZIndex: 1000,
  
  // Actions
  openWindow: (windowId, windowData) => {
    const { windows, maxZIndex } = get();
    const newZIndex = maxZIndex + 1;
    
    const newWindow = {
      id: windowId,
      state: RETRO_WINDOW_STATES.OPENING,
      zIndex: newZIndex,
      isOpen: true,
      position: windowData.position || { x: 100, y: 100 },
      ...windowData,
    };
    
    const newWindows = new Map(windows);
    newWindows.set(windowId, newWindow);
    
    set({ 
      windows: newWindows, 
      maxZIndex: newZIndex 
    });
    
    // Transition vers OPEN après un court délai
    setTimeout(() => {
      const currentState = get();
      const currentWindow = currentState.windows.get(windowId);
      if (currentWindow && currentWindow.state === RETRO_WINDOW_STATES.OPENING) {
        const updatedWindows = new Map(currentState.windows);
        updatedWindows.set(windowId, { ...currentWindow, state: RETRO_WINDOW_STATES.OPEN });
        set({ windows: updatedWindows });
      }
    }, 100);
  },
  
  closeWindow: (windowId) => {
    const { windows } = get();
    const window = windows.get(windowId);
    if (!window) return;
    
    const newWindows = new Map(windows);
    newWindows.set(windowId, { ...window, state: RETRO_WINDOW_STATES.CLOSING, isOpen: false });
    set({ windows: newWindows });
    
    // Supprimer complètement après l'animation (durée réduite pour être 2x plus rapide que l'entrée)
    setTimeout(() => {
      const currentState = get();
      const updatedWindows = new Map(currentState.windows);
      updatedWindows.delete(windowId);
      set({ windows: updatedWindows });
    }, 150); // Réduit de 300ms à 150ms pour être 2x plus rapide
  },
  
  focusWindow: (windowId) => {
    const { windows, maxZIndex } = get();
    const window = windows.get(windowId);
    if (!window) return;
    
    const newZIndex = maxZIndex + 1;
    const newWindows = new Map(windows);
    newWindows.set(windowId, { ...window, zIndex: newZIndex });
    
    set({ 
      windows: newWindows, 
      maxZIndex: newZIndex 
    });
  },
  
  closeAllWindows: () => {
    set({ windows: new Map() });
  },
}));

/**
 * Classe principale du service de fenêtres rétro
 */
class RetroWindowService {
  constructor(debug = false) {
    this.debug = debug;
    this.isInitialized = false;
    this.store = createRetroWindowStore;
    
    // Listeners pour les événements
    this.listeners = new Set();
    
    if (this.debug) console.log("🪟 [RetroWindowService] Service créé");
  }

  /**
   * Initialise le service
   */
  initialize() {
    if (this.isInitialized) return true;

    try {
      this.isInitialized = true;
      if (this.debug) console.log("🪟 [RetroWindowService] Service initialisé");
      return true;
    } catch (error) {
      console.error("🪟 [RetroWindowService] Erreur initialisation:", error);
      return false;
    }
  }

  /**
   * Ouvre une fenêtre rétro avec du contenu
   */
  openWindow(windowConfig) {
    if (!this.isInitialized) {
      console.error("🪟 [RetroWindowService] Service non initialisé");
      return false;
    }

    try {
      const windowId = windowConfig.id || `window_${Date.now()}`;
      
      // Configuration par défaut avec position centrée
      const defaultConfig = {
        title: "Untitled Window",
        width: 400,
        height: 300,
        position: { 
          x: (window.innerWidth - 400) / 2, 
          y: (window.innerHeight - 300) / 2 
        },
        content: "No content provided",
        texts: [],
        image: null,
      };

      const finalConfig = { ...defaultConfig, ...windowConfig, id: windowId };

      // Si on a un tableau de textes, choisir un texte aléatoire
      if (finalConfig.texts && finalConfig.texts.length > 0) {
        const randomText = finalConfig.texts[Math.floor(Math.random() * finalConfig.texts.length)];
        finalConfig.content = randomText;
      }

      if (this.debug) console.log("🪟 [RetroWindowService] Ouverture fenêtre:", finalConfig);

      // Utiliser le store pour ouvrir la fenêtre
      this.store.getState().openWindow(windowId, finalConfig);

      // Émettre l'événement
      this._emitEvent("windowOpened", { windowId, config: finalConfig });

      return windowId;
    } catch (error) {
      console.error("🪟 [RetroWindowService] Erreur ouverture fenêtre:", error);
      return false;
    }
  }

  /**
   * Ferme une fenêtre spécifique
   */
  closeWindow(windowId) {
    if (!this.isInitialized) return false;

    try {
      this.store.getState().closeWindow(windowId);
      this._emitEvent("windowClosed", { windowId });
      
      if (this.debug) console.log("🪟 [RetroWindowService] Fenêtre fermée:", windowId);
      return true;
    } catch (error) {
      console.error("🪟 [RetroWindowService] Erreur fermeture fenêtre:", error);
      return false;
    }
  }

  /**
   * Ferme toutes les fenêtres
   */
  closeAllWindows() {
    if (!this.isInitialized) return false;

    try {
      this.store.getState().closeAllWindows();
      this._emitEvent("allWindowsClosed");
      
      if (this.debug) console.log("🪟 [RetroWindowService] Toutes les fenêtres fermées");
      return true;
    } catch (error) {
      console.error("🪟 [RetroWindowService] Erreur fermeture toutes fenêtres:", error);
      return false;
    }
  }

  /**
   * Obtient l'état actuel des fenêtres
   */
  getWindowsState() {
    return this.store.getState();
  }

  /**
   * Ajoute un listener d'événement
   */
  addEventListener(eventType, callback) {
    const listener = { eventType, callback };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Supprime un listener d'événement
   */
  removeEventListener(eventType, callback) {
    for (const listener of this.listeners) {
      if (listener.eventType === eventType && listener.callback === callback) {
        this.listeners.delete(listener);
        break;
      }
    }
  }

  /**
   * Émet un événement vers tous les listeners
   */
  _emitEvent(eventType, data = null) {
    for (const listener of this.listeners) {
      if (listener.eventType === eventType) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error("🪟 [RetroWindowService] Erreur dans listener:", error);
        }
      }
    }
  }

  /**
   * Nettoie le service
   */
  cleanup() {
    this.closeAllWindows();
    this.listeners.clear();
    this.isInitialized = false;
    
    if (this.debug) console.log("🪟 [RetroWindowService] Service nettoyé");
  }
}

// Instance singleton
let retroWindowServiceInstance = null;

/**
 * Hook pour utiliser le RetroWindowService
 */
export const useRetroWindowService = (debug = false) => {
  if (!retroWindowServiceInstance) {
    retroWindowServiceInstance = new RetroWindowService(debug);
  }
  return retroWindowServiceInstance;
};

/**
 * Hook pour accéder au store des fenêtres rétro
 */
export const useRetroWindowStore = () => {
  return createRetroWindowStore();
};

/**
 * Fonction utilitaire pour exposer le service sur window (debug)
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.retroWindowService = () => useRetroWindowService(true);
}

export default RetroWindowService; 