import React, { memo, useEffect, useMemo, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import useSound from "use-sound";
import useGameStore from "../../store";
import useCollisionStore, {
  CollisionLayers,
} from "../../services/CollisionService";
import { useInputs } from "../../components/AdvancedCameraController/inputManager";

const DEFAULT_BOUNDING_BOX = {
  width: 20,
  height: 20,
  depth: 20,
};

const InteractiveComponents = memo(({ components }) => {
  const camera = useThree((state) => state.camera);
  const setActiveComponentText = useGameStore(
    (state) => state.setActiveComponentText
  );
  const setComponentInteractive = useGameStore(
    (state) => state.setComponentInteractive
  );
  const setActiveLevel = useGameStore((state) => state.setActiveLevel);
  const registerComponentBoxes = useCollisionStore(
    (state) => state.registerNodeBoxes
  );
  const findContainingNode = useCollisionStore(
    (state) => state.findContainingNode
  );
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);
  const inputs = useInputs();
  const prevInteract = React.useRef(false);
  const [playHoverSound] = useSound("/sounds/hover.mp3", { volume: 0.25 });
  const lastComponentId = React.useRef(null);

  // Mémoiser la création des boîtes de collision
  const componentBoxes = useMemo(() => {
    if (!components?.length) return {};

    const boxes = {};
    components.forEach((component) => {
      const position = {
        x: component.position?.[0] || 0,
        y: component.position?.[1] || 0,
        z: component.position?.[2] || 0,
      };

      // Utiliser les dimensions personnalisées ou les valeurs par défaut
      const dimensions = component.boundingBox || DEFAULT_BOUNDING_BOX;
      const halfWidth = dimensions.width / 2;
      const halfHeight = dimensions.height / 2;
      const halfDepth = dimensions.depth / 2;

      // Créer une boîte de collision personnalisée
      const box = {
        min: {
          x: position.x - halfWidth,
          y: position.y - halfHeight,
          z: position.z - halfDepth,
        },
        max: {
          x: position.x + halfWidth,
          y: position.y + halfHeight,
          z: position.z + halfDepth,
        },
        center: position,
        size: dimensions,
        layer: CollisionLayers.NODES,
        data: {
          id: component.id,
          text: component.text,
          position: component.position,
          isInteractive: component.isInteractive !== false, // Par défaut true sauf si explicitement false
          targetLevel: component.targetLevel, // Ajouter le niveau cible s'il existe
        },
      };

      boxes[component.id] = box;
    });

    return boxes;
  }, [components]);

  // Mémoiser la fonction de vérification des collisions
  const checkCollisions = useCallback(() => {
    if (!camera) return;

    calculateDetectionPoint(camera);
    const component = findContainingNode();

    if (component) {
      // Jouer le son uniquement quand on entre dans une nouvelle collision
      if (lastComponentId.current !== component.data.id) {
        playHoverSound();
        lastComponentId.current = component.data.id;
      }

      setActiveComponentText(component.data.text);
      // Ne définir l'interactivité que si le composant est marqué comme interactif
      setComponentInteractive(component.data.isInteractive !== false);

      // Détecter si l'action interact vient d'être déclenchée (front montant)
      const interactTriggered = inputs.interact && !prevInteract.current;
      prevInteract.current = inputs.interact;

      // Si l'action interact vient d'être déclenchée et qu'il y a un niveau cible
      if (interactTriggered && component.data.targetLevel) {
        setActiveLevel(component.data.targetLevel);
      }
    } else {
      if (lastComponentId.current !== null) {
        lastComponentId.current = null;
      }
      setActiveComponentText(null);
      setComponentInteractive(false);
    }
  }, [
    camera,
    calculateDetectionPoint,
    findContainingNode,
    setActiveComponentText,
    setComponentInteractive,
    inputs,
    setActiveLevel,
    playHoverSound,
  ]);

  // Enregistrer les boîtes de collision
  useEffect(() => {
    if (!components?.length) return;

    registerComponentBoxes(componentBoxes);
    setCollisionMask(CollisionLayers.CLUSTERS | CollisionLayers.NODES);

    return () => {
      registerComponentBoxes({});
      setCollisionMask(CollisionLayers.CLUSTERS);
    };
  }, [
    componentBoxes,
    registerComponentBoxes,
    setCollisionMask,
    components?.length,
  ]);

  // Utiliser useFrame au lieu de setInterval pour la détection des collisions
  useFrame(() => {
    checkCollisions();
  });

  return (
    <group>
      {components?.map((component) => (
        <group key={component.id}>{component.element}</group>
      ))}
    </group>
  );
});

export default InteractiveComponents;
