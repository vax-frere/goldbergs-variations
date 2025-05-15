import { useRef, useMemo, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Vector3 } from "three";

/**
 * Composant pour afficher un texte 3D qui disparaît progressivement quand on s'en approche
 * @param {Object} props - Propriétés du composant
 * @param {string} props.text - Le texte à afficher
 * @param {Array|Vector3} props.position - Position du texte dans l'espace [x, y, z]
 * @param {number} [props.maxDistance=600] - Distance maximale à laquelle le texte est complètement visible
 * @param {number} [props.minDistance=100] - Distance minimale à laquelle le texte devient complètement invisible
 * @param {number} [props.size=20] - Taille du texte
 * @param {string} [props.color="#ffffff"] - Couleur du texte
 * @param {string} [props.font="/fonts/Inter-Bold.woff"] - Chemin vers la police à utiliser
 * @param {boolean} [props.lookAtCamera=true] - Si true, le texte est toujours orienté vers la caméra
 */
export function Text3D({
  text,
  position,
  maxDistance = 600,
  minDistance = 100,
  size = 20,
  color = "#ffffff",
  font = "/fonts/Inter-Bold.woff",
  lookAtCamera = true,
}) {
  const textRef = useRef();
  const { camera } = useThree();

  // Convertir la position en Vector3 si c'est un tableau
  const positionVector = useMemo(() => {
    if (Array.isArray(position)) {
      return new Vector3(position[0], position[1], position[2]);
    }
    return position;
  }, [position]);

  // Calculer l'opacité basée sur la distance
  useFrame(() => {
    if (textRef.current && camera) {
      // Calculer la distance entre la caméra et le texte
      const distance = camera.position.distanceTo(positionVector);

      // Calculer l'opacité basée sur la distance
      // 1.0 lorsque distance >= maxDistance, 0.0 lorsque distance <= minDistance
      const opacity = Math.max(
        0,
        Math.min(1, (distance - minDistance) / (maxDistance - minDistance))
      );

      // Appliquer l'opacité
      if (textRef.current.material) {
        textRef.current.material.opacity = opacity;
      }

      // Orienter le texte vers la caméra si lookAtCamera est true
      if (lookAtCamera) {
        textRef.current.lookAt(camera.position);
      }
    }
  });

  return (
    <Text
      ref={textRef}
      position={
        Array.isArray(position)
          ? position
          : [position.x, position.y, position.z]
      }
      fontSize={size}
      color={color}
      anchorX="center"
      anchorY="middle"
      material-transparent={true}
      material-depthWrite={false}
      material-depthTest={true}
    >
      {text}
    </Text>
  );
}

export default Text3D;
