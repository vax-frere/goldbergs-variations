import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";

// Default constants for the animation
const DEFAULT_DURATION = 0.6; // seconds
const DEFAULT_COLOR = [1.0, 1.0, 1.0]; // Pure white
const DEFAULT_OPACITY_START = 0.5;
const DEFAULT_MAX_SCALE = 1.3;
const DEFAULT_MIN_THICKNESS = 0.1;
const DEFAULT_MAX_THICKNESS = 0.01;

/**
 * Component that creates an expanding pulse effect
 * Pure presentational component that shows a pulsing ring effect
 *
 * @param {Object} props
 * @param {[number, number, number]} props.position - Position where the effect should appear
 * @param {boolean} props.active - Whether the effect is currently active
 * @param {number} [props.size=3] - Base size of the effect
 * @param {[number, number, number]} [props.color=[1.0, 1.0, 1.0]] - RGB color of the effect
 * @param {number} [props.opacity=0.8] - Starting opacity of the effect
 * @param {Function} [props.onAnimationComplete] - Callback when animation completes
 */
const NodeHoverEffect = ({
  position,
  active = false,
  size = 3,
  color = DEFAULT_COLOR,
  opacity = DEFAULT_OPACITY_START,
  onAnimationComplete,
}) => {
  // Ref for the group containing the effect
  const groupRef = useRef();

  // Animation state for the effect
  const [isAnimating, setIsAnimating] = useState(false);

  // Track if we've processed the current activation state
  const lastActiveStateRef = useRef(false);

  // Refs for the single ring
  const ringRef = useRef({
    ref: useRef(),
    material: useRef(),
    geometry: useRef(),
    progress: 0,
  });

  // Time tracking
  const timeRef = useRef(0);

  // Effect to handle activation at each visit
  useEffect(() => {
    // Détecter un changement d'état d'active
    if (active !== lastActiveStateRef.current) {
      lastActiveStateRef.current = active;

      // Si on vient d'activer le nœud, lancer l'animation
      if (active) {
        // Démarrer une nouvelle animation
        setIsAnimating(true);
        timeRef.current = 0;
        ringRef.current.progress = 0;
      }
    }
  }, [active]);

  // Animation logic
  useFrame((_, delta) => {
    if (!position || !groupRef.current || !isAnimating) return;

    // Update overall time
    timeRef.current += delta;

    // Calculate progress
    const progress = Math.min(1.0, timeRef.current / DEFAULT_DURATION);
    ringRef.current.progress = progress;

    if (ringRef.current.ref.current && ringRef.current.material.current) {
      // Scale based on progress with easing
      const scale = size * (1 + easeOutCubic(progress) * DEFAULT_MAX_SCALE);
      ringRef.current.ref.current.scale.set(scale, scale, 1);

      // Decreasing opacity as it expands
      const currentOpacity = opacity * (1 - easeInQuad(progress));
      ringRef.current.material.current.opacity = currentOpacity;

      // Calculate current thickness based on progress
      const currentThickness =
        DEFAULT_MIN_THICKNESS +
        progress * (DEFAULT_MAX_THICKNESS - DEFAULT_MIN_THICKNESS);

      // Update ring geometry with new thickness
      if (ringRef.current.ref.current.geometry) {
        // Avoid re-creating geometry too often by chunking updates
        if (Math.round(progress * 10) % 2 === 0) {
          // Dispose of old geometry to prevent memory leaks
          if (ringRef.current.geometry.current) {
            ringRef.current.geometry.current.dispose();
          }

          // Create new geometry with updated thickness
          const innerRadius = 1.0 - currentThickness;
          ringRef.current.geometry.current = new THREE.RingGeometry(
            innerRadius,
            1.0,
            32
          );
          ringRef.current.ref.current.geometry =
            ringRef.current.geometry.current;
        }
      }
    }

    // Stop animation when complete
    if (progress >= 1.0) {
      setIsAnimating(false);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }
  });

  // Helper easing functions
  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function easeInQuad(x) {
    return x * x;
  }

  // Don't render if no position
  if (!position) return null;

  return (
    <group position={position} ref={groupRef}>
      <Billboard follow={true}>
        <mesh
          ref={ringRef.current.ref}
          renderOrder={100}
          scale={[size, size, 1]}
        >
          <ringGeometry
            args={[1.0 - DEFAULT_MIN_THICKNESS, 1.0, 32]}
            ref={ringRef.current.geometry}
          />
          <meshBasicMaterial
            ref={ringRef.current.material}
            color={new THREE.Color(color[0], color[1], color[2])}
            transparent={true}
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
    </group>
  );
};

export default NodeHoverEffect;
