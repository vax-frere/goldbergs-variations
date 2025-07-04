import { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import useAssets from "../hooks/useAssets";
import useGameStore from "../store";

import seedrandom from "seedrandom";

// Composant pour une instance d'étoiles
const StarField = ({ count, radius, size, seed, forceUpdate }) => {
  const pointsRef = useRef();
  const materialRef = useRef();
  const assets = useAssets();

  // Initialiser le générateur de nombres aléatoires
  const random = useMemo(() => {
    console.log("🎲 [StarField] Création d'un nouveau générateur avec seed:", seed);
    return seedrandom(seed.toString());
  }, [seed, forceUpdate]);

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
    const rand = random();
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
    const rand = random();

    if (rand < 0.005) return 0.5 + random() * 1.0; // Plus d'étoiles très brillantes (0.5-1.5)
    if (rand < 0.03) return 1.5 + random() * 1.5; // Plus d'étoiles brillantes (1.5-3.0)
    if (rand < 0.12) return 3.0 + random() * 1.5; // Plus d'étoiles moyennes (3.0-4.5)
    if (rand < 0.35) return 4.5 + random() * 1.0; // Plus d'étoiles faibles (4.5-5.5)
    return 5.5 + random() * 1.5; // Étoiles très faibles mais pas trop (5.5-7.0)
  };

  // Fonction pour convertir la magnitude en taille
  const magnitudeToSize = (magnitude) => {
    // Plus la magnitude est faible, plus l'étoile est brillante et grande
    // Formule logarithmique inverse pour un rendu réaliste mais plus visible
    return (
      size * Math.pow(2.512, -(magnitude - 6)) * (2.5 + random() * 0.8)
    );
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

  // Créer les positions, couleurs et tailles des étoiles
  const [positions, colors, sizes] = useMemo(() => {
    console.log("✨ [StarField] Génération des étoiles avec seed:", seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Paramètres de la Voie Lactée
    const milkyWayDensity = 0.4; // 60% des étoiles dans la Voie Lactée pour plus de densité
    const milkyWayThickness = 0.5; // 30% de l'épaisseur pour un disque plus fin
    const milkyWayInclinationX = 0; // 0
    const milkyWayInclinationZ = Math.PI / 4; // 30 degrés sur l'axe Z

    // Nombre de clusters
    const numClusters = Math.floor(random() * 4) + 2; // 2-5 clusters
    const clusters = [];

    // Créer les clusters
    for (let i = 0; i < numClusters; i++) {
      clusters.push({
        center: new THREE.Vector3(
          (random() - 0.5) * radius * 1.2, // Augmenté de 0.8 à 1.2 pour éloigner les clusters
          (random() - 0.5) * radius * 1.2,
          (random() - 0.5) * radius * 1.2
        ),
        radius: radius * (0.05 + random() * 0.15), // 5-20% du rayon total
        density: 0.1 + random() * 0.1, // 10-20% des étoiles
      });
    }

    // Générer les étoiles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x, y, z;

      // Déterminer si l'étoile fait partie de la Voie Lactée
      const isMilkyWay = random() < milkyWayDensity;

      if (isMilkyWay) {
        // Étoile dans la Voie Lactée
        const angle = random() * Math.PI * 2;
        const distance = 0.7 + random() * 0.3; // 70-100% du rayon pour éviter le centre
        const height = (random() - 0.5) * milkyWayThickness;

        x = Math.cos(angle) * radius * distance;
        y = height * radius;
        z = Math.sin(angle) * radius * distance;

        // Appliquer la rotation en biais (X puis Z)
        // Rotation sur l'axe X
        const rotatedY = y * Math.cos(milkyWayInclinationX) - z * Math.sin(milkyWayInclinationX);
        const rotatedZ = y * Math.sin(milkyWayInclinationX) + z * Math.cos(milkyWayInclinationX);
        y = rotatedY;
        z = rotatedZ;

        // Rotation sur l'axe Z
        const rotatedX = x * Math.cos(milkyWayInclinationZ) - y * Math.sin(milkyWayInclinationZ);
        const rotatedY2 = x * Math.sin(milkyWayInclinationZ) + y * Math.cos(milkyWayInclinationZ);
        x = rotatedX;
        y = rotatedY2;
      } else {
        // Étoile isolée ou dans un cluster
        const inCluster = random() < 0.3; // 30% de chance d'être dans un cluster
        if (inCluster) {
          const cluster = clusters[Math.floor(random() * clusters.length)];
          const clusterAngle = random() * Math.PI * 2;
          const clusterDistance = random() * cluster.radius;
          const clusterHeight = (random() - 0.5) * cluster.radius * 0.3;

          x = cluster.center.x + Math.cos(clusterAngle) * clusterDistance;
          y = cluster.center.y + clusterHeight;
          z = cluster.center.z + Math.sin(clusterAngle) * clusterDistance;
        } else {
          // Étoile isolée
          const angle = random() * Math.PI * 2;
          const distance = 0.9 + random() * 0.3; // 90-120% du rayon pour éviter le centre et aller plus loin
          const height = (random() - 0.5) * radius * 0.8; // Augmenté de 0.5 à 0.8 pour plus de dispersion verticale

          x = Math.cos(angle) * radius * distance;
          y = height;
          z = Math.sin(angle) * radius * distance;
        }
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      // Couleur basée sur la température
      const temperature = 2000 + random() * 40000; // 2000K - 42000K
      const color = selectStellarColor();
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      // Taille basée sur la magnitude
      const magnitude = generateMagnitude();
      sizes[i] = magnitudeToSize(magnitude);
    }

    return [positions, colors, sizes];
  }, [count, radius, size, random, seed, forceUpdate]);

  if (!assets.isReady) {
    return null;
  }

  const texture = assets.getCustomData("star-particle-pro");
  if (!texture) return null;

  return (
    <points ref={pointsRef} key={`points-${seed}-${forceUpdate}`}>
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
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Composant principal qui gère la régénération
export function Stars({ count = 4000, radius = 5000, size = 8.0 }) {
  const debug = useGameStore((state) => state.debug);
  const [seed, setSeed] = useState(1);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Log pour vérifier le montage du composant et l'état du debug
  useEffect(() => {
    console.log("🌟 [Stars] Composant monté, debug:", debug);
  }, [debug]);

  // Gestionnaire d'événements pour la touche F
  useEffect(() => {
    const handleKeyDown = (event) => {
      // En développement uniquement
      if (process.env.NODE_ENV === 'development' && event.code === "KeyF") {
        console.log("Touche F pressée en développement");
        setSeed((prev) => prev + 1);
        setForceUpdate((prev) => prev + 1);
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Utiliser la phase de capture pour intercepter l'événement avant les autres handlers
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  // Forcer la recréation du composant StarField à chaque changement
  return (
    <StarField 
      key={`stars-${seed}-${forceUpdate}`}
      count={count} 
      radius={radius} 
      size={size} 
      seed={seed}
      forceUpdate={forceUpdate}
    />
  );
}

export default Stars;
