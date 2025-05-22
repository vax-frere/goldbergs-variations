import { useState, useEffect, useRef } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import { useTextures } from "./TexturePreloader";
import { urlToTextureId } from "../utils/textureUtils";

// Cache local pour stocker les données SVG parsées
// Cela permet de ne pas parser plusieurs fois le même SVG
const svgDataCache = new Map();

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

  // Récupérer les textures depuis le système de cache
  const { textures, loaded } = useTextures();

  // Extraire l'ID de texture à partir du chemin
  const textureId = urlToTextureId(svgPath);

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

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Vérifier si les données SVG sont déjà en cache
    if (svgDataCache.has(svgPath)) {
      console.log(`Utilisation du cache pour SVG: ${svgPath}`);
      const cachedData = svgDataCache.get(svgPath);
      setSvgData(cachedData.data);
      setDimensions(cachedData.dimensions);
      setIsLoading(false);
      return;
    }

    // Si la texture est chargée dans le système centralisé, l'utiliser comme source
    // sinon, charger directement le SVG
    if (loaded && textures[textureId]) {
      console.log(`Texture SVG trouvée dans le cache central: ${textureId}`);

      // On doit quand même parser le SVG pour obtenir les chemins
      // Mais on évite de télécharger à nouveau le fichier
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
    } else {
      const loader = new SVGLoader();
      loader.load(
        svgPath,
        (data) => {
          // Vérifier que le SVG contient des chemins valides
          if (data.paths && data.paths.length > 0) {
            processSvgData(data);
          } else {
            const emptyError = new Error(
              "Le SVG ne contient pas de chemins valides"
            );
            if (onError) onError(emptyError);
            tryLoadDefault(`SVG vide ${svgPath}`);
          }
        },
        undefined,
        (loadError) => {
          console.error(`Error loading SVG ${svgPath}:`, loadError);
          if (onError) onError(loadError);
          tryLoadDefault(`Échec du chargement du SVG ${svgPath}`);
        }
      );
    }
  }, [svgPath, loaded, textures, textureId, onError]);

  // Fonction pour traiter les données SVG et calculer les dimensions
  const processSvgData = (data) => {
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

    // Stocker dans le cache local
    svgDataCache.set(svgPath, {
      data: data,
      dimensions: dimensionsData,
    });

    setSvgData(data);
    setDimensions(dimensionsData);
    setIsLoading(false);
  };

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

  // Si en chargement, ne rien rendre
  if (isLoading) {
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

  // Create a material for the lines
  const lineMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    linewidth: lineWidth,
  });

  // Generate line segments from SVG paths
  const pathLines = svgData.paths.flatMap((path, pathIndex) => {
    return path.subPaths.map((subPath, subPathIndex) => {
      const points = subPath.getPoints();

      // Create a geometry from the points
      const geometry = new THREE.BufferGeometry();
      const vertices = [];

      // Add each point to the vertices array
      points.forEach((point) => {
        vertices.push(point.x, point.y, 0);
      });

      // If the subpath is closed, connect the last point to the first
      if (subPath.closed && points.length > 1) {
        vertices.push(points[0].x, points[0].y, 0);
      }

      // Set the vertices as a position attribute
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );

      return (
        <line
          key={`${pathIndex}-${subPathIndex}`}
          geometry={geometry}
          material={lineMaterial}
          position={centerOffset}
        />
      );
    });
  });

  const content = (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={computedScale}
    >
      {pathLines}
    </group>
  );

  return isBillboard ? <Billboard>{content}</Billboard> : content;
};

// Nettoyage du cache SVG quand le composant est démonté
SvgPath.clearCache = () => {
  svgDataCache.clear();
};

export default SvgPath;
