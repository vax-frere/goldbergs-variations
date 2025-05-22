import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import useGameStore from "../store";
import { useFrame, useThree } from "@react-three/fiber";
import SvgPath from "./SvgPath";
import useAssets from "../../../hooks/useAssets";

/**
 * Composant affichant une image interactive qui peut déclencher le TextPanel
 * avec une bounding box pour la détection d'interaction
 */
const InteractiveImage = ({
  id,
  svgPath,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 300,
  title = "Joshua Goldberg",
  description = "Interactive element in the data universe",
  boundingBoxSize = 200,
  showBoundingBox = false, // Option pour afficher la boîte englobante (debug)
}) => {
  const { camera } = useThree();
  const groupRef = useRef();

  // Utiliser notre service d'assets
  const assets = useAssets();

  // Utiliser les fonctions et états du store dédiés aux éléments interactifs
  const setActiveInteractiveElement = useGameStore(
    (state) => state.setActiveInteractiveElement
  );
  const activeInteractiveElementId = useGameStore(
    (state) => state.activeInteractiveElementId
  );
  const activeClusterId = useGameStore((state) => state.activeClusterId);

  // État pour savoir si cet élément est actuellement actif
  const isActive = activeInteractiveElementId === id;

  // Référence pour le point de détection
  const detectionPointRef = useRef(new THREE.Vector3());

  // Référence pour le dernier état d'activation
  const lastActiveStateRef = useRef(false);

  // Ajouter un état local pour limiter la fréquence des mises à jour
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const throttleTime = 100; // 100ms entre les vérifications

  // Vecteur directionnel pour les calculs
  const directionVector = new THREE.Vector3();

  // Demi-taille de la bounding box
  const halfSize = boundingBoxSize / 2;

  // Définir les limites de la bounding box
  const boundingBox = useMemo(() => {
    return {
      min: {
        x: position[0] - halfSize,
        y: position[1] - halfSize,
        z: position[2] - halfSize,
      },
      max: {
        x: position[0] + halfSize,
        y: position[1] + halfSize,
        z: position[2] + halfSize,
      },
      center: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
    };
  }, [position, halfSize]);

  // Créer les lignes pour la bounding box
  const boundingBoxLines = useMemo(() => {
    if (!showBoundingBox) return null;

    const { min, max } = boundingBox;

    // Définir les 8 sommets de la boîte
    const vertices = [
      // Face avant (en z)
      [min.x, min.y, min.z],
      [max.x, min.y, min.z],
      [max.x, max.y, min.z],
      [min.x, max.y, min.z],
      // Face arrière (en z)
      [min.x, min.y, max.z],
      [max.x, min.y, max.z],
      [max.x, max.y, max.z],
      [min.x, max.y, max.z],
    ];

    // Définir les 12 arêtes de la boîte
    const edges = [
      // Face avant
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      // Face arrière
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      // Connexions entre les faces
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    return edges.map((edge, i) => {
      const start = vertices[edge[0]];
      const end = vertices[edge[1]];

      // Créer un tableau de points pour cette ligne
      const points = [
        new THREE.Vector3(start[0], start[1], start[2]),
        new THREE.Vector3(end[0], end[1], end[2]),
      ];

      // Créer une géométrie à partir des points
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // Créer un matériau pour la ligne via notre service d'assets
      const materialId = `bbox-line-material-${id}`;

      if (assets.isReady) {
        assets.createMaterial(materialId, () => {
          return new THREE.LineBasicMaterial({
            color: "#00ff00",
            transparent: true,
            opacity: 0.3,
            linewidth: 1,
          });
        });
      }

      const material = assets.getMaterial(materialId);

      if (!material) {
        return null;
      }

      return (
        <line key={`bbox-line-${i}`} geometry={geometry}>
          <primitive object={material} />
        </line>
      );
    });
  }, [showBoundingBox, boundingBox, assets.isReady, id]);

  // Fonction pour calculer le point de détection devant la caméra
  const calculateDetectionPoint = useCallback((camera) => {
    // Récupérer la direction dans laquelle la caméra regarde
    directionVector.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // Calculer le point à 100 unités devant la caméra
    return new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(directionVector, 100);
  }, []);

  // Fonction pour vérifier si un point est à l'intérieur de la bounding box
  const isPointInBoundingBox = useCallback(
    (point) => {
      // Vérification de sécurité
      if (!point || !boundingBox) return false;

      return (
        point.x >= boundingBox.min.x &&
        point.x <= boundingBox.max.x &&
        point.y >= boundingBox.min.y &&
        point.y <= boundingBox.max.y &&
        point.z >= boundingBox.min.z &&
        point.z <= boundingBox.max.z
      );
    },
    [boundingBox]
  );

  // Fonction pour mettre à jour l'état d'activation
  const updateActivationState = useCallback(() => {
    // Ne pas faire la détection si un cluster est actif
    if (activeClusterId !== null) {
      if (isActive) {
        setActiveInteractiveElement(null, null, null);
        console.log("InteractiveImage: désactivation car un cluster est actif");
      }
      return;
    }

    // Calculer le point de détection
    const detectionPoint = calculateDetectionPoint(camera);
    detectionPointRef.current = detectionPoint;

    // Vérifier si le point de détection est dans la bounding box
    const pointIsInBox = isPointInBoundingBox(detectionPoint);

    // Mettre à jour seulement si l'état a changé
    if (pointIsInBox !== lastActiveStateRef.current) {
      lastActiveStateRef.current = pointIsInBox;

      if (pointIsInBox) {
        // Préparer les données de l'élément pour le store
        const elementData = {
          id,
          title,
          description,
        };

        // Activer l'élément interactif
        console.log(`InteractiveImage: activation de ${id} - ${title}`);
        setActiveInteractiveElement(id, "image", elementData);
      } else if (isActive) {
        // Désactiver l'élément seulement si c'est celui-ci qui est actif
        console.log(`InteractiveImage: désactivation de ${id}`);
        setActiveInteractiveElement(null, null, null);
      }
    }
  }, [
    id,
    title,
    description,
    isActive,
    activeClusterId,
    camera,
    setActiveInteractiveElement,
    isPointInBoundingBox,
    calculateDetectionPoint,
  ]);

  // Mettre à jour l'état à chaque frame avec limitation de fréquence
  useFrame(() => {
    if (!assets.isReady) return;

    const now = Date.now();

    // Limiter la fréquence des vérifications pour les performances
    if (now - lastCheckTime < throttleTime) {
      return;
    }

    setLastCheckTime(now);
    updateActivationState();
  });

  // Assurer le nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      // Si cet élément est actif lors du démontage, le désactiver
      if (activeInteractiveElementId === id) {
        setActiveInteractiveElement(null, null, null);
      }
    };
  }, [id, activeInteractiveElementId, setActiveInteractiveElement]);

  // Si le service d'assets n'est pas prêt, ne rien afficher
  if (!assets.isReady) {
    return null;
  }

  // Récupérer le chemin de l'image SVG depuis le service d'assets si nécessaire
  const resolvedSvgPath = assets.getImagePath(svgPath) || svgPath;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Image SVG */}
      <SvgPath
        svgPath={resolvedSvgPath}
        size={size}
        position={[0, 0, 0]}
        isBillboard={false}
        opacity={1}
        color={isActive ? "#white" : "white"} // Changer la couleur quand actif
        lineWidth={isActive ? 3 : 2} // Ligne plus épaisse quand actif
      />

      {/* Bounding box uniquement en mode debug */}
      {showBoundingBox && assets.isReady && <group>{boundingBoxLines}</group>}
    </group>
  );
};

export default InteractiveImage;
