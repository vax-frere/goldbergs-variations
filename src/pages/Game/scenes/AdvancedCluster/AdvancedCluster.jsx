import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../hooks/useAssets";
import useGameStore, { useActiveLevel } from "../../store";
import { findClusterIdBySlug } from "../WorldLevel/components/Graph/utils/utils";
import AdvancedNode from "./components/AdvancedNode";
import AdvancedLink from "./components/AdvancedLinkAlt";
import AdvancedVibLink from "./components/AdvancedVibLink";
import PersonaPortrait from "./components/PersonaPortrait";
import BoundingBoxHelper from "./components/BoundingBoxHelper";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";
import textContentService from "../../services/TextContentService";
import useEffectStore from "../../services/EffectService";
import AdvancedLinkAlt from "./components/AdvancedLinkAlt";

const BOUNDING_BOX_MARGIN = 500; // Marge autour de la bounding box
const WARNING_DISTANCE = 300; // Distance à laquelle afficher l'avertissement

/**
 * Composant AdvancedCluster - Affiche un cluster en mode avancé
 * Charge uniquement les nœuds et liens du cluster sélectionné
 */
const AdvancedCluster = memo(() => {
  const activeLevel = useActiveLevel();
  const assets = useAssets({ autoInit: false });
  const returnToWorld = useGameStore((state) => state.returnToWorld);
  const registerNodeBoxes = useCollisionStore(
    (state) => state.registerNodeBoxes
  );
  const findContainingNode = useCollisionStore(
    (state) => state.findContainingNode
  );
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);
  const triggerVibRibbonEffect = useEffectStore(
    (state) => state.triggerVibRibbonEffect
  );
  const stopEffect = useEffectStore((state) => state.stopEffect);
  const camera = useThree((state) => state.camera);
  const lastTouchedNodeRef = useRef(null);
  const activeNodeRef = useRef(null); // Pour tracker le nœud actif localement
  const activeEffectIdRef = useRef(null); // Pour tracker l'effet actif et pouvoir l'arrêter
  const setShowExitWarning = useGameStore((state) => state.setShowExitWarning); // Utiliser le store

  // Récupérer l'état debug du store
  const debugMode = useGameStore((state) => state.debug);

  // Option pour activer la vibration des liens (peut être contrôlée par un paramètre ou un état)
  const useVibrationLinks = true; // Activé par défaut pour tester

  // Données du cluster à afficher
  const clusterData = useMemo(() => {
    if (!activeLevel || !assets.isReady) {
      console.log("AdvancedCluster: Pas de activeLevel ou assets pas prêts", {
        activeLevel,
        assetsReady: assets.isReady,
      });
      return null;
    }

    // Récupérer les données complètes du graphe
    const graphData = assets.getData("graph");
    if (!graphData) {
      console.log("AdvancedCluster: Pas de données de graphe");
      return null;
    }

    // Identifier le cluster à afficher en utilisant l'utilitaire
    const clusterInfo = findClusterIdBySlug(
      graphData.nodes,
      activeLevel.id // On utilise le slug stocké dans id
    );

    if (!clusterInfo) {
      console.log("AdvancedCluster: Impossible de trouver le cluster", {
        activeLevel,
      });
      return null;
    }

    // Filtrer les liens internes au cluster
    const nodeIds = new Set(clusterInfo.clusterNodes.map((node) => node.id));
    const clusterLinks = graphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return {
      clusterId: clusterInfo.clusterId,
      nodes: clusterInfo.clusterNodes,
      links: clusterLinks,
      mainNode: clusterInfo.mainNode,
    };
  }, [activeLevel, assets.isReady, assets.getData]);

  // Créer un map des nœuds pour accéder rapidement par ID
  const nodeMap = useMemo(() => {
    if (!clusterData) return new Map();

    const map = new Map();
    clusterData.nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [clusterData]);

  // Enregistrer les boîtes de collision des nœuds
  useEffect(() => {
    if (!clusterData?.nodes) return;

    // DEBUG: Voir ce que contiennent les nœuds
    console.log(
      "[AdvancedCluster] Nodes data:",
      clusterData.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        nodeId: node.nodeId,
        clusterId: node.clusterId,
        hasNodeId: !!node.nodeId,
      }))
    );

    const nodeBoxes = {};
    clusterData.nodes.forEach((node, index) => {
      const box = useCollisionStore
        .getState()
        .createBoundingBox(
          { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
          20,
          CollisionLayers.NODES
        );

      // CORRECTION: Utiliser l'ID du nœud comme clé unique (pas le slug qui est identique pour tous)
      const nodeKey = String(node.id); // L'ID est unique pour chaque nœud

      box.data = {
        ...node,
        nodeKey: nodeKey, // La clé unique utilisée pour cette boîte
        originalNodeId: node.nodeId, // Le nodeId original
        individualId: node.id, // L'ID individuel du nœud
      };

      // Utiliser l'ID comme clé unique
      nodeBoxes[nodeKey] = box;

      console.log(`[AdvancedCluster] Registering node box: ${nodeKey}`, {
        nodeId: node.id,
        nodeName: node.name,
        nodeIdProperty: node.nodeId,
        nodeKey: nodeKey,
        clusterId: node.clusterId,
      });
    });

    registerNodeBoxes(nodeBoxes);
    setCollisionMask(CollisionLayers.NODES);

    return () => {
      registerNodeBoxes({});
      setCollisionMask(CollisionLayers.CLUSTERS);
      // Nettoyer le TextContentService au démontage
      textContentService.hide();
      // Nettoyer l'état d'avertissement de sortie
      setShowExitWarning(false);
    };
  }, [
    clusterData,
    registerNodeBoxes,
    setCollisionMask,
    camera,
    setShowExitWarning,
  ]);

  // Fonction mémorisée pour vérifier les collisions
  const checkCollisions = useMemo(() => {
    return () => {
      if (!camera) return;

      // Calculer le point de détection devant la caméra
      calculateDetectionPoint(camera);

      // Trouver le nœud en collision
      const node = findContainingNode();
      if (node) {
        // CORRECTION: Utiliser l'ID du nœud comme clé unique
        const nodeKey = String(node.data.individualId || node.data.id);
        const nodeName = node.data.name || nodeKey;

        console.log(`[AdvancedCluster] Node collision detected:`, {
          nodeId: node.id, // Clé de la boîte de collision (devrait être nodeKey)
          nodeKey: nodeKey, // Clé unique (ID du nœud)
          originalNodeId: node.data.originalNodeId, // NodeId original
          nodeName: nodeName,
          individualId: node.data.individualId,
        });

        // Afficher le contenu uniquement si on touche un nouveau nœud
        if (lastTouchedNodeRef.current !== nodeKey) {
          lastTouchedNodeRef.current = nodeKey;

          // Arrêter l'effet précédent s'il existe
          if (activeEffectIdRef.current) {
            stopEffect(activeEffectIdRef.current);
            activeEffectIdRef.current = null;
          }

          // MODERNE: Déclencher l'effet visuel de collision avec l'API spécialisée
          const nodePosition = {
            x: node.data.x || 0,
            y: node.data.y || 0,
            z: node.data.z || 0,
          };

          console.log(
            `[AdvancedCluster] Déclenchement effet Vib Ribbon à la position:`,
            nodePosition
          );

          // Configuration par défaut du Vib Ribbon (plus fancy)
          const vibRibbonEffectConfig = {
            duration: 0.4, // Retour à la durée par défaut
            maxScale: 3.0, // Retour à l'échelle par défaut
            color: [1.0, 1.0, 1.0], // Blanc pur
            opacity: 0.8, // Retour à l'opacité par défaut
            rayCount: 12, // 12 rayons comme par défaut (plus fancy)
            rayLength: 1.0, // Retour à la longueur par défaut
            rayWidth: 0.1, // Retour à la largeur par défaut
            rayInnerRadius: 3.6, // Retour au rayon intérieur par défaut
            animationOffset: 0.3, // Retour au décalage par défaut
            randomFactor: 0.5, // Plus de random comme par défaut
            randomSeed: Math.random(), // Seed aléatoire pour variation
          };

          activeEffectIdRef.current = triggerVibRibbonEffect(
            nodePosition,
            vibRibbonEffectConfig,
            // Callback de fin d'effet
            () => {
              console.log(`[AdvancedCluster] Effet Vib Ribbon terminé`);
              activeEffectIdRef.current = null;
            }
          );

          console.log(
            `[AdvancedCluster] Effet Vib Ribbon créé avec ID:`,
            activeEffectIdRef.current
          );

          // Utiliser le TextContentService avec le nodeId sémantique pour avoir les infos complètes
          const semanticNodeId = node.data.originalNodeId || nodeKey;

          // MODIFICATION: Déterminer le type selon le type de nœud
          const contentType =
            node.data.type === "platform" ? "platform" : "detailed";

          textContentService.show({
            type: contentType,
            id: semanticNodeId, // Utiliser le nodeId sémantique
            fallbackText: `Nœud: ${nodeName}`,
          });

          console.log(
            `[AdvancedCluster] TextContentService called with semanticNodeId: ${semanticNodeId}, type: ${contentType}`
          );
        }

        // Mettre à jour la référence locale pour l'effet visuel
        activeNodeRef.current = nodeKey;

        // Marquer le nœud comme visité en passant les données complètes
        const state = useGameStore.getState();
        state.markNodeAsVisited(nodeKey, nodeName, node.data);
      } else {
        if (lastTouchedNodeRef.current !== null) {
          lastTouchedNodeRef.current = null;
          activeNodeRef.current = null;

          // Arrêter l'effet quand on sort du nœud
          if (activeEffectIdRef.current) {
            stopEffect(activeEffectIdRef.current);
            activeEffectIdRef.current = null;
          }

          // Cacher le contenu du TextPanel
          textContentService.hide();
        }
      }
    };
  }, [
    camera,
    calculateDetectionPoint,
    findContainingNode,
    triggerVibRibbonEffect,
    stopEffect,
  ]);

  // Utiliser useFrame au lieu de setInterval pour la détection des collisions
  useFrame(() => {
    checkCollisions();
  });

  // Gestion des touches pour retourner au monde
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Escape") {
        returnToWorld();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [returnToWorld]);

  // Cleanup des effets au démontage du composant
  useEffect(() => {
    return () => {
      if (activeEffectIdRef.current) {
        stopEffect(activeEffectIdRef.current);
        activeEffectIdRef.current = null;
      }
    };
  }, [stopEffect]);

  // Vérifier si la caméra sort des limites du cluster
  useFrame(() => {
    if (!camera || !clusterData?.nodes) return;

    const checkBounds = () => {
      // Calculer la bounding box du cluster
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      clusterData.nodes.forEach((node) => {
        const x = node.x || 0;
        const y = node.y || 0;
        const z = node.z || 0;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      });

      // Limites avec marge complète (sortie automatique)
      const exitMinX = minX - BOUNDING_BOX_MARGIN;
      const exitMaxX = maxX + BOUNDING_BOX_MARGIN;
      const exitMinY = minY - BOUNDING_BOX_MARGIN;
      const exitMaxY = maxY + BOUNDING_BOX_MARGIN;
      const exitMinZ = minZ - BOUNDING_BOX_MARGIN;
      const exitMaxZ = maxZ + BOUNDING_BOX_MARGIN;

      // Limites avec marge réduite (avertissement)
      const warningMinX = minX - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);
      const warningMaxX = maxX + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);
      const warningMinY = minY - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);
      const warningMaxY = maxY + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);
      const warningMinZ = minZ - (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);
      const warningMaxZ = maxZ + (BOUNDING_BOX_MARGIN - WARNING_DISTANCE);

      const pos = camera.position;

      // Vérifier si la caméra est dans la zone d'avertissement
      const isInWarningZone =
        pos.x < warningMinX ||
        pos.x > warningMaxX ||
        pos.y < warningMinY ||
        pos.y > warningMaxY ||
        pos.z < warningMinZ ||
        pos.z > warningMaxZ;

      // Vérifier si la caméra est complètement sortie
      const isOutOfBounds =
        pos.x < exitMinX ||
        pos.x > exitMaxX ||
        pos.y < exitMinY ||
        pos.y > exitMaxY ||
        pos.z < exitMinZ ||
        pos.z > exitMaxZ;

      // Gérer l'affichage de l'avertissement
      const currentShowExitWarning = useGameStore.getState().showExitWarning;
      if (isInWarningZone && !currentShowExitWarning) {
        setShowExitWarning(true);
      } else if (!isInWarningZone && currentShowExitWarning) {
        setShowExitWarning(false);
      }

      // Sortie automatique si complètement hors limites
      if (isOutOfBounds) {
        console.log("Camera out of bounds, returning to world");
        setShowExitWarning(false); // Cacher l'avertissement avant de sortir
        returnToWorld();
      }
    };

    checkBounds();
  });

  // Si pas de données, ne rien afficher
  if (!clusterData) {
    return null;
  }

  return (
    <group>
      {/* Helper pour visualiser les limites du cluster */}
      <BoundingBoxHelper nodes={clusterData.nodes} showHelper={debugMode} />

      {/* Éclairage spécifique pour le mode avancé */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />

      {/* Liens du cluster */}
      {clusterData.links.map((link, index) => {
        const source = nodeMap.get(
          typeof link.source === "object" ? link.source.id : link.source
        );
        const target = nodeMap.get(
          typeof link.target === "object" ? link.target.id : link.target
        );

        if (!source || !target) return null;

        if (useVibrationLinks) {
          return (
            <AdvancedVibLink
              key={`advanced-vib-link-${index}`}
              sourceNode={source}
              targetNode={target}
              isDirect={link.isDirect === "Direct"}
            />
          );
        } else {
          return (
            <AdvancedLink
              key={`advanced-link-${index}`}
              sourceNode={source}
              targetNode={target}
              isDirect={link.isDirect === "Direct"}
              linkColor={link.color || "#ffffff"}
              textBackgroundColor="rgba(0,0,0,0.2)"
              relationType={link.type || "relation"}
            />
          );
        }
      })}

      {/* Nœuds du cluster */}
      {clusterData.nodes.map((node) => {
        // CORRECTION: Utiliser l'ID du nœud comme clé unique
        const nodeKey = String(node.id);
        
        // Debug log pour voir tous les nœuds
        console.log("[AdvancedCluster] Rendering node:", {
          id: node.id,
          name: node.name,
          type: node.type,
          nodeKey: nodeKey
        });
        
        return (
          <AdvancedNode
            key={`advanced-node-${node.id}`}
            node={node}
            isActive={activeNodeRef.current === nodeKey}
          />
        );
      })}

      {/* Persona portrait */}
      <PersonaPortrait clusterId={clusterData.clusterId} assets={assets} />
    </group>
  );
});

export default AdvancedCluster;
