import React, { useState, useEffect, useRef, useMemo } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import useAssets from "../hooks/useAssets";

// Créer un cache pour les matériaux par couleur et opacité
const materialCache = new Map();

const getMaterial = (color, opacity, lineWidth) => {
  const key = `${color}-${opacity}-${lineWidth}`;
  if (!materialCache.has(key)) {
    materialCache.set(
      key,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        linewidth: lineWidth,
      })
    );
  }
  return materialCache.get(key);
};

const VIBRATION_STATES = 8; // Nombre d'états de vibration pré-calculés

/**
 * Component to display SVG paths directly in 3D as outlines with vibration effect
 * Uses Three.js SVGLoader to convert SVG paths to Three.js lines
 * Adds vibration effect to the points
 *
 * @param {Object} props - Component properties
 * @param {string} props.svgPath - Path to the SVG file
 * @param {number} props.size - Size of the SVG (default: 100)
 * @param {Array<number>} props.position - Position [x, y, z] of the SVG (default: [0, 0, 0])
 * @param {boolean} props.isBillboard - If true, the SVG always faces the camera (default: true)
 * @param {number} props.opacity - Opacity of the SVG (default: 1)
 * @param {Array<number>} props.rotation - Rotation [x, y, z] of the SVG (default: [0, 0, 0])
 * @param {Array<number>} props.scale - Scale [x, y, z] of the SVG (default: [1, 1, 1])
 * @param {string} props.color - Color of the SVG paths (default: "white")
 * @param {number} props.lineWidth - Width of the outline (default: 1)
 * @param {Function} props.onError - Callback function called when SVG loading fails
 * @param {number} props.vibrationIntensity - Intensity of the vibration effect (default: 0.1)
 * @param {number} props.vibrationSpeed - Speed of the vibration effect (default: 1)
 * @returns {JSX.Element}
 */
const VibSvgPath = ({
  svgPath,
  size = 100,
  position = [0, 0, 0],
  isBillboard = true,
  opacity = 1,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  color = "white",
  lineWidth = 1,
  onError = null,
  vibrationIntensity = 0.1,
  vibrationSpeed = 1,
}) => {
  const [svgData, setSvgData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const groupRef = useRef();
  const geometriesRef = useRef([]);
  const originalPointsRef = useRef([]);
  const vibratingStatesRef = useRef([]); // Stockage des états pré-calculés
  const precomputedGeometriesRef = useRef([]);

  // Utiliser notre service d'assets centralisé
  const assets = useAssets();

  // Utiliser le matériau partagé
  const lineMaterial = useMemo(
    () => getMaterial(color, opacity, lineWidth),
    [color, opacity, lineWidth]
  );

  // Références pour les optimisations
  const tempVector = new THREE.Vector3();
  const tempBox = new THREE.Box3();
  const positionsArrayRef = useRef(null);
  const maxPointsRef = useRef(0);

  // Fonction pour s'assurer que le buffer de positions est assez grand
  const ensurePositionsCapacity = (requiredSize) => {
    if (
      !positionsArrayRef.current ||
      positionsArrayRef.current.length < requiredSize
    ) {
      // Arrondir à la puissance de 2 supérieure pour éviter trop de réallocations
      const newSize = Math.pow(2, Math.ceil(Math.log2(requiredSize)));
      positionsArrayRef.current = new Float32Array(newSize);
      maxPointsRef.current = Math.floor(newSize / 3);
    }
  };

  // Réinitialiser les références quand le composant est démonté
  useEffect(() => {
    return () => {
      geometriesRef.current = [];
      originalPointsRef.current = [];
      precomputedGeometriesRef.current.forEach((geometry) => {
        if (geometry) {
          geometry.dispose();
        }
      });
      precomputedGeometriesRef.current = [];
      positionsArrayRef.current = null;
      maxPointsRef.current = 0;
    };
  }, []);

  // Fonction pour pré-calculer les états de vibration
  const precomputeVibrationStates = (originalPoints, intensity) => {
    const states = [];
    const geometries = [];

    for (let stateIndex = 0; stateIndex < VIBRATION_STATES; stateIndex++) {
      const statePositions = originalPoints.map((point) => {
        const direction = Math.floor(Math.random() * 4);
        const displacement = intensity * (Math.random() > 0.5 ? 1 : -1);

        switch (direction) {
          case 0: // Horizontal
            return { x: point.x + displacement, y: point.y };
          case 1: // Vertical
            return { x: point.x, y: point.y + displacement };
          case 2: // Diagonal haut-droite/bas-gauche
            return {
              x: point.x + displacement * 0.7,
              y: point.y + displacement * 0.7,
            };
          case 3: // Diagonal haut-gauche/bas-droite
            return {
              x: point.x + displacement * 0.7,
              y: point.y - displacement * 0.7,
            };
          default:
            return point;
        }
      });
      states.push(statePositions);
    }

    // On ne pré-calcule plus les géométries ici
    return states;
  };

  // Optimiser l'animation frame
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 1000 / 15;
  const currentStateRef = useRef(0);

  useFrame((state) => {
    if (!geometriesRef.current || !vibratingStatesRef.current.length) return;

    const now = state.clock.getElapsedTime() * 1000;
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) return;
    lastUpdateRef.current = now;

    currentStateRef.current = (currentStateRef.current + 1) % VIBRATION_STATES;
    const currentState = currentStateRef.current;

    geometriesRef.current.forEach((geometry, geoIndex) => {
      if (!geometry?.attributes?.position) return;

      const vibrationState =
        vibratingStatesRef.current[geoIndex]?.[currentState];
      if (!vibrationState) return;

      const positions = geometry.attributes.position.array;
      const positionsBuffer = positionsArrayRef.current;

      // Utiliser notre buffer pré-alloué comme espace de travail temporaire
      for (
        let i = 0;
        i < positions.length && i / 3 < vibrationState.length;
        i += 3
      ) {
        const point = vibrationState[i / 3];
        positionsBuffer[i] = point.x;
        positionsBuffer[i + 1] = point.y;
        positionsBuffer[i + 2] = positions[i + 2]; // Garder la coordonnée Z
      }

      // Copier en une seule fois avec TypedArray.set
      positions.set(positionsBuffer.subarray(0, positions.length));
      geometry.attributes.position.needsUpdate = true;
    });
  });

  // Modifier processSvgData pour utiliser les objets réutilisables
  const processSvgData = (data) => {
    try {
      tempBox.makeEmpty();
      const allPoints = [];
      const allVibrationStates = [];
      let totalPoints = 0;

      data.paths.forEach((path) => {
        path.subPaths.forEach((subPath) => {
          const points = subPath.getPoints();
          if (points && points.length > 0) {
            totalPoints += points.length;
            const pointsCopy = points.map((p) => {
              tempVector.set(p.x, p.y, 0);
              tempBox.expandByPoint(tempVector);
              return { x: p.x, y: p.y };
            });
            allPoints.push(pointsCopy);

            // Pré-calculer les états de vibration pour ce sous-chemin
            allVibrationStates.push(
              precomputeVibrationStates(pointsCopy, vibrationIntensity)
            );
          }
        });
      });

      // S'assurer que notre buffer est assez grand
      ensurePositionsCapacity(totalPoints * 3);

      originalPointsRef.current = allPoints;
      vibratingStatesRef.current = allVibrationStates;

      const svgWidth = tempBox.max.x - tempBox.min.x;
      const svgHeight = tempBox.max.y - tempBox.min.y;
      const aspectRatio = svgWidth / svgHeight;

      const dimensionsData = {
        width: svgWidth,
        height: svgHeight,
        center: tempBox.getCenter(tempVector),
        aspectRatio,
      };

      setSvgData(data);
      setDimensions(dimensionsData);
      setIsLoading(false);
    } catch (err) {
      console.error("Erreur lors du traitement des données SVG:", err);
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!assets.isReady || !svgPath) return;

    setIsLoading(true);
    setError(null);
    geometriesRef.current = [];
    originalPointsRef.current = [];

    // Fonction asynchrone pour charger et traiter le SVG
    const loadSvg = async () => {
      const svgFileName = svgPath;
      const svgTexture = assets.getTexture(svgFileName);
      const loader = new SVGLoader();

      if (svgTexture) {
        try {
          const response = await fetch(svgTexture.source.data.src);
          const svgText = await response.text();
          const data = loader.parse(svgText);

          if (data.paths && data.paths.length > 0) {
            processSvgData(data);
            return;
          }
        } catch (parseError) {
          console.error("[VibSvgPath] Erreur de parsing SVG:", parseError);
          if (onError) onError(parseError);
        }
      }

      // Fallback to default SVG
      if (svgFileName !== "default.svg") {
        const defaultTexture = assets.getTexture("default.svg");
        if (defaultTexture) {
          try {
            const defaultResponse = await fetch(defaultTexture.source.data.src);
            const defaultSvgText = await defaultResponse.text();
            const defaultData = loader.parse(defaultSvgText);

            if (defaultData.paths && defaultData.paths.length > 0) {
              processSvgData(defaultData);
              return;
            }
          } catch (defaultError) {
            console.error(
              "[VibSvgPath] Erreur avec le SVG par défaut:",
              defaultError
            );
          }
        }
      }

      setError(new Error("Impossible de charger le SVG"));
      setIsLoading(false);
      if (onError) onError(new Error("Impossible de charger le SVG"));
    };

    loadSvg();
  }, [svgPath, assets.isReady, onError]);

  // Rendu d'un cercle de secours en cas d'erreur
  const renderFallbackCircle = () => {
    const circleSegments = 32;
    const circleGeometry = new THREE.CircleGeometry(size / 2, circleSegments);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    const fallbackContent = (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh geometry={circleGeometry} material={circleMaterial} />
      </group>
    );

    return isBillboard ? (
      <Billboard>{fallbackContent}</Billboard>
    ) : (
      fallbackContent
    );
  };

  if (isLoading || !assets.isReady) {
    return null;
  }

  if (error || !svgData) {
    return renderFallbackCircle();
  }

  const scaleFactor = size / dimensions.height;
  const computedScale = [
    scale[0] * scaleFactor,
    -scale[1] * scaleFactor,
    scale[2] * scaleFactor,
  ];
  const centerOffset = [-dimensions.center.x, -dimensions.center.y, 0];

  // Réinitialiser les références avant de créer les nouvelles lignes
  geometriesRef.current = [];

  // Create the lines from the SVG paths with vibration effect
  const lines = svgData.paths.map((path, pathIndex) => {
    return path.subPaths.map((subPath, subPathIndex) => {
      const points = subPath.getPoints();
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const key = `path-${pathIndex}-subpath-${subPathIndex}`;

      // Store geometry reference for animation
      geometriesRef.current.push(geometry);

      return <line key={key} geometry={geometry} material={lineMaterial} />;
    });
  });

  const content = (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={computedScale}
    >
      <group position={centerOffset}>{lines}</group>
    </group>
  );

  return isBillboard ? <Billboard>{content}</Billboard> : content;
};

// Nettoyer le cache quand le module est déchargé
window.addEventListener("beforeunload", () => {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
});

export default React.memo(VibSvgPath);
