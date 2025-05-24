import { useEffect, useRef, useState, createContext, memo } from "react";
import { useThree } from "@react-three/fiber";
import useAssets from "../hooks/useAssets";
import useGameStore from "../store";
import { getSoundPath } from "../../../utils/assetLoader";

// Liste des sons utilisés dans le jeu
const SOUNDS = {
  AMBIENT: "ambiant.mp3",
  INTERVIEW: "interview.mp3",
};

// Création d'un objet global pour partager les informations d'audio
// En l'encapsulant dans une fonction, on évite les problèmes de HMR
const createAudioState = () => {
  // Utiliser un intervalle fixe au lieu de requestAnimationFrame pour réduire la pression sur le CPU
  let notificationIntervalId = null;
  const NOTIFICATION_INTERVAL = 1000; // Un intervalle plus long (1000ms = 1s) pour réduire drastiquement la fréquence

  return {
    interviewAudio: null, // Référence directe à l'élément audio
    isPlaying: false,
    currentTime: 0, // Nous stockons maintenant directement le temps courant
    listeners: new Set(), // Utiliser un Set pour éviter les doublons et optimiser remove
    isInitializing: false, // Indicateur que l'audio est en cours d'initialisation

    // Force le statut "non initializing" pour débloquer le jeu en cas de problème
    forceCompleteInitialization: function () {
      console.warn("Forçage de la fin d'initialisation audio");
      this.isInitializing = false;
    },

    subscribe: function (callback) {
      // Si en mode DEV, on garde une seule référence maximum pour éviter les problèmes
      if (import.meta.env.DEV && this.listeners.size > 0) {
        console.log(
          "Mode DEV: Un seul listener autorisé, remplacement de l'existant"
        );
        this.listeners.clear();
      }

      this.listeners.add(callback);

      // Si c'est le premier listener et que l'audio est en cours de lecture,
      // démarrer les notifications
      if (
        this.listeners.size === 1 &&
        this.isPlaying &&
        !notificationIntervalId
      ) {
        this._startNotifications();
      }

      return () => {
        this.listeners.delete(callback);

        // Si plus de listeners, arrêter les notifications
        if (this.listeners.size === 0) {
          this._stopNotifications();
        }
      };
    },

    // Méthode privée pour démarrer les notifications
    _startNotifications: function () {
      if (notificationIntervalId) return; // Ne pas démarrer si déjà en cours

      // Utiliser setInterval au lieu de requestAnimationFrame
      // pour réduire la pression sur le thread principal
      notificationIntervalId = setInterval(() => {
        // Mettre à jour le temps actuel
        if (this.interviewAudio) {
          this.currentTime = this.interviewAudio.currentTime;
        }

        // Notifier les listeners
        if (this.listeners.size > 0) {
          // Utiliser un setTimeout pour rendre non-bloquante la notification
          setTimeout(() => {
            this.listeners.forEach((listener) => {
              try {
                listener();
              } catch (err) {
                console.error(
                  "Erreur lors de la notification d'un listener:",
                  err
                );
              }
            });
          }, 0);
        }
      }, NOTIFICATION_INTERVAL);
    },

    // Méthode pour démarrer les notifications
    notifyListeners: function () {
      // Si l'audio est en lecture mais pas d'intervalle, en démarrer un
      if (
        this.isPlaying &&
        !notificationIntervalId &&
        this.listeners.size > 0
      ) {
        this._startNotifications();
      }

      // Mettre à jour immédiatement aussi (pour la première notification)
      if (this.interviewAudio) {
        this.currentTime = this.interviewAudio.currentTime;
      }

      // Notifier les listeners immédiatement
      if (this.listeners.size > 0) {
        setTimeout(() => {
          this.listeners.forEach((listener) => {
            try {
              listener();
            } catch (err) {
              console.error(
                "Erreur lors de la notification d'un listener:",
                err
              );
            }
          });
        }, 0);
      }
    },

    // Méthode pour arrêter les notifications
    stopNotifications: function () {
      this._stopNotifications();
    },

    // Méthode privée pour arrêter les notifications
    _stopNotifications: function () {
      if (notificationIntervalId) {
        clearInterval(notificationIntervalId);
        notificationIntervalId = null;
      }
    },
  };
};

// Exporter une instance de l'état audio
// Utiliser une fonction factory pour éviter les problèmes avec HMR de Vite
let _audioState = null;
export const getAudioState = () => {
  if (!_audioState) {
    _audioState = createAudioState();
  }
  return _audioState;
};
export const audioState = getAudioState();

// Auxiliaire pour appliquer un fondu audio en douceur
const applyFade = (audioElement, fromVolume, toVolume, duration = 1000) => {
  if (!audioElement) return Promise.resolve();

  return new Promise((resolve) => {
    // Sauvegarder le volume actuel pour le restaurer après
    const originalVolume = audioElement.volume;
    const startVolume = fromVolume !== undefined ? fromVolume : originalVolume;

    audioElement.volume = startVolume;

    const startTime = performance.now();

    const fade = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Fonction d'easing cubique
      const easedProgress =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      audioElement.volume =
        startVolume + (toVolume - startVolume) * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        audioElement.volume = toVolume;
        resolve();
      }
    };

    requestAnimationFrame(fade);
  });
};

// Auxiliaire pour précharger l'audio
const preloadAudio = (url) => {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();

      // Définir un timeout au cas où l'audio ne se chargerait pas
      // Réduit à 5 secondes pour éviter de bloquer trop longtemps
      const timeoutId = setTimeout(() => {
        console.warn(
          `Timeout lors du préchargement de ${url}, considéré comme chargé`
        );
        resolve(audio); // On résout quand même pour ne pas bloquer
      }, 5000);

      audio.addEventListener(
        "canplaythrough",
        () => {
          clearTimeout(timeoutId);
          console.log(`Préchargement réussi pour ${url}`);
          resolve(audio);
        },
        { once: true }
      );

      audio.addEventListener(
        "error",
        (err) => {
          clearTimeout(timeoutId);
          console.error(`Erreur lors du préchargement de ${url}`, err);
          // Résoudre même en cas d'erreur pour ne pas bloquer
          resolve(audio);
        },
        { once: true }
      );

      audio.src = url;
      audio.load();
    } catch (err) {
      console.error(`Exception lors du préchargement de ${url}`, err);
      // Créer un élément audio vide en cas d'erreur pour ne pas bloquer
      resolve(new Audio());
    }
  });
};

/**
 * Composant responsable de la gestion audio du jeu
 * Synchronise le son avec les événements du jeu et l'état des personas
 */
const GameAudio = memo(() => {
  // Accéder aux assets et au store du jeu
  const assets = useAssets({ autoInit: false });
  const activeLevel = useGameStore((state) => state.activeLevel);
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const toggleAudio = useGameStore((state) => state.toggleAudio);

  // Référence pour indiquer si l'audio est en cours d'initialisation
  const isInitializingRef = useRef(false);

  // Récupérer le contexte Three.js
  const { camera } = useThree();

  // Références pour les éléments audio
  const ambientRef = useRef(null);
  const interviewRef = useRef(null);

  // États pour suivre l'état audio
  const audioStateRef = useRef({
    ambientLoaded: false,
    interviewLoaded: false,
    initialized: false,
  });

  // Créer et gérer l'audio ambiant et l'interview
  useEffect(() => {
    if (!assets.isReady || audioStateRef.current.initialized) return;

    // Marquer comme initialisé pour éviter plusieurs initialisations
    audioStateRef.current.initialized = true;

    // Indiquer que l'audio est en cours d'initialisation
    const audioStateObj = getAudioState();
    audioStateObj.isInitializing = true;
    isInitializingRef.current = true;

    // Forcer la fin immédiate si on est en développement
    if (import.meta.env.DEV) {
      console.log("Mode développement détecté, initialisation audio immédiate");

      // Définir les gestionnaires d'événements pour le mode DEV
      const handlePlaying = () => {
        audioStateObj.isPlaying = true;
        audioStateObj.notifyListeners();
        console.log("DEV: Audio en lecture");
      };

      const handlePause = () => {
        audioStateObj.isPlaying = false;
        audioStateObj.stopNotifications();
        audioStateObj.notifyListeners();
        console.log("DEV: Audio en pause");
      };

      const handleEnded = () => {
        audioStateObj.isPlaying = false;
        audioStateObj.stopNotifications();
        audioStateObj.notifyListeners();
        console.log("DEV: Audio terminé");
      };

      // Fonction pour précharger les sons de manière asynchrone même en DEV
      const quickInitializeAudio = async () => {
        try {
          console.log("DEV: Préchargement rapide des fichiers audio...");

          // Précharger les deux fichiers audio en parallèle
          const [ambientSound, interviewSound] = await Promise.all([
            preloadAudio(getSoundPath(SOUNDS.AMBIENT)),
            preloadAudio(getSoundPath(SOUNDS.INTERVIEW)),
          ]);

          // Configurer l'audio d'ambiance
          ambientSound.loop = true;
          ambientSound.volume = 0;
          ambientRef.current = ambientSound;

          // Configurer l'audio d'interview
          interviewSound.loop = true;
          interviewSound.volume = 0;
          interviewRef.current = interviewSound;

          // Exposer la référence audio
          audioStateObj.interviewAudio = interviewSound;

          // Ajouter les écouteurs d'événements
          interviewSound.addEventListener("playing", handlePlaying);
          interviewSound.addEventListener("pause", handlePause);
          interviewSound.addEventListener("ended", handleEnded);

          console.log("DEV: Audio préchargé, démarrage...");

          // Démarrer l'audio immédiatement
          // Démarrer les deux sons avec volume à 0
          if (ambientRef.current) {
            ambientRef.current.play().catch((err) => {
              console.warn("DEV: Impossible de jouer le son ambiant:", err);
            });
          }

          if (interviewRef.current) {
            interviewRef.current.play().catch((err) => {
              console.warn("DEV: Impossible de jouer l'interview:", err);
            });
          }

          // Appliquer un fondu d'entrée progressif
          if (ambientRef.current) {
            applyFade(ambientRef.current, 0, 0.1, 1000);
          }

          if (interviewRef.current) {
            applyFade(interviewRef.current, 0, 0.25, 1000);
          }

          // Audio complètement initialisé
          setTimeout(() => {
            audioStateObj.isInitializing = false;
            isInitializingRef.current = false;
            audioStateObj.isPlaying = true;
            audioStateObj.notifyListeners();
            console.log(
              "[DEV] Audio marqué comme complètement initialisé et en lecture"
            );
          }, 1000);
        } catch (error) {
          console.error("DEV: Erreur lors de l'initialisation audio:", error);
          audioStateObj.isInitializing = false;
          isInitializingRef.current = false;
        }
      };

      // Lancer l'initialisation rapide pour le mode DEV
      quickInitializeAudio();

      return; // Ne pas continuer avec l'initialisation standard
    }

    // Timeout de sécurité global pour débloquer le jeu après un certain temps
    // même si le préchargement ne se termine jamais
    const safetyTimeoutId = setTimeout(() => {
      if (audioStateObj.isInitializing) {
        console.warn(
          "Timeout de sécurité atteint, forçage fin d'initialisation audio"
        );
        audioStateObj.forceCompleteInitialization();
      }
    }, 5000); // Réduit à 5 secondes maximum pour le préchargement complet

    // Ajouter les écouteurs d'événements avec des fonctions nommées
    const handlePlaying = () => {
      audioStateObj.isPlaying = true;
      // Démarrer les notifications dès que l'audio commence à jouer
      audioStateObj.notifyListeners();
    };

    const handlePause = () => {
      audioStateObj.isPlaying = false;
      // Arrêter les notifications quand l'audio est en pause
      audioStateObj.stopNotifications();
      audioStateObj.notifyListeners(); // Notification finale pour mettre à jour les UI
    };

    const handleEnded = () => {
      audioStateObj.isPlaying = false;
      // Arrêter les notifications quand l'audio est terminé
      audioStateObj.stopNotifications();
      audioStateObj.notifyListeners(); // Notification finale pour mettre à jour les UI
    };

    // Fonction pour précharger les sons de manière asynchrone
    const initializeAudio = async () => {
      try {
        console.log("Préchargement des fichiers audio...");

        // Précharger les deux fichiers audio en parallèle
        const [ambientSound, interviewSound] = await Promise.all([
          preloadAudio(getSoundPath(SOUNDS.AMBIENT)),
          preloadAudio(getSoundPath(SOUNDS.INTERVIEW)),
        ]);

        // Configurer l'audio d'ambiance
        ambientSound.loop = true;
        ambientSound.volume = 0; // Commencer avec un volume à 0
        ambientRef.current = ambientSound;

        // Configurer l'audio d'interview
        interviewSound.loop = true;
        interviewSound.volume = 0; // Commencer avec un volume à 0
        interviewRef.current = interviewSound;

        // Exposer la référence audio à travers l'objet audioState
        audioStateObj.interviewAudio = interviewSound;

        // Ajouter les écouteurs d'événements
        interviewSound.addEventListener("playing", handlePlaying);
        interviewSound.addEventListener("pause", handlePause);
        interviewSound.addEventListener("ended", handleEnded);

        // L'audio est prêt, on peut le démarrer avec un délai
        console.log("Audio préchargé, démarrage dans 1 seconde...");

        // Démarrer la lecture avec un délai pour éviter les pertes de FPS
        setTimeout(() => {
          startAudioWithFade();
        }, 1000);
      } catch (error) {
        console.error("Erreur lors de l'initialisation audio:", error);
        // Réinitialiser l'état pour permettre une nouvelle tentative
        audioStateRef.current.initialized = false;

        // Forcer la fin de l'initialisation en cas d'erreur pour ne pas bloquer le jeu
        audioStateObj.isInitializing = false;
        isInitializingRef.current = false;
      }
    };

    // Fonction pour démarrer l'audio avec fondu
    const startAudioWithFade = async () => {
      try {
        // Démarrer les deux sons avec volume à 0
        if (ambientRef.current) {
          ambientRef.current.play().catch((err) => {
            console.warn("Impossible de jouer le son ambiant:", err);
          });
        }

        if (interviewRef.current) {
          interviewRef.current.play().catch((err) => {
            console.warn("Impossible de jouer l'interview:", err);
            audioStateObj.isPlaying = false;
            audioStateObj.notifyListeners();
          });
        }

        // Appliquer un fondu d'entrée progressif en décalé
        if (ambientRef.current) {
          await applyFade(ambientRef.current, 0, 0.1, 2000);
        }

        if (interviewRef.current) {
          await applyFade(interviewRef.current, 0, 0.25, 2000);
        }

        // Audio complètement initialisé
        audioStateObj.isInitializing = false;
        isInitializingRef.current = false;
        console.log("Audio complètement initialisé");
        clearTimeout(safetyTimeoutId); // Nettoyer le timeout de sécurité
      } catch (error) {
        console.error("Erreur lors du démarrage audio avec fondu:", error);
        audioStateObj.isInitializing = false;
        isInitializingRef.current = false;
      }
    };

    // Démarrer l'initialisation de l'audio
    initializeAudio();

    // Nettoyage lors du démontage
    return () => {
      // Nettoyer le timeout de sécurité
      clearTimeout(safetyTimeoutId);

      // Arrêter les notifications
      audioStateObj.stopNotifications();

      if (ambientRef.current) {
        ambientRef.current.pause();
        ambientRef.current = null;
      }

      if (interviewRef.current) {
        interviewRef.current.pause();
        interviewRef.current.removeEventListener("playing", handlePlaying);
        interviewRef.current.removeEventListener("pause", handlePause);
        interviewRef.current.removeEventListener("ended", handleEnded);
        interviewRef.current = null;
      }

      audioStateObj.interviewAudio = null;
      audioStateObj.isInitializing = false;
      isInitializingRef.current = false;
    };
  }, [assets.isReady]);

  // Mettre à jour l'état de mute selon audioEnabled
  useEffect(() => {
    if (ambientRef.current) {
      // Plutôt que de muter, on applique un fondu si on n'est pas en initialisation
      if (!isInitializingRef.current) {
        if (audioEnabled) {
          applyFade(ambientRef.current, ambientRef.current.volume, 0.1, 500);
        } else {
          applyFade(ambientRef.current, ambientRef.current.volume, 0, 500);
        }
      } else {
        // Pendant l'initialisation, simplement muter
        ambientRef.current.muted = !audioEnabled;
      }
    }

    if (interviewRef.current) {
      // Même chose pour l'interview
      if (!isInitializingRef.current) {
        if (audioEnabled) {
          applyFade(
            interviewRef.current,
            interviewRef.current.volume,
            0.25,
            500
          );
        } else {
          applyFade(interviewRef.current, interviewRef.current.volume, 0, 500);
        }
      } else {
        interviewRef.current.muted = !audioEnabled;
      }
    }
  }, [audioEnabled]);

  // Écouter les touches du clavier pour les contrôles audio
  useEffect(() => {
    // Utiliser un debounce pour éviter les appels rapides
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

  // Ce composant ne rend aucun élément visuel
  return null;
});

export default GameAudio;
