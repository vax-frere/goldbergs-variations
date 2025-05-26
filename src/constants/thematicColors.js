/**
 * Définition des couleurs pour les groupes thématiques
 * Ces couleurs sont utilisées dans tout le projet pour maintenir une cohérence visuelle
 *
 * Code couleur politique :
 * - Tons bleus : droite traditionnelle (Conservatives, Religious)
 * - Tons rouges/roses : gauche (Social justice)
 * - Tons jaunes/oranges : libertariens/antisystème
 * - Tons verts : nationalistes
 * - Tons violets : culture
 */
export const THEMATIC_COLORS = {
  // Droite traditionnelle - tons bleus
  Conservatives: "#a8c9e8", // Bleu pastel clair
  Religious: "#b7d7f7", // Bleu pastel plus clair

  // Gauche - tons rouges/roses
  "Social justice": "#ffb3b3", // Rose pastel

  // Libertariens et antisystème - tons jaunes/oranges
  Libertarians: "#ffd6a5", // Orange pastel
  Antisystem: "#ffe5b4", // Pêche pastel

  // Nationalistes - tons verts
  Nationalists: "#b5e3b5", // Vert pastel

  // Culture - tons violets
  Culture: "#e0b0ff", // Violet pastel
};

// Couleurs saturées pour les labels de quartiers
export const DISTRICT_LABEL_COLORS = {
  // Droite traditionnelle - tons bleus
  Conservatives: "#2980b9", // Bleu vif
  Religious: "#3498db", // Bleu clair vif

  // Gauche - tons rouges/roses
  "Social justice": "#e74c3c", // Rouge vif

  // Libertariens et antisystème - tons jaunes/oranges
  Libertarians: "#f39c12", // Orange vif
  Antisystem: "#f1c40f", // Jaune vif

  // Nationalistes - tons verts
  Nationalists: "#27ae60", // Vert vif

  // Culture - tons violets
  Culture: "#9b59b6", // Violet vif
};

/**
 * Obtenir une version plus sombre d'une couleur pour les éléments visités
 * @param {string} color - Couleur hexadécimale
 * @returns {string} - Version plus sombre de la couleur
 */
export const getDarkerColor = (color) => {
  const darkenFactor = 0.7; // Augmenté de 0.5 à 0.7 pour un contraste plus doux avec les pastels
  // Convertir la couleur hex en RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Assombrir chaque composante
  const darkerR = Math.floor(r * darkenFactor);
  const darkerG = Math.floor(g * darkenFactor);
  const darkerB = Math.floor(b * darkenFactor);

  // Convertir en hex et retourner
  return `#${darkerR.toString(16).padStart(2, "0")}${darkerG
    .toString(16)
    .padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;
};
