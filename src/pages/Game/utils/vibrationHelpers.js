/**
 * Vibration Effects Helpers
 * Utilities for creating vibration effects on Three.js geometries
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// Default vibration patterns
export const VIBRATION_PATTERNS = {
  // 2D vibration (for SVG-like elements)
  PLANAR: {
    dimensions: 2,
    directions: [
      { axis: "x", weight: 1 },
      { axis: "y", weight: 1 },
      { axis: "xy", weight: 0.7 }, // Diagonal
      { axis: "xy-neg", weight: 0.7 }, // Diagonal inverse
    ],
  },

  // 3D vibration (for 3D links/objects)
  SPATIAL: {
    dimensions: 3,
    directions: [
      { axis: "x", weight: 1 },
      { axis: "y", weight: 1 },
      { axis: "z", weight: 1 },
      { axis: "xy", weight: 0.7 },
      { axis: "xz", weight: 0.7 },
      { axis: "yz", weight: 0.7 },
    ],
  },

  // Subtle vibration (for delicate elements)
  SUBTLE: {
    dimensions: 2,
    directions: [
      { axis: "x", weight: 0.5 },
      { axis: "y", weight: 0.5 },
    ],
  },
};

/**
 * Generate a single vibrated point based on original point and pattern
 * @param {Object} originalPoint - Original point {x, y, z?, vibrationWeight?}
 * @param {number} intensity - Vibration intensity
 * @param {Object} pattern - Vibration pattern from VIBRATION_PATTERNS
 * @returns {Object} Vibrated point
 */
export const generateVibratedPoint = (
  originalPoint,
  intensity,
  pattern = VIBRATION_PATTERNS.PLANAR
) => {
  const newPoint = { ...originalPoint };
  const direction = Math.floor(Math.random() * pattern.directions.length);
  const displacement = intensity * (Math.random() > 0.5 ? 1 : -1);
  const selectedDirection = pattern.directions[direction];
  const weight = selectedDirection.weight;

  // Apply vibrationWeight if present (for variable intensity along a line)
  const finalIntensity =
    displacement * weight * (originalPoint.vibrationWeight || 1);

  switch (selectedDirection.axis) {
    case "x":
      newPoint.x += finalIntensity;
      break;
    case "y":
      newPoint.y += finalIntensity;
      break;
    case "z":
      if (newPoint.z !== undefined) {
        newPoint.z += finalIntensity;
      }
      break;
    case "xy":
      newPoint.x += finalIntensity;
      newPoint.y += finalIntensity;
      break;
    case "xy-neg":
      newPoint.x += finalIntensity;
      newPoint.y -= finalIntensity;
      break;
    case "xz":
      newPoint.x += finalIntensity;
      if (newPoint.z !== undefined) {
        newPoint.z += finalIntensity;
      }
      break;
    case "yz":
      newPoint.y += finalIntensity;
      if (newPoint.z !== undefined) {
        newPoint.z += finalIntensity;
      }
      break;
  }

  return newPoint;
};

/**
 * Pre-compute vibration states for a set of points
 * @param {Array} originalPoints - Array of original points
 * @param {number} intensity - Vibration intensity
 * @param {number} statesCount - Number of states to pre-compute
 * @param {Object} pattern - Vibration pattern
 * @returns {Array} Array of vibration states
 */
export const precomputeVibrationStates = (
  originalPoints,
  intensity,
  statesCount = 8,
  pattern = VIBRATION_PATTERNS.PLANAR
) => {
  const states = [];

  for (let stateIndex = 0; stateIndex < statesCount; stateIndex++) {
    const statePositions = originalPoints.map((point) =>
      generateVibratedPoint(point, intensity, pattern)
    );
    states.push(statePositions);
  }

  return states;
};

/**
 * Custom hook for vibration animation
 * @param {Object} options - Configuration options
 * @returns {Object} Animation state and update function
 */
export const useVibrationAnimation = ({
  vibrationSpeed = 1,
  statesCount = 8,
  baseFPS = 10,
} = {}) => {
  const lastUpdateRef = useRef(0);
  const currentStateRef = useRef(0);
  const BASE_UPDATE_INTERVAL = 1000 / baseFPS;

  const updateVibration = (elapsedTime, updateCallback) => {
    const now = elapsedTime * 1000;
    const updateInterval = BASE_UPDATE_INTERVAL / vibrationSpeed;

    if (now - lastUpdateRef.current < updateInterval) return false;

    lastUpdateRef.current = now;
    currentStateRef.current = (currentStateRef.current + 1) % statesCount;

    if (updateCallback) {
      updateCallback(currentStateRef.current);
    }

    return true;
  };

  return {
    currentState: currentStateRef.current,
    updateVibration,
    resetState: () => {
      currentStateRef.current = 0;
    },
  };
};

/**
 * Update Three.js geometry positions with vibrated points
 * @param {THREE.BufferGeometry} geometry - Three.js geometry to update
 * @param {Array} vibratedPoints - Array of vibrated points
 * @param {boolean} preserveZ - Whether to preserve Z coordinate (for 2D vibrations)
 */
export const updateGeometryPositions = (
  geometry,
  vibratedPoints,
  preserveZ = false
) => {
  if (!geometry?.attributes?.position) return;

  const positions = geometry.attributes.position;

  for (let i = 0; i < vibratedPoints.length && i < positions.count; i++) {
    const point = vibratedPoints[i];
    positions.setXYZ(
      i,
      point.x,
      point.y,
      preserveZ ? positions.getZ(i) : point.z || 0
    );
  }

  positions.needsUpdate = true;
};

/**
 * Optimized batch update for multiple geometries
 * @param {Array} geometries - Array of geometries to update
 * @param {Array} vibrationStates - Array of vibration states for each geometry
 * @param {number} currentState - Current state index
 * @param {boolean} preserveZ - Whether to preserve Z coordinates
 */
export const batchUpdateGeometries = (
  geometries,
  vibrationStates,
  currentState,
  preserveZ = false
) => {
  geometries.forEach((geometry, index) => {
    const vibrationState = vibrationStates[index]?.[currentState];
    if (vibrationState) {
      updateGeometryPositions(geometry, vibrationState, preserveZ);
    }
  });
};

/**
 * Higher-level hook that combines vibration animation with geometry updates
 * @param {Object} options - Configuration options
 * @returns {Object} Complete vibration system
 */
export const useVibrationSystem = ({
  vibrationSpeed = 1,
  statesCount = 8,
  baseFPS = 10,
  preserveZ = false,
} = {}) => {
  const geometriesRef = useRef([]);
  const vibrationStatesRef = useRef([]);
  const { updateVibration } = useVibrationAnimation({
    vibrationSpeed,
    statesCount,
    baseFPS,
  });

  // Use this in useFrame
  const animateVibration = (state) => {
    updateVibration(state.clock.getElapsedTime(), (currentState) => {
      batchUpdateGeometries(
        geometriesRef.current,
        vibrationStatesRef.current,
        currentState,
        preserveZ
      );
    });
  };

  // Helper to register a new geometry with its vibration states
  const registerGeometry = (geometry, originalPoints, intensity, pattern) => {
    const states = precomputeVibrationStates(
      originalPoints,
      intensity,
      statesCount,
      pattern
    );
    geometriesRef.current.push(geometry);
    vibrationStatesRef.current.push(states);
    return geometriesRef.current.length - 1; // Return index for potential cleanup
  };

  // Helper to clear all registered geometries
  const clearGeometries = () => {
    geometriesRef.current = [];
    vibrationStatesRef.current = [];
  };

  return {
    animateVibration,
    registerGeometry,
    clearGeometries,
    geometriesRef,
    vibrationStatesRef,
  };
};
