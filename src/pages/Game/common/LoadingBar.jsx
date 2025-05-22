import React from "react";

/**
 * A minimal, elegant loading bar component with full-size centered container
 * @param {Object} props - Component props
 * @param {number} props.progress - Loading progress (0-100)
 * @param {string} props.label - Optional custom label text (defaults to "Loading")
 * @param {Object} props.style - Optional additional styles for the container
 * @param {boolean} props.fullScreen - Whether to display in fullscreen mode (default: false)
 * @returns {JSX.Element} - Loading bar component
 */
const LoadingBar = ({
  progress,
  label = "Loading",
  style = {},
  fullScreen = false,
}) => {
  // Ensure progress is within valid range (0-100)
  const safeProgress = Math.min(Math.max(0, progress), 100);

  // Container styles for full-screen or embedded mode
  const containerStyles = fullScreen
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        color: "#fff",
        zIndex: 1000,
        ...style,
      }
    : {
        ...style,
      };

  // Inner content with loading bar and background
  const loadingContent = (
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: "8px",
        padding: "20px 30px",
        minWidth: "280px",
        boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
        backdropFilter: "blur(5px)",
      }}
    >
      <div
        style={{
          width: "250px",
          height: "4px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "2px",
          margin: "15px auto",
          overflow: "hidden",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            width: `${safeProgress}%`,
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            transition: "width 0.3s ease-out",
            borderRadius: "2px",
            boxShadow: "0 0 5px rgba(255, 255, 255, 0.5)",
          }}
        />
      </div>
      <p
        style={{
          fontSize: "12px",
          opacity: "0.7",
          fontFamily: "Arial, sans-serif",
          letterSpacing: "1px",
          margin: "5px 0",
          color: "#ffffff",
          textAlign: "center",
        }}
      >
        {label} {safeProgress.toFixed(0)}%
      </p>
    </div>
  );

  // Return full-screen container or just the loading content
  return fullScreen ? (
    <div style={containerStyles}>{loadingContent}</div>
  ) : (
    <div style={{ textAlign: "center", ...style }}>{loadingContent}</div>
  );
};

export default LoadingBar;
