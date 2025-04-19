import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Text,
  PerspectiveCamera,
} from "@react-three/drei";
import { Button, Box } from "@mui/material";
import PageTransition from "../components/PageTransition";

// Composant pour créer un piano stylisé en 3D
const Piano = () => {
  // Piano body
  return (
    <group position={[0, -1, 0]}>
      {/* Piano base (black) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 0.5, 2]} />
        <meshStandardMaterial color="#222222" />
      </mesh>

      {/* White keys */}
      {Array(7)
        .fill()
        .map((_, i) => (
          <mesh key={`white-${i}`} position={[(i - 3) * 0.65, 0.3, 0.6]}>
            <boxGeometry args={[0.6, 0.1, 1.2]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
        ))}

      {/* Black keys */}
      {[-2.35, -1.05, 0.25, 1.55, 2.85].map((x, i) => (
        <mesh key={`black-${i}`} position={[x, 0.35, 0.2]}>
          <boxGeometry args={[0.4, 0.2, 0.8]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
    </group>
  );
};

// Composant de notes musicales flottantes
const FloatingNotes = () => {
  const notes = Array(30)
    .fill()
    .map((_, i) => ({
      position: [
        Math.random() * 20 - 10,
        Math.random() * 10,
        Math.random() * 20 - 10,
      ],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ],
      size: 0.2 + Math.random() * 0.3,
    }));

  return (
    <group>
      {notes.map((note, i) => (
        <Text
          key={i}
          position={note.position}
          rotation={note.rotation}
          fontSize={note.size}
          color="#f5f5f5"
          anchorX="center"
          anchorY="middle"
        >
          {["♩", "♪", "♫", "♬"][Math.floor(Math.random() * 4)]}
        </Text>
      ))}
    </group>
  );
};

const Game = () => {
  const navigate = useNavigate();
  const orbitControlsRef = useRef();
  const [showUI, setShowUI] = useState(true);

  return (
    <PageTransition>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Canvas style={{ background: "#121212" }}>
          <PerspectiveCamera makeDefault position={[0, 2, 8]} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <spotLight
            position={[-10, 10, 10]}
            angle={0.3}
            penumbra={1}
            intensity={1}
          />

          <Piano />
          <FloatingNotes />
          <Stars radius={100} depth={50} count={5000} factor={4} />

          <OrbitControls
            ref={orbitControlsRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
          />
        </Canvas>

        {showUI && (
          <Box
            sx={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => navigate("/")}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: "1.2rem",
                fontWeight: "bold",
                textTransform: "none",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                },
              }}
            >
              Retour à l'accueil
            </Button>

            <Button
              variant="text"
              onClick={() => setShowUI(false)}
              sx={{
                color: "#f5f5f5",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              Masquer l'interface
            </Button>
          </Box>
        )}

        {!showUI && (
          <Button
            variant="text"
            onClick={() => setShowUI(true)}
            sx={{
              position: "absolute",
              bottom: "1rem",
              right: "1rem",
              color: "#f5f5f5",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
              },
            }}
          >
            Afficher l'interface
          </Button>
        )}
      </Box>
    </PageTransition>
  );
};

export default Game;
