import React from "react";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../constants/thematicColors";

/**
 * Composant Node - Gère le rendu d'un nœud individuel dans le graphe
 */
const Node = ({
  node,
  geometriesRef,
  materialsRef: getMaterial,
  isClusterVisited,
}) => {
  const thematicGroup = node.clusterThematicGroup;
  const isVisited = isClusterVisited(node);

  // Déterminer la couleur en fonction du groupe thématique
  const color = (thematicGroup && THEMATIC_COLORS[thematicGroup]) || "#ffffff";

  // Obtenir le matériau via la fonction getMaterial
  const material = getMaterial("node", color, isVisited);

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
