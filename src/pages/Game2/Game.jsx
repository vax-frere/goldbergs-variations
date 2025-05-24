import { useState, useEffect, memo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import useGameStore from "./store";
import useAssets from "./hooks/useAssets";
import { EffectComposer } from "@react-three/postprocessing";
import { Bloom, ToneMapping } from "@react-three/postprocessing";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
  BOUNDING_SPHERE_RADIUS,
} from "./components/AdvancedCameraController/navigationConstants";
import { getAudioState } from "./components/GameAudio";
import HUD from "./components/HUD/HUD";
import LoadingBar from "./components/LoadingBar/LoadingBar";
import World from "./scenes/World/World";
import Stars from "./components/Stars";
import useCollisionStore, {
  CollisionLayers,
} from "./services/CollisionService";
import useDebugMode from "./hooks/useDebugMode";
import { AdvancedCameraController } from "./components/AdvancedCameraController/AdvancedCameraController";
import GameAudio from "./components/GameAudio";
import CollisionDebugRenderer from "./components/debug/CollisionDebugRenderer";
import { useFrame } from "@react-three/fiber";

// Composant pour initialiser et gérer le service de collision
const CollisionManager = memo(() => {
  const debug = useGameStore((state) => state.debug);
  const setDebugMode = useCollisionStore((state) => state.setDebugMode);
  const setCollisionMask = useCollisionStore((state) => state.setCollisionMask);
  const detectCollisions = useCollisionStore((state) => state.detectCollisions);
  const calculateDetectionPoint = useCollisionStore(
    (state) => state.calculateDetectionPoint
  );
  const { camera } = useThree();
  const setHoveredCluster = useGameStore((state) => state.setHoveredCluster);
  const activeLevel = useGameStore((state) => state.activeLevel);

  // Initialiser le service de collision
  useEffect(() => {
    setCollisionMask(CollisionLayers.CLUSTERS);
    setDebugMode(debug);

    return () => {
      setCollisionMask(CollisionLayers.NONE);
      setDebugMode(false);
    };
  }, [setCollisionMask, setDebugMode, debug]);

  // Gérer les détections de collision avec setInterval
  useEffect(() => {
    const checkCollisions = () => {
      // Ne pas détecter si on est dans un cluster
      if (activeLevel?.type === "cluster") return;

      // Calculer le point de détection
      calculateDetectionPoint(camera);

      // Détecter les collisions
      const collisions = detectCollisions();
      if (!collisions) return;

      // Gérer les collisions avec les clusters
      if (collisions.clusters && collisions.clusters.length > 0) {
        const detectedCluster = collisions.clusters[0];
        setHoveredCluster(detectedCluster.id);
      } else {
        setHoveredCluster(null);
      }
    };

    const interval = setInterval(checkCollisions, 100);

    return () => {
      clearInterval(interval);
      setHoveredCluster(null);
    };
  }, [
    camera,
    activeLevel,
    calculateDetectionPoint,
    detectCollisions,
    setHoveredCluster,
  ]);

  return null;
});

// Séparer le composant DebugStats pour n'afficher que si nécessaire
const DebugStats = memo(() => {
  const debug = useGameStore((state) => state.debug);
  return debug ? <Stats /> : null;
});

// Composant pour le Canvas et ses effets
const GameCanvas = memo(({ children }) => {
  // Activer l'écoute de la touche P pour le debug mode
  useDebugMode();

  return (
    <Canvas
      shadows
      style={{
        background: "#000",
        width: "100%",
        height: "100%",
      }}
      camera={{
        position: [0, -300, BASE_CAMERA_DISTANCE * 4],
        fov: CAMERA_FOV,
        near: 0.1,
        far: 1000000,
      }}
    >
      {/* Systèmes du jeu */}
      <GameAudio />
      <AdvancedCameraController />
      <CollisionManager />
      <CollisionDebugRenderer />

      {/* Fond étoilé */}
      <Stars count={4000} radius={BOUNDING_SPHERE_RADIUS * 4} size={2.5} />

      {/* Scène 3D */}
      {children}

      <EffectComposer>
        <Bloom
          intensity={0.15}
          luminanceThreshold={0.01}
          luminanceSmoothing={0.03}
        />
        <ToneMapping exposure={1.5} gamma={0.8} vignette={0.5} />
      </EffectComposer>
      <DebugStats />
    </Canvas>
  );
});

// Composant Game principal
const Game = () => {
  const activeLevel = useGameStore((state) => state.activeLevel);
  const assets = useAssets({ autoInit: true });
  const [gameReady, setGameReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const TOTAL_LOADING_STAGES = 3;
  const loadStartTime = useRef(Date.now());
  const MIN_LOADING_TIME = 3000; // 3 secondes minimum

  // Mettre à jour les étapes de chargement
  useEffect(() => {
    if (loadingStage === 0 && assets.progress > 0) {
      setLoadingStage(1); // Assets loading stage
    } else if (loadingStage === 1 && assets.isReady) {
      setLoadingStage(2); // Audio loading stage

      // Simulation de progression audio si elle est trop rapide
      let simulatedAudioProgress = 0;
      const audioProgressInterval = setInterval(() => {
        simulatedAudioProgress += 5;
        if (simulatedAudioProgress > 100) {
          simulatedAudioProgress = 100;
          clearInterval(audioProgressInterval);
        }
        // Ne pas dépasser la progression réelle si audio est déjà prêt
        if (!getAudioState().isInitializing) {
          clearInterval(audioProgressInterval);
          simulatedAudioProgress = 100;
        }
        setAudioProgress(simulatedAudioProgress);
      }, 100);

      return () => clearInterval(audioProgressInterval);
    } else if (loadingStage === 2 && !getAudioState().isInitializing) {
      setLoadingStage(3); // Initialization stage

      // Calculer le temps écoulé depuis le début du chargement
      const elapsedTime = Date.now() - loadStartTime.current;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

      // Si le chargement a pris moins de 3 secondes, attendre la différence
      setTimeout(() => {
        setGameReady(true);
      }, remainingTime);
    }
  }, [assets.progress, assets.isReady, loadingStage]);

  // Combinaison simplifiée pour gérer le chargement du jeu
  useEffect(() => {
    if (!assets.isReady) return;

    // En développement: forcer le démarrage rapide
    if (import.meta.env.DEV) {
      const timer = setTimeout(() => {
        getAudioState().isInitializing = false;
      }, 1500);
      return () => clearTimeout(timer);
    }

    // En production, utiliser une solution plus robuste
    const checkAudioStatus = () => {
      if (!getAudioState().isInitializing) return;
      setTimeout(checkAudioStatus, 100);
    };

    checkAudioStatus();

    const safetyTimer = setTimeout(() => {
      getAudioState().forceCompleteInitialization();
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, [assets.isReady]);

  // Déterminer le message de chargement approprié
  const getLoadingMessage = () => {
    switch (loadingStage) {
      case 0:
        return "initializing...";
      case 1:
        return `loading assets ${Math.round(assets.progress)}%`;
      case 2:
        return `preloading audio ${Math.round(audioProgress)}%`;
      case 3:
        return "starting game...";
      default:
        return "loading...";
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
      {/* Afficher la barre de chargement si le jeu n'est pas prêt */}
      {!gameReady ? (
        <LoadingBar
          progress={
            loadingStage === 1
              ? assets.progress
              : loadingStage === 2
              ? audioProgress
              : 100
          }
          message={getLoadingMessage()}
          stage={loadingStage}
          totalStages={TOTAL_LOADING_STAGES}
        />
      ) : (
        <>
          <GameCanvas>
            <World />
          </GameCanvas>

          {/* HUD principal qui contient tous les composants UI */}
          <HUD />
        </>
      )}
    </div>
  );
};

export default Game;
