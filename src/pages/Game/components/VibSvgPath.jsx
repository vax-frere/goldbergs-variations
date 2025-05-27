import React, { useState, useEffect, useRef, useMemo } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import useAssets from "../hooks/useAssets";
import {
  useVibrationAnimation,
  precomputeVibrationStates,
  updateGeometryPositions,
  VIBRATION_PATTERNS,
} from "../utils/vibrationHelpers";

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

/**
 * Component to display SVG paths directly in 3D as outlines with vibration effect
 * Uses Three.js SVGLoader to convert SVG paths to Three.js lines
 * Adds vibration effect to the points using vibration helpers
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
 * @param {number} props.resolution - Resolution for SVG curves (default: 6)
 * @param {number} props.statesCount - Number of vibration states to pre-compute (default: 8)
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
  resolution = 6,
  statesCount = 8,
}) => {
  const [svgData, setSvgData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const groupRef = useRef();
  const geometriesRef = useRef([]);
  const originalPointsRef = useRef([]);
  const vibrationStatesRef = useRef([]);

  // Utiliser notre service d'assets centralisé
  const assets = useAssets();

  // Utiliser le matériau partagé
  const lineMaterial = useMemo(
    () => getMaterial(color, opacity, lineWidth),
    [color, opacity, lineWidth]
  );

  // Utiliser les helpers de vibration
  const { updateVibration } = useVibrationAnimation({
    vibrationSpeed,
    statesCount,
    baseFPS: 10,
  });

  // Références pour les optimisations
  const tempVector = new THREE.Vector3();
  const tempBox = new THREE.Box3();

  // Réinitialiser les références quand le composant est démonté
  useEffect(() => {
    return () => {
      geometriesRef.current = [];
      originalPointsRef.current = [];
      vibrationStatesRef.current = [];
    };
  }, []);

  // Animation frame avec les helpers
  useFrame((state) => {
    if (!geometriesRef.current.length || !vibrationStatesRef.current.length)
      return;

    updateVibration(state.clock.getElapsedTime(), (currentState) => {
      geometriesRef.current.forEach((geometry, geoIndex) => {
        const vibrationState =
          vibrationStatesRef.current[geoIndex]?.[currentState];
        if (vibrationState) {
          updateGeometryPositions(geometry, vibrationState, true); // preserveZ for 2D SVG
        }
      });
    });
  });

  // Modifier processSvgData pour utiliser les helpers
  const processSvgData = (data) => {
    try {
      tempBox.makeEmpty();
      const allPoints = [];
      const allVibrationStates = [];

      data.paths.forEach((path) => {
        path.subPaths.forEach((subPath) => {
          const points = subPath.getPoints(resolution);
          if (points && points.length > 0) {
            const pointsCopy = points.map((p) => {
              tempVector.set(p.x, p.y, 0);
              tempBox.expandByPoint(tempVector);
              return { x: p.x, y: p.y };
            });
            allPoints.push(pointsCopy);

            // Utiliser le helper pour pré-calculer les états de vibration
            allVibrationStates.push(
              precomputeVibrationStates(
                pointsCopy,
                vibrationIntensity,
                statesCount,
                VIBRATION_PATTERNS.PLANAR
              )
            );
          }
        });
      });

      originalPointsRef.current = allPoints;
      vibrationStatesRef.current = allVibrationStates;

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
    vibrationStatesRef.current = [];

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
  }, [svgPath, assets.isReady, onError, vibrationIntensity, statesCount]);

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
      const points = subPath.getPoints(resolution);
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
