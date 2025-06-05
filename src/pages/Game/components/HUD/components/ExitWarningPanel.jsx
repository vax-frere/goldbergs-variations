import React, { memo } from "react";
import { useGameStore } from "../../../store";

/**
 * Composant pour afficher l'avertissement de sortie de cluster
 * Affiché quand l'utilisateur s'approche des limites du cluster
 */
const ExitWarningPanel = memo(() => {
  const showExitWarning = useGameStore((state) => state.showExitWarning);

  if (!showExitWarning) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, 150%)", // Même position que InteractionPrompt
        padding: "10px 20px",
        background: "rgba(0, 0, 0, 1)", // Fond noir pur
        border: "1px solid rgba(255, 255, 255, 1)", // Bordure blanche simple
        color: "#ffffff",
        fontSize: "14px",
        fontFamily: "monospace",
        pointerEvents: "none",
        zIndex: 1000,
        textAlign: "center",
      }}
    >
      Continue to exit cluster
    </div>
  );
});

export default ExitWarningPanel;
