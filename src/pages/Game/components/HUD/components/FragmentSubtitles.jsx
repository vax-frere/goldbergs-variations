import { useEffect, useRef, memo } from "react";
import { useAudioFragmentState } from "../../../hooks/useAudioFragment";
import useGameStore from "../../../store";

// Configuration des sous-titres de fragments
const FRAGMENT_SUBTITLES_CONFIG = {
  OFFSET_SECONDS: 0, // Pas de décalage pour les fragments (déjà synchronisés)
};

/**
 * Fonction pour parser un fichier SRT et obtenir les sous-titres formatés
 * @param {string} srtContent - Contenu du fichier SRT
 * @returns {Array} - Tableau d'objets de sous-titres
 */
const parseSRT = (srtContent) => {
  if (!srtContent) return [];

  // Diviser le contenu SRT en blocs de sous-titres
  const subtitleBlocks = srtContent.trim().split(/\r?\n\r?\n/);

  return subtitleBlocks
    .map((block) => {
      const lines = block.split(/\r?\n/);

      // Ignorer les blocs mal formés
      if (lines.length < 3) return null;

      // Extraire l'index
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
        startTime: startTime / 1000, // Convertir en secondes
        endTime: endTime / 1000, // Convertir en secondes
        text,
      };
    })
    .filter(Boolean); // Filtrer les valeurs null
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
 * Composant pour afficher les sous-titres des fragments audio
 * Utilise le DOM direct pour éviter les re-rendus React
 */
const FragmentSubtitles = memo(() => {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const fragmentState = useAudioFragmentState();
  const containerRef = useRef(null);
  const subtitlesRef = useRef([]);
  const currentSubtitleRef = useRef(null);
  const lastFragmentIdRef = useRef(null);

  // Créer le conteneur DOM une seule fois
  useEffect(() => {
    if (!containerRef.current) {
      // Créer le conteneur de sous-titres
      const container = document.createElement("div");
      Object.assign(container.style, {
        position: "fixed",
        bottom: "60px", // En bas de l'écran
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "85%",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        border: "2px solid white", // Bordure blanche
        color: "white", // Texte blanc
        padding: "15px 25px",
        textAlign: "center",
        fontSize: "1.3rem",
        fontWeight: "600",
        zIndex: "150", // Plus haut que les sous-titres normaux
        opacity: "0",
        transition: "opacity 0.3s ease",
        pointerEvents: "none",
        userSelect: "none",
        borderRadius: "0px", // Pas de bords arrondis
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
    };
  }, []);

  // Charger les sous-titres quand un nouveau fragment est disponible
  useEffect(() => {
    console.log("[FragmentSubtitles] Fragment state:", fragmentState);
    console.log(
      "[FragmentSubtitles] Fragment subtitles content:",
      fragmentState.fragmentData?.subtitlesContent
    );

    if (!fragmentState.fragmentData?.subtitlesContent) {
      subtitlesRef.current = [];
      console.log("[FragmentSubtitles] No subtitles content found");
      return;
    }

    // Si c'est un nouveau fragment OU si les sous-titres sont vides, parser ses sous-titres
    if (
      fragmentState.currentFragment !== lastFragmentIdRef.current ||
      subtitlesRef.current.length === 0
    ) {
      const parsedSubtitles = parseSRT(
        fragmentState.fragmentData.subtitlesContent
      );
      subtitlesRef.current = parsedSubtitles;
      lastFragmentIdRef.current = fragmentState.currentFragment;

      console.log(
        `[FragmentSubtitles] Loaded ${parsedSubtitles.length} subtitles for fragment: ${fragmentState.currentFragment}`
      );
      console.log("[FragmentSubtitles] Parsed subtitles:", parsedSubtitles);
    } else {
      console.log(
        `[FragmentSubtitles] Same fragment (${fragmentState.currentFragment}), keeping existing ${subtitlesRef.current.length} subtitles`
      );
    }
  }, [fragmentState.fragmentData, fragmentState.currentFragment]);

  // Fonction pour trouver le sous-titre actuel
  const findCurrentSubtitle = (time) => {
    if (!subtitlesRef.current.length) return null;

    const offsetSeconds = FRAGMENT_SUBTITLES_CONFIG.OFFSET_SECONDS;
    const adjustedTime = Math.max(0, time - offsetSeconds);

    return subtitlesRef.current.find(
      (sub) => adjustedTime >= sub.startTime && adjustedTime <= sub.endTime
    );
  };

  // Fonction pour mettre à jour l'affichage du sous-titre
  const updateSubtitleDisplay = (subtitle) => {
    if (!containerRef.current) return;

    // Si pas de sous-titre ou sous-titre vide
    if (!subtitle || !subtitle.text) {
      containerRef.current.style.opacity = "0";
      containerRef.current.style.transition = "none"; // Pas de transition pour disparaître
      containerRef.current.textContent = "";
      return;
    }

    // Si le sous-titre est différent de l'actuel
    if (
      !currentSubtitleRef.current ||
      currentSubtitleRef.current.index !== subtitle.index
    ) {
      containerRef.current.style.transition = "opacity 0.3s ease"; // Remettre la transition pour apparaître
      containerRef.current.textContent = subtitle.text;
      containerRef.current.style.opacity = "1";
      currentSubtitleRef.current = subtitle;
    }
  };

  // Mettre à jour les sous-titres en fonction du temps actuel
  useEffect(() => {
    // Ne pas afficher les sous-titres si :
    // - L'audio est désactivé
    // - Pas de fragment en cours de lecture
    // - Fragment en cours de chargement
    if (!audioEnabled || !fragmentState.isPlaying || fragmentState.isLoading) {
      if (containerRef.current) {
        containerRef.current.style.opacity = "0";
      }
      console.log(
        "[FragmentSubtitles] Not showing subtitles - audioEnabled:",
        audioEnabled,
        "isPlaying:",
        fragmentState.isPlaying,
        "isLoading:",
        fragmentState.isLoading
      );
      return;
    }

    console.log(
      "[FragmentSubtitles] Checking subtitles at time:",
      fragmentState.currentTime
    );
    console.log(
      "[FragmentSubtitles] Available subtitles count:",
      subtitlesRef.current.length
    );

    // Trouver et afficher le sous-titre actuel
    const currentSubtitle = findCurrentSubtitle(fragmentState.currentTime);
    console.log("[FragmentSubtitles] Current subtitle found:", currentSubtitle);
    updateSubtitleDisplay(currentSubtitle);
  }, [
    audioEnabled,
    fragmentState.isPlaying,
    fragmentState.isLoading,
    fragmentState.currentTime,
  ]);

  // Cacher les sous-titres quand le fragment s'arrête
  useEffect(() => {
    if (!fragmentState.currentFragment && containerRef.current) {
      console.log("[FragmentSubtitles] Fragment stopped, hiding subtitles");
      containerRef.current.style.opacity = "0";
      containerRef.current.textContent = "";
      currentSubtitleRef.current = null;
      // Note: On ne vide pas subtitlesRef.current ici pour permettre la relecture du même fragment
    }
  }, [fragmentState.currentFragment]);

  // Ce composant ne rend aucun élément visuel (utilise le DOM direct)
  return null;
});

FragmentSubtitles.displayName = "FragmentSubtitles";

export default FragmentSubtitles;
