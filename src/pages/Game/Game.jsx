import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
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
import { initializeAssetService } from "./services/AssetService";

import GridReferences from "../../components/GridReferences";
import Graph from "./Graph";
import AdvancedCameraController, {
  GamepadIndicator,
} from "./AdvancedCameraController/AdvancedCameraController";
import DebugNavigationUI from "./AdvancedCameraController/DebugNavigationUI";
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
import useCollisionStore from "./services/CollisionService";
import GameStateManager from "./GameStateManager";
import GameAudio from "./common/GameAudio";

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
  const [gameStarted, setGameStarted] = useState(false);

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

  // Accéder au service de collision
  const collisionService = useCollisionStore();

  // Utiliser useCallback pour stabiliser cette fonction
  const getGraphRef = useCallback((instance) => {
    if (instance) {
      graphInstanceRef.current = instance;
    }
  }, []);

  // Fonction pour charger les données et construire le graphe
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Utiliser le service d'assets pour charger le graphe spatialisé
        const data = await assets.loadGraphData();

        // Mettre à jour l'état du graphe avec les nœuds et liens
        setGraphData(data);
        setIsLoading(false);

        // Configurer initialement le service de collision avec le mode debug
        if (debugMode) {
          collisionService.setDebugMode(true);
        }

        // Démarrer le jeu quand les données sont chargées
        setGameStarted(true);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setIsLoading(false);
      }
    };

    // Ne charger les données que lorsque le service d'assets est prêt
    if (assets.isReady) {
      fetchData();
    }
  }, [assets.isReady, debugMode]); // Dépendre de l'état de préparation des assets

  // Mettre à jour le mode debug du service de collision seulement quand il change
  // et utiliser une référence pour éviter les mises à jour en boucle
  const lastDebugModeRef = useRef(debugMode);
  useEffect(() => {
    // Ne mettre à jour que si le mode debug a vraiment changé
    if (lastDebugModeRef.current !== debugMode) {
      collisionService.setDebugMode(debugMode);
      lastDebugModeRef.current = debugMode;
    }
  }, [debugMode]); // Dépendance stable

  // Déterminer si l'application est prête à être affichée
  // S'assurer que les assets sont chargés ET que le graphe est prêt
  const isReady = !isLoading && assets.isReady && graphData.nodes.length > 0;

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
      {console.log("render")}
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
          label={
            isLoading
              ? "Chargement des données du graphe..."
              : "Initialisation de la galaxie de données"
          }
          fullScreen={true}
        />
      )}

      {/* Ne montrer le contenu que lorsque tout est chargé */}
      {isReady && (
        <>
          {/* Gestionnaire d'état de jeu pour configurer les collisions */}
          <GameStateManager debugMode={debugMode} />

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

            {/* Afficher le Graph quand le jeu a démarré */}
            {gameStarted && (
              <Graph
                ref={getGraphRef}
                graphData={graphData}
                debugMode={debugMode}
              />
            )}

            {/* Ajouter le composant de gestion audio */}
            <GameAudio />

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

                {/* Ajouter des étoiles filantes en permanence */}
                <ShootingStars count={5} />
              </>
            )}

            {/* Champ d'étoiles en arrière-plan, visible tout le temps */}
            <Stars count={2000} radius={3000} size={1.2} />

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
