import React, {
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import * as THREE from "three";
import OptimizedNode from "./Node/OptimizedNode";
import OptimizedLink from "./Link/OptimizedLink";
import useNearestCluster from "./hooks/useNearestCluster";
import useGameStore from "../store";
import BoundingBoxDebug from "./debug/BoundingBoxDebug";
import { Billboard, Text } from "@react-three/drei";
import {
  preloadCommonGeometries,
  preloadCommonMaterials,
  clearCaches,
} from "./cache";
import { calculateClusterCentroids } from "./utils";

// Composant pour afficher un graphe avec des nœuds et des liens
// Utilise un système de détection de cluster proche pour améliorer l'affichage
const Graph = forwardRef(({ graphData, debugMode = false }, ref) => {
  // Référence du groupe pour manipuler la position globale
  const groupRef = useRef();

  // Récupérer l'ID du cluster actif depuis le store
  const activeClusterId = useGameStore((state) => state.activeClusterId);

  // Créer une Map pour accéder rapidement aux nœuds par ID
  const nodeMap = useMemo(() => {
    if (!graphData?.nodes) return new Map();

    return new Map(graphData.nodes.map((node) => [node.id, node]));
  }, [graphData?.nodes]);

  // Utiliser le hook pour détecter le cluster le plus proche
  // Paramètres ajustés pour une détection immédiate sans délai
  const nearestClusterOptions = {
    debug: debugMode, // Activer/désactiver les logs de débogage
    boundingBoxExpansion: 20, // Expansion des boîtes englobantes (en %)
  };

  useNearestCluster(graphData?.nodes, nearestClusterOptions);

  // Calculer les centroïdes des clusters
  const { centroids, clusterNames } = useMemo(() => {
    if (!graphData?.nodes) return { centroids: {}, clusterNames: {} };
    return calculateClusterCentroids(graphData.nodes, true);
  }, [graphData?.nodes]);

  // Exposer des méthodes via la référence
  useImperativeHandle(
    ref,
    () => ({
      // Méthode pour récupérer les positions des nœuds
      getNodesPositions: () => {
        if (!graphData?.nodes) return [];

        return graphData.nodes.map((node) => ({
          ...node,
          x: node.x || 0,
          y: node.y || 0,
          z: node.z || 0,
        }));
      },
    }),
    [graphData]
  );

  // Précharger les géométries et matériaux pour éviter les saccades lors des premiers affichages
  useEffect(() => {
    // Précharger les géométries et matériaux communs
    preloadCommonGeometries();
    preloadCommonMaterials();

    // Nettoyage lors du démontage du composant
    return () => {
      // Nettoyer les caches lors du démontage pour éviter les fuites mémoire
      clearCaches();
    };
  }, []);

  // Vérifier si un cluster est actif
  const hasActiveCluster = activeClusterId !== null;

  // Préparer tous les nœuds en mode simple (sauf ceux du cluster actif)
  const filteredNodesSimple = useMemo(() => {
    if (!graphData?.nodes) return [];

    return graphData.nodes
      .filter((node) => {
        // Si aucun cluster actif, afficher tous les nœuds
        if (!hasActiveCluster) return true;
        // Si un cluster est actif, n'afficher que les nœuds qui ne font pas partie de ce cluster
        return (
          node.cluster === undefined ||
          String(node.cluster) !== String(activeClusterId)
        );
      })
      .map((node) => <OptimizedNode key={node.id} node={node} mode="simple" />);
  }, [graphData?.nodes, hasActiveCluster, activeClusterId]);

  // Préparer tous les liens en mode simple
  const allLinksSimple = useMemo(() => {
    if (!graphData?.links || !nodeMap.size) return [];

    return graphData.links
      .map((link, index) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (!sourceNode || !targetNode) return null;

        return (
          <OptimizedLink
            key={`${sourceId}-${targetId}-${index}`}
            sourceNode={sourceNode}
            targetNode={targetNode}
            mode="simple"
          />
        );
      })
      .filter(Boolean);
  }, [graphData?.links, nodeMap]);

  // Préparer uniquement les nœuds du cluster actif en mode avancé
  const activeClusterNodes = useMemo(() => {
    if (!graphData?.nodes || !hasActiveCluster) return [];

    return graphData.nodes
      .filter(
        (node) =>
          node.cluster !== undefined &&
          String(node.cluster) === String(activeClusterId)
      )
      .map((node) => (
        <OptimizedNode
          key={`advanced-${node.id}`}
          node={node}
          mode="advanced"
        />
      ));
  }, [graphData?.nodes, activeClusterId, hasActiveCluster]);

  // Préparer uniquement les liens du cluster actif en mode avancé
  const activeClusterLinks = useMemo(() => {
    if (!graphData?.links || !nodeMap.size || !hasActiveCluster) return [];

    return graphData.links
      .map((link, index) => {
        const sourceId =
          typeof link.source === "object" ? link.source.id : link.source;
        const targetId =
          typeof link.target === "object" ? link.target.id : link.target;

        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);

        if (!sourceNode || !targetNode) return null;

        // Vérifier si les deux nœuds font partie du cluster actif
        if (
          sourceNode.cluster !== undefined &&
          targetNode.cluster !== undefined &&
          String(sourceNode.cluster) === String(activeClusterId) &&
          String(targetNode.cluster) === String(activeClusterId)
        ) {
          return (
            <OptimizedLink
              key={`advanced-${sourceId}-${targetId}-${index}`}
              sourceNode={sourceNode}
              targetNode={targetNode}
              mode="advanced"
            />
          );
        }

        return null;
      })
      .filter(Boolean);
  }, [graphData?.links, nodeMap, activeClusterId, hasActiveCluster]);

  // Créer les étiquettes pour les centroïdes de cluster
  const clusterLabels = useMemo(() => {
    // Ne pas afficher les étiquettes si un cluster est actif
    if (hasActiveCluster || !centroids) return [];

    return Object.keys(centroids).map((clusterId) => {
      const centroid = centroids[clusterId];
      const clusterName = centroid.name || `Cluster ${clusterId}`;

      return (
        <group
          key={`cluster-label-${clusterId}`}
          position={[centroid.x, centroid.y, centroid.z]}
        >
          <Billboard position={[0, 15, 0]}>
            <Text
              fontSize={8}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={1}
              outlineColor="#000000"
            >
              {clusterName}
            </Text>
          </Billboard>
        </group>
      );
    });
  }, [centroids, hasActiveCluster]);

  // Journal de débogage pour le mode debug
  useEffect(() => {
    if (debugMode) {
      console.log("Graph component en mode debug");
      console.log("Nombre de nœuds:", graphData?.nodes?.length || 0);
      console.log("Nombre de liens:", graphData?.links?.length || 0);
      console.log("Cluster actif:", activeClusterId);
      console.log("Tous les nœuds (simple):", filteredNodesSimple.length);
      console.log("Tous les liens (simple):", allLinksSimple.length);
      console.log(
        "Nœuds du cluster actif (advanced):",
        activeClusterNodes.length
      );
      console.log(
        "Liens du cluster actif (advanced):",
        activeClusterLinks.length
      );
    }
  }, [
    debugMode,
    graphData,
    activeClusterId,
    filteredNodesSimple,
    allLinksSimple,
    activeClusterNodes,
    activeClusterLinks,
  ]);

  return (
    <group ref={groupRef}>
      {/* Premier rendu : tous les éléments en mode simple (sauf ceux du cluster actif) */}
      <group>
        {/* Liens simples */}
        {allLinksSimple}

        {/* Nœuds simples (filtrés) */}
        {filteredNodesSimple}

        {/* Ajouter les étiquettes des centroïdes de cluster */}
        {clusterLabels}
      </group>

      {/* Second rendu : éléments du cluster actif en mode avancé (seulement si un cluster est actif) */}
      {hasActiveCluster && (
        <group>
          {/* Liens avancés */}
          {activeClusterLinks}

          {/* Nœuds avancés */}
          {activeClusterNodes}
        </group>
      )}

      {/* Afficher les boîtes englobantes en mode debug */}
      {debugMode && (
        <BoundingBoxDebug
          nodes={graphData?.nodes}
          show={true}
          boundingBoxExpansion={nearestClusterOptions.boundingBoxExpansion}
        />
      )}

      {/* Lumière ambiante pour éclairer la scène */}
      <ambientLight intensity={0.5} />
    </group>
  );
});

export default Graph;
