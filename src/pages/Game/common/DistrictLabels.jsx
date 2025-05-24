import React from "react";
import CustomText from "./CustomText";

/**
 * Liste des quartiers/catégories à afficher dans l'espace 3D
 */
const DISTRICTS = [
  { text: "Libertarians", position: [500, 200, -300] },
  { text: "Antisystem", position: [-400, 300, 200] },
  { text: "Conservatives", position: [300, -200, 400] },
  { text: "Nationalists", position: [-500, -150, -250] },
  { text: "Religious", position: [200, 400, 300] },
  { text: "Culture", position: [-300, 100, 500] },
  { text: "Social justice", position: [-200, -300, 100] },
];

/**
 * Composant pour afficher les noms des quartiers dans le graphe
 * @param {Object} props - Propriétés du composant
 * @param {number} [props.textSize=30] - Taille du texte
 * @param {string} [props.textColor="#ffffff"] - Couleur du texte
 * @param {Array} [props.districts=DISTRICTS] - Tableau personnalisé de districts/quartiers
 * @param {number} [props.maxDistance=1500] - Distance maximale à laquelle le texte est complètement visible
 * @param {number} [props.minDistance=1000] - Distance minimale à laquelle le texte devient complètement invisible
 */
const DistrictLabels = ({
  textSize = 30,
  textColor = "#ffffff",
  districts = DISTRICTS,
  maxDistance = 1500,
  minDistance = 1000,
}) => {
  return (
    <group>
      {districts.map((district, index) => (
        <CustomText
          key={index}
          text={district.text}
          position={district.position}
          size={textSize}
          color={textColor}
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

export { DISTRICTS };
export default DistrictLabels;
