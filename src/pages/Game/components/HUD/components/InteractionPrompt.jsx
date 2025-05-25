import React, { useEffect } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useSound from "use-sound";
import { useGameStore } from "../../../store";
import { useInputs } from "../../../components/AdvancedCameraController/inputManager";
import { useInteractionText } from "../../../components/AdvancedCameraController/CameraIndicators";

const InteractionBox = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, 300%)",
  padding: "10px 20px",
  background: "rgba(0, 0, 0, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "4px",
  color: "#ffffff",
  fontSize: "14px",
  fontFamily: "monospace",
  pointerEvents: "none",
  zIndex: 1000,
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  gap: "8px",
}));

const KeyBox = styled(Box)(({ isGamepad }) => ({
  width: "24px",
  height: "24px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: isGamepad ? "100%" : "3px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const InteractionPrompt = () => {
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const isComponentInteractive = useGameStore(
    (state) => state.isComponentInteractive
  );
  const { interactionKey, isGamepadConnected } = useInteractionText();

  // Show only when there's either a hovered cluster or an interactive component
  if (!hoveredCluster && !isComponentInteractive) return null;

  return (
    <InteractionBox>
      Press <KeyBox isGamepad={isGamepadConnected}>{interactionKey}</KeyBox> to
      interact
    </InteractionBox>
  );
};

export default InteractionPrompt;
