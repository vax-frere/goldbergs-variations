import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import useAssets from "../../../hooks/useAssets";

/**
 * Composant qui génère un champ d'étoiles autour de la scène
 * Utilise des points avec une texture pour une meilleure performance et rendu
 *
 * @param {Object} props - Propriétés du composant
 * @param {number} [props.count=3000] - Nombre d'étoiles à générer
 * @param {number} [props.radius=3000] - Rayon de la sphère sur laquelle les étoiles sont placées
 * @param {number} [props.size=1.5] - Taille des étoiles
 */
export function Stars({ count = 3000, radius = 3000, size = 1.5 }) {
  // Référence aux points pour éviter les re-rendus inutiles
  const pointsRef = useRef();

  // Utiliser le service d'assets
  const assets = useAssets();

  // Créer ou récupérer la texture de particule
  useEffect(() => {
    if (!assets.isReady) return;

    if (!assets.getCustomData("star-particle")) {
      // Créer une texture simple sur un canvas pour éviter les chargements externes
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d");

      // Gradient radial pour l'étoile
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.4, "rgba(240, 240, 255, 0.8)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);

      // Créer une texture à partir du canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      assets.setCustomData("star-particle", texture);
    }
  }, [assets.isReady]);

  // Créer les positions et les couleurs des étoiles une seule fois
  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Générer une position aléatoire sur une sphère plus efficacement
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Conversion en coordonnées cartésiennes
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Ajouter un peu de variation pour éviter un motif trop régulier
      const jitter = radius * 0.1;
      positions[i * 3] = x + (Math.random() * jitter * 2 - jitter);
      positions[i * 3 + 1] = y + (Math.random() * jitter * 2 - jitter);
      positions[i * 3 + 2] = z + (Math.random() * jitter * 2 - jitter);

      // Couleur légèrement variable (blanc avec une légère teinte)
      const hue = Math.random() * 0.1; // Légère variation de teinte
      const saturation = 0.1;
      const lightness = 0.9 + Math.random() * 0.1; // Légère variation de luminosité

      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Taille variable pour les étoiles
      sizes[i] = size * (0.7 + Math.random() * 0.6);
    }

    return [positions, colors, sizes];
  }, [count, radius, size]);

  // Si les assets ne sont pas prêts, ne rien rendre
  if (!assets.isReady) {
    return null;
  }

  // Récupérer la texture
  const texture = assets.getCustomData("star-particle");
  if (!texture) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={texture}
        alphaTest={0.01}
        transparent={true}
        vertexColors={true}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
}

export default Stars;
