import React, { useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import useSound from "use-sound";
import { useGameStore } from "../../../store";
import { useInputs } from "../../../components/AdvancedCameraController/inputManager";
import { useInteractionText } from "../../../components/AdvancedCameraController/CameraIndicators";
import textContentService from "../../../services/TextContentService";

const InteractionBox = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, 100%)",
  padding: "10px 20px",
  background: "rgba(0, 0, 0, 1)",
  border: "1px solid rgba(255, 255, 255, 1)",
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
  border: "1px solid rgba(255, 255, 255, 1)",
  borderRadius: isGamepad ? "100%" : "3px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const InteractionPrompt = () => {
  const hoveredCluster = useGameStore((state) => state.hoveredCluster);
  const { interactionKey, isGamepadConnected } = useInteractionText();
  const [hasInteractiveContent, setHasInteractiveContent] = useState(false);

  // Écouter les changements du TextContentService pour détecter du contenu interactif
  useEffect(() => {
    const handleContentChange = (content) => {
      // Considérer qu'il y a du contenu interactif seulement si :
      // 1. Il y a du contenu
      // 2. Ce n'est pas du contenu de cluster (qui a son propre système)
      // 3. Le contenu a la propriété isInteractive à true
      setHasInteractiveContent(
        !!content &&
          content.type !== "detailed" &&
          content.isInteractive === true
      );
    };

    textContentService.addListener(handleContentChange);

    return () => {
      textContentService.removeListener(handleContentChange);
    };
  }, []);

  // Show only when there's either a hovered cluster or interactive content
  if (!hoveredCluster && !hasInteractiveContent) return null;

  return (
    <InteractionBox>
      Press <KeyBox isGamepad={isGamepadConnected}>{interactionKey}</KeyBox> to
      interact
    </InteractionBox>
  );
};

export default InteractionPrompt;
