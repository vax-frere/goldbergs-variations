import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import useGameStore, { useCurrentLevel, GAME_LEVELS } from "../../store";
import useCollisionStore from "../../services/CollisionService";
import { useFrame } from "@react-three/fiber";

// Constantes pour les couleurs par défaut (format RGB 0-1)
const DEFAULT_COLOR = [0.5, 0.5, 0.5]; // Gris léger
const ACTIVE_COLOR = [1, 0, 0]; // Rouge

// Opacités
const DEFAULT_OPACITY = 0.15;
const ACTIVE_OPACITY = 0.8;

/**
 * Composant dédié à l'affichage des boîtes de collision en mode debug
 * Optimisé pour ne s'afficher que lorsque le mode debug est activé
 */
const CollisionDebugRenderer = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const lineMaterialsRef = useRef({
    clusters: {},
    nodes: {},
    components: {},
  });

  const debug = useGameStore((state) => state.debug);
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const currentLevel = useCurrentLevel();
  const collisionService = useCollisionStore();
  const activeLevel = useGameStore((state) => state.activeLevel);

  // Forcer un re-rendu périodique pour mettre à jour les couleurs
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
    }, 100); // Mettre à jour toutes les 100ms

    return () => clearInterval(interval);
  }, []);

  // Fonction générique pour créer les lignes de debug d'une boîte
  const createBoxLines = (box, id, isActive, materialCategory) => {
    if (!box || !box.min || !box.max) return null;

    // Initialiser le tableau des matériaux pour cet élément
    if (!lineMaterialsRef.current[materialCategory][id]) {
      lineMaterialsRef.current[materialCategory][id] = [];
    }

    // Utiliser la couleur personnalisée si elle existe, sinon utiliser la couleur par défaut
    const colorArray =
      box.debugColor || (isActive ? ACTIVE_COLOR : DEFAULT_COLOR);
    const color = new THREE.Color(colorArray[0], colorArray[1], colorArray[2]);

    const opacity = isActive ? ACTIVE_OPACITY : DEFAULT_OPACITY;
    const lineWidth = isActive ? 2 : 1;

    // Points pour dessiner la boîte
    const points = [
      [box.min.x, box.min.y, box.min.z],
      [box.max.x, box.min.y, box.min.z],
      [box.max.x, box.max.y, box.min.z],
      [box.min.x, box.max.y, box.min.z],
      [box.min.x, box.min.y, box.min.z],
      [box.min.x, box.min.y, box.max.z],
      [box.max.x, box.min.y, box.max.z],
      [box.max.x, box.max.y, box.max.z],
      [box.min.x, box.max.y, box.max.z],
      [box.min.x, box.min.y, box.max.z],
    ];

    // Lignes supplémentaires pour compléter la boîte
    const additionalLines = [
      [
        [box.max.x, box.min.y, box.min.z],
        [box.max.x, box.min.y, box.max.z],
      ],
      [
        [box.max.x, box.max.y, box.min.z],
        [box.max.x, box.max.y, box.max.z],
      ],
      [
        [box.min.x, box.max.y, box.min.z],
        [box.min.x, box.max.y, box.max.z],
      ],
    ];

    return (
      <group key={id}>
        <Line
          points={points}
          color={color}
          lineWidth={lineWidth}
          opacity={opacity}
          transparent
          ref={(material) => {
            if (
              material &&
              !lineMaterialsRef.current[materialCategory][id].includes(material)
            ) {
              lineMaterialsRef.current[materialCategory][id].push(material);
            }
          }}
        />
        {additionalLines.map((line, index) => (
          <Line
            key={`${id}-${index}`}
            points={line}
            color={color}
            lineWidth={lineWidth}
            opacity={opacity}
            transparent
            ref={(material) => {
              if (
                material &&
                !lineMaterialsRef.current[materialCategory][id].includes(
                  material
                )
              ) {
                lineMaterialsRef.current[materialCategory][id].push(material);
              }
            }}
          />
        ))}
      </group>
    );
  };

  // Générer les lignes pour les boîtes de clusters
  const clusterBoxLines = useMemo(() => {
    if (
      !debug ||
      !collisionService ||
      !collisionService.boundingBoxes ||
      !collisionService.boundingBoxes.clusters ||
      currentLevel !== GAME_LEVELS.WORLD
    ) {
      return null;
    }

    // Trouver le cluster actuellement en collision
    const currentCluster = collisionService.findContainingCluster();
    const activeClusterId = currentCluster?.id;

    return Object.entries(collisionService.boundingBoxes.clusters)
      .map(([clusterId, box]) => {
        const isActive =
          clusterId === activeClusterId || box.data?.slug === hoveredCluster;
        return createBoxLines(box, clusterId, isActive, "clusters");
      })
      .filter(Boolean);
  }, [debug, hoveredCluster, collisionService, currentLevel, updateTrigger]);

  // Générer les lignes pour les boîtes des nœuds
  const nodeBoxLines = useMemo(() => {
    if (
      !debug ||
      !collisionService ||
      !collisionService.boundingBoxRefs ||
      !collisionService.boundingBoxRefs.nodeBoxes ||
      currentLevel !== GAME_LEVELS.ADVANCED_CLUSTER
    ) {
      return null;
    }

    // Trouver le nœud actuellement en collision
    const currentNode = collisionService.findContainingNode();
    const activeNodeId = currentNode?.id;

    return Object.entries(collisionService.boundingBoxRefs.nodeBoxes)
      .map(([nodeId, box]) => {
        const isActive = nodeId === activeNodeId;
        return createBoxLines(box, nodeId, isActive, "nodes");
      })
      .filter(Boolean);
  }, [debug, collisionService, currentLevel, updateTrigger]);

  // Générer les lignes pour les boîtes des composants interactifs
  const componentBoxLines = useMemo(() => {
    if (
      !debug ||
      !collisionService ||
      !collisionService.boundingBoxRefs ||
      !collisionService.boundingBoxRefs.nodeBoxes ||
      currentLevel !== GAME_LEVELS.WORLD
    ) {
      return null;
    }

    // Trouver le composant actuellement en collision
    const currentComponent = collisionService.findContainingNode();
    const activeComponentId = currentComponent?.data?.id;

    return Object.entries(collisionService.boundingBoxRefs.nodeBoxes)
      .map(([componentId, box]) => {
        const isActive = box.data?.id === activeComponentId;
        return createBoxLines(box, componentId, isActive, "components");
      })
      .filter(Boolean);
  }, [debug, collisionService, currentLevel, updateTrigger]);

  // Si pas de debug, on ne rend rien
  if (!debug) return null;

  return (
    <group>
      {clusterBoxLines}
      {nodeBoxLines}
      {componentBoxLines}
    </group>
  );
};

export default CollisionDebugRenderer;
