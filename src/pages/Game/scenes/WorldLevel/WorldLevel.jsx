import React, { memo, useMemo, useEffect } from "react";
import { BOUNDING_SPHERE_RADIUS } from "../../components/AdvancedCameraController/navigationConstants";
import ShootingStars from "./components/ShootingStars";
import SvgPath from "../../components/SvgPath";
import VibSvgPath from "../../components/VibSvgPath";
import useAssets from "../../hooks/useAssets";
import Graph from "./components/Graph/Graph";
import InteractiveComponents from "./components/Graph/InteractiveComponents";
import useEffectStore from "../../services/EffectService";
import useGameStore from "../../store";
import {
  WORLD_INTERACTIVE_OBJECTS,
  WORLD_NON_INTERACTIVE_OBJECTS,
} from "./constants/worldObjects";

// Composant générique pour les icônes de personnages
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
    console.log("[WorldLevel] Tentative de chargement du SVG:", svgPath);

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
              `[WorldLevel] Erreur de chargement pour ${svgPath}:`,
              err
            );
            handleSvgError(err);
          }}
        />
      </group>
    );
  }
);

// Composant pour le niveau monde principal
const WorldLevel = memo(() => {
  // const triggerMusicNotesEffect = useEffectStore(
  //   (state) => state.triggerMusicNotesEffect
  // );
  // // const stopEffect = useEffectStore((state) => state.stopEffect);

  // // Instancier l'effet de notes de musique avec useMemo pour optimisation
  // const musicNotesEffectId = useMemo(() => {
  //   const effectId = triggerMusicNotesEffect(
  //     { x: 25, y: -25, z: 0 } // Position dans l'espace (même position qu'avant)
  //   );

  //   console.log(
  //     "Effet de notes de musique continu instancié avec l'ID:",
  //     effectId
  //   );

  //   return effectId;
  // }, []);

  // // Cleanup au démontage du composant - arrêter réellement l'effet
  // useEffect(() => {
  //   return () => {
  //     if (musicNotesEffectId) {
  //       console.log(
  //         "Arrêt de l'effet de notes de musique:",
  //         musicNotesEffectId
  //       );
  //       stopEffect(musicNotesEffectId);
  //     }
  //   };
  // }, [musicNotesEffectId, stopEffect]);

  // Fonction pour créer les composants interactifs à partir de la configuration
  const createInteractiveComponents = (objects) => {
    return objects.map((obj) => ({
      id: obj.id,
      element: (
        <CharacterIcon
          svgName={obj.svgName}
          position={obj.position}
          size={obj.size}
          useVibration={obj.useVibration}
          vibrationIntensity={obj.vibrationIntensity}
          vibrationSpeed={obj.vibrationSpeed}
          persona={obj.persona}
        />
      ),
      position: obj.interactivePosition || obj.position,
      text: obj.text,
      isInteractive: obj.isInteractive,
      boundingBox: obj.boundingBox,
      contentData: obj.contentData,
    }));
  };

  // Fonction pour créer les objets non interactifs (étoiles fixes)
  const createNonInteractiveObjects = (objects) => {
    return objects.map((obj) => (
      <VibSvgPath
        key={obj.id}
        svgPath={`${obj.component}.svg`}
        position={obj.position}
        size={obj.size}
        color="white"
        lineWidth={1}
        isBillboard={false}
        vibrationIntensity={2}
        vibrationSpeed={1.5}
        onError={(err) => {
          console.error(
            `[WorldLevel] Erreur de chargement pour ${obj.component}:`,
            err
          );
        }}
      />
    ));
  };

  const interactiveComponents = useMemo(
    () => createInteractiveComponents(WORLD_INTERACTIVE_OBJECTS),
    []
  );

  const nonInteractiveObjects = useMemo(
    () => createNonInteractiveObjects(WORLD_NON_INTERACTIVE_OBJECTS),
    []
  );

  return (
    <>
      {/* Éclairage spécifique pour le niveau monde */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <InteractiveComponents components={interactiveComponents} />
      <Graph />
      <ShootingStars
        count={8}
        sphereRadius={BOUNDING_SPHERE_RADIUS}
        spawnInterval={{ min: 5, max: 10 }}
      />

      {/* Objets non interactifs (étoiles fixes) */}
      <group>{nonInteractiveObjects}</group>
    </>
  );
});

export default WorldLevel;
