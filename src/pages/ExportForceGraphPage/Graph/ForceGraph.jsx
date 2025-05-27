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
import { Html, Text } from "@react-three/drei";
import * as d3 from "d3";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import {
  createDistrictsWithPositions,
  SPHERE_PRESETS,
} from "./utils/spherePositioning";

// Configuration pour les logs de debug du graphe
const DEBUG_GRAPH = false;

// Contexte pour l'affichage d'informations UI (simplifié)
export const ForceGraphContext = createContext(null);

// Composant pour afficher les axes helper
const AxesHelper = ({ size = 100 }) => {
  const { scene } = useThree();

  useEffect(() => {
    const axesHelper = new THREE.AxesHelper(size);
    scene.add(axesHelper);

    return () => {
      scene.remove(axesHelper);
    };
  }, [scene, size]);

  return null;
};

// Définition des districts avec leurs couleurs
const THEMATIC_COLORS = {
  Libertarians: "#c0392b",
  Antisystem: "#f39c12",
  Conservatives: "#d35400",
  Nationalists: "#27ae60",
  Religious: "#fff8ee",
  Culture: "#3498db",
  "Social justice": "#44adff",
};

const DISTRICT_DEFINITIONS = [
  { text: "Libertarians", color: THEMATIC_COLORS["Libertarians"] },
  { text: "Antisystem", color: THEMATIC_COLORS["Antisystem"] },
  { text: "Conservatives", color: THEMATIC_COLORS["Conservatives"] },
  { text: "Nationalists", color: THEMATIC_COLORS["Nationalists"] },
  { text: "Religious", color: THEMATIC_COLORS["Religious"] },
  { text: "Culture", color: THEMATIC_COLORS["Culture"] },
  { text: "Social justice", color: THEMATIC_COLORS["Social justice"] },
];

// Tableau des districts avec leurs couleurs - répartis équidistants sur une sphère
const DISTRICTS = createDistrictsWithPositions(
  DISTRICT_DEFINITIONS,
  SPHERE_PRESETS.compact
);

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

// Composant principal du graphe 3D - simplifié
const ForceGraphComponent = forwardRef((props, ref) => {
  const { graphData = { nodes: [], links: [] } } = props;
  const isLoadingGraph = !graphData?.nodes?.length;
  const graphError = props.graphError || null;
  const fgRef = useRef();

  // Déterminer quelles données afficher
  const displayData = graphError || !graphData ? null : graphData;

  // Pré-positionner les nœuds selon leur district avant la simulation
  const preprocessedData = useMemo(() => {
    if (!displayData?.nodes?.length) return displayData;

    if (DEBUG_GRAPH)
      console.log(
        `🔗 Données d'entrée: ${displayData.nodes.length} nœuds, ${
          displayData.links?.length || 0
        } liens`
      );

    // Fonction pour obtenir la position d'un district
    const getDistrictPosition = (clusterThematicGroup) => {
      const district = DISTRICTS.find((d) => d.text === clusterThematicGroup);
      return district ? district.position : [0, 0, 0];
    };

    // Créer une copie des données avec positions pré-calculées
    const preprocessedNodes = displayData.nodes.map((node) => {
      // Si le nœud a déjà des positions définies, les garder
      if (
        node.x !== undefined &&
        node.y !== undefined &&
        node.z !== undefined
      ) {
        return node;
      }

      // Sinon, pré-positionner selon le district
      if (node.clusterThematicGroup) {
        const districtPos = getDistrictPosition(node.clusterThematicGroup);

        // Ajouter une dispersion aléatoire autour de la position du district
        const spreadRadius = 50;
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDistance = Math.random() * spreadRadius;
        const randomHeight = (Math.random() - 0.5) * 50;

        return {
          ...node,
          x: districtPos[0] + Math.cos(randomAngle) * randomDistance,
          y: districtPos[1] + randomHeight,
          z: districtPos[2] + Math.sin(randomAngle) * randomDistance,
        };
      }

      // Position par défaut si pas de clusterThematicGroup
      return {
        ...node,
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 200,
      };
    });

    // Normaliser les liens pour s'assurer que source et target sont des IDs de chaînes
    const preprocessedLinks = (displayData.links || []).map((link) => {
      return {
        ...link,
        source: typeof link.source === "object" ? link.source.id : link.source,
        target: typeof link.target === "object" ? link.target.id : link.target,
      };
    });

    const result = {
      ...displayData,
      nodes: preprocessedNodes,
      links: preprocessedLinks,
    };

    if (DEBUG_GRAPH) {
      console.log(
        `🔗 Données préprocessées: ${result.nodes.length} nœuds, ${
          result.links?.length || 0
        } liens`
      );
      if (result.links?.length > 0) {
        console.log(`🔗 Premier lien après normalisation:`, result.links[0]);
      }
    }

    return result;
  }, [displayData]);

  // Exposer des méthodes via la référence
  useImperativeHandle(
    ref,
    () => ({
      // Méthode pour récupérer les positions des noeuds
      getNodesPositions: () => {
        if (!fgRef.current || !preprocessedData?.nodes) {
          if (DEBUG_GRAPH)
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
          return preprocessedData.nodes.map((node) => {
            const nodeObj = nodeObjects[node.id];
            const clusterProps = {
              clusterId: node.clusterId,
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
          return preprocessedData.nodes.map((node) => ({
            ...node,
            clusterId: node.clusterId,
            x: node.x || node.coordinates?.x || 0,
            y: node.y || node.coordinates?.y || 0,
            z: node.z || node.coordinates?.z || 0,
          }));
        }
      },
    }),
    [preprocessedData]
  );

  // Vérifier si les données sont vraiment disponibles et complètes
  const dataIsReady =
    !isLoadingGraph &&
    preprocessedData?.nodes?.length > 0 &&
    preprocessedData?.links?.length > 0;

  // useFrame pour animer le graphe - requis par r3f-forcegraph
  useFrame(() => {
    if (fgRef.current && dataIsReady) {
      fgRef.current.tickFrame();
    }
  });

  // Log pour diagnostiquer les données passées au graphe
  useEffect(() => {
    if (preprocessedData && DEBUG_GRAPH) {
      console.log(
        `📊 Données passées au R3fForceGraph: ${
          preprocessedData.nodes?.length || 0
        } nœuds, ${preprocessedData.links?.length || 0} liens`
      );
      if (preprocessedData.links?.length > 0) {
        console.log(`🔗 Premier lien:`, preprocessedData.links[0]);
      }
    }
  }, [preprocessedData]);

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

  // Fonction pour colorer les nœuds selon leur thématique
  const getNodeColor = (node) => {
    if (
      node.clusterThematicGroup &&
      THEMATIC_COLORS[node.clusterThematicGroup]
    ) {
      return THEMATIC_COLORS[node.clusterThematicGroup];
    }

    // Log pour les nœuds sans clusterThematicGroup
    if (DEBUG_GRAPH) {
      console.warn(
        `Nœud sans clusterThematicGroup: ${node.name} (${node.type})`
      );
    }

    // Couleur par défaut selon le type de nœud
    if (node.type === "persona_character") {
      return "#ff6b6b"; // Rouge pour les personas Joshua
    } else if (node.type === "external_character") {
      return "#74b9ff"; // Bleu pour les autres personnages
    } else if (node.type === "platform") {
      return "#fdcb6e"; // Jaune pour les plateformes
    }

    return "#ffffff"; // Blanc par défaut
  };

  // Fonction pour colorer les liens selon leur thématique
  const getLinkColor = (link) => {
    // Trouver les nœuds source et target
    const sourceNode = preprocessedData?.nodes?.find(
      (n) =>
        n.id ===
        (typeof link.source === "object" ? link.source.id : link.source)
    );
    const targetNode = preprocessedData?.nodes?.find(
      (n) =>
        n.id ===
        (typeof link.target === "object" ? link.target.id : link.target)
    );

    // Si les deux nœuds ont le même clusterThematicGroup, utiliser la couleur de ce groupe
    if (sourceNode?.clusterThematicGroup && targetNode?.clusterThematicGroup) {
      if (sourceNode.clusterThematicGroup === targetNode.clusterThematicGroup) {
        // Même groupe thématique : utiliser la couleur du groupe
        return THEMATIC_COLORS[sourceNode.clusterThematicGroup] || "#aaaaaa";
      } else {
        // Groupes différents : utiliser une couleur neutre mais visible
        return "#888888";
      }
    }

    // Si un seul nœud a un clusterThematicGroup, utiliser sa couleur
    if (sourceNode?.clusterThematicGroup) {
      return THEMATIC_COLORS[sourceNode.clusterThematicGroup] || "#aaaaaa";
    }
    if (targetNode?.clusterThematicGroup) {
      return THEMATIC_COLORS[targetNode.clusterThematicGroup] || "#aaaaaa";
    }

    // Par défaut, gris clair
    return "#aaaaaa";
  };

  return (
    <ForceGraphContext.Provider value={{}}>
      {/* Éclairage de la scène */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {/* Axes helper pour visualiser les axes X, Y, Z */}
      <AxesHelper size={200} />

      {/* Labels des districts */}
      {DISTRICTS.map((district, index) => (
        <ClusterLabel
          key={`district-${index}`}
          position={{
            x: district.position[0],
            y: district.position[1],
            z: district.position[2],
          }}
          text={district.text}
          color={district.color}
        />
      ))}

      <R3fForceGraph
        ref={fgRef}
        graphData={preprocessedData}
        nodeLabel="name"
        linkOpacity={0.6}
        linkWidth={2}
        showNavInfo={false}
        cooldownTicks={5000}
        cooldownTime={3000}
        backgroundColor="#000000"
        // d3AlphaDecay={0.02}
        // d3VelocityDecay={0.5}
        // d3AlphaMin={0.001}
        // forceEngine="d3"
        dagMode={null}
        nodeRelSize={2}
        linkDirectionalParticles={0}
        nodeColor={getNodeColor}
        linkColor={getLinkColor}
      />
    </ForceGraphContext.Provider>
  );
});

export default ForceGraphComponent;
