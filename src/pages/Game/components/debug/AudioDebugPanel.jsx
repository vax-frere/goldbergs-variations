import React, { useState, useEffect } from "react";
import useAudioManager from "../../services/AudioManager";
import { useNavigationAudioService } from "../../services/NavigationAudioService";

/**
 * Panneau de debug pour l'audio
 */
const AudioDebugPanel = () => {
  const audioManager = useAudioManager();
  const navigationAudioService = useNavigationAudioService();
  const [audioInfo, setAudioInfo] = useState({
    isEnabled: false,
    loadedSounds: [],
    activeInstances: [],
    navigationAudioState: null,
  });

  // Update audio information every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioManager) {
        setAudioInfo({
          isEnabled: audioManager.isInitialized,
          loadedSounds: audioManager.getLoadedSounds(),
          activeInstances: audioManager.getActiveInstances(),
          navigationAudioState: navigationAudioService?.getState() || null,
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [audioManager, navigationAudioService]);

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>🎵 Audio Debug</h3>

      {/* Navigation Audio Service */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Navigation Audio
        </div>
        {audioInfo.navigationAudioState ? (
          <div>
            <div>
              Status:{" "}
              {audioInfo.navigationAudioState.isInitialized
                ? "✅ Ready"
                : "❌ Not Ready"}
            </div>
            <div>
              Activity:{" "}
              {audioInfo.navigationAudioState.currentActivity || "None"}
            </div>
            <div>
              Intensity:{" "}
              {audioInfo.navigationAudioState.activityIntensity?.toFixed(3) ||
                "0.000"}
            </div>
            <div>
              Audio Active:{" "}
              {audioInfo.navigationAudioState.isAudioActive
                ? "🔊 Yes"
                : "🔇 No"}
            </div>
            <div>
              Smoothed:{" "}
              {audioInfo.navigationAudioState.smoothedIntensity?.toFixed(3) ||
                "0.000"}
            </div>
            {audioInfo.navigationAudioState.fadeState && (
              <div
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  padding: "4px",
                  margin: "4px 0",
                  borderRadius: "2px",
                  fontSize: "10px",
                }}
              >
                Fade:{" "}
                {audioInfo.navigationAudioState.fadeState.direction === "in"
                  ? "↗️ IN"
                  : "↘️ OUT"}
                (
                {(
                  audioInfo.navigationAudioState.fadeState.progress * 100
                ).toFixed(0)}
                %)
              </div>
            )}
            {audioInfo.navigationAudioState.previousState && (
              <div
                style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}
              >
                Vol:{" "}
                {audioInfo.navigationAudioState.previousState.volume?.toFixed(
                  2
                ) || "0.00"}{" "}
                | Pitch:{" "}
                {audioInfo.navigationAudioState.previousState.pitch?.toFixed(
                  2
                ) || "1.00"}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "#888" }}>Service not initialized</div>
        )}
      </div>

      {/* Audio Manager Status */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
          Audio Manager
        </div>
        <div>Enabled: {audioInfo.isEnabled ? "✅" : "❌"}</div>
        <div>Loaded: {audioInfo.loadedSounds.length} sounds</div>
        <div>Active: {audioInfo.activeInstances.length} instances</div>
      </div>

      {/* Active Instances */}
      {audioInfo.activeInstances.length > 0 && (
        <div>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Active Instances
          </div>
          {audioInfo.activeInstances.map((instance) => (
            <div
              key={instance.id}
              style={{
                marginBottom: "4px",
                padding: "4px",
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: "2px",
                fontSize: "10px",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{instance.id}</div>
              <div style={{ color: "#ccc" }}>
                {instance.isPlaying ? "🔊" : "⏸️"} Vol:{" "}
                {instance.currentVolume.toFixed(2)} | Pitch:{" "}
                {instance.currentPitch.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioDebugPanel;
