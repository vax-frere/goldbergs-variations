import React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import { useActiveLevel } from "../../../store";
import useAssets from "../../../hooks/useAssets";
import { BASE_THEMATIC_COLORS } from "../../../constants/thematicColors";

const StyledActiveLevelName = styled(Box)(({ theme }) => ({
  position: "fixed",
  top: "25px",
  left: "25px",
  fontSize: "24px",
  fontFamily: "monospace",
  color: "#ffffff",
  backgroundColor: "#000000",
  border: "1px solid #ffffff",
  borderRadius: "0px",
  padding: "12px 16px",
  zIndex: 1000,
  pointerEvents: "none",
  whiteSpace: "nowrap",
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}));

const ThematicText = styled(Box)(({ theme, thematicColor }) => ({
  fontSize: "14px",
  fontFamily: "monospace",
  color: thematicColor || "#ffffff",
  fontWeight: "normal",
}));

const AliasesText = styled(Box)(({ theme }) => ({
  fontSize: "12px",
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 0.7)",
  fontWeight: "normal",
  fontStyle: "italic",
}));

/**
 * Composant pour afficher le nom du niveau actif
 */
const ActiveLevelName = () => {
  const activeLevel = useActiveLevel();
  const assets = useAssets({ autoInit: false });

  if (!activeLevel) return null;

  // Fonction pour récupérer les données du personnage depuis la base de données
  const getCharacterData = (clusterId) => {
    console.log("[ActiveLevelName] Searching for clusterId:", clusterId);
    console.log("[ActiveLevelName] Assets ready:", assets.isReady);

    if (!assets.isReady) {
      console.log("[ActiveLevelName] Assets not ready yet");
      return null;
    }

    const database = assets.getData("database");
    console.log("[ActiveLevelName] Database available:", !!database);
    console.log(
      "[ActiveLevelName] Database is array:",
      Array.isArray(database)
    );

    if (!database || !Array.isArray(database)) {
      console.log("[ActiveLevelName] Database not available or not an array");
      return null;
    }

    console.log("[ActiveLevelName] Database length:", database.length);

    // Chercher dans la base de données un élément avec le slug correspondant au clusterId
    const character = database.find((item) => item.slug === clusterId);

    console.log("[ActiveLevelName] Character found:", !!character);
    if (character) {
      console.log(
        "[ActiveLevelName] Character displayName:",
        character.displayName
      );
      console.log("[ActiveLevelName] Character slug:", character.slug);
      console.log("[ActiveLevelName] Character thematic:", character.thematic);
      console.log(
        "[ActiveLevelName] Character thematicGroup:",
        character.thematicGroup
      );
      console.log("[ActiveLevelName] Character aliases:", character.aliases);
    }

    return character || null;
  };

  // Déterminer le nom à afficher et récupérer les données du personnage
  let displayName;
  let characterData = null;

  console.log("[ActiveLevelName] ActiveLevel:", activeLevel);

  if (activeLevel.type === "cluster" && activeLevel.id) {
    // Pour les clusters, toujours essayer de récupérer les données du personnage depuis la base de données en premier
    characterData = getCharacterData(activeLevel.id);

    if (characterData && characterData.displayName) {
      displayName = characterData.displayName;
      console.log(
        "[ActiveLevelName] Using character name from database:",
        displayName
      );
    } else if (activeLevel.name) {
      // Si pas trouvé dans la base, utiliser activeLevel.name s'il existe
      displayName = activeLevel.name;
      console.log(
        "[ActiveLevelName] Using activeLevel.name as fallback:",
        displayName
      );
    } else {
      // Dernier fallback vers le format précédent
      displayName = `Cluster: ${activeLevel.id
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")}`;
      console.log("[ActiveLevelName] Using fallback format:", displayName);
    }
  } else if (activeLevel.name) {
    // Pour les non-clusters, utiliser activeLevel.name s'il existe
    displayName = activeLevel.name;
    console.log("[ActiveLevelName] Using activeLevel.name:", displayName);
  } else {
    // Pour les autres types de niveaux
    displayName = `${activeLevel.type || "Level"}: ${activeLevel.id}`;
    console.log("[ActiveLevelName] Using generic format:", displayName);
  }

  console.log("[ActiveLevelName] Final displayName:", displayName);

  // Récupérer la couleur thématique
  const thematicColor = characterData?.thematicGroup
    ? BASE_THEMATIC_COLORS[characterData.thematicGroup]
    : null;

  return (
    <StyledActiveLevelName>
      {/* Nom principal */}
      <Box>{displayName}</Box>

      {/* Thématique avec couleur */}
      {characterData?.thematic && (
        <ThematicText thematicColor={thematicColor}>
          {characterData.thematic}
        </ThematicText>
      )}

      {/* Aliases */}
      {characterData?.aliases && characterData.aliases.length > 1 && (
        <AliasesText>aliases: {characterData.aliases.join(", ")}</AliasesText>
      )}
    </StyledActiveLevelName>
  );
};

export default ActiveLevelName;
