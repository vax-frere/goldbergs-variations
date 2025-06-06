import React, { useMemo, memo } from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import {
  useVisitedPersonasCount,
  useVisitedFragmentsCount,
} from "../../../store";
import useAssets from "../../../hooks/useAssets";
import { WORLD_INTERACTIVE_OBJECTS } from "../../../scenes/WorldLevel/constants/worldObjects";

// Style pour le conteneur de progression
const ProgressContainer = styled(Box)(({ theme }) => ({
  position: "fixed",
  bottom: "25px",
  right: "25px",
  fontSize: "11px",
  fontFamily: "monospace",
  color: "rgba(255, 255, 255, 1)",
  backgroundColor: "rgba(0, 0, 0, 1)",
  border: "1px solid rgba(255, 255, 255, 1)",
  borderRadius: "0px",
  padding: "8px 12px",
  zIndex: 1000,
  pointerEvents: "none",
  whiteSpace: "nowrap",
  textAlign: "right",
}));

/**
 * Composant pour afficher la progression du joueur
 * Affiche le nombre de personas visitées et de fragments audio joués
 */
const PlayerProgress = memo(() => {
  const visitedPersonasCount = useVisitedPersonasCount();
  const visitedFragmentsCount = useVisitedFragmentsCount();
  const assets = useAssets({ autoInit: false });

  // Calculer le nombre total de clusters à partir des données du graphe
  const totalClusters = useMemo(() => {
    if (!assets.isReady) return 0;
    const graphData = assets.getData("graph");
    if (!graphData?.nodes) return 0;

    // Créer un Set des clusterIds uniques
    const uniqueClusters = new Set(
      graphData.nodes
        .filter((node) => node.clusterId !== undefined)
        .map((node) => node.clusterId)
    );

    return uniqueClusters.size;
  }, [assets.isReady, assets.getData]);

  // Calculer le nombre total de fragments à partir des objets du monde
  const totalFragments = useMemo(() => {
    // Compter tous les objets interactifs qui ont un fragment audio
    return WORLD_INTERACTIVE_OBJECTS.filter((obj) => obj.audioFragment).length;
  }, []);

  // Calculer les pourcentages de complétion
  const personasCompletionPercentage = Math.round(
    (visitedPersonasCount / (totalClusters || 1)) * 100
  );

  const fragmentsCompletionPercentage = Math.round(
    (visitedFragmentsCount / (totalFragments || 1)) * 100
  );

  // N'afficher le composant que si au moins un cluster a été visité
  if (visitedPersonasCount === 0 || totalClusters === 0) {
    return null;
  }

  return (
    <ProgressContainer>
      {/* Progression des personas */}
      {`${visitedPersonasCount}/${totalClusters} visited personas  (${personasCompletionPercentage}%)`}

      {/* Progression des fragments - affiché seulement si au moins un fragment a été joué */}
      {visitedFragmentsCount > 0 && totalFragments > 0 && (
        <>
          <br />
          {`${visitedFragmentsCount}/${totalFragments} played fragments  (${fragmentsCompletionPercentage}%)`}
        </>
      )}
    </ProgressContainer>
  );
});

PlayerProgress.displayName = "PlayerProgress";

export default PlayerProgress;
