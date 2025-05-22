import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../../hooks/useAssets";

// Constantes pour les étoiles filantes - optimisées pour des trajectoires plus courtes et rapides
const DEFAULT_SPEED = 300; // Vitesse augmentée pour que ce soit plus éphémère
const DEFAULT_TAIL_LENGTH = 420; // Traînée beaucoup plus longue
const DEFAULT_SIZE = 8; // Taille fortement augmentée
const DEFAULT_TAIL_SIZE_START = 6.0; // Taille des points au début de la traînée augmentée
const DEFAULT_TAIL_SIZE_END = 1.0; // Taille des points à la fin de la traînée
const DEFAULT_SPHERE_RADIUS = 2400; // Rayon de la sphère (depuis navigationConstants)
const DEFAULT_INNER_RADIUS = 250; // Rayon intérieur où les étoiles apparaissent - plus proche
const DEFAULT_TARGET_RADIUS = 50; // Rayon cible où les étoiles se dirigent - plus proche
const DEFAULT_LIFETIME = { min: 1, max: 2 }; // Durée de vie plus courte pour un effet plus éphémère
const DEFAULT_SPAWN_INTERVAL = { min: 0.4, max: 1.5 }; // Intervalle entre apparitions
const DEFAULT_COLOR = new THREE.Color(0xffffff); // Couleur par défaut

// Fonction utilitaire pour générer un point aléatoire sur une sphère
const getRandomPointOnSphere = (radius) => {
  const theta = Math.random() * Math.PI * 2; // Angle horizontal (0 à 2π)
  const phi = Math.acos(2 * Math.random() - 1); // Angle vertical (0 à π)

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
};

// Fonction utilitaire pour générer un point aléatoire à l'intérieur de la sphère
const getRandomPointInsideSphere = (radius) => {
  const r = radius * Math.cbrt(Math.random()); // Distribution uniforme dans le volume
  return getRandomPointOnSphere(r);
};

/**
 * Composant qui gère plusieurs étoiles filantes
 *
 * @param {Object} props
 * @param {number} [props.count=8] - Nombre maximal d'étoiles filantes simultanées
 * @param {number} [props.sphereRadius=2400] - Rayon de la sphère du jeu
 * @param {number} [props.innerRadius=800] - Rayon où les étoiles apparaissent
 * @param {number} [props.targetRadius=400] - Rayon cible où les étoiles se dirigent
 * @param {Object} [props.spawnInterval] - Intervalle entre les apparitions
 * @param {number} [props.spawnInterval.min=0.5] - Intervalle minimum en secondes
 * @param {number} [props.spawnInterval.max=2] - Intervalle maximum en secondes
 */
export function ShootingStars({
  count = 8,
  sphereRadius = DEFAULT_SPHERE_RADIUS,
  innerRadius = DEFAULT_INNER_RADIUS,
  targetRadius = DEFAULT_TARGET_RADIUS,
  spawnInterval = DEFAULT_SPAWN_INTERVAL,
}) {
  const [stars, setStars] = useState([]);
  const nextSpawnTime = useRef(0);

  // Utiliser le service d'assets
  const assets = useAssets();

  // Créer ou récupérer la texture d'étoile
  useEffect(() => {
    if (!assets.isReady) return;

    // Créer la texture d'étoile si elle n'existe pas déjà
    if (!assets.getCustomData("shootingstar-texture")) {
      const size = 256; // Taille augmentée pour plus de détails
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Gradient radial plus lumineux pour le point principal
      const gradientCore = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradientCore.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradientCore.addColorStop(0.1, "rgba(255, 255, 255, 1)");
      gradientCore.addColorStop(0.3, "rgba(255, 255, 255, 0.9)");
      gradientCore.addColorStop(0.5, "rgba(230, 240, 255, 0.8)");
      gradientCore.addColorStop(0.7, "rgba(180, 220, 255, 0.6)");
      gradientCore.addColorStop(0.9, "rgba(140, 180, 255, 0.3)");
      gradientCore.addColorStop(1, "rgba(120, 140, 255, 0)");

      ctx.fillStyle = gradientCore;
      ctx.fillRect(0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      // Stocker la texture dans les données personnalisées
      assets.setCustomData("shootingstar-texture", texture);
    }
  }, [assets.isReady]);

  // Générer une nouvelle étoile filante
  const createNewStar = () => {
    // Sélectionner aléatoirement une zone de départ
    // (plus proche du centre, sur la sphère intérieure)
    const startPoint = getRandomPointOnSphere(innerRadius);

    // Pour un mouvement plus aléatoire et éphémère, choisir une direction aléatoire
    // au lieu de toujours viser le centre
    let direction;
    if (Math.random() > 0.3) {
      // 70% du temps, vise vers un point proche du centre
      const targetPoint = getRandomPointInsideSphere(targetRadius);
      direction = new THREE.Vector3()
        .subVectors(targetPoint, startPoint)
        .normalize();
    } else {
      // 30% du temps, direction plus tangentielle pour un effet traversant
      const randomPoint = getRandomPointOnSphere(innerRadius);
      direction = new THREE.Vector3()
        .subVectors(randomPoint, startPoint)
        .normalize();

      // Ajuster légèrement la direction pour qu'elle soit plus tangentielle
      const toCenter = new THREE.Vector3()
        .subVectors(new THREE.Vector3(0, 0, 0), startPoint)
        .normalize();
      const tangent = new THREE.Vector3()
        .crossVectors(toCenter, new THREE.Vector3(0, 1, 0))
        .normalize();

      // Combiner la direction aléatoire avec la tangente
      direction.lerp(tangent, 0.5).normalize();
    }

    // Vitesse aléatoire avec plus de variation
    const speed = DEFAULT_SPEED * (0.7 + Math.random() * 0.9);

    // Durée de vie aléatoire - très courte pour un effet éphémère
    const lifetime =
      DEFAULT_LIFETIME.min +
      Math.random() * (DEFAULT_LIFETIME.max - DEFAULT_LIFETIME.min);

    // Taille aléatoire
    const size = DEFAULT_SIZE * (0.8 + Math.random() * 0.8);

    // Couleur avec légère variation - parfois légèrement teintée
    const hue = Math.random() * 0.15; // Légère variation de teinte
    const saturation = Math.random() * 0.2; // Légère saturation
    const lightness = 0.95 + Math.random() * 0.05; // Très lumineux
    const color = new THREE.Color().setHSL(hue, saturation, lightness);

    // Longueur de traînée adaptée à la vitesse - plus longue pour les plus rapides
    const tailLength =
      DEFAULT_TAIL_LENGTH *
      (0.8 + Math.random() * 0.8) *
      (speed / DEFAULT_SPEED);

    return {
      id: Date.now() + Math.random(),
      position: startPoint.clone(),
      direction,
      speed,
      size,
      color,
      tailLength,
      lifetime,
      elapsedTime: 0,
      trail: [],
    };
  };

  // Initialisation
  useEffect(() => {
    // On n'affiche aucune étoile immédiatement
    nextSpawnTime.current = 0.5 + Math.random() * 0.5;

    // Au lieu de créer plusieurs étoiles d'un coup, on les échelonne
    // en utilisant des délais différents pour chacune
    const timeoutIds = [];

    // Aucune étoile n'est ajoutée immédiatement

    return () => {
      // Nettoyer les timeouts à la destruction du composant
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  // Animation et logique de cycle de vie
  useFrame((_, delta) => {
    // Mettre à jour le temps pour la prochaine apparition
    nextSpawnTime.current -= delta;

    // Créer une nouvelle étoile si nécessaire et si on n'a pas atteint le maximum
    if (nextSpawnTime.current <= 0 && stars.length < count) {
      const newStar = createNewStar();
      setStars((prevStars) => [...prevStars, newStar]);

      // Définir le prochain temps d'apparition
      nextSpawnTime.current =
        spawnInterval.min +
        Math.random() * (spawnInterval.max - spawnInterval.min);
    }

    // Mettre à jour les étoiles existantes de façon plus efficace
    // On utilise une seule mise à jour de l'état pour éviter les rendus multiples
    setStars((prevStars) => {
      const updatedStars = [];
      let stateChanged = false;

      prevStars.forEach((star) => {
        // Incrémenter le temps écoulé
        const elapsedTime = star.elapsedTime + delta;

        // Calculer le pourcentage de progression de la durée de vie
        const lifeProgress = elapsedTime / star.lifetime;

        // Si l'étoile a dépassé sa durée de vie, on la supprime
        if (lifeProgress >= 1.0) {
          stateChanged = true;
          return; // Ne pas l'ajouter à updatedStars
        }

        // Calculer la nouvelle position
        let newPosition;
        if (lifeProgress < 0.9) {
          newPosition = star.position
            .clone()
            .add(star.direction.clone().multiplyScalar(star.speed * delta));
        } else {
          // Pendant la phase de disparition, on maintient la position
          newPosition = star.position.clone();
        }

        // Distance parcourue depuis la dernière frame
        const distanceMoved = star.position.distanceTo(newPosition);

        // Créer plusieurs points intermédiaires entre l'ancienne et la nouvelle position
        const newTrail = [];

        // Si l'étoile est encore active
        if (lifeProgress < 0.9) {
          // Nombre de points intermédiaires basé sur la distance et la vitesse
          // Plus de points pour une traînée plus dense
          const numIntermediatePoints = Math.max(
            2,
            Math.ceil(distanceMoved * 4)
          );

          // Générer les points intermédiaires
          for (let i = 0; i <= numIntermediatePoints; i++) {
            const t = i / numIntermediatePoints;
            const intermediatePos = star.position.clone().lerp(newPosition, t);
            newTrail.push(intermediatePos);
          }
        }

        // Ajouter les points existants pour conserver une traînée plus longue
        if (star.trail.length > 0) {
          // Déterminer combien de points à conserver
          // Si l'étoile est en fin de vie, on réduit progressivement la traînée
          const fadeOutFactor =
            lifeProgress > 0.9
              ? 1 - (lifeProgress - 0.9) / 0.1 // De 1 à 0 pendant les 10% finaux
              : 1;

          const keepCount = Math.floor(
            Math.min(
              star.trail.length,
              star.tailLength * fadeOutFactor - newTrail.length
            )
          );

          // Ajouter les points de la traînée existante
          for (let i = 0; i < keepCount && i < star.trail.length; i++) {
            newTrail.push(star.trail[i]);
          }
        }

        // Limiter la taille de la traînée pour économiser la mémoire
        const maxTrailPoints = Math.min(star.tailLength, 250);
        const finalTrail = newTrail.slice(0, maxTrailPoints);

        // Mettre à jour l'étoile
        updatedStars.push({
          ...star,
          position: newPosition,
          elapsedTime,
          trail: finalTrail,
          // Marquer que l'étoile est en train de s'estomper
          fading: lifeProgress > 0.9,
          fadeProgress: lifeProgress > 0.9 ? (lifeProgress - 0.9) / 0.1 : 0,
        });
        stateChanged = true;
      });

      // Si rien n'a changé, retourner l'état précédent tel quel
      return stateChanged ? updatedStars : prevStars;
    });
  });

  // Si les assets ne sont pas prêts, ne rien afficher
  if (!assets.isReady) {
    return null;
  }

  // Récupérer la texture d'étoile depuis le service d'assets
  const starTexture = assets.getCustomData("shootingstar-texture");
  if (!starTexture) {
    return null;
  }

  // Rendu des étoiles filantes
  return (
    <group>
      {stars.map((star) => (
        <ShootingStarWithFadingTail
          key={star.id}
          position={star.position}
          trail={star.trail}
          size={star.size}
          color={star.color}
          progress={star.elapsedTime / star.lifetime}
          texture={starTexture}
          fading={star.fading}
          fadeProgress={star.fadeProgress}
        />
      ))}
    </group>
  );
}

/**
 * Composant individuel d'étoile filante avec traînée en points qui s'estompent
 */
function ShootingStarWithFadingTail({
  position,
  trail,
  size,
  color,
  progress,
  texture,
  fading = false,
  fadeProgress = 0,
}) {
  const pointRef = useRef();
  const tailRef = useRef();
  const assets = useAssets();

  // Créer ou récupérer le matériau pour le point principal
  useEffect(() => {
    if (!assets.isReady) return;

    // Identifiant unique pour ce matériau
    const materialId = `star-point-material-${color.getHexString()}`;

    // Créer le matériau si nécessaire
    assets.createMaterial(materialId, () => {
      return new THREE.PointsMaterial({
        size,
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: color,
        opacity: fading ? Math.max(0, 1 - fadeProgress * 2) : 1.0, // Disparition plus rapide du point principal
        sizeAttenuation: true,
      });
    });

    // Mettre à jour l'opacité du matériau
    const material = assets.getMaterial(materialId);
    if (material) {
      material.opacity = fading ? Math.max(0, 1 - fadeProgress * 2) : 1.0;
    }
  }, [assets.isReady, color, size, fading, fadeProgress, texture]);

  // Créer ou récupérer le matériau pour la traînée
  useEffect(() => {
    if (!assets.isReady) return;

    // Identifiant unique pour ce matériau
    const materialId = `star-tail-material-${color.getHexString()}`;

    // Créer le matériau si nécessaire
    assets.createMaterial(materialId, () => {
      return new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: texture },
          color: { value: new THREE.Color(color) },
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          varying float vOpacity;
          
          void main() {
            vOpacity = opacity;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (600.0 / -mvPosition.z); // Taille augmentée pour plus de visibilité
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          uniform vec3 color;
          varying float vOpacity;
          
          void main() {
            vec4 texColor = texture2D(pointTexture, gl_PointCoord);
            // Augmenter la luminosité et l'éclat
            vec3 brightColor = color * 1.5;
            
            // Ajout d'une très légère teinte bleue pour un effet plus céleste
            brightColor.b = min(1.0, brightColor.b * 1.2);
            
            // Effet de dégradé plus subtil
            gl_FragColor = vec4(brightColor, vOpacity * 0.9) * texColor;
            
            // Garder plus de détails sur les bords
            if (gl_FragColor.a < 0.01) discard;
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
    });
  }, [assets.isReady, color, texture]);

  // Créer la traînée avec des points
  useEffect(() => {
    if (tailRef.current && trail.length > 1) {
      // Créer les positions pour tous les points de la traînée
      const positions = new Float32Array(trail.length * 3);
      const sizes = new Float32Array(trail.length);
      const opacities = new Float32Array(trail.length);

      trail.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;

        // Calculer la taille et l'opacité basées sur la position dans la traînée
        // Indice 0 = début de la traînée (plus proche de la tête)
        const fadeRatio = i / (trail.length - 1);

        // Réduire davantage la taille si l'étoile est en train de disparaître
        const fadingFactor = fading ? Math.max(0, 1 - fadeProgress) : 1;

        // La taille diminue progressivement le long de la traînée
        sizes[i] =
          (DEFAULT_TAIL_SIZE_START * (1 - fadeRatio) +
            DEFAULT_TAIL_SIZE_END * fadeRatio) *
          fadingFactor; // Réduire la taille pendant la disparition

        // L'opacité diminue progressivement le long de la traînée - plus élevée
        // Pendant la disparition, on réduit encore plus l'opacité
        opacities[i] =
          Math.max(0, 1 - fadeRatio) * 0.8 * (fading ? 1 - fadeProgress : 1);
      });

      // Mettre à jour la géométrie et les attributs
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));

      // Remplacer la géométrie existante
      if (tailRef.current.geometry) tailRef.current.geometry.dispose();
      tailRef.current.geometry = geometry;
    }
  }, [trail, fading, fadeProgress]);

  // Si les assets ne sont pas prêts, ne rien afficher
  if (!assets.isReady) {
    return null;
  }

  // Récupérer les matériaux depuis le service d'assets
  const material = assets.getMaterial(
    `star-point-material-${color.getHexString()}`
  );
  const tailMaterial = assets.getMaterial(
    `star-tail-material-${color.getHexString()}`
  );

  if (!material || !tailMaterial) {
    return null;
  }

  return (
    <group renderOrder={100}>
      {/* Point lumineux principal */}
      <points ref={pointRef} position={[0, 0, 0]} renderOrder={101}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([position.x, position.y, position.z])}
            count={1}
            itemSize={3}
          />
        </bufferGeometry>
        <primitive object={material} />
      </points>

      {/* Traînée de l'étoile filante */}
      {trail.length > 1 && (
        <points ref={tailRef} renderOrder={100}>
          <primitive object={tailMaterial} />
        </points>
      )}
    </group>
  );
}

export default ShootingStars;
