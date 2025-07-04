import { useState, useEffect, memo, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import useSound from "use-sound";
import useGameStore, { useIsTransitioning } from "./store";
import useAssets from "./hooks/useAssets";
import useAudioManager from "./services/AudioManager";
import { getSoundPath } from "../../utils/assetLoader";
import { EffectComposer, Bloom, ToneMapping, Glitch, Noise } from "@react-three/postprocessing";
import usePostProcessingStore from "./services/PostProcessingService";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
  BOUNDING_SPHERE_RADIUS,
} from "./components/AdvancedCameraController/navigationConstants";
import { getAudioState } from "./components/GameAudio";
import HUD from "./components/HUD/HUD";
import LoadingBar from "./components/LoadingBar/LoadingBar";
import LevelSwitcher from "./LevelSwitcher";
import Stars from "./components/Stars";
import Skybox from "./components/Skybox";
import useCollisionStore, {
  CollisionLayers,
} from "./services/CollisionService";
import useDebugMode from "./hooks/useDebugMode";
import { AdvancedCameraController } from "./components/AdvancedCameraController/AdvancedCameraController";
import DebugPanelManager from "./components/debug/DebugPanelManager";
import StatsDebugPanel from "./components/debug/StatsDebugPanel";
import GameAudio from "./components/GameAudio";
import CollisionDebugRenderer from "./components/debug/CollisionDebugRenderer";
import GridReferences from "./components/GridReferences";
import { useFrame } from "@react-three/fiber";
import textContentService from "./services/TextContentService";
import EffectRenderer from "./components/EffectRenderer";
import useIntro from "./hooks/useIntro";

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
  const assets = useAssets();
  const audioManager = useAudioManager();

  // Fonction pour trouver les données d'un cluster
  const findClusterData = useCallback(
    (nodeId) => {
      if (!assets.isReady) return null;

      const database = assets.getData("database");
      const graphData = assets.getData("graph");

      let data = null;

      // Chercher dans la base de données par slug (qui correspond au nodeId)
      if (database) {
        data = database.find((item) => item.slug === nodeId);
      }

      // Chercher le nœud master du cluster dans le graphe
      if (graphData?.nodes) {
        const masterNode = graphData.nodes.find(
          (n) => n.nodeId === nodeId && n.isClusterMaster
        );

        if (masterNode) {
          data = {
            ...masterNode,
            ...(data || {}), // Les données de la base écrasent celles du graphe
            name: data?.name || masterNode.name || nodeId,
            type: data?.type || masterNode.type,
          };
        }
      }

      return data;
    },
    [assets]
  );

  // Initialiser le service de collision et audio
  useEffect(() => {
    const newMask =
      CollisionLayers.CLUSTERS |
      CollisionLayers.NODES |
      CollisionLayers.INTERACTIVE;
    console.log("[Game] Setting collision mask to:", newMask);
    console.log(
      "[Game] CLUSTERS:",
      CollisionLayers.CLUSTERS,
      "NODES:",
      CollisionLayers.NODES,
      "INTERACTIVE:",
      CollisionLayers.INTERACTIVE
    );
    setCollisionMask(newMask);
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

      // CORRECTION: Ne pas détecter pendant les transitions pour éviter le flickering
      const gameState = useGameStore.getState();
      if (gameState.isTransitioning) return;

      // Calculer le point de détection
      calculateDetectionPoint(camera);

      // Détecter les collisions
      const collisions = detectCollisions();
      if (!collisions) {
        setHoveredCluster(null, null);
        return;
      }

      // Gérer les collisions avec les clusters
      if (collisions.clusters && collisions.clusters.length > 0) {
        const detectedCluster = collisions.clusters[0];
        const clusterData = findClusterData(detectedCluster.id);

        // Contournement: récupérer le slug depuis les boîtes enregistrées
        let clusterSlug = detectedCluster.data?.slug;

        if (!clusterSlug) {
          // Fallback: chercher dans les boîtes enregistrées
          const collisionState = useCollisionStore.getState();
          const clusterBoxes = collisionState.boundingBoxRefs?.clusterBoxes;

          if (clusterBoxes && clusterBoxes[detectedCluster.id]) {
            clusterSlug = clusterBoxes[detectedCluster.id].data?.slug;
          }
        }

        // Si toujours pas de slug, utiliser l'ID comme fallback
        if (!clusterSlug) {
          clusterSlug = detectedCluster.id;
        }

        setHoveredCluster(clusterSlug, clusterData);
      } else {
        setHoveredCluster(null, null);
      }
    };

    const interval = setInterval(checkCollisions, 100);

    return () => {
      clearInterval(interval);
      setHoveredCluster(null, null);
    };
  }, [
    camera,
    activeLevel,
    calculateDetectionPoint,
    detectCollisions,
    setHoveredCluster,
    findClusterData,
  ]);

  return null;
});

// Séparer le composant DebugStats pour n'afficher que si nécessaire
const DebugStats = memo(() => {
  const debug = useGameStore((state) => state.debug);
  return debug ? <StatsDebugPanel /> : null;
});

// Composant pour afficher la grille de référence uniquement en mode debug
const DebugGridReferences = memo(() => {
  const debug = useGameStore((state) => state.debug);
  return debug ? <GridReferences /> : null;
});

// Composant pour afficher les panels de debug uniquement en mode debug
const DebugNavigationDisplay = memo(() => {
  const debug = useGameStore((state) => state.debug);
  return debug ? <DebugPanelManager /> : null;
});

// Composant pour gérer les transitions entre niveaux avec fade
const TransitionOverlay = memo(() => {
  const isTransitioning = useIsTransitioning();
  const transitionData = useGameStore((state) => state.transitionData);
  const [fadePhase, setFadePhase] = useState("hidden"); // 'hidden', 'starting', 'fadeIn', 'visible', 'fadeOut'

  useEffect(() => {
    if (isTransitioning) {
      // Phase 0: Commencer avec l'overlay visible mais transparent
      setFadePhase("starting");

      // Phase 1: Déclencher le fade in après un micro-délai pour permettre le rendu
      const startTimer = setTimeout(() => {
        setFadePhase("fadeIn");

        // Phase 2: Maintenir l'écran noir pendant un court moment
        const visibleTimer = setTimeout(() => {
          setFadePhase("visible");

          // Phase 3: Fade out (révéler le nouveau niveau)
          const fadeOutTimer = setTimeout(() => {
            setFadePhase("fadeOut");

            // Phase 4: Cacher complètement l'overlay
            const hideTimer = setTimeout(() => {
              setFadePhase("hidden");
            }, 150); // Durée du fade out réduite

            return () => clearTimeout(hideTimer);
          }, 50); // Temps d'attente en noir réduit

          return () => clearTimeout(fadeOutTimer);
        }, 150); // Durée du fade in réduite

        return () => clearTimeout(visibleTimer);
      }, 10); // Micro-délai pour permettre le rendu initial

      return () => clearTimeout(startTimer);
    } else {
      setFadePhase("hidden");
    }
  }, [isTransitioning]);

  // Ne pas afficher si caché
  if (fadePhase === "hidden") return null;

  // Déterminer l'opacité selon la phase
  const getOpacity = () => {
    switch (fadePhase) {
      case "starting":
        return 0; // Commencer transparent
      case "fadeIn":
        return 1; // Transition vers opaque
      case "visible":
        return 1; // Rester opaque
      case "fadeOut":
        return 0; // Transition vers transparent
      default:
        return 0;
    }
  };

  // Déterminer la durée de transition
  const getTransitionDuration = () => {
    switch (fadePhase) {
      case "starting":
        return "0ms"; // Pas de transition pour l'état initial
      case "fadeIn":
        return "150ms"; // Transition douce vers le noir (réduite)
      case "fadeOut":
        return "150ms"; // Transition douce vers la transparence (réduite)
      default:
        return "0ms";
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        zIndex: 9998, // Juste en dessous de la loading bar
        opacity: getOpacity(),
        transition: `opacity ${getTransitionDuration()} ease-in-out`,
        pointerEvents: isTransitioning ? "all" : "none", // Bloquer les interactions pendant la transition
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Optionnel: Afficher le nom du niveau pendant la transition */}
      {transitionData &&
        (fadePhase === "visible" || fadePhase === "fadeIn") && (
          <div
            style={{
              color: "white",
              fontSize: "14px", // Taille réduite de 24px à 14px
              fontFamily: "monospace",
              textAlign: "center",
              opacity: fadePhase === "fadeIn" ? 0.4 : 0.4, // Opacité réduite de 0.8 à 0.4
              transition: "opacity 100ms ease-in-out", // Transition du texte plus rapide
              fontWeight: "300", // Police plus fine
              letterSpacing: "0.5px", // Espacement des lettres pour plus de discrétion
            }}
          >
            {transitionData.name
              ? `Entering ${transitionData.name}...`
              : "Loading..."}
          </div>
        )}
    </div>
  );
});

// Composant pour le Canvas et ses effets
const GameCanvas = memo(({ children }) => {
  const isTransitioning = useIsTransitioning();
  const postProcessingConfig = usePostProcessingStore((state) => state.config);

  // Activer l'écoute de la touche P pour le debug mode
  useDebugMode();

  return (
    <Canvas
      shadows
      style={{
        background: "#000",
        width: "100%",
        height: "100%",
        pointerEvents: isTransitioning ? "none" : "auto",
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
      <AdvancedCameraController disabled={isTransitioning} />
      <CollisionManager />
      <CollisionDebugRenderer />
      <DebugGridReferences />

      {/* Renderer des effets visuels (global) */}
      <EffectRenderer />

      {/* Fond étoilé */}
      <Stars radius={BOUNDING_SPHERE_RADIUS * 4} />
      {/* <Skybox radius={BOUNDING_SPHERE_RADIUS * 6} opacity={0.3} /> */}

      {/* Scène 3D */}
      {children}

      <EffectComposer>
        <Bloom
          intensity={postProcessingConfig.bloom.intensity}
          luminanceThreshold={postProcessingConfig.bloom.luminanceThreshold}
          luminanceSmoothing={postProcessingConfig.bloom.luminanceSmoothing}
        />
        <ToneMapping
          exposure={postProcessingConfig.toneMapping.exposure}
          contrast={postProcessingConfig.toneMapping.contrast}
        />
        {postProcessingConfig.glitch.active && (
          <Glitch
            delay={[0.5, 0.25]}
            duration={postProcessingConfig.glitch.duration}
            strength={postProcessingConfig.glitch.strength}
          />
        )}
        {postProcessingConfig.noise.active && postProcessingConfig.noise.intensity > 0 && (
          <Noise
            opacity={postProcessingConfig.noise.intensity}
            speed={postProcessingConfig.noise.speed}
          />
        )}
      </EffectComposer>
    </Canvas>
  );
});

// Composant Game principal
const Game = () => {
  const activeLevel = useGameStore((state) => state.activeLevel);
  const assets = useAssets({ autoInit: true });
  const audioManager = useAudioManager();
  const [gameReady, setGameReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [isLoadingFadingOut, setIsLoadingFadingOut] = useState(false);
  const TOTAL_LOADING_STAGES = 3;
  const loadStartTime = useRef(Date.now());
  const MIN_LOADING_TIME = 3000; // 3 secondes minimum
  const GAME_WARMUP_TIME = 650; // Temps pour que le jeu tourne en arrière-plan
  const FADE_OUT_DURATION = 350; // Durée du fade out
  const [playEnterLevelSound] = useSound(getSoundPath("enter-level.mp3"), {
    volume: 0.1,
  });
  const previousLevelRef = useRef(null);
  
  // Système d'intro automatique
  const intro = useIntro(false); // debug à false en production

  useEffect(() => {
    // Play sound only when changing level and not on initial mount
    if (activeLevel && previousLevelRef.current !== activeLevel.id) {
      playEnterLevelSound();
    }
    previousLevelRef.current = activeLevel?.id;
  }, [activeLevel, playEnterLevelSound]);

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

  // Gérer le fade out de la loading bar après que le jeu soit prêt
  useEffect(() => {
    if (!gameReady) return;

    // Laisser le jeu tourner en arrière-plan pendant GAME_WARMUP_TIME
    const warmupTimer = setTimeout(() => {
      setIsLoadingFadingOut(true);

      // Après le fade out, cacher complètement l'overlay
      const fadeOutTimer = setTimeout(() => {
        setShowLoadingOverlay(false);
        
        // NOUVEAU : Déclencher l'intro après que l'overlay de chargement disparaisse
        if (intro.shouldTriggerIntro) {
          console.log("[Game] Déclenchement de l'intro automatique");
          intro.triggerIntroWhenReady(true);
        }
      }, FADE_OUT_DURATION);

      return () => clearTimeout(fadeOutTimer);
    }, GAME_WARMUP_TIME);

    return () => clearTimeout(warmupTimer);
  }, [gameReady, GAME_WARMUP_TIME, FADE_OUT_DURATION, intro]);

  // Combinaison simplifiée pour gérer le chargement du jeu
  useEffect(() => {
    if (!assets.isReady) return;

    // Initialiser le TextContentService avec les assets
    textContentService.initialize(assets);

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
      {/* Le jeu tourne dès qu'il est prêt, même si la loading bar est encore visible */}
      {gameReady && (
        <>
          <GameCanvas>
            <LevelSwitcher />
          </GameCanvas>
          <HUD />
          <DebugNavigationDisplay />
          <DebugStats />
        </>
      )}

      {/* Overlay de chargement avec fade out */}
      {showLoadingOverlay && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
            zIndex: 1000,
            opacity: isLoadingFadingOut ? 0 : 1,
            transition: `opacity ${FADE_OUT_DURATION}ms ease-out`,
            pointerEvents: isLoadingFadingOut ? "none" : "auto",
          }}
        >
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
        </div>
      )}

      <TransitionOverlay />
    </div>
  );
};

export default Game;
