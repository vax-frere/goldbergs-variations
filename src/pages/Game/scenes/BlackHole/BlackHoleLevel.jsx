import React, { memo, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import useGameStore, { useActiveLevel } from "../../store";

const BOUNDING_BOX_MARGIN = 200;
const SPHERE_RADIUS = 50;

/**
 * BlackHoleLevel - Displays the black hole level scene
 */
const BlackHoleLevel = memo(() => {
  const camera = useThree((state) => state.camera);
  const returnToWorld = useGameStore((state) => state.returnToWorld);
  const setActiveComponentText = useGameStore(
    (state) => state.setActiveComponentText
  );
  const activeLevel = useActiveLevel();

  // Position initiale du trou noir (depuis le levelData)
  const initialPosition = useMemo(() => {
    if (!activeLevel?.data?.position) return new THREE.Vector3(0, 0, 0);
    const pos = activeLevel.data.position;
    // Convertir le tableau de position en Vector3
    return new THREE.Vector3(
      Array.isArray(pos) ? pos[0] : pos.x || 0,
      Array.isArray(pos) ? pos[1] : pos.y || 0,
      Array.isArray(pos) ? pos[2] : pos.z || 0
    );
  }, [activeLevel]);

  // Créer la géométrie et le matériau de la sphère
  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32),
    []
  );
  const sphereMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.1,
        metalness: 0.8,
        emissive: 0x000000,
      }),
    []
  );

  // Calculer la bounding box du niveau centrée sur la position initiale
  const levelBounds = useMemo(() => {
    const box = new THREE.Box3();
    box.min.set(
      initialPosition.x - BOUNDING_BOX_MARGIN,
      initialPosition.y - BOUNDING_BOX_MARGIN,
      initialPosition.z - BOUNDING_BOX_MARGIN
    );
    box.max.set(
      initialPosition.x + BOUNDING_BOX_MARGIN,
      initialPosition.y + BOUNDING_BOX_MARGIN,
      initialPosition.z + BOUNDING_BOX_MARGIN
    );
    return box;
  }, [initialPosition]);

  // Vérifier si la caméra est en dehors de la bounding box
  useEffect(() => {
    if (!camera || !levelBounds) return;

    const checkBounds = () => {
      const cameraPosition = new THREE.Vector3(
        camera.position.x,
        camera.position.y,
        camera.position.z
      );

      if (!levelBounds.containsPoint(cameraPosition)) {
        returnToWorld();
      }
    };

    const interval = setInterval(checkBounds, 100);

    // Nettoyer le texte du hover en entrant dans le niveau
    setActiveComponentText(null);

    return () => {
      clearInterval(interval);
      setActiveComponentText(null);
    };
  }, [camera, levelBounds, returnToWorld, setActiveComponentText]);

  return (
    <group position={[initialPosition.x, initialPosition.y, initialPosition.z]}>
      {/* Éclairage spécifique pour le trou noir */}
      <ambientLight intensity={1} />
      <pointLight position={[100, 100, 100]} intensity={2} />
      <pointLight position={[-100, -100, -100]} intensity={2} />

      {/* Sphère du trou noir */}
      <mesh geometry={sphereGeometry} material={sphereMaterial}>
        {/* Effet de glow */}
        <mesh scale={1.2}>
          <sphereGeometry args={[SPHERE_RADIUS, 32, 32]} />
          <meshStandardMaterial color={0xffffff} side={THREE.BackSide} />
        </mesh>
      </mesh>
    </group>
  );
});

export default BlackHoleLevel;
