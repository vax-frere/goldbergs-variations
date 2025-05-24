/**
 * Constantes pour les listes d'assets à précharger
 * Ce fichier centralise toutes les listes d'assets du jeu pour
 * faciliter leur gestion et leur mise à jour.
 */

// Chemins de base pour les différents types d'assets
export const ASSET_PATHS = {
  IMAGES: "/img/",
  SOUNDS: "/sounds/",
  DATA: "/data/",
};

// Liste des SVGs à charger
export const SVG_FILES = [
  // Personnages et éléments principaux
  "joshua-goldberg.svg",
  "character.svg",
  "journalist.svg",

  // Interface utilisateur
  "default.svg",
  "hud.svg",

  // Plateformes et réseaux sociaux
  "facebook.svg",
  "twitter.svg",
  "reddit.svg",
  "youtube.svg",
  "wikipedia.svg",
  "wordpress.svg",
  "medium.svg",
];

// Liste des images PNG et autres formats à charger
export const IMAGE_FILES = [
  // Personnages et éléments principaux
  "particle.png",
];

// Liste des images de personnages à charger
export const CHARACTER_IMAGES = [
  "24-129-100-84.png",
  "amina-blackberry.png",
  "bw anime fan.png",
  "Death_to_SJWs.png",
  "emily-americana.png",
  "emily-goldstein.png",
  "josh-bornstein.png",
  "madotsuki-the-dreamer.png",
  "metacanadian.png",
  "michael-slay.png",
  "moon-metropolis.png",
  "ryoko-tamada.png",
  "tanya-cohen.png",
  "wake-up-white-man.png",
];

// Liste des sons à charger
export const SOUND_FILES = [
  // Ambiance et musique
  "ambiant.mp3",
  "interview.mp3",

  // Effets sonores
  "click.mp3",
  "hover.mp3",
];

// Liste des fichiers de données à charger
export const DATA_FILES = [
  {
    id: "database",
    file: "database.data.json",
  },
  {
    id: "graph",
    file: "final_spatialized_graph.data.json",
  },
  {
    id: "srt_interview",
    file: "interview.srt",
  },
];

/**
 * Fonction qui convertit la liste des SVGs en format attendu par l'AssetManager
 * @returns {Array} Liste des textures SVG à précharger
 */
export function getSvgTextures() {
  return SVG_FILES.map((file) => ({
    id: file,
    url: `${ASSET_PATHS.IMAGES}${file}`,
  }));
}

/**
 * Fonction qui convertit la liste des images en format attendu par l'AssetManager
 * @returns {Array} Liste des textures images à précharger
 */
export function getImageTextures() {
  return IMAGE_FILES.map((file) => ({
    id: file,
    url: `${ASSET_PATHS.IMAGES}${file}`,
  }));
}

/**
 * Fonction qui convertit la liste des images de personnages en format attendu par l'AssetManager
 * @returns {Array} Liste des textures de personnages à précharger
 */
export function getCharacterTextures() {
  return CHARACTER_IMAGES.map((file) => ({
    id: `character_${file}`, // Préfixe pour éviter les conflits
    url: `${ASSET_PATHS.IMAGES}characters/${file}`,
  }));
}

/**
 * Fonction qui convertit la liste des sons en format attendu par l'AssetManager
 * @returns {Array} Liste des sons à précharger
 */
export function getSounds() {
  return SOUND_FILES.map((file) => ({
    id: file,
    url: `${ASSET_PATHS.SOUNDS}${file}`,
  }));
}

/**
 * Fonction qui convertit la liste des données en format attendu par l'AssetManager
 * @returns {Array} Liste des données à précharger
 */
export function getDataFiles() {
  return DATA_FILES.map((item) => ({
    id: item.id,
    url: `${ASSET_PATHS.DATA}${item.file}`,
  }));
}

/**
 * Fonction qui retourne toutes les listes d'assets à précharger
 * @returns {Object} Toutes les listes d'assets à précharger
 */
export function getAllAssets() {
  return {
    textures: [
      ...getSvgTextures(),
      ...getImageTextures(),
      ...getCharacterTextures(),
    ],
    sounds: getSounds(),
    data: getDataFiles(),
  };
}

export default {
  SVG_FILES,
  IMAGE_FILES,
  CHARACTER_IMAGES,
  SOUND_FILES,
  DATA_FILES,
  getSvgTextures,
  getImageTextures,
  getCharacterTextures,
  getSounds,
  getDataFiles,
  getAllAssets,
};
