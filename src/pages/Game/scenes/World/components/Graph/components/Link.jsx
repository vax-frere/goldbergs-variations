import React, { useMemo } from "react";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../../../constants/thematicColors";

// Cache des matériaux pour les liens
const linkMaterialCache = new Map();

const getLinkMaterial = (color, opacity = 0.3) => {
  const key = `${color.getHexString()}-${opacity}`;
  if (!linkMaterialCache.has(key)) {
    linkMaterialCache.set(
      key,
      new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
      })
    );
  }
  return linkMaterialCache.get(key);
};

/**
 * Composant Link - Gère le rendu d'un lien individuel dans le graphe
 */
const Link = ({ edge, source, target, materialsRef, isLinkVisited }) => {
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
  const sourceGroup = source.thematicGroup;
  const targetGroup = target.thematicGroup;

  let linkMaterial;
  if (isLinkVisited(source, target)) {
    linkMaterial = materialsRef.current.visitedLine;
  } else if (sourceGroup === targetGroup && THEMATIC_COLORS[sourceGroup]) {
    const color = new THREE.Color(THEMATIC_COLORS[sourceGroup]);
    linkMaterial = getLinkMaterial(color, 0.4);
  } else if (
    sourceGroup &&
    targetGroup &&
    THEMATIC_COLORS[sourceGroup] &&
    THEMATIC_COLORS[targetGroup]
  ) {
    const color1 = new THREE.Color(THEMATIC_COLORS[sourceGroup]);
    const color2 = new THREE.Color(THEMATIC_COLORS[targetGroup]);
    const mixedColor = new THREE.Color(
      (color1.r + color2.r) / 2,
      (color1.g + color2.g) / 2,
      (color1.b + color2.b) / 2
    );
    linkMaterial = getLinkMaterial(mixedColor, 0.3);
  } else {
    linkMaterial = materialsRef.current.line;
  }

  return <line geometry={edge.geometry} material={linkMaterial} />;
};

export default Link;
