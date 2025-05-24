import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";

/**
 * Configuration des couleurs par type de layer
 */
const COLOR_MAP = {
  [CollisionLayers.DEFAULT]: "#ffffff", // Blanc
  [CollisionLayers.CLUSTERS]: "#00ff00", // Vert
  [CollisionLayers.NODES]: "#0088ff", // Bleu
  [CollisionLayers.INTERACTIVE]: "#ff00ff", // Magenta
};

// Opacités par défaut
const DEFAULT_OPACITY = 0.4;
const ACTIVE_OPACITY = 0.8;
const HOVERED_OPACITY = 0.6;

// Pool de couleurs prédéfinies pour chaque layer, évite de recréer les mêmes couleurs
const COLOR_POOL = {
  [CollisionLayers.DEFAULT]: new THREE.Color(
    COLOR_MAP[CollisionLayers.DEFAULT]
  ),
  [CollisionLayers.CLUSTERS]: new THREE.Color(
    COLOR_MAP[CollisionLayers.CLUSTERS]
  ),
  [CollisionLayers.NODES]: new THREE.Color(COLOR_MAP[CollisionLayers.NODES]),
  [CollisionLayers.INTERACTIVE]: new THREE.Color(
    COLOR_MAP[CollisionLayers.INTERACTIVE]
  ),
};

// Obtenir une couleur du pool basée sur le layer
const getColorForLayer = (layer) => {
  // Utiliser la couleur du layer spécifié, ou celle par défaut si le layer n'est pas reconnu
  return COLOR_POOL[layer] || COLOR_POOL[CollisionLayers.DEFAULT];
};

/**
 * Composant qui affiche les boîtes de collision de tous les types
 * Les couleurs sont différentes selon le type d'élément
 */
const CollisionDebugRenderer = ({
  show = true,
  showClusters = true,
  showNodes = true,
  showInteractive = true,
  activeClusterId = null,
  hoveredClusterId = null,
  activeNodeId = null,
  transitionSpeed = 0.1, // Vitesse de transition pour les animations d'opacité
}) => {
  // Référence au groupe principal pour la position
  const groupRef = useRef();

  // Référence aux matériaux des lignes pour les animations
  const lineMaterialsRef = useRef({
    clusters: {},
    nodes: {},
    interactive: {},
  });

  // Références pour éviter les rendus inutiles
  const prevBoxCountsRef = useRef({
    clusters: 0,
    nodes: 0,
    interactive: 0,
  });

  // Référence pour le throttling du rendu
  const renderTimerRef = useRef({
    lastRenderTime: 0,
    throttleTime: 500, // ms entre les rendus forcés (1/2 seconde)
  });

  // État local pour forcer un rendu uniquement lorsque nécessaire
  const [triggerRender, setTriggerRender] = useState(0);

  // Accéder au service de collision
  const collisionService = useCollisionStore();

  // Accéder au pool d'objets
  const objectPool = useMemo(
    () => collisionService.objectPool,
    [collisionService]
  );

  // Vérifier périodiquement les changements majeurs dans les boîtes
  useEffect(() => {
    // Fonction pour vérifier les changements significatifs
    const checkForChanges = () => {
      if (!collisionService) return;

      const now = Date.now();
      if (
        now - renderTimerRef.current.lastRenderTime <
        renderTimerRef.current.throttleTime
      ) {
        return;
      }

      // Compter le nombre actuel de boîtes
      const clusterCount = Object.keys(
        collisionService.boundingBoxRefs.clusterBoxes || {}
      ).length;
      const nodeCount = Object.keys(
        collisionService.boundingBoxRefs.nodeBoxes || {}
      ).length;
      const interactiveCount = Object.keys(
        collisionService.boundingBoxRefs.interactiveElements || {}
      ).length;

      // Vérifier s'il y a eu un changement significatif
      const hasSignificantChange =
        Math.abs(clusterCount - prevBoxCountsRef.current.clusters) > 0 ||
        Math.abs(nodeCount - prevBoxCountsRef.current.nodes) > 1 ||
        Math.abs(interactiveCount - prevBoxCountsRef.current.interactive) > 0;

      // Mettre à jour les références
      prevBoxCountsRef.current = {
        clusters: clusterCount,
        nodes: nodeCount,
        interactive: interactiveCount,
      };

      // Si changement significatif, déclencher un rendu
      if (hasSignificantChange) {
        renderTimerRef.current.lastRenderTime = now;
        setTriggerRender((prev) => prev + 1);
      }
    };

    // Vérifier immédiatement
    checkForChanges();

    // Configurer une vérification périodique
    const interval = setInterval(checkForChanges, 500);

    return () => {
      clearInterval(interval);
    };
  }, [collisionService]);

  // Nettoyer les références aux matériaux lorsque les propriétés changent
  useEffect(() => {
    return () => {
      // Réinitialiser les références aux matériaux lors du démontage
      lineMaterialsRef.current = {
        clusters: {},
        nodes: {},
        interactive: {},
      };
    };
  }, [
    showClusters,
    showNodes,
    showInteractive,
    activeClusterId,
    hoveredClusterId,
    activeNodeId,
  ]);

  // Ne rien afficher si l'affichage est désactivé
  if (!show) return null;

  // Générer les lignes pour les boîtes de clusters
  const clusterBoxLines = useMemo(() => {
    if (
      !showClusters ||
      !collisionService ||
      !collisionService.boundingBoxes ||
      !collisionService.boundingBoxes.clusters
    )
      return null;

    return Object.entries(collisionService.boundingBoxes.clusters)
      .filter(([_, box]) => box && box.min && box.max) // Filtrer les boîtes invalides
      .map(([clusterId, box]) => {
        // Initialiser le tableau des matériaux pour ce cluster
        if (!lineMaterialsRef.current.clusters[clusterId]) {
          lineMaterialsRef.current.clusters[clusterId] = [];
        }

        // Déterminer l'état du cluster (actif, survolé, normal)
        const isActive = clusterId === activeClusterId;
        const isHovered = clusterId === hoveredClusterId;

        // Déterminer la couleur en fonction du layer - utiliser directement la couleur du layer
        const colorKey =
          box.layer in COLOR_MAP ? box.layer : CollisionLayers.CLUSTERS;
        let opacity = isActive
          ? ACTIVE_OPACITY
          : isHovered
          ? HOVERED_OPACITY
          : DEFAULT_OPACITY;
        let lineWidth = isActive ? 2 : isHovered ? 1.5 : 1;

        // Dessiner la boîte
        return renderBoundingBox(
          box,
          colorKey,
          opacity,
          lineWidth,
          `cluster-${clusterId}`,
          (material) => {
            if (
              material &&
              !lineMaterialsRef.current.clusters[clusterId].includes(material)
            ) {
              lineMaterialsRef.current.clusters[clusterId].push(material);
            }
          }
        );
      });
  }, [
    showClusters,
    collisionService,
    activeClusterId,
    hoveredClusterId,
    triggerRender,
  ]);

  // Générer les lignes pour les boîtes de nœuds
  const nodeBoxLines = useMemo(() => {
    if (
      !showNodes ||
      !collisionService ||
      !collisionService.boundingBoxes ||
      !collisionService.boundingBoxes.nodes
    )
      return null;

    // Utiliser les boîtes de la référence pour éviter les problèmes de rendu
    const nodeBoxes = collisionService.boundingBoxRefs.nodeBoxes || {};

    // Log pour debug du nombre de boîtes de nœuds
    if (collisionService.debugMode) {
      console.log(
        `CollisionDebugRenderer: Rendering ${
          Object.keys(nodeBoxes).length
        } node boxes`
      );
    }

    return Object.entries(nodeBoxes)
      .filter(([_, box]) => box && box.min && box.max) // Filtrer les boîtes invalides
      .map(([nodeId, box]) => {
        // Initialiser le tableau des matériaux pour ce nœud
        if (!lineMaterialsRef.current.nodes[nodeId]) {
          lineMaterialsRef.current.nodes[nodeId] = [];
        }

        // Déterminer l'état du nœud (actif, normal)
        const isActive = nodeId === activeNodeId;

        // Déterminer la couleur en fonction du layer - utiliser directement la couleur du layer
        const colorKey =
          box.layer in COLOR_MAP ? box.layer : CollisionLayers.NODES;
        let opacity = isActive ? ACTIVE_OPACITY : DEFAULT_OPACITY;
        let lineWidth = isActive ? 2 : 1;

        // Dessiner la boîte
        return renderBoundingBox(
          box,
          colorKey,
          opacity,
          lineWidth,
          `node-${nodeId}`,
          (material) => {
            if (
              material &&
              !lineMaterialsRef.current.nodes[nodeId].includes(material)
            ) {
              lineMaterialsRef.current.nodes[nodeId].push(material);
            }
          }
        );
      });
  }, [showNodes, collisionService, activeNodeId, triggerRender]);

  // Générer les lignes pour les boîtes d'éléments interactifs avec memoization contrôlée
  const interactiveBoxLines = useMemo(() => {
    if (
      !showInteractive ||
      !collisionService ||
      !collisionService.boundingBoxRefs
    )
      return null;

    // Utiliser les boîtes de la référence pour éviter les problèmes de rendu
    const interactiveElements =
      collisionService.boundingBoxRefs.interactiveElements || {};

    // Log pour debug du nombre de boîtes d'éléments interactifs
    if (collisionService.debugMode) {
      console.log(
        `CollisionDebugRenderer: Rendering ${
          Object.keys(interactiveElements).length
        } interactive boxes`
      );
    }

    return Object.entries(interactiveElements)
      .filter(([_, element]) => element && element.min && element.max) // Filtrer les éléments invalides
      .map(([elementId, element]) => {
        // Initialiser le tableau des matériaux pour cet élément
        if (!lineMaterialsRef.current.interactive[elementId]) {
          lineMaterialsRef.current.interactive[elementId] = [];
        }

        // Déterminer la couleur en fonction du layer - utiliser directement la couleur du layer
        const colorKey =
          element.layer in COLOR_MAP
            ? element.layer
            : CollisionLayers.INTERACTIVE;
        let opacity = DEFAULT_OPACITY;
        let lineWidth = 1;

        // Dessiner la boîte
        return renderBoundingBox(
          element,
          colorKey,
          opacity,
          lineWidth,
          `interactive-${elementId}`,
          (material) => {
            if (
              material &&
              !lineMaterialsRef.current.interactive[elementId].includes(
                material
              )
            ) {
              lineMaterialsRef.current.interactive[elementId].push(material);
            }
          }
        );
      });
  }, [showInteractive, collisionService, triggerRender]);

  // Animation des transitions d'opacité pour les matériaux
  useFrame(() => {
    // Animer les transitions pour les clusters
    Object.entries(lineMaterialsRef.current.clusters).forEach(
      ([clusterId, materials]) => {
        const isActive = clusterId === activeClusterId;
        const isHovered = clusterId === hoveredClusterId;
        const targetOpacity = isActive
          ? ACTIVE_OPACITY
          : isHovered
          ? HOVERED_OPACITY
          : DEFAULT_OPACITY;
        const targetLineWidth = isActive ? 2 : isHovered ? 1.5 : 1;

        materials.forEach((material) => {
          if (material.opacity !== targetOpacity) {
            material.opacity = THREE.MathUtils.lerp(
              material.opacity,
              targetOpacity,
              transitionSpeed
            );
          }
          if (material.linewidth !== targetLineWidth) {
            material.linewidth = THREE.MathUtils.lerp(
              material.linewidth,
              targetLineWidth,
              transitionSpeed
            );
          }
        });
      }
    );

    // Animer les transitions pour les nœuds
    Object.entries(lineMaterialsRef.current.nodes).forEach(
      ([nodeId, materials]) => {
        const isActive = nodeId === activeNodeId;
        const targetOpacity = isActive ? ACTIVE_OPACITY : DEFAULT_OPACITY;
        const targetLineWidth = isActive ? 2 : 1;

        materials.forEach((material) => {
          if (material.opacity !== targetOpacity) {
            material.opacity = THREE.MathUtils.lerp(
              material.opacity,
              targetOpacity,
              transitionSpeed
            );
          }
          if (material.linewidth !== targetLineWidth) {
            material.linewidth = THREE.MathUtils.lerp(
              material.linewidth,
              targetLineWidth,
              transitionSpeed
            );
          }
        });
      }
    );
  });

  return (
    <group ref={groupRef}>
      {clusterBoxLines}
      {nodeBoxLines}
      {interactiveBoxLines}
    </group>
  );
};

/**
 * Fonction utilitaire pour générer les lignes d'une boîte englobante
 */
function renderBoundingBox(
  box,
  layerKey,
  opacity,
  lineWidth,
  keyPrefix,
  materialRef
) {
  // Utiliser le pool de couleurs basé sur le layer
  const color = getColorForLayer(layerKey);

  // Points de la boîte (8 sommets)
  const points = [
    // Face avant
    [box.min.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.min.z],
    [box.max.x, box.max.y, box.min.z],
    [box.min.x, box.max.y, box.min.z],
    [box.min.x, box.min.y, box.min.z],

    // Face arrière
    [box.min.x, box.min.y, box.max.z],
    [box.max.x, box.min.y, box.max.z],
    [box.max.x, box.max.y, box.max.z],
    [box.min.x, box.max.y, box.max.z],
    [box.min.x, box.min.y, box.max.z],
  ];

  // Lignes connectant les faces avant et arrière
  const connections = [
    [1, 6], // en bas à droite
    [2, 7], // en haut à droite
    [3, 8], // en haut à gauche
  ];

  // Lignes de la face avant
  const frontLines = (
    <Line
      key={`${keyPrefix}-front`}
      points={points.slice(0, 5)}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
      ref={materialRef}
    />
  );

  // Lignes de la face arrière
  const backLines = (
    <Line
      key={`${keyPrefix}-back`}
      points={points.slice(5, 10)}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
      ref={materialRef}
    />
  );

  // Lignes de connexion
  const connectionLines = connections.map(([start, end]) => (
    <Line
      key={`${keyPrefix}-connection-${start}-${end}`}
      points={[
        [points[start][0], points[start][1], points[start][2]],
        [points[end][0], points[end][1], points[end][2]],
      ]}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
      ref={materialRef}
    />
  ));

  return (
    <group key={keyPrefix} name={keyPrefix}>
      {frontLines}
      {backLines}
      {connectionLines}
    </group>
  );
}

export default CollisionDebugRenderer;
