import { useState, useEffect } from "react";
// We can't use useThree here as DebugNavigationUI is outside the Canvas
// import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  BOUNDING_SPHERE_RADIUS,
  ACCELERATION_DISTANCE_THRESHOLD,
  AUTO_ROTATE_DELAY,
  AUTO_ORBIT_DELAY,
  INPUT_ACTIONS,
} from "./navigationConstants";

// Simplified UI component for flight mode only
export const DebugNavigationUI = ({ graphRef }) => {
  // const { camera } = useThree(); // This hook can't be used here
  // Access global state to know animation status
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showExportButton, setShowExportButton] = useState(false);
  const [cameraMode, setCameraMode] = useState("Normal");
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [cameraTarget, setCameraTarget] = useState({ x: 0, y: 0, z: 0 });
  const [distanceToCenter, setDistanceToCenter] = useState(0);
  const [timeBeforeAutoRotate, setTimeBeforeAutoRotate] = useState(null);
  const [timeBeforeAutoOrbit, setTimeBeforeAutoOrbit] = useState(null);
  const [accelerationFactor, setAccelerationFactor] = useState(1);
  const [cameraSpeed, setCameraSpeed] = useState(0);
  const [activeDevice, setActiveDevice] = useState("keyboard");
  const [deviceConfig, setDeviceConfig] = useState(null);

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

      // Update camera position if available
      if (window.__cameraPosition) {
        setCameraPosition({
          x: parseFloat(window.__cameraPosition.x.toFixed(2)),
          y: parseFloat(window.__cameraPosition.y.toFixed(2)),
          z: parseFloat(window.__cameraPosition.z.toFixed(2)),
        });

        // Calculate distance to center (0,0,0)
        const position = new Vector3(
          window.__cameraPosition.x,
          window.__cameraPosition.y,
          window.__cameraPosition.z
        );
        const distance = position.length();
        setDistanceToCenter(parseFloat(distance.toFixed(2)));
      }

      // Update camera target if available
      if (window.__cameraTarget) {
        setCameraTarget({
          x: parseFloat(window.__cameraTarget.x.toFixed(2)),
          y: parseFloat(window.__cameraTarget.y.toFixed(2)),
          z: parseFloat(window.__cameraTarget.z.toFixed(2)),
        });
      }

      // Update acceleration factor if available
      if (window.__accelerationFactor) {
        setAccelerationFactor(window.__accelerationFactor);
      }

      // Update camera speed if available
      if (window.__cameraSpeed) {
        setCameraSpeed(parseFloat(window.__cameraSpeed.toFixed(2)));
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
    <div
      style={{
        position: "absolute",
        bottom: "60px",
        left: "25px",
        color: "white",
        padding: "10px",
        background: "rgba(0,0,0,0.7)",
        borderRadius: "5px",
        fontSize: "14px",
        zIndex: 1000,
        width: "320px",
      }}
    >
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>Free Flight Mode</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              backgroundColor:
                activeDevice === "gamepad" ? "#00aaff" : "#4CAF50",
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "11px",
              color: "#fff",
              textTransform: "capitalize",
            }}
          >
            {activeDevice}
          </span>
          <span
            style={{
              backgroundColor: getModeColor(),
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#fff",
            }}
          >
            {cameraMode}
          </span>
        </div>
      </div>

      {/* Device configuration display */}
      {deviceConfig && (
        <div
          style={{
            fontSize: "11px",
            backgroundColor: "rgba(0,100,200,0.2)",
            padding: "6px",
            borderRadius: "4px",
            marginBottom: "8px",
            border: "1px solid rgba(0,170,255,0.3)",
          }}
        >
          <div
            style={{
              marginBottom: "3px",
              fontWeight: "bold",
              color: "#00aaff",
            }}
          >
            Device Config ({activeDevice}):
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2px",
            }}
          >
            <span>Acceleration: {deviceConfig.acceleration}</span>
            <span>Max Speed: {deviceConfig.maxSpeed}</span>
            <span>Rotation: {deviceConfig.rotationSpeed}</span>
            <span>Deceleration: {deviceConfig.deceleration}</span>
          </div>
        </div>
      )}

      {/* Camera information display */}
      <div
        style={{
          fontSize: "12px",
          backgroundColor: "rgba(0,0,0,0.4)",
          padding: "8px",
          borderRadius: "4px",
          marginBottom: "10px",
        }}
      >
        <div style={{ marginBottom: "5px" }}>
          <strong>Camera position:</strong>
          X: {cameraPosition.x}, Y: {cameraPosition.y}, Z: {cameraPosition.z}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Distance to center:</strong>
          <span
            style={{
              color:
                distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.8
                  ? "#ff6b6b"
                  : distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.7
                  ? "#ffcc00"
                  : "#4CAF50",
            }}
          >
            {distanceToCenter}
          </span>
          {distanceToCenter > BOUNDING_SPHERE_RADIUS * 0.8 && (
            <span style={{ color: "#ff6b6b" }}>
              {" "}
              (Limit: {BOUNDING_SPHERE_RADIUS})
            </span>
          )}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Direction:</strong>
          X: {cameraTarget.x}, Y: {cameraTarget.y}, Z: {cameraTarget.z}
        </div>
        <div style={{ marginBottom: "5px" }}>
          <strong>Speed:</strong>
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
            {cameraSpeed} units/s
          </span>
          {/* Speed progress bar */}
          <div
            style={{
              width: "100%",
              height: "4px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              marginTop: "3px",
              position: "relative",
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
        <div style={{ marginBottom: "5px" }}>
          <strong>Acceleration factor:</strong>
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
            {accelerationFactor.toFixed(2)}x
            {accelerationFactor > 2.5 && " (Fast Mode)"}
            {accelerationFactor > 1 &&
              accelerationFactor <= 2.5 &&
              " (Acceleration)"}
          </span>
          {/* Acceleration progress bar */}
          <div
            style={{
              width: "100%",
              height: "4px",
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: "2px",
              marginTop: "3px",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${((accelerationFactor - 1) / 2) * 100}%`,
                backgroundColor: "rgba(0, 170, 255, 0.8)",
                borderRadius: "2px",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {isTransitioning ? (
        <div style={{ color: "#ffcc00" }}>Transition in progress...</div>
      ) : (
        <div style={{ fontSize: "12px", opacity: 0.8 }}>
          <p>
            <strong>Flight controls:</strong>
            <br />
            WASD/Arrows: Movement
            <br />
            {`${INPUT_ACTIONS.MOVE_UP.key}/${INPUT_ACTIONS.MOVE_UP.keyAlt}: Up | ${INPUT_ACTIONS.MOVE_DOWN.key}/${INPUT_ACTIONS.MOVE_DOWN.keyAlt}: Down`}
            <br />
            Q/E: Rotation | Z/X: Pitch | R/F: Roll
          </p>
          <p>
            <strong>Actions:</strong>
            <br />
            {`${INPUT_ACTIONS.INTERACT.key}/${INPUT_ACTIONS.INTERACT.gamepad}: Interact | ${INPUT_ACTIONS.RETURN_HOME.key}/${INPUT_ACTIONS.RETURN_HOME.gamepad}: Return Home`}
          </p>

          {/* Auto-rotation and auto-orbit timers */}
          {cameraMode === "Normal" && (
            <>
              {/* Auto-rotation timer */}
              {timeBeforeAutoRotate !== null && timeBeforeAutoRotate > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "8px",
                    color: "#ffcc00",
                  }}
                >
                  <strong style={{ marginRight: "8px" }}>
                    Auto-rotation in:
                  </strong>
                  <div
                    style={{
                      backgroundColor: "rgba(255, 204, 0, 0.2)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      minWidth: "50px",
                      textAlign: "center",
                    }}
                  >
                    {Math.ceil(timeBeforeAutoRotate / 1000)}s
                  </div>
                </div>
              ) : (
                <p style={{ color: "#ffcc00" }}>
                  Auto-rotation active after {AUTO_ROTATE_DELAY / 1000}s of
                  inactivity
                </p>
              )}

              {/* Auto-orbit timer */}
              {timeBeforeAutoOrbit !== null && timeBeforeAutoOrbit > 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "8px",
                    color: "#00aaff",
                  }}
                >
                  <strong style={{ marginRight: "8px" }}>Auto-orbit in:</strong>
                  <div
                    style={{
                      backgroundColor: "rgba(0, 170, 255, 0.2)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      minWidth: "50px",
                      textAlign: "center",
                    }}
                  >
                    {Math.ceil(timeBeforeAutoOrbit / 1000)}s
                  </div>
                </div>
              ) : (
                <p style={{ color: "#00aaff" }}>
                  Full orbit mode after {AUTO_ORBIT_DELAY / 1000}s of inactivity
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DebugNavigationUI;
