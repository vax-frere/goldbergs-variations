/**
 * AudioFragmentService - Service SOLID pour gérer les fragments audio
 * Gère la séquence complète : cassette-in, fragment, cassette-out + sous-titres
 */

import useAudioManager from "./AudioManager";
import useAssetStore from "./AssetManager";
import useGameStore from "../store";

/**
 * États de la séquence de fragment audio
 */
export const FRAGMENT_SEQUENCE_STATES = {
  IDLE: "idle",
  CASSETTE_IN: "cassette_in",
  WAIT_AFTER_CASSETTE_IN: "wait_after_cassette_in",
  FRAGMENT_PLAYING: "fragment_playing",
  WAIT_BEFORE_CASSETTE_OUT: "wait_before_cassette_out",
  CASSETTE_OUT: "cassette_out",
  COMPLETED: "completed",
};

/**
 * Configuration de la séquence cassette
 */
const CASSETTE_SEQUENCE_CONFIG = {
  CASSETTE_IN_DURATION: 2.0, // Durée du son cassette-in
  WAIT_AFTER_CASSETTE_IN: 1.0, // Attente après cassette-in
  WAIT_BEFORE_CASSETTE_OUT: 1.0, // Attente avant cassette-out
  CASSETTE_OUT_DURATION: 2.0, // Durée du son cassette-out
};

/**
 * Classe principale du service de fragments audio
 */
class AudioFragmentService {
  constructor(debug = false) {
    this.debug = debug;
    this.audioManager = null;
    this.assetStore = null;
    this.gameStore = null;
    this.isInitialized = false;

    // État de la séquence
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.IDLE;
    this.currentFragment = null;
    this.fragmentData = null;
    this.sequenceStartTime = 0;
    this.fragmentStartTime = 0;
    this.fragmentDuration = 0;
    this.currentTime = 0;

    // Progression des phases individuelles
    this.phaseProgress = {
      cassetteIn: 0,        // 0-100%
      waitAfter: 0,         // 0-100%
      fragment: 0,          // 0-100%
      waitBefore: 0,        // 0-100%
      cassetteOut: 0        // 0-100%
    };

    // Listeners pour les événements
    this.listeners = new Set();

    // Timers pour mettre à jour le temps
    this.timeUpdateInterval = null; // Timer global pour progression
    this.fragmentTimeInterval = null; // Timer spécifique au fragment

    if (this.debug) console.log("🎵 [AudioFragmentService] Service créé");
  }

  /**
   * Initialise le service
   */
  initialize() {
    if (this.isInitialized) return true;

    try {
      // Accéder aux stores Zustand
      const audioManagerStore = useAudioManager.getState();
      this.audioManager = audioManagerStore.getAudioManagerInstance(); // Instance réelle
      this.assetStore = useAssetStore.getState();
      this.gameStore = useGameStore.getState();

      if (!this.audioManager || !this.assetStore || !this.gameStore) {
        console.error(
          "🎵 [AudioFragmentService] Stores requis non disponibles"
        );
        return false;
      }

      this.isInitialized = true;
      if (this.debug) console.log("🎵 [AudioFragmentService] Service initialisé");
      return true;
    } catch (error) {
      console.error("🎵 [AudioFragmentService] Erreur initialisation:", error);
      return false;
    }
  }

  /**
   * Joue un fragment audio avec la séquence complète
   */
  async playFragment(fragmentId) {
    console.log(
      `🎵 [AudioFragmentService] playFragment appelé avec: ${fragmentId}`
    );

    if (!this.isInitialized || !this.audioManager) {
      if (this.debug) console.error("🎵 [AudioFragmentService] Service non initialisé");
      if (this.debug) console.log(
        "🎵 [AudioFragmentService] isInitialized:",
        this.isInitialized
      );
      if (this.debug) console.log("🎵 [AudioFragmentService] audioManager:", this.audioManager);
      return false;
    }

    if (!this.gameStore.audioEnabled) {
      if (this.debug) console.log("🎵 [AudioFragmentService] Audio désactivé");
      return false;
    }

          try {
        if (this.debug) console.log(
          `🎵 [AudioFragmentService] Démarrage séquence fragment: ${fragmentId}`
        );

        // Arrêter la séquence actuelle si elle existe
        await this.stopFragment();

        // Charger les données du fragment
        if (this.debug) console.log(
          `🎵 [AudioFragmentService] Chargement données fragment: ${fragmentId}`
        );
        this.fragmentData = await this._loadFragmentData(fragmentId);
        if (!this.fragmentData) {
          throw new Error(`Fragment ${fragmentId} non trouvé`);
        }
        if (this.debug) console.log(
          `🎵 [AudioFragmentService] Données fragment chargées:`,
          this.fragmentData
        );

        this.currentFragment = fragmentId;
        this.sequenceStartTime = Date.now();
        this.currentTime = 0;
        
        // Estimation simple de la durée (sera mise à jour quand l'audio se charge)
        this.fragmentDuration = 45; // Estimation par défaut

        // Démarrer la séquence
        if (this.debug) console.log(`🎵 [AudioFragmentService] Démarrage séquence cassette`);
        await this._startCassetteSequence();

      return true;
    } catch (error) {
      console.error(
        `❌ [AudioFragmentService] Erreur lecture fragment:`,
        error
      );
      this._resetState();
      return false;
    }
  }

  /**
   * Arrête le fragment en cours
   */
  async stopFragment() {
    if (this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.IDLE) return;

    if (this.debug) console.log("🛑 [AudioFragmentService] Arrêt séquence fragment");

    if (this.audioManager) {
      // Arrêter tous les sons
      await this.audioManager.stopSound("cassette-in.mp3");
      await this.audioManager.stopSound("fragment_main");
      await this.audioManager.stopSound("cassette-out.mp3");
    }

    // Arrêter le timer
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    if (this.fragmentTimeInterval) {
      clearInterval(this.fragmentTimeInterval);
      this.fragmentTimeInterval = null;
    }

    this._resetState();
    this._emitEvent("fragmentStopped");
  }

  /**
   * Démarre la séquence cassette
   */
  async _startCassetteSequence() {
    if (this.debug) console.log(
      "🎵 [AudioFragmentService] _startCassetteSequence - Phase 1: Cassette-in"
    );

    // Démarrer le timer de progression globale dès le début
    this._startGlobalProgressTimer();

    // Phase 1: Cassette-in
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.CASSETTE_IN;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);

    if (this.debug) console.log("🎵 [AudioFragmentService] Lecture son cassette-in.mp3");
    await this.audioManager.playSound("cassette-in.mp3", { type: "sfx" });
    if (this.debug) console.log("🎵 [AudioFragmentService] Attente après cassette-in");
    await this._wait(CASSETTE_SEQUENCE_CONFIG.CASSETTE_IN_DURATION * 1000);

    if (this.debug) console.log(
      "🎵 [AudioFragmentService] _startCassetteSequence - Phase 2: Attente après cassette-in"
    );

    // Phase 2: Attente après cassette-in
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);

    if (this.debug) console.log("🎵 [AudioFragmentService] Début attente après cassette-in");
    await this._wait(CASSETTE_SEQUENCE_CONFIG.WAIT_AFTER_CASSETTE_IN * 1000);
    if (this.debug) console.log("🎵 [AudioFragmentService] Fin attente après cassette-in");

    if (this.debug) console.log(
      "🎵 [AudioFragmentService] _startCassetteSequence - Phase 3: Fragment principal"
    );

    // Phase 3: Lecture du fragment
    try {
      await this._playMainFragment(this.fragmentData);
    } catch (error) {
      console.error("❌ [AudioFragmentService] Erreur Phase 3:", error);
      throw error;
    }
  }

  /**
   * Joue le fragment principal
   */
  async _playMainFragment(fragmentData) {
    console.log(
      "🎵 [AudioFragmentService] Phase 3: Lecture du fragment principal"
    );

    try {
      // Charger et jouer le son principal
      const mainAudioId = `fragment_${fragmentData.fragmentId}`;
      console.log(
        `🎵 [AudioFragmentService] Chargement et lecture audio: ${mainAudioId}`
      );

      // D'abord charger le son
      await this.audioManager.loadSound(mainAudioId, fragmentData.audioUrl);

      // Puis le jouer pour obtenir une instance
      const instanceId = await this.audioManager.playSound(mainAudioId, {
        type: "fragment",
        instanceId: "fragment_main",
        volume: 0.8,
        loop: false,
      });

      if (this.debug) console.log(
        `🎵 [AudioFragmentService] Instance créée avec ID: ${instanceId}`
      );

      // Récupérer l'instance audio
      const audioInstance =
        this.audioManager.audioInstances.get("fragment_main");

      if (!audioInstance) {
        throw new Error("Instance audio non trouvée après création");
      }

      if (this.debug) console.log(
        `🎵 [AudioFragmentService] Instance audio récupérée:`,
        audioInstance
      );
      if (this.debug) console.log(
        `🎵 [AudioFragmentService] Volume de l'instance:`,
        audioInstance.currentVolume
      );
      if (this.debug) console.log(`🎵 [AudioFragmentService] État de l'instance:`, {
        isPlaying: audioInstance.isPlaying,
        isPaused: audioInstance.isPaused,
      });

      // Configurer l'écoute de fin
      this._listenForFragmentEnd(fragmentData);

      // Vérifier après le play
      setTimeout(() => {
        if (this.debug) console.log(`🎵 [AudioFragmentService] État après 100ms:`, {
          isPlaying: audioInstance.isPlaying,
          isPaused: audioInstance.isPaused,
          volume: audioInstance.currentVolume,
        });
      }, 100);

      // Émettre l'événement de début
      this._emitEvent("fragmentStarted", {
        fragmentId: fragmentData.fragmentId,
        duration: fragmentData.duration,
        fragmentData: fragmentData,
      });

      // Changer l'état
      this._changeSequenceState(FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING);

      // Démarrer le timer spécifique au fragment (le timer global continue)
      this._startFragmentTimeUpdater();
    } catch (error) {
      console.error("❌ [AudioFragmentService] Erreur Phase 3:", error);
      throw error;
    }
  }

  /**
   * Écoute la fin du fragment
   */
  _listenForFragmentEnd(fragmentData) {
    // Accéder directement aux instances audio puisque this.audioManager est déjà l'instance réelle
    if (!this.audioManager) {
      console.warn(
        "🎵 [AudioFragmentService] AudioManager instance non disponible"
      );
      return;
    }

    const instance = this.audioManager.audioInstances.get("fragment_main");

    if (instance && instance.audioObject) {
      if (this.debug) console.log("🎵 [AudioFragmentService] Écouteur fin fragment configuré");
      const audioObject = instance.audioObject;

      // Pour HTML5 Audio
      if (audioObject instanceof Audio) {
        audioObject.addEventListener(
          "ended",
          () => this._onFragmentEnded(fragmentData),
          {
            once: true,
          }
        );
        audioObject.addEventListener(
          "loadedmetadata",
          () => {
            this.fragmentDuration = audioObject.duration;
            if (this.debug) console.log(
              "🎵 [AudioFragmentService] Durée fragment:",
              this.fragmentDuration
            );
            this._emitEvent("durationLoaded", this.fragmentDuration);
          },
          { once: true }
        );
      }
      // Pour THREE.js Audio
      else if (audioObject.source) {
        audioObject.source.onended = () => this._onFragmentEnded(fragmentData);
        // Estimer la durée pour THREE.js Audio
        if (audioObject.buffer) {
          this.fragmentDuration = audioObject.buffer.duration;
          if (this.debug) console.log(
            "🎵 [AudioFragmentService] Durée fragment (THREE.js):",
            this.fragmentDuration
          );
          this._emitEvent("durationLoaded", this.fragmentDuration);
        }
      }
    } else {
      console.warn(
        "🎵 [AudioFragmentService] Instance fragment_main non trouvée"
      );
    }
  }

  /**
   * Appelé quand le fragment se termine
   */
  async _onFragmentEnded(fragmentData) {
    if (this.debug) console.log("🎵 [AudioFragmentService] Fragment terminé");

    // Arrêter seulement le timer du fragment (le timer global continue)
    if (this.fragmentTimeInterval) {
      clearInterval(this.fragmentTimeInterval);
      this.fragmentTimeInterval = null;
    }

    // Phase 4: Attente avant cassette-out
    this.currentSequenceState =
      FRAGMENT_SEQUENCE_STATES.WAIT_BEFORE_CASSETTE_OUT;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);

    await this._wait(CASSETTE_SEQUENCE_CONFIG.WAIT_BEFORE_CASSETTE_OUT * 1000);

    // Phase 5: Cassette-out
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.CASSETTE_OUT;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);

    await this.audioManager.playSound("cassette-out.mp3", { type: "sfx" });
    await this._wait(CASSETTE_SEQUENCE_CONFIG.CASSETTE_OUT_DURATION * 1000);

    // Phase 6: Terminé - maintenant on peut arrêter le timer global
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.COMPLETED;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);

    // Arrêter le timer global maintenant que la séquence est terminée
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }

    // Marquer le fragment comme joué
    this.gameStore.markFragmentAsPlayed(
      fragmentData.fragmentId,
      fragmentData.fragmentId
    );

    // Nettoyer
    this._resetState();
    this._emitEvent("sequenceCompleted");
  }

  /**
   * Charge les données du fragment (audio + sous-titres)
   */
  async _loadFragmentData(fragmentId) {
    try {
      console.log(
        `🎵 [AudioFragmentService] Chargement données pour fragment: ${fragmentId}`
      );

      // Charger l'URL audio depuis l'AssetStore
      const audioUrl = this.assetStore.getSound(`fragments/${fragmentId}.mp3`);
      console.log(
        `🎵 [AudioFragmentService] URL audio pour ${fragmentId}:`,
        audioUrl
      );

      if (!audioUrl) {
        throw new Error(`URL audio pour le fragment ${fragmentId} non trouvée`);
      }

      // Charger les sous-titres depuis l'AssetStore
      const subtitlesId = `srt_${fragmentId}`;
      let subtitlesContent = this.assetStore.getData(subtitlesId);

      // Si pas trouvé avec l'ID direct, essayer avec le chemin complet
      if (!subtitlesContent) {
        const subtitlesPath = this.assetStore.getDataPath(
          `fragments/${fragmentId}.srt`
        );
        if (subtitlesPath) {
          try {
            const response = await fetch(subtitlesPath);
            if (response.ok) {
              subtitlesContent = await response.text();
            }
          } catch (fetchError) {
            console.warn(
              `🎵 [AudioFragmentService] Impossible de charger les sous-titres depuis ${subtitlesPath}:`,
              fetchError
            );
          }
        }
      }

      console.log(
        `🎵 [AudioFragmentService] Sous-titres pour ${fragmentId}:`,
        subtitlesContent ? "trouvés" : "non trouvés"
      );

      const fragmentData = {
        fragmentId: fragmentId,
        audioUrl: audioUrl,
        subtitlesContent: subtitlesContent,
        duration: 0, // Sera mis à jour quand l'audio sera chargé
      };

      console.log(
        `🎵 [AudioFragmentService] Données fragment complètes:`,
        fragmentData
      );

      return fragmentData;
    } catch (error) {
      console.error(
        `❌ [AudioFragmentService] Erreur chargement données fragment:`,
        error
      );
      return null;
    }
  }

  /**
   * Remet à zéro l'état du service
   */
  _resetState() {
    this.currentSequenceState = FRAGMENT_SEQUENCE_STATES.IDLE;
    this.currentFragment = null;
    this.fragmentData = null;
    this.sequenceStartTime = 0;
    this.fragmentStartTime = 0;
    this.fragmentDuration = 0;
    this.currentTime = 0;
    
    // Réinitialiser les progressions de phases
    this.phaseProgress = {
      cassetteIn: 0,
      waitAfter: 0,
      fragment: 0,
      waitBefore: 0,
      cassetteOut: 0
    };
  }

  /**
   * Utilitaire pour attendre
   */
  _wait(ms) {
    if (this.debug) console.log(`🎵 [AudioFragmentService] _wait: ${ms}ms`);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.debug) console.log(`🎵 [AudioFragmentService] _wait terminé: ${ms}ms`);
        resolve();
      }, ms);
    });
  }

  /**
   * Ajoute un listener d'événements
   */
  addEventListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  /**
   * Supprime un listener d'événements
   */
  removeEventListener(event, callback) {
    this.listeners.forEach((listener) => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  /**
   * Émet un événement
   */
  _emitEvent(event, data = null) {
    if (this.debug) console.log(`🎵 [AudioFragmentService] Émission événement: ${event}`, data);
    if (this.debug) console.log(
      `🎵 [AudioFragmentService] Nombre de listeners: ${this.listeners.size}`
    );

    this.listeners.forEach(({ event: listenerEvent, callback }) => {
      if (listenerEvent === event) {
        if (this.debug) console.log(`🎵 [AudioFragmentService] Appel callback pour: ${event}`);
        callback(data);
      }
    });
  }

  /**
   * Retourne l'état actuel
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      currentSequenceState: this.currentSequenceState,
      currentFragment: this.currentFragment,
      fragmentData: this.fragmentData,
      currentTime: this.currentTime,
      fragmentDuration: this.fragmentDuration,
      globalProgress: this._calculateGlobalProgress(),
      phaseProgress: this.phaseProgress,
      isPlaying:
        this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING,
      isLoading:
        this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.CASSETTE_IN ||
        this.currentSequenceState ===
          FRAGMENT_SEQUENCE_STATES.WAIT_AFTER_CASSETTE_IN,
      isCassetteSequenceActive:
        this.currentSequenceState !== FRAGMENT_SEQUENCE_STATES.IDLE &&
        this.currentSequenceState !== FRAGMENT_SEQUENCE_STATES.COMPLETED,
    };
  }

  /**
   * Calcule la progression globale de toute la séquence cassette (0-100%)
   * VERSION SIMPLIFIÉE : Progression linéaire basée sur le temps écoulé total
   */
  _calculateGlobalProgress() {
    if (this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.IDLE) {
      return 0;
    }

    if (this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.COMPLETED) {
      return 100;
    }

    // Si pas de temps de début, retourner 0
    if (!this.sequenceStartTime) {
      return 0;
    }

    // Durée totale de la séquence (en secondes)
    const cassetteInDuration = CASSETTE_SEQUENCE_CONFIG.CASSETTE_IN_DURATION;
    const waitAfterDuration = CASSETTE_SEQUENCE_CONFIG.WAIT_AFTER_CASSETTE_IN;
    const fragmentDuration = this.fragmentDuration || 45; // Estimation par défaut
    const waitBeforeDuration = CASSETTE_SEQUENCE_CONFIG.WAIT_BEFORE_CASSETTE_OUT;
    const cassetteOutDuration = CASSETTE_SEQUENCE_CONFIG.CASSETTE_OUT_DURATION;

    const totalDuration = 
      cassetteInDuration + 
      waitAfterDuration + 
      fragmentDuration + 
      waitBeforeDuration + 
      cassetteOutDuration;

    // Temps écoulé depuis le début (en secondes)
    const elapsedTime = (Date.now() - this.sequenceStartTime) / 1000;

    // Progression linéaire simple : temps écoulé / temps total
    const percentage = Math.min((elapsedTime / totalDuration) * 100, 100);
    
    return Math.max(0, percentage);
  }

  /**
   * Nettoie le service
   */
  dispose() {
    this.stopFragment();
    this.listeners.clear();
    this.isInitialized = false;
    if (this.debug) console.log("🧹 [AudioFragmentService] Service nettoyé");
  }

  /**
   * Change l'état de la séquence et émet l'événement
   */
  _changeSequenceState(newState) {
    if (this.debug) console.log(
      `🎵 [AudioFragmentService] Changement état: ${this.currentSequenceState} -> ${newState}`
    );
    this.currentSequenceState = newState;
    this._emitEvent("sequenceStateChanged", this.currentSequenceState);
  }

  /**
   * Démarre le timer de progression globale - VERSION SIMPLIFIÉE
   */
  _startGlobalProgressTimer() {
    if (this.debug) console.log("🎵 [AudioFragmentService] Démarrage timer progression globale (simple)");

    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    // Timer simple qui émet juste la progression
    this.timeUpdateInterval = setInterval(() => {
      if (this.currentSequenceState !== FRAGMENT_SEQUENCE_STATES.IDLE && 
          this.currentSequenceState !== FRAGMENT_SEQUENCE_STATES.COMPLETED) {
        
        const globalProgress = this._calculateGlobalProgress();
        this._emitEvent("globalProgressUpdate", globalProgress);
      }
    }, 100); // Mise à jour toutes les 100ms
  }

  /**
   * Démarre le timer spécifique au fragment
   */
  _startFragmentTimeUpdater() {
    if (this.debug) console.log("🎵 [AudioFragmentService] Démarrage timer fragment");
    
    // Marquer le début du fragment
    this.fragmentStartTime = Date.now();
    
    // Le timer global s'occupe déjà de la progression globale
    // On ajoute juste la mise à jour du temps du fragment
    if (!this.fragmentTimeInterval) {
      this.fragmentTimeInterval = setInterval(() => {
        if (this.currentSequenceState === FRAGMENT_SEQUENCE_STATES.FRAGMENT_PLAYING) {
          this.currentTime = (Date.now() - this.fragmentStartTime) / 1000;
          this._emitEvent("timeUpdate", this.currentTime);
        }
      }, 100);
    }
  }
}

// Instance singleton
let audioFragmentServiceInstance = null;

/**
 * Hook pour utiliser l'AudioFragmentService
 */
export const useAudioFragmentService = (debug = false) => {
  if (!audioFragmentServiceInstance) {
    audioFragmentServiceInstance = new AudioFragmentService(debug);
  }
  return audioFragmentServiceInstance;
};

export default AudioFragmentService;
