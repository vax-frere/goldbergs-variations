import React, { memo, useMemo } from "react";
import useGameStore, { useCurrentLevel, GAME_LEVELS } from "../../store";
import {
  BOUNDING_SPHERE_RADIUS,
  BASE_CAMERA_DISTANCE,
} from "../../components/AdvancedCameraController/navigationConstants";
import Stars from "../../components/Stars";
import ShootingStars from "./components/ShootingStars";
import DistrictLabels from "./components/DistrictLabels";
import SvgPath from "../../components/SvgPath";
import VibSvgPath from "../../components/VibSvgPath";
import useAssets from "../../hooks/useAssets";
import Graph from "./components/Graph/Graph";
import AdvancedCluster from "../AdvancedCluster/AdvancedCluster";
import BlackHoleLevel from "../BlackHole/BlackHoleLevel";
import InteractiveComponents from "./components/Graph/InteractiveComponents";
import BlackHoleEffect from "./components/BlackHoleEffect";

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
    console.log("[World] Tentative de chargement du SVG:", svgPath);

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
            console.error(`[World] Erreur de chargement pour ${svgPath}:`, err);
            handleSvgError(err);
          }}
        />
      </group>
    );
  }
);

// Composant pour le niveau monde principal
const WorldLevel = memo(() => {
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
      },
      {
        id: "heart2",
        element: (
          <CharacterIcon
            svgName="heart-2"
            position={[-150, 200, -100]}
            size={25}
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
      },
      {
        id: "heart3",
        element: (
          <CharacterIcon
            svgName="heart-3"
            position={[200, -350, 200]}
            size={25}
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
      },
      // {
      //   id: "blackhole",
      //   element: (
      //     <BlackHoleEffect
      //       position={[420, 0, 0]}
      //       size={10}
      //       particles={35000}
      //       rotationSpeed={0.12}
      //       spiralTightness={5}
      //       rotation={[0.2, 2.5, 0.5]}
      //     />
      //   ),
      //   position: [420, 0, 0],
      //   isInteractive: true,
      //   text: "Un trou noir mystérieux qui semble absorber l'énergie environnante. Sa présence crée une distorsion fascinante dans l'espace.",
      //   targetLevel: {
      //     id: "blackhole",
      //     type: "blackhole",
      //     name: "Trou Noir",
      //     data: {
      //       position: [420, 0, 0],
      //     },
      //   },
      //   boundingBox: {
      //     width: 150,
      //     height: 120,
      //     depth: 150,
      //   },
      // },
    ],
    []
  );

  return (
    <>
      <InteractiveComponents components={interactiveComponents} />
      <Graph />
      <DistrictLabels
        textSize={25}
        maxDistance={BOUNDING_SPHERE_RADIUS}
        minDistance={BOUNDING_SPHERE_RADIUS / 2}
      />
      <ShootingStars
        count={8}
        sphereRadius={BOUNDING_SPHERE_RADIUS}
        spawnInterval={{ min: 5, max: 10 }}
      />
    </>
  );
});

// Composant de scène principal avec gestion des niveaux
const World = memo(() => {
  const currentLevel = useCurrentLevel();

  return (
    <>
      {/* Éclairage de base (toujours présent) */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      {/* Rendu conditionnel basé sur le niveau actuel */}
      {currentLevel === GAME_LEVELS.WORLD && <WorldLevel />}
      {currentLevel === GAME_LEVELS.ADVANCED_CLUSTER && <AdvancedCluster />}
      {currentLevel === GAME_LEVELS.BLACK_HOLE && <BlackHoleLevel />}
    </>
  );
});

export default World;
