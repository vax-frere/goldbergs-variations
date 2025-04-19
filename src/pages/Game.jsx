import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Text,
  PerspectiveCamera,
} from "@react-three/drei";
import { Box } from "@mui/material";
import PageTransition from "../components/PageTransition";

// Composant pour créer un piano stylisé en 3D
const Piano = () => {
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
  const orbitControlsRef = useRef();

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
      </Box>
    </PageTransition>
  );
};

export default Game;
