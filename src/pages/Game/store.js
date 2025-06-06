import { create } from "zustand";
import useAudioManager from "./services/AudioManager";

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
  BLACK_HOLE: "black_hole", // Niveau trou noir
};

// Store unifié avec gestion des niveaux
export const useGameStore = create((set, get) => ({
  // États gérés par ce store
  audioEnabled: true, // État du son (activé par défaut)
  debug: getInitialDebugState(), // État du mode debug initialisé depuis le localStorage
  camera: null, // Référence à la caméra principale
  hoveredCluster: null,
  hoveredClusterData: null, // Ajout des données complètes du cluster survolé

  // Système de niveaux unifié
  currentLevel: GAME_LEVELS.WORLD, // Niveau actuel
  activeLevel: null, // Données du niveau actif (persona, cluster, etc.)

  // Données de transition pour éviter les baisses de framerate
  transitionData: null, // Données temporaires pendant la transition
  isTransitioning: false, // État de transition

  // Nouvel état pour le suivi des visites
  visitedClusters: [],
  visitedNodes: [],
  visitedPersonasCount: 0,
  visitedFragments: [], // Nouveau : tracking des fragments audio joués

  // État pour l'avertissement de sortie de cluster
  showExitWarning: false,

  // Nouveau : système d'actions différées
  scheduledActions: [],

  // Actions pour modifier les états

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
  setHoveredCluster: (clusterSlug, clusterData = null) =>
    set({
      hoveredCluster: clusterSlug,
      hoveredClusterData: clusterData,
    }),

  // Fonction pour changer de niveau avec transition
  setActiveLevel: (levelData, targetLevel = null) => {
    const state = get();

    // Nettoyer les actions programmées précédentes pour éviter les conflits
    state.clearScheduledActions();

    // Déterminer le niveau cible
    let newLevel = targetLevel;
    if (!newLevel) {
      // Auto-détection du niveau basé sur le type de données
      if (levelData?.type === "cluster" || levelData?.cluster !== undefined) {
        newLevel = GAME_LEVELS.ADVANCED_CLUSTER;
      } else if (levelData?.type === "blackhole") {
        newLevel = GAME_LEVELS.BLACK_HOLE;
      } else {
        newLevel = GAME_LEVELS.WORLD;
      }
    }

    console.log("[DEBUG] Changing level to:", newLevel);
    console.log("[DEBUG] Level data:", levelData);
    console.log("[DEBUG] Current visited clusters:", state.visitedClusters);

    // Si on change de niveau, gérer la transition
    if (state.currentLevel !== newLevel) {
      // Démarrer la transition SANS changer le niveau immédiatement
      set({
        isTransitioning: true,
        transitionData: levelData,
        // NE PAS changer currentLevel et activeLevel tout de suite
      });

      // Changer le niveau quand l'écran est noir (après fade in + un peu de temps)
      setTimeout(() => {
        set({
          currentLevel: newLevel,
          activeLevel: levelData,
        });
      }, 160); // 10ms (starting) + 150ms (fadeIn) = écran noir plus rapide

      // Terminer la transition après le fade complet
      setTimeout(() => {
        set({
          isTransitioning: false,
          transitionData: null,
        });
      }, 360); // 150ms fade in + 50ms visible + 150ms fade out = transition plus rapide
    } else {
      // Même niveau, juste mettre à jour les données
      set({ activeLevel: levelData });
    }

    // Si c'est un cluster et qu'il n'a pas encore été visité, l'ajouter à la liste
    if (levelData && levelData.type === "cluster") {
      console.log("[DEBUG] Processing cluster visit");
      console.log("[DEBUG] Cluster ID:", levelData.id);

      // NOUVEAU: Ne plus marquer immédiatement comme visité
      // On va programmer cette action pour plus tard (quand on sort du cluster)
      console.log("[DEBUG] Cluster will be marked as visited when exiting");
    }
  },

  // Fonction pour retourner au niveau monde
  returnToWorld: () => {
    const currentState = get();
    console.log("Returning to world level");

    // Récupérer les données du cluster actuel avant de changer de niveau
    const currentClusterData = currentState.activeLevel;
    const wasInCluster =
      currentState.currentLevel === GAME_LEVELS.ADVANCED_CLUSTER;

    // Démarrer la transition SANS changer le niveau immédiatement
    set({
      isTransitioning: true,
      transitionData: { name: "World", type: "world" },
      // NE PAS changer currentLevel et activeLevel tout de suite
    });

    // Changer le niveau quand l'écran est noir (après fade in + un peu de temps)
    setTimeout(() => {
      set({
        currentLevel: GAME_LEVELS.WORLD,
        activeLevel: null,
      });
    }, 160); // 10ms (starting) + 150ms (fadeIn) = écran noir plus rapidez

    // Terminer la transition après le fade complet
    setTimeout(() => {
      set({
        isTransitioning: false,
        transitionData: null,
      });
    }, 360); // Même durée que setActiveLevel - transition plus rapide

    // NOUVEAU: Programmer le marquage du cluster comme visité avec le son après un délai
    if (
      wasInCluster &&
      currentClusterData &&
      currentClusterData.type === "cluster"
    ) {
      const state = get();

      // CORRECTION: Vérifier si le cluster n'est pas déjà visité avant de programmer l'action
      if (!state.isClusterVisited(currentClusterData.id)) {
        // Programmer l'action différée (1.5 secondes après la fin de la transition)
        state.scheduleAction(() => {
          // Jouer le son directement via AudioManager
          const audioManager = useAudioManager.getState();
          audioManager.playClusterOffSound();
        }, 10); // Son joué à 1.5 secondes

        // Programmer le marquage visuel avec un délai supplémentaire pour synchroniser avec le son
        state.scheduleAction(() => {
          // Marquer le cluster comme visité (effet visuel)
          const currentState = get();
          currentState.markClusterAsVisited(
            currentClusterData.id,
            currentClusterData.name
          );
        }, 1000); // Effet visuel à 2.5 secondes (1 seconde après le son)
      }
    }
  },

  // Getter pour récupérer uniquement le cluster survolé
  // Permet d'éviter les re-rendus liés à d'autres changements d'état
  getHoveredCluster: () => get().hoveredCluster,

  // Getter pour vérifier si on est dans un niveau spécifique
  isLevel: (level) => get().currentLevel === level,

  // Getter pour récupérer les données du niveau actif
  getActiveLevel: () => get().activeLevel,

  // Nouvelles fonctions utilitaires pour la gestion des visites
  isNodeVisited: (nodeId) => {
    const state = get();
    return state.visitedNodes.some((node) => node.id === nodeId);
  },

  isClusterVisited: (clusterId) => {
    const state = get();
    return state.visitedClusters.some((cluster) => cluster.id === clusterId);
  },

  isFragmentPlayed: (fragmentId) => {
    const state = get();
    return state.visitedFragments.some(
      (fragment) => fragment.id === fragmentId
    );
  },

  // Fonction pour marquer un cluster comme visité
  markClusterAsVisited: (clusterId, clusterName = null) => {
    const state = get();
    const alreadyVisited = state.visitedClusters.some(
      (cluster) => cluster.id === clusterId
    );

    if (!alreadyVisited) {
      console.log(
        `[Store] Marking cluster ${clusterId} (${clusterName}) as visited`
      );
      set((state) => ({
        visitedClusters: [
          ...state.visitedClusters,
          {
            id: clusterId,
            name: clusterName || clusterId,
            visitedAt: new Date().toISOString(),
          },
        ],
        visitedPersonasCount: state.visitedPersonasCount + 1,
      }));
      console.log(
        `[Store] Total visited clusters: ${
          get().visitedClusters.length
        }, personas count: ${get().visitedPersonasCount}`
      );
    } else {
      console.log(`[Store] Cluster ${clusterId} already visited`);
    }
  },

  // Fonction pour marquer un nœud comme visité
  markNodeAsVisited: (nodeId, nodeName = null, nodeData = null) => {
    const state = get();
    const alreadyVisited = state.visitedNodes.some(
      (node) => node.id === nodeId
    );

    if (!alreadyVisited) {
      console.log(`[Store] Marking node ${nodeId} as visited`);
      set((state) => ({
        visitedNodes: [
          ...state.visitedNodes,
          {
            id: nodeId,
            name: nodeName || nodeId,
            data: nodeData,
            visitedAt: new Date().toISOString(),
          },
        ],
      }));
    }
  },

  // Fonction pour marquer un fragment comme joué
  markFragmentAsPlayed: (fragmentId, fragmentName = null) => {
    const state = get();
    const alreadyPlayed = state.visitedFragments.some(
      (fragment) => fragment.id === fragmentId
    );

    if (!alreadyPlayed) {
      console.log(`[Store] Marking fragment ${fragmentId} as played`);
      set((state) => ({
        visitedFragments: [
          ...state.visitedFragments,
          {
            id: fragmentId,
            name: fragmentName || fragmentId,
            playedAt: new Date().toISOString(),
          },
        ],
      }));
      console.log(
        `[Store] Total played fragments: ${get().visitedFragments.length}`
      );
    } else {
      console.log(`[Store] Fragment ${fragmentId} already played`);
    }
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

  resetVisitedFragments: () =>
    set({
      visitedFragments: [],
    }),

  resetAllVisitHistory: () =>
    set({
      visitedClusters: [],
      visitedPersonasCount: 0,
      visitedNodes: [],
      visitedFragments: [],
    }),

  // Fonction de debug pour afficher l'état des visites
  debugVisitState: () => {
    const state = get();
    console.log("=== ÉTAT DES VISITES ===");
    console.log(`Clusters visités: ${state.visitedClusters.length}`);
    console.log(`Nœuds visités: ${state.visitedNodes.length}`);
    console.log(`Fragments joués: ${state.visitedFragments.length}`);
    console.log(`Compteur personas: ${state.visitedPersonasCount}`);
    console.log("Clusters:", state.visitedClusters);
    console.log("Nœuds:", state.visitedNodes);
    console.log("Fragments:", state.visitedFragments);
    console.log("========================");
  },

  // Getter pour les données du cluster survolé
  getHoveredClusterData: () => get().hoveredClusterData,

  // Fonction pour définir l'état de l'avertissement de sortie de cluster
  setShowExitWarning: (show) => set({ showExitWarning: show }),

  // Nouveau : fonctions pour gérer les actions différées

  // Programmer une action différée
  scheduleAction: (action, delay) => {
    const timeoutId = setTimeout(() => {
      try {
        action();
      } catch (error) {
        console.error(
          "Erreur lors de l'exécution d'une action différée:",
          error
        );
      }
      // Nettoyer l'action de la liste
      set((state) => ({
        scheduledActions: state.scheduledActions.filter(
          (a) => a.id !== timeoutId
        ),
      }));
    }, delay);

    set((state) => ({
      scheduledActions: [
        ...state.scheduledActions,
        { id: timeoutId, action, delay },
      ],
    }));

    return timeoutId; // Retourner l'ID pour pouvoir annuler si besoin
  },

  // Nettoyer toutes les actions programmées (utile lors des transitions)
  clearScheduledActions: () => {
    const state = get();
    state.scheduledActions.forEach(({ id }) => clearTimeout(id));
    set({ scheduledActions: [] });
  },

  // Annuler une action spécifique
  cancelScheduledAction: (timeoutId) => {
    clearTimeout(timeoutId);
    set((state) => ({
      scheduledActions: state.scheduledActions.filter(
        (a) => a.id !== timeoutId
      ),
    }));
  },
}));

export default useGameStore;

// Exposer la fonction de debug sur window pour les tests
if (typeof window !== "undefined") {
  window.debugVisitState = () => useGameStore.getState().debugVisitState();
  window.resetVisitHistory = () =>
    useGameStore.getState().resetAllVisitHistory();
}

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

// Selector spécifique pour les données du cluster survolé
export const useHoveredClusterData = () =>
  useGameStore((state) => state.hoveredClusterData);

// Selectors pour les données de visite
export const useVisitedClustersCount = () =>
  useGameStore((state) => state.visitedClusters.length);

export const useVisitedPersonasCount = () =>
  useGameStore((state) => state.visitedPersonasCount);

export const useVisitedNodesCount = () =>
  useGameStore((state) => state.visitedNodes.length);

export const useVisitedFragmentsCount = () =>
  useGameStore((state) => state.visitedFragments.length);

// Nouveau selector pour forcer le re-render du Graph
export const useVisitedClustersForGraph = () =>
  useGameStore((state) => state.visitedClusters.length);
