import React, { memo } from "react";
import { useCurrentLevel, GAME_LEVELS } from "./store";
import WorldLevel from "./scenes/WorldLevel/WorldLevel";
import AdvancedCluster from "./scenes/AdvancedCluster/AdvancedCluster";
import BlackHoleLevel from "./scenes/BlackHole/BlackHoleLevel";

// Composant de gestion des niveaux
const LevelSwitcher = memo(() => {
  const currentLevel = useCurrentLevel();

  return (
    <>
      {/* Rendu conditionnel basé sur le niveau actuel */}
      {currentLevel === GAME_LEVELS.WORLD && <WorldLevel />}
      {currentLevel === GAME_LEVELS.ADVANCED_CLUSTER && <AdvancedCluster />}
      {currentLevel === GAME_LEVELS.BLACK_HOLE && <BlackHoleLevel />}
    </>
  );
});

export default LevelSwitcher;
