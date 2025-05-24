import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useGameStore from "../../store";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";

/**
 * Hook personnalisé pour détecter quand le point de détection entre dans la zone d'un nœud
 * Ce hook fonctionne uniquement quand un cluster est actif et en mode advanced
 * Utilise le service de collision centralisé
 */
const useNodeDetection = (nodes, options = {}) => {
  const {
    // Distance du point de détection devant la caméra
    detectionPointDistance = 50,
    // Taille de la boîte englobante autour de chaque nœud
    nodeBoundingBoxSize = 20,
    // Activer les logs de débogage
    debug = false,
    // Layer de collision à utiliser
    collisionLayer = CollisionLayers.NODES,
  } = options;

  // Accéder à la caméra via useThree
  const { camera } = useThree();

  // Accéder au service de collision centralisé
  const collisionService = useCollisionStore();

  // Store Zustand pour le cluster actif et le nœud actif
  const { activeClusterId, activeNodeId, setActiveNode } = useGameStore();

  // État local pour stocker les nœuds du cluster actif
  const [clusterNodes, setClusterNodes] = useState([]);

  // Référence pour stocker les dernières boîtes englobantes calculées
  const lastBoundingBoxesRef = useRef({});

  // Référence pour les données du nœud actif
  const activeNodeDataRef = useRef(null);

  // Flag pour suivre si les boîtes ont déjà été enregistrées
  const boxesRegisteredRef = useRef(false);

  // Référence pour le dernier cluster actif (pour détecter les changements)
  const lastActiveClusterIdRef = useRef(null);

  // Pour détecter si un cluster est actif
  const hasActiveClusterRef = useRef(false);

  // Dernière vérification pour limiter la fréquence
  const lastCheckTimeRef = useRef(0);
  const throttleTimeRef = useRef(100); // Limiter à 10 fois par seconde

  // Vecteur directionnel temporaire pour calculs
  const directionVector = new THREE.Vector3();

  // Fonction pour trouver les nœuds appartenant au cluster actif
  const findClusterNodes = (allNodes, clusterId) => {
    if (!allNodes || !clusterId) return [];
    return allNodes.filter(
      (node) =>
        node.cluster !== undefined && String(node.cluster) === String(clusterId)
    );
  };

  // Mettre à jour les nœuds du cluster lorsque le cluster actif change
  useEffect(() => {
    // Vérifier si un cluster est actif
    const isClusterActive = activeClusterId !== null;
    hasActiveClusterRef.current = isClusterActive;

    // Vérifier si le cluster a changé
    const clusterChanged = lastActiveClusterIdRef.current !== activeClusterId;
    lastActiveClusterIdRef.current = activeClusterId;

    // Si aucun cluster n'est actif ou s'il n'y a pas de nœuds, réinitialiser
    if (!isClusterActive || !nodes || nodes.length === 0) {
      if (boxesRegisteredRef.current) {
        // Réinitialiser les boîtes englobantes des nœuds dans le service
        collisionService.registerNodeBoxes({}, collisionLayer);
        boxesRegisteredRef.current = false;
        lastBoundingBoxesRef.current = {};
      }
      setClusterNodes([]);
      return;
    }

    // Mettre à jour la liste des nœuds pour ce cluster
    const nodesInCluster = findClusterNodes(nodes, activeClusterId);
    setClusterNodes(nodesInCluster);

    // Si aucun nœud dans ce cluster, réinitialiser
    if (nodesInCluster.length === 0) {
      if (boxesRegisteredRef.current) {
        collisionService.registerNodeBoxes({}, collisionLayer);
        boxesRegisteredRef.current = false;
        lastBoundingBoxesRef.current = {};
      }
      return;
    }

    // Au changement de cluster, calculer immédiatement les boîtes
    calculateAndRegisterBoundingBoxes(nodesInCluster);
  }, [activeClusterId, nodes]); // Dépendances: cluster actif et tous les nœuds

  // Fonction pour calculer et enregistrer les boîtes englobantes
  const calculateAndRegisterBoundingBoxes = (nodesToRegister) => {
    if (!nodesToRegister || nodesToRegister.length === 0) return;

    // Calculer les boîtes englobantes pour chaque nœud
    const boundingBoxes = {};

    nodesToRegister.forEach((node) => {
      if (!node.x || !node.y || !node.z) return;

      const nodeId = node.id;
      const halfSize = nodeBoundingBoxSize / 2;

      boundingBoxes[nodeId] = {
        min: {
          x: node.x - halfSize,
          y: node.y - halfSize,
          z: node.z - halfSize,
        },
        max: {
          x: node.x + halfSize,
          y: node.y + halfSize,
          z: node.z + halfSize,
        },
        center: {
          x: node.x,
          y: node.y,
          z: node.z,
        },
        name: node.name || node.label || `Node ${nodeId}`,
        node: node,
      };
    });

    // Enregistrer les boîtes englobantes dans le service de collision centralisé
    collisionService.registerNodeBoxes(boundingBoxes, collisionLayer);

    // Mettre à jour la référence locale
    lastBoundingBoxesRef.current = boundingBoxes;
    boxesRegisteredRef.current = true;

    if (debug) {
      console.log(
        `Enregistré ${
          Object.keys(boundingBoxes).length
        } boîtes englobantes pour les nœuds du cluster ${activeClusterId} dans le service de collision`
      );
    }
  };

  // Effet séparé pour nettoyer les ressources lors du démontage
  useEffect(() => {
    return () => {
      // Réinitialiser les boîtes englobantes des nœuds dans le service si nécessaire
      if (boxesRegisteredRef.current) {
        collisionService.registerNodeBoxes({}, collisionLayer);
        boxesRegisteredRef.current = false;
      }
    };
  }, [collisionService, collisionLayer]);

  // Fonction pour mettre à jour l'état du nœud actif en utilisant le service de collision
  const updateNodeState = () => {
    // Si aucun cluster n'est actif, ne rien faire
    if (!hasActiveClusterRef.current) {
      // Si on avait un nœud actif, le désactiver
      if (activeNodeId !== null) {
        setActiveNode(null, null, null);
      }
      return;
    }

    // Limiter la fréquence des mises à jour de détection
    const now = Date.now();
    if (now - lastCheckTimeRef.current < throttleTimeRef.current) {
      return;
    }
    lastCheckTimeRef.current = now;

    // Mettre à jour le point de détection dans le service de collision
    collisionService.calculateDetectionPoint(camera);

    // Utiliser le service de collision pour trouver le nœud contenant le point
    const containingNode = collisionService.findContainingNode();

    if (containingNode) {
      // Si le nœud actif est différent du nœud contenant le point
      if (activeNodeId !== containingNode.id) {
        // Obtenir les données complètes du nœud à partir de notre liste locale
        const nodeData =
          clusterNodes.find((node) => node.id === containingNode.id) || null;

        // Mettre à jour le nœud actif dans le store
        setActiveNode(containingNode.id, containingNode.name, nodeData);

        // Stocker les données du nœud actif pour référence
        activeNodeDataRef.current = {
          id: containingNode.id,
          name: containingNode.name,
          data: nodeData,
        };

        if (debug) {
          console.log(
            `Nœud actif via service: ${containingNode.id} (${containingNode.name})`
          );
        }
      }
    } else if (activeNodeId !== null) {
      // Si aucun nœud ne contient le point mais qu'un nœud est actif, le désactiver
      setActiveNode(null, null, null);
      activeNodeDataRef.current = null;

      if (debug) {
        console.log("Désactivation du nœud actif");
      }
    }

    // Recalculer régulièrement les boîtes englobantes pour tenir compte des changements
    // de position de caméra ou autres
    if (boxesRegisteredRef.current && clusterNodes.length > 0) {
      calculateAndRegisterBoundingBoxes(clusterNodes);
    }
  };

  // Utiliser useFrame pour suivre la position de la caméra à chaque frame
  useFrame(() => {
    // Mettre à jour l'état du nœud actif
    updateNodeState();
  });

  // Retourner les données utiles
  return {
    activeNodeId,
    nodeBoundingBoxes: lastBoundingBoxesRef.current,
  };
};

export default useNodeDetection;
