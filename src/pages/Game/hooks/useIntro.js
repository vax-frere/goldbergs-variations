/**
 * Hook React pour gérer l'intro automatique du jeu
 * Utilise le service IntroService de manière réactive
 */

import { useState, useEffect, useCallback } from "react";
import { useIntroService } from "../services/IntroService";
import useGameStore from "../store";

/**
 * Hook principal pour l'intro
 * @param {boolean} debug - Active les logs de debug
 * @returns {object} - État et actions pour l'intro
 */
export const useIntro = (debug = false) => {
  const introService = useIntroService(debug);
  const [isInitialized, setIsInitialized] = useState(false);

  // États du store liés à l'intro
  const introTriggered = useGameStore((state) => state.introTriggered);
  const introCompleted = useGameStore((state) => state.introCompleted);
  const gameStarted = useGameStore((state) => state.gameStarted);
  const audioEnabled = useGameStore((state) => state.audioEnabled);

  // Initialiser le service au montage
  useEffect(() => {
    const initialize = () => {
      try {
        const initialized = introService.initialize();
        setIsInitialized(initialized);
        
        if (debug && initialized) {
          console.log("🎬 [useIntro] Service d'intro initialisé");
        }
      } catch (error) {
        console.error("🎬 [useIntro] Erreur d'initialisation:", error);
        setIsInitialized(false);
      }
    };

    initialize();

    // Nettoyage au démontage
    return () => {
      if (introService) {
        introService.cleanup();
      }
    };
  }, [introService, debug]);

  /**
   * Déclenche l'intro quand le jeu est prêt
   */
  const triggerIntroWhenReady = useCallback(
    async (gameReady) => {
      if (!isInitialized) {
        if (debug) console.log("🎬 [useIntro] Service pas encore initialisé");
        return false;
      }

      try {
        const result = await introService.triggerIntroWhenReady(gameReady);
        if (debug && result) {
          console.log("🎬 [useIntro] Intro déclenchée avec succès");
        }
        return result;
      } catch (error) {
        console.error("🎬 [useIntro] Erreur lors du déclenchement:", error);
        return false;
      }
    },
    [introService, isInitialized, debug]
  );

  /**
   * Force l'arrêt de l'intro
   */
  const stopIntro = useCallback(async () => {
    if (!isInitialized) return false;

    try {
      await introService.stopIntro();
      if (debug) console.log("🎬 [useIntro] Intro arrêtée");
      return true;
    } catch (error) {
      console.error("🎬 [useIntro] Erreur lors de l'arrêt:", error);
      return false;
    }
  }, [introService, isInitialized, debug]);

  /**
   * Remet à zéro l'état de l'intro (développement)
   */
  const resetIntro = useCallback(() => {
    if (!isInitialized) return;

    try {
      introService.resetIntro();
      if (debug) console.log("🎬 [useIntro] Intro remise à zéro");
    } catch (error) {
      console.error("🎬 [useIntro] Erreur lors de la remise à zéro:", error);
    }
  }, [introService, isInitialized, debug]);

  /**
   * Obtient l'état détaillé de l'intro
   */
  const getIntroState = useCallback(() => {
    if (!isInitialized) return null;
    
    return introService.getIntroState();
  }, [introService, isInitialized]);

  return {
    // États
    isInitialized,
    introTriggered,
    introCompleted,
    gameStarted,
    audioEnabled,

    // États dérivés
    shouldTriggerIntro: !introTriggered && !introCompleted && audioEnabled,
    isIntroActive: introTriggered && !introCompleted,

    // Actions
    triggerIntroWhenReady,
    stopIntro,
    resetIntro,
    getIntroState,

    // Utilitaire pour debug
    service: debug ? introService : null,
  };
};

export default useIntro; 