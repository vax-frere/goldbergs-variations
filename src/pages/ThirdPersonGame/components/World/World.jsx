/**
 * Composant World - Environnement 3D du jeu
 * Style Yume Nikki : Géométrie simple, couleurs pastel, éclairage flat
 */

import React from 'react';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import { WORLD_CONFIG, COLORS } from '../../utils/constants';

const World = () => {
  return (
    <group>
      {/* Sol principal */}
      <Floor />
      
      {/* Murs de délimitation */}
      <Walls />
      
      {/* Portes mystérieuses disposées en cercle */}
      <DreamDoors />
    </group>
  );
};

/**
 * Composant Floor - Sol texturé style Yume Nikki
 */
const Floor = () => {
  return (
    <mesh 
      position={[0, -0.1, 0]} 
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow={false} // Pas d'ombres pour le style flat
    >
      <planeGeometry args={[WORLD_CONFIG.FLOOR_SIZE, WORLD_CONFIG.FLOOR_SIZE]} />
      <meshBasicMaterial 
        color={COLORS.FLOOR}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Composant Walls - Murs de délimitation avec collisions
 */
const Walls = () => {
  const halfSize = WORLD_CONFIG.FLOOR_SIZE / 2;
  const wallHeight = WORLD_CONFIG.WALL_HEIGHT;
  const thickness = WORLD_CONFIG.WALL_THICKNESS;

  return (
    <group>
      {/* Mur Nord */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, -halfSize]}>
          <boxGeometry args={[WORLD_CONFIG.FLOOR_SIZE, wallHeight, thickness]} />
          <meshBasicMaterial color={COLORS.WALLS} />
        </mesh>
      </RigidBody>

      {/* Mur Sud */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, halfSize]}>
          <boxGeometry args={[WORLD_CONFIG.FLOOR_SIZE, wallHeight, thickness]} />
          <meshBasicMaterial color={COLORS.WALLS} />
        </mesh>
      </RigidBody>

      {/* Mur Est */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[halfSize, wallHeight / 2, 0]}>
          <boxGeometry args={[thickness, wallHeight, WORLD_CONFIG.FLOOR_SIZE]} />
          <meshBasicMaterial color={COLORS.WALLS} />
        </mesh>
      </RigidBody>

      {/* Mur Ouest */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-halfSize, wallHeight / 2, 0]}>
          <boxGeometry args={[thickness, wallHeight, WORLD_CONFIG.FLOOR_SIZE]} />
          <meshBasicMaterial color={COLORS.WALLS} />
        </mesh>
      </RigidBody>
    </group>
  );
};

/**
 * Composant DreamDoors - Portes disposées en cercle comme dans Yume Nikki 3D
 */
const DreamDoors = () => {
  const doors = [];
  const doorCount = 8; // 8 portes autour du centre
  const radius = 12; // Rayon du cercle de portes
  
  // Couleurs pastel pour les portes (style Yume Nikki)
  const doorColors = [
    '#E8B5D6', // Rose pastel
    '#B5D6E8', // Bleu pastel
    '#D6E8B5', // Vert pastel
    '#E8D6B5', // Jaune pastel
    '#D6B5E8', // Violet pastel
    '#B5E8D6', // Cyan pastel
    '#E8B5B5', // Rouge pastel
    '#C8C8E8', // Lavande pastel
  ];

  for (let i = 0; i < doorCount; i++) {
    const angle = (i / doorCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    doors.push(
      <DreamDoor
        key={i}
        position={[x, 0, z]}
        rotation={[0, -angle - Math.PI/2, 0]} // Face vers le centre (ajout de PI pour compenser l'orientation par défaut)
        color={doorColors[i]}
        doorId={i}
      />
    );
  }

  return <group>{doors}</group>;
};

/**
 * Composant individuel DreamDoor - Une porte mystérieuse style Yume Nikki
 */
const DreamDoor = ({ position, rotation, color, doorId }) => {
  const doorWidth = 1.5;
  const doorHeight = 3;
  const doorDepth = 0.2;
  
  return (
    <group position={position} rotation={rotation}>
      {/* Cadre de la porte */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, doorHeight / 2, 0]}>
          <boxGeometry args={[doorWidth, doorHeight, doorDepth]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </RigidBody>
      
      {/* Poignée de porte */}
      <mesh position={[doorWidth * 0.3, doorHeight * 0.5, doorDepth / 2 + 0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#8B7355" />
      </mesh>
      
      {/* Décoration centrale mystérieuse */}
      <mesh position={[0, doorHeight * 0.6, doorDepth / 2 + 0.02]}>
        <circleGeometry args={[0.2, 8]} />
        <meshBasicMaterial color="#FFFFFF" opacity={0.7} transparent />
      </mesh>
      
      {/* Petit symbole au centre */}
      <mesh position={[0, doorHeight * 0.6, doorDepth / 2 + 0.03]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshBasicMaterial color="#4A4A4A" />
      </mesh>
    </group>
  );
};

export default World; 