import React, { memo, useEffect, useMemo, useCallback, useRef } from "react";
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
import useAudioManager from "../../../../services/AudioManager";
import useAudioFragment from "../../../../hooks/useAudioFragment";
import { useRetroWindowService } from "../../../../services/RetroWindowService";

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

    // Reset fallback state on svgName change (hot reload)
    React.useEffect(() => {
      setUseFallback(false);
    }, [svgName]);

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
          key={`${svgPath}-${useVibration ? "vib" : "static"}`} // Force re-render on hot reload
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

const InteractiveComponents = memo(({ objectsData, debug = false }) => {
  const { camera } = useThree();
  const setActiveLevel = useGameStore((state) => state.setActiveLevel);
  const registerInteractiveElement = useCollisionStore(
    (state) => state.registerInteractiveElement
  );
  const unregisterInteractiveElement = useCollisionStore(
    (state) => state.unregisterInteractiveElement
  );
  const findContainingNode = useCollisionStore(
    (state) => state.findContainingNode
  );
  const findContainingInteractiveElement = useCollisionStore(
    (state) => state.findContainingInteractiveElement
  );
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);
  const inputs = useInputs();
  const lastComponentId = useRef(null);
  const prevInteract = useRef(false);
  const registeredElements = useRef(new Set()); // Track registered elements
  const { playFragment } = useAudioFragment();
  const retroWindowService = useRetroWindowService();

  // Reset refs on hot reload
  useEffect(() => {
    lastComponentId.current = null;
    prevInteract.current = false;
  }, [objectsData]);

  // Cleanup function to ensure proper cleanup
  const cleanupInteractiveElements = useCallback(() => {
    // Unregister all previously registered elements
    registeredElements.current.forEach((id) => {
      unregisterInteractiveElement(id);
    });
    registeredElements.current.clear();

    // Reset collision mask
    setCollisionMask(CollisionLayers.CLUSTERS);

    // Hide text content
    textContentService.hide();

    // Reset component tracking
    lastComponentId.current = null;
  }, [unregisterInteractiveElement, setCollisionMask]);

  // Global cleanup on mount to handle hot reload
  useEffect(() => {
    return () => {
      // Final cleanup on unmount
      cleanupInteractiveElements();
    };
  }, [cleanupInteractiveElements]);

  // Créer des boîtes de collision pour chaque objet
  const componentBoxes = useMemo(() => {
    if (!objectsData) return {};

    console.log("[InteractiveComponents] objectsData:", objectsData);

    return objectsData.reduce((boxes, obj) => {
      console.log("[InteractiveComponents] Processing object:", obj);

      if (obj.boundingBox) {
        const position = obj.position;
        console.log(
          "[InteractiveComponents] Object has boundingBox:",
          obj.boundingBox,
          "position:",
          position
        );

        boxes[obj.id] = {
          min: {
            x: position[0] - obj.boundingBox.width / 2,
            y: position[1] - obj.boundingBox.height / 2,
            z: position[2] - obj.boundingBox.depth / 2,
          },
          max: {
            x: position[0] + obj.boundingBox.width / 2,
            y: position[1] + obj.boundingBox.height / 2,
            z: position[2] + obj.boundingBox.depth / 2,
          },
          center: {
            x: position[0],
            y: position[1],
            z: position[2],
          },
          debugColor: [0, 1, 0], // Vert pour les éléments interactifs
          data: obj, // Stocker les données de l'objet pour faciliter l'accès
        };

        console.log(
          "[InteractiveComponents] Created box for",
          obj.id,
          ":",
          boxes[obj.id]
        );
      } else {
        console.log("[InteractiveComponents] Object has no boundingBox:", obj);
      }
      return boxes;
    }, {});
  }, [objectsData]);

  // Fonction de vérification des collisions avec gestion des interactions
  const checkCollisions = useCallback(() => {
    if (!camera) return;

    calculateDetectionPoint(camera);

    if (debug) {
      console.log("[InteractiveComponents] Checking collisions...");
    }

    if (debug) {
      console.log(
        "[InteractiveComponents] Calling findContainingInteractiveElement..."
      );
    }
    const component = findContainingInteractiveElement();
    if (debug) {
      console.log(
        "[InteractiveComponents] findContainingInteractiveElement result:",
        component
      );
    }

    if (component) {
      if (debug) {
        console.log(
          "[InteractiveComponents] Interactive element found:",
          component
        );
      }
      if (debug) {
        console.log("[InteractiveComponents] Component data:", component.data);
      }

      // Afficher le contenu textuel quand on entre dans une nouvelle collision
      if (lastComponentId.current !== component.data.id) {
        lastComponentId.current = component.data.id;

        console.log(
          "[InteractiveComponents] New component detected, showing text content"
        );

        // Toujours afficher le contenu textuel au hover (pour l'information)
        if (component.data.contentData) {
          // Si on a des données spécifiques pour le contenu
          console.log(
            "[InteractiveComponents] Using contentData:",
            component.data.contentData
          );
          textContentService.show({
            type: "simple",
            ...component.data.contentData,
            // Ajouter une propriété pour indiquer si c'est vraiment interactif
            isInteractive:
              component.data.isInteractive &&
              (!!component.data.targetLevel ||
                component.data.interactionType === "audio_fragment" ||
                component.data.interactionType === "retro_window"),
          });
        } else if (component.data.text) {
          // Sinon utiliser le texte simple
          console.log(
            "[InteractiveComponents] Using simple text:",
            component.data.text
          );
          textContentService.show({
            type: "simple",
            text: component.data.text,
            // Ajouter une propriété pour indiquer si c'est vraiment interactif
            isInteractive:
              component.data.isInteractive &&
              (!!component.data.targetLevel ||
                component.data.interactionType === "audio_fragment" ||
                component.data.interactionType === "retro_window"),
          });
        } else {
          console.log(
            "[InteractiveComponents] No text content found for component"
          );
        }
      }

      // Détecter si l'action interact vient d'être déclenchée (front montant)
      const interactTriggered = inputs.interact && !prevInteract.current;
      prevInteract.current = inputs.interact;

      console.log(
        `[InteractiveComponents] Interact state - triggered: ${interactTriggered}, inputs.interact: ${inputs.interact}, component.data.isInteractive: ${component.data.isInteractive}`
      );

      // Si l'action interact vient d'être déclenchée
      if (interactTriggered && component.data.isInteractive) {
        console.log(
          "[InteractiveComponents] Interaction triggered for:",
          component.data
        );

        // Gérer les différents types d'interaction
        if (component.data.targetLevel) {
          // Interaction de changement de niveau (existant)
          console.log(
            "[InteractiveComponents] Changing to level:",
            component.data.targetLevel
          );
          setActiveLevel(component.data.targetLevel);
        } else if (
          component.data.interactionType === "audio_fragment" &&
          component.data.audioFragment
        ) {
          // Nouvelle interaction audio fragment
          console.log(
            `[InteractiveComponents] Playing audio fragment: ${component.data.audioFragment}`
          );
          console.log(
            `[InteractiveComponents] playFragment function:`,
            playFragment
          );
          playFragment(component.data.audioFragment);
        } else if (
          component.data.interactionType === "retro_window" &&
          component.data.contentData?.retroWindow
        ) {
          // Nouvelle interaction fenêtre rétro
          console.log(
            `[InteractiveComponents] Opening retro window for: ${component.data.id}`
          );
          
          const retroWindowConfig = {
            id: `${component.data.id}_window`,
            title: component.data.contentData.retroWindow.title,
            width: 450,
            height: 350,
            position: {
              x: (window.innerWidth - 450) / 2,
              y: (window.innerHeight - 350) / 2
            },
            texts: component.data.contentData.retroWindow.texts,
            image: component.data.contentData.retroWindow.image,
          };
          
          retroWindowService.openWindow(retroWindowConfig);
        }
      }
    } else {
      const nodeComponent = findContainingNode();
      if (debug) {
        console.log("[InteractiveComponents] Node found:", nodeComponent);
      }
      if (lastComponentId.current !== null) {
        if (debug) {
          console.log(
            "[InteractiveComponents] No collision detected, cleaning up"
          );
        }
        if (debug) {
          console.log(
            "[InteractiveComponents] No component detected, hiding text content"
          );
        }
        lastComponentId.current = null;
        // Cacher le contenu du TextPanel
        textContentService.hide();
      }
    }
  }, [
    camera,
    calculateDetectionPoint,
    findContainingNode,
    findContainingInteractiveElement,
    inputs,
    setActiveLevel,
    debug,
    playFragment,
    retroWindowService,
  ]);

  // Enregistrer les boîtes de collision
  useEffect(() => {
    if (!objectsData?.length) return;

    // Cleanup previous elements first
    cleanupInteractiveElements();

    if (debug) {
      console.log(
        "[InteractiveComponents] Registering component boxes:",
        componentBoxes
      );
    }

    // Enregistrer chaque élément interactif individuellement
    Object.entries(componentBoxes).forEach(([id, box]) => {
      if (debug) {
        console.log(
          "[InteractiveComponents] Registering interactive element:",
          id,
          box
        );
      }
      registerInteractiveElement(id, box, box.data);
      registeredElements.current.add(id); // Track registered element
    });

    // Inclure les éléments interactifs dans le masque de collision
    const newMask =
      CollisionLayers.CLUSTERS |
      CollisionLayers.NODES |
      CollisionLayers.INTERACTIVE;
    if (debug) {
      console.log("[InteractiveComponents] Calculated mask:", newMask);
      console.log(
        "[InteractiveComponents] CLUSTERS:",
        CollisionLayers.CLUSTERS,
        "NODES:",
        CollisionLayers.NODES,
        "INTERACTIVE:",
        CollisionLayers.INTERACTIVE
      );
    }
    setCollisionMask(newMask);

    if (debug) {
      console.log(
        "[InteractiveComponents] Collision mask set to include INTERACTIVE"
      );
    }

    return () => {
      // Use the cleanup function on unmount
      cleanupInteractiveElements();
    };
  }, [
    componentBoxes,
    registerInteractiveElement,
    cleanupInteractiveElements,
    objectsData?.length,
    debug,
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
