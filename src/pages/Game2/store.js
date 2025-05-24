import { create } from "zustand";

// Fonction pour récupérer l'état debug persisté
const getInitialDebugState = () => {
  try {
    const storedValue = localStorage.getItem("goldbergs_debug_mode");
    console.log("Initial debug state from localStorage:", storedValue);
    return storedValue === "true"; // Conversion explicite en booléen
  } catch (error) {
    console.warn("Erreur lors de la lecture du localStorage:", error);
    return false;
  }
};

// Définition des niveaux disponibles
export const GAME_LEVELS = {
  WORLD: "world", // Niveau principal avec le graphe complet
  ADVANCED_CLUSTER: "advanced_cluster", // Niveau cluster avancé
};

// Store unifié avec gestion des niveaux
const useGameStore = create((set, get) => ({
  // États gérés par ce store
  audioEnabled: true, // État du son (activé par défaut)
  debug: getInitialDebugState(), // État du mode debug initialisé depuis le localStorage
  camera: null, // Référence à la caméra principale
  hoveredCluster: null, // Slug du cluster survolé actuellement

  // Système de niveaux unifié
  currentLevel: GAME_LEVELS.WORLD, // Niveau actuel
  activeLevel: null, // Données du niveau actif (persona, cluster, etc.)

  // Données du nœud actif
  activeNodeData: null, // Données complètes du nœud actif

  // Données de transition pour éviter les baisses de framerate
  transitionData: null, // Données temporaires pendant la transition
  isTransitioning: false, // État de transition

  // Nouvel état pour le suivi des visites
  visitedClusters: [],
  visitedNodes: [],
  visitedPersonasCount: 0,

  // Actions pour modifier les états

  // Fonction pour définir les données du nœud actif
  setActiveNodeData: (nodeData) => {
    set({ activeNodeData: nodeData });

    // Si le nœud est actif et n'a pas encore été visité, l'ajouter à la liste
    if (nodeData) {
      const state = get();
      const alreadyVisited = state.visitedNodes.some(
        (node) => node.slug === nodeData.slug
      );

      if (!alreadyVisited) {
        set((state) => ({
          visitedNodes: [
            ...state.visitedNodes,
            {
              slug: nodeData.slug,
              name: nodeData.name,
              data: nodeData,
              visitedAt: new Date().toISOString(),
            },
          ],
        }));
      }
    }

    console.log("Active node data updated:", nodeData);
  },

  // Fonction pour activer/désactiver le son
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  // Fonction pour activer/désactiver le mode debug
  toggleDebug: () => {
    const currentState = get().debug;
    console.log("Current debug state before toggle:", currentState);
    const newState = !currentState;
    console.log("New debug state after toggle:", newState);

    // Sauvegarder dans le localStorage
    try {
      localStorage.setItem("goldbergs_debug_mode", String(newState));
    } catch (error) {
      console.warn("Erreur lors de l'écriture dans le localStorage:", error);
    }

    set({ debug: newState });
  },

  // Fonction pour définir directement l'état du mode debug
  setDebug: (value) => {
    console.log("Setting debug state to:", value);
    set({ debug: value });

    // Sauvegarder dans le localStorage
    try {
      localStorage.setItem("goldbergs_debug_mode", String(value));
    } catch (error) {
      console.warn("Erreur lors de l'écriture dans le localStorage:", error);
    }
  },

  // Fonction pour définir la référence à la caméra
  setCamera: (camera) => set({ camera }),

  // Fonction pour définir le slug du cluster survolé
  setHoveredCluster: (clusterSlug) => set({ hoveredCluster: clusterSlug }),

  // Fonction pour changer de niveau avec transition
  setActiveLevel: (levelData, targetLevel = null) => {
    const state = get();

    // Déterminer le niveau cible
    let newLevel = targetLevel;
    if (!newLevel) {
      // Auto-détection du niveau basé sur le type de données
      if (levelData?.type === "cluster" || levelData?.cluster !== undefined) {
        newLevel = GAME_LEVELS.ADVANCED_CLUSTER;
      } else {
        newLevel = GAME_LEVELS.WORLD;
      }
    }

    console.log("Changing level to:", newLevel, "with data:", levelData);

    // Si on change de niveau, gérer la transition
    if (state.currentLevel !== newLevel) {
      set({
        isTransitioning: true,
        transitionData: levelData,
        activeLevel: levelData,
        currentLevel: newLevel,
      });

      // Simuler une transition courte pour éviter les saccades
      setTimeout(() => {
        set({
          isTransitioning: false,
          transitionData: null,
        });
      }, 100);
    } else {
      // Même niveau, juste mettre à jour les données
      set({ activeLevel: levelData });
    }

    // Si c'est un cluster et qu'il n'a pas encore été visité, l'ajouter à la liste
    if (levelData && levelData.type === "cluster") {
      const alreadyVisited = state.visitedClusters.some(
        (cluster) => cluster.slug === levelData.id
      );

      if (!alreadyVisited) {
        set((state) => ({
          visitedClusters: [
            ...state.visitedClusters,
            {
              slug: levelData.id,
              visitedAt: new Date().toISOString(),
            },
          ],
          visitedPersonasCount: state.visitedPersonasCount + 1,
        }));
      }
    }
  },

  // Fonction pour retourner au niveau monde
  returnToWorld: () => {
    console.log("Returning to world level");
    set({
      currentLevel: GAME_LEVELS.WORLD,
      activeLevel: null,
      activeNodeData: null,
      transitionData: null,
      isTransitioning: false,
    });
  },

  // Getter pour récupérer uniquement le cluster survolé
  // Permet d'éviter les re-rendus liés à d'autres changements d'état
  getHoveredCluster: () => get().hoveredCluster,

  // Getter pour vérifier si on est dans un niveau spécifique
  isLevel: (level) => get().currentLevel === level,

  // Getter pour récupérer les données du niveau actif
  getActiveLevel: () => get().activeLevel,

  // Nouvelles fonctions utilitaires pour la gestion des visites
  isNodeVisited: (nodeSlug) => {
    const state = get();
    return state.visitedNodes.some((node) => node.slug === nodeSlug);
  },

  resetVisitedClusters: () =>
    set({
      visitedClusters: [],
      visitedPersonasCount: 0,
    }),

  resetVisitedNodes: () =>
    set({
      visitedNodes: [],
    }),

  resetAllVisitHistory: () =>
    set({
      visitedClusters: [],
      visitedPersonasCount: 0,
      visitedNodes: [],
    }),
}));

// Selectors spécifiques pour optimiser les re-rendus

// Selector spécifique pour hoveredCluster
export const useHoveredCluster = () =>
  useGameStore((state) => state.hoveredCluster);

// Selector spécifique pour le niveau actuel
export const useCurrentLevel = () =>
  useGameStore((state) => state.currentLevel);

// Selector spécifique pour les données du niveau actif
export const useActiveLevel = () => useGameStore((state) => state.activeLevel);

// Selector spécifique pour l'état de transition
export const useIsTransitioning = () =>
  useGameStore((state) => state.isTransitioning);

// Selector spécifique pour les données du nœud actif
export const useActiveNodeData = () =>
  useGameStore((state) => state.activeNodeData);

export default useGameStore;
