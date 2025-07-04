import React, { useState, useEffect } from "react";
import AdvancedCameraControllerDebugPanel from "./AdvancedCameraControllerDebugPanel";
import AudioDebugPanel from "./AudioDebugPanel";
import EffectDebugPanel from "./EffectDebugPanel";
import CollisionDebugPanel from "./CollisionDebugPanel";
import AssetManagerDebugPanel from "./AssetManagerDebugPanel";
import CameraMetricsPerformancePanel from "./CameraMetricsPerformancePanel";
import PostProcessingDebugPanel from "./PostProcessingDebugPanel";

const DEBUG_PANELS = {
  CAMERA: "camera",
  AUDIO: "audio",
  EFFECTS: "effects",
  COLLISION: "collision",
  ASSETS: "assets",
  PERFORMANCE: "performance",
  POST_PROCESSING: "post-processing",
};

const PANEL_CONFIGS = {
  [DEBUG_PANELS.CAMERA]: {
    id: DEBUG_PANELS.CAMERA,
    label: "Flight",
    icon: "🎮",
    component: AdvancedCameraControllerDebugPanel,
  },
  [DEBUG_PANELS.AUDIO]: {
    id: DEBUG_PANELS.AUDIO,
    label: "Audio",
    icon: "🎵",
    component: AudioDebugPanel,
  },
  [DEBUG_PANELS.EFFECTS]: {
    id: DEBUG_PANELS.EFFECTS,
    label: "Effects",
    icon: "✨",
    component: EffectDebugPanel,
  },
  [DEBUG_PANELS.COLLISION]: {
    id: DEBUG_PANELS.COLLISION,
    label: "Collision",
    icon: "🎯",
    component: CollisionDebugPanel,
  },
  [DEBUG_PANELS.ASSETS]: {
    id: DEBUG_PANELS.ASSETS,
    label: "Assets",
    icon: "📦",
    component: AssetManagerDebugPanel,
  },
  [DEBUG_PANELS.PERFORMANCE]: {
    id: DEBUG_PANELS.PERFORMANCE,
    label: "Perf",
    icon: "⚡",
    component: CameraMetricsPerformancePanel,
  },
  [DEBUG_PANELS.POST_PROCESSING]: {
    id: DEBUG_PANELS.POST_PROCESSING,
    label: "Post",
    icon: "🎨",
    component: PostProcessingDebugPanel,
  },
};

const STORAGE_KEY = "debug-panel-active-tab";

const DebugPanelManager = ({ graphRef }) => {
  // Initialize from localStorage or default to camera panel
  const [activePanel, setActivePanel] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && PANEL_CONFIGS[stored] ? stored : DEBUG_PANELS.CAMERA;
  });

  // Save to localStorage when panel changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activePanel);
  }, [activePanel]);

  const handleTabClick = (panelId) => {
    setActivePanel(panelId);
  };

  const ActivePanelComponent = PANEL_CONFIGS[activePanel].component;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        zIndex: 10000,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          marginBottom: "2px",
        }}
      >
        {Object.values(PANEL_CONFIGS).map((config) => (
          <button
            key={config.id}
            onClick={() => handleTabClick(config.id)}
            style={{
              backgroundColor: activePanel === config.id 
                ? "rgba(255, 255, 255, 0.15)" 
                : "rgba(0, 0, 0, 0.6)",
              border: "1px solid red",
              borderBottom: "none",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              padding: "4px 8px",
              fontSize: "10px",
              fontFamily: "monospace",
              color: activePanel === config.id ? "#fff" : "#ccc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.2s ease",
              marginRight: config.id === DEBUG_PANELS.CAMERA ? "1px" : "0",
            }}
            onMouseEnter={(e) => {
              if (activePanel !== config.id) {
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.target.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (activePanel !== config.id) {
                e.target.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                e.target.style.color = "#ccc";
              }
            }}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </button>
        ))}
      </div>

      {/* Active Panel */}
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          border: "1px solid red",
          borderRadius: "8px",
          borderTopLeftRadius: activePanel === DEBUG_PANELS.CAMERA ? "0" : "8px",
          padding: "4px",
        }}
      >
        <div
          style={{
            padding: "12px",
            width: "420px",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "white",
          }}
        >
          <ActivePanelComponent graphRef={graphRef} />
        </div>
      </div>
    </div>
  );
};

export default DebugPanelManager; 