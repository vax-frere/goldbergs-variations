import chroma from "chroma-js";

/**
 * Couleurs de base pour les groupes thématiques
 * Schéma catégoriel optimisé pour la distinction visuelle en dataviz
 * Basé sur les palettes qualitatives de ColorBrewer et D3
 *
 * Priorité : distinction maximale entre les couleurs
 * Secondaire : cohérence thématique quand possible
 */
export const BASE_THEMATIC_COLORS = {
  // Bleu vif - droite traditionnelle
  Conservatives: "#1f77b4", // Bleu D3 catégorie 1

  // Rouge vif - gauche/justice sociale
  "Social justice": "#d62728", // Rouge D3 catégorie 2

  // Orange vif - libertariens
  Libertarians: "#ff7f0e", // Orange D3 catégorie 3

  // Vert vif - nationalistes
  Nationalists: "#2ca02c", // Vert D3 catégorie 4

  // Violet vif - culture
  Culture: "#9467bd", // Violet D3 catégorie 5

  // Marron - religieux (terre, tradition)
  Religious: "#8c564b", // Marron D3 catégorie 6

  // Rose vif - antisystème (provocateur)
  Antisystem: "#e377c2", // Rose D3 catégorie 7
};

/**
 * Couleurs pastel dérivées automatiquement des couleurs de base
 * Utilisées pour les nœuds et liens dans le graphe
 */
export const THEMATIC_COLORS = Object.fromEntries(
  Object.entries(BASE_THEMATIC_COLORS).map(([key, color]) => [
    key,
    chroma(color).brighten(1.5).desaturate(2).hex(),
  ])
);

/**
 * Get a darker version of a color using chroma-js
 * @param {string} color - The hex color to darken
 * @param {number} factor - The darken factor (default: 0.7)
 * @returns {string} - The darkened hex color
 */
export const getDarkerColor = (color, factor = 0.5) => {
  return chroma(color).darken(factor).hex();
};

/**
 * Get a very dark version of a color for visited nodes using chroma-js
 * @param {string} color - The hex color to darken significantly
 * @returns {string} - The very dark hex color
 */
export const getVisitedNodeColor = (color) => {
  return chroma(color).darken(3).hex();
};
