import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEMATIC_COLORS } from "../../../../../constants/thematicColors";
import {
  useVibrationSystem,
  VIBRATION_PATTERNS,
} from "../../../../../utils/vibrationHelpers";

// Cache des matériaux pour les liens vibrants
const vibLinkMaterialCache = new Map();

const getVibLinkMaterial = (color, opacity = 0.3) => {
  const key = `${color.getHexString()}-${opacity}`;
  if (!vibLinkMaterialCache.has(key)) {
    vibLinkMaterialCache.set(
      key,
      new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        linewidth: 2,
      })
    );
  }
  return vibLinkMaterialCache.get(key);
};

/**
 * Composant VibLink - Version vibrante du composant Link
 * Gère le rendu d'un lien individuel dans le graphe avec effet de vibration
 * Utilise des points de contrôle intermédiaires pour une vibration plus visible
 */
const VibLink = ({
  source,
  target,
  materialsRef,
  isLinkVisited,
  vibrationIntensity = 0.3,
  vibrationSpeed = 1.0,
  statesCount = 6,
  controlPoints = 3, // Nombre de points de contrôle intermédiaires
}) => {
  const lineRef = useRef();

  // Utiliser le système de vibration
  const { animateVibration, registerGeometry, clearGeometries } =
    useVibrationSystem({
      vibrationSpeed,
      statesCount,
      preserveZ: false, // 3D vibration
    });

  // Créer les points de la ligne avec points de contrôle intermédiaires
  const points = useMemo(() => {
    const sourcePos = new THREE.Vector3(
      source.x || 0,
      source.y || 0,
      source.z || 0
    );
    const targetPos = new THREE.Vector3(
      target.x || 0,
      target.y || 0,
      target.z || 0
    );

    const linePoints = [];
    const totalPoints = controlPoints + 2; // source + controlPoints + target

    for (let i = 0; i < totalPoints; i++) {
      const t = i / (totalPoints - 1); // Interpolation de 0 à 1
      const point = new THREE.Vector3().lerpVectors(sourcePos, targetPos, t);
      linePoints.push(point);
    }

    return linePoints;
  }, [
    source.x,
    source.y,
    source.z,
    target.x,
    target.y,
    target.z,
    controlPoints,
  ]);

  // Déterminer la couleur et le matériau du lien
  const linkMaterial = useMemo(() => {
    const sourceGroup = source.clusterThematicGroup;
    const targetGroup = target.clusterThematicGroup;

    if (isLinkVisited(source, target)) {
      // Si les deux groupes sont identiques et ont un matériau visité spécifique
      if (
        sourceGroup === targetGroup &&
        materialsRef.current[`visitedLink_${sourceGroup}`]
      ) {
        return materialsRef.current[`visitedLink_${sourceGroup}`];
      }
      return materialsRef.current.visitedLine;
    } else if (
      sourceGroup === targetGroup &&
      materialsRef.current[`link_${sourceGroup}`]
    ) {
      // Même groupe thématique - utiliser le matériau pré-créé
      return materialsRef.current[`link_${sourceGroup}`];
    } else if (
      sourceGroup &&
      targetGroup &&
      sourceGroup !== targetGroup &&
      materialsRef.current[`link_${sourceGroup}`] &&
      materialsRef.current[`link_${targetGroup}`]
    ) {
      // Groupes différents - créer un matériau mélangé (on garde cette logique car c'est spécifique)
      const color1 = new THREE.Color(THEMATIC_COLORS[sourceGroup]);
      const color2 = new THREE.Color(THEMATIC_COLORS[targetGroup]);
      const mixedColor = new THREE.Color(
        (color1.r + color2.r) / 2,
        (color1.g + color2.g) / 2,
        (color1.b + color2.b) / 2
      );
      return getVibLinkMaterial(mixedColor, 0.3);
    } else {
      return materialsRef.current.line;
    }
  }, [source, target, materialsRef, isLinkVisited]);

  // Enregistrer la géométrie pour la vibration quand les points changent
  useEffect(() => {
    if (!lineRef.current || !points?.length) return;

    clearGeometries();

    // Convertir les Vector3 en objets simples pour les helpers
    const simplePoints = points.map((p) => ({ x: p.x, y: p.y, z: p.z }));

    // Utiliser une intensité variable selon la position du point
    // Les points du milieu vibrent plus que les extrémités
    const enhancedPoints = simplePoints.map((point, index) => {
      const distanceFromCenter = Math.abs(
        index - (simplePoints.length - 1) / 2
      );
      const maxDistance = (simplePoints.length - 1) / 2;
      const centerWeight = 1 - (distanceFromCenter / maxDistance) * 0.5; // Les extrémités vibrent à 50% du centre

      return {
        ...point,
        vibrationWeight: centerWeight,
      };
    });

    registerGeometry(
      lineRef.current.geometry,
      enhancedPoints,
      vibrationIntensity,
      VIBRATION_PATTERNS.SPATIAL
    );
  }, [points, vibrationIntensity, registerGeometry, clearGeometries]);

  // Animation de vibration
  useFrame(animateVibration);

  if (!points?.length) return null;

  return (
    <line ref={lineRef} material={linkMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
    </line>
  );
};

// Nettoyer le cache quand le module est déchargé
window.addEventListener("beforeunload", () => {
  vibLinkMaterialCache.forEach((material) => material.dispose());
  vibLinkMaterialCache.clear();
});

export default VibLink;
