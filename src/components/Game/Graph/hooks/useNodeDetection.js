import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useGameStore from "../../../Game/store";

/**
 * Hook personnalisé pour détecter quand le point de détection entre dans la zone d'un nœud
 * Ce hook fonctionne uniquement quand un cluster est actif et en mode advanced
 */
const useNodeDetection = (nodes, options = {}) => {
  const {
    // Distance du point de détection devant la caméra
    detectionPointDistance = 50,
    // Taille de la boîte englobante autour de chaque nœud
    nodeBoundingBoxSize = 20,
    // Activer les logs de débogage
    debug = false,
  } = options;

  // Accéder à la caméra via useThree
  const { camera } = useThree();

  // Store Zustand pour le cluster actif et le nœud actif
  const { activeClusterId, activeNodeId, setActiveNode } = useGameStore();

  // Position du point de détection devant la caméra
  const detectionPointRef = useRef(new THREE.Vector3());

  // Stocker les boîtes englobantes des nœuds du cluster actif
  const nodeBoundingBoxesRef = useRef({});

  // Dernière vérification pour limiter la fréquence
  const lastCheckTimeRef = useRef(0);
  const throttleTimeRef = useRef(16); // Vérifier presque à chaque frame (60fps)

  // Pour détecter si un cluster est actif
  const hasActiveClusterRef = useRef(false);

  // Référence pour l'identification des frames
  const frameCountRef = useRef(0);

  // Vecteur directionnel temporaire pour calculs
  const directionVector = new THREE.Vector3();

  // Mettre à jour les boîtes englobantes des nœuds lorsque le cluster actif change
  useEffect(() => {
    // Vérifier si un cluster est actif
    const isClusterActive = activeClusterId !== null;
    hasActiveClusterRef.current = isClusterActive;

    // Si aucun cluster n'est actif ou s'il n'y a pas de nœuds, réinitialiser
    if (!isClusterActive || !nodes || nodes.length === 0) {
      nodeBoundingBoxesRef.current = {};
      return;
    }

    // Filtrer les nœuds appartenant au cluster actif
    const clusterNodes = nodes.filter(
      (node) =>
        node.cluster !== undefined &&
        String(node.cluster) === String(activeClusterId)
    );

    // Si aucun nœud dans ce cluster, réinitialiser
    if (clusterNodes.length === 0) {
      nodeBoundingBoxesRef.current = {};
      return;
    }

    // Calculer les boîtes englobantes pour chaque nœud
    const boundingBoxes = {};

    clusterNodes.forEach((node) => {
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
        node: node,
      };
    });

    nodeBoundingBoxesRef.current = boundingBoxes;

    if (debug) {
      console.log(
        `Calculé ${
          Object.keys(boundingBoxes).length
        } boîtes englobantes pour les nœuds du cluster ${activeClusterId}`
      );
    }
  }, [nodes, activeClusterId, nodeBoundingBoxSize, debug]);

  // Fonction pour calculer le point de détection devant la caméra
  const calculateDetectionPoint = (camera) => {
    // Récupérer la direction dans laquelle la caméra regarde
    directionVector.set(0, 0, -1).applyQuaternion(camera.quaternion);

    // Calculer le point à detectionPointDistance unités devant la caméra
    return new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(directionVector, detectionPointDistance);
  };

  // Fonction pour vérifier si un point est à l'intérieur d'une boîte englobante
  const isPointInBoundingBox = (point, box) => {
    return (
      point.x >= box.min.x &&
      point.x <= box.max.x &&
      point.y >= box.min.y &&
      point.y <= box.max.y &&
      point.z >= box.min.z &&
      point.z <= box.max.z
    );
  };

  // Fonction pour trouver le nœud dans lequel se trouve le point de détection
  const findContainingNode = () => {
    // Créer un vecteur THREE.js à partir du point de détection
    const point = new THREE.Vector3(
      detectionPointRef.current.x,
      detectionPointRef.current.y,
      detectionPointRef.current.z
    );

    let closestNode = null;
    let minDistance = Infinity;

    // Parcourir toutes les boîtes englobantes des nœuds
    Object.entries(nodeBoundingBoxesRef.current).forEach(([nodeId, box]) => {
      // Si le point est à l'intérieur de cette boîte
      if (isPointInBoundingBox(point, box)) {
        // Calculer la distance au centre pour départager en cas de chevauchement
        const distanceToCenter = point.distanceTo(
          new THREE.Vector3(box.center.x, box.center.y, box.center.z)
        );

        // Si c'est le premier nœud trouvé ou s'il est plus près que le précédent
        if (distanceToCenter < minDistance) {
          minDistance = distanceToCenter;
          closestNode = {
            id: nodeId,
            name: box.node.name || box.node.label || `Node ${nodeId}`,
            data: box.node,
            distance: distanceToCenter,
          };
        }
      }
    });

    return closestNode;
  };

  // Fonction pour mettre à jour l'état du nœud actif
  const updateNodeState = () => {
    // Si aucun cluster n'est actif, ne rien faire
    if (!hasActiveClusterRef.current) {
      // Si on avait un nœud actif, le désactiver
      if (activeNodeId !== null) {
        setActiveNode(null, null, null);
      }
      return;
    }

    const now = Date.now();

    // Limiter légèrement la fréquence des vérifications pour les performances
    if (now - lastCheckTimeRef.current < throttleTimeRef.current) {
      return;
    }

    // Mettre à jour le temps de dernière vérification
    lastCheckTimeRef.current = now;

    // Calculer le point de détection devant la caméra
    detectionPointRef.current.copy(calculateDetectionPoint(camera));

    // Trouver le nœud contenant le point
    const containingNode = findContainingNode();

    if (containingNode) {
      // Si le nœud actif est différent du nœud contenant le point
      if (activeNodeId !== containingNode.id) {
        setActiveNode(
          containingNode.id,
          containingNode.name,
          containingNode.data
        );

        if (debug) {
          console.log(
            `Nœud actif: ${containingNode.id} (${containingNode.name})`
          );
        }
      }
    } else if (activeNodeId !== null) {
      // Si aucun nœud ne contient le point mais qu'un nœud est actif, le désactiver
      setActiveNode(null, null, null);

      if (debug) {
        console.log("Désactivation du nœud actif");
      }
    }

    // Incrémenter le compteur de frames
    frameCountRef.current++;
  };

  // Utiliser useFrame pour suivre la position de la caméra à chaque frame
  useFrame(() => {
    // Mettre à jour l'état du nœud actif
    updateNodeState();
  });

  // Retourner l'ID du nœud actif
  return {
    activeNodeId,
    nodeBoundingBoxes: nodeBoundingBoxesRef.current,
  };
};

export default useNodeDetection;
