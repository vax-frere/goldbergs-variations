import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats, OrbitControls } from "@react-three/drei";
import { Button, Paper } from "@mui/material";
import { styled } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";

import ForceGraph from "./Graph/ForceGraph";
import {
  loadGraphData,
  getNodesWithPositions,
} from "./Graph/utils/graphDataUtils";
import PageTransition from "../../components/PageTransition";

// Style pour le bouton d'export
const ExportButton = styled(Button)(({ theme }) => ({
  position: "absolute",
  top: "80px",
  right: "20px",
  zIndex: 100,
  color: "#fff",
  borderColor: "#fff",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
}));

// Style pour les informations d'aide
const HelpText = styled(Paper)(({ theme }) => ({
  position: "absolute",
  bottom: "20px",
  left: "20px",
  padding: "10px 15px",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  color: "#fff",
  zIndex: 100,
  maxWidth: "300px",
  fontSize: "14px",
  borderRadius: "4px",
}));

const ExportForceGraphPage = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const graphInstanceRef = useRef(null);
  const orbitControlsRef = useRef(null);

  // Fonction pour gérer la référence du graphe
  const getGraphRef = useCallback((instance) => {
    if (instance) {
      console.log("Référence du graphe obtenue");
      graphInstanceRef.current = instance;
    }
  }, []);

  // Fonction d'export des données spatialisées
  const handleExportGraph = useCallback(() => {
    if (!graphInstanceRef.current) {
      console.warn("Référence du graphe non disponible");
      return;
    }

    try {
      // Obtenir les positions spatiales actuelles des nœuds
      const nodesWithPositions = graphInstanceRef.current.getNodesPositions();

      if (!nodesWithPositions || nodesWithPositions.length === 0) {
        console.warn("Aucune donnée de nœud à exporter");
        return;
      }

      // Récupérer les liens depuis les données du graphe
      const links = graphData.links || [];

      // Nettoyer les nœuds pour n'inclure que les propriétés essentielles
      const cleanNodes = nodesWithPositions.map((node) => {
        // Extraire uniquement les propriétés dont nous avons besoin
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          cluster: node.cluster,
          x: node.x,
          y: node.y,
          z: node.z,
          value: node.value || node.val,
          color: node.color,
          slug: node.originalId,
          isClusterMaster: node.isClusterOrigin || false, // Utiliser la propriété existante
          // Propriétés supplémentaires demandées
          displayName: node.displayName,
          aliases: node.aliases,
          isJoshua: node.isJoshua,
          fictionOrImpersonation: node.fictionOrImpersonation,
          thematic: node.thematic,
          thematicGroup: node.thematicGroup,
          career: node.career,
          genre: node.genre,
          polarisation: node.polarisation,
          cercle: node.cercle,
          politicalSphere: node.politicalSphere,
        };
      });

      // Nettoyer les liens pour n'inclure que les propriétés essentielles
      const cleanLinks = links.map((link) => {
        // Assurer que source et target sont des chaînes d'ID et non des objets
        const source =
          typeof link.source === "object" ? link.source.id : link.source;
        const target =
          typeof link.target === "object" ? link.target.id : link.target;

        // Récupérer les données originales du lien si elles existent
        const originalData = link.originalLinkData || {};

        // Supprimer les propriétés problématiques du lien actuel
        const cleanLink = {
          // Ne garder que les propriétés essentielles
          value: link.value,
          color: link.color,
          // Autres propriétés non problématiques...
        };

        // Garantir que chaque propriété est correctement préservée
        // en privilégiant les données originales
        const exportedLink = {
          // Propriétés de base
          source: source,
          target: target,
          value: link.value,
          color: link.color,

          // Propriétés importantes - prendre d'abord de originalData, sinon du lien
          type: originalData.type || link.type,
          isDirect: originalData.isDirect || link.isDirect,
          relationType: originalData.relationType || link.relationType,
          mediaImpact: originalData.mediaImpact || link.mediaImpact,
          virality: originalData.virality || link.virality,
          mediaCoverage: originalData.mediaCoverage || link.mediaCoverage,
          linkType: originalData.linkType || link.linkType,
          platforms: originalData.platforms || link.platforms,
        };

        // Ajouter toutes les autres propriétés de originalData qui ne sont pas déjà incluses
        Object.keys(originalData).forEach((key) => {
          if (exportedLink[key] === undefined) {
            exportedLink[key] = originalData[key];
          }
        });

        return exportedLink;
      });

      // Créer l'objet complet à exporter
      const exportData = {
        nodes: cleanNodes,
        links: cleanLinks,
      };

      // Convertir en JSON
      const jsonString = JSON.stringify(exportData, null, 2);

      // Créer le blob pour le téléchargement
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Créer un lien temporaire pour le téléchargement
      const a = document.createElement("a");
      a.href = url;
      a.download = "spatialized_graph.data.json";
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log("Données du graphe exportées avec succès");
    } catch (err) {
      console.error("Erreur lors de l'export des données:", err);
    }
  }, [graphData]);

  // Charger les données du graphe au montage du composant
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await loadGraphData();
        setGraphData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <PageTransition>
      <div
        style={{
          width: "100%",
          height: "calc(100vh - 64px)", // Pour laisser de la place pour la navbar
          position: "relative",
        }}
      >
        {/* Bouton d'export des données */}
        <ExportButton
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportGraph}
          disabled={isLoading || !!error}
        >
          Exporter JSON
        </ExportButton>

        {/* Message d'erreur ou de chargement */}
        {isLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            Chargement du graphe...
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "red",
            }}
          >
            Erreur: {error}
          </div>
        )}

        {/* Canvas pour le graphe 3D */}
        <Canvas
          shadows
          style={{ background: "#000", width: "100%", height: "100%" }}
          camera={{
            position: [0, 0, 2000],
            fov: 45,
            near: 0.1,
            far: 1000000,
          }}
        >
          <ForceGraph ref={getGraphRef} graphData={graphData} />
          {/* Ajout des Controls d'orbite */}
          <OrbitControls
            ref={orbitControlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={100}
            maxDistance={5000}
            dampingFactor={0.25}
            rotateSpeed={0.5}
            zoomSpeed={1.2}
          />
          {/* Ajout des Stats en mode debug */}
          {process.env.NODE_ENV === "development" && <Stats />}
        </Canvas>
      </div>
    </PageTransition>
  );
};

export default ExportForceGraphPage;
