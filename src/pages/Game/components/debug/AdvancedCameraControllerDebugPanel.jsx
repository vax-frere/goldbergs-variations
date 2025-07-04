import { useState, useEffect } from "react";
// We can't use useThree here as AdvancedCameraControllerDebugPanel is outside the Canvas
// import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  BOUNDING_SPHERE_RADIUS,
  ACCELERATION_DISTANCE_THRESHOLD,
  AUTO_ROTATE_DELAY,
  AUTO_ORBIT_DELAY,
  INPUT_ACTIONS,
} from "../AdvancedCameraController/navigationConstants";
import { useCameraMetrics, METRIC_TYPES } from "../../services/CameraMetricsManager";

// Simplified UI component for flight mode only
export const AdvancedCameraControllerDebugPanel = ({ graphRef }) => {
  // **NOUVEAU SYSTÈME PRODUCTION GRADE** - Utiliser le CameraMetricsManager
  const cameraMetrics = useCameraMetrics([
    METRIC_TYPES.SPEED,
    METRIC_TYPES.POSITION,
    METRIC_TYPES.DISTANCE_TO_CENTER,
    METRIC_TYPES.ACCELERATION,
    METRIC_TYPES.FLIGHT_STATE
  ], { throttle: 100 }); // 10 FPS pour le debug

  // États legacy pour les données non encore migrées
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExportButton, setShowExportButton] = useState(false);
  const [cameraMode, setCameraMode] = useState("Normal");
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 });
  const [timeBeforeAutoRotate, setTimeBeforeAutoRotate] = useState(null);
  const [timeBeforeAutoOrbit, setTimeBeforeAutoOrbit] = useState(null);
  const [activeDevice, setActiveDevice] = useState("keyboard");
  const [deviceConfig, setDeviceConfig] = useState(null);

  // Extraire les métriques du nouveau système
  const cameraSpeed = cameraMetrics[METRIC_TYPES.SPEED] || 0;
  const cameraPosition = cameraMetrics[METRIC_TYPES.POSITION] ? {
    x: parseFloat(cameraMetrics[METRIC_TYPES.POSITION].x.toFixed(2)),
    y: parseFloat(cameraMetrics[METRIC_TYPES.POSITION].y.toFixed(2)),
    z: parseFloat(cameraMetrics[METRIC_TYPES.POSITION].z.toFixed(2))
  } : { x: 0, y: 0, z: 0 };
  const distanceToCenter = cameraMetrics[METRIC_TYPES.DISTANCE_TO_CENTER] || 0;
  const accelerationFactor = cameraMetrics[METRIC_TYPES.ACCELERATION] || 1;

  // Listen to animation state exposed by camera controller and update positions
  useEffect(() => {
    // Create a function to listen to animation state and position
    const updateCameraInfo = () => {
      // Update transition state
      if (window.__cameraAnimating !== undefined) {
        setIsTransitioning(window.__cameraAnimating);
      }

      // Update camera mode
      if (window.__orbitModeActive !== undefined) {
        setCameraMode(
          window.__orbitModeActive
            ? "Auto Orbit"
            : window.__cameraAnimating
            ? "Transition"
            : "Normal"
        );
      } else {
        setCameraMode(window.__cameraAnimating ? "Transition" : "Normal");
      }

      // Update time remaining before auto-orbit
      if (window.__timeBeforeAutoOrbit !== undefined) {
        setTimeBeforeAutoOrbit(window.__timeBeforeAutoOrbit);
      }

      // Use the remaining time to calculate time before auto-rotate
      if (window.__lastInteractionTime !== undefined) {
        const elapsedTime = Date.now() - window.__lastInteractionTime;
        const timeBeforeRotate = Math.max(0, AUTO_ROTATE_DELAY - elapsedTime);
        setTimeBeforeAutoRotate(timeBeforeRotate);
      }

      // **MÉTRIQUES MAINTENANT GÉRÉES PAR LE NOUVEAU SYSTÈME**
      // Position, vitesse, distance et accélération viennent du CameraMetricsManager
      
      // Update camera target if available (pas encore migré)
      if (window.__cameraTarget) {
        setCameraTarget({
          x: parseFloat(window.__cameraTarget.x.toFixed(2)),
          y: parseFloat(window.__cameraTarget.y.toFixed(2)),
          z: parseFloat(window.__cameraTarget.z.toFixed(2)),
        });
      }

      // Update active device information
      if (window.__activeDeviceInFlight) {
        setActiveDevice(window.__activeDeviceInFlight);
      }

      if (window.__deviceConfig) {
        setDeviceConfig(window.__deviceConfig);
      }

      // Show export button once data is loaded
      if (
        graphRef &&
        graphRef.current &&
        graphRef.current.graphData &&
        graphRef.current.graphData.nodes &&
        graphRef.current.graphData.nodes.length > 0
      ) {
        setShowExportButton(true);
      }
    };

    // Regularly check animation state and position
    const intervalId = setInterval(updateCameraInfo, 100);
    return () => clearInterval(intervalId);
  }, [graphRef]);

  // Determine mode color based on state
  const getModeColor = () => {
    if (cameraMode === "Auto Orbit") return "#00aaff";
    if (cameraMode === "Transition") return "#ffcc00";
    return "#4CAF50"; // Normal mode
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>
        🎮 Flight Controller Debug
      </h3>

      {/* Mode and Device Status */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Status</div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <span>Mode:</span>
          <span
            style={{
              backgroundColor: getModeColor(),
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              color: "#fff",
            }}
          >
            {cameraMode}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Device:</span>
          <span
            style={{
              backgroundColor:
                activeDevice === "gamepad" ? "#00aaff" : "#4CAF50",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              color: "#fff",
              textTransform: "capitalize",
            }}
          >
            {activeDevice}
          </span>
        </div>
      </div>

      {/* Device Configuration */}
      {deviceConfig && (
        <div
          style={{
            marginBottom: "12px",
            padding: "8px",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "3px",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
            Device Config
          </div>
          <div style={{ fontSize: "10px", color: "#ccc" }}>
            <div>Acceleration: {deviceConfig.acceleration}</div>
            <div>Max Speed: {deviceConfig.maxSpeed}</div>
            <div>Rotation: {deviceConfig.rotationSpeed}</div>
            <div>Deceleration: {deviceConfig.deceleration}</div>
          </div>
        </div>
      )}

      {/* Camera Position */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Position</div>
        
        {/* Camera Coordinates */}
        <div style={{ marginBottom: "6px" }}>
          <div style={{ fontSize: "9px", color: "#888", marginBottom: "2px" }}>Camera:</div>
          <div style={{ fontSize: "10px", color: "#ccc", display: "flex", justifyContent: "space-between" }}>
            <span>X: <span style={{ color: "#ff6b6b" }}>{cameraPosition.x}</span></span>
            <span>Y: <span style={{ color: "#4CAF50" }}>{cameraPosition.y}</span></span>
            <span>Z: <span style={{ color: "#00aaff" }}>{cameraPosition.z}</span></span>
          </div>
        </div>

        {/* Distance with indicator */}
        <div style={{ marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "10px", color: "#ccc" }}>
              Distance:{" "}
              <span
                style={{
                  color:
                    distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.8
                      ? "#ff6b6b"
                      : distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.7
                      ? "#ffcc00"
                      : "#4CAF50",
                  fontWeight: "bold",
                }}
              >
                {distanceToCenter}
              </span>
            </div>
            {distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.8 && (
              <div style={{ 
                fontSize: "8px", 
                color: "#ff6b6b", 
                backgroundColor: "rgba(255, 107, 107, 0.2)",
                padding: "1px 4px",
                borderRadius: "2px"
              }}>
                Limit: {BOUNDING_SPHERE_RADIUS}
              </div>
            )}
          </div>
          {/* Distance progress bar */}
          <div
            style={{
              width: "100%",
              height: "3px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              marginTop: "3px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${Math.min(100, (distanceToCenter / BOUNDING_SPHERE_RADIUS) * 100)}%`,
                backgroundColor:
                  distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.8
                    ? "rgba(255, 107, 107, 0.8)"
                    : distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.7
                    ? "rgba(255, 204, 0, 0.8)"
                    : "rgba(76, 175, 80, 0.8)",
                borderRadius: "2px",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
        </div>

        {/* Target Coordinates */}
        <div>
          <div style={{ fontSize: "9px", color: "#888", marginBottom: "2px" }}>Target:</div>
          <div style={{ fontSize: "10px", color: "#999", display: "flex", justifyContent: "space-between" }}>
            <span>X: <span style={{ color: "#ff9999" }}>{cameraTarget.x}</span></span>
            <span>Y: <span style={{ color: "#99ff99" }}>{cameraTarget.y}</span></span>
            <span>Z: <span style={{ color: "#9999ff" }}>{cameraTarget.z}</span></span>
          </div>
        </div>
      </div>

      {/* Movement Info */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>Movement</div>
        
        {/* Speed */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ fontSize: "10px", color: "#ccc", minWidth: "60px" }}>
            Speed:{" "}
            <span
              style={{
                color:
                  cameraSpeed > 200
                    ? "#ff6b6b"
                    : cameraSpeed > 100
                    ? "#ffcc00"
                    : "#4CAF50",
                fontWeight: cameraSpeed > 100 ? "bold" : "normal",
              }}
            >
              {cameraSpeed}
            </span>
            <span style={{ fontSize: "8px", color: "#999" }}> u/s</span>
          </div>
          <div
            style={{
              flex: 1,
              height: "4px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              marginLeft: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${Math.min(100, (cameraSpeed / 300) * 100)}%`,
                backgroundColor:
                  cameraSpeed > 200
                    ? "rgba(255, 107, 107, 0.8)"
                    : cameraSpeed > 100
                    ? "rgba(255, 204, 0, 0.8)"
                    : "rgba(76, 175, 80, 0.8)",
                borderRadius: "2px",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
        </div>

        {/* Acceleration */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontSize: "10px", color: "#ccc", minWidth: "60px" }}>
            Accel:{" "}
            <span
              style={{
                color:
                  accelerationFactor > 1
                    ? `rgba(0, 170, 255, ${Math.min(
                        1,
                        (accelerationFactor - 1) / 2
                      )})`
                    : "#ffffff",
                fontWeight: accelerationFactor > 1 ? "bold" : "normal",
              }}
            >
              {accelerationFactor.toFixed(1)}x
            </span>
            {accelerationFactor > 2.5 && (
              <span style={{ fontSize: "8px", color: "#00aaff" }}> Fast</span>
            )}
            {accelerationFactor > 1 && accelerationFactor <= 2.5 && (
              <span style={{ fontSize: "8px", color: "#00aaff" }}> Boost</span>
            )}
          </div>
          <div
            style={{
              flex: 1,
              height: "4px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              marginLeft: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${Math.max(0, Math.min(100, ((accelerationFactor - 1) / 2) * 100))}%`,
                backgroundColor: "rgba(0, 170, 255, 0.8)",
                borderRadius: "2px",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Controls ({activeDevice === "gamepad" ? "Gamepad" : "Keyboard"})
        </div>
        <div style={{ fontSize: "10px", color: "#ccc" }}>
          {activeDevice === "gamepad" ? (
            // Gamepad controls
            <>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#00aaff" }}>Left Stick:</span> Movement
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#00aaff" }}>Right Stick:</span> Look Around
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#00aaff" }}>R2/L2:</span> Up/Down
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#00aaff" }}>R1/L1:</span> Roll
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#00aaff" }}>A:</span> Interact | <span style={{ color: "#00aaff" }}>B:</span> Home
              </div>
            </>
          ) : (
            // Keyboard controls
            <>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#4CAF50" }}>WASD/Arrows:</span> Movement
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#4CAF50" }}>Mouse:</span> Look Around
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#4CAF50" }}>{INPUT_ACTIONS.MOVE_UP.key}/{INPUT_ACTIONS.MOVE_UP.keyAlt}:</span> Up | <span style={{ color: "#4CAF50" }}>{INPUT_ACTIONS.MOVE_DOWN.key}/{INPUT_ACTIONS.MOVE_DOWN.keyAlt}:</span> Down
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#4CAF50" }}>Q/E:</span> Roll
              </div>
              <div style={{ marginBottom: "2px" }}>
                <span style={{ color: "#4CAF50" }}>{INPUT_ACTIONS.INTERACT.key}:</span> Interact | <span style={{ color: "#4CAF50" }}>{INPUT_ACTIONS.RETURN_HOME.key}:</span> Home
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Timers (always visible to maintain consistent height) */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Auto-Timers
        </div>
        <div style={{ fontSize: "10px", minHeight: "32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {cameraMode === "Normal" ? (
            // Normal mode - show active timers
            <div style={{ color: "#ccc" }}>
              {/* Auto-rotation timer */}
              <div style={{ marginBottom: "2px" }}>
                {timeBeforeAutoRotate !== null && timeBeforeAutoRotate > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Rotation:</span>
                    <span
                      style={{
                        backgroundColor: "rgba(255, 204, 0, 0.3)",
                        padding: "1px 4px",
                        borderRadius: "2px",
                        fontSize: "9px",
                        color: "#ffcc00",
                      }}
                    >
                      {Math.ceil(timeBeforeAutoRotate / 1000)}s
                    </span>
                  </div>
                ) : (
                  <div style={{ color: "#ffcc00", fontSize: "9px" }}>
                    Auto-rotation active
                  </div>
                )}
              </div>

              {/* Auto-orbit timer */}
              <div>
                {timeBeforeAutoOrbit !== null && timeBeforeAutoOrbit > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Orbit:</span>
                    <span
                      style={{
                        backgroundColor: "rgba(0, 170, 255, 0.3)",
                        padding: "1px 4px",
                        borderRadius: "2px",
                        fontSize: "9px",
                        color: "#00aaff",
                      }}
                    >
                      {Math.ceil(timeBeforeAutoOrbit / 1000)}s
                    </span>
                  </div>
                ) : (
                  <div style={{ color: "#00aaff", fontSize: "9px" }}>
                    Auto-orbit available
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Other modes - show status
            <div style={{ color: "#666", textAlign: "center" }}>
              <div style={{ fontSize: "9px", marginBottom: "2px" }}>
                {cameraMode === "Transition" ? "Timers paused during transition" : 
                 cameraMode === "Auto Orbit" ? "Auto-orbit mode active" : "Timers disabled"}
              </div>
              <div style={{ fontSize: "8px", color: "#555" }}>
                Return to Normal mode to see timers
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status (always visible to maintain consistent height) */}
      <div
        style={{
          padding: "8px",
          backgroundColor: isTransitioning 
            ? "rgba(255, 204, 0, 0.2)" 
            : cameraMode === "Auto Orbit" 
            ? "rgba(0, 170, 255, 0.2)"
            : "rgba(76, 175, 80, 0.1)",
          borderRadius: "3px",
          border: isTransitioning 
            ? "1px solid rgba(255, 204, 0, 0.3)"
            : cameraMode === "Auto Orbit"
            ? "1px solid rgba(0, 170, 255, 0.3)"
            : "1px solid rgba(76, 175, 80, 0.2)",
          minHeight: "24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div 
          style={{ 
            fontWeight: "bold", 
            color: isTransitioning 
              ? "#ffcc00" 
              : cameraMode === "Auto Orbit" 
              ? "#00aaff"
              : "#4CAF50", 
            fontSize: "11px",
            width: "100%",
            textAlign: "center",
          }}
        >
          {isTransitioning 
            ? "⚡ Transition in progress..." 
            : cameraMode === "Auto Orbit"
            ? "🔄 Auto orbit active"
            : "✅ Flight mode ready"}
        </div>
      </div>
    </div>
  );
};

export default AdvancedCameraControllerDebugPanel;
