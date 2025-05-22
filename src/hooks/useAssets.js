/**
 * Hook personnalisé pour utiliser le service d'assets dans les composants React
 */

import { useEffect, useState, useCallback } from "react";
import useAssetStore, {
  ASSET_TYPES,
  initializeAssetService,
} from "../services/AssetService";

/**
 * Hook pour initialiser et utiliser le service d'assets
 * @param {Object} options - Options de configuration
 * @param {boolean} options.autoInit - Initialiser automatiquement le service (défaut: true)
 * @returns {Object} - État et fonctions du service d'assets
 */
const useAssets = (options = { autoInit: true }) => {
  // État pour suivre l'initialisation locale
  const [isInitialized, setIsInitialized] = useState(false);
  // État local pour stocker des données personnalisées
  const [customData, setCustomDataState] = useState({});

  // Obtenir l'état et les fonctions du store
  const {
    assets,
    loading,
    initialized: storeInitialized,
    // Assets getters
    getTexture,
    getSound: getSoundAsset,
    getData: getDataAsset,
    getGeometry,
    getMaterial,
    getInstancedMesh,
    // Path getters
    getImagePath,
    getSoundPath,
    getDataPath,
    // Asset creation
    createGeometry,
    createMaterial,
    createInstancedMesh,
    // Cleanup
    dispose,
  } = useAssetStore();

  // Fonction pour initialiser le service si nécessaire
  const initialize = useCallback(() => {
    if (!storeInitialized) {
      initializeAssetService();
    }
    setIsInitialized(true);
  }, [storeInitialized]);

  // Initialiser automatiquement si demandé
  useEffect(() => {
    if (options.autoInit && !isInitialized && !storeInitialized) {
      initialize();
    }
  }, [options.autoInit, isInitialized, storeInitialized, initialize]);

  // Fonction utilitaire pour obtenir l'URL d'une image (avec préfixe de chemin)
  const getImage = useCallback(
    (path) => {
      return getImagePath(path);
    },
    [getImagePath]
  );

  // Fonction utilitaire pour obtenir l'URL d'un son (avec préfixe de chemin)
  const getSound = useCallback(
    (path) => {
      return getSoundPath(path);
    },
    [getSoundPath]
  );

  // Fonction utilitaire pour obtenir l'URL d'un fichier de données (avec préfixe de chemin)
  const getData = useCallback(
    (path) => {
      return getDataPath(path);
    },
    [getDataPath]
  );

  // Fonction pour vérifier si tous les assets sont chargés
  const isReady = !loading.inProgress && loading.loaded === loading.total;

  // Fonction pour stocker des données personnalisées
  const setCustomData = useCallback((id, data) => {
    setCustomDataState((prevState) => ({
      ...prevState,
      [id]: data,
    }));
  }, []);

  // Fonction pour récupérer des données personnalisées
  const getCustomData = useCallback(
    (id) => {
      return customData[id] || null;
    },
    [customData]
  );

  // Effet pour nettoyer les ressources lors du démontage
  useEffect(() => {
    // Ne pas nettoyer lors du démontage si options.cleanupOnUnmount est explicitement à false
    if (options.cleanupOnUnmount === false) return;

    return () => {
      // Si cleanupOnUnmount est true ou non spécifié, nettoyer lors du démontage
      if (options.cleanupOnUnmount !== false && storeInitialized) {
        // dispose(); // Attention: à activer uniquement si vous voulez nettoyer à chaque démontage
        // Par défaut, on ne nettoie pas pour permettre la réutilisation
      }
    };
  }, [storeInitialized, options.cleanupOnUnmount]);

  // Retourner l'état et les fonctions utiles
  return {
    // État
    loading,
    isReady,
    progress: loading.progress,

    // Fonctions d'initialisation
    initialize,

    // Getters pour les assets
    getTexture,
    getSoundAsset,
    getDataAsset,
    getGeometry,
    getMaterial,
    getInstancedMesh,

    // Fonctions utilitaires pour les chemins
    getImagePath,
    getSoundPath,
    getDataPath,

    // Aliases plus courts
    getImage,
    getSound,
    getData,
    getAudio: getSound,

    // Fonctions de création d'assets Three.js
    createGeometry,
    createMaterial,
    createInstancedMesh,

    // Fonction de nettoyage
    dispose,

    // Fonctions pour gérer les données personnalisées
    getCustomData,
    setCustomData,

    // Types d'assets (pour référence)
    ASSET_TYPES,
  };
};

export default useAssets;
