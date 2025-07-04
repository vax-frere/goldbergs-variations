/**
 * Jeu Third Person avec style Yume Nikki
 * Architecture SOLID avec séparation des responsabilités
 */

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

// Composants
import Player from './components/Player/Player';
import World from './components/World/World';
import ThirdPersonCamera from './components/Camera/ThirdPersonCamera';

// Systèmes
import { inputSystem } from './systems/InputSystem';
import { physicsSystem } from './systems/PhysicsSystem';

// Hooks
import { useGameState } from './hooks/useGameState';

// Styles
import './ThirdPersonGame.css';

const ThirdPersonGame = () => {
  const gameState = useGameState();
  
  // Utiliser des refs au lieu de states pour éviter les re-renders à 60fps
  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const playerRotationRef = useRef(0);
  
  // States seulement pour l'affichage debug (mise à jour moins fréquente)
  const [debugPosition, setDebugPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [debugRotation, setDebugRotation] = useState(0);

  // Gestion des systèmes
  useEffect(() => {
    inputSystem.activate();
    physicsSystem.activate();
    
    return () => {
      inputSystem.deactivate();
      physicsSystem.deactivate();
    };
  }, []);

  // Mise à jour debug moins fréquente (pour éviter spam UI)
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugPosition(playerPositionRef.current.clone());
      setDebugRotation(playerRotationRef.current);
    }, 100); // Mise à jour debug toutes les 100ms seulement

    return () => clearInterval(interval);
  }, []);

  // Gestionnaires pour les events du joueur (plus de setState)
  const handlePlayerPositionChange = (newPosition) => {
    playerPositionRef.current.copy(newPosition);
  };

  const handlePlayerRotationChange = (newRotation) => {
    playerRotationRef.current = newRotation;
  };

  return (
    <div className="third-person-game">
      {/* Interface utilisateur */}
      <div className="game-ui">
        <div className="controls-help">
          <h3>Contrôles (AZERTY)</h3>
          <div className="controls-grid">
            <div className="control-group">
              <strong>Mouvement:</strong>
              <p>Z - Avancer</p>
              <p>S - Reculer</p>
              <p>Q - Strafe gauche</p>
              <p>D - Strafe droite</p>
            </div>
            <div className="control-group">
              <strong>Caméra/Rotation:</strong>
              <p>Souris - Regarder/Tourner</p>
              <p>Clic - Capturer souris</p>
              <p>Échap - Libérer souris</p>
            </div>
            <div className="control-group">
              <strong>Debug:</strong>
              <p>P - Télécharger spritesheet</p>
              <p>Colliders visibles (wireframes)</p>
            </div>
          </div>
        </div>
        
        <div className="game-info">
          <p>Position: ({debugPosition.x.toFixed(2)}, {debugPosition.z.toFixed(2)})</p>
          <p>Rotation: {(debugRotation * 180 / Math.PI).toFixed(1)}°</p>
        </div>
      </div>

      {/* Scène 3D */}
      <Canvas
        className="game-canvas"
        gl={{
          antialias: false, // Style pixelisé Yume Nikki
          alpha: false,
        }}
        shadows={false}
        onCreated={({ gl }) => {
          // Configuration pour le style Yume Nikki
          gl.setPixelRatio(1);
          gl.setClearColor('#F5F0E8'); // Couleur de fond pastel
        }}
      >
        {/* Éclairage ambiant uniforme (pas d'ombres) */}
        <ambientLight intensity={0.8} color="#F5F0E8" />
        <directionalLight
          intensity={0.3}
          position={[10, 10, 5]}
          color="#FFFFFF"
          castShadow={false}
        />

        {/* Caméra qui suit le joueur et tourne avec lui */}
        <ThirdPersonCamera 
          targetPositionRef={playerPositionRef}
          targetRotationRef={playerRotationRef}
          makeDefault={true}
        />

        {/* Monde physique avec Rapier */}
        <Physics 
          debug={true} // Colliders visibles pour le debug
          gravity={[0, 0, 0]} // Pas de gravité (jeu top-down-ish)
        >
          {/* Monde */}
          <World />

          {/* Joueur */}
          <Player
            position={[0, 0, 0]}
            onPositionChange={handlePlayerPositionChange}
            onRotationChange={handlePlayerRotationChange}
          />
        </Physics>
      </Canvas>
    </div>
  );
};

export default ThirdPersonGame; 