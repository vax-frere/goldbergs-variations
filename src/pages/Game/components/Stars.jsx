import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import useAssets from "../hooks/useAssets";

/**
 * Composant qui génère un champ d'étoiles réaliste autour de la scène
 * Simule les vraies couleurs stellaires, magnitudes, et distribution spatiale
 *
 * @param {Object} props - Propriétés du composant
 * @param {number} [props.count=3000] - Nombre d'étoiles à générer
 * @param {number} [props.radius=3000] - Rayon de la sphère sur laquelle les étoiles sont placées
 * @param {number} [props.size=1.5] - Taille de base des étoiles
 */
export function Stars({ count = 4000, radius = 5000, size = 5.5 }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const assets = useAssets();

  // Données pour l'animation de scintillement
  const animationData = useRef({
    time: 0,
    twinkleOffsets: null,
    twinkleFrequencies: null,
  });

  // Couleurs stellaires réalistes basées sur la température
  const stellarColors = useMemo(
    () => [
      // Étoiles bleues (très chaudes, ~30,000K) - très rares
      { temp: 30000, color: new THREE.Color(0.6, 0.7, 1.0), probability: 0.02 },
      { temp: 20000, color: new THREE.Color(0.7, 0.8, 1.0), probability: 0.03 },

      // Étoiles blanc-bleu (chaudes, ~10,000K) - rares
      { temp: 10000, color: new THREE.Color(0.8, 0.9, 1.0), probability: 0.05 },

      // Étoiles blanches (moyennes, ~6,000K) - comme notre Soleil
      { temp: 6000, color: new THREE.Color(1.0, 1.0, 1.0), probability: 0.15 },
      { temp: 5500, color: new THREE.Color(1.0, 0.98, 0.9), probability: 0.2 },

      // Étoiles jaunes (plus froides, ~5,000K) - communes
      { temp: 5000, color: new THREE.Color(1.0, 0.95, 0.8), probability: 0.25 },
      { temp: 4500, color: new THREE.Color(1.0, 0.9, 0.7), probability: 0.15 },

      // Étoiles orange (froides, ~4,000K) - communes
      { temp: 4000, color: new THREE.Color(1.0, 0.8, 0.6), probability: 0.1 },

      // Étoiles rouges (très froides, ~3,000K) - géantes rouges, rares mais visibles
      { temp: 3000, color: new THREE.Color(1.0, 0.6, 0.4), probability: 0.05 },
    ],
    []
  );

  // Fonction pour sélectionner une couleur stellaire selon la probabilité
  const selectStellarColor = () => {
    const rand = Math.random();
    let cumulative = 0;

    for (const star of stellarColors) {
      cumulative += star.probability;
      if (rand <= cumulative) {
        return star.color.clone();
      }
    }

    // Fallback vers une étoile jaune
    return stellarColors[4].color.clone();
  };

  // Fonction pour générer une magnitude stellaire réaliste (distribution logarithmique)
  const generateMagnitude = () => {
    // Distribution réaliste des magnitudes stellaires
    // La plupart des étoiles sont faibles (magnitude élevée)
    // Quelques étoiles très brillantes (magnitude faible)
    const rand = Math.random();

    if (rand < 0.001) return 0.5 + Math.random() * 1.0; // Étoiles très brillantes (0.5-1.5)
    if (rand < 0.01) return 1.5 + Math.random() * 1.5; // Étoiles brillantes (1.5-3.0)
    if (rand < 0.05) return 3.0 + Math.random() * 1.5; // Étoiles moyennes (3.0-4.5)
    if (rand < 0.2) return 4.5 + Math.random() * 1.0; // Étoiles faibles (4.5-5.5)
    return 5.5 + Math.random() * 2.0; // Étoiles très faibles (5.5-7.5)
  };

  // Fonction pour convertir la magnitude en taille
  const magnitudeToSize = (magnitude) => {
    // Plus la magnitude est faible, plus l'étoile est brillante et grande
    // Formule logarithmique inverse pour un rendu réaliste
    return size * Math.pow(2.512, -(magnitude - 6)) * (2 + Math.random() * 0.5);
  };

  // Créer ou récupérer la texture de particule améliorée
  useEffect(() => {
    if (!assets.isReady) return;

    if (!assets.getCustomData("star-particle-pro")) {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");

      // Gradient radial plus sophistiqué pour l'étoile
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
      gradient.addColorStop(0.1, "rgba(255, 255, 255, 0.9)");
      gradient.addColorStop(0.3, "rgba(240, 240, 255, 0.6)");
      gradient.addColorStop(0.6, "rgba(200, 200, 255, 0.3)");
      gradient.addColorStop(0.8, "rgba(150, 150, 255, 0.1)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      // Ajouter des rayons de diffraction pour les étoiles brillantes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 8);
      ctx.lineTo(32, 56);
      ctx.moveTo(8, 32);
      ctx.lineTo(56, 32);
      ctx.stroke();

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      assets.setCustomData("star-particle-pro", texture);
    }
  }, [assets.isReady]);

  // Créer les positions, couleurs et tailles des étoiles avec distribution réaliste
  const [positions, colors, sizes, twinkleData] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const twinkleOffsets = new Float32Array(count);
    const twinkleFrequencies = new Float32Array(count);

    // Paramètres pour la simulation de la Voie lactée
    const milkyWayDensity = 0.5; // 50% des étoiles dans le plan galactique (plus visible)
    const milkyWayThickness = 0.5; // Épaisseur relative du disque galactique (plus fin)

    // Créer quelques amas d'étoiles
    const clusters = [];
    const numClusters = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numClusters; i++) {
      clusters.push({
        center: new THREE.Vector3(
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * radius * 2,
          (Math.random() - 0.5) * radius * 2
        ),
        radius: radius * (0.1 + Math.random() * 0.2),
        density: 0.05 + Math.random() * 0.1,
      });
    }

    for (let i = 0; i < count; i++) {
      let x, y, z;

      // Décider si cette étoile fait partie de la Voie lactée, d'un amas, ou est isolée
      const distributionRand = Math.random();

      if (distributionRand < milkyWayDensity) {
        // Étoile dans le plan galactique (Voie lactée) - incliné de 30 degrés
        const theta = Math.random() * Math.PI * 2;
        const r = radius * (0.6 + Math.random() * 0.4); // Étendre un peu plus

        // Position dans le plan galactique (plan XZ)
        const x_flat = r * Math.cos(theta);
        const z_flat = r * Math.sin(theta);
        const y_flat = (Math.random() - 0.5) * radius * milkyWayThickness;

        // Incliner le plan galactique de 45 degrés autour de l'axe X pour plus de visibilité
        const inclinationAngle = Math.PI / 4; // 45 degrés en radians (plus visible)
        const cosAngle = Math.cos(inclinationAngle);
        const sinAngle = Math.sin(inclinationAngle);

        // Rotation autour de l'axe X (plus visible depuis la caméra)
        x = x_flat;
        y = y_flat * cosAngle - z_flat * sinAngle;
        z = y_flat * sinAngle + z_flat * cosAngle;
      } else {
        // Vérifier si l'étoile peut être dans un amas
        let inCluster = false;
        for (const cluster of clusters) {
          if (Math.random() < cluster.density) {
            // Étoile dans un amas
            const clusterTheta = Math.random() * Math.PI * 2;
            const clusterPhi = Math.acos(2 * Math.random() - 1);
            const clusterR = cluster.radius * Math.random();

            x =
              cluster.center.x +
              clusterR * Math.sin(clusterPhi) * Math.cos(clusterTheta);
            y =
              cluster.center.y +
              clusterR * Math.sin(clusterPhi) * Math.sin(clusterTheta);
            z = cluster.center.z + clusterR * Math.cos(clusterPhi);
            inCluster = true;
            break;
          }
        }

        if (!inCluster) {
          // Étoile isolée - distribution sphérique normale
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = radius * (0.8 + Math.random() * 0.2);

          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
        }
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Générer magnitude et taille réalistes
      const magnitude = generateMagnitude();
      const starSize = magnitudeToSize(magnitude);
      sizes[i] = starSize;

      // Couleur stellaire réaliste
      const stellarColor = selectStellarColor();

      // Ajouter une légère variation de luminosité basée sur la magnitude
      const brightness = Math.max(0.3, 1.0 - (magnitude - 0.5) / 7.0);
      stellarColor.multiplyScalar(brightness);

      colors[i * 3] = stellarColor.r;
      colors[i * 3 + 1] = stellarColor.g;
      colors[i * 3 + 2] = stellarColor.b;

      // Données pour le scintillement (plus prononcé pour les étoiles brillantes)
      twinkleOffsets[i] = Math.random() * Math.PI * 2;

      // Seules les étoiles brillantes (magnitude < 3.0) scintillent, soit environ 10%
      const shouldTwinkle = magnitude < 3.0;
      twinkleFrequencies[i] = shouldTwinkle ? 0.8 + Math.random() * 2.0 : 0; // 0 = pas de scintillement
    }

    return [positions, colors, sizes, { twinkleOffsets, twinkleFrequencies }];
  }, [count, radius, size, stellarColors]);

  // Stocker les données d'animation
  useEffect(() => {
    animationData.current.twinkleOffsets = twinkleData.twinkleOffsets;
    animationData.current.twinkleFrequencies = twinkleData.twinkleFrequencies;
  }, [twinkleData]);

  // Animation de scintillement
  useFrame((state, delta) => {
    if (!pointsRef.current || !animationData.current.twinkleOffsets) return;

    animationData.current.time += delta;

    const geometry = pointsRef.current.geometry;
    const sizeAttribute = geometry.attributes.size;

    // Mettre à jour les tailles pour le scintillement (seulement les étoiles qui scintillent)
    for (let i = 0; i < count; i++) {
      const baseSize = sizes[i];
      const frequency = animationData.current.twinkleFrequencies[i];

      // Si frequency = 0, l'étoile ne scintille pas
      if (frequency === 0) {
        sizeAttribute.array[i] = baseSize;
        continue;
      }

      const offset = animationData.current.twinkleOffsets[i];

      // Scintillement plus visible (±25% de la taille de base au lieu de 10%)
      const twinkle =
        1.0 + 0.25 * Math.sin(animationData.current.time * frequency + offset);
      sizeAttribute.array[i] = baseSize * twinkle;
    }

    sizeAttribute.needsUpdate = true;
  });

  if (!assets.isReady) {
    return null;
  }

  const texture = assets.getCustomData("star-particle-pro");
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
        ref={materialRef}
        size={size}
        map={texture}
        alphaTest={0.01}
        transparent={true}
        vertexColors={true}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending} // Meilleur rendu pour les étoiles brillantes
      />
    </points>
  );
}

export default Stars;
