import React, { memo, useMemo } from "react";
import * as THREE from "three";
import { Line, Text } from "@react-three/drei";

/**
 * Composant AdvancedLinkAlt - Version alternative des liens avec arc et texte
 */
const AdvancedLinkAlt = memo(
  ({
    sourceNode,
    targetNode,
    isDirect = true,
    linkColor = "#ffffff",
    arcHeight = 0.3,
    textSize = 1,
    textOpacity = 0.9,
    textBackgroundColor = "rgba(0,0,0,0.2)",
    linkWidth = 0.75,
    opacity = 0.8,
    startOffset = 10,
    endOffset = 10,
    relationType,
  }) => {
    // Constantes pour les lignes en pointillé
    const dashSize = 2.0;
    const gapSize = 0.25;

    // Constantes pour les flèches
    const arrowSize = 2.0;

    // Calculer les points et la courbe du lien
    const { points, curve } = useMemo(() => {
      if (!sourceNode?.x || !targetNode?.x) return { points: [], curve: null };

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

      // Direction du lien
      const direction = new THREE.Vector3()
        .subVectors(tgtVector, srcVector)
        .normalize();

      // Appliquer les offsets aux points de départ et d'arrivée
      const sourceOffset = direction.clone().multiplyScalar(startOffset);
      const targetOffset = direction.clone().multiplyScalar(-endOffset);

      const adjustedSource = srcVector.clone().add(sourceOffset);
      const adjustedTarget = tgtVector.clone().add(targetOffset);

      // Calculer le point de contrôle pour l'arc
      const midPoint = new THREE.Vector3()
        .addVectors(adjustedSource, adjustedTarget)
        .multiplyScalar(0.5);
      const distance = adjustedSource.distanceTo(adjustedTarget);

      // Trouver un vecteur perpendiculaire pour l'arc
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3()
        .crossVectors(direction, up)
        .normalize();
      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Point de contrôle pour la courbe de Bézier
      const controlPoint = midPoint
        .clone()
        .add(perpendicular.multiplyScalar(distance * arcHeight));

      // Générer les points de la courbe
      const curvePoints = [];
      const curve = new THREE.QuadraticBezierCurve3(
        adjustedSource,
        controlPoint,
        adjustedTarget
      );

      const numPoints = 50;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        curvePoints.push(curve.getPoint(t));
      }

      return {
        points: curvePoints.map((p) => [p.x, p.y, p.z]),
        curve: { v0: adjustedSource, v1: controlPoint, v2: adjustedTarget },
      };
    }, [sourceNode, targetNode, arcHeight, startOffset, endOffset]);

    // Calculer les données pour le texte
    const textData = useMemo(() => {
      if (!curve || !points.length) return null;

      // Position à mi-chemin de la courbe
      const midPoint = new THREE.Vector3(
        points[Math.floor(points.length / 2)][0],
        points[Math.floor(points.length / 2)][1],
        points[Math.floor(points.length / 2)][2]
      );

      // Calculer l'orientation du texte
      const prevPoint = new THREE.Vector3(
        points[Math.floor(points.length / 2) - 1][0],
        points[Math.floor(points.length / 2) - 1][1],
        points[Math.floor(points.length / 2) - 1][2]
      );
      const nextPoint = new THREE.Vector3(
        points[Math.floor(points.length / 2) + 1][0],
        points[Math.floor(points.length / 2) + 1][1],
        points[Math.floor(points.length / 2) + 1][2]
      );

      const direction = new THREE.Vector3()
        .subVectors(nextPoint, prevPoint)
        .normalize();

      // Créer un repère orthonormé
      let right = new THREE.Vector3(1, 0, 0);
      if (Math.abs(direction.dot(right)) > 0.9) {
        right = new THREE.Vector3(0, 1, 0);
      }

      const up = new THREE.Vector3().crossVectors(right, direction).normalize();
      right = new THREE.Vector3().crossVectors(direction, up).normalize();

      const matrix = new THREE.Matrix4().makeBasis(direction, up, right);
      const rotation = new THREE.Euler().setFromRotationMatrix(matrix);

      // Décalage vers le haut pour éviter que le texte ne chevauche le lien
      const offsetPosition = midPoint.clone().add(up.multiplyScalar(1));

      return {
        position: offsetPosition,
        rotation: rotation,
      };
    }, [points, curve]);

    // Calculer les vecteurs pour les flèches
    const arrowVectors = useMemo(() => {
      if (!points.length) return null;

      const lastPoint = new THREE.Vector3(
        points[points.length - 1][0],
        points[points.length - 1][1],
        points[points.length - 1][2]
      );
      const prevPoint = new THREE.Vector3(
        points[points.length - 2][0],
        points[points.length - 2][1],
        points[points.length - 2][2]
      );

      const direction = new THREE.Vector3()
        .subVectors(lastPoint, prevPoint)
        .normalize();

      // Trouver un vecteur perpendiculaire
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3()
        .crossVectors(direction, up)
        .normalize();
      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Calculer les branches de la flèche
      const arrowAngle = Math.PI / 4;
      const branch1Dir = direction
        .clone()
        .negate()
        .applyAxisAngle(perpendicular, arrowAngle);
      const branch2Dir = direction
        .clone()
        .negate()
        .applyAxisAngle(perpendicular, -arrowAngle);

      const branch1End = lastPoint
        .clone()
        .addScaledVector(branch1Dir, arrowSize);
      const branch2End = lastPoint
        .clone()
        .addScaledVector(branch2Dir, arrowSize);

      return {
        branch1: [
          [lastPoint.x, lastPoint.y, lastPoint.z],
          [branch1End.x, branch1End.y, branch1End.z],
        ],
        branch2: [
          [lastPoint.x, lastPoint.y, lastPoint.z],
          [branch2End.x, branch2End.y, branch2End.z],
        ],
      };
    }, [points, arrowSize]);

    if (!points.length || !curve) return null;

    return (
      <group>
        {/* Ligne principale */}
        <Line
          points={points}
          lineWidth={linkWidth}
          color={linkColor}
          opacity={opacity}
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
              lineWidth={linkWidth}
              color={linkColor}
              opacity={opacity}
              transparent
            />
            <Line
              points={arrowVectors.branch2}
              lineWidth={linkWidth}
              color={linkColor}
              opacity={opacity}
              transparent
            />
          </>
        )}

        {/* Texte du lien */}
        {textData && relationType && (
          <Text
            position={textData.position}
            rotation={textData.rotation}
            fontSize={textSize}
            color={linkColor}
            anchorX="center"
            anchorY="middle"
            depthTest={false}
            renderOrder={2}
            transparent
            opacity={textOpacity}
            billboardAxis="y"
            outlineWidth={0.05}
            outlineColor="#000000"
            outlineOpacity={0.5}
            backgroundColor={textBackgroundColor}
            backgroundOpacity={0.6}
            padding={0.2}
          >
            {relationType}
          </Text>
        )}
      </group>
    );
  }
);

AdvancedLinkAlt.displayName = "AdvancedLinkAlt";

export default AdvancedLinkAlt;
