import React, { memo, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  useVibrationAnimation,
  precomputeVibrationStates,
  updateGeometryPositions,
  VIBRATION_PATTERNS,
} from "../../../utils/vibrationHelpers";

/**
 * Composant AdvancedVibLink - Version avec effet de vibration pour le mode avancé
 * Utilise les helpers de vibration pour un code plus maintenable
 */
const AdvancedVibLink = memo(
  ({
    sourceNode,
    targetNode,
    isDirect = true,
    vibrationIntensity = 0.15,
    vibrationSpeed = 1.0,
    segments = 5,
    statesCount = 4,
  }) => {
    // Références pour l'animation
    const lineRef = useRef();
    const arrow1Ref = useRef();
    const arrow2Ref = useRef();
    const vibrationStatesRef = useRef({
      line: [],
      arrow1: [],
      arrow2: [],
    });

    // Utiliser les helpers de vibration
    const { updateVibration } = useVibrationAnimation({
      vibrationSpeed,
      statesCount,
      baseFPS: 10,
    });

    // Calculer les données de base du lien
    const linkData = useMemo(() => {
      if (!sourceNode?.x || !targetNode?.x) {
        return null;
      }

      // Créer les vecteurs source et cible
      const srcVector = new THREE.Vector3(
        sourceNode.x,
        sourceNode.y,
        sourceNode.z || 0
      );
      const tgtVector = new THREE.Vector3(
        targetNode.x,
        targetNode.y,
        targetNode.z || 0
      );

      // Direction du lien (vecteur normalisé)
      const dir = new THREE.Vector3()
        .subVectors(tgtVector, srcVector)
        .normalize();

      // Décaler les points de départ et d'arrivée
      const sourceRadius = sourceNode.value || 10;
      const targetRadius = targetNode.value || 10;

      const srcWithOffset = new THREE.Vector3().addVectors(
        srcVector,
        dir.clone().multiplyScalar(sourceRadius)
      );
      const tgtWithOffset = new THREE.Vector3().addVectors(
        tgtVector,
        dir.clone().multiplyScalar(-targetRadius)
      );

      // Créer des points intermédiaires pour la ligne
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = new THREE.Vector3().lerpVectors(
          srcWithOffset,
          tgtWithOffset,
          t
        );
        points.push(point);
      }

      // Calculer les flèches
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3().crossVectors(dir, up).normalize();

      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      const arrowSize = 3.0;
      const arrowAngle = Math.PI / 6;

      const branch1Dir = new THREE.Vector3().copy(dir).negate();
      branch1Dir.applyAxisAngle(perpendicular, arrowAngle);

      const branch2Dir = new THREE.Vector3().copy(dir).negate();
      branch2Dir.applyAxisAngle(perpendicular, -arrowAngle);

      const branch1End = new THREE.Vector3()
        .copy(tgtWithOffset)
        .addScaledVector(branch1Dir, arrowSize);

      const branch2End = new THREE.Vector3()
        .copy(tgtWithOffset)
        .addScaledVector(branch2Dir, arrowSize);

      return {
        points,
        arrow1Points: [tgtWithOffset, branch1End],
        arrow2Points: [tgtWithOffset, branch2End],
      };
    }, [sourceNode, targetNode, segments]);

    // Pré-calculer les états de vibration avec les helpers
    useEffect(() => {
      if (!linkData) return;

      // Convertir les Vector3 en objets simples pour les helpers
      const convertPoints = (threePoints) =>
        threePoints.map((p) => ({ x: p.x, y: p.y, z: p.z }));

      const linePoints = convertPoints(linkData.points);
      const arrow1Points = convertPoints(linkData.arrow1Points);
      const arrow2Points = convertPoints(linkData.arrow2Points);

      // Pré-calculer avec les helpers - utiliser SPATIAL pour la 3D
      vibrationStatesRef.current = {
        line: precomputeVibrationStates(
          linePoints,
          vibrationIntensity,
          statesCount,
          VIBRATION_PATTERNS.SPATIAL
        ),
        arrow1: precomputeVibrationStates(
          arrow1Points,
          vibrationIntensity * 0.5, // Flèches moins intenses
          statesCount,
          VIBRATION_PATTERNS.SPATIAL
        ),
        arrow2: precomputeVibrationStates(
          arrow2Points,
          vibrationIntensity * 0.5, // Flèches moins intenses
          statesCount,
          VIBRATION_PATTERNS.SPATIAL
        ),
      };
    }, [linkData, vibrationIntensity, statesCount]);

    // Animation frame avec les helpers
    useFrame((state) => {
      if (!vibrationStatesRef.current.line.length) return;

      updateVibration(state.clock.getElapsedTime(), (currentState) => {
        // Mettre à jour la ligne principale
        if (lineRef.current) {
          const vibrationState = vibrationStatesRef.current.line[currentState];
          if (vibrationState) {
            updateGeometryPositions(
              lineRef.current.geometry,
              vibrationState,
              false
            );
          }
        }

        // Mettre à jour les flèches
        if (arrow1Ref.current) {
          const vibrationState =
            vibrationStatesRef.current.arrow1[currentState];
          if (vibrationState) {
            updateGeometryPositions(
              arrow1Ref.current.geometry,
              vibrationState,
              false
            );
          }
        }

        if (arrow2Ref.current) {
          const vibrationState =
            vibrationStatesRef.current.arrow2[currentState];
          if (vibrationState) {
            updateGeometryPositions(
              arrow2Ref.current.geometry,
              vibrationState,
              false
            );
          }
        }
      });
    });

    if (!linkData) {
      return null;
    }

    // Créer le matériau approprié selon le type de lien
    const lineMaterial = useMemo(() => {
      if (isDirect) {
        return (
          <lineBasicMaterial
            color="#ffffff"
            opacity={0.8}
            transparent
            linewidth={2}
            linecap="round"
            linejoin="round"
          />
        );
      } else {
        // Pour les lignes indirectes, on utilise une approche alternative
        // car lineDashedMaterial peut être problématique avec les géométries dynamiques
        return (
          <lineBasicMaterial
            color="#cccccc"
            opacity={0.6}
            transparent
            linewidth={1.5}
            linecap="round"
            linejoin="round"
          />
        );
      }
    }, [isDirect]);

    return (
      <group>
        {/* Ligne principale */}
        <line ref={lineRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linkData.points.length}
              array={
                new Float32Array(
                  linkData.points.flatMap((p) => [p.x, p.y, p.z])
                )
              }
              itemSize={3}
            />
          </bufferGeometry>
          {lineMaterial}
        </line>

        {/* Flèche 1 */}
        <line ref={arrow1Ref}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linkData.arrow1Points.length}
              array={
                new Float32Array(
                  linkData.arrow1Points.flatMap((p) => [p.x, p.y, p.z])
                )
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#ffffff"
            opacity={0.8}
            transparent
            linewidth={2}
            linecap="round"
            linejoin="round"
          />
        </line>

        {/* Flèche 2 */}
        <line ref={arrow2Ref}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={linkData.arrow2Points.length}
              array={
                new Float32Array(
                  linkData.arrow2Points.flatMap((p) => [p.x, p.y, p.z])
                )
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#ffffff"
            opacity={0.8}
            transparent
            linewidth={2}
            linecap="round"
            linejoin="round"
          />
        </line>
      </group>
    );
  }
);

AdvancedVibLink.displayName = "AdvancedVibLink";

export default AdvancedVibLink;
