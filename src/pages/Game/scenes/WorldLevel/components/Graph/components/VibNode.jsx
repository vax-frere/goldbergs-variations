import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../constants/thematicColors";
import {
  useVibrationAnimation,
  precomputeVibrationStates,
  updateGeometryPositions,
  VIBRATION_PATTERNS,
} from "../../../../../utils/vibrationHelpers";

/**
 * Composant VibNode - Version vibrante du composant Node
 * Gère le rendu d'un nœud individuel dans le graphe avec effet de vibration
 */
const VibNode = ({
  node,
  geometriesRef,
  materialsRef,
  isClusterVisited,
  vibrationIntensity = 0.05, // Plus subtil pour les nœuds
  vibrationSpeed = 0.8,
  statesCount = 6,
}) => {
  const meshRef = useRef();
  const vibrationStatesRef = useRef([]);

  // Utiliser l'animation de vibration
  const { updateVibration } = useVibrationAnimation({
    vibrationSpeed,
    statesCount,
    baseFPS: 8, // Plus lent pour les nœuds
  });

  // Déterminer le matériau du nœud
  const material = useMemo(() => {
    const thematicGroup = node.clusterThematicGroup;
    const isVisited = isClusterVisited(node);

    // Utiliser la couleur thématique pour tous les nœuds
    if (thematicGroup && THEMATIC_COLORS[thematicGroup]) {
      return isVisited
        ? materialsRef.current[`visitedNode_${thematicGroup}`]
        : materialsRef.current[`node_${thematicGroup}`];
    } else {
      return isVisited
        ? materialsRef.current.visitedNode
        : materialsRef.current.node;
    }
  }, [node.clusterThematicGroup, isClusterVisited, node, materialsRef]);

  // Ajuster la taille du nœud en fonction de son type
  const scale = node.isClusterMaster ? 1.5 : 1;

  // Pré-calculer les états de vibration pour la position du nœud
  useEffect(() => {
    const nodePosition = { x: node.x || 0, y: node.y || 0, z: node.z || 0 };

    // Créer plusieurs points autour de la position pour simuler la vibration
    // On utilise un pattern subtil pour les nœuds
    const vibrationPattern = {
      dimensions: 3,
      directions: [
        { axis: "x", weight: 0.3 },
        { axis: "y", weight: 0.3 },
        { axis: "z", weight: 0.2 },
        { axis: "xy", weight: 0.2 },
      ],
    };

    vibrationStatesRef.current = precomputeVibrationStates(
      [nodePosition],
      vibrationIntensity,
      statesCount,
      vibrationPattern
    );
  }, [node.x, node.y, node.z, vibrationIntensity, statesCount]);

  // Animation de vibration pour la position
  useFrame((state) => {
    if (!meshRef.current || !vibrationStatesRef.current.length) return;

    updateVibration(state.clock.getElapsedTime(), (currentState) => {
      const vibrationState = vibrationStatesRef.current[currentState];
      if (vibrationState && vibrationState[0]) {
        const vibratedPos = vibrationState[0];
        meshRef.current.position.set(
          vibratedPos.x,
          vibratedPos.y,
          vibratedPos.z
        );
      }
    });
  });

  return (
    <mesh
      ref={meshRef}
      position={[node.x || 0, node.y || 0, node.z || 0]}
      geometry={geometriesRef.current.node}
      material={material}
      scale={[scale, scale, scale]}
    />
  );
};

export default VibNode;
