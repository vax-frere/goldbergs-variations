/**
 * Examples of how to use the vibration helpers
 * These show how to refactor existing components
 */

import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  useVibrationSystem,
  useVibrationAnimation,
  precomputeVibrationStates,
  updateGeometryPositions,
  VIBRATION_PATTERNS,
} from "./vibrationHelpers";

/**
 * Example 1: Simple vibrating line (like AdvancedVibLink simplified)
 */
export const SimpleVibLine = ({
  points,
  vibrationIntensity = 0.1,
  vibrationSpeed = 1,
}) => {
  const lineRef = useRef();
  const { animateVibration, registerGeometry, clearGeometries } =
    useVibrationSystem({
      vibrationSpeed,
      preserveZ: false, // For 3D lines
    });

  useEffect(() => {
    if (!lineRef.current || !points?.length) return;

    clearGeometries();

    // Convert Three.js Vector3 to simple objects if needed
    const simplePoints = points.map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));

    registerGeometry(
      lineRef.current.geometry,
      simplePoints,
      vibrationIntensity,
      VIBRATION_PATTERNS.SPATIAL
    );
  }, [points, vibrationIntensity]);

  useFrame(animateVibration);

  if (!points?.length) return null;

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z || 0]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="white" />
    </line>
  );
};

/**
 * Example 2: Manual control (like VibSvgPath approach)
 */
export const ManualVibControl = ({
  geometries,
  originalPointsArray,
  vibrationIntensity = 0.1,
  vibrationSpeed = 1,
}) => {
  const vibrationStatesRef = useRef([]);
  const { updateVibration } = useVibrationAnimation({ vibrationSpeed });

  // Pre-compute states when data changes
  useEffect(() => {
    if (!originalPointsArray?.length) return;

    vibrationStatesRef.current = originalPointsArray.map((points) =>
      precomputeVibrationStates(
        points,
        vibrationIntensity,
        8,
        VIBRATION_PATTERNS.PLANAR
      )
    );
  }, [originalPointsArray, vibrationIntensity]);

  useFrame((state) => {
    updateVibration(state.clock.getElapsedTime(), (currentState) => {
      geometries.forEach((geometry, index) => {
        const vibrationState =
          vibrationStatesRef.current[index]?.[currentState];
        if (vibrationState) {
          updateGeometryPositions(geometry, vibrationState, true); // preserveZ for 2D
        }
      });
    });
  });

  return null; // This is just a controller component
};

/**
 * Example 3: Custom vibration pattern
 */
export const CustomPatternVib = ({ points, intensity = 0.1 }) => {
  const lineRef = useRef();

  // Define a custom pattern - only horizontal vibration
  const HORIZONTAL_ONLY = {
    dimensions: 2,
    directions: [{ axis: "x", weight: 1 }],
  };

  const { animateVibration, registerGeometry } = useVibrationSystem({
    vibrationSpeed: 2, // Faster vibration
    baseFPS: 15, // Higher FPS for smoother effect
  });

  useEffect(() => {
    if (!lineRef.current || !points?.length) return;

    registerGeometry(
      lineRef.current.geometry,
      points,
      intensity,
      HORIZONTAL_ONLY // Use custom pattern
    );
  }, [points, intensity]);

  useFrame(animateVibration);

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, 0]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="red" />
    </line>
  );
};

/**
 * Example 4: Multiple objects with different patterns
 */
export const MultiVibSystem = ({
  linesData, // Array of { points, intensity, pattern }
  vibrationSpeed = 1,
}) => {
  const lineRefs = useRef([]);
  const { animateVibration, registerGeometry, clearGeometries } =
    useVibrationSystem({
      vibrationSpeed,
    });

  useEffect(() => {
    if (!linesData?.length) return;

    clearGeometries();

    linesData.forEach((lineData, index) => {
      const lineRef = lineRefs.current[index];
      if (lineRef?.current) {
        registerGeometry(
          lineRef.current.geometry,
          lineData.points,
          lineData.intensity,
          lineData.pattern || VIBRATION_PATTERNS.PLANAR
        );
      }
    });
  }, [linesData]);

  useFrame(animateVibration);

  return (
    <group>
      {linesData.map((lineData, index) => (
        <line
          key={index}
          ref={(el) => (lineRefs.current[index] = { current: el })}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={lineData.points.length}
              array={
                new Float32Array(
                  lineData.points.flatMap((p) => [p.x, p.y, p.z || 0])
                )
              }
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={lineData.color || "white"} />
        </line>
      ))}
    </group>
  );
};
