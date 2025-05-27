/**
 * Utilitaires pour le positionnement de points sur une sphère
 */

/**
 * Calcule les positions équidistantes sur une sphère pour un nombre donné de points
 * @param {number} count - Nombre de points à distribuer
 * @param {number} radius - Rayon de la sphère
 * @param {string} method - Méthode de distribution ('fibonacci', 'icosahedron', 'octahedron')
 * @returns {Array<[number, number, number]>} - Tableau des positions [x, y, z]
 */
export const calculateSpherePositions = (
  count,
  radius = 400,
  method = "fibonacci"
) => {
  const positions = [];

  switch (method) {
    case "fibonacci":
      // Spirale de Fibonacci - distribution optimale pour n'importe quel nombre de points
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < count; i++) {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / count);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        positions.push([x, y, z]);
      }
      break;

    case "icosahedron":
      // Distribution basée sur un icosaèdre (optimal pour 12 points, approximation pour d'autres)
      if (count <= 12) {
        const t = (1 + Math.sqrt(5)) / 2; // Nombre d'or
        const vertices = [
          [1, t, 0],
          [-1, t, 0],
          [1, -t, 0],
          [-1, -t, 0],
          [0, 1, t],
          [0, -1, t],
          [0, 1, -t],
          [0, -1, -t],
          [t, 0, 1],
          [-t, 0, 1],
          [t, 0, -1],
          [-t, 0, -1],
        ];

        for (let i = 0; i < Math.min(count, vertices.length); i++) {
          const [x, y, z] = vertices[i];
          const norm = Math.sqrt(x * x + y * y + z * z);
          positions.push([
            (x / norm) * radius,
            (y / norm) * radius,
            (z / norm) * radius,
          ]);
        }
      } else {
        // Fallback vers fibonacci pour plus de 12 points
        return calculateSpherePositions(count, radius, "fibonacci");
      }
      break;

    case "octahedron":
      // Distribution basée sur un octaèdre (optimal pour 6 points, approximation pour d'autres)
      if (count <= 8) {
        const vertices = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
          [0.707, 0.707, 0],
          [-0.707, -0.707, 0],
        ];

        for (let i = 0; i < Math.min(count, vertices.length); i++) {
          const [x, y, z] = vertices[i];
          positions.push([x * radius, y * radius, z * radius]);
        }
      } else {
        // Fallback vers fibonacci pour plus de 8 points
        return calculateSpherePositions(count, radius, "fibonacci");
      }
      break;

    default:
      console.warn(`Méthode inconnue: ${method}, utilisation de fibonacci`);
      return calculateSpherePositions(count, radius, "fibonacci");
  }

  return positions;
};

/**
 * Crée une configuration de districts avec positions calculées automatiquement
 * @param {Array} districtDefinitions - Définitions des districts avec text et color
 * @param {Object} sphereConfig - Configuration de la sphère {radius, method}
 * @returns {Array} - Tableau des districts avec positions calculées
 */
export const createDistrictsWithPositions = (
  districtDefinitions,
  sphereConfig
) => {
  const positions = calculateSpherePositions(
    districtDefinitions.length,
    sphereConfig.radius,
    sphereConfig.method
  );

  return districtDefinitions.map((district, index) => ({
    ...district,
    position: positions[index],
  }));
};

/**
 * Configurations prédéfinies pour différents types de distributions
 */
export const SPHERE_PRESETS = {
  compact: { radius: 150, method: "fibonacci" },
  medium: { radius: 300, method: "fibonacci" },
  large: { radius: 500, method: "fibonacci" },
  icosahedral: { radius: 300, method: "icosahedron" },
  octahedral: { radius: 300, method: "octahedron" },
};

/**
 * Méthodes de distribution disponibles avec leurs descriptions
 */
export const DISTRIBUTION_METHODS = {
  fibonacci: {
    name: "Fibonacci",
    description: "Spirale dorée - optimal pour n'importe quel nombre de points",
    optimal: "Tous nombres",
  },
  icosahedron: {
    name: "Icosaèdre",
    description: "Basé sur un icosaèdre - très régulier",
    optimal: "≤12 points",
  },
  octahedron: {
    name: "Octaèdre",
    description: "Basé sur un octaèdre - simple et efficace",
    optimal: "≤8 points",
  },
};
