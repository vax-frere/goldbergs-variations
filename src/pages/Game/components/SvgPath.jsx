import React, { useState, useEffect, useRef, useMemo } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";
import useAssets from "../hooks/useAssets";

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

    // Fonction asynchrone pour charger et traiter le SVG
    const loadSvg = async () => {
      // On garde le chemin complet comme identifiant
      const svgFileName = svgPath;
      console.log("[SvgPath] Tentative de chargement du SVG:", {
        svgPath,
        svgFileName,
      });

      // Récupérer le SVG depuis l'AssetManager
      const svgTexture = assets.getTexture(svgFileName);
      console.log("[SvgPath] Texture trouvée dans l'AssetManager:", {
        svgFileName,
        found: !!svgTexture,
        textureSource: svgTexture?.source?.data?.src,
      });

      const loader = new SVGLoader();

      if (svgTexture) {
        try {
          console.log(
            "[SvgPath] Tentative de fetch du SVG:",
            svgTexture.source.data.src
          );
          const response = await fetch(svgTexture.source.data.src);
          console.log("[SvgPath] Réponse du fetch:", {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
          });

          const svgText = await response.text();
          console.log(
            "[SvgPath] Contenu SVG reçu:",
            svgText.substring(0, 100) + "..."
          );

          const data = loader.parse(svgText);
          console.log("[SvgPath] SVG parsé:", {
            hasData: !!data,
            pathsCount: data?.paths?.length,
          });

          if (data.paths && data.paths.length > 0) {
            processSvgData(data);
            return; // Succès, on sort de la fonction
          } else {
            console.warn(
              "[SvgPath] Le SVG ne contient pas de chemins:",
              svgFileName
            );
          }
        } catch (parseError) {
          console.error("[SvgPath] Erreur de parsing SVG:", {
            svgPath,
            error: parseError.message,
            stack: parseError.stack,
          });
          if (onError) onError(parseError);
        }
      }

      // Si on arrive ici, on essaie le SVG par défaut
      if (svgFileName !== "default.svg") {
        console.log("[SvgPath] Tentative de chargement du SVG par défaut");
        const defaultTexture = assets.getTexture("default.svg");
        console.log("[SvgPath] Texture par défaut trouvée:", {
          found: !!defaultTexture,
          textureSource: defaultTexture?.source?.data?.src,
        });

        if (defaultTexture) {
          try {
            const defaultResponse = await fetch(defaultTexture.source.data.src);
            console.log("[SvgPath] Réponse du fetch par défaut:", {
              ok: defaultResponse.ok,
              status: defaultResponse.status,
            });

            const defaultSvgText = await defaultResponse.text();
            const defaultData = loader.parse(defaultSvgText);
            console.log("[SvgPath] SVG par défaut parsé:", {
              hasData: !!defaultData,
              pathsCount: defaultData?.paths?.length,
            });

            if (defaultData.paths && defaultData.paths.length > 0) {
              processSvgData(defaultData);
              return;
            }
          } catch (defaultError) {
            console.error("[SvgPath] Erreur avec le SVG par défaut:", {
              error: defaultError.message,
              stack: defaultError.stack,
            });
          }
        }
      }

      // Si on arrive ici, même le SVG par défaut n'a pas pu être chargé
      console.error("[SvgPath] Échec total du chargement des SVGs");
      setError(new Error("Impossible de charger le SVG"));
      setIsLoading(false);
      if (onError) onError(new Error("Impossible de charger le SVG"));
    };

    // Appeler la fonction asynchrone
    loadSvg();
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

export default SvgPath;
