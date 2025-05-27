import React, { memo, useMemo } from "react";
import VibSvgPath from "../../../components/VibSvgPath";
import useAssets from "../../../hooks/useAssets";
import { BOUNDING_SPHERE_RADIUS } from "../../../components/AdvancedCameraController/navigationConstants";
import seedrandom from "seedrandom";

// Function to generate random position within sphere radius using seeded random
const generateRandomPosition = (radius, rng) => {
  const phi = rng() * 2 * Math.PI;
  const costheta = rng() * 2 - 1;
  const u = rng();

  const theta = Math.acos(costheta);
  const r = radius * Math.cbrt(u) * 0.8; // Use 80% of radius to keep stars inside

  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);

  return [x, y, z];
};

// Generate random stars array with deterministic seed
const generateRandomStars = (count = 6, seed = "goldberg-stars-2024") => {
  const rng = seedrandom(seed);

  return Array.from({ length: count }, (_, index) => {
    const starNumber = Math.floor(rng() * 6) + 1; // star-1 to star-6
    const position = generateRandomPosition(BOUNDING_SPHERE_RADIUS, rng);
    const baseSize = rng() * 30 + 15; // Random base size between 15 and 45
    const sizeVariation = 0.8 + rng() * 0.4; // Variation between 0.8 and 1.2 (±20%)
    const size = baseSize * sizeVariation; // Apply size variation
    const vibrationIntensity = rng() * 2 + 1; // Random between 1 and 3
    const vibrationSpeed = rng() * 2 + 1; // Random between 1 and 3

    return {
      id: `random-star-${index}`,
      svgName: `star-${starNumber}`,
      position,
      size,
      vibrationIntensity,
      vibrationSpeed,
    };
  });
};

// Composant pour les étoiles aléatoires
const RandomStars = memo(
  ({
    count = 6,
    seed = "goldberg-stars-2024",
    sphereRadius = BOUNDING_SPHERE_RADIUS,
  }) => {
    const assets = useAssets({ autoInit: false });

    const randomStars = useMemo(
      () => generateRandomStars(count, seed),
      [count, seed]
    );

    if (!assets.isReady) return null;

    return (
      <group>
        {randomStars.map((star) => (
          <VibSvgPath
            key={star.id}
            svgPath={`${star.svgName}.svg`}
            position={star.position}
            size={star.size}
            color="white"
            lineWidth={1}
            isBillboard={false}
            vibrationIntensity={star.vibrationIntensity}
            vibrationSpeed={star.vibrationSpeed}
            onError={(err) => {
              console.error(
                `[RandomStars] Erreur de chargement pour ${star.svgName}:`,
                err
              );
            }}
          />
        ))}
      </group>
    );
  }
);

export default RandomStars;
