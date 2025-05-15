import React, { useState, useEffect, useRef } from "react";
import useSound from "use-sound";
import { IconButton, Tooltip } from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";

// Singleton pour gérer l'état global du son
export const GlobalAudioController = {
  isMuted: false,
  listeners: [],

  // Ajouter un listener qui sera notifié quand l'état global change
  addMuteListener: (callback) => {
    GlobalAudioController.listeners.push(callback);
    // Retourner une fonction pour supprimer le listener
    return () => {
      GlobalAudioController.listeners = GlobalAudioController.listeners.filter(
        (cb) => cb !== callback
      );
    };
  },

  // Définir l'état mute global et notifier tous les listeners
  setMuted: (muted) => {
    GlobalAudioController.isMuted = muted;
    GlobalAudioController.listeners.forEach((callback) => callback(muted));
  },

  // Toggle l'état mute
  toggleMute: () => {
    GlobalAudioController.setMuted(!GlobalAudioController.isMuted);
    return GlobalAudioController.isMuted;
  },
};

// Component dedicated to sound management
const SoundPlayer = ({
  soundPath, // Path to the sound file
  defaultVolume = 0.1, // Default volume (10% of max)
  loop = true, // Whether to loop the sound
  autoPlay = true, // Whether to auto-play after interaction
  displayControls = true, // Whether to display control buttons
  controlPosition = { top: "20px", right: "20px" }, // Position of the controls
  tooltipLabels = { mute: "Couper le son", unmute: "Activer le son" }, // Customizable labels
}) => {
  // State to track if sound is playing
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(GlobalAudioController.isMuted);
  // Track whether user has interacted with the page
  const [hasInteracted, setHasInteracted] = useState(false);
  // Track loading status
  const [isLoading, setIsLoading] = useState(false);
  // Ref to keep track of previous sound object for cleanup
  const soundRef = useRef(null);

  // Prevent exhausted audio pool issues
  const [key, setKey] = useState(Date.now());

  // S'abonner aux changements globaux de mute
  useEffect(() => {
    const unsubscribe = GlobalAudioController.addMuteListener((muted) => {
      setIsMuted(muted);
    });

    // Cleanup lors du démontage
    return unsubscribe;
  }, []);

  // Function to clean up previous audio instance
  const cleanupAudio = () => {
    if (soundRef.current) {
      try {
        // Force HTML5 Audio instances to release
        soundRef.current._sounds.forEach((sound) => {
          if (sound._node) {
            sound._node.pause();
            sound._node.src = "";
            sound._node.load();
          }
        });
        soundRef.current.unload();
      } catch (e) {
        console.warn("Cleanup error:", e);
      }
    }
  };

  // Reset audio instance on hot reload (development only)
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Initialize sound with use-sound with improved options for large files
  // Added key to force recreation on specific events
  const [play, { stop, sound }] = useSound(soundPath, {
    volume: defaultVolume,
    loop: loop,
    // Options for better handling of large files
    preload: true, // Complete loading for better looping
    html5: false, // Use Web Audio API for better loop behavior
    // Remove sprite to allow native loop mechanism to work
    interrupt: false, // Prevent interruptions that could affect looping
    onload: () => {
      setIsLoading(false);
      // Save reference to sound object for cleanup
      if (sound && !soundRef.current) {
        soundRef.current = sound;
      }
    },
    onloaderror: (error) => {
      console.error("Error loading audio file:", error);
      setIsLoading(false);
    },
    onplayerror: (error) => {
      console.error("Error playing audio:", error);
      // Try again with user interaction, but using a new instance
      if (hasInteracted) {
        setKey(Date.now()); // Force new instance
      }
    },
    onend: () => {
      // If needed, force replay if automatic loop fails
      if (isPlaying && !isMuted && loop) {
        setTimeout(() => {
          play();
        }, 100);
      }
    },
  });

  // Control volume when mute state changes
  useEffect(() => {
    if (sound) {
      sound.volume(isMuted ? 0 : defaultVolume);
    }
  }, [sound, isMuted, defaultVolume]);

  // Start or stop the sound after user interaction
  useEffect(() => {
    if (hasInteracted && !isPlaying && sound && autoPlay) {
      setIsLoading(true);
      try {
        // Commencer avec un volume à 0 pour éviter le son fort initial
        sound.volume(0);
        // Play without specifying sprite ID to use native looping
        play();
        // Faire un fondu d'entrée progressif vers le volume normal
        if (sound && sound.fade) {
          sound.fade(0, isMuted ? 0 : defaultVolume, 1000); // Fondu sur 1 seconde
        }
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsLoading(false);
      }
    }
  }, [hasInteracted, isPlaying, play, sound, autoPlay, defaultVolume, isMuted]);

  // Make sure sound stops when component unmounts
  useEffect(() => {
    return () => {
      if (isPlaying) {
        stop();
        cleanupAudio();
      }
    };
  }, [isPlaying, stop]);

  // Handle mute/unmute toggle - maintenant synchronisé avec le contrôleur global
  const toggleMute = () => {
    // Utiliser le contrôleur global pour faire le toggle
    const newMutedState = GlobalAudioController.toggleMute();
    setIsMuted(newMutedState);
  };

  // Listen for first click on the page
  useEffect(() => {
    const handleFirstClick = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
      }
    };

    // Add event listener to the entire document
    document.addEventListener("click", handleFirstClick);

    // Clean up event listener
    return () => {
      document.removeEventListener("click", handleFirstClick);
    };
  }, [hasInteracted]);

  return displayControls ? (
    <div
      style={{
        position: "absolute",
        zIndex: 1000,
        ...controlPosition,
      }}
    >
      {/* Only display the sound control button if the user has already interacted with the page */}
      {hasInteracted && (
        <Tooltip title={isMuted ? tooltipLabels.unmute : tooltipLabels.mute}>
          <IconButton
            onClick={toggleMute}
            aria-label={isMuted ? "activer le son" : "couper le son"}
            size="large"
            sx={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              color: isLoading ? "gray" : "white",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
              },
            }}
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        </Tooltip>
      )}
    </div>
  ) : null;
};

export default SoundPlayer;
