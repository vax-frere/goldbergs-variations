import React, {
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as THREE from "three";
import OptimizedNode from "./Node/OptimizedNode";
import OptimizedLink from "./Link/OptimizedLink";
import useGameStore from "../store";
import BoundingBoxDebug from "./debug/BoundingBoxDebug";
import CollisionDebugRenderer from "./debug/CollisionDebugRenderer";
import { Billboard, Text, Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import useAssets from "../../../hooks/useAssets";
import {
  calculateClusterCentroids,
  calculateClusterBoundingBoxes,
} from "./utils";
import useNodeDetection from "./hooks/useNodeDetection";
import "./effects/NodeHoverEffect";
import { getInputManager } from "../AdvancedCameraController/inputManager";
import useCollisionStore, {
  CollisionLayers,
} from "../services/CollisionService";
import useCollisionDetection from "./hooks/useCollisionDetection";

// Composant pour afficher un graphe avec des nœuds et des liens
// Utilise un système de détection de collision centralisé
const Graph = forwardRef(({ graphData, debugMode = false }, ref) => {
  // Référence du groupe pour manipuler la position globale
  const groupRef = useRef();

  // Utiliser le service d'assets centralisé
  const assets = useAssets();

  // Accéder au service de collision
  const collisionService = useCollisionStore();

  // Référence pour stocker la dernière valeur des boîtes de collision
  const lastClusterBoxesRef = useRef(null);

  // Utiliser le hook de détection de collision centralisé
  const {
    hoveredClusterId,
    activeClusterId,
    activeNodeId,
    registerClusterBoxes,
  } = useCollisionDetection({
    debug: debugMode,
    detectClusters: true,
    detectNodes: true,
    detectInteractiveElements: true,
    enabledLayers: [
      CollisionLayers.CLUSTERS,
      CollisionLayers.NODES,
      CollisionLayers.INTERACTIVE,
    ],
  });

  // Récupérer les informations du store Zustand
  const setActiveCluster = useGameStore((state) => state.setActiveCluster);
  const hoveredClusterName = useGameStore((state) => state.hoveredClusterName);
  const activeNodeName = useGameStore((state) => state.activeNodeName);

  // Référence pour le dernier état du cluster survolé
  const lastHoveredRef = useRef({ id: null, name: null });

  // Créer une Map pour accéder rapidement aux nœuds par ID
  const nodeMap = useMemo(() => {
    if (!graphData?.nodes) return new Map();

    return new Map(graphData.nodes.map((node) => [node.id, node]));
  }, [graphData?.nodes]);

  // Utiliser le hook pour détecter les noeuds quand un cluster est actif
  // Cette ligne est essentielle pour que les noeuds en mode avancé
  // soient détectables par le système de collision
  const { nodeBoundingBoxes } = useNodeDetection(graphData?.nodes, {
    debug: debugMode,
    collisionLayer: CollisionLayers.NODES,
  });

  // Debug: Afficher le nombre de boîtes de nœuds détectées
  useEffect(() => {
    if (debugMode && Object.keys(nodeBoundingBoxes || {}).length > 0) {
      console.log(
        `Graph: Node detection active avec ${
          Object.keys(nodeBoundingBoxes).length
        } boîtes de nœuds`
      );
    }
  }, [debugMode, nodeBoundingBoxes]);

  // Calculer les centroïdes des clusters
  const { centroids, clusterNames } = useMemo(() => {
    if (!graphData?.nodes) return { centroids: {}, clusterNames: {} };
    return calculateClusterCentroids(graphData.nodes, true);
  }, [graphData?.nodes]);

  // Fonction pour vérifier si la touche d'activation est pressée
  const isActivationKeyPressed = useCallback(() => {
    // Utiliser l'InputManager pour vérifier l'état des touches
    const inputManager = getInputManager();

    // Vérifier si la touche T est pressée (clavier) ou bouton X (manette)
    const isKeyboardActivationPressed =
      inputManager.keysPressed["KeyT"] || false;

    // Bouton X de la manette (index 2 dans les gamepads)
    let isGamepadActivationPressed = false;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads[0]) {
      isGamepadActivationPressed = gamepads[0].buttons[2]?.pressed || false;
    }

    return isKeyboardActivationPressed || isGamepadActivationPressed;
  }, []);

  // Gérer l'activation du cluster
  useFrame(() => {
    // Ne rien faire si un cluster est déjà actif
    if (activeClusterId !== null) return;

    // Mettre à jour le dernier cluster survolé
    if (hoveredClusterId !== lastHoveredRef.current.id) {
      lastHoveredRef.current = {
        id: hoveredClusterId,
        name: hoveredClusterName,
      };
    }

    // Vérifier si on peut activer un cluster
    if (
      hoveredClusterId !== null &&
      isActivationKeyPressed() &&
      activeClusterId === null
    ) {
      // Activer le cluster
      setActiveCluster(hoveredClusterId, hoveredClusterName);

      if (debugMode) {
        console.log(
          `Graph: Activation du cluster ${hoveredClusterId} (${hoveredClusterName})`
        );
      }
    }
  });

  // Enregistrer les boîtes englobantes des clusters dans le service de collision
  useEffect(() => {
    // Éviter d'enregistrer si les données ne sont pas prêtes
    if (!graphData?.nodes || !graphData.nodes.length) return;

    // Calculer les boîtes englobantes des clusters
    const { boundingBoxes } = calculateClusterBoundingBoxes(
      graphData.nodes,
      true
    );

    // Ne mettre à jour que si les boîtes ont changé
    if (
      !lastClusterBoxesRef.current ||
      JSON.stringify(lastClusterBoxesRef.current) !==
        JSON.stringify(boundingBoxes)
    ) {
      // Enregistrer dans le service de collision
      registerClusterBoxes(boundingBoxes);

      // Mettre à jour la référence
      lastClusterBoxesRef.current = boundingBoxes;

      if (debugMode) {
        console.log("Graph: Registered cluster collision boxes", boundingBoxes);
      }
    }

    // Nettoyer lors du démontage
    return () => {
      // Les ressources sont nettoyées automatiquement par le service
    };
  }, [graphData?.nodes, registerClusterBoxes, debugMode]);

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

  // Précharger les géométries et matériaux communs
  useEffect(() => {
    if (!assets.isReady) return;

    // Précharger les géométries communes
    assets.createGeometry(
      "sphere-simple",
      () => new THREE.SphereGeometry(3, 8, 8)
    );
    assets.createGeometry(
      "sphere-advanced",
      () => new THREE.SphereGeometry(3, 16, 16)
    );
    assets.createGeometry("plane", () => new THREE.PlaneGeometry(1, 1));

    // Précharger les matériaux communs
    assets.createMaterial(
      "node-simple-sphere",
      () =>
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.8,
        })
    );

    assets.createMaterial(
      "node-advanced-sphere",
      () =>
        new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.2,
        })
    );

    assets.createMaterial(
      "link-simple",
      () =>
        new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.3,
        })
    );

    assets.createMaterial(
      "link-advanced",
      () =>
        new THREE.LineBasicMaterial({
          color: "#4080ff",
          transparent: true,
          opacity: 0.8,
        })
    );

    assets.createMaterial(
      "link-dashed",
      () =>
        new THREE.LineDashedMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.8,
          dashSize: 1.0,
          gapSize: 1.0,
        })
    );

    // Nettoyage lors du démontage du composant
    return () => {
      // Le service d'assets gérera lui-même le cycle de vie des ressources
      // Aucune action spécifique n'est nécessaire ici
    };
  }, [assets.isReady]);

  // Vérifier si un cluster est actif
  const hasActiveCluster = activeClusterId !== null;

  // Préparer tous les nœuds en mode simple (sauf ceux du cluster actif)
  const filteredNodesSimple = useMemo(() => {
    if (!graphData?.nodes) return [];

    return graphData.nodes
      .filter((node) => {
        // Si aucun cluster actif, afficher tous les nœuds
        if (!hasActiveCluster) return true;
        // Si un cluster est actif, n'afficher que les nœuds qui n'appartiennent à aucun cluster
        // Ce changement cache tous les nœuds des autres clusters
        return node.cluster === undefined;
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

        // Si un cluster est actif, ne montrer que les liens qui n'impliquent pas des nœuds de cluster
        if (hasActiveCluster) {
          // Exclure les liens si un des nœuds appartient à un cluster (autre que le cluster actif)
          const sourceIsCluster = sourceNode.cluster !== undefined;
          const targetIsCluster = targetNode.cluster !== undefined;

          // Si les deux nœuds n'appartiennent à aucun cluster, montrer le lien
          if (sourceIsCluster || targetIsCluster) {
            return null;
          }
        }

        return (
          <OptimizedLink
            key={`${sourceId}-${targetId}-${index}`}
            sourceNode={sourceNode}
            targetNode={targetNode}
            mode="simple"
            isDirect={link.isDirect}
          />
        );
      })
      .filter(Boolean);
  }, [graphData?.links, nodeMap, hasActiveCluster]);

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
              isDirect={link.isDirect}
            />
          );
        }

        return null;
      })
      .filter(Boolean);
  }, [graphData?.links, nodeMap, activeClusterId, hasActiveCluster]);

  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  // Vérification de l'état du gamepad
  useEffect(() => {
    const inputManager = getInputManager();

    const checkGamepadStatus = () => {
      setIsGamepadConnected(inputManager.isGamepadConnected());
    };

    // Vérifier immédiatement l'état
    checkGamepadStatus();

    // Vérifier périodiquement l'état de la manette
    const intervalId = setInterval(checkGamepadStatus, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Génération des étiquettes de cluster
  const clusterLabels = useMemo(() => {
    // Ne pas afficher les étiquettes si un cluster est actif
    if (hasActiveCluster || !centroids) return [];

    return Object.keys(centroids).map((clusterId) => {
      const centroid = centroids[clusterId];
      const clusterName = centroid.name || `Cluster ${clusterId}`;
      const isHovered = hoveredClusterId === clusterId;

      return (
        <group
          key={`cluster-label-${clusterId}`}
          position={[centroid.x, centroid.y, centroid.z]}
        >
          <Billboard position={[0, 15, 0]}>
            <Text
              fontSize={8}
              color={isHovered ? "#ffffff" : "#ffffff"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={1}
              outlineColor="#000000"
            >
              {clusterName}
            </Text>

            {/* Afficher un sous-titre si le cluster est survolé */}
            {isHovered && (
              <Text
                position={[0, -8, 0]}
                fontSize={4}
                color="#555"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.2}
                outlineColor="#000000"
              >
                Press {isGamepadConnected ? "X" : "T"} to explore
              </Text>
            )}
          </Billboard>
        </group>
      );
    });
  }, [centroids, hasActiveCluster, hoveredClusterId, isGamepadConnected]);

  // Journal de débogage pour le mode debug
  useEffect(() => {
    if (debugMode) {
      console.log("Graph component en mode debug");
      console.log("Nombre de nœuds:", graphData?.nodes?.length || 0);
      console.log("Nombre de liens:", graphData?.links?.length || 0);
      console.log("Cluster actif:", activeClusterId);
      console.log("Nœud actif:", activeNodeId);
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
    activeNodeId,
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

          {/* 
            Note: Nous n'affichons plus manuellement les boîtes englobantes des nœuds ici
            car elles sont maintenant gérées par le CollisionDebugRenderer centralisé
          */}
        </group>
      )}

      {/* Afficher les boîtes englobantes en mode debug */}
      {debugMode && (
        <CollisionDebugRenderer
          show={true}
          showClusters={true}
          showNodes={true}
          showInteractive={true}
          activeClusterId={activeClusterId}
          hoveredClusterId={hoveredClusterId}
          activeNodeId={activeNodeId}
        />
      )}

      {/* Lumière ambiante pour éclairer la scène */}
      <ambientLight intensity={0.5} />
    </group>
  );
});

export default Graph;
