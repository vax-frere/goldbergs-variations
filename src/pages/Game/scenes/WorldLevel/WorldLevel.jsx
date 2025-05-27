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
  // const stopEffect = useEffectStore((state) => state.stopEffect);

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
  // }, [triggerMusicNotesEffect]);

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

  const interactiveComponents = useMemo(
    () => [
      {
        id: "joshua",
        element: (
          <CharacterIcon
            svgName="joshua-goldberg"
            position={[0, 0, 0]}
            persona={{
              id: "joshua-persona",
              name: "Joshua Goldberg",
              type: "persona",
            }}
            useVibration={true}
            size={300}
            vibrationIntensity={5}
            vibrationSpeed={2}
          />
        ),
        position: [0, 0, 0],
        text: "Joshua Goldberg - Le créateur des variations",
        isInteractive: false,
        boundingBox: {
          width: 200,
          height: 300,
          depth: 200,
        },
        contentData: {
          title: "Joshua Goldberg",
          text: "Le créateur des variations Goldberg. Un compositeur visionnaire qui a révolutionné la musique baroque avec ses innovations harmoniques et structurelles.",
          type: "character",
        },
      },
      {
        id: "heart1",
        element: (
          <CharacterIcon
            svgName="heart-1"
            position={[200, 150, 100]}
            size={25}
            useVibration={true}
            vibrationIntensity={2}
            vibrationSpeed={3}
          />
        ),
        position: [200, 150, 100],
        text: "Du love dans l'air",
        isInteractive: false,
        boundingBox: {
          width: 100,
          height: 100,
          depth: 100,
        },
        contentData: {
          title: "Cœur Flottant",
          text: "Un symbole d'amour qui flotte dans l'espace, représentant la passion et l'émotion qui imprègnent les compositions de Goldberg.",
          type: "decoration",
        },
      },
      {
        id: "trollface",
        element: (
          <CharacterIcon
            svgName="trollface"
            position={[-150, 200, -100]}
            size={50}
            useVibration={true}
            vibrationIntensity={2.5}
            vibrationSpeed={2.5}
          />
        ),
        position: [-150, 200, -100],
        text: "Du love dans l'espace",
        isInteractive: false,
        boundingBox: {
          width: 100,
          height: 100,
          depth: 100,
        },
        contentData: {
          title: "Amour Cosmique",
          text: "L'amour transcende les dimensions, créant des connexions harmoniques entre les différents éléments de l'univers musical.",
          type: "decoration",
        },
      },
      {
        id: "ak47",
        element: (
          <CharacterIcon
            svgName="ak47"
            position={[200, -350, 200]}
            size={100}
            useVibration={true}
            vibrationIntensity={3}
            vibrationSpeed={2}
          />
        ),
        position: [200, -350, 200],
        text: "Du love dans les étoiles",
        isInteractive: false,
        boundingBox: {
          width: 100,
          height: 100,
          depth: 100,
        },
        contentData: {
          title: "Étoile d'Amour",
          text: "Parmi les étoiles, l'amour brille comme un phare guidant les mélodies vers leur destination harmonique finale.",
          type: "decoration",
        },
      },
      {
        id: "thug",
        element: (
          <CharacterIcon
            svgName="thug"
            position={[-420, 0, 0]}
            persona={{
              id: "thug-persona",
              name: "You Suck My Life",
              type: "persona",
            }}
            size={150}
            useVibration={true}
            vibrationIntensity={4}
            vibrationSpeed={1.5}
          />
        ),
        position: [-420, 0, 0],
        text: "You Suck My Life - Un autre personnage mystérieux",
        isInteractive: false,
        boundingBox: {
          width: 200,
          height: 300,
          depth: 200,
        },
        contentData: {
          title: "You Suck My Life",
          text: "Une figure énigmatique qui représente les aspects plus sombres et conflictuels de la création artistique. Son influence se ressent dans les passages les plus intenses des variations.",
          type: "character",
        },
      },
    ],
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
    </>
  );
});

export default WorldLevel;
