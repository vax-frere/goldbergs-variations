import React, { memo, useEffect, useMemo, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import useGameStore from "../../../../store";
import useCollisionStore, {
  CollisionLayers,
} from "../../../../services/CollisionService";
import { useInputs } from "../../../../components/AdvancedCameraController/inputManager";
import textContentService from "../../../../services/TextContentService";
import SvgPath from "../../../../components/SvgPath";
import VibSvgPath from "../../../../components/VibSvgPath";
import useAssets from "../../../../hooks/useAssets";

const DEFAULT_BOUNDING_BOX = {
  width: 20,
  height: 20,
  depth: 20,
};

// Composant générique pour les icônes de personnages (déplacé ici)
const CharacterIcon = memo(
  ({
    svgName,
    position,
    size = 300,
    onClick,
    persona,
    useVibration = false,
    vibrationIntensity = 0.2,
    vibrationSpeed = 1.5,
  }) => {
    const assets = useAssets({ autoInit: false });
    const setActiveLevel = useGameStore((state) => state.setActiveLevel);
    const groupRef = React.useRef();
    const [useFallback, setUseFallback] = React.useState(false);

    const handleClick = () => {
      if (persona) {
        setActiveLevel(persona);
        console.log("Active persona set:", persona);
      }
      if (onClick) onClick();
    };

    const handleSvgError = (err) => {
      console.error(`Erreur SVG ${svgName}:`, err);
      setUseFallback(true);
    };

    if (!assets.isReady) return null;

    if (useFallback) {
      return (
        <group ref={groupRef} onClick={handleClick} position={position}>
          <mesh>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="white" wireframe={true} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.7, 32, 16]} />
            <meshStandardMaterial color="white" wireframe={true} />
          </mesh>
        </group>
      );
    }

    // Utiliser directement le nom du fichier comme dans AssetLists.js
    const svgPath = `${svgName}.svg`;

    const SvgComponent = useVibration ? VibSvgPath : SvgPath;

    return (
      <group ref={groupRef} onClick={handleClick} position={position}>
        <SvgComponent
          svgPath={svgPath}
          size={size}
          color="white"
          lineWidth={2}
          isBillboard={true}
          vibrationIntensity={vibrationIntensity}
          vibrationSpeed={vibrationSpeed}
          onError={(err) => {
            console.error(
              `[InteractiveComponents] Erreur de chargement pour ${svgPath}:`,
              err
            );
            handleSvgError(err);
          }}
        />
      </group>
    );
  }
);

CharacterIcon.displayName = "CharacterIcon";

const InteractiveComponents = memo(({ objectsData }) => {
  const camera = useThree((state) => state.camera);
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
  const lastComponentId = React.useRef(null);

  // Mémoiser la création des boîtes de collision à partir des données brutes
  const componentBoxes = useMemo(() => {
    if (!objectsData?.length) return {};

    const boxes = {};
    objectsData.forEach((obj) => {
      const position = {
        x: obj.position?.[0] || 0,
        y: obj.position?.[1] || 0,
        z: obj.position?.[2] || 0,
      };

      // Utiliser les dimensions personnalisées ou les valeurs par défaut
      const dimensions = obj.boundingBox || DEFAULT_BOUNDING_BOX;
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
          id: obj.id,
          text: obj.text,
          position: obj.interactivePosition || obj.position,
          isInteractive: obj.isInteractive !== false, // Par défaut true sauf si explicitement false
          targetLevel: obj.targetLevel, // Ajouter le niveau cible s'il existe
          // Ajouter les données pour le TextContentService
          contentData: obj.contentData || null, // Données spécifiques pour le contenu
        },
      };

      boxes[obj.id] = box;
    });

    return boxes;
  }, [objectsData]);

  // Mémoiser la fonction de vérification des collisions
  const checkCollisions = useCallback(() => {
    if (!camera) return;

    calculateDetectionPoint(camera);
    const component = findContainingNode();

    if (component) {
      // Afficher le contenu textuel quand on entre dans une nouvelle collision
      if (lastComponentId.current !== component.data.id) {
        lastComponentId.current = component.data.id;

        // Toujours afficher le contenu textuel au hover (pour l'information)
        if (component.data.contentData) {
          // Si on a des données spécifiques pour le contenu
          textContentService.show({
            type: "simple",
            ...component.data.contentData,
            // Ajouter une propriété pour indiquer si c'est vraiment interactif
            isInteractive:
              component.data.isInteractive && !!component.data.targetLevel,
          });
        } else if (component.data.text) {
          // Sinon utiliser le texte simple
          textContentService.show({
            type: "simple",
            text: component.data.text,
            // Ajouter une propriété pour indiquer si c'est vraiment interactif
            isInteractive:
              component.data.isInteractive && !!component.data.targetLevel,
          });
        }
      }

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
        // Cacher le contenu du TextPanel
        textContentService.hide();
      }
    }
  }, [
    camera,
    calculateDetectionPoint,
    findContainingNode,
    inputs,
    setActiveLevel,
  ]);

  // Enregistrer les boîtes de collision
  useEffect(() => {
    if (!objectsData?.length) return;

    registerComponentBoxes(componentBoxes);
    setCollisionMask(CollisionLayers.CLUSTERS | CollisionLayers.NODES);

    return () => {
      registerComponentBoxes({});
      setCollisionMask(CollisionLayers.CLUSTERS);
      // Nettoyer le TextContentService au démontage
      textContentService.hide();
    };
  }, [
    componentBoxes,
    registerComponentBoxes,
    setCollisionMask,
    objectsData?.length,
  ]);

  // Utiliser useFrame au lieu de setInterval pour la détection des collisions
  useFrame(() => {
    checkCollisions();
  });

  return (
    <group>
      {objectsData?.map((obj) => (
        <group key={obj.id}>
          <CharacterIcon
            svgName={obj.svgName}
            position={obj.position}
            size={obj.size}
            useVibration={obj.useVibration}
            vibrationIntensity={obj.vibrationIntensity}
            vibrationSpeed={obj.vibrationSpeed}
            persona={obj.persona}
          />
        </group>
      ))}
    </group>
  );
});

InteractiveComponents.displayName = "InteractiveComponents";

export default InteractiveComponents;
