import { create } from "zustand";

/**
 * Store local pour le graphe uniquement
 * Ce store ne sert que pour les optimisations internes du graphe
 * et n'est pas destiné à être utilisé par des composants externes
 */
const useGraphStore = create((set) => ({
  // Cache pour les géométries
  geometryCache: new Map(),

  // Cache pour les matériaux
  materialCache: new Map(),

  // Cache pour les textures
  textureCache: new Map(),

  // Fonction pour ajouter une géométrie au cache
  addGeometry: (key, geometry) =>
    set((state) => {
      state.geometryCache.set(key, geometry);
      return state;
    }),

  // Fonction pour ajouter un matériau au cache
  addMaterial: (key, material) =>
    set((state) => {
      state.materialCache.set(key, material);
      return state;
    }),

  // Fonction pour ajouter une texture au cache
  addTexture: (key, texture) =>
    set((state) => {
      state.textureCache.set(key, texture);
      return state;
    }),
}));

export default useGraphStore;
