import React, { memo, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import useAssets from "../../hooks/useAssets";
import useGameStore, { useActiveLevel } from "../../store";
import { findClusterIdBySlug } from "../World/components/Graph/utils/utils";
import AdvancedNode from "./components/AdvancedNode";
import AdvancedLink from "./components/AdvancedLink";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";

/**
 * Composant AdvancedCluster - Affiche un cluster en mode avancé
 * Charge uniquement les nœuds et liens du cluster sélectionné
 */
const AdvancedCluster = memo(() => {
  const activeLevel = useActiveLevel();
  const assets = useAssets({ autoInit: false });
  const returnToWorld = useGameStore((state) => state.returnToWorld);
  const setActiveNodeData = useGameStore((state) => state.setActiveNodeData);
  const activeNodeData = useGameStore((state) => state.activeNodeData);
  const registerNodeBoxes = useCollisionStore(
    (state) => state.registerNodeBoxes
  );
  const findContainingNode = useCollisionStore(
    (state) => state.findContainingNode
  );
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);
  const camera = useThree((state) => state.camera);

  // Données du cluster à afficher
  const clusterData = useMemo(() => {
    if (!activeLevel || !assets.isReady) {
      console.log("AdvancedCluster: Pas de activeLevel ou assets pas prêts", {
        activeLevel,
        assetsReady: assets.isReady,
      });
      return null;
    }

    // Récupérer les données complètes du graphe
    const graphData = assets.getData("graph");
    if (!graphData) {
      console.log("AdvancedCluster: Pas de données de graphe");
      return null;
    }

    // Identifier le cluster à afficher en utilisant l'utilitaire
    const clusterInfo = findClusterIdBySlug(
      graphData.nodes,
      activeLevel.id // On utilise le slug stocké dans id
    );

    if (!clusterInfo) {
      console.log("AdvancedCluster: Impossible de trouver le cluster", {
        activeLevel,
      });
      return null;
    }

    // Filtrer les liens internes au cluster
    const nodeIds = new Set(clusterInfo.clusterNodes.map((node) => node.id));
    const clusterLinks = graphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return {
      clusterId: clusterInfo.clusterId,
      nodes: clusterInfo.clusterNodes,
      links: clusterLinks,
      mainNode: clusterInfo.mainNode,
    };
  }, [activeLevel, assets.isReady, assets.getData]);

  // Créer un map des nœuds pour accéder rapidement par ID
  const nodeMap = useMemo(() => {
    if (!clusterData) return new Map();

    const map = new Map();
    clusterData.nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [clusterData]);

  // Enregistrer les boîtes de collision des nœuds
  useEffect(() => {
    if (!clusterData?.nodes) return;

    const nodeBoxes = {};
    clusterData.nodes.forEach((node) => {
      const box = useCollisionStore
        .getState()
        .createBoundingBox(
          { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
          20,
          CollisionLayers.NODES
        );
      box.data = node;
      nodeBoxes[node.id] = box;
    });

    registerNodeBoxes(nodeBoxes);
    setCollisionMask(CollisionLayers.NODES);

    return () => {
      registerNodeBoxes({});
      setCollisionMask(CollisionLayers.CLUSTERS);
    };
  }, [clusterData, registerNodeBoxes, setCollisionMask]);

  // Détecter les collisions avec les nœuds
  useEffect(() => {
    const checkCollisions = () => {
      if (!camera) return;

      // Calculer le point de détection devant la caméra
      calculateDetectionPoint(camera);

      // Trouver le nœud en collision
      const node = findContainingNode();
      if (node) {
        const nodeSlug = node.data.slug || String(node.data.id);

        // Mettre à jour le store avec le slug pour le hover et l'effet
        setActiveNodeData(nodeSlug);

        // Marquer le nœud comme visité en passant les données complètes
        const state = useGameStore.getState();
        const alreadyVisited = state.visitedNodes.some(
          (visitedNode) => visitedNode.slug === nodeSlug
        );

        if (!alreadyVisited) {
          useGameStore.setState((state) => ({
            visitedNodes: [
              ...state.visitedNodes,
              {
                slug: nodeSlug,
                name: node.data.name,
                data: node.data,
                visitedAt: new Date().toISOString(),
              },
            ],
          }));
        }

        // Mettre à jour la couleur de la boîte de debug
        const boxes = useCollisionStore.getState().boundingBoxRefs.nodeBoxes;
        Object.values(boxes).forEach((box) => {
          if (box.data) {
            const isActive =
              (box.data.slug || String(box.data.id)) === nodeSlug;
            box.debugColor = isActive ? [1, 0, 0] : [0, 1, 0]; // Rouge si actif, vert sinon
          }
        });
      } else {
        setActiveNodeData(null);
        // Réinitialiser toutes les couleurs en vert
        const boxes = useCollisionStore.getState().boundingBoxRefs.nodeBoxes;
        Object.values(boxes).forEach((box) => {
          box.debugColor = [0, 1, 0];
        });
      }
    };

    // Vérifier les collisions à chaque frame
    const interval = setInterval(checkCollisions, 100);

    return () => {
      clearInterval(interval);
      setActiveNodeData(null);
    };
  }, [camera, calculateDetectionPoint, findContainingNode, setActiveNodeData]);

  // Gérer la touche Échap pour retourner au monde
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        returnToWorld();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [returnToWorld]);

  // Si pas de données, ne rien afficher
  if (!clusterData || !assets.isReady) {
    return null;
  }

  return (
    <group>
      {/* Éclairage spécifique pour le mode avancé */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />

      {/* Liens du cluster */}
      {clusterData.links.map((link, index) => {
        const source = nodeMap.get(
          typeof link.source === "object" ? link.source.id : link.source
        );
        const target = nodeMap.get(
          typeof link.target === "object" ? link.target.id : link.target
        );

        if (!source || !target) return null;

        return (
          <AdvancedLink
            key={`advanced-link-${index}`}
            sourceNode={source}
            targetNode={target}
            isDirect={link.isDirect !== false}
          />
        );
      })}

      {/* Nœuds du cluster */}
      {clusterData.nodes.map((node) => (
        <AdvancedNode
          key={`advanced-node-${node.id}`}
          node={node}
          isActive={activeNodeData === (node.slug || String(node.id))}
        />
      ))}
    </group>
  );
});

export default AdvancedCluster;
