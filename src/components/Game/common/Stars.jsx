import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";

/**
 * Composant qui génère un champ d'étoiles autour de la scène
 * Utilise des points avec une texture pour une meilleure performance et rendu
 *
 * @param {Object} props - Propriétés du composant
 * @param {number} [props.count=5000] - Nombre d'étoiles à générer
 * @param {number} [props.radius=3000] - Rayon de la sphère sur laquelle les étoiles sont placées
 * @param {number} [props.size=1.5] - Taille des étoiles
 */
export function Stars({ count = 5000, radius = 3000, size = 1.5 }) {
  // Charger la texture de la particule
  const texture = useLoader(
    THREE.TextureLoader,
    `${import.meta.env.BASE_URL}textures/particle.png`
  );

  // Créer les positions et les couleurs des étoiles
  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Générer une position aléatoire sur une sphère
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

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

  return (
    <points>
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
