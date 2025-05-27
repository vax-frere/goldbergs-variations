import React, { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stats,
  GizmoHelper,
  GizmoViewport,
} from "@react-three/drei";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import VibSvgPath from "./Game/components/VibSvgPath";
import ShootingStars from "./Game/scenes/WorldLevel/components/ShootingStars";
import Stars from "./Game/components/Stars";
import EffectRenderer from "./Game/components/EffectRenderer";
import useEffectStore from "./Game/services/EffectService";

// Simple lighting setup
const Lighting = () => {
  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight intensity={0.4} />

      {/* Directional light as main light source */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Point light for additional highlights */}
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
    </>
  );
};

// Joshua character in the center with music notes effect
const JoshuaCharacter = () => {
  const triggerMusicNotesEffect = useEffectStore(
    (state) => state.triggerMusicNotesEffect
  );
  const stopEffect = useEffectStore((state) => state.stopEffect);

  // Instancier l'effet de notes de musique en continu
  const musicNotesEffectId = useMemo(() => {
    const effectId = triggerMusicNotesEffect(
      { x: 0, y: 0, z: 0 }, // Position au centre avec Joshua
      {
        continuous: true, // Mode continu
        duration: 8.0,
        noteCount: 4,
        spawnInterval: 1.0,
        noteLifetime: 5.0,
        movementRadius: 50.0,
        movementSpeed: 2.0,
        noteScale: 0.3,
        opacity: 0.2,
        color: [1.0, 1.0, 0.8], // Légèrement doré
      }
    );

    console.log(
      "[JoshuaCharacter] Effet de notes de musique continu instancié:",
      effectId
    );
    return effectId;
  }, [triggerMusicNotesEffect]);

  // Cleanup au démontage du composant
  useEffect(() => {
    return () => {
      if (musicNotesEffectId) {
        console.log(
          "[JoshuaCharacter] Arrêt de l'effet de notes de musique:",
          musicNotesEffectId
        );
        stopEffect(musicNotesEffectId);
      }
    };
  }, [musicNotesEffectId, stopEffect]);

  return (
    <VibSvgPath
      svgPath="joshua-goldberg.svg"
      position={[0, 0, 0]}
      size={300}
      color="white"
      lineWidth={2}
      isBillboard={true}
      vibrationIntensity={5}
      vibrationSpeed={2}
      onError={(err) => {
        console.error("[Playground] Erreur de chargement SVG joshua:", err);
      }}
    />
  );
};

// Loading fallback
const LoadingFallback = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" wireframe />
    </mesh>
  );
};

const Playground = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ position: "relative", width: "100vw", height: "100vh" }}>
        {/* Title overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            color: "white",
            pointerEvents: "none",
          }}
        >
          <Typography variant="h4" component="h1">
            Playground 3D
          </Typography>
        </Box>

        {/* 3D Canvas */}
        <Canvas
          camera={{
            position: [0, 0, 500],
            fov: 75,
            near: 0.1,
            far: 10000,
          }}
          style={{ background: "#000" }}
        >
          {/* Lighting */}
          <Lighting />

          {/* Renderer des effets visuels - à l'intérieur du Canvas */}
          <EffectRenderer />

          {/* Orbit Controls with better settings */}
          <OrbitControls
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={50}
            maxDistance={1500}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={1}
            panSpeed={0.8}
          />

          {/* Gizmo Helper for orientation */}
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport
              axisColors={["red", "green", "blue"]}
              labelColor="white"
            />
          </GizmoHelper>

          {/* FPS Stats */}
          <Stats />

          {/* Background Stars */}
          <Stars count={2000} radius={3000} size={3.0} />

          {/* Shooting Stars */}
          <ShootingStars
            count={6}
            sphereRadius={800}
            innerRadius={400}
            targetRadius={100}
            spawnInterval={{ min: 2, max: 5 }}
          />

          {/* Main content with Suspense for loading */}
          <Suspense fallback={<LoadingFallback />}>
            <JoshuaCharacter />
          </Suspense>
        </Canvas>
      </Box>
    </motion.div>
  );
};

export default Playground;
