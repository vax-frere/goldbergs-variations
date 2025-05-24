import React, { memo, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";

/**
 * Composant AdvancedLink - Version améliorée des liens pour le mode avancé
 */
const AdvancedLink = memo(({ sourceNode, targetNode, isDirect = true }) => {
  // Constantes pour les lignes en pointillé
  const dashSize = 2.0;
  const gapSize = 0.25;

  // Constantes pour les flèches
  const arrowSize = 2.0;
  const arrowAngle = Math.PI / 4;

  // Calculer les vecteurs et points pour le lien
  const vectorData = useMemo(() => {
    if (!sourceNode?.x || !targetNode?.x) {
      return null;
    }

    // Créer les vecteurs source et cible
    const srcVector = new THREE.Vector3(
      sourceNode.x,
      sourceNode.y,
      sourceNode.z
    );
    const tgtVector = new THREE.Vector3(
      targetNode.x,
      targetNode.y,
      targetNode.z
    );

    // Direction du lien (vecteur normalisé)
    const dir = new THREE.Vector3()
      .subVectors(tgtVector, srcVector)
      .normalize();

    // Décaler les points de départ et d'arrivée
    const sourceRadius = sourceNode.value || 5;
    const targetRadius = targetNode.value || 5;

    const srcWithOffset = new THREE.Vector3().addVectors(
      srcVector,
      dir.clone().multiplyScalar(sourceRadius)
    );
    const tgtWithOffset = new THREE.Vector3().addVectors(
      tgtVector,
      dir.clone().multiplyScalar(-targetRadius)
    );

    return {
      sourceVector: srcVector,
      targetVector: tgtVector,
      direction: dir,
      sourceWithOffset: srcWithOffset,
      targetWithOffset: tgtWithOffset,
      points: [
        [srcWithOffset.x, srcWithOffset.y, srcWithOffset.z],
        [tgtWithOffset.x, tgtWithOffset.y, tgtWithOffset.z],
      ],
    };
  }, [sourceNode, targetNode]);

  // Calculer les vecteurs pour les flèches
  const arrowVectors = useMemo(() => {
    if (!vectorData) return null;

    const { direction, targetWithOffset } = vectorData;

    // Trouver un vecteur perpendiculaire
    const up = new THREE.Vector3(0, 1, 0);
    let perpendicular = new THREE.Vector3()
      .crossVectors(direction, up)
      .normalize();

    // Si le lien est presque vertical, utiliser un autre vecteur de référence
    if (perpendicular.length() < 0.1) {
      perpendicular = new THREE.Vector3(1, 0, 0);
    }

    // Calculer les branches de la flèche
    const branch1Dir = new THREE.Vector3().copy(direction).negate();
    branch1Dir.applyAxisAngle(perpendicular, arrowAngle);

    const branch2Dir = new THREE.Vector3().copy(direction).negate();
    branch2Dir.applyAxisAngle(perpendicular, -arrowAngle);

    // Points des branches de la flèche
    const branch1End = new THREE.Vector3()
      .copy(targetWithOffset)
      .addScaledVector(branch1Dir, arrowSize);

    const branch2End = new THREE.Vector3()
      .copy(targetWithOffset)
      .addScaledVector(branch2Dir, arrowSize);

    return {
      branch1: [
        [targetWithOffset.x, targetWithOffset.y, targetWithOffset.z],
        [branch1End.x, branch1End.y, branch1End.z],
      ],
      branch2: [
        [targetWithOffset.x, targetWithOffset.y, targetWithOffset.z],
        [branch2End.x, branch2End.y, branch2End.z],
      ],
    };
  }, [vectorData, arrowSize, arrowAngle]);

  // Si pas de données, ne rien rendre
  if (!vectorData) {
    return null;
  }

  return (
    <group>
      {/* Ligne principale */}
      <Line
        points={vectorData.points}
        lineWidth={0.75}
        color="#ffffff"
        opacity={0.8}
        transparent
        dashed={!isDirect}
        dashSize={dashSize}
        gapSize={gapSize}
      />

      {/* Flèches */}
      {arrowVectors && (
        <>
          <Line
            points={arrowVectors.branch1}
            lineWidth={0.5}
            color="#ffffff"
            opacity={0.8}
            transparent
          />
          <Line
            points={arrowVectors.branch2}
            lineWidth={0.5}
            color="#ffffff"
            opacity={0.8}
            transparent
          />
        </>
      )}
    </group>
  );
});

AdvancedLink.displayName = "AdvancedLink";

export default AdvancedLink;
