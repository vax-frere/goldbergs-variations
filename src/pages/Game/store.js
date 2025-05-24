import { create } from "zustand";

/**
 * Store global pour l'application de jeu
 * Gère l'état partagé comme les clusters actifs et autres données persistantes
 */
const useGameStore = create((set, get) => ({
  // État du cluster actuellement actif
  activeClusterId: null,
  activeClusterName: null,
  activeClusterSlug: null,

  // État du cluster survolé (hover)
  hoveredClusterId: null,
  hoveredClusterName: null,
  hoveredClusterSlug: null,

  // État du nœud actif dans le cluster
  activeNodeId: null,
  activeNodeName: null,
  activeNodeData: null,

  // État pour les éléments interactifs (images, objets spéciaux, etc.)
  activeInteractiveElementId: null,
  activeInteractiveElementType: null,
  activeInteractiveElementData: null,

  // États pour les différents modes du jeu (utilisés par le système de collision)
  activeDialogue: null,
  isInMenuMode: false,
  isInCutscene: false,

  // État pour suivre les clusters visités
  visitedClusters: [],
  visitedPersonasCount: 0,

  // État pour suivre les nœuds déjà visités
  visitedNodes: [],

  // État pour les contrôles audio (simplifié)
  audioEnabled: true,

  // Fonction pour définir les contrôles audio
  setAudioControls: (controls) => {
    set({
      audioControls: {
        ...get().audioControls,
        ...controls,
      },
    });
  },

  // Fonction pour définir le cluster actif
  setActiveCluster: (
    clusterId = null,
    clusterName = null,
    clusterSlug = null
  ) => {
    // Si le cluster est actif et n'a pas encore été visité, l'ajouter à la liste des clusters visités
    if (clusterId) {
      const state = get();
      const alreadyVisited = state.visitedClusters.some(
        (cluster) => cluster.id === clusterId
      );

      // Si ce cluster n'a pas encore été visité, l'ajouter à la liste et incrémenter le compteur
      if (!alreadyVisited) {
        set((state) => ({
          visitedClusters: [
            ...state.visitedClusters,
            {
              id: clusterId,
              name: clusterName,
              slug: clusterSlug,
              visitedAt: new Date().toISOString(),
            },
          ],
          visitedPersonasCount: state.visitedPersonasCount + 1,
        }));
      }
    }

    // Mettre à jour le cluster actif
    set({
      activeClusterId: clusterId,
      activeClusterName: clusterName,
      activeClusterSlug: clusterSlug,
      // Réinitialiser l'état du nœud actif et des éléments interactifs
      activeNodeId: null,
      activeNodeName: null,
      activeNodeData: null,
      activeInteractiveElementId: null,
      activeInteractiveElementType: null,
      activeInteractiveElementData: null,
    });
  },

  // Fonction pour définir le cluster survolé (hover)
  setHoveredCluster: (
    clusterId = null,
    clusterName = null,
    clusterSlug = null
  ) =>
    set({
      hoveredClusterId: clusterId,
      hoveredClusterName: clusterName,
      hoveredClusterSlug: clusterSlug,
    }),

  // Fonction pour définir le nœud actif
  setActiveNode: (nodeId = null, nodeName = null, nodeData = null) => {
    // Si le nœud est actif et n'a pas encore été visité, l'ajouter à la liste des nœuds visités
    if (nodeId) {
      const state = get();
      const alreadyVisited = state.visitedNodes.some(
        (node) => node.id === nodeId
      );

      // Si ce nœud n'a pas encore été visité, l'ajouter à la liste
      if (!alreadyVisited) {
        set((state) => ({
          visitedNodes: [
            ...state.visitedNodes,
            {
              id: nodeId,
              name: nodeName,
              data: nodeData,
              visitedAt: new Date().toISOString(),
            },
          ],
        }));
      }
    }

    // Mettre à jour le nœud actif
    set({
      activeNodeId: nodeId,
      activeNodeName: nodeName,
      activeNodeData: nodeData,
    });
  },

  // Fonction pour vérifier si un nœud a déjà été visité
  isNodeVisited: (nodeId) => {
    const state = get();
    return state.visitedNodes.some((node) => node.id === nodeId);
  },

  // Fonction pour activer un élément interactif
  setActiveInteractiveElement: (
    elementId = null,
    elementType = null,
    elementData = null
  ) =>
    set({
      activeInteractiveElementId: elementId,
      activeInteractiveElementType: elementType,
      activeInteractiveElementData: elementData,
      // Désactiver le nœud actif pour éviter les conflits
      activeNodeId: null,
      activeNodeName: null,
      activeNodeData: null,
    }),

  // Fonctions pour gérer les différents modes de jeu
  setDialogue: (dialogueData = null) => set({ activeDialogue: dialogueData }),
  setMenuMode: (isActive = false) => set({ isInMenuMode: isActive }),
  setCutsceneMode: (isActive = false) => set({ isInCutscene: isActive }),

  // Fonction utilitaire pour tout réinitialiser
  resetAllActiveStates: () =>
    set({
      activeClusterId: null,
      activeClusterName: null,
      activeClusterSlug: null,
      activeNodeId: null,
      activeNodeName: null,
      activeNodeData: null,
      activeInteractiveElementId: null,
      activeInteractiveElementType: null,
      activeInteractiveElementData: null,
      activeDialogue: null,
      isInMenuMode: false,
      isInCutscene: false,
    }),

  // Fonction pour réinitialiser les clusters visités (utile pour les tests ou nouvelle session)
  resetVisitedClusters: () =>
    set({
      visitedClusters: [],
      visitedPersonasCount: 0,
    }),

  // Fonction pour réinitialiser les nœuds visités
  resetVisitedNodes: () =>
    set({
      visitedNodes: [],
    }),

  // Fonction pour réinitialiser tout l'historique de visite
  resetAllVisitHistory: () =>
    set({
      visitedClusters: [],
      visitedPersonasCount: 0,
      visitedNodes: [],
    }),

  // Fonction pour activer/désactiver l'audio global
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  // État d'autres éléments du jeu peut être ajouté ici
  // ...
}));

export default useGameStore;
