import { useState, useEffect } from "react";
import { Billboard } from "@react-three/drei";
import { useTextures } from "../TexturePreloader";
import { urlToTextureId } from "../utils/textureUtils";

/**
 * Composant pour afficher des images SVG en 3D
 * Utilise le système de cache de textures pour améliorer les performances
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
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [aspectRatio, setAspectRatio] = useState(1);
  const [error, setError] = useState(null);

  // Récupérer les textures depuis le système de cache
  const { textures, loaded } = useTextures();

  // Extraire l'ID de texture à partir du chemin
  const textureId = urlToTextureId(svgPath);

  // Récupérer la texture depuis le cache
  const texture = textures[textureId];

  useEffect(() => {
    // Attendre que les textures soient chargées
    if (!loaded || !texture) return;

    try {
      // Calculer les dimensions et le ratio d'aspect de l'image
      const imgWidth = texture.image.width;
      const imgHeight = texture.image.height;
      const ratio = imgWidth / imgHeight;

      setDimensions({
        width: size * ratio,
        height: size,
      });

      setAspectRatio(ratio);
    } catch (err) {
      console.error(`Erreur lors du traitement du SVG ${svgPath}:`, err);
      setError(err);
    }
  }, [svgPath, size, texture, loaded]);

  // Si une erreur se produit ou si le SVG n'est pas encore chargé
  if (error || !texture || !loaded) {
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
