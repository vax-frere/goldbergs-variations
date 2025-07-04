import React from "react";
import usePostProcessingStore from "../../services/PostProcessingService";

/**
 * Panneau de debug pour les effets de post-processing
 */
const PostProcessingDebugPanel = () => {
  const postProcessingStore = usePostProcessingStore();

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>🎨 Post-Processing Effects</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
        }}
      >
        {/* Bloom Effect */}
        <button
          onClick={() => postProcessingStore.applyTemporaryEffect("bloom")}
          style={{
            padding: "8px",
            fontSize: "11px",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "none",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "16px" }}>✨</span>
          <span>Bloom Burst</span>
        </button>

        {/* Glitch Effect */}
        <button
          onClick={() => postProcessingStore.applyTemporaryEffect("glitch")}
          style={{
            padding: "8px",
            fontSize: "11px",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "none",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "16px" }}>💥</span>
          <span>Glitch</span>
        </button>

        {/* Noise Effect */}
        <button
          onClick={() => postProcessingStore.applyTemporaryEffect("noise")}
          style={{
            padding: "8px",
            fontSize: "11px",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "none",
            borderRadius: "3px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "16px" }}>📷</span>
          <span>Noise</span>
        </button>
      </div>
    </div>
  );
};

export default PostProcessingDebugPanel; 