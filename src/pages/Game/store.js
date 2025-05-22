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

  // État pour suivre les clusters visités
  visitedClusters: [],
  visitedPersonasCount: 0,

  // État pour suivre les nœuds déjà visités
  visitedNodes: [],

  // Fonction pour définir le cluster actif
  setActiveCluster: (clusterId, clusterName = null, clusterSlug = null) => {
    // Vérifier si ce cluster a déjà été visité
    const state = get();
    const alreadyVisited = state.visitedClusters.some(
      (cluster) => cluster.id === clusterId
    );

    // Si le cluster n'a pas encore été visité, l'ajouter à la liste
    if (clusterId && !alreadyVisited) {
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

    // Mettre à jour le cluster actif
    set({
      activeClusterId: clusterId,
      activeClusterName: clusterName,
      activeClusterSlug: clusterSlug,
      // Désactiver les éléments interactifs lorsqu'un cluster est activé
      activeInteractiveElementId: null,
      activeInteractiveElementType: null,
      activeInteractiveElementData: null,
    });
  },

  // Fonction pour définir le cluster survolé
  setHoveredCluster: (clusterId, clusterName = null, clusterSlug = null) =>
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

  // État d'autres éléments du jeu peut être ajouté ici
  // ...
}));

export default useGameStore;
