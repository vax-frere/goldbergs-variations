import React, { useState, useEffect, useRef, useMemo } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import useGameStore from "../store";
import { useFrame, useThree } from "@react-three/fiber";
import SvgPath from "./SvgPath";
import useAssets from "../../../hooks/useAssets";
import useCollisionStore, {
  CollisionLayers,
} from "../services/CollisionService";

/**
 * Composant affichant une image interactive qui peut déclencher le TextPanel
 * avec une bounding box pour la détection d'interaction
 * Utilise le système de collision centralisé
 */
const InteractiveImage = ({
  id,
  svgPath,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 300,
  title = "Joshua Goldberg",
  description = "Interactive element in the data universe",
  boundingBoxSize = 200,
  showBoundingBox = false, // Option pour afficher la boîte englobante (debug)
}) => {
  const { camera } = useThree();
  const groupRef = useRef();

  // Utiliser notre service d'assets
  const assets = useAssets();

  // Accéder au service de collision centralisé
  const collisionService = useCollisionStore();

  // Utiliser les fonctions et états du store dédiés aux éléments interactifs
  const setActiveInteractiveElement = useGameStore(
    (state) => state.setActiveInteractiveElement
  );
  const activeInteractiveElementId = useGameStore(
    (state) => state.activeInteractiveElementId
  );
  const activeClusterId = useGameStore((state) => state.activeClusterId);

  // État pour savoir si cet élément est actuellement actif
  const isActive = activeInteractiveElementId === id;

  // Référence pour le dernier état d'activation
  const lastActiveStateRef = useRef(false);

  // Référence pour la dernière vérification
  const lastCheckTimeRef = useRef(0);
  const throttleTimeRef = useRef(100); // 100ms entre les vérifications

  // Référence pour le dernier état connu de la bounding box
  const boundingBoxRef = useRef(null);

  // Référence pour le dernier ID
  const idRef = useRef(id);

  // Demi-taille de la bounding box
  const halfSize = boundingBoxSize / 2;

  // Définir les limites de la bounding box
  const boundingBox = useMemo(() => {
    const box = {
      min: {
        x: position[0] - halfSize,
        y: position[1] - halfSize,
        z: position[2] - halfSize,
      },
      max: {
        x: position[0] + halfSize,
        y: position[1] + halfSize,
        z: position[2] + halfSize,
      },
      center: {
        x: position[0],
        y: position[1],
        z: position[2],
      },
      id,
      name: title,
      data: { id, title, description },
      layer: CollisionLayers.INTERACTIVE,
    };

    // Mettre à jour la référence pour usage dans les effets
    boundingBoxRef.current = box;
    idRef.current = id;

    return box;
  }, [position, halfSize, id, title, description]);

  // Enregistrer cette image dans le service de collision
  useEffect(() => {
    // Obtenir les références locales (pour éviter les dépendances)
    const currentId = idRef.current;
    const currentBox = boundingBoxRef.current;
    const debug = collisionService.debugMode;

    // Enregistrer la boîte englobante dans le service de collision
    collisionService.registerInteractiveElement(currentId, currentBox);

    if (debug) {
      console.log(
        `InteractiveImage: registered element ${currentId} in collision service`
      );
    }

    // Nettoyer lors du démontage
    return () => {
      // Supprimer la boîte englobante du service de collision
      collisionService.unregisterInteractiveElement(currentId);

      // Si cet élément est actif lors du démontage, le désactiver
      if (activeInteractiveElementId === currentId) {
        setActiveInteractiveElement(null, null, null);
      }
    };
  }, [position, size]); // Dépendances minimales: uniquement quand position ou taille change

  // Fonction pour mettre à jour l'état d'activation à l'aide du service de collision
  const updateActivationState = () => {
    // Ne pas faire la détection si un cluster est actif
    if (activeClusterId !== null) {
      if (isActive) {
        setActiveInteractiveElement(null, null, null);
      }
      return;
    }

    // Limiter la fréquence des vérifications
    const now = Date.now();
    if (now - lastCheckTimeRef.current < throttleTimeRef.current) {
      return;
    }
    lastCheckTimeRef.current = now;

    // Utiliser le service de collision pour calculer le point de détection
    collisionService.calculateDetectionPoint(camera);

    // Vérifier si l'élément interactif contient le point de détection
    const containingElement =
      collisionService.findContainingInteractiveElement();

    // Vérifier si cet élément contient le point
    const isPointInThisElement =
      containingElement && containingElement.id === id;

    // Mettre à jour seulement si l'état a changé
    if (isPointInThisElement !== lastActiveStateRef.current) {
      lastActiveStateRef.current = isPointInThisElement;

      if (isPointInThisElement) {
        // Préparer les données de l'élément pour le store
        const elementData = {
          id,
          title,
          description,
        };

        // Activer l'élément interactif
        setActiveInteractiveElement(id, "image", elementData);
      } else if (isActive) {
        // Désactiver l'élément seulement si c'est celui-ci qui est actif
        setActiveInteractiveElement(null, null, null);
      }
    }
  };

  // Mettre à jour l'état à chaque frame
  useFrame(() => {
    if (!assets.isReady) return;
    updateActivationState();
  });

  // Si le service d'assets n'est pas prêt, ne rien afficher
  if (!assets.isReady) {
    return null;
  }

  // Récupérer le chemin de l'image SVG depuis le service d'assets si nécessaire
  const resolvedSvgPath = assets.getImagePath(svgPath) || svgPath;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Image SVG */}
      <SvgPath
        svgPath={resolvedSvgPath}
        size={size}
        position={[0, 0, 0]}
        isBillboard={false}
        opacity={1}
        color={isActive ? "#white" : "white"} // Changer la couleur quand actif
        lineWidth={isActive ? 3 : 2} // Ligne plus épaisse quand actif
      />

      {/* Les boîtes englobantes sont maintenant gérées par CollisionDebugRenderer */}
    </group>
  );
};

export default InteractiveImage;
