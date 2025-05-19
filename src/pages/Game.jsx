import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { log } from "../utils/logger";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
  BOUNDING_SPHERE_RADIUS,
} from "../components/Game/AdvancedCameraController/navigationConstants";

// Importer le store pour vérifier si un cluster est actif
import useGameStore from "../components/Game/store";

// Importer le service de base de données
import { ensureDatabaseLoaded } from "../components/Game/services/DatabaseService";

// Importer le service de retour à l'accueil
import { initHomeReturnListeners } from "../components/Game/services/HomeReturnService";

// Importer le préchargeur de textures et l'utilitaire de textures
import TexturePreloader from "../components/Game/TexturePreloader";
import { getTexturesToPreload } from "../components/Game/utils/textureUtils";

import GridReferences from "../components/Game/GridReferences";
import Graph from "../components/Game/Graph";
import { loadSpatializedGraph } from "../components/Game/Graph/utils";
import AdvancedCameraController, {
  GamepadIndicator,
} from "../components/Game/AdvancedCameraController/AdvancedCameraController";
import NavigationUI from "../components/Game/NavigationUI";
import SoundPlayer from "../components/Game/SoundPlayer/SoundPlayer";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import Posts from "../components/Game/Posts/Posts";
import SvgPath from "../components/Game/common/SvgPath";
import InteractiveImage from "../components/Game/common/InteractiveImage";
import DistrictLabels from "../components/Game/common/DistrictLabels";
import { BlackHoleEffect } from "../components/Game/common/BlackHoleEffect";
import ShootingStars from "../components/Game/common/ShootingStar";
import Stars from "../components/Game/common/Stars";
import HUD from "../components/Game/HUD/HUD";
import TextPanel from "../components/Game/common/TextPanel";
import LoadingBar from "../components/Game/common/LoadingBar";
import { getSoundPath, getImagePath } from "../utils/assetLoader";

const DEBUG = false;

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

// Liste des trous noirs à ajouter dans l'espace 3D
const BLACK_HOLE = {
  position: [450, 0, 100],
  size: 12,
  particles: 35000,
  rotationSpeed: 0.3,
  spiralTightness: 3.0,
  rotation: [Math.PI / 4, 0, Math.PI / 6], // Rotation sur X et Z
};

const Game = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(true);
  const [explosionCompleted, setExplosionCompleted] = useState(false);
  // Ajouter un état pour suivre le préchargement des textures
  const [texturePreloadingDone, setTexturePreloadingDone] = useState(false);
  // État pour suivre le chargement de la base de données
  const [databaseLoaded, setDatabaseLoaded] = useState(false);

  // Récupérer l'état du cluster actif depuis le store
  const activeClusterId = useGameStore((state) => state.activeClusterId);

  // Vérifier si un cluster est actif
  const hasActiveCluster = activeClusterId !== null;

  // Référence pour la fonction de nettoyage des écouteurs d'événements
  const cleanupListenersRef = useRef(null);

  // Utiliser useRef au lieu de useState pour éviter les re-rendus
  const graphInstanceRef = useRef(null);

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

  // Fonction pour précharger la base de données
  useEffect(() => {
    const loadDatabase = async () => {
      try {
        await ensureDatabaseLoaded();
        setDatabaseLoaded(true);
        console.log("Base de données chargée avec succès");
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la base de données:",
          error
        );
        // Continuer quand même, ce n'est pas critique
        setDatabaseLoaded(true);
      }
    };

    loadDatabase();
  }, []);

  // Initialiser les écouteurs d'événements pour le retour à l'accueil
  useEffect(() => {
    // Initialiser les écouteurs une fois que le jeu est prêt
    if (gameStarted && !isLoading && texturePreloadingDone && databaseLoaded) {
      console.log("Initialisation des écouteurs de retour à l'accueil");
      cleanupListenersRef.current = initHomeReturnListeners();
    }

    // Nettoyer les écouteurs lors du démontage du composant
    return () => {
      if (cleanupListenersRef.current) {
        cleanupListenersRef.current();
        cleanupListenersRef.current = null;
      }
    };
  }, [gameStarted, isLoading, texturePreloadingDone, databaseLoaded]);

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
  const isReady = !isLoading && texturePreloadingDone && databaseLoaded;

  // Liste des textures à précharger
  const texturesToPreload = getTexturesToPreload();

  return (
    <TexturePreloader texturesList={texturesToPreload}>
      {(textureState) => {
        // Utiliser useEffect pour mettre à jour l'état sans causer d'erreurs React
        useEffect(() => {
          if (textureState.loaded && !texturePreloadingDone) {
            // Utiliser un timeout pour éviter les mises à jour pendant le rendu
            const timer = setTimeout(() => {
              setTexturePreloadingDone(true);
            }, 0);
            return () => clearTimeout(timer);
          }
        }, [textureState.loaded, texturePreloadingDone]);

        // Limiter la valeur de progress à 100% maximum
        const progressValue = Math.min(textureState.progress, 100);

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
            {/* Écran de chargement si le jeu n'est pas prêt */}
            {(!isReady || isLoading || !textureState.loaded) && (
              <LoadingBar
                progress={progressValue}
                label="Initializing data galaxy"
                fullScreen={true}
              />
            )}

            {/* Ne montrer le contenu que lorsque tout est chargé */}
            {(isReady || textureState.loaded) && (
              <>
                {/* Composants de son - contrôlés par audioStarted */}
                {audioStarted && (
                  <>
                    <SoundPlayer
                      soundPath={getSoundPath("ambiant.mp3")}
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
                      soundPath={getSoundPath("interview.m4a")}
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
                    position: [0, 0, BASE_CAMERA_DISTANCE],
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
                      debugMode={DEBUG}
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
                          svgPath={getImagePath("joshua-goldberg.svg")}
                          position={portrait.position}
                          size={portrait.size}
                          title={portrait.title}
                          description={portrait.description}
                          boundingBoxSize={portrait.boundingBoxSize}
                          showBoundingBox={DEBUG}
                        />
                      ))}

                      {/* Afficher les catégories dans l'espace 3D */}
                      <DistrictLabels
                        textSize={24}
                        maxDistance={400}
                        minDistance={70}
                      />

                      {/* Ajouter un trou noir animé */}
                      <BlackHoleEffect
                        position={BLACK_HOLE.position}
                        size={BLACK_HOLE.size}
                        particleCount={BLACK_HOLE.particles}
                        rotationSpeed={BLACK_HOLE.rotationSpeed}
                        spiralTightness={BLACK_HOLE.spiralTightness}
                        rotation={BLACK_HOLE.rotation}
                      />

                      {/* Ajouter des étoiles filantes si l'explosion est terminée */}
                      {explosionCompleted && <ShootingStars count={10} />}
                    </>
                  )}

                  {/* Champ d'étoiles en arrière-plan, visible tout le temps */}
                  <Stars count={5000} radius={3000} size={1.2} />

                  {/* Contrôleur de caméra et affichage des informations de navigation */}
                  <AdvancedCameraController />

                  {/* Post-processing pour ajouter des effets visuels */}
                  <EffectComposer>
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
                  </EffectComposer>

                  {/* Stats pour le débogage */}
                  {DEBUG && <Stats />}
                </Canvas>

                {/* Interface utilisateur pour la navigation et le HUD - déplacés en dehors du Canvas */}
                {gameStarted && DEBUG && (
                  <NavigationUI graphRef={graphInstanceRef} />
                )}
                {gameStarted && <HUD />}

                {/* Afficher le panneau de texte informatif en dehors du Canvas */}
                {gameStarted && <TextPanel />}
              </>
            )}
          </div>
        );
      }}
    </TexturePreloader>
  );
};

export default Game;
