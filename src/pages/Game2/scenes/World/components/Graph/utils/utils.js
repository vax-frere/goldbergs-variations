/**
 * Utilitaires pour le graphe
 */

// Fonction pour trouver les liens associés à un nœud
export const getNodeLinks = (nodeId, links) => {
  if (!links || !nodeId) return [];

  return links.filter((link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    return sourceId === nodeId || targetId === nodeId;
  });
};

// Fonction pour regrouper les nœuds par type
export const groupNodesByType = (nodes) => {
  if (!nodes) return {};

  return nodes.reduce((groups, node) => {
    const type = node.type || "unknown";

    if (!groups[type]) {
      groups[type] = [];
    }

    groups[type].push(node);
    return groups;
  }, {});
};

// Fonction pour regrouper les nœuds par cluster
export const groupNodesByCluster = (nodes) => {
  if (!nodes) return {};

  return nodes.reduce((groups, node) => {
    const cluster = node.cluster !== undefined ? node.cluster : "none";

    if (!groups[cluster]) {
      groups[cluster] = [];
    }

    groups[cluster].push(node);
    return groups;
  }, {});
};

/**
 * Trouve le nœud principal d'un cluster (probablement un persona)
 * @param {Array} clusterNodes - Tableau des nœuds du cluster
 * @returns {Object|null} - Le nœud principal ou null si aucun n'est trouvé
 */
export const findMainNodeInCluster = (clusterNodes) => {
  if (!clusterNodes || !clusterNodes.length) return null;

  // On essaie d'abord de trouver un nœud de type 'persona'
  const personaNode = clusterNodes.find((node) => node.type === "persona");
  if (personaNode) {
    return personaNode;
  }

  // Si pas de persona, on prend le premier nœud qui a un nom
  const namedNode = clusterNodes.find((node) => node.name);
  if (namedNode) {
    return namedNode;
  }

  // Sinon on renvoie le premier nœud
  return clusterNodes[0];
};

/**
 * Calcule le centroïde (position moyenne) de chaque cluster
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {boolean} extractNames - Indique si on doit extraire les noms des clusters
 * @returns {Object} - Map des centroïdes par ID de cluster et éventuellement les noms
 */
export const calculateClusterCentroids = (nodes, extractNames = false) => {
  if (!nodes || !nodes.length)
    return extractNames ? { centroids: {}, clusterNames: {} } : {};

  // Initialiser les accumulateurs pour chaque cluster
  const clusters = {};
  const clusterNames = {};
  const clusterSlugs = {};

  // Regrouper les nœuds par cluster
  nodes.forEach((node) => {
    if (node.cluster === undefined) return;

    const clusterId = node.cluster;

    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        sum: { x: 0, y: 0, z: 0 },
        count: 0,
        nodes: [],
        // Pour le nom, on utilise la propriété cluster_name si elle existe
        name: node.cluster_name || node.clusterName || `Cluster ${clusterId}`,
      };

      // Stocker le nom du cluster
      if (extractNames) {
        clusterNames[clusterId] = clusters[clusterId].name;
      }
    }

    // Ajouter les coordonnées du nœud à la somme
    clusters[clusterId].sum.x += node.x || 0;
    clusters[clusterId].sum.y += node.y || 0;
    clusters[clusterId].sum.z += node.z || 0;
    clusters[clusterId].count += 1;
    clusters[clusterId].nodes.push(node);
  });

  // Calculer les positions moyennes (centroïdes)
  const centroids = {};
  Object.keys(clusters).forEach((clusterId) => {
    const cluster = clusters[clusterId];
    if (cluster.count > 0) {
      // Trouver le nœud principal du cluster pour le nom
      const mainNode = findMainNodeInCluster(cluster.nodes);
      const clusterName = mainNode?.name || cluster.name;
      const clusterSlug = mainNode?.slug || clusterId;

      centroids[clusterId] = {
        x: cluster.sum.x / cluster.count,
        y: cluster.sum.y / cluster.count,
        z: cluster.sum.z / cluster.count,
        nodeCount: cluster.count,
        nodes: cluster.nodes,
        name: clusterName,
        slug: clusterSlug,
      };

      // Mettre à jour le nom et le slug du cluster dans les maps
      if (extractNames) {
        clusterNames[clusterId] = clusterName;
        clusterSlugs[clusterId] = clusterSlug;
      }
    }
  });

  // Retourner les noms et slugs de clusters si demandé
  if (extractNames) {
    return {
      centroids,
      clusterNames,
      clusterSlugs,
    };
  }

  return centroids;
};

/**
 * Calcule les boîtes englobantes (bounding boxes) pour chaque cluster
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {boolean} extractNames - Indique si on doit extraire les noms des clusters
 * @returns {Object} - Map des boîtes englobantes par ID de cluster et éventuellement les noms
 */
export const calculateClusterBoundingBoxes = (nodes, extractNames = false) => {
  if (!nodes || !nodes.length)
    return extractNames ? { boundingBoxes: {}, clusterNames: {} } : {};

  // Initialiser les structures pour chaque cluster
  const clusters = {};
  const clusterNames = {};
  const clusterSlugs = {};

  // Regrouper les nœuds par cluster et initialiser les min/max
  nodes.forEach((node) => {
    if (node.cluster === undefined) return;

    const clusterId = node.cluster;
    const x = node.x || 0;
    const y = node.y || 0;
    const z = node.z || 0;

    if (!clusters[clusterId]) {
      clusters[clusterId] = {
        min: { x, y, z },
        max: { x, y, z },
        nodes: [],
        // Pour le nom, on utilise la propriété cluster_name si elle existe
        name: node.cluster_name || node.clusterName || `Cluster ${clusterId}`,
      };

      // Stocker le nom du cluster
      if (extractNames) {
        clusterNames[clusterId] = clusters[clusterId].name;
      }
    } else {
      // Mettre à jour les valeurs min/max
      const box = clusters[clusterId];

      // Mise à jour des minimums
      box.min.x = Math.min(box.min.x, x);
      box.min.y = Math.min(box.min.y, y);
      box.min.z = Math.min(box.min.z, z);

      // Mise à jour des maximums
      box.max.x = Math.max(box.max.x, x);
      box.max.y = Math.max(box.max.y, y);
      box.max.z = Math.max(box.max.z, z);
    }

    // Ajouter le nœud à son cluster
    clusters[clusterId].nodes.push(node);
  });

  // Créer les boîtes englobantes THREE.js
  const boundingBoxes = {};
  Object.keys(clusters).forEach((clusterId) => {
    const cluster = clusters[clusterId];

    // Trouver le nœud principal du cluster pour le nom
    const mainNode = findMainNodeInCluster(cluster.nodes);
    const clusterName = mainNode?.name || cluster.name;
    const clusterSlug = mainNode?.slug || clusterId;

    // Mettre à jour le nom et le slug du cluster dans les maps
    if (extractNames) {
      clusterNames[clusterId] = clusterName;
      clusterSlugs[clusterId] = clusterSlug;
    }

    // Calculer les dimensions de la boîte
    const size = {
      x: cluster.max.x - cluster.min.x,
      y: cluster.max.y - cluster.min.y,
      z: cluster.max.z - cluster.min.z,
    };

    // Calculer le centre de la boîte
    const center = {
      x: (cluster.min.x + cluster.max.x) / 2,
      y: (cluster.min.y + cluster.max.y) / 2,
      z: (cluster.min.z + cluster.max.z) / 2,
    };

    // Appliquer une taille minimum de 10 unités pour chaque dimension
    const MIN_SIZE = 10;
    let finalSize = { ...size };

    // Vérifier si une dimension est inférieure à la taille minimum
    if (size.x < MIN_SIZE) finalSize.x = MIN_SIZE;
    if (size.y < MIN_SIZE) finalSize.y = MIN_SIZE;
    if (size.z < MIN_SIZE) finalSize.z = MIN_SIZE;

    // Calculer les nouveaux min et max en utilisant le centre et les dimensions minimales garanties
    let finalMin = {
      x: center.x - finalSize.x / 2,
      y: center.y - finalSize.y / 2,
      z: center.z - finalSize.z / 2,
    };

    let finalMax = {
      x: center.x + finalSize.x / 2,
      y: center.y + finalSize.y / 2,
      z: center.z + finalSize.z / 2,
    };

    // Si le cluster a seulement 2 nœuds ou moins, tripler la taille de la bounding box
    if (cluster.nodes.length <= 2) {
      // Calculer les nouvelles dimensions (tripler la taille)
      const expandFactor = 3;
      const expandedSize = {
        x: finalSize.x * expandFactor,
        y: finalSize.y * expandFactor,
        z: finalSize.z * expandFactor,
      };

      // Recalculer les nouveaux min et max en utilisant le centre et les dimensions triplées
      finalMin = {
        x: center.x - expandedSize.x / 2,
        y: center.y - expandedSize.y / 2,
        z: center.z - expandedSize.z / 2,
      };

      finalMax = {
        x: center.x + expandedSize.x / 2,
        y: center.y + expandedSize.y / 2,
        z: center.z + expandedSize.z / 2,
      };

      // Créer la bounding box avec les valeurs étendues
      boundingBoxes[clusterId] = {
        min: finalMin,
        max: finalMax,
        center: center,
        size: expandedSize,
        nodeCount: cluster.nodes.length,
        nodes: cluster.nodes,
        name: clusterName,
        slug: clusterSlug,
      };
    } else {
      // Cas normal pour les clusters plus grands
      boundingBoxes[clusterId] = {
        min: finalMin,
        max: finalMax,
        center: center,
        size: finalSize,
        nodeCount: cluster.nodes.length,
        nodes: cluster.nodes,
        name: clusterName,
        slug: clusterSlug,
      };
    }
  });

  // Retourner les noms et slugs de clusters si demandé
  if (extractNames) {
    return {
      boundingBoxes,
      clusterNames,
      clusterSlugs,
    };
  }

  return boundingBoxes;
};

/**
 * Trouve l'ID numérique d'un cluster à partir d'un slug
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {string} slug - Slug à rechercher
 * @returns {Object} - Objet contenant l'ID numérique et les infos du nœud principal
 */
export const findClusterIdBySlug = (nodes, slug) => {
  if (!nodes || !nodes.length || !slug) {
    console.log("findClusterIdBySlug: Paramètres invalides", { nodes, slug });
    return null;
  }

  // Trouver le nœud qui a ce slug
  const nodeWithSlug = nodes.find((node) => {
    // Vérifier plusieurs propriétés pour le slug
    return (
      node.slug === slug || // Slug direct
      node.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") ===
        slug.toLowerCase() || // Nom transformé en slug
      String(node.cluster) === slug // ID de cluster en string
    );
  });

  if (!nodeWithSlug || nodeWithSlug.cluster === undefined) {
    console.log("findClusterIdBySlug: Nœud non trouvé pour le slug", { slug });
    return null;
  }

  // Trouver tous les nœuds de ce cluster
  const clusterNodes = nodes.filter(
    (node) => node.cluster === nodeWithSlug.cluster
  );

  // Trouver le nœud principal du cluster
  const mainNode = findMainNodeInCluster(clusterNodes);

  console.log("findClusterIdBySlug: Cluster trouvé", {
    slug,
    clusterId: nodeWithSlug.cluster,
    mainNode,
    nodesCount: clusterNodes.length,
  });

  return {
    clusterId: nodeWithSlug.cluster,
    mainNode,
    clusterNodes,
  };
};
