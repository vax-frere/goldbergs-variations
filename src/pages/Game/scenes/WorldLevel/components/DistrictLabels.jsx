import React, { useMemo } from "react";
import CustomText from "../../../components/CustomText";
import { BASE_THEMATIC_COLORS } from "../../../../../constants/thematicColors";
import useAssets from "../../../hooks/useAssets";

/**
 * Calcule le centroïde (position moyenne) de tous les nœuds d'un groupe thématique donné
 * @param {Array} nodes - Tableau des nœuds
 * @param {string} thematicGroup - Nom du groupe thématique
 * @returns {Array} - Position [x, y, z] du centroïde
 */
const calculateThematicGroupCentroid = (nodes, thematicGroup) => {
  const groupNodes = nodes.filter(
    (node) => node.clusterThematicGroup === thematicGroup
  );

  if (groupNodes.length === 0) {
    return [0, 0, 0];
  }

  const sum = groupNodes.reduce(
    (acc, node) => {
      acc.x += node.x || 0;
      acc.y += node.y || 0;
      acc.z += node.z || 0;
      return acc;
    },
    { x: 0, y: 0, z: 0 }
  );

  return [
    sum.x / groupNodes.length,
    sum.y / groupNodes.length,
    sum.z / groupNodes.length,
  ];
};

/**
 * Composant pour afficher les noms des quartiers dans le graphe
 * Les positions sont calculées automatiquement au centroïde de chaque groupe thématique
 * @param {Object} props - Propriétés du composant
 * @param {number} [props.textSize=30] - Taille du texte
 * @param {string} [props.textColor="#ffffff"] - Couleur du texte par défaut si pas de couleur thématique
 * @param {number} [props.maxDistance=1500] - Distance maximale à laquelle le texte est complètement visible
 * @param {number} [props.minDistance=1000] - Distance minimale à laquelle le texte devient complètement invisible
 */
const DistrictLabels = ({
  textSize = 30,
  textColor = "#ffffff",
  maxDistance = 1500,
  minDistance = 1000,
}) => {
  const assets = useAssets({ autoInit: false });

  // Calculer les districts avec leurs positions basées sur les centroïdes
  const districts = useMemo(() => {
    if (!assets.isReady) return [];

    const spatializedGraph = assets.getData("graph");
    if (!spatializedGraph || !spatializedGraph.nodes) {
      return [];
    }

    // Obtenir tous les groupes thématiques uniques
    const thematicGroups = [
      ...new Set(
        spatializedGraph.nodes
          .map((node) => node.clusterThematicGroup)
          .filter((group) => group && group.trim() !== "")
      ),
    ];

    // Calculer la position centroïde pour chaque groupe
    return thematicGroups.map((group) => ({
      text: group,
      position: calculateThematicGroupCentroid(spatializedGraph.nodes, group),
    }));
  }, [assets.isReady, assets.getData]);

  if (!assets.isReady || districts.length === 0) {
    return null;
  }

  return (
    <group>
      {districts.map((district, index) => (
        <CustomText
          key={index}
          text={district.text}
          position={district.position}
          size={textSize}
          color={BASE_THEMATIC_COLORS[district.text] || textColor}
          maxDistance={maxDistance}
          minDistance={minDistance}
          outline={true}
          outlineWidth={2.0}
          outlineColor="#000000"
        />
      ))}
    </group>
  );
};

export default DistrictLabels;
