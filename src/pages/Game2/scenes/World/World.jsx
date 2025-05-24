import React, { memo } from "react";
import useGameStore, { useCurrentLevel, GAME_LEVELS } from "../../store";
import {
  BOUNDING_SPHERE_RADIUS,
  BASE_CAMERA_DISTANCE,
} from "../../components/AdvancedCameraController/navigationConstants";
import Stars from "../../components/Stars";
import ShootingStars from "../../components/ShootingStars";
import BlackHoleEffect from "../../components/BlackHoleEffect";
import DistrictLabels from "../../components/DistrictLabels";
import SvgPath from "../../components/SvgPath";
import useAssets from "../../hooks/useAssets";
import Graph from "./components/Graph/Graph";
import AdvancedCluster from "../AdvancedCluster/AdvancedCluster";

// Composant Joshua qui utilise SvgPath avec gestion des clics
const Joshua = memo(() => {
  const assets = useAssets({ autoInit: false });
  const setActiveLevel = useGameStore((state) => state.setActiveLevel);
  const groupRef = React.useRef();
  const [useFallback, setUseFallback] = React.useState(false);

  const handleClick = () => {
    const persona = {
      id: "joshua-persona",
      name: "Joshua Goldberg",
      type: "persona",
    };
    setActiveLevel(persona);
    console.log("Active persona set:", persona);
  };

  const handleSvgError = (err) => {
    console.error("Erreur SVG Joshua:", err);
    setUseFallback(true);
  };

  if (!assets.isReady) return null;

  // Fallback simple pour éviter les erreurs
  if (useFallback) {
    return (
      <group ref={groupRef} onClick={handleClick} position={[0, 0, 0]}>
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

  // Path absolu vers les assets
  const svgPath = `${import.meta.env.BASE_URL || "/"}img/joshua-goldberg.svg`;

  return (
    <group ref={groupRef} onClick={handleClick}>
      <SvgPath
        svgPath={svgPath}
        size={300}
        position={[0, 0, 0]}
        color="white"
        lineWidth={2}
        isBillboard={true}
        onError={handleSvgError}
      />
    </group>
  );
});

// Composant pour le niveau monde principal
const WorldLevel = memo(() => {
  return (
    <>
      {/* Éléments principaux de la scène */}
      <Joshua />
      <Graph />
      <DistrictLabels textSize={25} maxDistance={2000} minDistance={1000} />

      {/* Effets visuels spatiaux */}
      <ShootingStars
        count={8}
        sphereRadius={BOUNDING_SPHERE_RADIUS}
        innerRadius={BASE_CAMERA_DISTANCE * 0.25}
        targetRadius={BASE_CAMERA_DISTANCE * 0.025}
        spawnInterval={{ min: 5, max: 10 }}
      />
      <BlackHoleEffect
        position={[420, 0, 0]}
        size={20}
        particles={35000}
        rotationSpeed={0.12}
        spiralTightness={5}
        rotation={[0.2, -2.5, 0.5]}
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
    </>
  );
});

export default World;
