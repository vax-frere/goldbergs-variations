import { create } from "zustand";

/**
 * Store global pour l'application de jeu
 * Gère l'état partagé comme les clusters actifs et autres données persistantes
 */
const useGameStore = create((set) => ({
  // État du cluster actuellement actif
  activeClusterId: null,
  activeClusterName: null,
  activeClusterSlug: null,

  // Fonction pour définir le cluster actif
  setActiveCluster: (clusterId, clusterName = null, clusterSlug = null) =>
    set({
      activeClusterId: clusterId,
      activeClusterName: clusterName,
      activeClusterSlug: clusterSlug,
    }),

  // État d'autres éléments du jeu peut être ajouté ici
  // ...
}));

export default useGameStore;
