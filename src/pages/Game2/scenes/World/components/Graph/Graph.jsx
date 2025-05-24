import React, {
  useEffect,
  useState,
  memo,
  useMemo,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../../../hooks/useAssets";
import CustomText from "../../../../components/CustomText";
import {
  calculateClusterCentroids,
  calculateClusterBoundingBoxes,
} from "./utils/utils";
import useCollisionStore from "../../../../services/CollisionService";
import useGameStore from "../../../../store";
import { useInputs } from "../../../../components/AdvancedCameraController/inputManager";
import { useInteractionText } from "../../../../components/AdvancedCameraController/CameraIndicators";

// Contexte pour partager l'état d'activité des clusters sans re-rendus inutiles
const ActiveClusterContext = createContext(null);

// Créer des vecteurs réutilisables pour éviter les allocations dans les boucles d'animation
const tempVec3 = new THREE.Vector3();
const tempBox3 = new THREE.Box3();

/**
 * Composant simple pour afficher un graphe avec des sphères et des lignes
 * Charge les données du fichier final_spatialized_graph.data.json
 */
const Graph = memo(() => {
  const [graphData, setGraphData] = useState(null);
  const activeClusterIdRef = useRef(null);
  const labelRefs = useRef(new Map());
  const assets = useAssets({ autoInit: false });
  const { scene } = useThree();
  const lastDetectionTime = useRef(0);

  // Références pour les géométries et matériaux partagés
  const geometriesRef = useRef({});
  const materialsRef = useRef({});

  // Accéder aux entrées unifiées (clavier et manette)
  const inputs = useInputs();
  const prevInteract = useRef(false);

  // Déplacer les appels de hooks au niveau supérieur
  const setHoveredClusterFromStore = useGameStore(
    (state) => state.setHoveredCluster
  );
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const setActiveLevel = useGameStore((state) => state.setActiveLevel);
  const setActiveNodeData = useGameStore((state) => state.setActiveNodeData);

  // Mémoriser les fonctions qui utilisent les valeurs du store
  const setHoveredCluster = useMemo(
    () => (cluster) => setHoveredClusterFromStore(cluster),
    [setHoveredClusterFromStore]
  );

  const clusterNamesRef = useRef({});
  const clusterSlugsRef = useRef({}); // Référence aux slugs pour tous les clusters

  // Référence au service de collision
  const registerClusterBoxes = useCollisionStore(
    (state) => state.registerClusterBoxes
  );
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const detectCollisions = useCollisionStore((state) => state.detectCollisions);
  const unregisterClusterBoxes = useCollisionStore(
    (state) => state.unregisterClusterBoxes
  );

  // Fonction pour notifier un composant spécifique qu'il est actif/inactif
  const notifyClusterActivity = (clusterId, isActive) => {
    const labelComponent = labelRefs.current.get(clusterId);
    if (labelComponent && labelComponent.updateActivity) {
      labelComponent.updateActivity(isActive);
    }
  };

  // Fonction pour mettre à jour l'état actif
  const setActiveCluster = (clusterId) => {
    // Si c'est le même cluster, ne rien faire
    if (activeClusterIdRef.current === clusterId) return;

    // Désactiver l'ancien cluster actif
    if (activeClusterIdRef.current) {
      notifyClusterActivity(activeClusterIdRef.current, false);
    }

    // Activer le nouveau cluster
    if (clusterId) {
      notifyClusterActivity(clusterId, true);

      // Récupérer le slug directement depuis les données de la boîte
      const box =
        useCollisionStore.getState().boundingBoxRefs.clusterBoxes[clusterId];
      if (!box || !box.data?.id) {
        console.warn(`No data found for cluster ${clusterId}`);
        return;
      }

      // Mettre à jour le cluster survolé dans le store avec le slug
      setHoveredCluster(box.data.id);
    } else {
      // Réinitialiser le cluster survolé quand on ne survole plus rien
      setHoveredCluster(null);
    }

    // Mettre à jour la référence
    activeClusterIdRef.current = clusterId;
  };

  // Vérifier à chaque frame si l'action interact est déclenchée et un cluster est survolé
  useFrame(() => {
    // Détecter si l'action interact vient d'être déclenchée (front montant)
    const interactTriggered = inputs.interact && !prevInteract.current;
    prevInteract.current = inputs.interact;

    // Si l'action interact vient d'être déclenchée et qu'un cluster est survolé
    if (interactTriggered && hoveredCluster) {
      // Récupérer les données complètes du cluster depuis les boîtes de collision
      const boundingBoxes =
        useCollisionStore.getState().boundingBoxRefs.clusterBoxes;
      const box = boundingBoxes[activeClusterIdRef.current];

      // Le hoveredCluster est déjà le slug
      const clusterData = {
        id: hoveredCluster,
        type: "cluster",
        name: box?.data?.name || null,
      };

      // Activer le niveau cluster avancé avec les données du cluster
      setActiveLevel(clusterData);
      console.log("Activating advanced cluster level for:", clusterData);
    }
  });

  // Charger les données du graphe depuis l'asset manager
  useEffect(() => {
    if (!assets.isReady) return;

    const spatializedGraph = assets.getData("graph");
    if (spatializedGraph) {
      console.log("Graph rendered");
      setGraphData(spatializedGraph);
    } else {
      console.error("Impossible de charger les données du graphe");
    }
  }, [assets.isReady, assets.getData]);

  // Initialiser les géométries et matériaux partagés
  useEffect(() => {
    if (!assets.isReady) return;

    // Créer les géométries
    geometriesRef.current.node = new THREE.SphereGeometry(3.5, 8, 8);
    geometriesRef.current.line = new THREE.BufferGeometry();

    // Créer les matériaux
    materialsRef.current.node = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.9,
    });
    materialsRef.current.line = new THREE.LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.5,
    });

    // Nettoyage
    return () => {
      // Disposer les géométries
      Object.values(geometriesRef.current).forEach((geometry) => {
        if (geometry && geometry.dispose) {
          geometry.dispose();
        }
      });
      geometriesRef.current = {};

      // Disposer les matériaux
      Object.values(materialsRef.current).forEach((material) => {
        if (material && material.dispose) {
          material.dispose();
        }
      });
      materialsRef.current = {};
    };
  }, [assets.isReady]);

  // Construire le graphe une fois les données chargées
  const nodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes || [];
  }, [graphData]);

  // Construire les liens une fois les données chargées
  const edges = useMemo(() => {
    if (!graphData) return [];
    return (graphData.links || []).map((link) => {
      const geometry = new THREE.BufferGeometry();
      return {
        ...link,
        geometry,
      };
    });
  }, [graphData]);

  // Créer un map des nœuds pour accéder rapidement par ID
  const nodeMap = useMemo(() => {
    const map = new Map();
    if (nodes && nodes.length) {
      nodes.forEach((node) => {
        map.set(node.id, node);
      });
    }
    return map;
  }, [nodes]);

  // Calculer les centroïdes des clusters et récupérer leurs noms
  const { centroids, clusterNames, clusterSlugs } = useMemo(() => {
    if (!nodes || !nodes.length)
      return { centroids: {}, clusterNames: {}, clusterSlugs: {} };

    // Utiliser la fonction de utils.js pour calculer les centroïdes et noms des clusters
    return calculateClusterCentroids(nodes, true);
  }, [nodes]);

  // Calculer les boîtes englobantes pour chaque cluster
  const {
    boundingBoxes: clusterBoundingBoxes,
    clusterSlugs: boundingBoxSlugs,
  } = useMemo(() => {
    if (!nodes || !nodes.length) return { boundingBoxes: {}, clusterSlugs: {} };

    // Utiliser la fonction existante pour calculer les boîtes englobantes
    const result = calculateClusterBoundingBoxes(nodes, true);

    // Ajouter une expansion à chaque boîte pour faciliter la collision
    const EXPANSION_SIZE = 30; // Taille d'expansion en unités 3D

    Object.keys(result.boundingBoxes).forEach((clusterId) => {
      const box = result.boundingBoxes[clusterId];

      // Étendre les limites de la boîte
      box.min.x -= EXPANSION_SIZE;
      box.min.y -= EXPANSION_SIZE;
      box.min.z -= EXPANSION_SIZE;

      box.max.x += EXPANSION_SIZE;
      box.max.y += EXPANSION_SIZE;
      box.max.z += EXPANSION_SIZE;

      // Mettre à jour les dimensions
      box.size = {
        x: box.max.x - box.min.x,
        y: box.max.y - box.min.y,
        z: box.max.z - box.min.z,
      };
    });

    return result;
  }, [nodes]);

  // Enregistrer les boîtes englobantes auprès du service de collision
  useEffect(() => {
    if (!clusterBoundingBoxes || Object.keys(clusterBoundingBoxes).length === 0)
      return;

    // Ajouter les données nécessaires à chaque boîte
    const boxesWithData = {};
    Object.entries(clusterBoundingBoxes).forEach(([id, box]) => {
      boxesWithData[id] = {
        ...box,
        data: {
          id,
          name: clusterNames[id],
          slug: clusterSlugs[id],
        },
        debugColor: [0, 1, 0], // Couleur par défaut
      };
    });

    // Enregistrer les boîtes auprès du service de collision
    registerClusterBoxes(boxesWithData);
  }, [clusterBoundingBoxes, registerClusterBoxes, clusterNames, clusterSlugs]);

  // Détecter les collisions localement sans utiliser le state global
  // useFrame supprimé car géré par le CollisionManager

  // Valeur du contexte avec les refs nécessaires
  const contextValue = useMemo(
    () => ({
      registerLabel: (id, component) => {
        labelRefs.current.set(id, component);
      },
      unregisterLabel: (id) => {
        labelRefs.current.delete(id);
      },
    }),
    []
  );

  // Mettre à jour les références aux noms et slugs de clusters pour le hover
  useEffect(() => {
    clusterNamesRef.current = clusterNames;
    clusterSlugsRef.current = clusterSlugs;
  }, [clusterNames, clusterSlugs]);

  // Nettoyage complet lors du démontage
  useEffect(() => {
    return () => {
      // Vider les références
      labelRefs.current.clear();
      activeClusterIdRef.current = null;
      clusterNamesRef.current = {};
      clusterSlugsRef.current = {};

      // Nettoyer les géométries des liens
      if (edges) {
        edges.forEach((edge) => {
          if (edge.geometry) {
            edge.geometry.dispose();
          }
        });
      }

      // Nettoyer les boîtes de collision
      unregisterClusterBoxes();

      // Nettoyer hoveredCluster dans le store
      setHoveredCluster(null);

      // Réinitialiser les autres références
      lastDetectionTime.current = 0;
      prevInteract.current = false;
    };
  }, [edges, setHoveredCluster, unregisterClusterBoxes]);

  // Gérer les effets visuels quand un cluster est survolé
  useEffect(() => {
    if (hoveredCluster) {
      // Mettre à jour la référence active
      activeClusterIdRef.current = hoveredCluster;

      // Notifier le composant du cluster qu'il est actif
      notifyClusterActivity(hoveredCluster, true);

      // Utiliser le slug du cluster pour setActiveNodeData
      const clusterSlug = clusterSlugsRef.current[hoveredCluster];
      if (clusterSlug) {
        setActiveNodeData(clusterSlug);
      }
    } else {
      // Si aucun cluster n'est survolé
      if (activeClusterIdRef.current) {
        notifyClusterActivity(activeClusterIdRef.current, false);
      }
      activeClusterIdRef.current = null;

      // Réinitialiser activeNodeData
      setActiveNodeData(null);
    }
  }, [hoveredCluster, setActiveNodeData]);

  // Si les données ne sont pas encore chargées
  if (!graphData) return null;

  return (
    <ActiveClusterContext.Provider value={contextValue}>
      <group>
        {/* Nœuds du graphe représentés par des sphères */}
        {nodes.map((node, index) => (
          <mesh
            key={`node-${index}`}
            position={[node.x || 0, node.y || 0, node.z || 0]}
            geometry={geometriesRef.current.node}
            material={materialsRef.current.node}
          />
        ))}

        {/* Liens du graphe représentés par des lignes */}
        {edges.map((edge, index) => {
          // Récupérer les nœuds source et cible par ID
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);

          // Vérifier que les nœuds existent
          if (!source || !target) {
            return null;
          }

          // Créer les points de la ligne
          const points = [
            new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0),
            new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0),
          ];

          // Mettre à jour la géométrie de la ligne
          edge.geometry.setFromPoints(points);

          return (
            <line
              key={`edge-${index}`}
              geometry={edge.geometry}
              material={materialsRef.current.line}
            />
          );
        })}

        {/* Noms des clusters aux centroïdes - apparaissent quand on s'approche */}
        {Object.entries(centroids).map(([clusterId, centroid]) => (
          <ClusterLabel
            key={`cluster-${clusterId}`}
            id={clusterId}
            centroid={centroid}
            name={clusterNames[clusterId] || clusterId}
          />
        ))}
      </group>
    </ActiveClusterContext.Provider>
  );
});

/**
 * Composant optimisé pour le label de cluster qui ne se met à jour
 * que lorsque son état actif change, sans re-rendre le graphe complet
 */
const ClusterLabel = memo(({ id, centroid, name }) => {
  const [isActive, setIsActive] = useState(false);
  const context = useContext(ActiveClusterContext);
  const isInitialRender = useRef(true);
  const { interactionKey } = useInteractionText();
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);

  // S'assurer que l'état est correctement mis à jour même lors d'un changement synchrone
  const updateActivity = useRef((active) => {
    if (active !== isActive) {
      setIsActive(active);
    }
  });

  // Mettre à jour la référence à la fonction quand isActive change
  useEffect(() => {
    updateActivity.current = (active) => {
      if (active !== isActive) {
        setIsActive(active);
      }
    };
  }, [isActive, id]);

  // Créer un objet avec la méthode de mise à jour pour la notification
  const componentRef = useRef({
    updateActivity: (active) => updateActivity.current(active),
  });

  // S'enregistrer auprès du gestionnaire de labels
  useEffect(() => {
    if (context) {
      // Enregistrer le composant immédiatement
      context.registerLabel(id, componentRef.current);

      // Nettoyer lors du démontage
      return () => {
        context.unregisterLabel(id);
      };
    }
  }, [context, id]);

  // Créer une copie du centroid pour éviter de modifier la prop directement
  const position = Array.isArray(centroid)
    ? [...centroid]
    : [centroid.x || 0, centroid.y || 0, centroid.z || 0];

  // Vérifier si ce cluster est actuellement survolé
  const isHovered = hoveredCluster === id;

  return (
    <group>
      {/* Nom du cluster */}
      <CustomText
        text={name}
        position={position}
        size={15}
        color="#ffffff"
        reverseOpacity={true}
        maxDistance={1000}
        minDistance={300}
        outline={true}
        outlineWidth={2.0}
        outlineColor="#000000"
      />

      {/* Indication d'interaction qui s'adapte au périphérique connecté */}
      {isHovered && (
        <CustomText
          text={`Press ${interactionKey} to enter`}
          position={[position[0], position[1] - 20, position[2]]}
          size={12}
          color="#ffffff"
          opacity={0.8}
          reverseOpacity={true}
          maxDistance={800}
          minDistance={200}
          outline={true}
          outlineWidth={1.5}
          outlineColor="#000000"
        />
      )}
    </group>
  );
});

export default Graph;
