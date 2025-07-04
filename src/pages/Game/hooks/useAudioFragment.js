/**
 * Hook pour gérer les fragments audio avec le service SOLID
 * Gère la séquence complète : cassette-in, fragment, cassette-out + sous-titres
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAudioFragmentService,
  FRAGMENT_SEQUENCE_STATES,
} from "../services/AudioFragmentService";

/**
 * Hook léger pour lire l'état des fragments audio (SANS listeners)
 * À utiliser dans les composants qui ont juste besoin de lire l'état
 * VERSION SIMPLIFIÉE
 */
export const useAudioFragmentState = (debug = false) => {
  const audioFragmentService = useAudioFragmentService(debug);
  const [state, setState] = useState(() => audioFragmentService.getState());

  // Synchronisation simple avec le service
  useEffect(() => {
    const updateState = () => {
      setState(audioFragmentService.getState());
    };

    // Mise à jour immédiate
    updateState();

    // Mise à jour périodique simple
    const interval = setInterval(updateState, 100); // 100ms suffisant

    return () => clearInterval(interval);
  }, [audioFragmentService]);

  /**
   * Retourne la progression globale de toute la séquence cassette (0-100%)
   */
  const getGlobalProgress = useCallback(() => {
    return state.globalProgress || 0;
  }, [state.globalProgress]);

  return {
    // États essentiels
    currentFragment: state.currentFragment,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    sequenceState: state.currentSequenceState,
    currentTime: state.currentTime,
    duration: state.fragmentDuration,
    fragmentData: state.fragmentData,

    // Progression globale (la seule qui nous intéresse)
    getGlobalProgress,
    getState: () => audioFragmentService.getState(),

    // États dérivés essentiels
    isCassetteSequenceActive: state.isCassetteSequenceActive,

    // Constantes
    FRAGMENT_SEQUENCE_STATES,
  };
};

/**
 * Hook principal pour les fragments audio (AVEC listeners et actions)
 * À utiliser UNIQUEMENT dans le composant principal qui contrôle la lecture
 */
export const useAudioFragment = (debug = false) => {
  const audioFragmentService = useAudioFragmentService(debug);
  if (debug) console.log("🎵 [useAudioFragment] Service instance:", audioFragmentService);
  if (debug) console.log(
    "🎵 [useAudioFragment] Service listeners count:",
    audioFragmentService.listeners.size
  );

  // États locaux
  const [currentFragment, setCurrentFragment] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sequenceState, setSequenceState] = useState(
    FRAGMENT_SEQUENCE_STATES.IDLE
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fragmentData, setFragmentData] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Initialise le service au montage
   */
  useEffect(() => {
    const initializeService = async () => {
      try {
        const initialized = audioFragmentService.initialize();
        if (!initialized) {
          setError("Failed to initialize audio fragment service");
        }
      } catch (err) {
        if (debug) console.error("❌ [useAudioFragment] Erreur initialisation:", err);
        setError(err.message);
      }
    };

    initializeService();
  }, [audioFragmentService, debug]);

  /**
   * Configure les listeners d'événements
   */
  useEffect(() => {
    if (debug) console.log(
      "🎵 [useAudioFragment] Configuration des listeners d'événements"
    );

    const handleSequenceStateChanged = (state) => {
      if (debug) console.log(
        "🎵 [useAudioFragment] Événement sequenceStateChanged reçu:",
        state
      );

      setSequenceState(state);
      if (debug) console.log("🔧 [useAudioFragment] setSequenceState appelé avec:", state);

      setIsLoading(
        state === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN ||
          state === FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN
      );
      if (debug) console.log("🔧 [useAudioFragment] setIsLoading appelé");

      setIsPlaying(state === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING);
      if (debug) console.log("🔧 [useAudioFragment] setIsPlaying appelé");

      if (debug) console.log("🎵 [useAudioFragment] États mis à jour:", {
        sequenceState: state,
        isLoading:
          state === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN ||
          state === FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN,
        isPlaying: state === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING,
      });
    };

    const handleFragmentStarted = (data) => {
      if (debug) console.log(
        "🎵 [useAudioFragment] Événement fragmentStarted reçu:",
        data
      );

      setCurrentFragment(data.fragmentId);
      if (debug) console.log(
        "🔧 [useAudioFragment] setCurrentFragment appelé avec:",
        data.fragmentId
      );

      setDuration(data.duration || 0);
      if (debug) console.log(
        "🔧 [useAudioFragment] setDuration appelé avec:",
        data.duration || 0
      );

      setFragmentData(data.fragmentData);
      if (debug) console.log(
        "🔧 [useAudioFragment] setFragmentData appelé avec:",
        data.fragmentData
      );

      setError(null);
      if (debug) console.log("🔧 [useAudioFragment] setError appelé avec null");

      if (debug) console.log("🎵 [useAudioFragment] Fragment data mis à jour:", {
        currentFragment: data.fragmentId,
        duration: data.duration || 0,
        fragmentData: data.fragmentData,
      });
    };

    const handleTimeUpdate = (time) => {
      if (debug) console.log("🎵 [useAudioFragment] Événement timeUpdate reçu:", time);
      setCurrentTime(time);

      // WORKAROUND: Récupérer la durée directement depuis le service
      if (audioFragmentService.fragmentDuration > 0) {
        setDuration(audioFragmentService.fragmentDuration);
      }

      // Log moins fréquent pour timeUpdate
      if (debug && Math.floor(time * 10) % 5 === 0) {
        // Log toutes les demi-secondes pour debug
        console.log("🎵 [useAudioFragment] Temps mis à jour:", time, "- Durée service:", audioFragmentService.fragmentDuration);
      }
    };

    const handleDurationLoaded = (duration) => {
      if (debug) console.log(
        "🎵 [useAudioFragment] Événement durationLoaded reçu:",
        duration
      );
      setDuration(duration);
    };

    const handleFragmentStopped = () => {
      if (debug) console.log("🎵 [useAudioFragment] Événement fragmentStopped reçu");
      setCurrentFragment(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      setFragmentData(null);
      setSequenceState(FRAGMENT_SEQUENCE_STATES.IDLE);
    };

    const handleSequenceCompleted = () => {
      if (debug) console.log("🎵 [useAudioFragment] Événement sequenceCompleted reçu");
      setCurrentFragment(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      setFragmentData(null);
      setSequenceState(FRAGMENT_SEQUENCE_STATES.IDLE);
    };

    const handleGlobalProgressUpdate = (progress) => {
      if (debug) console.log("🎵 [useAudioFragment] Événement globalProgressUpdate reçu:", progress);
      // Forcer un re-render du composant pour mettre à jour la progression globale
      // On peut utiliser un état factice ou simplement laisser le composant se re-render
    };

    // Ajouter les listeners
    if (debug) console.log("🎵 [useAudioFragment] Ajout des listeners au service");
    audioFragmentService.addEventListener(
      "sequenceStateChanged",
      handleSequenceStateChanged
    );
    audioFragmentService.addEventListener(
      "fragmentStarted",
      handleFragmentStarted
    );
    audioFragmentService.addEventListener("timeUpdate", handleTimeUpdate);
    audioFragmentService.addEventListener(
      "durationLoaded",
      handleDurationLoaded
    );
    audioFragmentService.addEventListener(
      "fragmentStopped",
      handleFragmentStopped
    );
    audioFragmentService.addEventListener(
      "sequenceCompleted",
      handleSequenceCompleted
    );
    audioFragmentService.addEventListener(
      "globalProgressUpdate",
      handleGlobalProgressUpdate
    );

    if (debug) console.log(
      "🎵 [useAudioFragment] Listeners configurés, nombre total:",
      audioFragmentService.listeners.size
    );
    if (debug) console.log(
      "🎵 [useAudioFragment] Instance du service:",
      audioFragmentService
    );
    if (debug) console.log(
      "🎵 [useAudioFragment] Listeners du service:",
      Array.from(audioFragmentService.listeners)
    );

    return () => {
      if (debug) console.log("🎵 [useAudioFragment] Nettoyage des listeners");
      
      // Nettoyer les listeners
      audioFragmentService.removeEventListener(
        "sequenceStateChanged",
        handleSequenceStateChanged
      );
      audioFragmentService.removeEventListener(
        "fragmentStarted",
        handleFragmentStarted
      );
      audioFragmentService.removeEventListener("timeUpdate", handleTimeUpdate);
      audioFragmentService.removeEventListener(
        "durationLoaded",
        handleDurationLoaded
      );
      audioFragmentService.removeEventListener(
        "fragmentStopped",
        handleFragmentStopped
      );
      audioFragmentService.removeEventListener(
        "sequenceCompleted",
        handleSequenceCompleted
      );
      audioFragmentService.removeEventListener(
        "globalProgressUpdate",
        handleGlobalProgressUpdate
      );
      
      // Arrêter le fragment
      audioFragmentService.stopFragment();
    };
  }, [audioFragmentService, debug]);

  /**
   * Joue un fragment audio
   */
  const playFragment = useCallback(
    async (fragmentId) => {
      if (debug) console.log(
        `🎵 [useAudioFragment] playFragment appelé avec: ${fragmentId}`
      );

      if (!fragmentId) {
        if (debug) console.warn("🎵 [useAudioFragment] Fragment ID requis");
        return false;
      }

      try {
        setError(null);
        if (debug) console.log(`🎵 [useAudioFragment] Lecture fragment: ${fragmentId}`);

        const success = await audioFragmentService.playFragment(fragmentId);

        if (!success) {
          setError(`Failed to play fragment: ${fragmentId}`);
          if (debug) console.error(
            `❌ [useAudioFragment] Échec lecture fragment: ${fragmentId}`
          );
          return false;
        }

        if (debug) console.log(
          `✅ [useAudioFragment] Fragment ${fragmentId} lancé avec succès`
        );
        return true;
      } catch (err) {
        if (debug) console.error(`❌ [useAudioFragment] Erreur lecture fragment:`, err);
        setError(err.message);
        return false;
      }
    },
    [audioFragmentService, debug]
  );

  /**
   * Arrête le fragment en cours
   */
  const stopFragment = useCallback(async () => {
    try {
      await audioFragmentService.stopFragment();
      return true;
    } catch (err) {
      if (debug) console.error("❌ [useAudioFragment] Erreur arrêt fragment:", err);
      setError(err.message);
      return false;
    }
  }, [audioFragmentService, debug]);

  /**
   * Retourne les sous-titres parsés
   */
  const getSubtitles = useCallback(() => {
    if (!fragmentData?.subtitlesContent) return [];

    try {
      // Parser simple pour les sous-titres SRT
      const subtitles = [];
      const blocks = fragmentData.subtitlesContent.split("\n\n");

      blocks.forEach((block) => {
        const lines = block.trim().split("\n");
        if (lines.length >= 3) {
          const timeMatch = lines[1].match(
            /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/
          );
          if (timeMatch) {
            const startTime = parseTimeString(timeMatch[1]);
            const endTime = parseTimeString(timeMatch[2]);
            const text = lines.slice(2).join("\n");

            subtitles.push({
              startTime,
              endTime,
              text,
            });
          }
        }
      });

      return subtitles;
    } catch (err) {
      if (debug) console.error("❌ [useAudioFragment] Erreur parsing sous-titres:", err);
      return [];
    }
  }, [fragmentData, debug]);

  /**
   * Retourne le sous-titre actuel
   */
  const getCurrentSubtitle = useCallback(() => {
    const subtitles = getSubtitles();
    return subtitles.find(
      (subtitle) =>
        currentTime >= subtitle.startTime && currentTime <= subtitle.endTime
    );
  }, [getSubtitles, currentTime]);

  /**
   * Retourne les informations de progression (fragment seul)
   */
  const getProgress = useCallback(() => {
    if (!duration || duration === 0) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

  /**
   * Retourne la progression globale de toute la séquence cassette (0-100%)
   * Inclut : cassette-in + attente + fragment + attente + cassette-out
   */
  const getGlobalProgress = useCallback(() => {
    const state = audioFragmentService.getState();
    return state.globalProgress || 0;
  }, [audioFragmentService]);

  /**
   * Retourne l'état complet
   */
  const getState = useCallback(() => {
    return audioFragmentService.getState();
  }, [audioFragmentService]);

  return {
    // États
    currentFragment,
    isPlaying,
    isLoading,
    sequenceState,
    currentTime,
    duration,
    fragmentData,
    error,

    // Actions
    playFragment,
    stopFragment,

    // Utilitaires
    getSubtitles,
    getCurrentSubtitle,
    getProgress, // Progression du fragment seul
    getGlobalProgress, // Progression globale incluant cassette
    getState,

    // États dérivés
    isCassetteSequenceActive:
      sequenceState !== FRAGMENT_SEQUENCE_STATES.IDLE &&
      sequenceState !== FRAGMENT_SEQUENCE_STATES.COMPLETED,
    isFragmentPlaying:
      sequenceState === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING,
    isCassetteIn: sequenceState === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN,
    isCassetteOut: sequenceState === FRAGMENT_SEQUENCE_STATES.CASSETTE_OUT,
    isWaiting:
      sequenceState === FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN ||
      sequenceState === FRAGMENT_SEQUENCE_STATES.WAIT_BEFORE_CASSETTE_OUT,

    // Propriétés pour compatibilité avec l'ancien code
    fragment: currentFragment,

    // Constantes
    FRAGMENT_SEQUENCE_STATES,
  };
};

/**
 * Utilitaire pour parser les timestamps SRT
 */
function parseTimeString(timeString) {
  const [time, ms] = timeString.split(",");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

export default useAudioFragment;
