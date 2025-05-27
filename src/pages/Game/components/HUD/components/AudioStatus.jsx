import React, { memo } from "react";
import useGameStore from "../../../store";
import useAssets from "../../../hooks/useAssets";

/**
 * Composant pour afficher le statut audio avec des icônes SVG personnalisées
 * @returns {JSX.Element} - Le composant AudioStatus
 */
const AudioStatus = memo(() => {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const toggleAudio = useGameStore((state) => state.toggleAudio);
  const { getImagePath, isReady } = useAssets();

  // Si les assets ne sont pas encore chargés, ne pas afficher le composant
  if (!isReady) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "25px",
        right: "25px",
        backgroundColor: "rgba(0, 0, 0, 1)",
        border: "1px solid rgba(255, 255, 255, 1)",
        borderRadius: "0px",
        color: "#ffffff",
        width: "50px",
        height: "50px",
        padding: "8px",
        zIndex: 1000,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={toggleAudio}
      title={audioEnabled ? "Désactiver le son (M)" : "Activer le son (M)"}
    >
      <img
        src={
          audioEnabled ? getImagePath("unmute.svg") : getImagePath("mute.svg")
        }
        alt={audioEnabled ? "Son activé" : "Son désactivé"}
        style={{
          width: "24px",
          height: "24px",
        }}
      />
    </div>
  );
});

export default AudioStatus;
