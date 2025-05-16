import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { log } from "../utils/logger";
import {
  CAMERA_FOV,
  BASE_CAMERA_DISTANCE,
} from "../components/Game/AdvancedCameraController/navigationConstants";

import GridReferences from "../components/Game/GridReferences";
import {
  loadGraphData,
  getNodesWithPositions,
} from "../components/Game/Graph/utils/graphDataUtils";
import ForceGraph from "../components/Game/Graph/ForceGraph";
import AdvancedCameraController, {
  GamepadIndicator,
  CrosshairIndicator,
} from "../components/Game/AdvancedCameraController/AdvancedCameraController";
import NavigationUI from "../components/Game/NavigationUI";
import SoundPlayer from "../components/Game/SoundPlayer/SoundPlayer";
import {
  EffectComposer,
  Bloom,
  ToneMapping,
} from "@react-three/postprocessing";
import Posts from "../components/Game/Posts/Posts";
import SvgSprite from "../components/Game/common/SvgSprite";
import Text3D from "../components/Game/Text3D";

const DEBUG = false;

// Liste des catégories à afficher dans l'espace 3D
const CATEGORIES = [
  { text: "Libertarians", position: [500, 200, -300] },
  {
    text: "Antisystem",
    position: [-400, 300, 200],
  },
  {
    text: "Conservatives",
    position: [300, -200, 400],
  },
  {
    text: "Nationalists",
    position: [-500, -150, -250],
  },
  {
    text: "Religious",
    position: [200, 400, 300],
  },
  { text: "Culture", position: [-300, 100, 500] },
  { text: "Social justice", position: [-200, -300, 100] },
];

const Game = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameStarted, setGameStarted] = useState(true);
  const [audioStarted, setAudioStarted] = useState(true);

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

  // Fonction pour charger les données et construire le graphe
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Utiliser la fonction utilitaire pour charger les données et construire le graphe
        const data = await loadGraphData();

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
      {/* Composants de son - contrôlés par audioStarted */}
      {audioStarted && (
        <>
          <SoundPlayer
            soundPath={`${import.meta.env.BASE_URL}sounds/ambiant.mp3`}
            defaultVolume={0.1}
            loop={true}
            autoPlay={true}
            displayControls={false}
            controlPosition={{ top: "20px", right: "20px" }}
            tooltipLabels={{ mute: "Couper le son", unmute: "Activer le son" }}
          />
          <SoundPlayer
            soundPath={`${import.meta.env.BASE_URL}sounds/interview.m4a`}
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
        style={{ background: "#000", width: "100%", height: "100%" }}
        camera={{
          position: [0, 0, BASE_CAMERA_DISTANCE],
          fov: CAMERA_FOV,
          near: 0.1,
          far: 1000000,
        }}
      >
        {/* Passer les données du graphe directement au composant ForceGraph */}
        {gameStarted && <ForceGraph ref={getGraphRef} graphData={graphData} />}

        {/* Ajouter le composant SVG au centre du monde */}
        {gameStarted && (
          <>
            <SvgSprite
              svgPath={`${import.meta.env.BASE_URL}img/joshua-goldberg.svg`}
              size={300}
              position={[0, 0, 0]}
              isBillboard={false}
              opacity={1}
            />

            {/* Afficher les catégories dans l'espace 3D */}
            {CATEGORIES.map((category, index) => (
              <Text3D
                key={index}
                text={category.text}
                position={category.position}
                size={15}
                color="#ffffff"
                maxDistance={1000}
                minDistance={500}
              />
            ))}
          </>
        )}

        {/* Ajouter le composant Posts qui chargera ses propres données */}
        {gameStarted && <Posts renderer="sphere" />}

        {/* Remplacer OrbitControls par AdvancedCameraController */}
        {gameStarted && <AdvancedCameraController />}

        {/* <GridReferences
          rotationInterval={20}
          maxRotation={180}
          circleRadii={[BASE_LEVEL_SIZE]}
          opacity={0.3}
        /> */}
        <ambientLight intensity={10.5} />
        {/* <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
        /> */}
        <EffectComposer>
          {/* <ToneMapping exposure={1.0} mode={THREE.ReinhardToneMapping} /> */}
          {/* <Bloom intensity={0.25} threshold={0.28} radius={0.48} /> */}
        </EffectComposer>
      </Canvas>

      {/* Ajouter NavigationUI en dehors du Canvas */}
      {DEBUG && <Stats />}
      {gameStarted && DEBUG && <NavigationUI graphRef={graphInstanceRef} />}

      {/* Indicateur de manette connectée */}
      {gameStarted && <GamepadIndicator />}

      {/* Viseur pour le mode vol */}
      {gameStarted && <CrosshairIndicator />}
    </div>
  );
};

export default Game;
