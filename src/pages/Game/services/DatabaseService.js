import { create } from "zustand";

/**
 * Service de gestion de la base de données globale
 * Chargé une seule fois et réutilisé partout dans l'application
 */

// Store Zustand pour gérer l'état de la base de données
const useDatabaseStore = create((set, get) => ({
  // État initial
  data: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  // Fonction pour charger la base de données
  loadDatabase: async () => {
    // Si déjà en cours de chargement ou déjà chargé, ne rien faire
    if (get().isLoading || get().isLoaded) return;

    try {
      // Indiquer que le chargement est en cours
      set({ isLoading: true });

      // Charger les données
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/database.data.json`
      );

      if (!response.ok) {
        throw new Error(
          `Impossible de charger la base de données: ${response.status}`
        );
      }

      const data = await response.json();

      // Mettre à jour le store avec les données
      set({
        data,
        isLoading: false,
        isLoaded: true,
        error: null,
      });

      console.log(`Base de données chargée: ${data.length} enregistrements`);
    } catch (error) {
      console.error("Erreur lors du chargement de la base de données:", error);
      set({
        isLoading: false,
        error: error.message,
      });
    }
  },

  // Fonction pour obtenir les détails d'un enregistrement par son slug
  getBySlug: (slug) => {
    if (!slug) return null;

    const { data } = get();
    return data.find((item) => item.slug === slug);
  },

  // Fonction pour obtenir la bio d'un enregistrement par son slug
  getBioBySlug: (slug) => {
    if (!slug) return "";

    const record = get().getBySlug(slug);

    if (record) {
      // Vérifier toutes les sources possibles de biographie dans l'ordre de préférence
      return record.biography || record.bio200 || record.bio250 || "";
    }

    return "";
  },

  // Fonction pour obtenir la thématique d'un enregistrement par son slug
  getThematicBySlug: (slug) => {
    if (!slug) return "";

    const record = get().getBySlug(slug);
    return record ? record.thematic || "" : "";
  },
}));

// Fonction pour s'assurer que la base de données est chargée
export const ensureDatabaseLoaded = async () => {
  const { isLoaded, loadDatabase } = useDatabaseStore.getState();

  if (!isLoaded) {
    await loadDatabase();
  }

  return useDatabaseStore.getState().isLoaded;
};

export default useDatabaseStore;
