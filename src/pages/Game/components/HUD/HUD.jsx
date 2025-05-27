import React, { useState, useEffect, useRef, useMemo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import {
  useActiveLevel,
  useGameStore,
  useVisitedPersonasCount,
} from "../../store";
import useAssets from "../../hooks/useAssets";
import AudioStatus from "./components/AudioStatus";
import TextPanel from "./components/TextPanel";
import Subtitles from "./components/Subtitles";
import InteractionPrompt from "./components/InteractionPrompt";
import ThematicLegend from "./components/ThematicLegend";
import ActiveLevelName from "./components/ActiveLevelName";

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

// Style plus discret pour le compteur de personas
const VisitedPersonasCounter = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: "25px",
  right: "25px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 1)",
  backgroundColor: "rgba(0, 0, 0, 1)",
  border: "1px solid rgba(255, 255, 255, 1)",
  borderRadius: "0px",
  padding: "8px 12px",
  zIndex: 1000,
  pointerEvents: "none",
  whiteSpace: "nowrap",
}));

/**
 * Composant HUD (Heads-Up Display) pour afficher des informations en overlay
 */
const HUD = () => {
  // État pour les données du HUD
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0 });
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [svgContent, setSvgContent] = useState(null);

  // Récupérer le niveau actif et le compteur de personas depuis le store
  const activeLevel = useActiveLevel();
  const visitedPersonasCount = useVisitedPersonasCount();
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

  // Calculer le pourcentage de complétion
  const completionPercentage = Math.round(
    (visitedPersonasCount / (totalClusters || 1)) * 100
  );

  // Références pour la barre de vitesse
  const speedBarRef = useRef(null);
  const speedBarFillRef = useRef(null);
  const MAX_SPEED = 300; // Vitesse maximale pour la barre (pleine)

  // Charger le SVG directement
  useEffect(() => {
    // Path absolu vers le fichier SVG, sans passer par l'asset manager
    const svgPath = `${import.meta.env.BASE_URL || "/"}img/hud.svg`;

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

  // Mettre à jour les données du HUD à partir des variables globales
  useEffect(() => {
    const updateHUDData = () => {
      // Récupérer la vitesse de la caméra
      if (window.__cameraSpeed !== undefined) {
        setCurrentSpeed(window.__cameraSpeed);
      }
    };

    // Mettre à jour les données toutes les 100ms
    const dataInterval = setInterval(updateHUDData, 100);

    return () => {
      clearInterval(dataInterval);
    };
  }, [currentSpeed]);

  return (
    <>
      {/* Affichage du nom du niveau actif en haut à gauche */}
      <ActiveLevelName />

      {/* Légende des couleurs thématiques */}
      <ThematicLegend
        hasProgressCounter={visitedPersonasCount > 0 && totalClusters > 0}
      />

      {/* Compteur de personas visitées - affiché si au moins 1 cluster visité */}
      {visitedPersonasCount > 0 && totalClusters > 0 && (
        <VisitedPersonasCounter>
          {`${visitedPersonasCount}/${totalClusters} personas visited (${completionPercentage}%)`}
        </VisitedPersonasCounter>
      )}

      {/* Composants d'interface utilisateur */}
      <AudioStatus />
      {/* <Subtitles /> */}
      <TextPanel />
      <InteractionPrompt />

      <HUDOverlay>
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
            animation: "pulse 4s infinite ease-in-out",
            "@keyframes pulse": {
              "0%": { opacity: 0.7 },
              "50%": { opacity: 0.9 },
              "100%": { opacity: 0.7 },
            },
            filter: "drop-shadow(0 0 5px rgba(76, 175, 80, 0.5))",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* SVG du HUD */}
            {/* <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "absolute",
                top: 0,
                left: 0,
              }}
              dangerouslySetInnerHTML={{ __html: svgContent || "" }}
            /> */}

            {/* Carré de vitesse avec masque SVG */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "20px",
                height: "20px",
              }}
            >
              {/* 
                Structure du SVG :
                - Un masque qui crée l'effet de bordure creuse
                - Un contour statique pour la visibilité de base
                - Un rectangle masqué qui se remplit selon la vitesse
                - Une croix centrale pour le point de mire
              */}
              <svg width="20" height="20" viewBox="0 0 20 20">
                <defs>
                  <mask id="borderMask">
                    {/* Rectangle blanc extérieur - définit la zone visible maximale */}
                    <rect width="20" height="20" fill="white" />
                    {/* Rectangle noir intérieur - crée le "creux" */}
                    <rect x="2" y="2" width="16" height="16" fill="black" />
                  </mask>
                </defs>

                {/* Contour statique - toujours visible */}
                <rect
                  width="20"
                  height="20"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.5)"
                  strokeWidth="1"
                />

                {/* Rectangle masqué qui se remplit selon la vitesse */}
                <rect
                  width="20"
                  height={20 * Math.min(currentSpeed / MAX_SPEED, 1)}
                  y={20 - 20 * Math.min(currentSpeed / MAX_SPEED, 1)}
                  fill="rgba(255, 255, 255, 0.2)"
                  mask="url(#borderMask)"
                  style={{
                    transition: "height 0.15s ease-out, y 0.15s ease-out",
                  }}
                />

                {/* Croix centrale */}
                <g stroke="rgba(255, 255, 255, 0.8)" strokeWidth="0.5">
                  {/* Ligne horizontale */}
                  <line x1="6" y1="10" x2="14" y2="10" />
                  {/* Ligne verticale */}
                  <line x1="10" y1="6" x2="10" y2="14" />
                </g>
              </svg>
            </div>
          </div>
        </Box>
      </HUDOverlay>
    </>
  );
};

export default HUD;
