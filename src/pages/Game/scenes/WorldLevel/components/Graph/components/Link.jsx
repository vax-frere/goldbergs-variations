import React, { useMemo } from "react";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../constants/thematicColors";

/**
 * Composant Link - Gère le rendu d'un lien individuel dans le graphe
 */
const Link = ({
  edge,
  source,
  target,
  materialsRef: getMaterial,
  isLinkVisited,
}) => {
  // Créer les points de la ligne
  const points = useMemo(() => {
    return [
      new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0),
      new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0),
    ];
  }, [source.x, source.y, source.z, target.x, target.y, target.z]);

  // Mettre à jour la géométrie de la ligne
  edge.geometry.setFromPoints(points);

  // Déterminer la couleur du lien en fonction des groupes thématiques
  const sourceGroup = source.clusterThematicGroup;
  const targetGroup = target.clusterThematicGroup;
  const isVisited = isLinkVisited(source, target);

  let linkColor = "#ffffff";
  let opacity = 0.4;

  if (sourceGroup === targetGroup && THEMATIC_COLORS[sourceGroup]) {
    // Même groupe thématique
    linkColor = THEMATIC_COLORS[sourceGroup];
  } else if (
    sourceGroup &&
    targetGroup &&
    THEMATIC_COLORS[sourceGroup] &&
    THEMATIC_COLORS[targetGroup]
  ) {
    // Groupes différents - mélanger les couleurs
    const color1 = new THREE.Color(THEMATIC_COLORS[sourceGroup]);
    const color2 = new THREE.Color(THEMATIC_COLORS[targetGroup]);
    const mixedColor = new THREE.Color(
      (color1.r + color2.r) / 2,
      (color1.g + color2.g) / 2,
      (color1.b + color2.b) / 2
    );
    linkColor = `#${mixedColor.getHexString()}`;
    opacity = 0.3;
  }

  // Obtenir le matériau via la fonction getMaterial
  const linkMaterial = getMaterial("line", linkColor, isVisited, opacity);

  return <line geometry={edge.geometry} material={linkMaterial} />;
};

export default Link;
