import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { getOrCreateGeometry, getOrCreateMaterial } from "../cache";

/**
 * Composant pour visualiser les boîtes englobantes des clusters en mode débogage
 * Version optimisée pour éviter le flickering
 */
const BoundingBoxDebug = ({
  nodes,
  boundingBoxes,
  activeClusterId,
  show = true,
  boundingBoxExpansion = 20,
}) => {
  // Références pour les objets 3D
  const sphereRef = useRef();
  const linesRef = useRef({});
  const groupRef = useRef();

  // Référence pour le vecteur de direction (réutilisée à chaque frame)
  const directionVector = useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const detectionPoint = useMemo(() => new THREE.Vector3(), []);

  // État pour le point de détection et sa position cible
  const [prevActiveId, setPrevActiveId] = useState(null);

  // Constantes
  const DETECTION_DISTANCE = 100;
  const TRANSITION_SPEED = 0.1; // Vitesse de transition (0-1)

  // Accès à la caméra
  const { camera } = useThree();

  // Matériau partagé pour la sphère de détection
  const sphereMaterial = useMemo(() => {
    return getOrCreateMaterial(
      "debug-sphere",
      () =>
        new THREE.MeshBasicMaterial({
          color: "red",
          transparent: true,
          opacity: 0.8,
          depthTest: false,
        })
    );
  }, []);

  // Géométrie partagée pour la sphère de détection
  const sphereGeometry = useMemo(() => {
    return getOrCreateGeometry(
      "debug-sphere",
      () => new THREE.SphereGeometry(1, 8, 8)
    );
  }, []);

  // Effet pour suivre les changements de l'ID de cluster actif
  useEffect(() => {
    if (activeClusterId !== prevActiveId) {
      setPrevActiveId(activeClusterId);
    }
  }, [activeClusterId, prevActiveId]);

  // Mettre à jour la position du point de détection à chaque frame avec interpolation
  useFrame(() => {
    if (!show || !sphereRef.current) return;

    // Réutiliser le vecteur de direction pour éviter les allocations mémoire
    directionVector.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // Calculer la nouvelle position du point de détection
    detectionPoint
      .copy(camera.position)
      .addScaledVector(directionVector, DETECTION_DISTANCE);

    // Appliquer une interpolation pour une transition en douceur
    sphereRef.current.position.lerp(detectionPoint, 0.5);

    // Mettre à jour les opacités des lignes pour les transitions en douceur
    if (linesRef.current) {
      Object.entries(linesRef.current).forEach(([clusterId, materials]) => {
        const isActive = clusterId === activeClusterId;
        const targetOpacity = isActive ? 0.8 : 0.2;
        const targetWidth = isActive ? 2 : 1;

        materials.forEach((material) => {
          // Transition en douceur de l'opacité
          material.opacity = THREE.MathUtils.lerp(
            material.opacity,
            targetOpacity,
            TRANSITION_SPEED
          );

          // Transition en douceur de la largeur de ligne (si le matériau le supporte)
          if (material.linewidth !== undefined) {
            material.linewidth = THREE.MathUtils.lerp(
              material.linewidth || 1,
              targetWidth,
              TRANSITION_SPEED
            );
          }
        });
      });
    }
  });

  // Générer les lignes pour chaque boîte englobante une seule fois
  const boxLines = useMemo(() => {
    if (!show || !boundingBoxes || Object.keys(boundingBoxes).length === 0) {
      return null;
    }

    return Object.entries(boundingBoxes).map(([clusterId, box]) => {
      // Initialiser le tableau de matériaux pour ce cluster s'il n'existe pas
      if (!linesRef.current[clusterId]) {
        linesRef.current[clusterId] = [];
      }

      // Définir la couleur de base en fonction du statut
      const color = clusterId === activeClusterId ? "#ff0000" : "#00ff00";
      const opacity = clusterId === activeClusterId ? 0.8 : 0.2;

      // Créer les points pour les arêtes de la boîte
      const { min, max } = box;

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

      // Convertir les arêtes en points pour le composant Line
      const lines = edges.map(([a, b], i) => {
        // Créer des points Three.js persistants
        const points = [
          [vertices[a][0], vertices[a][1], vertices[a][2]],
          [vertices[b][0], vertices[b][1], vertices[b][2]],
        ];

        return (
          <Line
            key={`${clusterId}-line-${i}`}
            points={points}
            color={color}
            lineWidth={clusterId === activeClusterId ? 2 : 1}
            opacity={opacity}
            transparent
            ref={(ref) => {
              if (ref?.material) {
                // Stocker le matériau dans la référence pour les animations
                if (!linesRef.current[clusterId].includes(ref.material)) {
                  linesRef.current[clusterId].push(ref.material);
                }
              }
            }}
          />
        );
      });

      return <group key={clusterId}>{lines}</group>;
    });
  }, [boundingBoxes, show]); // Notez l'absence de activeClusterId dans les dépendances

  if (!show) return null;

  return (
    <group ref={groupRef}>
      {boxLines}

      {/* Point de détection comme une sphère rouge avec matériau et géométrie partagés */}
      <mesh ref={sphereRef} renderOrder={1000}>
        <primitive object={sphereGeometry} attach="geometry" />
        <primitive object={sphereMaterial} attach="material" />
      </mesh>
    </group>
  );
};

// Composant wrapper qui obtient les données de boundingBoxes et activeClusterId
const BoundingBoxDebugWrapper = ({
  nodes,
  show = true,
  boundingBoxExpansion = 20,
}) => {
  // State pour éviter la recréation des boîtes englobantes à chaque rendu
  const [boxData, setBoxData] = useState({
    boundingBoxes: {},
    activeClusterId: null,
  });

  // Référence pour la dernière mise à jour
  const lastUpdateRef = useRef(0);

  // Utiliser une fonction directe pour calculer les boîtes englobantes
  useEffect(() => {
    if (!nodes || !show) return;

    // Importer de manière dynamique pour éviter les dépendances circulaires
    import("../utils").then(({ calculateClusterBoundingBoxes }) => {
      // Calculer les boîtes englobantes une seule fois avec l'expansion
      const { boundingBoxes } = calculateClusterBoundingBoxes(nodes, true);

      // Appliquer l'expansion des boîtes englobantes
      if (boundingBoxExpansion > 0) {
        Object.values(boundingBoxes).forEach((box) => {
          const expandX = box.size.x * (boundingBoxExpansion / 100);
          const expandY = box.size.y * (boundingBoxExpansion / 100);
          const expandZ = box.size.z * (boundingBoxExpansion / 100);

          box.min.x -= expandX;
          box.min.y -= expandY;
          box.min.z -= expandZ;

          box.max.x += expandX;
          box.max.y += expandY;
          box.max.z += expandZ;

          // Recalculer le centre et la taille après expansion
          box.center = {
            x: (box.min.x + box.max.x) / 2,
            y: (box.min.y + box.max.y) / 2,
            z: (box.min.z + box.max.z) / 2,
          };

          box.size = {
            x: box.max.x - box.min.x,
            y: box.max.y - box.min.y,
            z: box.max.z - box.min.z,
          };
        });
      }

      setBoxData((prev) => ({ ...prev, boundingBoxes }));
    });
  }, [nodes, show, boundingBoxExpansion]);

  // Gérer l'ID du cluster actif à partir du store
  useEffect(() => {
    if (!show) return;

    // Importer de manière dynamique pour éviter les dépendances circulaires
    import("../store").then((module) => {
      const unsubscribe = module.default.subscribe(
        (state) => state.activeClusterId,
        (activeClusterId) => {
          // Limiter la fréquence des mises à jour (throttling)
          const now = Date.now();
          if (now - lastUpdateRef.current > 100) {
            // 100ms entre les mises à jour
            setBoxData((prev) => ({ ...prev, activeClusterId }));
            lastUpdateRef.current = now;
          }
        }
      );

      return unsubscribe;
    });
  }, [show]);

  return (
    <BoundingBoxDebug
      nodes={nodes}
      boundingBoxes={boxData.boundingBoxes}
      activeClusterId={boxData.activeClusterId}
      show={show}
      boundingBoxExpansion={boundingBoxExpansion}
    />
  );
};

export default BoundingBoxDebugWrapper;
