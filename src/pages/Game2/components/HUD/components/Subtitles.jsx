import {
  useEffect,
  useRef,
  memo,
  forwardRef,
  useImperativeHandle,
} from "react";
import useAssets from "../../../hooks/useAssets";
import useGameStore from "../../../store";
import { getAudioState } from "../../GameAudio";

// Configuration des sous-titres
const SUBTITLES_CONFIG = {
  OFFSET_SECONDS: 2.5, // Décalage des sous-titres en secondes
};

// Mise en cache des sous-titres déjà parsés
let parsedSubtitlesCache = null;

/**
 * Fonction pour parser un fichier SRT et obtenir les sous-titres formatés
 * @param {string} srtContent - Contenu du fichier SRT
 * @returns {Array} - Tableau d'objets de sous-titres
 */
const parseSRT = (srtContent) => {
  if (!srtContent) return [];

  // Utiliser le cache si disponible
  if (parsedSubtitlesCache) return parsedSubtitlesCache;

  // Diviser le contenu SRT en blocs de sous-titres
  const subtitleBlocks = srtContent.trim().split(/\r?\n\r?\n/);

  parsedSubtitlesCache = subtitleBlocks
    .map((block) => {
      const lines = block.split(/\r?\n/);

      // Ignorer les blocs mal formés
      if (lines.length < 3) return null;

      // Extraire l'index (pas utilisé, mais c'est un bon check)
      const index = parseInt(lines[0], 10);

      // Extraire et parser les timestamps
      const timestamps = lines[1].split(" --> ");
      if (timestamps.length !== 2) return null;

      const startTime = parseTimeString(timestamps[0]);
      const endTime = parseTimeString(timestamps[1]);

      // Extraire le texte (peut être sur plusieurs lignes)
      const text = lines.slice(2).join(" ");

      return {
        index,
        startTime: startTime / 1000, // Convertir en secondes pour correspondre à currentTime
        endTime: endTime / 1000, // Convertir en secondes pour correspondre à currentTime
        text,
      };
    })
    .filter(Boolean); // Filtrer les valeurs null

  return parsedSubtitlesCache;
};

/**
 * Converti un timestamp SRT (HH:MM:SS,MMM) en millisecondes
 * @param {string} timeString - Timestamp au format SRT
 * @returns {number} - Temps en millisecondes
 */
const parseTimeString = (timeString) => {
  const [time, milliseconds] = timeString.replace(",", ".").split(".");
  const [hours, minutes, seconds] = time.split(":").map(Number);

  return (
    hours * 3600000 + // Heures en ms
    minutes * 60000 + // Minutes en ms
    seconds * 1000 + // Secondes en ms
    parseInt(milliseconds || 0, 10) // Millisecondes
  );
};

/**
 * Composant pour afficher les sous-titres synchronisés avec l'audio
 * Cette implémentation évite les re-rendus React et utilise le DOM direct
 */
const Subtitles = memo(() => {
  const assets = useAssets({ autoInit: false });
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const containerRef = useRef(null);
  const subtitlesRef = useRef([]);
  const currentSubtitleRef = useRef(null);
  const activeTimerRef = useRef(null);
  const audioListenerRef = useRef(null);

  // Créer le conteneur DOM une seule fois
  useEffect(() => {
    if (!containerRef.current) {
      // Créer le conteneur de sous-titres
      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "absolute",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "80%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: "white",
        padding: "10px 20px",
        borderRadius: "4px",
        textAlign: "center",
        fontSize: "1.2rem",
        fontWeight: "500",
        zIndex: "100",
        opacity: "0",
        transition: "opacity 0.2s ease",
        pointerEvents: "none",
        userSelect: "none",
      });

      // Ajouter au body
      document.body.appendChild(container);
      containerRef.current = container;
    }

    // Nettoyer lors du démontage
    return () => {
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }

      // Nettoyer les timers
      if (activeTimerRef.current) {
        clearTimeout(activeTimerRef.current);
      }
    };
  }, []);

  // Charger les sous-titres une seule fois
  useEffect(() => {
    if (!assets.isReady || subtitlesRef.current.length > 0) return;

    const srtContent = assets.getData("srt_interview");
    if (srtContent) {
      const parsedSubtitles = parseSRT(srtContent);
      subtitlesRef.current = parsedSubtitles;
      console.log("Sous-titres chargés:", parsedSubtitles.length);
    }
  }, [assets.isReady]);

  // Fonction pour trouver le sous-titre actuel
  const findCurrentSubtitle = (time) => {
    if (!subtitlesRef.current.length) return null;

    const offsetSeconds = SUBTITLES_CONFIG.OFFSET_SECONDS;
    const adjustedTime = Math.max(0, time - offsetSeconds);

    return subtitlesRef.current.find(
      (sub) => adjustedTime >= sub.startTime && adjustedTime <= sub.endTime
    );
  };

  // Fonction pour mettre à jour l'affichage du sous-titre
  // Cette fonction est découplée de React pour éviter les re-rendus
  const updateSubtitleDisplay = (subtitle) => {
    if (!containerRef.current) return;

    // Si pas de sous-titre ou sous-titre vide
    if (!subtitle || !subtitle.text) {
      containerRef.current.style.opacity = "0";
      containerRef.current.textContent = "";
      return;
    }

    // Si le sous-titre est différent de l'actuel
    if (
      !currentSubtitleRef.current ||
      currentSubtitleRef.current.index !== subtitle.index
    ) {
      containerRef.current.textContent = subtitle.text;
      containerRef.current.style.opacity = "1";
      currentSubtitleRef.current = subtitle;
    }
  };

  // S'abonner aux changements de l'état audio une seule fois
  useEffect(() => {
    // Prévenir les mises à jour trop fréquentes
    let lastUpdateTime = 0;
    const updateThrottleMs = 500; // Limiter à une mise à jour toutes les 500ms max

    // Fonction pour mettre à jour les sous-titres
    const updateSubtitle = () => {
      // Ne rien faire si l'audio est désactivé
      if (!audioEnabled) {
        if (
          containerRef.current &&
          containerRef.current.style.opacity !== "0"
        ) {
          containerRef.current.style.opacity = "0";
        }
        return;
      }

      // Throttling pour éviter les mises à jour trop fréquentes
      const now = performance.now();
      if (now - lastUpdateTime < updateThrottleMs) return;
      lastUpdateTime = now;

      // Obtenir le temps actuel et trouver le sous-titre correspondant
      const audioTime = getAudioState().currentTime;
      const subtitle = findCurrentSubtitle(audioTime);

      // Mettre à jour l'affichage
      updateSubtitleDisplay(subtitle);
    };

    // Initialiser l'écouteur d'événements
    if (!audioListenerRef.current) {
      audioListenerRef.current = getAudioState().subscribe(() => {
        // Utiliser requestAnimationFrame pour synchroniser avec le cycle de rendu
        if (activeTimerRef.current) {
          cancelAnimationFrame(activeTimerRef.current);
        }
        activeTimerRef.current = requestAnimationFrame(updateSubtitle);
      });
    }

    // Nettoyer lors du démontage
    return () => {
      if (audioListenerRef.current) {
        audioListenerRef.current();
        audioListenerRef.current = null;
      }

      if (activeTimerRef.current) {
        cancelAnimationFrame(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    };
  }, [audioEnabled]);

  // Ce composant ne rend aucun élément React
  return null;
});

export default Subtitles;
