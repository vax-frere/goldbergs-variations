import React, { memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { BASE_THEMATIC_COLORS } from "../../../constants/thematicColors";

// Fonction pour générer un polygone légèrement randomisé
const generateRandomPolygon = (seed) => {
  // Utiliser le seed pour avoir une randomisation consistante par carré
  const random = (pointIndex, coordIndex) => {
    // Créer un seed unique pour chaque point et chaque coordonnée
    const uniqueSeed = seed * 17.23 + pointIndex * 31.41 + coordIndex * 43.67;
    const x = Math.sin(uniqueSeed) * 10000;
    return (x - Math.floor(x)) * 0.2 - 0.15; // Randomisation entre -15% et +15%
  };

  // Points de base d'un carré avec padding (entre 15% et 85% au lieu de 0% et 100%)
  const padding = 10;
  const basePoints = [
    [padding, padding], // top-left
    [100 - padding, padding], // top-right
    [100 - padding, 100 - padding], // bottom-right
    [padding, 100 - padding], // bottom-left
  ];

  // Appliquer la randomisation avec des seeds vraiment uniques
  const randomizedPoints = basePoints.map(([x, y], pointIndex) => [
    Math.max(5, Math.min(95, x + random(pointIndex, 0) * 100)),
    Math.max(5, Math.min(95, y + random(pointIndex, 1) * 100)),
  ]);

  return `polygon(${randomizedPoints
    .map(([x, y]) => `${x}% ${y}%`)
    .join(", ")})`;
};

// Composant de légende des couleurs thématiques
const LegendContainer = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: "25px",
  right: "25px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 0.8)",
  zIndex: 1000,
  pointerEvents: "none",
  backgroundColor: "rgba(0, 0, 0, 1)",
  padding: "14px 16px",
  border: "1px solid rgba(255, 255, 255, 1)",
  maxWidth: "220px",
  textAlign: "right",
}));

const LegendTitle = styled(Box)(({ theme }) => ({
  marginBottom: "6px",
  fontSize: "9px",
  opacity: 0.6,
  textAlign: "right",
}));

const LegendItem = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: "5px",
  justifyContent: "flex-end",
  "&:last-child": {
    marginBottom: 0,
  },
}));

const ColorDot = styled(Box)(({ theme, color, clipPath }) => ({
  width: "10px",
  height: "10px",
  backgroundColor: color,
  marginLeft: "8px",
  flexShrink: 0,
  clipPath: clipPath,
}));

const LegendLabel = styled(Box)(({ theme }) => ({
  fontSize: "10px",
  lineHeight: "1.2",
  opacity: 0.9,
}));

/**
 * Composant pour afficher la légende des couleurs thématiques
 */
const ThematicLegend = ({ hasProgressCounter = false }) => {
  return (
    <LegendContainer
      style={{
        bottom: hasProgressCounter ? "80px" : "30px", // Adjust position based on progress counter
      }}
    >
      <LegendTitle>Thematic Groups</LegendTitle>
      {Object.entries(BASE_THEMATIC_COLORS).map(([theme, color], index) => (
        <LegendItem key={theme}>
          <LegendLabel>{theme}</LegendLabel>
          <ColorDot
            color={color}
            clipPath={generateRandomPolygon(theme.charCodeAt(0) + index)}
          />
        </LegendItem>
      ))}
    </LegendContainer>
  );
};

export default ThematicLegend;
