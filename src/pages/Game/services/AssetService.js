/**
 * Service centralisé pour gérer tous les assets du jeu
 * Ce service permet de centraliser le chargement des assets (textures, sons, données, etc.)
 * en un seul point pour faciliter la gestion et le préchargement.
 */

import { create } from "zustand";
import * as THREE from "three";

// Chemins de base pour les différents types d'assets
const ASSET_PATHS = {
  IMAGES: "img/",
  SOUNDS: "sounds/",
  DATA: "data/",
};

// Types d'assets supportés
export const ASSET_TYPES = {
  TEXTURE: "texture",
  SOUND: "sound",
  DATA: "data",
  JSON: "json",
  GEOMETRY: "geometry", // Nouveau type pour les géométries
  MATERIAL: "material", // Nouveau type pour les matériaux
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
    geometries: {}, // Nouveau cache pour les géométries
    materials: {}, // Nouveau cache pour les matériaux
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

    console.log("[AssetService] Initialisation du service d'assets");

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
        assetsToPreload.push({
          id: data.id,
          url: data.url,
          type: ASSET_TYPES.JSON,
        });
      });
    }

    // Ajouter les géométries si présentes
    if (assetLists.geometries) {
      assetLists.geometries.forEach((geom) => {
        // Les géométries sont créées directement, pas chargées via URL
        get().createGeometry(geom.id, geom.createFn);
      });
    }

    // Ajouter les matériaux si présents
    if (assetLists.materials) {
      assetLists.materials.forEach((mat) => {
        // Les matériaux sont créés directement, pas chargés via URL
        get().createMaterial(mat.id, mat.createFn);
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
        default:
          console.warn(
            `[AssetService] Type d'asset non pris en charge: ${asset.type}`
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
          newAssets.data[id] = asset;
          break;
        case ASSET_TYPES.GEOMETRY:
          newAssets.geometries[id] = asset;
          break;
        case ASSET_TYPES.MATERIAL:
          newAssets.materials[id] = asset;
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
          `[AssetService] Tous les assets sont chargés (${loadedCount}/${assetsList.length})`
        );
      }
    }

    // Fonction appelée en cas d'erreur
    function onAssetError(id, error) {
      console.error(
        `[AssetService] Erreur lors du chargement de l'asset ${id}:`,
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
        return assets.data[id] || null;
      case ASSET_TYPES.GEOMETRY:
        return assets.geometries[id] || null;
      case ASSET_TYPES.MATERIAL:
        return assets.materials[id] || null;
      default:
        console.warn(`[AssetService] Type d'asset non pris en charge: ${type}`);
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
   * Obtenir des données JSON par leur ID
   * @param {string} id - ID des données
   * @returns {Object|null} - Les données demandées ou null
   */
  getData: (id) => {
    return get().getAsset(id, ASSET_TYPES.DATA);
  },

  /**
   * Obtenir une géométrie par son ID
   * @param {string} id - ID de la géométrie
   * @returns {THREE.BufferGeometry|null} - La géométrie demandée ou null
   */
  getGeometry: (id) => {
    return get().getAsset(id, ASSET_TYPES.GEOMETRY);
  },

  /**
   * Obtenir un matériau par son ID
   * @param {string} id - ID du matériau
   * @returns {THREE.Material|null} - Le matériau demandé ou null
   */
  getMaterial: (id) => {
    return get().getAsset(id, ASSET_TYPES.MATERIAL);
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
        baseFolder = ASSET_PATHS.DATA;
        break;
    }

    // Si le chemin inclut déjà le dossier de base, ne pas l'ajouter
    const pathWithBase = cleanPath.startsWith(baseFolder)
      ? cleanPath
      : `${baseFolder}${cleanPath}`;

    // Ajouter le préfixe de base URL
    return `${import.meta.env.BASE_URL}${pathWithBase}`;
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
   * Crée et stocke une géométrie
   * @param {string} id - ID unique pour la géométrie
   * @param {Function} createFn - Fonction qui crée et retourne une instance de THREE.BufferGeometry
   * @returns {THREE.BufferGeometry} - La géométrie créée
   */
  createGeometry: (id, createFn) => {
    // Vérifier si la géométrie existe déjà
    const existingGeometry = get().getGeometry(id);
    if (existingGeometry) {
      return existingGeometry;
    }

    try {
      // Créer la géométrie
      const geometry = createFn();

      // Stocker la géométrie
      const newAssets = { ...get().assets };
      newAssets.geometries[id] = geometry;

      // Mettre à jour l'état
      set({ assets: newAssets });

      return geometry;
    } catch (error) {
      console.error(
        `[AssetService] Erreur lors de la création de la géométrie ${id}:`,
        error
      );
      return null;
    }
  },

  /**
   * Crée et stocke un matériau
   * @param {string} id - ID unique pour le matériau
   * @param {Function} createFn - Fonction qui crée et retourne une instance de THREE.Material
   * @returns {THREE.Material} - Le matériau créé
   */
  createMaterial: (id, createFn) => {
    // Vérifier si le matériau existe déjà
    const existingMaterial = get().getMaterial(id);
    if (existingMaterial) {
      return existingMaterial;
    }

    try {
      // Créer le matériau
      const material = createFn();

      // Stocker le matériau
      const newAssets = { ...get().assets };
      newAssets.materials[id] = material;

      // Mettre à jour l'état
      set({ assets: newAssets });

      return material;
    } catch (error) {
      console.error(
        `[AssetService] Erreur lors de la création du matériau ${id}:`,
        error
      );
      return null;
    }
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

    // Disposer les géométries
    Object.values(assets.geometries).forEach((geometry) => {
      if (geometry && geometry.dispose) {
        geometry.dispose();
      }
    });

    // Disposer les matériaux
    Object.values(assets.materials).forEach((material) => {
      if (material && material.dispose) {
        material.dispose();
      }
    });

    // Réinitialiser l'état
    set({
      assets: {
        textures: {},
        sounds: {},
        data: {},
        geometries: {},
        materials: {},
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
 * Fonction pour préparer la liste des textures à précharger
 * @returns {Array} - Liste des textures à précharger
 */
export function getDefaultTexturesToPreload() {
  // Liste des icônes SVG à précharger
  const svgFiles = [
    // IMPORTANT: Image centrale du jeu (prioritaire)
    "joshua-goldberg.svg",

    // Icônes UI et navigation
    "default.svg",
    "gamepad.svg",
    "keyboard.svg",
    "arrows.svg",
    "wasd.svg",
    "zqsd.svg",
    "hud.svg",
    "star-1.svg",
    "star-2.svg",
    "star-3.svg",
    "star-4.svg",
    "star-5.svg",
    "star-6.svg",

    // Personnages et éléments centraux
    "character.svg",
    "journalist.svg",

    // Plateformes et réseaux sociaux
    "facebook.svg",
    "twitter.svg",
    "reddit.svg",
    "youtube.svg",
    "wikipedia.svg",
    "wordpress.svg",
    "medium.svg",
  ];

  // Images PNG et autres formats à précharger
  const imageFiles = [
    // Images principales
    "character.png",
    "journalist.png",
    "fbi.png",
    "facebook.webp",
  ];

  // Liste pour stocker toutes les textures à précharger
  const texturesToPreload = [];

  // Ajouter les icônes SVG
  svgFiles.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/${file}`,
    });
  });

  // Ajouter les images dans le dossier principal
  imageFiles.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/${file}`,
    });
  });

  return texturesToPreload;
}

/**
 * Fonction pour préparer la liste des sons à précharger
 * @returns {Array} - Liste des sons à précharger
 */
export function getDefaultSoundsToPreload() {
  const soundFiles = [
    "ambiant.mp3",
    "interview.mp3",
    "touch-a.mp3",
    "touch-2.mp3",
  ];

  return soundFiles.map((file) => ({
    id: file,
    url: `/sounds/${file}`,
  }));
}

/**
 * Fonction pour préparer la liste des données à précharger
 * @returns {Array} - Liste des données à précharger
 */
export function getDefaultDataToPreload() {
  return [
    {
      id: "database",
      url: `/data/database.data.json`,
    },
    {
      id: "graph",
      url: `/data/final_spatialized_graph.data.json`,
    },
  ];
}

/**
 * Fonction pour préparer la liste des géométries communes à précharger
 * @returns {Array} - Liste des géométries à précharger
 */
export function getDefaultGeometriesToPreload() {
  return [
    {
      id: "sphere-simple",
      createFn: () => new THREE.SphereGeometry(1, 8, 8),
    },
    {
      id: "sphere-detailed",
      createFn: () => new THREE.SphereGeometry(1, 16, 16),
    },
    {
      id: "plane",
      createFn: () => new THREE.PlaneGeometry(1, 1),
    },
    {
      id: "box",
      createFn: () => new THREE.BoxGeometry(1, 1, 1),
    },
    {
      id: "ring",
      createFn: () => new THREE.RingGeometry(0.5, 1, 32),
    },
  ];
}

/**
 * Fonction pour préparer la liste des matériaux communs à précharger
 * @returns {Array} - Liste des matériaux à précharger
 */
export function getDefaultMaterialsToPreload() {
  return [
    {
      id: "basic-white",
      createFn: () =>
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        }),
    },
    {
      id: "line-white",
      createFn: () =>
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
        }),
    },
    {
      id: "line-dashed",
      createFn: () =>
        new THREE.LineDashedMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
          dashSize: 1,
          gapSize: 0.5,
        }),
    },
  ];
}

/**
 * Initialise le service d'assets avec les listes par défaut
 */
export function initializeAssetService() {
  const textures = getDefaultTexturesToPreload();
  const sounds = getDefaultSoundsToPreload();
  const data = getDefaultDataToPreload();
  const geometries = getDefaultGeometriesToPreload();
  const materials = getDefaultMaterialsToPreload();

  useAssetStore.getState().initialize({
    textures,
    sounds,
    data,
    geometries,
    materials,
  });

  return useAssetStore.getState();
}

// Exporter le store par défaut
export default useAssetStore;
