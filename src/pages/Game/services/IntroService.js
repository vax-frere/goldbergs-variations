/**
 * IntroService - Service SOLID pour gérer l'intro automatique du jeu
 * Respecte les principes SOLID et l'architecture jeux vidéo
 */

import { useAudioFragmentService } from "./AudioFragmentService";
import useGameStore from "../store";

/**
 * Configuration de l'intro
 */
const INTRO_CONFIG = {
  FRAGMENT_ID: "intro", // L'ID du fragment intro dans les assets
  DELAY_AFTER_GAME_READY: 1500, // Délai en ms avant de déclencher l'intro après que le jeu soit prêt
  AUTO_TRIGGER_ENABLED: true, // Permet de désactiver l'auto-trigger si nécessaire
};

/**
 * Classe principale du service d'intro
 */
class IntroService {
  constructor(debug = false) {
    this.debug = debug;
    this.audioFragmentService = null;
    this.gameStore = null;
    this.isInitialized = false;
    this.introTimeout = null;

    if (this.debug) console.log("🎬 [IntroService] Service créé");
  }

  /**
   * Initialise le service
   */
  initialize() {
    if (this.isInitialized) return true;

    try {
      // Obtenir l'instance du service de fragments audio
      this.audioFragmentService = useAudioFragmentService();
      
      // Obtenir l'accès au store
      this.gameStore = useGameStore.getState();

      if (!this.audioFragmentService || !this.gameStore) {
        console.error("🎬 [IntroService] Services requis non disponibles");
        return false;
      }

      this.isInitialized = true;
      if (this.debug) console.log("🎬 [IntroService] Service initialisé");
      return true;
    } catch (error) {
      console.error("🎬 [IntroService] Erreur initialisation:", error);
      return false;
    }
  }

  /**
   * Déclenche l'intro automatiquement quand le jeu est prêt
   * @param {boolean} gameReady - Indique si le jeu est prêt
   */
  async triggerIntroWhenReady(gameReady) {
    if (!this.isInitialized) {
      console.warn("🎬 [IntroService] Service non initialisé");
      return false;
    }

    if (!INTRO_CONFIG.AUTO_TRIGGER_ENABLED) {
      if (this.debug) console.log("🎬 [IntroService] Auto-trigger désactivé");
      return false;
    }

    if (!gameReady) {
      if (this.debug) console.log("🎬 [IntroService] Jeu pas encore prêt");
      return false;
    }

    // Vérifier si l'intro doit être déclenchée
    const currentState = useGameStore.getState();
    if (!currentState.shouldTriggerIntro()) {
      if (this.debug) console.log("🎬 [IntroService] Intro déjà déclenchée ou conditions non remplies");
      return false;
    }

    if (this.debug) console.log("🎬 [IntroService] Conditions remplies pour déclencher l'intro");

    // Marquer l'intro comme déclenchée dans le store
    const triggered = currentState.triggerIntro();
    if (!triggered) {
      if (this.debug) console.log("🎬 [IntroService] Échec du déclenchement dans le store");
      return false;
    }

    // Attendre un délai avant de lancer l'intro pour laisser le jeu se stabiliser
    this.introTimeout = setTimeout(async () => {
      try {
        if (this.debug) console.log(`🎬 [IntroService] Lancement de l'intro fragment: ${INTRO_CONFIG.FRAGMENT_ID}`);
        
        // S'assurer que le service de fragments audio est initialisé
        if (!this.audioFragmentService.isInitialized) {
          this.audioFragmentService.initialize();
        }

        // Lancer le fragment intro
        const success = await this.audioFragmentService.playFragment(INTRO_CONFIG.FRAGMENT_ID);
        
        if (success) {
          if (this.debug) console.log("🎬 [IntroService] Intro lancée avec succès");
          
          // Écouter la fin de l'intro pour marquer comme terminée
          this._listenForIntroCompletion();
        } else {
          console.error("🎬 [IntroService] Échec du lancement de l'intro");
          // En cas d'échec, marquer quand même le jeu comme démarré
          useGameStore.getState().markIntroCompleted();
        }

      } catch (error) {
        console.error("🎬 [IntroService] Erreur lors du lancement de l'intro:", error);
        // En cas d'erreur, marquer quand même le jeu comme démarré
        useGameStore.getState().markIntroCompleted();
      }
    }, INTRO_CONFIG.DELAY_AFTER_GAME_READY);

    return true;
  }

  /**
   * Écoute la fin de l'intro pour mettre à jour le store
   */
  _listenForIntroCompletion() {
    if (!this.audioFragmentService) return;

    // Écouter l'événement de fin de séquence
    const handleIntroCompleted = () => {
      if (this.debug) console.log("🎬 [IntroService] Intro terminée, marquage dans le store");
      useGameStore.getState().markIntroCompleted();
      
      // Nettoyer le listener
      this.audioFragmentService.removeEventListener("sequenceCompleted", handleIntroCompleted);
    };

    this.audioFragmentService.addEventListener("sequenceCompleted", handleIntroCompleted);
  }

  /**
   * Force l'arrêt de l'intro (si nécessaire pour le développement)
   */
  async stopIntro() {
    if (this.introTimeout) {
      clearTimeout(this.introTimeout);
      this.introTimeout = null;
    }

    if (this.audioFragmentService) {
      await this.audioFragmentService.stopFragment();
    }

    // Marquer comme terminée
    useGameStore.getState().markIntroCompleted();
    
    return true;
  }

  /**
   * Remet à zéro l'état de l'intro (pour développement/debug)
   */
  resetIntro() {
    if (this.introTimeout) {
      clearTimeout(this.introTimeout);
      this.introTimeout = null;
    }

    useGameStore.getState().resetIntroState();
    
    if (this.debug) console.log("🎬 [IntroService] État de l'intro remis à zéro");
  }

  /**
   * Retourne l'état actuel de l'intro
   */
  getIntroState() {
    if (!this.isInitialized) return null;

    const gameState = useGameStore.getState();
    return {
      triggered: gameState.introTriggered,
      completed: gameState.introCompleted,
      gameStarted: gameState.gameStarted,
      shouldTrigger: gameState.shouldTriggerIntro(),
    };
  }

  /**
   * Nettoyage lors de la destruction du service
   */
  cleanup() {
    if (this.introTimeout) {
      clearTimeout(this.introTimeout);
      this.introTimeout = null;
    }

    this.isInitialized = false;
    this.audioFragmentService = null;
    this.gameStore = null;

    if (this.debug) console.log("🎬 [IntroService] Service nettoyé");
  }
}

// Instance singleton
let introServiceInstance = null;

/**
 * Hook pour utiliser l'IntroService
 */
export const useIntroService = (debug = false) => {
  if (!introServiceInstance) {
    introServiceInstance = new IntroService(debug);
  }
  return introServiceInstance;
};

/**
 * Fonction utilitaire pour exposer le service sur window (debug)
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.introService = () => useIntroService(true);
}

export default IntroService; 