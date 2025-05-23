import { useState, useEffect, useCallback, useMemo } from "react";
import { Box, Typography, Paper, Fade } from "@mui/material";
import { styled } from "@mui/material/styles";
import HudSvg from "./HudSvg";
import useGameStore from "../store";
import { groupNodesByCluster } from "../Graph/utils";

const MessageContainer = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  color: "white",
  padding: "10px 20px",
  borderRadius: "5px",
  textAlign: "center",
  maxWidth: "80%",
  backdropFilter: "blur(5px)",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  zIndex: 1000,
  pointerEvents: "none", // Pour permettre les clics à travers le message
}));

const VisitedPersonasCounter = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: "20px",
  right: "20px",
  color: "rgba(255, 255, 255, 0.7)",
  zIndex: 1000,
  fontFamily: "'Courier New', monospace",
  fontSize: "12px",
  letterSpacing: "0.5px",
  textTransform: "lowercase",
  opacity: 0.7,
  pointerEvents: "none",
}));

const HUDOverlay = styled(Box)(({ theme }) => ({
  position: "fixed", // Fixed pour être relatif à la fenêtre du navigateur
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "400px", // Légèrement plus grand que le SVG original
  height: "400px", // Légèrement plus grand que le SVG original
  zIndex: 999,
  pointerEvents: "none", // Pour permettre les clics à travers l'overlay
  opacity: 0.9, // Légère transparence pour ne pas obstruer la vue
}));

/**
 * Composant HUD (Heads-Up Display) pour afficher des informations en overlay
 * @param {Object} props - Propriétés du composant
 */
const HUD = () => {
  // État pour les données du HUD
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0, z: 0 });
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [distanceToCenter, setDistanceToCenter] = useState(0);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [totalClusters, setTotalClusters] = useState(0);

  // Récupérer le nombre de personas visitées depuis le store
  const visitedPersonasCount = useGameStore(
    (state) => state.visitedPersonasCount
  );
  const visitedClusters = useGameStore((state) => state.visitedClusters);

  // Calculer le pourcentage de complétion
  const completionPercentage = useMemo(() => {
    if (!totalClusters) return 0;
    return Math.round((visitedPersonasCount / totalClusters) * 100);
  }, [visitedPersonasCount, totalClusters]);

  // Effet pour déterminer le nombre total de clusters disponibles
  useEffect(() => {
    // Fonction pour obtenir le nombre total de clusters depuis les données du graphe
    const fetchTotalClusters = async () => {
      try {
        // Charger les données du graphe à partir du fichier JSON
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/spatialized_graph.data.json`
        );
        if (!response.ok) {
          throw new Error("Failed to load graph data");
        }

        const data = await response.json();

        if (data && data.nodes && data.nodes.length) {
          // Grouper les nœuds par cluster pour déterminer le nombre de clusters uniques
          const clusters = groupNodesByCluster(data.nodes);
          // Compter uniquement les clusters qui ont un nœud maître
          const masterClusters = Object.keys(clusters).filter((clusterId) =>
            clusters[clusterId].some((node) => node.isClusterMaster === true)
          );

          setTotalClusters(masterClusters.length);
        }
      } catch (error) {
        console.error("Error determining total clusters:", error);
        // Valeur par défaut si l'analyse échoue
        setTotalClusters(16);
      }
    };

    fetchTotalClusters();
  }, []);

  // Fonction pour afficher un message temporaire
  const showTemporaryMessage = useCallback((text, duration = 3000) => {
    setMessage(text);
    setShowMessage(true);

    // Masquer le message après la durée spécifiée
    setTimeout(() => {
      setShowMessage(false);
    }, duration);
  }, []);

  // Mettre à jour les données du HUD à partir des variables globales
  useEffect(() => {
    const updateHUDData = () => {
      // Récupérer la position de la caméra depuis la variable globale
      if (window.__cameraPosition) {
        setCurrentPosition(window.__cameraPosition);

        // Calculer la distance au centre
        const { x, y, z } = window.__cameraPosition;
        const distance = Math.sqrt(x * x + y * y + z * z);
        setDistanceToCenter(distance);

        // Afficher un message d'avertissement si on s'approche de la limite
        if (distance > 2300 && !window.__warningShown) {
          showTemporaryMessage(
            "Attention: Vous approchez de la limite de la zone de navigation",
            5000
          );
          window.__warningShown = true;

          // Réinitialiser l'avertissement après un certain temps
          setTimeout(() => {
            window.__warningShown = false;
          }, 10000);
        }
      }

      // Récupérer la vitesse de la caméra
      if (window.__cameraSpeed !== undefined) {
        setCurrentSpeed(window.__cameraSpeed);
      }
    };

    // Mettre à jour les données toutes les 100ms
    const dataInterval = setInterval(updateHUDData, 100);

    // Mettre à jour le temps toutes les secondes
    const timeInterval = setInterval(() => {
      setCurrentTime((prev) => prev + 1);
    }, 1000);

    // Exposer la fonction showTemporaryMessage globalement
    window.__showHUDMessage = showTemporaryMessage;

    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
      delete window.__showHUDMessage;
    };
  }, [showTemporaryMessage]);

  // Formater le temps en minutes:secondes
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <>
      {/* Overlay SVG du HUD - Toujours visible */}
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
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <HudSvg position={currentPosition} speed={currentSpeed} />
          </div>
        </Box>
      </HUDOverlay>

      {/* Conteneur de message temporaire */}
      <Fade in={showMessage}>
        <MessageContainer>
          <Typography variant="body1">{message}</Typography>
        </MessageContainer>
      </Fade>

      {/* Compteur de personas visitées */}
      {visitedPersonasCount > 0 && (
        <VisitedPersonasCounter>
          <Typography variant="body2">
            {`${visitedPersonasCount}/${totalClusters} personas visited (${completionPercentage}%)`}
          </Typography>
        </VisitedPersonasCounter>
      )}
    </>
  );
};

export default HUD;
