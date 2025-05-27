import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import MovableGraph from "./components/MovableGraph";
import GridReferences from "../Game/components/GridReferences";
import "./MovablePage.css";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
} from "../Game/components/AdvancedCameraController/navigationConstants";
import { AdvancedCameraController } from "../Game/components/AdvancedCameraController/AdvancedCameraController";
import {
  WORLD_INTERACTIVE_OBJECTS,
  WORLD_NON_INTERACTIVE_OBJECTS,
} from "../Game/scenes/WorldLevel/constants/worldObjects";
import SvgPath from "../Game/components/SvgPath";
import VibSvgPath from "../Game/components/VibSvgPath";

// Fonction utilitaire pour télécharger un fichier JSON
const downloadJSON = (content, fileName) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Composant pour afficher les objets SVG du monde
const WorldObjects = () => {
  return (
    <group>
      {WORLD_INTERACTIVE_OBJECTS.map((obj) => {
        const SvgComponent = obj.useVibration ? VibSvgPath : SvgPath;
        const svgPath = `${obj.svgName}.svg`;

        return (
          <group key={obj.id} position={obj.position}>
            <SvgComponent
              svgPath={svgPath}
              size={obj.size}
              color="white"
              lineWidth={2}
              isBillboard={true}
              vibrationIntensity={obj.vibrationIntensity}
              vibrationSpeed={obj.vibrationSpeed}
              onError={(err) => {
                console.error(
                  `[MovablePage] Erreur de chargement pour ${svgPath}:`,
                  err
                );
              }}
            />
          </group>
        );
      })}
    </group>
  );
};

// Composant pour afficher les objets non interactifs (étoiles fixes)
const NonInteractiveObjects = () => {
  return (
    <group>
      {WORLD_NON_INTERACTIVE_OBJECTS.map((obj) => (
        <VibSvgPath
          key={obj.id}
          svgPath={`${obj.component}.svg`}
          position={obj.position}
          size={obj.size}
          color="white"
          lineWidth={1}
          isBillboard={false}
          vibrationIntensity={2}
          vibrationSpeed={1.5}
          onError={(err) => {
            console.error(
              `[MovablePage] Erreur de chargement pour ${obj.component}:`,
              err
            );
          }}
        />
      ))}
    </group>
  );
};

const MovablePage = () => {
  const [graphData, setGraphData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphInstanceRef = useRef(null);
  // Nouvel état pour suivre le mode cluster
  const [isClusterMode, setIsClusterMode] = useState(true);

  // Ajout des états pour les paramètres de la grille
  const [showGrid, setShowGrid] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(20);
  const [maxRotation, setMaxRotation] = useState(180);
  const [gridOpacity, setGridOpacity] = useState(0.4);

  // Écouteur pour le mode cluster
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === "g") {
        setIsClusterMode((prevMode) => !prevMode);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Fonction pour charger les données JSON
  const loadJsonData = async () => {
    setIsLoading(true);
    try {
      // Charger les données du graphe - utiliser le fichier spatialized_graph.data.json
      const graphResponse = await fetch("/data/spatialized_graph.data.json");
      const graphJsonData = await graphResponse.json();

      // Validation basique des données du graphe
      if (graphJsonData && graphJsonData.nodes && graphJsonData.links) {
        setGraphData(graphJsonData);
        console.log("Données du graphe chargées:", graphJsonData);
        console.log(
          `Nœuds: ${graphJsonData.nodes.length}, Liens: ${graphJsonData.links.length}`
        );
      } else {
        console.error("Format de données du graphe invalide:", graphJsonData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données JSON:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les données au démarrage
  useEffect(() => {
    loadJsonData();
  }, []);

  // Fonction pour exporter les données spatialisées
  const exportSpatializedData = () => {
    console.log("Début de l'exportation...");
    console.log("État actuel des données:");
    console.log("- graphData:", graphData);
    console.log("- graphInstance:", graphInstanceRef.current);

    // Vérifier si les données sont disponibles
    const hasGraphData =
      graphData && graphData.nodes && graphData.nodes.length > 0;

    if (!hasGraphData) {
      console.warn("Aucune donnée de graphe à exporter");
      alert(
        "Attention: Aucune donnée de graphe disponible. Les données exportées seront vides."
      );
    }

    // Procéder à l'exportation même si les données sont vides (créer des fichiers vides)
    try {
      console.log("Démarrage de l'export...");

      // Création de l'export des nœuds et liens
      // ------------------------------------------------
      let nodesWithPositions = [];
      let links = [];

      // 1. Tenter d'utiliser la référence du graphe si disponible
      const useGraphRef =
        graphInstanceRef.current &&
        typeof graphInstanceRef.current.getNodesPositions === "function";

      if (useGraphRef) {
        console.log("Utilisation de la référence du graphe pour l'exportation");
        try {
          // Récupérer les positions des noeuds directement depuis le graphe
          nodesWithPositions = graphInstanceRef.current.getNodesPositions();
          console.log(
            `Récupéré ${
              nodesWithPositions?.length || 0
            } noeuds depuis la référence du graphe`
          );
        } catch (err) {
          console.error("Erreur lors de la récupération des noeuds:", err);
          nodesWithPositions = [];
        }
      }

      // 2. Si les noeuds sont vides, utiliser la méthode de secours avec les données du contexte
      if (!nodesWithPositions || nodesWithPositions.length === 0) {
        console.log("Méthode de secours pour les noeuds");

        if (hasGraphData) {
          nodesWithPositions = graphData.nodes.map((node) => {
            // Créer un objet qui contient toutes les propriétés du nœud avec le nouveau format
            return {
              id: node.id,
              name: node.name || "",
              type: node.type || "",
              clusterId: node.clusterId || "",
              nodeId: node.nodeId || node.id,
              isClusterMaster: node.isClusterMaster || false,
              nodeThematicGroup: node.nodeThematicGroup || "",
              clusterThematicGroup: node.clusterThematicGroup || "",
              x: node.x ?? 0,
              y: node.y ?? 0,
              z: node.z ?? 0,
              // Conserver toutes les propriétés originales
              ...node,
            };
          });
          console.log(
            `Récupéré ${nodesWithPositions.length} noeuds depuis graphData`
          );
        }
      }

      // 3. Préparer les liens depuis graphData avec le nouveau format
      if (graphData && graphData.links && graphData.links.length > 0) {
        links = graphData.links.map((link) => {
          // Extraction des IDs de source et cible
          const source =
            typeof link.source === "object" ? link.source.id : link.source;
          const target =
            typeof link.target === "object" ? link.target.id : link.target;

          return {
            source: source,
            target: target,
            sourceClusterThematicGroup: link.sourceClusterThematicGroup || "",
            targetClusterThematicGroup: link.targetClusterThematicGroup || "",
            clusterThematicGroup: link.clusterThematicGroup || "",
            type: link.type || "",
            isDirect: link.isDirect || "",
            relationType: link.relationType || "",
            // Propriétés optionnelles
            ...(link.mediaImpact && { mediaImpact: link.mediaImpact }),
            ...(link.virality && { virality: link.virality }),
            ...(link.mediaCoverage && { mediaCoverage: link.mediaCoverage }),
            ...(link.linkType && { linkType: link.linkType }),
            ...(link.platforms && { platforms: link.platforms }),
            // Conserver toutes les propriétés originales
            ...link,
          };
        });
        console.log(`Récupéré ${links.length} liens depuis graphData`);
      } else {
        console.log("Aucun lien disponible dans graphData");
      }

      // 4. Exporter le fichier (noeuds et liens)
      const spatializedNodesAndLinks = {
        nodes: nodesWithPositions || [],
        links: links || [],
      };

      console.log(
        `Export des nœuds: ${nodesWithPositions.length}, liens: ${links.length}`
      );
      downloadJSON(spatializedNodesAndLinks, "spatialized_graph.data.json");
    } catch (error) {
      console.error("Erreur pendant l'exportation:", error);
      alert(`Erreur pendant l'exportation: ${error.message}`);
    }
  };

  return (
    <div className="movable-page">
      {isLoading ? (
        <div className="loading">Loading data...</div>
      ) : (
        <>
          <div className="controls">
            <button onClick={exportSpatializedData}>
              Export spatialized data
            </button>
            <div className="mode-indicator">
              Mode: {isClusterMode ? "Cluster (g)" : "Normal"}
              {isClusterMode && (
                <div className="cluster-help">
                  Click on a node to select its entire cluster
                </div>
              )}
            </div>
          </div>

          <div className="canvas-container">
            <Canvas
              camera={{
                position: [0, -300, BASE_CAMERA_DISTANCE * 4],
                fov: CAMERA_FOV,
                near: 0.1,
                far: 1000000,
              }}
            >
              <AdvancedCameraController />
              {graphData && (
                <MovableGraph
                  ref={graphInstanceRef}
                  data={graphData}
                  isClusterMode={isClusterMode}
                />
              )}
              <WorldObjects />
              <NonInteractiveObjects />
              {showGrid && (
                <GridReferences
                  rotationInterval={rotationInterval}
                  maxRotation={maxRotation}
                  opacity={gridOpacity}
                />
              )}
              <Stats />
            </Canvas>
          </div>
        </>
      )}
    </div>
  );
};

export default MovablePage;
