import React, { Suspense, useEffect, useMemo, useState } from "react";
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
import { useRetroWindowService } from "./Game/services/RetroWindowService";
import RetroWindowManager from "./Game/components/HUD/components/RetroWindowManager";

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
  const triggerMusicNotesEffect = useEffectStore((state) => state.triggerMusicNotesEffect);
  const activeEffects = useEffectStore((state) => state.activeEffects);

  // Déclencher des effets de notes de musique périodiquement (avec limite)
  useEffect(() => {
    const interval = setInterval(() => {
      // Limiter le nombre d'effets actifs pour éviter le spam
      if (activeEffects.length >= 8) {
        return; // Ne pas créer de nouveaux effets si on a déjà 8 effets actifs
      }

      // Ajouter un effet de note de musique à une position aléatoire autour de Joshua
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -10 + Math.random() * 20;

      triggerMusicNotesEffect(
        { x, y, z },
        {
          duration: 2.0 + Math.random() * 1.0,
          maxScale: 3.0 + Math.random() * 2.0,
          color: [
            0.8 + Math.random() * 0.2,
            0.6 + Math.random() * 0.4,
            1.0,
          ],
          opacity: 0.7,
        }
      );
    }, 1500 + Math.random() * 2000); // Intervalle plus long pour éviter le spam

    return () => clearInterval(interval);
  }, [triggerMusicNotesEffect, activeEffects.length]);

  return (
    <group position={[0, 0, 0]}>
      <VibSvgPath
        svgPath="joshua-goldberg.svg"
        size={200}
        color="white"
        lineWidth={2}
        isBillboard={true}
        vibrationIntensity={3}
        vibrationSpeed={2}
      />
    </group>
  );
};

// Loading fallback component
const LoadingFallback = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="white" wireframe />
    </mesh>
  );
};

const Playground = () => {
  const retroWindowService = useRetroWindowService();

  // Initialiser le service et les fenêtres par défaut
  useEffect(() => {
    retroWindowService.initialize();

    // Ouvrir les fenêtres par défaut avec un délai pour l'effet
    setTimeout(() => {
      retroWindowService.openWindow({
        id: 'welcome_window',
        title: "Bienvenue dans le Playground",
        width: 400,
        height: 300,
        content: `Bienvenue dans le Playground 3D !

Cette page utilise maintenant le RetroWindowService.

Fonctionnalités :
- Three.js + React Three Fiber
- Contrôles de caméra OrbitControls
- Système d'effets visuels
- Fenêtres rétro avec animations fluides

Utilisez les contrôles de la souris pour naviguer dans la scène 3D.
Cliquez sur "Nouvelle fenêtre" pour tester le service !`
      });
    }, 500);

    return () => {
      retroWindowService.cleanup();
    };
  }, [retroWindowService]);

  const addNewWindow = () => {
    const examples = [
      {
        title: "Exemple String Simple",
        content: `PLAYGROUND SYSTEM v3.0

Status: OPERATIONAL
Framework: React Three Fiber
Renderer: WebGL
Animation: Framer Motion

Features:
- Service-based window management
- Automatic centering
- Smooth animations
- Drag & drop support
- Multiple window support

Memory Usage: 42.3 MB
GPU: Accelerated
Performance: OPTIMAL

Ready for experimentation.`
      },
      {
        title: "Contrôles 3D",
        content: `CONTRÔLES DE LA SCÈNE

Souris :
• Clic gauche + glisser : Rotation
• Molette : Zoom  
• Clic droit + glisser : Pan

Éléments visibles :
• Joshua au centre (vibrant)
• 2000 étoiles en arrière-plan
• 6 étoiles filantes aléatoires
• Effets de notes de musique

Toutes les fenêtres sont déplaçables !`
      },
      {
        title: "Informations Système",
        content: `DIAGNOSTIC SYSTÈME

Playground 3D interactif avec :
- Three.js + React Three Fiber
- Contrôles OrbitControls
- Système d'effets visuels
- Fenêtres rétro déplaçables

Style rétro Windows 95/98
Animations Framer Motion
Service-based architecture

Toutes les fenêtres sont déplaçables en cliquant sur leur barre de titre.`
      }
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    
    retroWindowService.openWindow({
      id: `window_${Date.now()}`,
      title: randomExample.title,
      width: 400,
      height: 300,
      content: randomExample.content
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
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

        {/* Bouton pour ajouter une nouvelle fenêtre */}
        <Box
          sx={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 10,
          }}
        >
          <button
            onClick={addNewWindow}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '2px solid #ffffff',
              padding: '8px 16px',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Nouvelle fenêtre
          </button>
        </Box>

        {/* Gestionnaire des fenêtres rétro */}
        <RetroWindowManager />

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
