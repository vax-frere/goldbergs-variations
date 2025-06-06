import React, {
  useEffect,
  useState,
  memo,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../../../hooks/useAssets";
import CustomText from "../../../../components/CustomText";
import {
  calculateClusterCentroids,
  calculateClusterBoundingBoxes,
} from "./utils/utils";
import useCollisionStore, {
  CollisionLayers,
} from "../../../../services/CollisionService";
import useGameStore, { useHoveredCluster } from "../../../../store";
import { useInputs } from "../../../../components/AdvancedCameraController/inputManager";
import { useInteractionText } from "../../../../components/AdvancedCameraController/CameraIndicators";
import {
  THEMATIC_COLORS,
  getDarkerColor,
  getVisitedNodeColor,
} from "../../../../constants/thematicColors";
import Node from "./components/Node";
import Link from "./components/Link";
import textContentService from "../../../../services/TextContentService";
import { useVisitedClustersForGraph } from "../../../../store";

// Cache global pour les matériaux
const materialCache = new Map();

/**
 * Fonction utilitaire pour créer et cacher les matériaux
 */
const getMaterial = (
  type,
  color = "#ffffff",
  isVisited = false,
  opacity = 1
) => {
  const visitedSuffix = isVisited ? "_visited" : "";
  const key = `${type}_${color}_${opacity}${visitedSuffix}`;

  if (!materialCache.has(key)) {
    let material;
    const finalColor = isVisited ? getVisitedNodeColor(color) : color;

    switch (type) {
      case "node":
        material = new THREE.MeshBasicMaterial({
          color: finalColor,
          transparent: isVisited,
          opacity: isVisited ? 0.4 : 1,
        });
        break;
      case "line":
        material = new THREE.LineBasicMaterial({
          color: finalColor,
          transparent: true,
          opacity: isVisited ? 0.4 : opacity,
          linewidth: 2,
        });
        break;
      default:
        material = new THREE.MeshBasicMaterial({ color: finalColor });
    }

    materialCache.set(key, material);
  }

  return materialCache.get(key);
};

/**
 * Fonction pour nettoyer le cache des matériaux
 */
const clearMaterialCache = () => {
  materialCache.forEach((material) => {
    if (material && material.dispose) {
      material.dispose();
    }
  });
  materialCache.clear();
};
/**
 * Composant simple pour afficher un graphe avec des sphères et des lignes
 * Charge les données du fichier final_spatialized_graph.data.json
 */
const Graph = memo(() => {
  const [graphData, setGraphData] = useState(null);
  const labelRefs = useRef(new Map());
  const assets = useAssets({ autoInit: false });
  const { scene, camera } = useThree();

  // Références pour les géométries partagées
  const geometriesRef = useRef({});

  // Accéder aux entrées unifiées (clavier et manette)
  const inputs = useInputs();
  const prevInteract = useRef(false);

  // Déplacer les appels de hooks au niveau supérieur
  const setHoveredClusterFromStore = useGameStore(
    (state) => state.setHoveredCluster
  );
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const setActiveLevel = useGameStore((state) => state.setActiveLevel);

  // Mémoriser les fonctions qui utilisent les valeurs du store
  const setHoveredCluster = useMemo(
    () => (cluster) => setHoveredClusterFromStore(cluster),
    [setHoveredClusterFromStore]
  );

  const clusterNamesRef = useRef({});
  const clusterSlugsRef = useRef({}); // Référence aux slugs pour tous les clusters

  // Référence au service de collision
  const registerClusterBoxes = useCollisionStore(
    (state) => state.registerClusterBoxes
  );
  const unregisterClusterBoxes = useCollisionStore(
    (state) => state.unregisterClusterBoxes
  );
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);

  // Fonction pour notifier un composant spécifique qu'il est actif/inactif
  const notifyClusterActivity = (clusterId, isActive) => {
    const labelComponent = labelRefs.current.get(clusterId);
    if (labelComponent && labelComponent.updateActivity) {
      labelComponent.updateActivity(isActive);
    }
  };

  // Vérifier à chaque frame si l'action interact est déclenchée et un cluster est survolé
  useFrame(() => {
    // Détecter si l'action interact vient d'être déclenchée (front montant)
    const interactTriggered = inputs.interact && !prevInteract.current;
    prevInteract.current = inputs.interact;

    // Si l'action interact vient d'être déclenchée et qu'un cluster est survolé
    if (interactTriggered && hoveredCluster) {
      console.log("[DEBUG] Activating cluster");
      console.log("[DEBUG] Hovered cluster (nodeId):", hoveredCluster);

      // Avec le nouveau modèle, hoveredCluster contient le nodeId du cluster master
      // On peut directement l'utiliser comme identifiant du cluster
      const clusterData = {
        id: hoveredCluster, // Le nodeId sert d'identifiant unique
        type: "cluster",
        name: hoveredCluster, // On peut utiliser le nodeId comme nom temporaire
      };

      console.log("[DEBUG] Cluster data to activate:", clusterData);

      // Activer le niveau cluster avancé avec les données du cluster
      setActiveLevel(clusterData);
    }
  });

  // Charger les données du graphe depuis l'asset manager
  useEffect(() => {
    if (!assets.isReady) return;

    const spatializedGraph = assets.getData("graph");
    if (spatializedGraph) {
      console.log("Graph rendered");
      setGraphData(spatializedGraph);
    } else {
      console.error("Impossible de charger les données du graphe");
    }
  }, [assets.isReady, assets.getData]);

  // Initialiser les géométries partagées
  useEffect(() => {
    if (!assets.isReady) return;

    // Créer les géométries
    geometriesRef.current.node = new THREE.SphereGeometry(2.5, 8, 8);
    geometriesRef.current.line = new THREE.BufferGeometry();

    // Nettoyage
    return () => {
      // Disposer les géométries
      Object.values(geometriesRef.current).forEach((geometry) => {
        if (geometry && geometry.dispose) {
          geometry.dispose();
        }
      });
      geometriesRef.current = {};
    };
  }, [assets.isReady]);

  // Construire le graphe une fois les données chargées
  const nodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes || [];
  }, [graphData]);

  // Construire les liens une fois les données chargées
  const edges = useMemo(() => {
    if (!graphData) return [];
    return (graphData.links || []).map((link) => {
      const geometry = new THREE.BufferGeometry();
      return {
        ...link,
        geometry,
      };
    });
  }, [graphData]);

  // Calculer les centroïdes des clusters et récupérer leurs noms
  const { centroids, clusterNames, clusterSlugs } = useMemo(() => {
    if (!nodes || !nodes.length)
      return { centroids: {}, clusterNames: {}, clusterSlugs: {} };

    // Utiliser la fonction de utils.js pour calculer les centroïdes et noms des clusters
    return calculateClusterCentroids(nodes, true);
  }, [nodes]);

  // Calculer les boîtes englobantes pour chaque cluster
  const {
    boundingBoxes: clusterBoundingBoxes,
    clusterSlugs: boundingBoxSlugs,
  } = useMemo(() => {
    if (!nodes || !nodes.length) return { boundingBoxes: {}, clusterSlugs: {} };

    // Utiliser la fonction existante pour calculer les boîtes englobantes
    const result = calculateClusterBoundingBoxes(nodes, true);

    // Ajouter une expansion à chaque boîte pour faciliter la collision
    const EXPANSION_SIZE = 30; // Taille d'expansion en unités 3D

    Object.keys(result.boundingBoxes).forEach((clusterId) => {
      const box = result.boundingBoxes[clusterId];

      // Étendre les limites de la boîte
      box.min.x -= EXPANSION_SIZE;
      box.min.y -= EXPANSION_SIZE;
      box.min.z -= EXPANSION_SIZE;

      box.max.x += EXPANSION_SIZE;
      box.max.y += EXPANSION_SIZE;
      box.max.z += EXPANSION_SIZE;

      // Mettre à jour les dimensions
      box.size = {
        x: box.max.x - box.min.x,
        y: box.max.y - box.min.y,
        z: box.max.z - box.min.z,
      };
    });

    return result;
  }, [nodes]);

  // Créer un map des nœuds pour accéder rapidement par ID
  const nodeMap = useMemo(() => {
    const map = new Map();
    if (nodes && nodes.length) {
      nodes.forEach((node) => {
        map.set(node.id, node);
      });
    }
    return map;
  }, [nodes]);

  // Créer un map des groupes thématiques par cluster
  const clusterThematicGroups = useMemo(() => {
    const groups = {};
    if (nodes && nodes.length) {
      nodes.forEach((node) => {
        if (node.clusterId !== undefined && node.clusterThematicGroup) {
          if (!groups[node.clusterId] || node.isClusterMaster) {
            groups[node.clusterId] = node.clusterThematicGroup;
          }
        }
      });
    }
    console.log("Groupes thématiques par cluster:", groups);
    return groups;
  }, [nodes]);

  // Enregistrer les boîtes englobantes auprès du service de collision
  useEffect(() => {
    if (!clusterBoundingBoxes || Object.keys(clusterBoundingBoxes).length === 0)
      return;

    // Ajouter les données nécessaires à chaque boîte
    const boxesWithData = {};
    Object.entries(clusterBoundingBoxes).forEach(([id, box]) => {
      boxesWithData[id] = {
        ...box,
        data: {
          id,
          name: clusterNames[id],
          slug: clusterSlugs[id],
        },
      };
    });

    // Enregistrer les boîtes auprès du service de collision
    registerClusterBoxes(boxesWithData);

    // Configurer le masque de collision pour les clusters ET les nodes (composants interactifs)
    setCollisionMask(
      CollisionLayers.CLUSTERS |
        CollisionLayers.NODES |
        CollisionLayers.INTERACTIVE
    );

    return () => {
      // Nettoyer les boîtes de collision
      unregisterClusterBoxes();
      setCollisionMask(CollisionLayers.ALL);
    };
  }, [
    clusterBoundingBoxes,
    registerClusterBoxes,
    unregisterClusterBoxes,
    setCollisionMask,
    clusterNames,
    clusterSlugs,
  ]);

  // Mettre à jour les références aux noms et slugs de clusters pour le hover
  useEffect(() => {
    clusterNamesRef.current = clusterNames;
    clusterSlugsRef.current = clusterSlugs;
  }, [clusterNames, clusterSlugs]);

  // Nettoyage complet lors du démontage
  useEffect(() => {
    return () => {
      // Vider les références
      labelRefs.current.clear();
      clusterNamesRef.current = {};
      clusterSlugsRef.current = {};

      // Nettoyer les géométries des liens
      if (edges) {
        edges.forEach((edge) => {
          if (edge.geometry) {
            edge.geometry.dispose();
          }
        });
      }

      // Nettoyer hoveredCluster dans le store
      setHoveredCluster(null);

      // Réinitialiser les autres références
      prevInteract.current = false;

      // Nettoyer le cache des matériaux
      clearMaterialCache();
    };
  }, [edges, setHoveredCluster]);

  // Gérer les effets visuels quand un cluster est survolé
  useEffect(() => {
    if (hoveredCluster) {
      // Avec le nouveau modèle, hoveredCluster est directement le nodeId du cluster master
      // On peut l'utiliser directement pour les effets visuels

      // Utiliser le TextContentService avec le nodeId
      textContentService.show({
        type: "detailed",
        id: hoveredCluster, // hoveredCluster est le nodeId du cluster master
      });
    } else {
      // CORRECTION: Ne pas cacher le contenu si on est en transition
      // Cela évite le flickering lors du clic
      const isTransitioning = useGameStore.getState().isTransitioning;
      if (!isTransitioning) {
        // Cacher le contenu du TextPanel seulement si on n'est pas en transition
        textContentService.hide();
      }
    }
  }, [hoveredCluster]);

  // Vérifier si un nœud a été visité
  const isNodeVisited = useGameStore((state) => state.isNodeVisited);
  const isClusterVisited = useGameStore((state) => state.isClusterVisited);

  // NOUVEAU: Forcer le re-render quand les clusters visités changent
  const visitedClustersCount = useVisitedClustersForGraph();

  // Vérifier si un cluster a été visité (basé sur le clusterId)
  const isClusterVisitedByNode = useCallback(
    (node) => {
      if (!node || node.clusterId === undefined) return false;
      return isClusterVisited(node.clusterId);
    },
    [isClusterVisited, visitedClustersCount]
  );

  // Vérifier si un lien doit être grisé (les deux clusters sont visités)
  const isLinkVisited = useCallback(
    (source, target) => {
      return isClusterVisitedByNode(source) && isClusterVisitedByNode(target);
    },
    [isClusterVisitedByNode, visitedClustersCount]
  );

  // Si les données ne sont pas encore chargées
  if (!graphData) return null;

  return (
    <group>
      {/* Nœuds du graphe représentés par des sphères */}
      {nodes.map((node, index) => (
        <Node
          key={`node-${index}`}
          node={node}
          geometriesRef={geometriesRef}
          materialsRef={getMaterial}
          isClusterVisited={isClusterVisitedByNode}
        />
      ))}

      {/* Liens du graphe représentés par des lignes */}
      {edges.map((edge, index) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);

        if (!source || !target) {
          return null;
        }

        return (
          <Link
            key={`edge-${index}`}
            edge={edge}
            source={source}
            target={target}
            materialsRef={getMaterial}
            isLinkVisited={isLinkVisited}
          />
        );
      })}

      {/* Noms des clusters aux centroïdes */}
      {Object.entries(centroids).map(([clusterId, centroid]) => {
        const thematicGroup = clusterThematicGroups[clusterId];
        return (
          <ClusterLabel
            key={`cluster-${clusterId}`}
            id={clusterId}
            centroid={centroid}
            name={clusterNames[clusterId] || clusterId}
            thematicGroup={thematicGroup}
            isVisited={isClusterVisitedByNode(
              nodes.find((n) => n.clusterId === clusterId)
            )}
          />
        );
      })}
    </group>
  );
});

/**
 * Composant pour afficher le nom d'un cluster
 * Utilise un contexte pour ne mettre à jour le composant
 * que lorsque son état actif change, sans re-rendre le graphe complet
 */
const ClusterLabel = memo(
  ({ id, centroid, name, isVisited, thematicGroup }) => {
    const hoveredCluster = useHoveredCluster();
    const isActive = hoveredCluster === id;

    // Position du texte avec un décalage vers le haut
    const position = useMemo(
      () => [centroid.x || 0, (centroid.y || 0) + 30, centroid.z || 0],
      [centroid]
    );

    // Déterminer la couleur du texte en fonction du groupe thématique
    const textColor = useMemo(() => {
      if (isVisited) {
        if (THEMATIC_COLORS[thematicGroup]) {
          return getDarkerColor(THEMATIC_COLORS[thematicGroup]);
        }
        return "#666666";
      }

      const color = THEMATIC_COLORS[thematicGroup];
      return color || "#ffffff";
    }, [isVisited, thematicGroup]);

    return (
      <group>
        <CustomText
          text={name}
          position={position}
          size={15}
          minSize={6}
          maxSize={20}
          dynamicSize={true}
          color={textColor}
          reverseOpacity={true}
          maxDistance={900}
          minDistance={300}
          outline={true}
          outlineWidth={2.0}
          outlineColor="#000000"
        />
      </group>
    );
  }
);

export default Graph;
