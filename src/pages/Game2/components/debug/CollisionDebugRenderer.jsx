import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import useGameStore, { useCurrentLevel, GAME_LEVELS } from "../../store";
import useCollisionStore from "../../services/CollisionService";
import { useFrame } from "@react-three/fiber";

// Constantes pour les couleurs par défaut (format RGB 0-1)
const DEFAULT_COLOR = [0, 1, 0]; // Vert
const ACTIVE_COLOR = [1, 0, 0]; // Rouge

// Opacités
const DEFAULT_OPACITY = 0.4;
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
  });

  const debug = useGameStore((state) => state.debug);
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const activeNodeData = useGameStore((state) => state.activeNodeData);
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

  // Mettre à jour les couleurs des boîtes de debug
  useEffect(() => {
    if (!debug) return;

    const updateDebugColors = () => {
      const store = useCollisionStore.getState();

      // Si on est dans un cluster avancé
      if (activeLevel?.type === "cluster") {
        const nodeBoxes = store.boundingBoxRefs.nodeBoxes;
        Object.values(nodeBoxes).forEach((box) => {
          if (box.data) {
            const nodeSlug = box.data.slug || String(box.data.id);
            box.debugColor =
              nodeSlug === activeNodeData ? [1, 0, 0] : [0, 1, 0];
          }
        });
      }
      // Si on est dans le monde principal
      else {
        const clusterBoxes = store.boundingBoxRefs.clusterBoxes;
        Object.values(clusterBoxes).forEach((box) => {
          if (box.data) {
            const isActive = box.data.id === hoveredCluster;
            box.debugColor = isActive ? [1, 0, 0] : [0, 1, 0];
          }
        });
      }
    };

    // Mettre à jour immédiatement
    updateDebugColors();
  }, [debug, hoveredCluster, activeNodeData, activeLevel]);

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

    return Object.entries(collisionService.boundingBoxes.clusters)
      .map(([clusterId, box]) => {
        if (!box || !box.min || !box.max) return null;

        // Initialiser le tableau des matériaux pour ce cluster
        if (!lineMaterialsRef.current.clusters[clusterId]) {
          lineMaterialsRef.current.clusters[clusterId] = [];
        }

        // Déterminer si le cluster est survolé
        const isHovered = box.slug === hoveredCluster;

        // Utiliser la couleur personnalisée si elle existe, sinon utiliser la couleur par défaut
        const colorArray =
          box.debugColor || (isHovered ? ACTIVE_COLOR : DEFAULT_COLOR);
        const color = new THREE.Color(
          colorArray[0],
          colorArray[1],
          colorArray[2]
        );

        const opacity = isHovered ? ACTIVE_OPACITY : DEFAULT_OPACITY;
        const lineWidth = isHovered ? 2 : 1;

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
          <group key={clusterId}>
            <Line
              points={points}
              color={color}
              lineWidth={lineWidth}
              opacity={opacity}
              transparent
              ref={(material) => {
                if (
                  material &&
                  !lineMaterialsRef.current.clusters[clusterId].includes(
                    material
                  )
                ) {
                  lineMaterialsRef.current.clusters[clusterId].push(material);
                }
              }}
            />
            {additionalLines.map((line, index) => (
              <Line
                key={`${clusterId}-${index}`}
                points={line}
                color={color}
                lineWidth={lineWidth}
                opacity={opacity}
                transparent
                ref={(material) => {
                  if (
                    material &&
                    !lineMaterialsRef.current.clusters[clusterId].includes(
                      material
                    )
                  ) {
                    lineMaterialsRef.current.clusters[clusterId].push(material);
                  }
                }}
              />
            ))}
          </group>
        );
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

    return Object.entries(collisionService.boundingBoxRefs.nodeBoxes)
      .map(([nodeId, box]) => {
        if (!box || !box.min || !box.max) return null;

        // Initialiser le tableau des matériaux pour ce nœud
        if (!lineMaterialsRef.current.nodes[nodeId]) {
          lineMaterialsRef.current.nodes[nodeId] = [];
        }

        // Déterminer si le nœud est actif
        const isActive =
          box.data && (box.data.slug || String(box.data.id)) === activeNodeData;

        // Utiliser la couleur personnalisée si elle existe, sinon utiliser la couleur par défaut
        const colorArray =
          box.debugColor || (isActive ? ACTIVE_COLOR : DEFAULT_COLOR);
        const color = new THREE.Color(
          colorArray[0],
          colorArray[1],
          colorArray[2]
        );

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
          <group key={nodeId}>
            <Line
              points={points}
              color={color}
              lineWidth={lineWidth}
              opacity={opacity}
              transparent
              ref={(material) => {
                if (
                  material &&
                  !lineMaterialsRef.current.nodes[nodeId].includes(material)
                ) {
                  lineMaterialsRef.current.nodes[nodeId].push(material);
                }
              }}
            />
            {additionalLines.map((line, index) => (
              <Line
                key={`${nodeId}-${index}`}
                points={line}
                color={color}
                lineWidth={lineWidth}
                opacity={opacity}
                transparent
                ref={(material) => {
                  if (
                    material &&
                    !lineMaterialsRef.current.nodes[nodeId].includes(material)
                  ) {
                    lineMaterialsRef.current.nodes[nodeId].push(material);
                  }
                }}
              />
            ))}
          </group>
        );
      })
      .filter(Boolean);
  }, [debug, activeNodeData, collisionService, currentLevel, updateTrigger]);

  // Si pas de debug, on ne rend rien
  if (!debug) return null;

  return (
    <group>
      {clusterBoxLines}
      {nodeBoxLines}
    </group>
  );
};

export default CollisionDebugRenderer;
