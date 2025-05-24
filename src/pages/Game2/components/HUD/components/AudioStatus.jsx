import React, { memo } from "react";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import useGameStore from "../../../store";

/**
 * Composant pour afficher le statut audio avec des icônes MUI
 * @returns {JSX.Element} - Le composant AudioStatus
 */
const AudioStatus = memo(() => {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const toggleAudio = useGameStore((state) => state.toggleAudio);

  return (
    <div
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "transparent",
        color: "#f5f5f5",
        width: "50px",
        height: "50px",
        zIndex: 1000,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={toggleAudio}
      title={audioEnabled ? "Désactiver le son (M)" : "Activer le son (M)"}
    >
      {audioEnabled ? (
        <VolumeUpOutlinedIcon fontSize="large" />
      ) : (
        <VolumeOffOutlinedIcon fontSize="large" />
      )}
    </div>
  );
});

export default AudioStatus;
