import React, { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line, Text, Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

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

    // Constantes pour le décalage circulaire
    const circleRadius = 3.0; // Rayon réduit pour un effet plus subtil
    const circleAngle = Math.PI / 8; // Angle réduit (22.5 degrés) pour plus de subtilité

    // Calculer les points et la courbe du lien
    const { points, curve, adjustedSource, adjustedTarget } = useMemo(() => {
      if (!sourceNode?.x || !targetNode?.x)
        return {
          points: [],
          curve: null,
          adjustedSource: null,
          adjustedTarget: null,
        };

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

      // Calculer les points de base avec offset
      const sourceOffset = direction.clone().multiplyScalar(startOffset);
      const targetOffset = direction.clone().multiplyScalar(-endOffset);

      const baseSource = srcVector.clone().add(sourceOffset);
      const baseTarget = tgtVector.clone().add(targetOffset);

      // Calculer le point de contrôle temporaire pour déterminer la direction de l'arc
      const tempMidPoint = new THREE.Vector3()
        .addVectors(baseSource, baseTarget)
        .multiplyScalar(0.5);
      const distance = baseSource.distanceTo(baseTarget);

      // Trouver un vecteur perpendiculaire pour l'arc
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3()
        .crossVectors(direction, up)
        .normalize();
      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Point de contrôle temporaire
      const tempControlPoint = tempMidPoint
        .clone()
        .add(perpendicular.multiplyScalar(distance * arcHeight));

      // Calculer les directions tangentes aux cercles des nœuds
      // Direction de la source vers le point de contrôle (tangente au cercle source)
      const sourceToControl = new THREE.Vector3()
        .subVectors(tempControlPoint, baseSource)
        .normalize();

      // Direction du point de contrôle vers la cible (tangente au cercle cible)
      const controlToTarget = new THREE.Vector3()
        .subVectors(baseTarget, tempControlPoint)
        .normalize();

      // Ajuster les points pour qu'ils soient tangents aux cercles
      const adjustedSource = srcVector
        .clone()
        .add(sourceToControl.multiplyScalar(startOffset));

      const adjustedTarget = tgtVector
        .clone()
        .add(controlToTarget.multiplyScalar(-endOffset));

      // Recalculer le point de contrôle avec les nouveaux points ajustés
      const midPoint = new THREE.Vector3()
        .addVectors(adjustedSource, adjustedTarget)
        .multiplyScalar(0.5);
      const adjustedDistance = adjustedSource.distanceTo(adjustedTarget);

      // Recalculer la direction perpendiculaire avec les points ajustés
      const adjustedDirection = new THREE.Vector3()
        .subVectors(adjustedTarget, adjustedSource)
        .normalize();

      let adjustedPerpendicular = new THREE.Vector3()
        .crossVectors(adjustedDirection, up)
        .normalize();
      if (adjustedPerpendicular.length() < 0.1) {
        adjustedPerpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Point de contrôle final
      const controlPoint = midPoint
        .clone()
        .add(
          adjustedPerpendicular.multiplyScalar(adjustedDistance * arcHeight)
        );

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
        adjustedSource,
        adjustedTarget,
      };
    }, [sourceNode, targetNode, arcHeight, startOffset, endOffset]);

    // Calculer les données pour le texte orienté le long du lien
    const orientedTextData = useMemo(() => {
      if (!curve || !points.length || !relationType) return null;

      // Position au centre du lien
      const midPoint = new THREE.Vector3(
        points[Math.floor(points.length / 2)][0],
        points[Math.floor(points.length / 2)][1],
        points[Math.floor(points.length / 2)][2]
      );

      // Calculer la direction du lien (de source vers target)
      const linkDirection = new THREE.Vector3()
        .subVectors(adjustedTarget, adjustedSource)
        .normalize();

      // Décalage vers le haut pour éviter le chevauchement avec le lien
      const upOffset = new THREE.Vector3(0, 1, 0);
      const offsetPosition = midPoint.clone().add(upOffset.multiplyScalar(3));

      return {
        position: offsetPosition,
        linkDirection: linkDirection,
      };
    }, [points, curve, relationType, adjustedSource, adjustedTarget]);

    // Calculer les vecteurs pour les flèches
    const arrowVectors = useMemo(() => {
      if (!points.length || !adjustedTarget || !curve) return null;

      // Utiliser le point adjustedTarget (décalé sur le cercle) comme point de fin de flèche
      const lastPoint = adjustedTarget.clone();

      // Calculer la tangente de la courbe au point final (t=1)
      const bezierCurve = new THREE.QuadraticBezierCurve3(
        curve.v0, // adjustedSource
        curve.v1, // controlPoint
        curve.v2 // adjustedTarget
      );

      // Obtenir la tangente au point final
      const tangent = bezierCurve.getTangent(1).normalize();

      // Trouver un vecteur perpendiculaire pour les branches de la flèche
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3()
        .crossVectors(tangent, up)
        .normalize();
      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Calculer les branches de la flèche
      const arrowAngle = Math.PI / 4;
      const branch1Dir = tangent
        .clone()
        .negate()
        .applyAxisAngle(perpendicular, arrowAngle);
      const branch2Dir = tangent
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
    }, [points, arrowSize, adjustedTarget, curve]);

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

        {/* Texte du lien - Version courbée ou normale selon la longueur */}
        {relationType && (
          <>
            {/* Texte orienté le long du lien */}
            {orientedTextData && (
              <SmartOrientedText
                position={orientedTextData.position}
                linkDirection={orientedTextData.linkDirection}
                fontSize={textSize}
                color={linkColor}
                anchorX="center"
                anchorY="middle"
                depthTest={false}
                renderOrder={2}
                transparent
                opacity={textOpacity}
                outlineWidth={0.05}
                outlineColor="#000000"
                outlineOpacity={0.5}
                backgroundColor={textBackgroundColor}
                backgroundOpacity={0.6}
                padding={0.2}
                data={relationType}
              >
                {relationType}
              </SmartOrientedText>
            )}
          </>
        )}
      </group>
    );
  }
);

AdvancedLinkAlt.displayName = "AdvancedLinkAlt";

// Composant pour le texte double face avec masque (sandwich)
const SmartOrientedText = ({
  position,
  linkDirection,
  children,
  ...textProps
}) => {
  // Calculer l'angle de la direction du lien dans le plan XY
  const linkAngle = Math.atan2(linkDirection.y, linkDirection.x);

  // Position des deux textes (plus décalés en Z pour éviter le z-fighting)
  const textOffset = 0.1;
  const position1 = [0, 0, textOffset];
  const position2 = [0, 0, -textOffset];

  // Rotations opposées pour les deux textes
  const rotation1 = [0, 0, linkAngle];
  const rotation2 = [0, 0, linkAngle + Math.PI]; // 180° de différence

  // Taille du masque plus généreuse
  const maskWidth = (textProps.fontSize || 1) * children.length * 1.2;
  const maskHeight = (textProps.fontSize || 1) * 2.0;

  return (
    <group position={position}>
      {/* Masque noir au centre (sandwich) - plus visible */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, linkAngle]}>
        <planeGeometry args={[maskWidth, maskHeight]} />
        <meshBasicMaterial
          color="#000000"
          transparent={false}
          depthTest={false}
          depthWrite={false}
          renderOrder={8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Premier texte - direction normale */}
      <Text
        position={position1}
        rotation={rotation1}
        {...textProps}
        renderOrder={10}
        depthTest={false}
      >
        {children}
      </Text>

      {/* Deuxième texte - direction opposée (180°) */}
      <Text
        position={position2}
        rotation={rotation2}
        {...textProps}
        renderOrder={10}
        depthTest={false}
      >
        {children}
      </Text>
    </group>
  );
};

export default AdvancedLinkAlt;
