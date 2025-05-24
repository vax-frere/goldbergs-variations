import { create } from "zustand";
import * as THREE from "three";
import { ASSET_PATHS, getAllAssets } from "../constants/AssetLists";

// Types d'assets supportés
export const ASSET_TYPES = {
  TEXTURE: "texture",
  SOUND: "sound",
  DATA: "data",
  JSON: "json",
  TEXT: "text", // Nouveau type pour les fichiers texte (comme SRT)
};

/**
 * Store central pour gérer l'état des assets
 */
const useAssetStore = create((set, get) => ({
  // État initial
  assets: {
    textures: {},
    sounds: {},
    data: {},
  },
  loading: {
    inProgress: false,
    total: 0,
    loaded: 0,
    progress: 0,
    errors: [],
  },
  initialized: false,

  /**
   * Initialiser le service avec les listes d'assets à précharger
   * @param {Object} assetLists - Listes d'assets à précharger par type
   */
  initialize: (assetLists = {}) => {
    const state = get();
    if (state.initialized) return;

    console.log("[AssetManager] Initialisation du gestionnaire d'assets");

    // Liste complète des assets à précharger
    const assetsToPreload = [];

    // Ajouter les textures
    if (assetLists.textures) {
      assetLists.textures.forEach((texture) => {
        assetsToPreload.push({
          id: texture.id,
          url: texture.url,
          type: ASSET_TYPES.TEXTURE,
        });
      });
    }

    // Ajouter les sons
    if (assetLists.sounds) {
      assetLists.sounds.forEach((sound) => {
        assetsToPreload.push({
          id: sound.id,
          url: sound.url,
          type: ASSET_TYPES.SOUND,
        });
      });
    }

    // Ajouter les données
    if (assetLists.data) {
      assetLists.data.forEach((data) => {
        // Déterminer le type de données basé sur l'extension du fichier
        const fileType = detectFileType(data.url);

        assetsToPreload.push({
          id: data.id,
          url: data.url,
          type: fileType,
        });
      });
    }

    // Commencer le préchargement
    if (assetsToPreload.length > 0) {
      get().preloadAssets(assetsToPreload);
    }

    set({ initialized: true });
  },

  /**
   * Précharge une liste d'assets
   * @param {Array} assetsList - Liste des assets à précharger
   */
  preloadAssets: (assetsList) => {
    const state = get();

    // Mise à jour de l'état de chargement
    set({
      loading: {
        ...state.loading,
        inProgress: true,
        total: assetsList.length,
        loaded: 0,
        progress: 0,
      },
    });

    // Compteur pour suivre le nombre d'assets chargés
    let loadedCount = 0;

    // Charger chaque asset en fonction de son type
    assetsList.forEach((asset) => {
      switch (asset.type) {
        case ASSET_TYPES.TEXTURE:
          loadTexture(asset.url, asset.id, onAssetLoaded, onAssetError);
          break;
        case ASSET_TYPES.SOUND:
          // Pour les sons, on précharge juste l'URL pour le moment
          onAssetLoaded(asset.id, asset.url, ASSET_TYPES.SOUND);
          break;
        case ASSET_TYPES.JSON:
          loadJSON(asset.url, asset.id, onAssetLoaded, onAssetError);
          break;
        case ASSET_TYPES.TEXT:
          loadText(asset.url, asset.id, onAssetLoaded, onAssetError);
          break;
        default:
          console.warn(
            `[AssetManager] Type d'asset non pris en charge: ${asset.type}`
          );
          // Incrémenter quand même pour ne pas bloquer le chargement
          onAssetLoaded(asset.id, null, asset.type);
      }
    });

    // Fonction appelée quand un asset est chargé
    function onAssetLoaded(id, asset, type) {
      loadedCount++;

      // Mettre à jour l'état des assets
      const newAssets = { ...get().assets };

      // Stocker l'asset dans la catégorie correspondante
      switch (type) {
        case ASSET_TYPES.TEXTURE:
          newAssets.textures[id] = asset;
          break;
        case ASSET_TYPES.SOUND:
          newAssets.sounds[id] = asset;
          break;
        case ASSET_TYPES.JSON:
        case ASSET_TYPES.DATA:
        case ASSET_TYPES.TEXT:
          newAssets.data[id] = asset;
          break;
      }

      // Calculer la progression
      const progress = Math.floor((loadedCount / assetsList.length) * 100);

      // Mettre à jour l'état
      set({
        assets: newAssets,
        loading: {
          ...get().loading,
          loaded: loadedCount,
          progress,
          inProgress: loadedCount < assetsList.length,
        },
      });

      // Si tous les assets sont chargés, marquer comme terminé
      if (loadedCount === assetsList.length) {
        console.log(
          `[AssetManager] Tous les assets sont chargés (${loadedCount}/${assetsList.length})`
        );
      }
    }

    // Fonction appelée en cas d'erreur
    function onAssetError(id, error) {
      console.error(
        `[AssetManager] Erreur lors du chargement de l'asset ${id}:`,
        error
      );

      // Ajouter l'erreur à la liste
      const newErrors = [...get().loading.errors, { id, error }];

      // Mettre à jour l'état des erreurs, mais continuer le chargement
      set({
        loading: {
          ...get().loading,
          errors: newErrors,
        },
      });

      // Incrémenter quand même pour ne pas bloquer le chargement
      onAssetLoaded(id, null, "error");
    }
  },

  /**
   * Obtenir un asset par son ID et son type
   * @param {string} id - ID de l'asset
   * @param {string} type - Type de l'asset (ASSET_TYPES)
   * @returns {any} - L'asset demandé ou null s'il n'existe pas
   */
  getAsset: (id, type) => {
    const { assets } = get();

    switch (type) {
      case ASSET_TYPES.TEXTURE:
        return assets.textures[id] || null;
      case ASSET_TYPES.SOUND:
        return assets.sounds[id] || null;
      case ASSET_TYPES.JSON:
      case ASSET_TYPES.DATA:
      case ASSET_TYPES.TEXT:
        return assets.data[id] || null;
      default:
        console.warn(`[AssetManager] Type d'asset non pris en charge: ${type}`);
        return null;
    }
  },

  /**
   * Obtenir une texture par son ID
   * @param {string} id - ID de la texture
   * @returns {THREE.Texture|null} - La texture demandée ou null
   */
  getTexture: (id) => {
    return get().getAsset(id, ASSET_TYPES.TEXTURE);
  },

  /**
   * Obtenir le chemin d'un son par son ID
   * @param {string} id - ID du son
   * @returns {string|null} - Le chemin du son demandé ou null
   */
  getSound: (id) => {
    return get().getAsset(id, ASSET_TYPES.SOUND);
  },

  /**
   * Obtenir des données par leur ID
   * @param {string} id - ID des données
   * @returns {Object|string|null} - Les données demandées ou null
   */
  getData: (id) => {
    return get().getAsset(id, ASSET_TYPES.DATA);
  },

  /**
   * Construit et retourne le chemin complet d'un asset
   * @param {string} path - Chemin relatif de l'asset
   * @param {string} type - Type d'asset (pour déterminer le dossier de base)
   * @returns {string} - Chemin complet de l'asset
   */
  getAssetPath: (path, type) => {
    // Supprimer le slash initial s'il est présent
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;

    // Déterminer le dossier de base en fonction du type
    let baseFolder = "";
    switch (type) {
      case ASSET_TYPES.TEXTURE:
        baseFolder = ASSET_PATHS.IMAGES;
        break;
      case ASSET_TYPES.SOUND:
        baseFolder = ASSET_PATHS.SOUNDS;
        break;
      case ASSET_TYPES.JSON:
      case ASSET_TYPES.DATA:
      case ASSET_TYPES.TEXT:
        baseFolder = ASSET_PATHS.DATA;
        break;
    }

    // Si le chemin inclut déjà le dossier de base, ne pas l'ajouter
    const pathWithBase = cleanPath.startsWith(baseFolder.substring(1))
      ? cleanPath
      : `${baseFolder.substring(1)}${cleanPath}`;

    // Ajouter le préfixe de base URL si défini
    const baseUrl = import.meta.env.BASE_URL || "/";
    // S'assurer qu'il n'y a pas de double slash
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${cleanBaseUrl}${pathWithBase}`;
  },

  /**
   * Obtenir le chemin complet d'une image
   * @param {string} path - Chemin relatif de l'image
   * @returns {string} - Chemin complet de l'image
   */
  getImagePath: (path) => {
    return get().getAssetPath(path, ASSET_TYPES.TEXTURE);
  },

  /**
   * Obtenir le chemin complet d'un son
   * @param {string} path - Chemin relatif du son
   * @returns {string} - Chemin complet du son
   */
  getSoundPath: (path) => {
    return get().getAssetPath(path, ASSET_TYPES.SOUND);
  },

  /**
   * Obtenir le chemin complet d'un fichier de données
   * @param {string} path - Chemin relatif du fichier de données
   * @returns {string} - Chemin complet du fichier de données
   */
  getDataPath: (path) => {
    return get().getAssetPath(path, ASSET_TYPES.DATA);
  },

  /**
   * Nettoie les ressources (dispose)
   */
  dispose: () => {
    const { assets } = get();

    // Disposer les textures
    Object.values(assets.textures).forEach((texture) => {
      if (texture && texture.dispose) {
        texture.dispose();
      }
    });

    // Réinitialiser l'état
    set({
      assets: {
        textures: {},
        sounds: {},
        data: {},
      },
      initialized: false,
    });
  },
}));

/**
 * Fonction utilitaire pour charger une texture
 * @param {string} url - URL de la texture
 * @param {string} id - ID de la texture
 * @param {Function} onLoaded - Callback appelé quand la texture est chargée
 * @param {Function} onError - Callback appelé en cas d'erreur
 */
function loadTexture(url, id, onLoaded, onError) {
  const textureLoader = new THREE.TextureLoader();

  textureLoader.load(
    url,
    (texture) => {
      // Configurer la texture
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;

      // Appeler le callback
      onLoaded(id, texture, ASSET_TYPES.TEXTURE);
    },
    undefined,
    (error) => {
      // Appeler le callback d'erreur
      onError(id, error);
    }
  );
}

/**
 * Fonction utilitaire pour charger un fichier JSON
 * @param {string} url - URL du fichier JSON
 * @param {string} id - ID du fichier JSON
 * @param {Function} onLoaded - Callback appelé quand le fichier est chargé
 * @param {Function} onError - Callback appelé en cas d'erreur
 */
function loadJSON(url, id, onLoaded, onError) {
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      onLoaded(id, data, ASSET_TYPES.JSON);
    })
    .catch((error) => {
      onError(id, error);
    });
}

/**
 * Fonction utilitaire pour charger un fichier texte (comme SRT)
 * @param {string} url - URL du fichier texte
 * @param {string} id - ID du fichier
 * @param {Function} onLoaded - Callback appelé quand le fichier est chargé
 * @param {Function} onError - Callback appelé en cas d'erreur
 */
function loadText(url, id, onLoaded, onError) {
  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      return response.text();
    })
    .then((data) => {
      onLoaded(id, data, ASSET_TYPES.TEXT);
    })
    .catch((error) => {
      onError(id, error);
    });
}

/**
 * Détecter le type de fichier basé sur son extension
 * @param {string} url - URL du fichier
 * @returns {string} - Type d'asset correspondant
 */
function detectFileType(url) {
  const extension = url.split(".").pop().toLowerCase();

  switch (extension) {
    case "json":
      return ASSET_TYPES.JSON;
    case "srt":
    case "txt":
    case "csv":
    case "xml":
      return ASSET_TYPES.TEXT;
    default:
      return ASSET_TYPES.DATA;
  }
}

/**
 * Initialise le service d'assets avec les listes par défaut
 */
export function initializeAssetManager() {
  // Utiliser les listes d'assets définies dans le fichier de constantes
  const assetLists = getAllAssets();

  useAssetStore.getState().initialize(assetLists);

  return useAssetStore.getState();
}

// Exporter le store par défaut
export default useAssetStore;
