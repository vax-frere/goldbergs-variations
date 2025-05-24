import React, { memo } from "react";
import PreloaderBackground from "./PreloaderBackground";

/**
 * Composant pour afficher une barre de chargement minimaliste
 * @param {Object} props - Les propriétés du composant
 * @param {number} props.progress - Progression actuelle (0-100)
 * @param {string} props.message - Message à afficher
 * @param {number} props.stage - Étape actuelle du chargement
 * @param {number} props.totalStages - Nombre total d'étapes
 * @returns {JSX.Element} - Le composant LoadingBar
 */
const LoadingBar = memo(({ progress, message, stage, totalStages }) => {
  // Calculer la progression totale en tenant compte de l'étape actuelle
  const totalProgress =
    stage > 0
      ? ((stage - 1) / totalStages) * 100 + progress / totalStages
      : progress;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "15px",
      }}
    >
      <PreloaderBackground />
      <div
        style={{
          width: "100px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "1px",
            backgroundColor: "#111",
            position: "relative",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: `${totalProgress}%`,
              height: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              transition: "width 0.2s ease",
              position: "absolute",
            }}
          />
        </div>
        <div
          style={{
            color: "#666",
            fontSize: "9px",
            fontFamily: "monospace",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {message || `loading ${Math.round(totalProgress)}%`}
        </div>
      </div>
    </div>
  );
});

export default LoadingBar;
