import { useState, useEffect } from "react";
import { useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { Billboard } from "@react-three/drei";

/**
 * Composant pour afficher des images SVG en 3D
 *
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.svgPath - Chemin vers le fichier SVG
 * @param {number} props.size - Taille du sprite (défaut: 100)
 * @param {Array<number>} props.position - Position [x, y, z] du sprite (défaut: [0, 0, 0])
 * @param {boolean} props.isBillboard - Si true, le sprite fait toujours face à la caméra (défaut: true)
 * @param {number} props.opacity - Opacité du sprite (défaut: 1)
 * @param {Array<number>} props.rotation - Rotation [x, y, z] du sprite (défaut: [0, 0, 0])
 * @param {Array<number>} props.scale - Échelle [x, y, z] du sprite (défaut: [1, 1, 1])
 * @returns {JSX.Element}
 */
const SvgSprite = ({
  svgPath,
  size = 100,
  position = [0, 0, 0],
  isBillboard = true,
  opacity = 1,
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}) => {
  const [texture, setTexture] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [aspectRatio, setAspectRatio] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Chargement de l'image SVG
    const textureLoader = new TextureLoader();

    textureLoader.load(
      svgPath,
      (loadedTexture) => {
        setTexture(loadedTexture);

        // Calculer les dimensions et le ratio d'aspect de l'image
        const imgWidth = loadedTexture.image.width;
        const imgHeight = loadedTexture.image.height;
        const ratio = imgWidth / imgHeight;

        setDimensions({
          width: size * ratio,
          height: size,
        });

        setAspectRatio(ratio);
      },
      undefined,
      (err) => {
        console.error(`Erreur lors du chargement du SVG ${svgPath}:`, err);
        setError(err);
      }
    );
  }, [svgPath, size]);

  // Si une erreur se produit ou si le SVG n'est pas encore chargé
  if (error || !texture) {
    return null;
  }

  // Préparer le contenu du sprite
  const spriteContent = (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        opacity={opacity}
        alphaTest={0.001}
        side={2} // DoubleSide
        depthTest={true}
        depthWrite={true}
      />
    </mesh>
  );

  // Retourner le sprite, avec ou sans Billboard
  return isBillboard ? <Billboard>{spriteContent}</Billboard> : spriteContent;
};

export default SvgSprite;
