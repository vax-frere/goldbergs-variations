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
 * Hook principal pour les fragments audio
 */
export const useAudioFragment = () => {
  const audioFragmentService = useAudioFragmentService();
  console.log("🎵 [useAudioFragment] Service instance:", audioFragmentService);
  console.log(
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

  // Référence pour éviter les fuites mémoire
  const mountedRef = useRef(true);

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
        console.error("❌ [useAudioFragment] Erreur initialisation:", err);
        setError(err.message);
      }
    };

    initializeService();

    return () => {
      mountedRef.current = false;
    };
  }, [audioFragmentService]);

  /**
   * Configure les listeners d'événements
   */
  useEffect(() => {
    console.log(
      "🎵 [useAudioFragment] Configuration des listeners d'événements"
    );

    const handleSequenceStateChanged = (state) => {
      console.log(
        "🎵 [useAudioFragment] Événement sequenceStateChanged reçu:",
        state
      );
      console.log(
        "🔧 [useAudioFragment] Avant setState - mountedRef.current:",
        mountedRef.current
      );

      setSequenceState(state);
      console.log("🔧 [useAudioFragment] setSequenceState appelé avec:", state);

      setIsLoading(
        state === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN ||
          state === FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN
      );
      console.log("🔧 [useAudioFragment] setIsLoading appelé");

      setIsPlaying(state === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING);
      console.log("🔧 [useAudioFragment] setIsPlaying appelé");

      console.log("🎵 [useAudioFragment] États mis à jour:", {
        sequenceState: state,
        isLoading:
          state === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN ||
          state === FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN,
        isPlaying: state === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING,
      });
    };

    const handleFragmentStarted = (data) => {
      console.log(
        "🎵 [useAudioFragment] Événement fragmentStarted reçu:",
        data
      );
      console.log(
        "🔧 [useAudioFragment] Avant setState fragment - mountedRef.current:",
        mountedRef.current
      );

      setCurrentFragment(data.fragmentId);
      console.log(
        "🔧 [useAudioFragment] setCurrentFragment appelé avec:",
        data.fragmentId
      );

      setDuration(data.duration || 0);
      console.log(
        "🔧 [useAudioFragment] setDuration appelé avec:",
        data.duration || 0
      );

      setFragmentData(data.fragmentData);
      console.log(
        "🔧 [useAudioFragment] setFragmentData appelé avec:",
        data.fragmentData
      );

      setError(null);
      console.log("🔧 [useAudioFragment] setError appelé avec null");

      console.log("🎵 [useAudioFragment] Fragment data mis à jour:", {
        currentFragment: data.fragmentId,
        duration: data.duration || 0,
        fragmentData: data.fragmentData,
      });
    };

    const handleTimeUpdate = (time) => {
      console.log("🎵 [useAudioFragment] Événement timeUpdate reçu:", time);
      setCurrentTime(time);

      // Log moins fréquent pour timeUpdate
      if (Math.floor(time * 10) % 10 === 0) {
        // Log toutes les secondes
        console.log("🎵 [useAudioFragment] Temps mis à jour:", time);
      }
    };

    const handleDurationLoaded = (duration) => {
      console.log(
        "🎵 [useAudioFragment] Événement durationLoaded reçu:",
        duration
      );
      if (!mountedRef.current) return;
      setDuration(duration);
    };

    const handleFragmentStopped = () => {
      console.log("🎵 [useAudioFragment] Événement fragmentStopped reçu");
      if (!mountedRef.current) return;

      setCurrentFragment(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      setFragmentData(null);
      setSequenceState(FRAGMENT_SEQUENCE_STATES.IDLE);
    };

    const handleSequenceCompleted = () => {
      console.log("🎵 [useAudioFragment] Événement sequenceCompleted reçu");
      if (!mountedRef.current) return;

      setCurrentFragment(null);
      setIsPlaying(false);
      setIsLoading(false);
      setCurrentTime(0);
      setDuration(0);
      setFragmentData(null);
      setSequenceState(FRAGMENT_SEQUENCE_STATES.IDLE);
    };

    // Ajouter les listeners
    console.log("🎵 [useAudioFragment] Ajout des listeners au service");
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

    console.log(
      "🎵 [useAudioFragment] Listeners configurés, nombre total:",
      audioFragmentService.listeners.size
    );
    console.log(
      "🎵 [useAudioFragment] Instance du service:",
      audioFragmentService
    );
    console.log(
      "🎵 [useAudioFragment] Listeners du service:",
      Array.from(audioFragmentService.listeners)
    );

    return () => {
      console.log("🎵 [useAudioFragment] Nettoyage des listeners");
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
    };
  }, [audioFragmentService]);

  /**
   * Nettoie au démontage
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      audioFragmentService.stopFragment();
    };
  }, [audioFragmentService]);

  /**
   * Joue un fragment audio
   */
  const playFragment = useCallback(
    async (fragmentId) => {
      console.log(
        `🎵 [useAudioFragment] playFragment appelé avec: ${fragmentId}`
      );

      if (!fragmentId) {
        console.warn("🎵 [useAudioFragment] Fragment ID requis");
        return false;
      }

      try {
        setError(null);
        console.log(`🎵 [useAudioFragment] Lecture fragment: ${fragmentId}`);

        const success = await audioFragmentService.playFragment(fragmentId);

        if (!success) {
          setError(`Failed to play fragment: ${fragmentId}`);
          console.error(
            `❌ [useAudioFragment] Échec lecture fragment: ${fragmentId}`
          );
          return false;
        }

        console.log(
          `✅ [useAudioFragment] Fragment ${fragmentId} lancé avec succès`
        );
        return true;
      } catch (err) {
        console.error(`❌ [useAudioFragment] Erreur lecture fragment:`, err);
        setError(err.message);
        return false;
      }
    },
    [audioFragmentService]
  );

  /**
   * Arrête le fragment en cours
   */
  const stopFragment = useCallback(async () => {
    try {
      await audioFragmentService.stopFragment();
      return true;
    } catch (err) {
      console.error("❌ [useAudioFragment] Erreur arrêt fragment:", err);
      setError(err.message);
      return false;
    }
  }, [audioFragmentService]);

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
      console.error("❌ [useAudioFragment] Erreur parsing sous-titres:", err);
      return [];
    }
  }, [fragmentData]);

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
   * Retourne les informations de progression
   */
  const getProgress = useCallback(() => {
    if (!duration || duration === 0) return 0;
    return Math.min((currentTime / duration) * 100, 100);
  }, [currentTime, duration]);

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
    getProgress,
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
