import {
  useEffect,
  useRef,
  useMemo,
  createContext,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import R3fForceGraph from "r3f-forcegraph";
import {
  createNodeObject,
  createLinkObject,
  updateLinkPosition,
} from "./utils/nodeUtils";
import { Html, Text } from "@react-three/drei";
import * as d3 from "d3";
import { COLORS } from "./Node/Node";
import * as THREE from "three";

// Contexte pour l'affichage d'informations UI (simplifié)
export const ForceGraphContext = createContext(null);

// Tableau de couleurs pour les clusters (mémorisé)
const clusterColors = [
  "#e41a1c", // rouge
  "#377eb8", // bleu
  "#4daf4a", // vert
  "#984ea3", // violet
  "#ff7f00", // orange
  "#ffff33", // jaune
  "#a65628", // marron
  "#f781bf", // rose
  "#999999", // gris
  "#66c2a5", // turquoise
];

// Composant pour afficher le nom d'un cluster
const ClusterLabel = ({ position, text, color }) => {
  if (!position || !text) return null;

  return (
    <Text
      position={[position.x, position.y + 30, position.z]}
      fontSize={50}
      color={color || "#ffffff"}
      anchorX="center"
      anchorY="middle"
      material-transparent={true}
      material-depthWrite={false}
      outlineWidth={2}
      outlineColor="black"
    >
      {text}
    </Text>
  );
};

// Composant principal du graphe 3D - simplifié sans gestion de caméra ni nœuds
const ForceGraphComponent = forwardRef((props, ref) => {
  const { graphData = { nodes: [], links: [] } } = props;
  const isLoadingGraph = !graphData?.nodes?.length;
  const graphError = props.graphError || null;
  const fgRef = useRef();

  // Pré-calcul d'une map d'ID de nœuds pour un accès plus rapide
  const nodeMap = useMemo(() => {
    if (!graphData?.nodes) return {};
    return graphData.nodes.reduce((map, node) => {
      map[node.id] = node;
      return map;
    }, {});
  }, [graphData]);

  // Calculer les centroïdes et trouver les personas principaux de chaque cluster
  const clusterInfo = useMemo(() => {
    if (!graphData?.nodes?.length) return { centroids: {}, mainPersonas: {} };

    const clusters = {};
    const centroids = {};
    const mainPersonas = {};

    // Passe unique pour identifier les clusters et calculer les centroïdes
    graphData.nodes.forEach((node) => {
      if (node.cluster === undefined) return;

      // Initialiser les structures pour ce cluster si nécessaire
      if (!clusters[node.cluster]) {
        clusters[node.cluster] = [];
        centroids[node.cluster] = { x: 0, y: 0, z: 0, count: 0 };
      }

      // Ajouter le nœud à son cluster
      clusters[node.cluster].push(node);

      // Identifier les personnages principaux
      if (node.type === "character" && !node.id.includes("_") && node.name) {
        mainPersonas[node.cluster] = node.name;
      }

      // Ajouter à la somme pour le calcul du centroïde (si coordonnées définies)
      if (
        node.x !== undefined &&
        node.y !== undefined &&
        node.z !== undefined
      ) {
        centroids[node.cluster].x += node.x;
        centroids[node.cluster].y += node.y;
        centroids[node.cluster].z += node.z;
        centroids[node.cluster].count++;
      }
    });

    // Normaliser les centroïdes
    Object.keys(centroids).forEach((cluster) => {
      const c = centroids[cluster];
      if (c.count > 0) {
        c.x /= c.count;
        c.y /= c.count;
        c.z /= c.count;
      }
    });

    return { centroids, mainPersonas };
  }, [graphData]);

  // Exposer des méthodes via la référence
  useImperativeHandle(
    ref,
    () => ({
      // Méthode pour récupérer les positions des noeuds
      getNodesPositions: () => {
        if (!fgRef.current || !graphData?.nodes) {
          console.warn(
            "Impossible de récupérer les positions des noeuds - références manquantes"
          );
          return [];
        }

        try {
          const graphInstance = fgRef.current;
          const nodeObjects = graphInstance.__nodeObjects || {};
          const d3NodeMap = graphInstance.graphData?.nodes
            ? new Map(graphInstance.graphData.nodes.map((n) => [n.id, n]))
            : new Map();

          // Fusionner les données avec les positions actuelles
          return graphData.nodes.map((node) => {
            const nodeObj = nodeObjects[node.id];
            const clusterProps = {
              cluster: node.cluster,
              offsetX: node.offsetX,
              offsetY: node.offsetY,
              offsetZ: node.offsetZ,
            };

            // Priorité aux positions du graphe 3D
            if (nodeObj?.position) {
              return {
                ...node,
                ...clusterProps,
                x: nodeObj.position.x,
                y: nodeObj.position.y,
                z: nodeObj.position.z,
              };
            }

            // Sinon utiliser les positions du graphe D3
            const d3Node = d3NodeMap.get(node.id);
            if (d3Node) {
              return {
                ...node,
                ...clusterProps,
                x: d3Node.x || node.x || 0,
                y: d3Node.y || node.y || 0,
                z: d3Node.z || node.z || 0,
              };
            }

            // En dernier recours, utiliser les données du nœud
            return {
              ...node,
              ...clusterProps,
              x: node.x || node.coordinates?.x || 0,
              y: node.y || node.coordinates?.y || 0,
              z: node.z || node.coordinates?.z || 0,
            };
          });
        } catch (error) {
          console.error("Erreur lors de la récupération des positions:", error);
          return graphData.nodes.map((node) => ({
            ...node,
            cluster: node.cluster,
            offsetX: node.offsetX,
            offsetY: node.offsetY,
            offsetZ: node.offsetZ,
            x: node.x || node.coordinates?.x || 0,
            y: node.y || node.coordinates?.y || 0,
            z: node.z || node.coordinates?.z || 0,
          }));
        }
      },

      // Indique si le graphe est stabilisé
      isStabilized: () => !fgRef.current?.d3Force("simulation")?.alpha(),

      // Force la stabilisation du graphe
      stabilize: () => {
        const simulation = fgRef.current?.d3Force("simulation");
        if (simulation) {
          simulation.alpha(0);
          simulation.stop();
        }
      },
    }),
    [graphData]
  );

  // Déterminer quelles données afficher
  const displayData = graphError || !graphData ? null : graphData;

  // Vérifier si les données sont vraiment disponibles et complètes
  const dataIsReady =
    !isLoadingGraph &&
    displayData?.nodes?.length > 0 &&
    displayData?.links?.length > 0;

  // Pré-calcul des connexions pour chaque nœud (mémorisé)
  const nodeConnections = useMemo(() => {
    if (!displayData?.nodes || !displayData?.links) return {};

    const connections = Object.fromEntries(
      displayData.nodes.map((node) => [node.id, []])
    );

    // Remplir les connexions basées sur les liens
    displayData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      if (connections[sourceId]) connections[sourceId].push(targetId);
      if (connections[targetId]) connections[targetId].push(sourceId);
    });

    return connections;
  }, [displayData]);

  useEffect(() => {
    if (!dataIsReady) return;

    // Animation avec throttling pour améliorer la performance
    let animationFrameId;
    let lastFrameTime = 0;
    const frameInterval = 33; // 30 FPS environ

    const animate = (currentTime) => {
      if (currentTime - lastFrameTime > frameInterval && fgRef.current) {
        fgRef.current.tickFrame();
        lastFrameTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dataIsReady]);

  // Afficher l'état de chargement/erreur si nécessaire
  if (!dataIsReady) return <Html center />;
  if (graphError) {
    return (
      <Html center>
        <div style={{ color: "red", fontSize: "18px", textAlign: "center" }}>
          Erreur de chargement: {graphError}
        </div>
      </Html>
    );
  }

  // Fonctions pour le rendu du graphe
  const getNodeColor = (node) => {
    if (node.color) return node.color;
    if (node.isJoshua) return COLORS.joshua;
    if (node.type === "platform" || node.type === "source")
      return COLORS.source;
    if (node.type === "character" && node.thematicGroup) {
      return (
        COLORS.thematicGroups[node.thematicGroup] ||
        COLORS.thematicGroups.default
      );
    }
    if (node.cluster !== undefined)
      return clusterColors[node.cluster % clusterColors.length];
    return COLORS.character;
  };

  const getLinkColor = (link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const sourceNode = nodeMap[sourceId];

    if (!sourceNode) return "#aaaaaa";
    if (sourceNode.type === "character" && sourceNode.thematicGroup) {
      return (
        COLORS.thematicGroups[sourceNode.thematicGroup] ||
        COLORS.thematicGroups.default
      );
    }
    if (sourceNode.cluster !== undefined) {
      return clusterColors[sourceNode.cluster % clusterColors.length];
    }
    return "#aaaaaa";
  };

  const calculateNodePosition = (node) => {
    if (node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      return false; // Position déjà définie
    }

    if (
      node.offsetX === undefined ||
      node.offsetY === undefined ||
      node.offsetZ === undefined
    ) {
      return false; // Pas d'offsets définis
    }

    // Position initiale basée sur les offsets du cluster
    node.x = node.offsetX;
    node.y = node.offsetY;
    node.z = node.offsetZ;

    // Ajustement selon le type
    if (node.type === "platform") {
      node.y += 20;
    } else if (node.type === "character") {
      if (node.id.includes("_")) {
        // Personnage secondaire
        const angle = Math.random() * Math.PI * 2;
        const radius = 30 + Math.random() * 20;
        node.x += Math.cos(angle) * radius;
        node.z += Math.sin(angle) * radius;
      }
    }

    // Perturbation aléatoire réduite
    node.x += (Math.random() - 0.5) * 5;
    node.y += (Math.random() - 0.5) * 5;
    node.z += (Math.random() - 0.5) * 5;

    return false; // Indiquer que D3 peut continuer à calculer
  };

  return (
    <ForceGraphContext.Provider value={{}}>
      <R3fForceGraph
        ref={fgRef}
        graphData={displayData}
        nodeLabel="name"
        linkOpacity={0.3}
        showNavInfo={false}
        cooldownTicks={1000}
        cooldownTime={5000}
        backgroundColor="#000000"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.5}
        d3AlphaMin={0.001}
        forceEngine="d3"
        dagMode={null}
        nodeRelSize={25}
        linkDirectionalParticles={0}
        nodeVal={(node) => node.value || 1}
        nodeColor={getNodeColor}
        linkColor={getLinkColor}
        nodeAutoColorBy="cluster"
        nodePositionUpdate={calculateNodePosition}
        nodeThreeObject={(node) => {
          // Pour les nœuds qui sont des représentants principaux de cluster
          if (
            node.type === "character" &&
            !node.id.includes("_") &&
            node.name &&
            node.cluster !== undefined
          ) {
            // Créer un groupe pour contenir à la fois le nœud et son label
            const group = new THREE.Group();

            // Ajouter le nœud standard
            const nodeObj = createNodeObject(node);
            group.add(nodeObj);

            // Importer Text de drei (déjà importé en haut du fichier)
            const textColor =
              clusterColors[node.cluster % clusterColors.length];

            // Créer le label du cluster
            const labelMesh = new Text();
            labelMesh.text = node.name;
            labelMesh.fontSize = 50;
            labelMesh.color = textColor;
            labelMesh.anchorX = "center";
            labelMesh.anchorY = "middle";
            labelMesh.position.set(0, 50, 0); // Positionner au-dessus du nœud
            labelMesh.material.transparent = true;
            labelMesh.material.depthWrite = false;
            labelMesh.outlineWidth = 2;
            labelMesh.outlineColor = "black";

            group.add(labelMesh);
            return group;
          }

          // Pour les nœuds standards
          return createNodeObject(node);
        }}
        linkThreeObject={createLinkObject}
        linkPositionUpdate={(linkObj, { start, end }, link) => {
          updateLinkPosition(linkObj, start, end);
          return true;
        }}
      />
    </ForceGraphContext.Provider>
  );
});

export default ForceGraphComponent;
