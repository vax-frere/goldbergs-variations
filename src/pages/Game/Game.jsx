import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { log } from "../../utils/logger";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
  BOUNDING_SPHERE_RADIUS,
} from "./AdvancedCameraController/navigationConstants";

// Importer le hook de mode debug
import useDebugMode from "../../hooks/useDebugMode";

// Importer le store pour vérifier si un cluster est actif
import useGameStore from "./store";

// Importer le nouveau service d'assets
import useAssets from "../../hooks/useAssets";
import { initializeAssetService } from "../../services/AssetService";

import GridReferences from "../../components/GridReferences";
import Graph from "./Graph";
import { loadSpatializedGraph } from "./Graph/utils";
import AdvancedCameraController, {
  GamepadIndicator,
} from "./AdvancedCameraController/AdvancedCameraController";
import DebugNavigationUI from "./AdvancedCameraController/DebugNavigationUI";
import SoundPlayer from "./common/SoundPlayer";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import Posts from "./Posts/Posts";
import SvgPath from "./common/SvgPath";
import InteractiveImage from "./common/InteractiveImage";
import DistrictLabels from "./common/DistrictLabels";
import { BlackHoleEffect } from "./common/BlackHoleEffect";
import ShootingStars from "./common/ShootingStar";
import Stars from "./common/Stars";
import HUD from "./HUD/HUD";
import TextPanel from "./common/TextPanel";
import LoadingBar from "./common/LoadingBar";

// Liste des portraits interactifs de Joshua
const INTERACTIVE_PORTRAITS = [
  {
    id: "joshua-center",
    position: [0, 0, 0],
    size: 300,
    title: "Joshua Goldberg",
    description:
      "Étude sur l'identité en ligne et l'extrémisme numérique. Les travaux de Joshua Goldberg ont permis de comprendre les mécanismes de radicalisation sur les plateformes sociales.",
    boundingBoxSize: 200,
  },
  // {
  //   id: "joshua-left",
  //   position: [-400, 100, -200],
  //   size: 250,
  //   title: "L'Infiltration Numérique",
  //   description:
  //     "Joshua Goldberg a créé de multiples personnalités en ligne pour infiltrer différentes communautés extrémistes. Cette méthode controversée a soulevé des questions éthiques importantes sur les limites de la recherche.",
  //   boundingBoxSize: 150,
  // },
  // {
  //   id: "joshua-right",
  //   position: [400, -50, -150],
  //   size: 220,
  //   title: "Impact Médiatique",
  //   description:
  //     "L'affaire Goldberg a révélé la fragilité des écosystèmes d'information et la facilité avec laquelle un seul individu peut manipuler plusieurs communautés en ligne simultanément.",
  //   boundingBoxSize: 180,
  // },
];

const Game = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(true);
  const [explosionCompleted, setExplosionCompleted] = useState(false);

  // Utiliser notre hook de mode debug
  const [debugMode, toggleDebugMode] = useDebugMode(false);

  // Récupérer l'état du cluster actif depuis le store
  const activeClusterId = useGameStore((state) => state.activeClusterId);

  // Vérifier si un cluster est actif
  const hasActiveCluster = activeClusterId !== null;

  // Utiliser useRef au lieu de useState pour éviter les re-rendus
  const graphInstanceRef = useRef(null);

  // Utiliser notre nouveau hook pour les assets
  const assets = useAssets({ autoInit: true });

  // Utiliser useCallback pour stabiliser cette fonction
  const getGraphRef = useCallback((instance) => {
    if (instance) {
      log("Référence du graphe obtenue");
      graphInstanceRef.current = instance;
    }
  }, []);

  // Fonction pour démarrer l'audio immédiatement
  const startAudio = useCallback(() => {
    setAudioStarted(true);
    console.log("Audio démarré");
  }, []);

  // Fonction pour charger les données et construire le graphe
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Utiliser notre nouvelle fonction pour charger les données spatialisées
        const data = await loadSpatializedGraph();

        // Mettre à jour l'état du graphe avec les nœuds et liens
        setGraphData(data);
        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Effet pour gérer le délai de l'explosion
  useEffect(() => {
    if (gameStarted) {
      const timer = setTimeout(() => {
        setExplosionCompleted(true);
        console.log("Explosion terminée, étoiles filantes activées");
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [gameStarted]);

  // Déterminer si l'application est prête à être affichée
  const isReady = !isLoading && assets.isReady;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      {/* Indicateur visuel du mode debug */}
      {debugMode && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            background: "rgba(255, 0, 0, 0.7)",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          MODE DEBUG (Appuyez sur P pour désactiver)
        </div>
      )}

      {/* Écran de chargement si le jeu n'est pas prêt */}
      {!isReady && (
        <LoadingBar
          progress={assets.progress}
          label="Initializing data galaxy"
          fullScreen={true}
        />
      )}

      {/* Ne montrer le contenu que lorsque tout est chargé */}
      {isReady && (
        <>
          {/* Composants de son - contrôlés par audioStarted */}
          {audioStarted && (
            <>
              <SoundPlayer
                soundPath={assets.getSoundPath("ambiant.mp3")}
                defaultVolume={0.1}
                loop={true}
                autoPlay={true}
                displayControls={false}
                controlPosition={{ top: "20px", right: "20px" }}
                tooltipLabels={{
                  mute: "Couper le son",
                  unmute: "Activer le son",
                }}
              />
              <SoundPlayer
                soundPath={assets.getSoundPath("interview.m4a")}
                defaultVolume={0.7}
                loop={true}
                autoPlay={true}
                displayControls={false}
                controlPosition={{ top: "20px", right: "80px" }}
                tooltipLabels={{
                  mute: "Couper l'interview",
                  unmute: "Activer l'interview",
                }}
              />
            </>
          )}

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
            {/* Éclairage global */}
            <ambientLight intensity={0.6} color="#ffffff" />
            <directionalLight
              position={[100, 100, 100]}
              intensity={0.8}
              color="#f0f0ff"
            />

            {/* Utiliser notre nouveau composant Graph au lieu de ForceGraph */}
            {gameStarted && (
              <Graph
                ref={getGraphRef}
                graphData={graphData}
                debugMode={debugMode}
              />
            )}

            {/* Ajouter le composant Posts pour afficher les publications */}
            {/* {gameStarted && (
              <Posts
                renderer="sphere"
                explosionDuration={5}
                explosionStagger={0.01}
                explosionPathVariation={0.3}
              />
            )} */}

            {/* Groupe des éléments spéciaux (masqués lorsqu'un cluster est actif) */}
            {gameStarted && !hasActiveCluster && (
              <>
                {/* Ajouter les portraits interactifs de Joshua */}
                {INTERACTIVE_PORTRAITS.map((portrait) => (
                  <InteractiveImage
                    key={portrait.id}
                    id={portrait.id}
                    svgPath={assets.getImagePath("joshua-goldberg.svg")}
                    position={portrait.position}
                    size={portrait.size}
                    title={portrait.title}
                    description={portrait.description}
                    boundingBoxSize={portrait.boundingBoxSize}
                    showBoundingBox={debugMode}
                  />
                ))}

                {/* Afficher les catégories dans l'espace 3D */}
                <DistrictLabels />

                {/* Ajouter un trou noir animé */}
                <BlackHoleEffect
                  position={[450, 0, 100]}
                  size={12}
                  particleCount={15000}
                  rotationSpeed={0.3}
                  spiralTightness={3.0}
                  rotation={[Math.PI / 4, 0, Math.PI / 6]}
                />

                {/* Ajouter des étoiles filantes si l'explosion est terminée */}
                {explosionCompleted && <ShootingStars count={5} />}
              </>
            )}

            {/* Champ d'étoiles en arrière-plan, visible tout le temps */}
            <Stars count={2000} radius={3000} size={1.2} />

            {/* Contrôleur de caméra et affichage des informations de navigation */}
            <AdvancedCameraController />

            {/* Post-processing pour ajouter des effets visuels */}
            {/* <EffectComposer>
              <Bloom
                intensity={0.15}
                luminanceThreshold={0.01}
                luminanceSmoothing={0.03}
              />
              <ToneMapping
                exposure={1.5} // Augmente la luminosité générale
                gamma={0.8} // Contraste
                vignette={0.5} // Assombrit les bords
              />
            </EffectComposer> */}

            {/* Stats pour le débogage */}
            {debugMode && <Stats />}
          </Canvas>

          {/* Interface utilisateur pour la navigation et le HUD - déplacés en dehors du Canvas */}
          {gameStarted && debugMode && (
            <DebugNavigationUI graphRef={graphInstanceRef} />
          )}
          {gameStarted && <HUD />}

          {/* Afficher le panneau de texte informatif en dehors du Canvas */}
          {gameStarted && <TextPanel />}
        </>
      )}
    </div>
  );
};

export default Game;
