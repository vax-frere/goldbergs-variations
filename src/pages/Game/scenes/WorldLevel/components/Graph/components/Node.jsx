import React from "react";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../../../constants/thematicColors";

/**
 * Composant Node - Gère le rendu d'un nœud individuel dans le graphe
 */
const Node = ({ node, geometriesRef, materialsRef, isClusterVisited }) => {
  const thematicGroup = node.clusterThematicGroup;
  const isVisited = isClusterVisited(node);
  let material;

  // Utiliser la couleur thématique pour tous les nœuds
  if (thematicGroup && THEMATIC_COLORS[thematicGroup]) {
    material = isVisited
      ? materialsRef.current[`visitedNode_${thematicGroup}`]
      : materialsRef.current[`node_${thematicGroup}`];
  } else {
    material = isVisited
      ? materialsRef.current.visitedNode
      : materialsRef.current.node;
  }

  // Ajuster la taille du nœud en fonction de son type
  const scale = node.isClusterMaster ? 1.5 : 1;

  return (
    <mesh
      position={[node.x || 0, node.y || 0, node.z || 0]}
      geometry={geometriesRef.current.node}
      material={material}
      scale={[scale, scale, scale]}
    />
  );
};

export default Node;
