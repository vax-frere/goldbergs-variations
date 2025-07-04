import React, { useEffect, useState, useMemo, memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { useAudioFragmentState } from "../../../hooks/useAudioFragment";
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
  backgroundColor: "#FFFFFF",
  // transition: "width 0.1s ease", // ❌ Supprimé temporairement pour debug
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
 * 
 * ✅ TOUJOURS MONTÉ - Visibilité gérée par CSS uniquement
 */
const CassetteIndicator = ({ debug = false }) => {
  const fragmentState = useAudioFragmentState(debug); // ✅ Hook léger sans listeners
  const assets = useAssets({ autoInit: false });
  const [cassetteIcon, setCassetteIcon] = useState(null);
  const [maxProgress, setMaxProgress] = useState(0); // ✅ Garder la progression max

  // ✅ Log de montage/démontage du composant
  useEffect(() => {
    if (debug) console.log("🟢 [CassetteIndicator] COMPOSANT MONTÉ");
    return () => {
      if (debug) console.log("🔴 [CassetteIndicator] COMPOSANT DÉMONTÉ");
    };
  }, [debug]);

  // ✅ Log à chaque render
  if (debug) console.log("🔄 [CassetteIndicator] RENDER - sequenceState:", fragmentState.sequenceState, "isVisible:", fragmentState.isCassetteSequenceActive);

  // ✅ Log détaillé de l'état pour debug
  if (debug) console.log("🔍 [CassetteIndicator] État complet:", {
    sequenceState: fragmentState.sequenceState,
    isCassetteSequenceActive: fragmentState.isCassetteSequenceActive,
    currentFragment: fragmentState.currentFragment,
    isPlaying: fragmentState.isPlaying,
    isLoading: fragmentState.isLoading,
    serviceState: fragmentState.getState ? fragmentState.getState() : "pas de getState"
  });

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

  // ✅ Visibilité basée sur l'état du fragment (pas de démontage)
  const isVisible = fragmentState.isCassetteSequenceActive;

  // Réinitialiser maxProgress quand une nouvelle séquence commence
  useEffect(() => {
    if (fragmentState.sequenceState === 'cassette_in') {
      setMaxProgress(0);
      if (debug) console.log("🔄 [CassetteIndicator] Réinitialisation maxProgress pour nouvelle séquence");
    }
  }, [fragmentState.sequenceState, debug]);

  // Calculer le pourcentage de progression
  const progress = useMemo(() => {
    // Utiliser la progression globale qui inclut toutes les phases cassette
    const globalProgress = fragmentState.getGlobalProgress ? fragmentState.getGlobalProgress() : 0;
    
    // S'assurer que la progression est dans les limites 0-100
    const finalProgress = Math.max(0, Math.min(100, globalProgress));
    
    // ✅ Ne jamais redescendre - garder la valeur max
    const progressToUse = Math.max(maxProgress, finalProgress);
    
    // Mettre à jour maxProgress si on a une nouvelle valeur plus haute
    if (finalProgress > maxProgress) {
      setMaxProgress(finalProgress);
    }
    
    // Log détaillé pour traquer les changements
    if (debug) console.log("🎯 [CassetteIndicator] Calcul progression:", {
      globalProgress: globalProgress.toFixed(2),
      finalProgress: finalProgress.toFixed(2),
      maxProgress: maxProgress.toFixed(2),
      progressToUse: progressToUse.toFixed(2),
      sequenceState: fragmentState.sequenceState,
      currentTime: fragmentState.currentTime,
      duration: fragmentState.duration,
      timestamp: Date.now()
    });
    
    return progressToUse;
  }, [fragmentState, maxProgress, debug]);

  // Debug logs pour comprendre l'état
  useEffect(() => {
    if (debug) {
      const globalProgress = fragmentState.getGlobalProgress ? fragmentState.getGlobalProgress() : 0;
      const state = fragmentState.getState ? fragmentState.getState() : {};
      
      console.log("🎵 [CassetteIndicator] État détaillé:", {
        isVisible,
        duration: fragmentState.duration,
        currentTime: fragmentState.currentTime,
        globalProgress: globalProgress.toFixed(1) + "%",
        progress: progress.toFixed(1) + "%",
        sequenceState: fragmentState.sequenceState,
        isCassetteSequenceActive: fragmentState.isCassetteSequenceActive,
        // Progressions de phases individuelles
        phaseProgress: state.phaseProgress || "non disponible",
        // Timestamp pour traquer l'ordre
        timestamp: Date.now()
      });
    }
  }, [debug, isVisible, fragmentState, progress]);

  // ✅ TOUJOURS RENDU - Pas de return null !
  return (
    <CassetteContainer isVisible={isVisible}>
      <ProgressBar progress={progress} />
      <MemoizedCassetteIcon cassetteIcon={cassetteIcon} />
    </CassetteContainer>
  );
};

export default CassetteIndicator;
