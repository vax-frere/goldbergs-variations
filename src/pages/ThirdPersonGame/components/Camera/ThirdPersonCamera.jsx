/**
 * Composant ThirdPersonCamera
 * Caméra rigide attachée derrière le joueur (pas de smooth)
 * Style Yume Nikki - FOV réduit pour effet couloir
 */

import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

import { CAMERA_CONFIG } from '../../utils/constants';

const ThirdPersonCamera = ({ 
  targetPositionRef,
  targetRotationRef,
  makeDefault = true 
}) => {
  const cameraRef = useRef();
  const { set } = useThree();

  // Initialiser la caméra
  useEffect(() => {
    if (cameraRef.current) {
      if (makeDefault) {
        set({ camera: cameraRef.current });
      }
    }
  }, [makeDefault, set]);

  // Mise à jour directe de la caméra (pas de smooth) avec refs
  useFrame(() => {
    if (!cameraRef.current || !targetPositionRef?.current || targetRotationRef?.current === undefined) return;

    const distance = CAMERA_CONFIG.DISTANCE;
    const height = CAMERA_CONFIG.HEIGHT_OFFSET;
    const targetPosition = targetPositionRef.current;
    const targetRotation = targetRotationRef.current;
    
    // Position directement derrière le joueur (pas de lerp)
    const offsetX = Math.sin(targetRotation) * distance;
    const offsetZ = Math.cos(targetRotation) * distance;
    
    // Position de la caméra directement calculée
    cameraRef.current.position.set(
      targetPosition.x + offsetX,
      targetPosition.y + height,
      targetPosition.z + offsetZ
    );

    // Position où regarder directement devant le joueur
    const lookAtX = targetPosition.x - Math.sin(targetRotation) * 2;
    const lookAtZ = targetPosition.z - Math.cos(targetRotation) * 2;
    
    // Appliquer directement la rotation (pas de lerp)
    cameraRef.current.lookAt(
      lookAtX,
      targetPosition.y + 1,
      lookAtZ
    );
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault={makeDefault}
      fov={CAMERA_CONFIG.FOV}
      near={CAMERA_CONFIG.NEAR}
      far={CAMERA_CONFIG.FAR}
    />
  );
};

export default ThirdPersonCamera; 