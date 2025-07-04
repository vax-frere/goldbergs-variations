import React, { memo, useMemo, useEffect, useCallback } from "react";
import { BOUNDING_SPHERE_RADIUS } from "../../components/AdvancedCameraController/navigationConstants";
import ShootingStars from "./components/ShootingStars";
import VibSvgPath from "../../components/VibSvgPath";

import Graph from "./components/Graph/Graph";
import InteractiveComponents from "./components/Graph/InteractiveComponents";
import DistrictLabels from "./components/DistrictLabels";
import useEffectStore from "../../services/EffectService";
import useGameStore from "../../store";

import {
  WORLD_INTERACTIVE_OBJECTS,
  WORLD_NON_INTERACTIVE_OBJECTS,
} from "./constants/worldObjects";

// Composant pour le niveau monde principal
const WorldLevel = memo(() => {
  // const triggerMusicNotesEffect = useEffectStore(
  //   (state) => state.triggerMusicNotesEffect
  // );
  // const stopEffect = useEffectStore((state) => state.stopEffect);

  // // Instancier l'effet de notes de musique avec useMemo pour optimisation
  // const musicNotesEffectId = useMemo(() => {
  //   const effectId = triggerMusicNotesEffect(
  //     { x: 75, y: -100, z: 0 } // Position dans l'espace (même position qu'avant)
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

  // Mémoriser les objets non interactifs (étoiles fixes)
  const nonInteractiveObjects = useMemo(() => {
    return WORLD_NON_INTERACTIVE_OBJECTS.map((obj) => (
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
  }, []); // WORLD_NON_INTERACTIVE_OBJECTS est une constante, pas de dépendances

  return (
    <>
      {/* Éclairage spécifique pour le niveau monde */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Composants interactifs - maintenant gérés en interne */}
      <InteractiveComponents objectsData={WORLD_INTERACTIVE_OBJECTS} />

      <DistrictLabels />

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
