import React from "react";
import Text3D from "../Text3D";

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
 * @param {number} [props.textSize=20] - Taille du texte (réduite de 40 à 20)
 * @param {string} [props.textColor="#ffffff"] - Couleur du texte
 * @param {Array} [props.districts=DISTRICTS] - Tableau personnalisé de districts/quartiers
 * @param {number} [props.maxDistance=400] - Distance maximale à laquelle le texte est complètement visible
 * @param {number} [props.minDistance=70] - Distance minimale à laquelle le texte devient complètement invisible
 */
const DistrictLabels = ({
  textSize = 20,
  textColor = "#ffffff",
  districts = DISTRICTS,
  maxDistance = 1200,
  minDistance = 800,
}) => {
  return (
    <group>
      {districts.map((district, index) => (
        <Text3D
          key={index}
          text={district.text}
          position={district.position}
          size={textSize}
          color={textColor}
          isBillboard={true}
          maxDistance={maxDistance}
          minDistance={minDistance}
        />
      ))}
    </group>
  );
};

export { DISTRICTS };
export default DistrictLabels;
