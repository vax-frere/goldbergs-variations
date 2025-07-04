import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import {
  useActiveLevel,
  useGameStore,
  useVisitedPersonasCount,
} from "../../store";
import useAssets from "../../hooks/useAssets";
import { useCameraSpeedWithLevels } from "../../hooks/useCameraSpeed";
import AudioStatus from "./components/AudioStatus";
import TextPanel from "./components/TextPanel";
import FragmentSubtitles from "./components/FragmentSubtitles";
import InteractionPrompt from "./components/InteractionPrompt";
import ThematicLegend from "./components/ThematicLegend";
import ActiveLevelName from "./components/ActiveLevelName";
import ExitWarningPanel from "./components/ExitWarningPanel";
import CassetteIndicator from "./components/CassetteIndicator";
import PlayerProgress from "./components/PlayerProgress";
import SpeedIndicator from "./components/SpeedIndicator";
import RetroWindowManager from "./components/RetroWindowManager";
import { getImagePath } from "../../../../utils/assetLoader";

import "./HUD.css";

const HUDOverlay = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "341px", // Correspond aux dimensions du SVG
  height: "196px", // Correspond aux dimensions du SVG
  zIndex: 999,
  pointerEvents: "none",
  opacity: 0.9,
}));

/**
 * HUD principal du jeu
 * Gère l'affichage des éléments d'interface utilisateur
 */
const HUD = memo(() => {
  
  // État pour les données du HUD (legacy)
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0 });
  const [svgContent, setSvgContent] = useState(null);

  // Récupérer le niveau actif et le compteur de personas depuis le store
  const activeLevel = useActiveLevel();
  const visitedPersonasCount = useVisitedPersonasCount();
  const debugMode = useGameStore((state) => state.debug); // Utiliser l'état debug centralisé
  const assets = useAssets({ autoInit: false });

  // Calculer le nombre total de clusters à partir des données du graphe
  const totalClusters = useMemo(() => {
    if (!assets.isReady) return 0;
    const graphData = assets.getData("graph");
    if (!graphData?.nodes) return 0;

    // Créer un Set des clusterIds uniques
    const uniqueClusters = new Set(
      graphData.nodes
        .filter((node) => node.clusterId !== undefined)
        .map((node) => node.clusterId)
    );

    return uniqueClusters.size;
  }, [assets.isReady, assets.getData]);



  // Charger le SVG directement
  useEffect(() => {
    // Path vers le fichier SVG via l'asset loader
    const svgPath = getImagePath("hud.svg");

    // Charger le SVG
    fetch(svgPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.text();
      })
      .then((svgText) => {
        setSvgContent(svgText);
      })
      .catch((error) => {
        console.error("Erreur lors du chargement du SVG:", error);
      });
  }, []);

  // **ANCIEN SYSTÈME SUPPRIMÉ** - Plus besoin de timer grâce au CameraMetricsManager
  // La vitesse est maintenant gérée par useCameraMetric() avec throttling intelligent

  return (
    <div className="hud-container">
      {/* Affichage du nom du niveau actif en haut à gauche */}
      <ActiveLevelName />

      {/* Légende des couleurs thématiques */}
      <ThematicLegend
        hasProgressCounter={visitedPersonasCount > 0 && totalClusters > 0}
      />

      {/* Composant de progression du joueur */}
      <PlayerProgress />

      {/* Composants d'interface utilisateur */}
      <AudioStatus />
      <FragmentSubtitles />
      <TextPanel />
      <InteractionPrompt />
      <ExitWarningPanel />
      <CassetteIndicator />
      
      {/* Gestionnaire des fenêtres rétro */}
      <RetroWindowManager />

      {/* Panneau de debug audio maintenant géré par DebugPanelManager dans Game.jsx */}

      <HUDOverlay>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Indicateur de vitesse */}
            <SpeedIndicator />
          </div>
        </Box>
      </HUDOverlay>
    </div>
  );
});

HUD.displayName = "HUD";

export default HUD;
