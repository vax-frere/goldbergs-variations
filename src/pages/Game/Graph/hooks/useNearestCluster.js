import { useState, useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useGameStore from "../../store";
import {
  calculateClusterBoundingBoxes,
  findMainNodeInCluster,
  calculateClusterCentroids,
} from "../utils";

/**
 * Hook pour détecter le cluster dans lequel se trouve un point devant la caméra
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Object} options - Options de configuration
 * @returns {Object} - Informations sur le cluster actif
 */
const useNearestCluster = (nodes, options = {}) => {
  const {
    // Distance du point de détection devant la caméra
    detectionPointDistance = 100,
    // Agrandissement des boîtes englobantes (en %)
    boundingBoxExpansion = 20, // Par défaut, ne pas étendre les boîtes englobantes
    // Distance maximale au centroïde avant désactivation du cluster
    maxDistanceToClusterCentroid = 300,
    // Activer les logs de débogage
    debug = false,
  } = options;

  // Accéder à la caméra via useThree
  const { camera } = useThree();

  // Référence pour stocker les boîtes englobantes calculées
  const boundingBoxesRef = useRef({});

  // Référence pour les noms des clusters et leurs slugs
  const clusterNamesRef = useRef({});
  const clusterSlugsRef = useRef({});

  // Référence pour les centroïdes des clusters
  const clusterCentroidsRef = useRef({});

  // Store Zustand pour le cluster actif et en hover
  const {
    activeClusterId,
    hoveredClusterId,
    setActiveCluster,
    setHoveredCluster,
  } = useGameStore();

  // Position du point de détection devant la caméra
  const detectionPointRef = useRef(new THREE.Vector3());

  // Dernière vérification pour limiter la fréquence
  const lastCheckTimeRef = useRef(0);
  const throttleTimeRef = useRef(16); // Vérifier presque à chaque frame (60fps)

  // Pour détecter si les boîtes englobantes ont été calculées
  const hasBoundingBoxesRef = useRef(false);

  // Référence pour l'identification des frames
  const frameCountRef = useRef(0);

  // Référence pour suivre l'état des touches pour l'activation
  const keyDownRef = useRef({});

  // Vecteur directionnel temporaire pour calculs
  const directionVector = new THREE.Vector3();

  // Observer les touches du clavier pour l'activation
  useEffect(() => {
    const handleKeyDown = (e) => {
      keyDownRef.current[e.code] = true;
    };

    const handleKeyUp = (e) => {
      keyDownRef.current[e.code] = false;
    };

    // Ajouter les écouteurs
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      // Nettoyer les écouteurs
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Mettre à jour les boîtes englobantes lorsque les nœuds changent
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      // Calculer les boîtes englobantes et extraire les noms des clusters
      const { boundingBoxes, clusterNames } = calculateClusterBoundingBoxes(
        nodes,
        true
      );

      // Calculer les centroïdes des clusters
      const { centroids } = calculateClusterCentroids(nodes, true);
      clusterCentroidsRef.current = centroids;

      // Stockage des slugs pour chaque cluster
      const clusterSlugs = {};

      // Pour chaque cluster, trouver le nœud principal et extraire son slug
      Object.entries(boundingBoxes).forEach(([clusterId, box]) => {
        if (box.nodes && box.nodes.length > 0) {
          const mainNode = findMainNodeInCluster(box.nodes);
          if (mainNode && mainNode.slug) {
            clusterSlugs[clusterId] = mainNode.slug;
          }
        }
      });

      // Expansion conditionnelle des boîtes englobantes
      if (boundingBoxExpansion > 0) {
        Object.values(boundingBoxes).forEach((box) => {
          const expandX = box.size.x * (boundingBoxExpansion / 100);
          const expandY = box.size.y * (boundingBoxExpansion / 100);
          const expandZ = box.size.z * (boundingBoxExpansion / 100);

          box.min.x -= expandX;
          box.min.y -= expandY;
          box.min.z -= expandZ;

          box.max.x += expandX;
          box.max.y += expandY;
          box.max.z += expandZ;

          // Recalculer le centre et la taille après expansion
          box.center = {
            x: (box.min.x + box.max.x) / 2,
            y: (box.min.y + box.max.y) / 2,
            z: (box.min.z + box.max.z) / 2,
          };

          box.size = {
            x: box.max.x - box.min.x,
            y: box.max.y - box.min.y,
            z: box.max.z - box.min.z,
          };
        });
      }

      boundingBoxesRef.current = boundingBoxes;
      clusterNamesRef.current = clusterNames;
      clusterSlugsRef.current = clusterSlugs;
      hasBoundingBoxesRef.current =
        Object.keys(boundingBoxesRef.current).length > 0;

      if (debug) {
        console.log("Boîtes englobantes calculées:", boundingBoxesRef.current);
        console.log("Noms des clusters:", clusterNamesRef.current);
        console.log("Centroïdes des clusters:", clusterCentroidsRef.current);
        console.log("Slugs des clusters:", clusterSlugsRef.current);
      }
    }
  }, [nodes, debug, boundingBoxExpansion]);

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

  // Fonction pour trouver le cluster dans lequel se trouve le point de détection
  const findContainingCluster = () => {
    // Créer un vecteur THREE.js à partir du point de détection
    const point = new THREE.Vector3(
      detectionPointRef.current.x,
      detectionPointRef.current.y,
      detectionPointRef.current.z
    );

    let containingCluster = null;

    // Parcourir toutes les boîtes englobantes
    Object.entries(boundingBoxesRef.current).forEach(([clusterId, box]) => {
      // Si le point est à l'intérieur de cette boîte
      if (isPointInBoundingBox(point, box)) {
        // Calculer la distance au centre pour départager en cas de chevauchement
        const distanceToCenter = point.distanceTo(
          new THREE.Vector3(box.center.x, box.center.y, box.center.z)
        );

        // Si c'est le premier cluster trouvé ou s'il est plus près du centre que le précédent
        if (
          !containingCluster ||
          distanceToCenter < containingCluster.distanceToCenter
        ) {
          containingCluster = {
            id: clusterId,
            name: clusterNamesRef.current[clusterId] || `Cluster ${clusterId}`,
            slug: clusterSlugsRef.current[clusterId] || null,
            box,
            distanceToCenter,
          };
        }
      }
    });

    return containingCluster;
  };

  // Vérifier si le bouton d'activation est pressé (touche T ou bouton X de la manette)
  const isActivationButtonPressed = () => {
    // Touche T du clavier
    const isKeyboardActivationPressed = keyDownRef.current["KeyT"] === true;

    // Bouton X de la manette (index 2 dans les gamepads)
    let isGamepadActivationPressed = false;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (gamepads[0]) {
      isGamepadActivationPressed = gamepads[0].buttons[2]?.pressed || false;
    }

    return isKeyboardActivationPressed || isGamepadActivationPressed;
  };

  // Fonction pour vérifier si la caméra est trop éloignée du centroïde du cluster actif
  const checkDistanceToActiveCluster = () => {
    if (!activeClusterId || !clusterCentroidsRef.current[activeClusterId]) {
      return false;
    }

    const centroid = clusterCentroidsRef.current[activeClusterId];
    const centroidPosition = new THREE.Vector3(
      centroid.x,
      centroid.y,
      centroid.z
    );
    const distance = camera.position.distanceTo(centroidPosition);

    if (debug) {
      console.log(`Distance au centroïde du cluster actif: ${distance}`);
    }

    // Si la distance est supérieure à la limite, désactiver le cluster
    if (distance > maxDistanceToClusterCentroid) {
      if (debug) {
        console.log(
          `Automatic cluster deactivation: distance (${distance}) > limit (${maxDistanceToClusterCentroid})`
        );
      }

      // Afficher un message dans le HUD si disponible
      if (window.__showHUDMessage) {
        window.__showHUDMessage("You are too far from the cluster", 3000);
      }

      return true;
    }

    return false;
  };

  // Fonction pour mettre à jour les états de hover et d'activation
  const updateClusterStates = () => {
    // Si aucune boîte englobante n'a été calculée, ne rien faire
    if (!hasBoundingBoxesRef.current) return;

    const now = Date.now();

    // Limiter légèrement la fréquence des vérifications pour les performances
    if (now - lastCheckTimeRef.current < throttleTimeRef.current) {
      return;
    }

    // Mettre à jour le temps de dernière vérification
    lastCheckTimeRef.current = now;

    // Si un cluster est actif, vérifier la distance et désactiver si nécessaire
    if (activeClusterId && checkDistanceToActiveCluster()) {
      setActiveCluster(null);
      return;
    }

    // Calculer le point de détection devant la caméra
    detectionPointRef.current.copy(calculateDetectionPoint(camera));

    // Trouver le cluster contenant le point
    const containingCluster = findContainingCluster();

    // Vérifier si un bouton d'activation est pressé
    const activationPressed = isActivationButtonPressed();

    // Mettre à jour l'état de hover
    if (containingCluster) {
      // Si on est sur un nouveau cluster en hover
      if (hoveredClusterId !== containingCluster.id) {
        setHoveredCluster(
          containingCluster.id,
          containingCluster.name,
          containingCluster.slug
        );

        if (debug) {
          console.log(
            `Cluster hovered: ${containingCluster.id}, name: ${containingCluster.name}`
          );
        }
      }

      // Si le bouton d'activation est pressé, activer ce cluster
      if (
        activationPressed &&
        hoveredClusterId === containingCluster.id &&
        activeClusterId !== containingCluster.id
      ) {
        setActiveCluster(
          containingCluster.id,
          containingCluster.name,
          containingCluster.slug
        );

        if (debug) {
          console.log(
            `Cluster activation by button: ${containingCluster.id}, slug: ${
              containingCluster.slug || "none"
            }`
          );
        }
      }
    } else {
      // Si on ne survole plus aucun cluster, désactiver le hover
      if (hoveredClusterId) {
        setHoveredCluster(null, null, null);

        if (debug) {
          console.log("Cluster hover deactivation");
        }
      }

      // Si la zone est vide et qu'on appuie sur le bouton d'activation, désactiver le cluster actif
      if (activationPressed && activeClusterId) {
        setActiveCluster(null, null, null);

        if (debug) {
          console.log("Active cluster deactivation by button");
        }
      }
    }

    // Incrémenter le compteur de frames
    frameCountRef.current++;
  };

  // Utiliser useFrame pour suivre la position de la caméra à chaque frame
  useFrame(() => {
    // Mettre à jour les états de cluster
    updateClusterStates();
  });

  // Retourner les ID des clusters et les informations sur les boîtes englobantes
  return {
    activeClusterId,
    hoveredClusterId,
    boundingBoxes: boundingBoxesRef.current,
    clusterNames: clusterNamesRef.current,
    clusterSlugs: clusterSlugsRef.current,
  };
};

export default useNearestCluster;
