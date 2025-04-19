import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import PageTransition from "../components/PageTransition";
import { log } from "../utils/logger";

import GridReferences from "../components/Game/GridReferences";
import {
  loadGraphData,
  getNodesWithPositions,
} from "../components/Game/utils/graphDataUtils";
import ForceGraph from "../components/Game/ForceGraph";

const Game = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const orbitControlsRef = useRef();

  // Utiliser useRef au lieu de useState pour éviter les re-rendus
  const graphInstanceRef = useRef(null);

  // Utiliser useCallback pour stabiliser cette fonction
  const getGraphRef = useCallback((instance) => {
    if (instance) {
      log("Référence du graphe obtenue");
      graphInstanceRef.current = instance;
    }
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
      <Canvas style={{ background: "#121212", width: "100%", height: "100%" }}>
        <PerspectiveCamera
          makeDefault
          position={[0, 0, 500]}
          near={0.1}
          far={100000}
        />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight
          position={[-10, 10, 10]}
          angle={0.3}
          penumbra={1}
          intensity={1}
        />
        <Stats />

        {/* Passer les données du graphe directement au composant ForceGraph */}
        <ForceGraph ref={getGraphRef} graphData={graphData} />

        <OrbitControls
          ref={orbitControlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />

        <GridReferences
          rotationInterval={20}
          maxRotation={180}
          circleRadii={[50, 100, 150, 200, 250]}
          opacity={0.3}
        />
      </Canvas>
    </div>
  );
};

export default Game;
