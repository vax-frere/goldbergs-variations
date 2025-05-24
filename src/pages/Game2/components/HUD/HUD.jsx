import React, { useState, useEffect, useRef, useMemo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { useActiveLevel, useGameStore } from "../../store";
import useAssets from "../../hooks/useAssets";
import AudioStatus from "./components/AudioStatus";
import TextPanel from "./components/TextPanel";
import Subtitles from "./components/Subtitles";

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

// Composant pour le nom du niveau actif en haut à gauche
const ActiveLevelName = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "20px",
  left: "20px",
  fontSize: "24px",
  fontFamily: "monospace",
  color: "#ffffff",
  textShadow: "0 0 5px rgba(255, 255, 255, 0.7)",
  zIndex: 1000,
  pointerEvents: "none",
  whiteSpace: "nowrap",
  fontWeight: "bold",
}));

// Style plus discret pour le compteur de personas
const VisitedPersonasCounter = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: "25px",
  right: "25px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 0.4)",
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
  const visitedPersonasCount = useGameStore(
    (state) => state.visitedPersonasCount
  );
  const assets = useAssets({ autoInit: false });

  // Calculer le nombre total de clusters à partir des données du graphe
  const totalClusters = useMemo(() => {
    if (!assets.isReady) return 0;
    const graphData = assets.getData("graph");
    if (!graphData?.nodes) return 0;

    // Créer un Set des clusterSlugs uniques
    const uniqueClusters = new Set(
      graphData.nodes
        .filter((node) => node.clusterSlug)
        .map((node) => node.clusterSlug)
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
      // Récupérer la position de la caméra depuis la variable globale
      if (window.__cameraPosition) {
        setCurrentPosition(window.__cameraPosition);
      }

      // Récupérer la vitesse de la caméra
      if (window.__cameraSpeed !== undefined) {
        setCurrentSpeed(window.__cameraSpeed);
      }

      // Mettre à jour la barre de vitesse HTML si elle existe
      if (speedBarFillRef.current) {
        // Calculer le pourcentage de remplissage en fonction de la vitesse
        const fillPercentage = Math.min(currentSpeed / MAX_SPEED, 1) * 100;

        // Mettre à jour la largeur de la barre de remplissage
        speedBarFillRef.current.style.width = `${fillPercentage}%`;
      }
    };

    // Mettre à jour les données toutes les 100ms
    const dataInterval = setInterval(updateHUDData, 100);

    return () => {
      clearInterval(dataInterval);
    };
  }, [currentSpeed]);

  // Format de l'affichage des coordonnées
  const positionText = `x ${currentPosition.x.toFixed(
    0
  )} y ${currentPosition.y.toFixed(0)} z ${currentPosition.z.toFixed(0)}`;

  return (
    <>
      {/* Affichage du nom du niveau actif en haut à gauche */}
      {activeLevel && (
        <ActiveLevelName>
          {activeLevel.name ||
            (activeLevel.type === "cluster"
              ? `Cluster: ${activeLevel.id
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}`
              : `${activeLevel.type || "Level"}: ${activeLevel.id}`)}
        </ActiveLevelName>
      )}

      {/* Compteur de personas visitées - affiché si au moins 1 cluster visité */}
      {visitedPersonasCount > 0 && totalClusters > 0 && (
        <VisitedPersonasCounter>
          {`${visitedPersonasCount}/${totalClusters} personas visitées (${completionPercentage}%)`}
        </VisitedPersonasCounter>
      )}

      {/* Composants d'interface utilisateur */}
      <AudioStatus />
      <Subtitles />
      <TextPanel />

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
            <div
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
            />

            {/* Affichage des coordonnées */}
            <div
              style={{
                position: "absolute",
                top: "200px",
                left: "90px",
                fontSize: "8px",
                fontFamily: "monospace",
                color: "white",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {positionText}
            </div>

            {/* Barre de vitesse HTML plus fluide */}
            <div
              ref={speedBarRef}
              style={{
                position: "absolute",
                left: "222px",
                top: "203px",
                width: "30px",
                height: "2px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                ref={speedBarFillRef}
                style={{
                  height: "100%",
                  width: `${Math.min(currentSpeed / MAX_SPEED, 1) * 100}%`,
                  backgroundColor: "#ffffff",
                  borderRadius: "2px",
                  transition:
                    "width 0.15s ease-out, background-color 0.25s ease",
                }}
              />
            </div>
          </div>
        </Box>
      </HUDOverlay>
    </>
  );
};

export default HUD;
