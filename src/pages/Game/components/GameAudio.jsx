import { useEffect, useRef, memo } from "react";
import { useThree } from "@react-three/fiber";
import useGameStore from "../store";
import useAudioManager from "../services/AudioManager";

/**
 * État global simplifié pour la compatibilité
 */
const createAudioState = () => {
  return {
    isInitializing: false,
    forceCompleteInitialization: function () {
      console.warn("Forçage de la fin d'initialisation audio");
      this.isInitializing = false;
    },
  };
};

let _audioState = null;
export const getAudioState = () => {
  if (!_audioState) {
    _audioState = createAudioState();
  }
  return _audioState;
};
export const audioState = getAudioState();

/**
 * Composant pour gérer l'audio du jeu avec le nouveau AudioManager
 */
const GameAudio = memo(() => {
  const { camera } = useThree();
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const toggleAudio = useGameStore((state) => state.toggleAudio);
  const audioManager = useAudioManager();
  const initializationRef = useRef(false);
  const ambientInstanceRef = useRef(null);

  // Initialiser l'AudioManager quand la caméra est disponible
  useEffect(() => {
    if (camera && !initializationRef.current) {
      initializationRef.current = true;

      const initializeAudio = async () => {
        console.log("🎵 [GameAudio] Initializing AudioManager...");

        // Marquer comme en cours d'initialisation pour la compatibilité
        const audioStateObj = getAudioState();
        audioStateObj.isInitializing = true;

        try {
          // Initialiser l'AudioManager
          const success = await audioManager.initialize(camera);

          if (success) {
            console.log("✅ [GameAudio] AudioManager initialized successfully");

            // Démarrer l'audio ambiant si l'audio est activé
            if (audioEnabled) {
              setTimeout(async () => {
                ambientInstanceRef.current =
                  await audioManager.startAmbientAudio();
                console.log("🎵 [GameAudio] Ambient audio started");
              }, 1000); // Délai pour éviter les problèmes de performance
            }
          } else {
            console.warn("⚠️ [GameAudio] Failed to initialize AudioManager");
          }
        } catch (error) {
          console.error("❌ [GameAudio] Error initializing audio:", error);
        } finally {
          // Marquer l'initialisation comme terminée
          audioStateObj.isInitializing = false;
        }
      };

      initializeAudio();
    }
  }, [camera, audioManager, audioEnabled]);

  // Gérer l'activation/désactivation de l'audio
  useEffect(() => {
    if (!audioManager.isInitialized) return;

    if (audioEnabled) {
      // Démarrer l'audio ambiant s'il n'est pas déjà en cours
      if (!ambientInstanceRef.current) {
        audioManager.startAmbientAudio().then((instanceId) => {
          ambientInstanceRef.current = instanceId;
          console.log("🎵 [GameAudio] Ambient audio started (enabled)");
        });
      }
    } else {
      // Arrêter l'audio ambiant
      if (ambientInstanceRef.current) {
        audioManager.stopAmbientAudio();
        ambientInstanceRef.current = null;
        console.log("🔇 [GameAudio] Ambient audio stopped (disabled)");
      }
    }
  }, [audioEnabled, audioManager]);

  // Écouter les touches du clavier pour les contrôles audio
  useEffect(() => {
    let lastKeyTime = 0;
    const keyDebounce = 300; // ms

    const handleKeyDown = (e) => {
      // Touche M pour mute/unmute
      if (e.key === "m" || e.key === "M") {
        const now = performance.now();
        if (now - lastKeyTime > keyDebounce) {
          lastKeyTime = now;
          toggleAudio();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleAudio]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      if (ambientInstanceRef.current) {
        audioManager.stopAmbientAudio();
        ambientInstanceRef.current = null;
      }
    };
  }, [audioManager]);

  // Ce composant ne rend aucun élément visuel
  return null;
});

export default GameAudio;
