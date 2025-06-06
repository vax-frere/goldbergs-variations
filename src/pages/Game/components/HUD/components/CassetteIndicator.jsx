import React, { useEffect, useState, useMemo, memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useAudioFragment from "../../../hooks/useAudioFragment";
import useAssets from "../../../hooks/useAssets";

const CassetteContainer = styled(Box)(({ theme, isVisible }) => ({
  position: "fixed",
  top: "90px",
  right: "25px",
  width: "50px",
  height: "50px",
  backgroundColor: "black",
  border: "1px solid white",
  borderRadius: "0px",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  padding: "0",

  // Animation properties
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? "translateX(0)" : "translateX(-30px)", // Vient de la gauche
  transition: "opacity 0.4s ease-out, transform 0.4s ease-out",

  // Ensure smooth entry/exit
  willChange: "opacity, transform",
}));

const ProgressBar = styled(Box)(({ theme, progress }) => ({
  position: "absolute",
  top: "0",
  left: "0",
  height: "3px",
  width: `${progress}%`,
  backgroundColor: "#FFFFFF", // Vert
  transition: "width 0.1s ease",
}));

const CassetteIcon = styled("div")(({ theme }) => ({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0",
  margin: "0",
  "& svg": {
    width: "45px", // Taille fixe pour le SVG
    height: "45px",
    fill: "white",
    display: "block", // Évite les espaces en ligne
  },
  "& > div": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
}));

// Memoized SVG component to prevent re-renders
const MemoizedCassetteIcon = memo(({ cassetteIcon }) => {
  return (
    <CassetteIcon>
      {cassetteIcon ? (
        <div dangerouslySetInnerHTML={{ __html: cassetteIcon }} />
      ) : (
        // Fallback si l'icône ne charge pas
        <Box
          sx={{
            width: "32px", // Même taille que le SVG
            height: "24px", // Proportionnel pour une cassette
            border: "2px solid white",
            borderRadius: "2px",
            position: "relative",
            "&::before, &::after": {
              content: '""',
              position: "absolute",
              width: "6px",
              height: "6px",
              backgroundColor: "white",
              borderRadius: "50%",
              top: "50%",
              transform: "translateY(-50%)",
            },
            "&::before": {
              left: "4px",
            },
            "&::after": {
              right: "4px",
            },
          }}
        />
      )}
    </CassetteIcon>
  );
});

MemoizedCassetteIcon.displayName = "MemoizedCassetteIcon";

/**
 * Composant d'indicateur de cassette avec barre de progression
 * S'affiche pendant la lecture des fragments audio
 */
const CassetteIndicator = () => {
  const fragmentState = useAudioFragment();
  const assets = useAssets({ autoInit: false });
  const [cassetteIcon, setCassetteIcon] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [lastProgress, setLastProgress] = useState(0); // Conserver la dernière progression

  // Charger l'icône cassette depuis l'AssetManager (memoized)
  const memoizedCassetteIcon = useMemo(() => {
    if (assets.isReady) {
      const svgContent = assets.getSVG("cassette.svg");
      return svgContent || null;
    }
    return null;
  }, [assets.isReady]);

  // Update state only when memoized icon changes
  useEffect(() => {
    setCassetteIcon(memoizedCassetteIcon);
  }, [memoizedCassetteIcon]);

  // Gérer l'animation d'apparition/disparition
  useEffect(() => {
    const shouldShow = fragmentState.isCassetteSequenceActive; // Apparaître dès le début de la séquence

    if (shouldShow && !shouldRender) {
      // Apparition : rendre d'abord, puis animer
      setIsExiting(false); // Réinitialiser l'état de sortie
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 50); // Petit délai pour permettre le rendu
    } else if (!shouldShow && shouldRender) {
      // Disparition : marquer comme en cours de sortie, animer d'abord, puis arrêter le rendu
      setIsExiting(true);
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 400); // Attendre la fin de l'animation
    }
  }, [fragmentState.isCassetteSequenceActive, shouldRender]);

  // Calculer le pourcentage de progression incluant toute la séquence cassette
  const progress = useMemo(() => {
    // Progression simple basée sur le fragment audio actuel
    if (fragmentState.duration > 0 && fragmentState.currentTime >= 0) {
      const calculatedProgress = Math.min(
        (fragmentState.currentTime / fragmentState.duration) * 100,
        100
      );

      // Mettre à jour la dernière progression si on n'est pas en train de disparaître
      if (!isExiting) {
        setLastProgress(calculatedProgress);
      }

      return isExiting ? lastProgress : calculatedProgress;
    }

    // Si pas de durée ou temps, retourner la dernière progression connue ou 0
    return isExiting ? lastProgress : 0;
  }, [
    fragmentState.currentTime,
    fragmentState.duration,
    isExiting,
    lastProgress,
  ]);

  // Ne pas rendre si pas nécessaire
  if (!shouldRender) {
    return null;
  }

  return (
    <CassetteContainer isVisible={isVisible}>
      <ProgressBar progress={progress} />
      <MemoizedCassetteIcon cassetteIcon={cassetteIcon} />
    </CassetteContainer>
  );
};

export default CassetteIndicator;
