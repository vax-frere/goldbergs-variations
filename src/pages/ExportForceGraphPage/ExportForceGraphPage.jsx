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

// Style pour les statistiques du graphe
const GraphStats = styled(Paper)(({ theme }) => ({
  position: "absolute",
  bottom: "20px",
  right: "20px",
  padding: "10px 15px",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  color: "#fff",
  zIndex: 100,
  minWidth: "200px",
  fontSize: "12px",
  borderRadius: "4px",
  fontFamily: "monospace",
}));

const ExportForceGraphPage = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphStats, setGraphStats] = useState(null);
  const graphInstanceRef = useRef(null);
  const orbitControlsRef = useRef(null);

  // Fonction pour calculer les statistiques du graphe
  const calculateGraphStats = useCallback((data) => {
    if (!data || !data.nodes || !data.links) return null;

    const nodes = data.nodes;
    const links = data.links;
    const buildStats = data.stats || {};

    // Compter les différents types de nœuds
    const personaNodes = nodes.filter((n) => n.type === "persona_character");
    const externalNodes = nodes.filter((n) => n.type === "external_character");
    const platformNodes = nodes.filter((n) => n.type === "platform");

    // Analyser les personnages uniques (par originalId/nodeId)
    const uniquePersonas = new Set();
    const uniqueExternals = new Set();

    personaNodes.forEach((node) => {
      if (node.originalId || node.nodeId) {
        uniquePersonas.add(node.originalId || node.nodeId);
      }
    });

    externalNodes.forEach((node) => {
      if (node.originalId || node.nodeId) {
        uniqueExternals.add(node.originalId || node.nodeId);
      }
    });

    return {
      "🔗 Nœuds": nodes.length,
      "📎 Liens": links.length,
      "👤 Personas": `${personaNodes.length} (${uniquePersonas.size} uniques)`,
      "🧑 Externes": `${externalNodes.length} (${uniqueExternals.size} uniques)`,
      "📱 Plateformes": platformNodes.length,
      "🏘️ Clusters": new Set(nodes.map((n) => n.clusterId)).size,
      "❌ Orphelins supprimés": buildStats.orphanLinksRemoved || 0,
      "🗑️ Doublons supprimés": buildStats.duplicateCharactersRemoved || 0,
      "🎯 Cibles non trouvées": buildStats.targetsNotFound || 0,
      "🧹 Clusters supprimés": buildStats.clustersRemoved || 0,
      "🔥 Nœuds supprimés": buildStats.nodesRemovedFinal || 0,
      "💥 Liens supprimés": buildStats.linksRemovedFinal || 0,
    };
  }, []);

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
      const cleanNodes = nodesWithPositions
        .filter((node) => "clusterThematicGroup" in node)
        .map((node) => {
          // Extraire le nodeId de manière robuste
          let nodeId = node.originalId || node.nodeId;

          // Si pas de nodeId trouvé, essayer d'extraire depuis l'ID
          if (!nodeId && node.id) {
            // Pour les IDs comme "24-129-100-84_0", extraire la partie avant "_"
            const idParts = node.id.split("_");
            if (idParts.length > 1) {
              nodeId = idParts[0];
            } else {
              nodeId = node.id;
            }
          }

          // Fallback sur le nom si aucun nodeId trouvé
          if (!nodeId) {
            nodeId = node.name;
          }

          // Extraire uniquement les propriétés dont nous avons besoin
          return {
            id: node.id,
            name: node.name,
            type: node.type,
            clusterId: node.clusterId,
            x: node.x,
            y: node.y,
            z: node.z,
            color: node.color,
            nodeId: nodeId, // Utiliser le nodeId extrait de manière robuste
            isClusterMaster:
              node.isClusterOrigin || node.isClusterMaster || false,
            // Propriétés supplémentaires demandées
            displayName: node.displayName,
            aliases: node.aliases,
            fictionOrImpersonation: node.fictionOrImpersonation,
            thematic: node.thematic,
            nodeThematicGroup: node.nodeThematicGroup,
            clusterThematicGroup: node.clusterThematicGroup,
            career: node.career,
            genre: node.genre,
            polarisation: node.polarisation,
            cercle: node.cercle,
            politicalSphere: node.politicalSphere,
          };
        });

      // Nettoyer les liens pour n'inclure que les propriétés essentielles
      const cleanLinks = links
        .filter((link) => {
          // Trouver les nœuds source et target
          const sourceNode = nodesWithPositions.find(
            (n) =>
              n.id ===
              (typeof link.source === "object" ? link.source.id : link.source)
          );
          const targetNode = nodesWithPositions.find(
            (n) =>
              n.id ===
              (typeof link.target === "object" ? link.target.id : link.target)
          );

          // Vérifier que les deux nœuds existent et ont la clé clusterThematicGroup
          return (
            sourceNode &&
            targetNode &&
            "clusterThematicGroup" in sourceNode &&
            "clusterThematicGroup" in targetNode
          );
        })
        .map((link) => {
          // Trouver les nœuds source et target pour récupérer leurs clusterThematicGroup
          const sourceNode = nodesWithPositions.find(
            (n) =>
              n.id ===
              (typeof link.source === "object" ? link.source.id : link.source)
          );
          const targetNode = nodesWithPositions.find(
            (n) =>
              n.id ===
              (typeof link.target === "object" ? link.target.id : link.target)
          );

          // Assurer que source et target sont des chaînes d'ID et non des objets
          const source =
            typeof link.source === "object" ? link.source.id : link.source;
          const target =
            typeof link.target === "object" ? link.target.id : link.target;

          // Récupérer les données originales du lien si elles existent
          const originalData = link.originalLinkData || {};

          // Garantir que chaque propriété est correctement préservée
          // en privilégiant les données originales
          const exportedLink = {
            // Propriétés de base
            source: source,
            target: target,
            color: link.color,
            // Ajouter les clusterThematicGroup des nœuds source et target
            sourceClusterThematicGroup: sourceNode.clusterThematicGroup,
            targetClusterThematicGroup: targetNode.clusterThematicGroup,
            clusterThematicGroup: sourceNode.clusterThematicGroup, // On prend arbitrairement celui de la source

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
        setGraphStats(calculateGraphStats(data));
        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [calculateGraphStats]);

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

        {/* Statistiques du graphe */}
        {graphStats && !isLoading && !error && (
          <GraphStats>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#4fc3f7",
              }}
            >
              📊 Statistiques du Graphe
            </div>
            {Object.entries(graphStats).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </GraphStats>
        )}
      </div>
    </PageTransition>
  );
};

export default ExportForceGraphPage;
