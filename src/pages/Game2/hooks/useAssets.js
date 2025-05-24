import { useState, useEffect } from "react";
import useAssetStore, {
  initializeAssetManager,
} from "../services/AssetManager";

/**
 * Hook personnalisé pour faciliter l'utilisation du gestionnaire d'assets
 * @param {Object} options - Options de configuration
 * @param {boolean} options.autoInit - Si true, initialise automatiquement le gestionnaire d'assets
 * @returns {Object} - API pour interagir avec le gestionnaire d'assets
 */
const useAssets = (options = { autoInit: true }) => {
  const { autoInit = true } = options;

  // États locaux pour suivre l'état de chargement
  const [isReady, setIsReady] = useState(useAssetStore.getState().initialized);
  const [progress, setProgress] = useState(0);

  // Initialiser le gestionnaire d'assets si autoInit est true
  useEffect(() => {
    if (autoInit && !isReady) {
      // Initialiser le gestionnaire
      const assetManager = initializeAssetManager();

      // S'abonner aux mises à jour de l'état
      const unsubscribe = useAssetStore.subscribe((state) => {
        setProgress(state.loading.progress);
        setIsReady(!state.loading.inProgress && state.initialized);
      });

      // Se désabonner quand le composant est démonté
      return () => {
        unsubscribe();
      };
    }
  }, [autoInit, isReady]);

  // Fonctions utilitaires pour obtenir différents types d'assets
  const getTexture = (id) => useAssetStore.getState().getTexture(id);
  const getSound = (id) => useAssetStore.getState().getSound(id);
  const getData = (id) => useAssetStore.getState().getData(id);
  const getImagePath = (path) => useAssetStore.getState().getImagePath(path);
  const getSoundPath = (path) => useAssetStore.getState().getSoundPath(path);

  // Fonction pour charger des données JSON (utile pour charger le graphe)
  const loadGraphData = async () => {
    // Si les données sont déjà chargées, les retourner directement
    const existingData = getData("database");
    if (existingData) {
      return existingData;
    }

    // Sinon, charger les données via une promesse
    return new Promise((resolve, reject) => {
      try {
        const dataPath = useAssetStore
          .getState()
          .getDataPath("database.data.json");
        fetch(dataPath)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Erreur HTTP: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            resolve(data);
          })
          .catch((error) => {
            console.error(
              "Erreur lors du chargement des données du graphe:",
              error
            );
            reject(error);
          });
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        reject(error);
      }
    });
  };

  // Retourner une API complète pour interagir avec le gestionnaire d'assets
  return {
    isReady,
    progress,
    getTexture,
    getSound,
    getData,
    getImagePath,
    getSoundPath,
    loadGraphData,
  };
};

export default useAssets;
