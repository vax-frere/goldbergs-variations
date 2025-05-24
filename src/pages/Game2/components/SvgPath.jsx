import React, { useState, useEffect, useRef, useMemo } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import useAssets from "../hooks/useAssets";
import { useFrame } from "@react-three/fiber";

/**
 * Component to display SVG paths directly in 3D as outlines (no fill)
 * Uses Three.js SVGLoader to convert SVG paths to Three.js lines
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
 * @returns {JSX.Element}
 */
const SvgPath = ({
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
}) => {
  const [svgData, setSvgData] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const groupRef = useRef();

  // Utiliser notre service d'assets centralisé
  const assets = useAssets();

  // Cache local pour les données SVG (puisque getCustomData n'est pas disponible)
  // Utiliser un Map statique partagé entre tous les composants SvgPath
  const svgCache = useMemo(() => new Map(), []);

  // Essayer de charger le SVG par défaut si nécessaire
  const tryLoadDefault = (errorMessage) => {
    console.warn(`${errorMessage} - Utilisation du SVG par défaut`);

    // Ne pas essayer de charger le SVG par défaut si c'est déjà celui qu'on essaie de charger
    if (svgPath.includes("default.svg")) {
      setError(new Error("Échec du chargement du SVG par défaut"));
      setIsLoading(false);
      return;
    }

    const defaultSvgPath = "/img/default.svg";
    const loader = new SVGLoader();

    loader.load(
      defaultSvgPath,
      (data) => {
        if (data.paths && data.paths.length > 0) {
          processSvgData(data);
        } else {
          setError(
            new Error("Le SVG par défaut ne contient pas de chemins valides")
          );
          setIsLoading(false);
        }
      },
      undefined,
      (defaultError) => {
        console.error(
          "Erreur lors du chargement du SVG par défaut:",
          defaultError
        );
        setError(defaultError);
        setIsLoading(false);
      }
    );
  };

  // Fonction pour traiter les données SVG et calculer les dimensions
  const processSvgData = (data) => {
    try {
      // Calculate the dimensions of the SVG
      const box = new THREE.Box3();
      data.paths.forEach((path) => {
        path.subPaths.forEach((subPath) => {
          const points = subPath.getPoints();
          points.forEach((point) => {
            box.expandByPoint(point);
          });
        });
      });

      const svgWidth = box.max.x - box.min.x;
      const svgHeight = box.max.y - box.min.y;
      const aspectRatio = svgWidth / svgHeight;

      const dimensionsData = {
        width: svgWidth,
        height: svgHeight,
        center: box.getCenter(new THREE.Vector3()),
        aspectRatio,
      };

      // Mettre en cache les données localement
      svgCache.set(svgPath, {
        data: data,
        dimensions: dimensionsData,
      });

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

    // Vérifier si les données SVG sont déjà dans notre cache local
    if (svgCache.has(svgPath)) {
      console.log(`Utilisation du cache pour SVG: ${svgPath}`);
      const cached = svgCache.get(svgPath);
      setSvgData(cached.data);
      setDimensions(cached.dimensions);
      setIsLoading(false);
      return;
    }

    console.log(`Chargement SVG depuis: ${svgPath}`);

    // Charger et parser le SVG
    fetch(svgPath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.text();
      })
      .then((svgText) => {
        const loader = new SVGLoader();
        try {
          const data = loader.parse(svgText);
          // Vérifier que le SVG contient des chemins valides
          if (data.paths && data.paths.length > 0) {
            processSvgData(data);
          } else {
            throw new Error("Le SVG ne contient pas de chemins valides");
          }
        } catch (parseError) {
          console.error(`Erreur de parsing SVG: ${svgPath}`, parseError);
          if (onError) onError(parseError);
          tryLoadDefault(`Erreur lors du parsing du SVG ${svgPath}`);
        }
      })
      .catch((fetchError) => {
        console.error(`Erreur de chargement SVG: ${svgPath}`, fetchError);
        if (onError) onError(fetchError);
        tryLoadDefault(`Erreur lors du chargement du SVG ${svgPath}`);
      });
  }, [svgPath, assets.isReady, onError]);

  // Create a material for the lines
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      linewidth: lineWidth,
    });
  }, [color, opacity, lineWidth]);

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

  // Si en chargement ou si le service d'assets n'est pas prêt, ne rien rendre
  if (isLoading || !assets.isReady) {
    return null;
  }

  // Si erreur, rendre un cercle de secours
  if (error || !svgData) {
    return renderFallbackCircle();
  }

  // Scale factor to achieve the desired size
  const scaleFactor = size / dimensions.height;

  // Computed scale that accounts for the user's scale and the size parameter
  // Flip the Y axis to correct SVG orientation
  const computedScale = [
    scale[0] * scaleFactor,
    -scale[1] * scaleFactor, // Flip Y axis
    scale[2] * scaleFactor,
  ];

  // Offset to center the SVG
  const centerOffset = [-dimensions.center.x, -dimensions.center.y, 0];

  // Create the lines from the SVG paths
  const lines = svgData.paths.map((path, pathIndex) => {
    return path.subPaths.map((subPath, subPathIndex) => {
      const points = subPath.getPoints();
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const key = `path-${pathIndex}-subpath-${subPathIndex}`;

      return <line key={key} geometry={geometry} material={lineMaterial} />;
    });
  });

  // Render the SVG
  const svgContent = (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={computedScale}
    >
      <group position={centerOffset}>{lines}</group>
    </group>
  );

  // Use Billboard if needed
  return isBillboard ? <Billboard>{svgContent}</Billboard> : svgContent;
};

export default SvgPath;
