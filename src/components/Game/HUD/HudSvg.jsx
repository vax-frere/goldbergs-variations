import React, { useEffect, useRef } from "react";

/**
 * Composant SVG du HUD qui affiche la position actuelle et la vitesse
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.position - Position actuelle {x, y, z}
 * @param {number} [props.speed=0] - Vitesse actuelle en unités par seconde
 */
const HudSvg = ({ position = { x: 0, y: 0, z: 0 }, speed = 0 }) => {
  const svgRef = useRef(null);
  const speedBarRef = useRef(null);
  const speedBarFillRef = useRef(null);
  const MAX_SPEED = 300; // Vitesse maximale pour la barre (pleine)

  // Charger le SVG et mettre à jour les informations
  useEffect(() => {
    const updateHudInfo = () => {
      if (svgRef.current) {
        // Trouver l'élément tspan qui contient la position
        const positionTspan = svgRef.current.querySelector("#tspan26");
        if (positionTspan) {
          // Mettre à jour le texte avec la position actuelle
          positionTspan.textContent = `x ${position.x.toFixed(
            0
          )} y ${position.y.toFixed(0)} z ${position.z.toFixed(0)}`;
        }

        // Trouver l'élément tspan qui contient la vitesse
        const speedTspan = svgRef.current.querySelector("#tspan26-9");
        if (speedTspan && speedTspan.parentElement) {
          // Masquer le texte de vitesse
          speedTspan.parentElement.style.display = "none";
        }
      }

      // Mettre à jour la barre de vitesse HTML si elle existe
      if (speedBarFillRef.current) {
        // Calculer le pourcentage de remplissage en fonction de la vitesse
        const fillPercentage = Math.min(speed / MAX_SPEED, 1) * 100;

        // Mettre à jour la largeur de la barre de remplissage
        speedBarFillRef.current.style.width = `${fillPercentage}%`;
      }
    };

    // Charger le SVG depuis le fichier
    fetch(`${import.meta.env.BASE_URL}img/hud-example.svg`)
      .then((response) => response.text())
      .then((svgText) => {
        if (svgRef.current) {
          // Insérer le contenu SVG dans notre élément
          svgRef.current.innerHTML = svgText;
          // Mettre à jour les informations
          updateHudInfo();
        }
      })
      .catch((error) => {
        console.error("Erreur lors du chargement du SVG:", error);
      });

    // Mettre à jour les informations lorsqu'elles changent
    updateHudInfo();
  }, [position, speed]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* SVG du HUD pour la position */}
      <div
        ref={svgRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      {/* Barre de vitesse HTML plus fluide */}
      <div
        ref={speedBarRef}
        style={{
          position: "absolute",
          left: "120px",
          bottom: "95px",
          width: "65px",
          height: "3px",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          ref={speedBarFillRef}
          style={{
            height: "100%",
            width: `${Math.min(speed / MAX_SPEED, 1) * 100}%`,
            backgroundColor: "#ffffff",
            borderRadius: "2px",
            transition: "width 0.15s ease-out, background-color 0.25s ease",
          }}
        />
      </div>
    </div>
  );
};

export default HudSvg;
