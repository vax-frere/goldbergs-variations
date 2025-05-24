import * as THREE from "three";
import { create } from "zustand";

/**
 * Définition des layers de collision par défaut
 * Utilise un système de masques binaires (comme dans Unity/Unreal)
 * Chaque layer est une puissance de 2, ce qui permet de les combiner avec des opérations binaires
 */
export const CollisionLayers = {
  DEFAULT: 1, // 0001
  CLUSTERS: 2, // 0010
  NODES: 4, // 0100
  INTERACTIVE: 8, // 1000
  ALL: 0xffffffff, // Tous les bits à 1
  NONE: 0, // Aucun bit à 1

  // Fonctions utilitaires pour créer des masques personnalisés
  createMask: (...layers) => {
    if (layers.length === 0) return 0;
    return layers.reduce((mask, layer) => mask | layer, 0);
  },

  // Préréglages communs
  UI_ONLY: 8, // Seulement les éléments interactifs (INTERACTIVE)
  NAVIGATION: 3, // Clusters et default (pour navigation)
  EXPLORATION: 6, // Clusters et nodes (pour exploration)
};

// Pool d'objets réutilisables pour éviter les allocations dynamiques
const ObjectPool = {
  // Vecteurs 3D pour les calculs de position et de distance
  vec3Pool: Array(10)
    .fill()
    .map(() => new THREE.Vector3()),
  // Index du prochain vecteur disponible
  vec3Index: 0,

  // Obtenir un vecteur 3D du pool
  getVec3: function () {
    const vec = this.vec3Pool[this.vec3Index];
    this.vec3Index = (this.vec3Index + 1) % this.vec3Pool.length;
    return vec;
  },

  // Box3 pour les tests de collision (utilisé en interne)
  box3: new THREE.Box3(),

  // Obtenir une Box3 réinitialisée
  getBox3: function () {
    return this.box3.makeEmpty();
  },

  // Réinitialiser le pool
  reset: function () {
    this.vec3Index = 0;
    this.vec3Pool.forEach((vec) => vec.set(0, 0, 0));
    this.box3.makeEmpty();
  },
};

/**
 * Service centralisé pour gérer les boîtes de collision et la détection
 * Utilise Zustand pour fournir un état global et des méthodes utilitaires
 */
const useCollisionStore = create((set, get) => ({
  // Stockage des boîtes englobantes par type (clusters, nodes, elements, etc.)
  boundingBoxes: {
    clusters: {},
    nodes: {},
    interactiveElements: {},
  },

  // Références pour les boîtes englobantes (utilisées pour éviter les boucles de mise à jour)
  boundingBoxRefs: {
    clusterBoxes: {},
    nodeBoxes: {},
    interactiveElements: {},
  },

  // Point de détection devant la caméra (réutilisé pour toutes les détections)
  detectionPoint: new THREE.Vector3(),

  // Objet temporaire pour stocker la direction de la caméra (évite l'allocation mémoire)
  directionVector: new THREE.Vector3(0, 0, -1),

  // Paramètres de détection par défaut
  settings: {
    detectionPointDistance: 100,
    nodeBoundingBoxSize: 20,
    clusterBoundingBoxExpansion: 20,
    throttleTime: 16, // ms entre les détections (environ 60fps)
  },

  // Configuration des layers de collision
  // Le masque définit quels layers sont "visibles" pour la détection
  collisionMask: CollisionLayers.ALL,

  // Statut d'activation de chaque type d'élément
  collisionEnabled: {
    clusters: true,
    nodes: true,
    interactiveElements: true,
  },

  // Dernier temps de vérification pour limiter la fréquence
  lastCheckTime: 0,

  // Dernier élément détecté par type
  lastDetected: {
    clusterId: null,
    nodeId: null,
    elementId: null,
  },

  // Statistiques pour le debugging et la performance
  stats: {
    detectionCalls: 0,
    collisionsFound: 0,
    clusterDetections: 0,
    nodeDetections: 0,
    interactiveElementDetections: 0,
    lastDetectionTime: 0,
  },

  // État de debug
  debugMode: false,

  /**
   * Active ou désactive un layer de collision spécifique
   * @param {number} layer - Layer à activer/désactiver (utiliser les constantes CollisionLayers)
   * @param {boolean} enabled - État d'activation
   * @param {boolean} skipTypeUpdate - Interne: ne pas mettre à jour le type pour éviter les boucles
   */
  setLayerEnabled: (layer, enabled, skipTypeUpdate = false) => {
    const currentMask = get().collisionMask;
    const isCurrentlyEnabled = (currentMask & layer) !== 0;

    // Vérifier si l'état est déjà celui demandé
    if (isCurrentlyEnabled === enabled) {
      return; // Déjà dans l'état demandé, ne rien faire
    }

    // Calculer le nouveau masque
    const newMask = enabled ? currentMask | layer : currentMask & ~layer;

    // Mettre à jour l'état avec le nouveau masque
    set({ collisionMask: newMask });

    if (get().debugMode) {
      console.log(
        `CollisionService: Layer ${layer} ${enabled ? "enabled" : "disabled"}`
      );
    }

    // Si on ne doit pas mettre à jour les types (pour éviter les boucles)
    if (skipTypeUpdate) {
      return;
    }

    // Mettre à jour le type correspondant si nécessaire
    const typeMap = {
      [CollisionLayers.CLUSTERS]: "clusters",
      [CollisionLayers.NODES]: "nodes",
      [CollisionLayers.INTERACTIVE]: "interactiveElements",
    };

    const type = typeMap[layer];
    if (type && get().collisionEnabled[type] !== enabled) {
      // Mettre à jour directement l'état sans passer par la méthode qui appellerait à nouveau setLayerEnabled
      set((state) => ({
        collisionEnabled: {
          ...state.collisionEnabled,
          [type]: enabled,
        },
      }));

      if (get().debugMode) {
        console.log(
          `CollisionService: Collision type ${type} ${
            enabled ? "enabled" : "disabled"
          } (via layer update)`
        );
      }
    }
  },

  /**
   * Définit un nouveau masque de collision complet
   * @param {number} mask - Nouveau masque (combinaison de CollisionLayers)
   */
  setCollisionMask: (mask) => {
    // Vérifier si le masque est identique à l'actuel
    if (get().collisionMask === mask) {
      return; // Déjà le même masque, ne rien faire
    }

    set({ collisionMask: mask });

    if (get().debugMode) {
      console.log(
        `CollisionService: Collision mask set to ${mask.toString(2)}`
      );
    }
  },

  /**
   * Vérifie si un layer est activé dans le masque actuel
   * @param {number} layer - Layer à vérifier
   * @returns {boolean} - Vrai si le layer est activé
   */
  isLayerEnabled: (layer) => {
    return (get().collisionMask & layer) !== 0;
  },

  /**
   * Active ou désactive la détection de collision pour un type spécifique d'élément
   * @param {string} type - Type d'élément ('clusters', 'nodes', 'interactiveElements')
   * @param {boolean} enabled - État d'activation
   */
  setCollisionTypeEnabled: (type, enabled) => {
    if (!["clusters", "nodes", "interactiveElements"].includes(type)) {
      return; // Type non valide, ne rien faire
    }

    // Vérifier si l'état est déjà celui demandé
    const currentState = get().collisionEnabled[type];
    if (currentState === enabled) {
      return; // Déjà dans l'état demandé, ne rien faire
    }

    // Mettre à jour l'état
    set((state) => ({
      collisionEnabled: {
        ...state.collisionEnabled,
        [type]: enabled,
      },
    }));

    // Activer/désactiver aussi le layer correspondant en indiquant de ne pas mettre à jour le type
    const layerMap = {
      clusters: CollisionLayers.CLUSTERS,
      nodes: CollisionLayers.NODES,
      interactiveElements: CollisionLayers.INTERACTIVE,
    };

    get().setLayerEnabled(layerMap[type], enabled, true);

    if (get().debugMode) {
      console.log(
        `CollisionService: Collision type ${type} ${
          enabled ? "enabled" : "disabled"
        }`
      );
    }
  },

  /**
   * Met à jour les paramètres du service
   * @param {Object} newSettings - Nouveaux paramètres
   */
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }));
  },

  /**
   * Active ou désactive le mode debug
   * @param {boolean} enabled - État du mode debug
   */
  setDebugMode: (enabled) => {
    // Ne mettre à jour que si l'état change
    if (get().debugMode !== enabled) {
      set({ debugMode: enabled });
    }
  },

  /**
   * Calcule le point de détection devant la caméra
   * @param {THREE.Camera} camera - Caméra THREE.js
   * @param {number} distance - Distance du point devant la caméra
   * @returns {THREE.Vector3} - Point de détection
   */
  calculateDetectionPoint: (camera, distance) => {
    const state = get();
    const actualDistance = distance || state.settings.detectionPointDistance;

    // Réutiliser le vecteur directionnel pour éviter les allocations mémoire
    state.directionVector.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // Mettre à jour le point de détection stocké dans l'état sans créer de nouveau vecteur
    state.detectionPoint
      .copy(camera.position)
      .addScaledVector(state.directionVector, actualDistance);

    return state.detectionPoint;
  },

  /**
   * Vérifie si un point est à l'intérieur d'une boîte englobante
   * @param {THREE.Vector3} point - Point à vérifier
   * @param {Object} box - Boîte englobante avec min et max
   * @returns {boolean} - Vrai si le point est dans la boîte
   */
  isPointInBoundingBox: (point, box) => {
    return (
      point.x >= box.min.x &&
      point.x <= box.max.x &&
      point.y >= box.min.y &&
      point.y <= box.max.y &&
      point.z >= box.min.z &&
      point.z <= box.max.z
    );
  },

  /**
   * Calcule la distance entre un point et le centre d'une boîte
   * @param {THREE.Vector3} point - Point de référence
   * @param {Object} box - Boîte englobante avec un centre
   * @returns {number} - Distance
   */
  distanceToBoxCenter: (point, box) => {
    // Utiliser un vecteur du pool au lieu d'en créer un nouveau
    const center = ObjectPool.getVec3().set(
      box.center.x,
      box.center.y,
      box.center.z
    );
    const distance = point.distanceTo(center);
    return distance;
  },

  /**
   * Enregistre des boîtes englobantes pour les clusters
   * @param {Object} clusterBoxes - Map de boîtes englobantes par ID de cluster
   * @param {number} layer - Layer de collision (par défaut: CollisionLayers.CLUSTERS)
   */
  registerClusterBoxes: (clusterBoxes, layer = CollisionLayers.CLUSTERS) => {
    // Rapide vérification pour éviter les traitements inutiles
    if (Object.keys(clusterBoxes).length === 0) {
      // Si on reçoit un objet vide, on réinitialise simplement les boîtes
      get().boundingBoxRefs.clusterBoxes = {};

      // Mettre à jour l'état uniquement si nécessaire et qu'il y avait des boîtes avant
      if (Object.keys(get().boundingBoxes.clusters).length > 0) {
        set((state) => ({
          boundingBoxes: {
            ...state.boundingBoxes,
            clusters: {},
          },
        }));
      }

      if (get().debugMode) {
        console.log("CollisionService: Cleared cluster boxes");
      }

      return;
    }

    // Ajouter le layer à chaque boîte
    const boxesWithLayers = {};
    Object.entries(clusterBoxes).forEach(([id, box]) => {
      boxesWithLayers[id] = {
        ...box,
        layer,
      };
    });

    // Vérification rapide avant la mise à jour
    const state = get();
    const prevBoxes = state.boundingBoxRefs.clusterBoxes;
    const prevBoxCount = Object.keys(prevBoxes).length;
    const newBoxCount = Object.keys(boxesWithLayers).length;

    // Si le nombre de boîtes est identique, vérifier si les IDs ont changé
    if (prevBoxCount === newBoxCount && prevBoxCount > 0) {
      // Vérification rapide des clés (pour éviter les comparaisons coûteuses)
      const prevKeys = Object.keys(prevBoxes).sort().join(",");
      const newKeys = Object.keys(boxesWithLayers).sort().join(",");

      if (prevKeys === newKeys) {
        // Les boîtes sont identiques, pas besoin de mise à jour
        if (get().debugMode) {
          console.log(
            "CollisionService: Cluster boxes unchanged, skipping update"
          );
        }
        return;
      }
    }

    // Mettre à jour la référence d'abord (important)
    state.boundingBoxRefs.clusterBoxes = boxesWithLayers;

    // Mettre à jour l'état uniquement si nécessaire
    set((state) => ({
      boundingBoxes: {
        ...state.boundingBoxes,
        clusters: boxesWithLayers,
      },
    }));

    if (get().debugMode) {
      console.log(`CollisionService: Registered ${newBoxCount} cluster boxes`);
    }
  },

  /**
   * Enregistre des boîtes englobantes pour les nœuds
   * @param {Object} nodeBoxes - Map de boîtes englobantes par ID de nœud
   * @param {number} layer - Layer de collision (par défaut: CollisionLayers.NODES)
   */
  registerNodeBoxes: (nodeBoxes, layer = CollisionLayers.NODES) => {
    // Rapide vérification pour éviter les traitements inutiles
    if (Object.keys(nodeBoxes).length === 0) {
      // Si on reçoit un objet vide, on réinitialise simplement les boîtes
      get().boundingBoxRefs.nodeBoxes = {};

      // Mettre à jour l'état uniquement si nécessaire et qu'il y avait des boîtes avant
      if (Object.keys(get().boundingBoxes.nodes).length > 0) {
        set((state) => ({
          boundingBoxes: {
            ...state.boundingBoxes,
            nodes: {},
          },
        }));
      }

      if (get().debugMode) {
        console.log("CollisionService: Cleared node boxes");
      }

      return;
    }

    // Ajouter le layer à chaque boîte
    const boxesWithLayers = {};
    Object.entries(nodeBoxes).forEach(([id, box]) => {
      boxesWithLayers[id] = {
        ...box,
        layer,
      };
    });

    // Vérification rapide avant la mise à jour
    const state = get();
    const prevBoxes = state.boundingBoxRefs.nodeBoxes;
    const prevBoxCount = Object.keys(prevBoxes).length;
    const newBoxCount = Object.keys(boxesWithLayers).length;

    // Si le nombre de boîtes est identique, vérifier si les IDs ont changé
    if (prevBoxCount === newBoxCount && prevBoxCount > 0) {
      // Vérification rapide des clés (pour éviter les comparaisons coûteuses)
      const prevKeys = Object.keys(prevBoxes).sort().join(",");
      const newKeys = Object.keys(boxesWithLayers).sort().join(",");

      if (prevKeys === newKeys) {
        // Les boîtes sont identiques, pas besoin de mise à jour
        if (get().debugMode) {
          console.log(
            "CollisionService: Node boxes unchanged, skipping update"
          );
        }
        return;
      }
    }

    // Mettre à jour la référence
    state.boundingBoxRefs.nodeBoxes = boxesWithLayers;

    // Mettre à jour l'état uniquement si nécessaire
    set((state) => ({
      boundingBoxes: {
        ...state.boundingBoxes,
        nodes: boxesWithLayers,
      },
    }));

    if (get().debugMode) {
      console.log(`CollisionService: Registered ${newBoxCount} node boxes`);
    }
  },

  /**
   * Enregistre une boîte englobante pour un élément interactif
   * @param {string} elementId - ID de l'élément
   * @param {Object} box - Boîte englobante
   * @param {Object} metadata - Métadonnées associées à l'élément
   * @param {number} layer - Layer de collision (par défaut: CollisionLayers.INTERACTIVE)
   */
  registerInteractiveElement: (
    elementId,
    box,
    metadata = {},
    layer = CollisionLayers.INTERACTIVE
  ) => {
    const newElement = { ...box, ...metadata, layer };

    // Stocker dans la référence d'abord
    get().boundingBoxRefs.interactiveElements[elementId] = newElement;

    // Mettre à jour l'état de manière sécurisée (une seule fois)
    set((state) => {
      // Si l'élément est identique, ne pas mettre à jour
      if (
        JSON.stringify(state.boundingBoxes.interactiveElements[elementId]) ===
        JSON.stringify(newElement)
      ) {
        return {}; // Ne pas mettre à jour si pas de changement
      }

      return {
        boundingBoxes: {
          ...state.boundingBoxes,
          interactiveElements: {
            ...state.boundingBoxes.interactiveElements,
            [elementId]: newElement,
          },
        },
      };
    });

    if (get().debugMode) {
      console.log(
        `CollisionService: Registered interactive element ${elementId} via reference`
      );
    }
  },

  /**
   * Supprime un élément interactif
   * @param {string} elementId - ID de l'élément à supprimer
   */
  unregisterInteractiveElement: (elementId) => {
    // D'abord, vérifier si l'élément existe dans les références
    const elementExists =
      get().boundingBoxRefs.interactiveElements[elementId] !== undefined;

    if (!elementExists) {
      return; // Ne rien faire si l'élément n'existe pas
    }

    // Supprimer de la référence d'abord (important pour éviter les boucles)
    delete get().boundingBoxRefs.interactiveElements[elementId];

    // Ensuite, mettre à jour l'état global de manière sécurisée
    set((state) => {
      // Si l'élément n'existe pas dans l'état, pas besoin de mettre à jour
      if (state.boundingBoxes.interactiveElements[elementId] === undefined) {
        return {}; // Retourner un objet vide = pas de mise à jour
      }

      // Sinon, créer une nouvelle copie sans l'élément
      const newElements = { ...state.boundingBoxes.interactiveElements };
      delete newElements[elementId];

      return {
        boundingBoxes: {
          ...state.boundingBoxes,
          interactiveElements: newElements,
        },
      };
    });

    if (get().debugMode) {
      console.log(
        `CollisionService: Unregistered interactive element ${elementId}`
      );
    }
  },

  /**
   * Crée une boîte englobante simple autour d'un point avec une taille donnée
   * @param {Object} position - Position (x, y, z)
   * @param {number} size - Taille de la boîte
   * @param {number} layer - Layer de collision (par défaut: CollisionLayers.DEFAULT)
   * @returns {Object} - Boîte englobante
   */
  createBoundingBox: (position, size, layer = CollisionLayers.DEFAULT) => {
    const halfSize = size / 2;

    return {
      min: {
        x: position.x - halfSize,
        y: position.y - halfSize,
        z: position.z - halfSize,
      },
      max: {
        x: position.x + halfSize,
        y: position.y + halfSize,
        z: position.z + halfSize,
      },
      center: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      size: { x: size, y: size, z: size },
      layer,
    };
  },

  /**
   * Trouve le cluster contenant le point de détection
   * @param {THREE.Vector3} point - Point à vérifier (utilise le point stocké si non fourni)
   * @returns {Object|null} - Cluster contenant le point ou null
   */
  findContainingCluster: (point = null) => {
    const state = get();

    // Vérifier si les collisions de clusters sont activées
    if (
      !state.collisionEnabled.clusters ||
      !(state.collisionMask & CollisionLayers.CLUSTERS)
    ) {
      return null;
    }

    const checkPoint = point || state.detectionPoint;
    let containingCluster = null;
    let minDistance = Infinity;

    // Utiliser les boîtes de la référence pour éviter les boucles de rendu
    const clusters = state.boundingBoxRefs.clusterBoxes;

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    state.stats.detectionCalls += 1;

    // Parcourir toutes les boîtes englobantes des clusters
    Object.entries(clusters).forEach(([clusterId, box]) => {
      // Utiliser la fonction utilitaire isPointInBoundingBox
      if (state.isPointInBoundingBox(checkPoint, box)) {
        // Calculer la distance au centre
        const distance = state.distanceToBoxCenter(checkPoint, box);

        // Si cette boîte est plus proche que la précédente, la sélectionner
        if (distance < minDistance) {
          minDistance = distance;
          containingCluster = {
            id: clusterId,
            distance,
            name: box.name || `Cluster ${clusterId}`,
          };
        }
      }
    });

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    if (containingCluster) {
      state.stats.clusterDetections += 1;
      state.stats.collisionsFound += 1;
    }

    return containingCluster;
  },

  /**
   * Trouve le nœud contenant le point de détection
   * @param {THREE.Vector3} point - Point à vérifier (utilise le point stocké si non fourni)
   * @returns {Object|null} - Nœud contenant le point ou null
   */
  findContainingNode: (point = null) => {
    const state = get();

    // Vérifier si les collisions de nœuds sont activées
    if (
      !state.collisionEnabled.nodes ||
      !(state.collisionMask & CollisionLayers.NODES)
    ) {
      return null;
    }

    const checkPoint = point || state.detectionPoint;
    let containingNode = null;
    let minDistance = Infinity;

    // Utiliser les boîtes de la référence
    const nodes = state.boundingBoxRefs.nodeBoxes;

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    state.stats.detectionCalls += 1;

    // Parcourir toutes les boîtes englobantes des nœuds
    Object.entries(nodes).forEach(([nodeId, box]) => {
      // Utiliser la fonction utilitaire isPointInBoundingBox
      if (state.isPointInBoundingBox(checkPoint, box)) {
        // Calculer la distance au centre
        const distance = state.distanceToBoxCenter(checkPoint, box);

        // Si cette boîte est plus proche que la précédente, la sélectionner
        if (distance < minDistance) {
          minDistance = distance;
          containingNode = {
            id: nodeId,
            distance,
            name: box.name || `Node ${nodeId}`,
            data: box.data,
          };
        }
      }
    });

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    if (containingNode) {
      state.stats.nodeDetections += 1;
      state.stats.collisionsFound += 1;
    }

    return containingNode;
  },

  /**
   * Trouve l'élément interactif contenant le point de détection
   * @param {THREE.Vector3} point - Point à vérifier (utilise le point stocké si non fourni)
   * @returns {Object|null} - Élément contenant le point ou null
   */
  findContainingInteractiveElement: (point = null) => {
    const state = get();

    // Vérifier si les collisions d'éléments interactifs sont activées
    if (
      !state.collisionEnabled.interactiveElements ||
      !(state.collisionMask & CollisionLayers.INTERACTIVE)
    ) {
      return null;
    }

    const checkPoint = point || state.detectionPoint;
    let containingElement = null;
    let minDistance = Infinity;

    // Utiliser les boîtes de la référence
    const elements = state.boundingBoxRefs.interactiveElements;

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    state.stats.detectionCalls += 1;

    // Parcourir toutes les boîtes englobantes des éléments interactifs
    Object.entries(elements).forEach(([elementId, element]) => {
      const box = element;

      // Utiliser la fonction utilitaire isPointInBoundingBox
      if (state.isPointInBoundingBox(checkPoint, box)) {
        // Calculer la distance au centre
        const distance = state.distanceToBoxCenter(checkPoint, box);

        // Si cette boîte est plus proche que la précédente, la sélectionner
        if (distance < minDistance) {
          minDistance = distance;
          containingElement = {
            id: elementId,
            distance,
            ...element, // Inclure les métadonnées
          };
        }
      }
    });

    // Mettre à jour les stats par mutation directe sans provoquer de rendu global
    if (containingElement) {
      state.stats.interactiveElementDetections += 1;
      state.stats.collisionsFound += 1;
    }

    return containingElement;
  },

  /**
   * Vérifie si assez de temps s'est écoulé depuis la dernière vérification
   * @returns {boolean} - Vrai si on peut effectuer une nouvelle vérification
   */
  canPerformCheck: () => {
    const state = get();
    const now = Date.now();
    const elapsed = now - state.lastCheckTime;

    if (elapsed >= state.settings.throttleTime) {
      // Mettre à jour directement la référence au lieu d'utiliser set() pour éviter un re-rendu
      state.lastCheckTime = now;
      return true;
    }

    return false;
  },

  /**
   * Réinitialise les statistiques
   */
  resetStats: () => {
    set((state) => ({
      stats: {
        detectionCalls: 0,
        collisionsFound: 0,
        clusterDetections: 0,
        nodeDetections: 0,
        interactiveElementDetections: 0,
        lastDetectionTime: 0,
      },
    }));
  },

  /**
   * Expose le pool d'objets pour l'utilisation externe
   */
  objectPool: ObjectPool,

  /**
   * Définit un masque de collision global à partir d'un tableau de layers
   * @param {Array<number>} layers - Tableau de layers (utiliser les constantes CollisionLayers)
   */
  setGlobalMask: (layers) => {
    if (!Array.isArray(layers) || layers.length === 0) {
      return; // Ne rien faire si le tableau est vide ou invalide
    }

    // Créer un masque combiné à partir de tous les layers
    const combinedMask = layers.reduce((mask, layer) => mask | layer, 0);

    // Utiliser la méthode existante pour définir le masque
    get().setCollisionMask(combinedMask);

    if (get().debugMode) {
      console.log(
        `CollisionService: Global mask set from layers [${layers.join(
          ", "
        )}] to ${combinedMask.toString(2)}`
      );
    }
  },
}));

// Exporter directement le hook pour utilisation
export default useCollisionStore;
