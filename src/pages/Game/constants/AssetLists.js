/**
 * Constantes pour les listes d'assets à précharger
 * Ce fichier centralise toutes les listes d'assets du jeu pour
 * faciliter leur gestion et leur mise à jour.
 */

import {
  getAssetPath,
  getImagePath,
  getSoundPath,
  getDataPath,
} from "../../../utils/assetLoader";

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
  "astroboy.svg",
  "thug.svg",
  "trollface.svg",
  "heart-1.svg",
  "heart-2.svg",
  "heart-3.svg",
  "star-1.svg",
  "star-2.svg",
  "star-3.svg",
  "star-4.svg",
  "star-5.svg",
  "star-6.svg",
  "music-note-1.svg",
  "music-note-2.svg",
  "music-note-3.svg",
  "ak47.svg",

  // Characters
  "characters/character.svg",
  "characters/journalist.svg",
  "characters/fbi.svg",

  // Interface utilisateur
  "default.svg",
  "hud.svg",
  "mute.svg",
  "unmute.svg",
  "cassette.svg",

  // Plateformes et réseaux sociaux
  "platforms/4chan.svg",
  "platforms/4plebs.svg",
  "platforms/8chan.svg",
  "platforms/adult-swim.svg",
  "platforms/adultswim.svg",
  "platforms/anime-news-network.svg",
  "platforms/animesuki.svg",
  "platforms/bluelight.svg",
  "platforms/dailykos.svg",
  "platforms/dailystormer.svg",
  "platforms/deviantart.svg",
  "platforms/disqus.svg",
  "platforms/e-mail.svg",
  "platforms/email.svg",
  "platforms/facebook.svg",
  "platforms/feministing.svg",
  "platforms/filmboard.svg",
  "platforms/imdb.svg",
  "platforms/lastfm.svg",
  "platforms/medium.svg",
  "platforms/reddit.svg",
  "platforms/stormfront.svg",
  "platforms/surespot.svg",
  "platforms/techdirt.svg",
  "platforms/thoughtcatalog.svg",
  "platforms/times-of-israel.svg",
  "platforms/tough-catalog.svg",
  "platforms/toughcatalog.svg",
  "platforms/twitter.svg",
  "platforms/wikipedia.svg",
  "platforms/wordpress.svg",
  "platforms/youtube.svg",
];

// Liste des images PNG et autres formats à charger
export const IMAGE_FILES = [
  // Personnages et éléments principaux
  "particle.png",
  "background.png", // Image pour la skybox
  // "space.hdr", // HDR pour la skybox
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

  "cluster-off.mp3",

  // Sons de cassette
  "cassette-in.mp3",
  "cassette-out.mp3",

  // Fragments audio
  "fragments/intro.mp3",
];

// Liste des fichiers de données à charger
export const DATA_FILES = [
  {
    id: "database",
    file: "database.data.json",
  },
  {
    id: "graph",
    file: "spatialized_graph.data.json",
  },
  {
    id: "srt_interview",
    file: "interview.srt",
  },
  {
    id: "platforms",
    file: "platforms.data.json",
  },
  {
    id: "srt_intro",
    file: "fragments/intro.srt",
  },
];

// Liste des SVGs pour le HUD React (contenu brut)
export const HUD_SVG_FILES = ["cassette.svg", "mute.svg", "unmute.svg"];

/**
 * Fonction qui convertit la liste des SVGs en format attendu par l'AssetManager
 * @returns {Array} Liste des textures SVG à précharger
 */
export function getSvgTextures() {
  return SVG_FILES.map((file) => ({
    id: file,
    url: getImagePath(file),
  }));
}

/**
 * Fonction qui convertit la liste des images en format attendu par l'AssetManager
 * @returns {Array} Liste des textures images à précharger
 */
export function getImageTextures() {
  return IMAGE_FILES.map((file) => ({
    id: file,
    url: getImagePath(file),
  }));
}

/**
 * Fonction qui convertit la liste des images de personnages en format attendu par l'AssetManager
 * @returns {Array} Liste des textures de personnages à précharger
 */
export function getCharacterTextures() {
  return CHARACTER_IMAGES.map((file) => ({
    id: file,
    url: getImagePath(`characters/${file}`),
  }));
}

/**
 * Fonction qui extrait et convertit les SVGs des plateformes en format attendu par l'AssetManager
 * @returns {Array} Liste des textures de plateformes à précharger
 */
export function getPlatformTextures() {
  // Filtrer les SVGs qui sont dans le dossier platforms/
  const platformSvgs = SVG_FILES.filter((file) =>
    file.startsWith("platforms/")
  );

  return platformSvgs.map((file) => ({
    id: file,
    url: getImagePath(file),
  }));
}

/**
 * Fonction qui convertit la liste des sons en format attendu par l'AssetManager
 * @returns {Array} Liste des sons à précharger
 */
export function getSounds() {
  return SOUND_FILES.map((file) => ({
    id: file,
    url: getSoundPath(file),
  }));
}

/**
 * Fonction qui convertit la liste des données en format attendu par l'AssetManager
 * @returns {Array} Liste des données à précharger
 */
export function getDataFiles() {
  return DATA_FILES.map((item) => ({
    id: item.id,
    url: getDataPath(item.file),
  }));
}

/**
 * Fonction qui convertit la liste des SVG HUD en format attendu par l'AssetManager
 * @returns {Array} Liste des SVG HUD à précharger comme contenu brut
 */
export function getHudSvgs() {
  return HUD_SVG_FILES.map((file) => ({
    id: file,
    url: getImagePath(file),
    type: "svg", // Type spécifique pour les SVG React
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
      ...getPlatformTextures(),
    ],
    sounds: getSounds(),
    data: getDataFiles(),
    hudSvgs: getHudSvgs(),
  };
}

export default {
  SVG_FILES,
  IMAGE_FILES,
  CHARACTER_IMAGES,
  SOUND_FILES,
  DATA_FILES,
  HUD_SVG_FILES,
  getSvgTextures,
  getImageTextures,
  getCharacterTextures,
  getPlatformTextures,
  getSounds,
  getDataFiles,
  getHudSvgs,
  getAllAssets,
};
