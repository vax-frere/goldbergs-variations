import { useRef, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import { Vector3 } from "three";

// Créer une instance de Vector3 réutilisable pour éviter les allocations dans la boucle d'animation
const tempVec = new Vector3();

/**
 * Composant pour afficher un texte 3D qui réagit à la distance de la caméra
 * Optimisé pour les performances en évitant les setState dans la boucle d'animation
 * @param {Object} props - Propriétés du composant
 * @param {string} props.text - Le texte à afficher
 * @param {Array|Vector3} props.position - Position du texte dans l'espace [x, y, z]
 * @param {number} [props.maxDistance=600] - Distance maximale à laquelle le texte est complètement visible (ou invisible si reverseOpacity=true)
 * @param {number} [props.minDistance=100] - Distance minimale à laquelle le texte devient complètement invisible (ou visible si reverseOpacity=true)
 * @param {number} [props.size=20] - Taille du texte
 * @param {number} [props.minSize=6] - Taille minimale du texte
 * @param {number} [props.maxSize=20] - Taille maximale du texte
 * @param {string} [props.color="#ffffff"] - Couleur du texte
 * @param {boolean} [props.reverseOpacity=false] - Si true, inverse la logique d'opacité (visible de près, invisible de loin)
 * @param {boolean} [props.outline=false] - Si true, ajoute un liseret autour du texte
 * @param {number} [props.outlineWidth=0.5] - Épaisseur du liseret
 * @param {string} [props.outlineColor="#000000"] - Couleur du liseret
 * @param {boolean} [props.dynamicSize=false] - Nouvelle prop pour activer/désactiver le comportement dynamique
 */
export function CustomText({
  text,
  position,
  maxDistance = 600,
  minDistance = 100,
  size = 20,
  minSize = 6,
  maxSize = 20,
  color = "#ffffff",
  reverseOpacity = false,
  outline = true,
  outlineWidth = 1.0,
  outlineColor = "#000000",
  dynamicSize = false,
}) {
  const groupRef = useRef();
  const textRef = useRef();
  const { camera } = useThree();

  // Mémoriser les valeurs qui ne changent pas pour éviter les recalculs
  const propSettings = useMemo(
    () => ({
      reverseOpacity,
      minDistance,
      maxDistance,
      minSize,
      maxSize,
      size,
      dynamicSize,
      position: Array.isArray(position)
        ? new Vector3(position[0], position[1], position[2])
        : position,
    }),
    [
      reverseOpacity,
      minDistance,
      maxDistance,
      minSize,
      maxSize,
      size,
      dynamicSize,
      position,
    ]
  );

  // Calculer et appliquer l'opacité et la taille basées sur la distance à chaque frame
  useFrame(() => {
    if (!textRef.current || !groupRef.current || !camera) return;

    // Récupérer les paramètres mémorisés
    const {
      reverseOpacity,
      minDistance,
      maxDistance,
      minSize,
      maxSize,
      size,
      dynamicSize,
      position: positionVector,
    } = propSettings;

    // Calculer la distance entre la caméra et le texte
    const distance = camera.position.distanceTo(positionVector);

    // Calculer l'opacité cible basée sur la distance
    let targetOpacity;

    if (reverseOpacity) {
      // Logique inversée: visible de près, invisible de loin
      targetOpacity =
        distance <= minDistance
          ? 1
          : distance >= maxDistance
          ? 0
          : Math.max(
              0,
              1 - (distance - minDistance) / (maxDistance - minDistance)
            );
    } else {
      // Logique standard: visible de loin, invisible de près
      targetOpacity =
        distance >= maxDistance
          ? 1
          : distance <= minDistance
          ? 0
          : Math.max(0, (distance - minDistance) / (maxDistance - minDistance));
    }

    // Calculer la taille du texte en fonction de la distance si dynamicSize est activé
    const targetSize = dynamicSize
      ? Math.max(
          minSize,
          Math.min(
            maxSize,
            minSize +
              ((distance - minDistance) / (maxDistance - minDistance)) *
                (maxSize - minSize)
          )
        )
      : size;

    // Mise à jour de la visibilité et de la taille
    groupRef.current.visible = targetOpacity > 0.01;
    if (textRef.current) {
      textRef.current.fontSize = targetSize;
    }

    // Appliquer l'opacité directement au matériau sans passer par setState
    if (textRef.current.material) {
      // Traiter les cas où le matériau est un tableau ou un seul matériau
      if (Array.isArray(textRef.current.material)) {
        textRef.current.material.forEach((mat) => {
          mat.opacity = targetOpacity;
          // Pas besoin de vérifier visible car le parent groupRef gère déjà ça
          mat.needsUpdate = true;
        });
      } else {
        textRef.current.material.opacity = targetOpacity;
        textRef.current.material.needsUpdate = true;
      }
    }

    // Gérer l'opacité du contour
    const outlineOpacity = targetOpacity > 0.1 ? 1 : targetOpacity * 10;
    if (textRef.current.outlineMaterial) {
      textRef.current.outlineMaterial.opacity = outlineOpacity;
    }
  });

  return (
    <Billboard
      ref={groupRef}
      position={
        Array.isArray(position)
          ? position
          : [position.x, position.y, position.z]
      }
    >
      <Text
        ref={textRef}
        fontSize={size}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={outline ? outlineWidth : 0}
        outlineColor={outlineColor}
        material-transparent={true}
        material-depthWrite={false}
        material-depthTest={true}
        material-alphaTest={0.01}
      >
        {text}
      </Text>
    </Billboard>
  );
}

export default CustomText;
