import { useState, useEffect, useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useGameStore from "../../store";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";
import { getInputManager } from "../../AdvancedCameraController/inputManager";

/**
 * Hook personnalisé pour gérer la détection de collision centralisée.
 * Ce hook est responsable uniquement de la détection des éléments survolés,
 * mais n'effectue pas l'activation des éléments (déplacé vers le composant Graph).
 */
const useCollisionDetection = (options = {}) => {
  // Extraire les options avec des valeurs par défaut
  const {
    debug = false,
    enabled = true,
    detectClusters = true,
    detectNodes = true,
    detectInteractiveElements = true,
    enabledLayers = [],
    clusterOptions = {},
    nodeOptions = {},
    interactiveElementOptions = {},
  } = options;

  // Mémoiser les options pour éviter les re-rendus inutiles
  const memoizedOptions = useRef({
    debug,
    enabled,
    detectClusters,
    detectNodes,
    detectInteractiveElements,
    enabledLayers,
    clusterOptions,
    nodeOptions,
    interactiveElementOptions,
  }).current;

  // Accéder à la caméra via useThree
  const { camera } = useThree();

  // Accéder au service de collision centralisé
  const collisionService = useCollisionStore();

  // Référence pour suivre la configuration
  const collisionConfigRef = useRef({
    initialized: false,
    clusters: false,
    nodes: false,
    interactive: false,
    debug: false,
  });

  // Store Zustand pour l'état du jeu
  const {
    hoveredClusterId,
    setHoveredCluster,
    activeClusterId,
    setActiveCluster,
    activeNodeId,
    setActiveNode,
    activeInteractiveElementId,
    setActiveInteractiveElement,
  } = useGameStore();

  // Référence pour l'état actuel (pour éviter les captures de fermeture)
  const stateRef = useRef({
    hoveredClusterId,
    activeClusterId,
    activeNodeId,
    activeInteractiveElementId,
    isColliding: false,
    lastUpdateTime: 0,
    throttleTime: 100, // 10 fois par seconde
  });

  // Mettre à jour la référence lorsque l'état change
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      hoveredClusterId,
      activeClusterId,
      activeNodeId,
      activeInteractiveElementId,
    };
  }, [
    hoveredClusterId,
    activeClusterId,
    activeNodeId,
    activeInteractiveElementId,
  ]);

  // Pour les statistiques de performance
  const frameRef = useRef({
    frameCount: 0,
    lastUpdateFrame: 0,
    collisionChecks: 0,
    collisionsDetected: 0,
  });

  // Configurer le service de collision avec les options fournies
  useEffect(() => {
    // Ne configurer que si l'état a changé pour éviter les boucles infinies
    if (
      collisionConfigRef.current.clusters !== memoizedOptions.detectClusters ||
      collisionConfigRef.current.nodes !== memoizedOptions.detectNodes ||
      collisionConfigRef.current.interactive !==
        memoizedOptions.detectInteractiveElements ||
      collisionConfigRef.current.debug !== memoizedOptions.debug ||
      !collisionConfigRef.current.initialized
    ) {
      // Configurer les types de collision
      collisionService.setCollisionTypeEnabled("clusters", detectClusters);
      collisionService.setCollisionTypeEnabled("nodes", detectNodes);
      collisionService.setCollisionTypeEnabled(
        "interactiveElements",
        detectInteractiveElements
      );

      // Configurer le masque global si des couches sont spécifiées
      if (enabledLayers && enabledLayers.length > 0) {
        collisionService.setGlobalMask(enabledLayers);
      }

      // Activer le mode debug si demandé
      if (memoizedOptions.debug !== collisionConfigRef.current.debug) {
        collisionService.setDebugMode(memoizedOptions.debug);
      }

      // Marquer comme initialisé
      collisionConfigRef.current = {
        initialized: true,
        clusters: memoizedOptions.detectClusters,
        nodes: memoizedOptions.detectNodes,
        interactive: memoizedOptions.detectInteractiveElements,
        debug: memoizedOptions.debug,
      };

      console.log("CollisionDetection: Layers configurés", {
        clusters: detectClusters,
        nodes: detectNodes,
        interactive: detectInteractiveElements,
        enabledLayers: enabledLayers,
      });
    }

    // Nettoyer au démontage
    return () => {
      if (collisionConfigRef.current.initialized) {
        // Ne pas réinitialiser les couches, d'autres composants pourraient les utiliser
        // Mais on pourrait désactiver des types spécifiques si nécessaire
      }
    };
  }, [memoizedOptions, collisionService]);

  // Fonctions optimisées pour les mises à jour d'état
  const updateHoveredCluster = useCallback(
    (id, name) => {
      if (stateRef.current.hoveredClusterId !== id) {
        setHoveredCluster(id, name);
        // Mettre à jour le flag de collision
        stateRef.current.isColliding = id !== null;
      }
    },
    [setHoveredCluster]
  );

  const updateActiveCluster = useCallback(
    (id, name) => {
      if (stateRef.current.activeClusterId !== id) {
        setActiveCluster(id, name);
        // Mettre à jour le flag de collision
        stateRef.current.isColliding = id !== null;
      }
    },
    [setActiveCluster]
  );

  const updateActiveNode = useCallback(
    (id, name, data) => {
      if (stateRef.current.activeNodeId !== id) {
        setActiveNode(id, name, data);
        // Mettre à jour le flag de collision
        stateRef.current.isColliding = id !== null;
      }
    },
    [setActiveNode]
  );

  const updateActiveInteractiveElement = useCallback(
    (id, name, description) => {
      if (stateRef.current.activeInteractiveElementId !== id) {
        setActiveInteractiveElement(id, name, description);
        // Mettre à jour le flag de collision
        stateRef.current.isColliding = id !== null;
      }
    },
    [setActiveInteractiveElement]
  );

  // Fonction pour vérifier si on peut mettre à jour (pour throttling manuel)
  const canUpdate = useCallback(() => {
    const now = Date.now();
    const elapsed = now - stateRef.current.lastUpdateTime;

    if (elapsed >= stateRef.current.throttleTime) {
      stateRef.current.lastUpdateTime = now;
      return true;
    }

    return false;
  }, []);

  // Récupérer le vecteur de performance pour la régression
  const regress = useThree((state) => state.performance?.regress);

  // Fonction principale de détection optimisée
  const detectCollisions = useCallback(() => {
    if (!enabled) return;

    // Incrémenter le compteur de frames
    frameRef.current.frameCount++;

    // Throttling manuel pour réduire les mises à jour
    if (!canUpdate()) return;

    // Calculer le point de détection devant la caméra
    collisionService.calculateDetectionPoint(camera);

    // Extraction des valeurs actuelles pour éviter de créer des captures dans les fonctions anonymes
    const currentState = stateRef.current;
    const currentActiveClusterId = currentState.activeClusterId;
    const hasActiveClusterCurrently = currentActiveClusterId !== null;

    // Flag pour suivre si une collision a été détectée
    let hasCollision = false;

    // 1. Détecter les clusters si demandé et qu'aucun cluster n'est actif
    if (memoizedOptions.detectClusters && !hasActiveClusterCurrently) {
      frameRef.current.collisionChecks++;
      const containingCluster = collisionService.findContainingCluster();

      // Mettre à jour le cluster survolé
      if (containingCluster) {
        hasCollision = true;
        frameRef.current.collisionsDetected++;

        if (currentState.hoveredClusterId !== containingCluster.id) {
          updateHoveredCluster(containingCluster.id, containingCluster.name);
        }
      } else if (currentState.hoveredClusterId !== null) {
        updateHoveredCluster(null, null);
      }

      // La logique d'activation a été retirée d'ici et déplacée vers le composant Graph
    }

    // 2. Détecter les nœuds si un cluster est actif et que detectNodes est activé
    if (memoizedOptions.detectNodes && hasActiveClusterCurrently) {
      frameRef.current.collisionChecks++;
      const containingNode = collisionService.findContainingNode();

      // Mettre à jour le nœud actif
      if (containingNode) {
        hasCollision = true;
        frameRef.current.collisionsDetected++;

        if (currentState.activeNodeId !== containingNode.id) {
          updateActiveNode(
            containingNode.id,
            containingNode.name,
            containingNode.data
          );
        }
      } else if (currentState.activeNodeId !== null) {
        updateActiveNode(null, null, null);
      }
    }

    // 3. Détecter les éléments interactifs si demandé et qu'aucun cluster n'est actif
    if (
      memoizedOptions.detectInteractiveElements &&
      !hasActiveClusterCurrently
    ) {
      frameRef.current.collisionChecks++;
      const containingElement =
        collisionService.findContainingInteractiveElement();

      // Mettre à jour l'élément interactif actif
      if (containingElement) {
        hasCollision = true;
        frameRef.current.collisionsDetected++;

        if (currentState.activeInteractiveElementId !== containingElement.id) {
          updateActiveInteractiveElement(
            containingElement.id,
            containingElement.name,
            containingElement.description
          );
        }
      } else if (currentState.activeInteractiveElementId !== null) {
        updateActiveInteractiveElement(null, null, null);
      }
    }

    // Appeler regress() si une collision est détectée pour réduire la qualité de rendu
    if (hasCollision && regress) {
      regress();
    }

    // Mettre à jour le flag de collision
    stateRef.current.isColliding = hasCollision;

    // Mémoriser le dernier frame où on a effectué une mise à jour
    frameRef.current.lastUpdateFrame = frameRef.current.frameCount;
  }, [
    memoizedOptions,
    canUpdate,
    camera,
    collisionService,
    regress,
    updateHoveredCluster,
    updateActiveCluster,
    updateActiveNode,
    updateActiveInteractiveElement,
    enabled,
  ]);

  // Utiliser useFrame au lieu de setDetectionCallback
  // cela évite l'erreur car setDetectionCallback n'existe pas dans le service
  useFrame(() => {
    detectCollisions();
  });

  // Retourner les IDs actifs et des méthodes pour gérer la détection de collision
  return {
    hoveredClusterId,
    activeClusterId,
    activeNodeId,
    activeInteractiveElementId,
    registerClusterBoxes: collisionService.registerClusterBoxes,
    registerNodeBoxes: collisionService.registerNodeBoxes,
    registerInteractiveElementBoxes:
      collisionService.registerInteractiveElementBoxes,
    detectCollisions,
    findContainingCluster: collisionService.findContainingCluster,
    findContainingNode: collisionService.findContainingNode,
    findContainingInteractiveElement:
      collisionService.findContainingInteractiveElement,
    setLayerEnabled: collisionService.setLayerEnabled,
  };
};

export default useCollisionDetection;
