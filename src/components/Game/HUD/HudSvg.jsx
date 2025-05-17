import React, { useEffect, useRef } from 'react';

/**
 * Composant SVG du HUD qui affiche la position actuelle et la vitesse
 * @param {Object} props - Propriétés du composant
 * @param {Object} props.position - Position actuelle {x, y, z}
 * @param {number} [props.speed=0] - Vitesse actuelle en unités par seconde
 */
const HudSvg = ({ position = { x: 0, y: 0, z: 0 }, speed = 0 }) => {
  const svgRef = useRef(null);

  // Charger le SVG et mettre à jour les informations
  useEffect(() => {
    const updateHudInfo = () => {
      if (svgRef.current) {
        // Trouver l'élément tspan qui contient la position
        const positionTspan = svgRef.current.querySelector('#tspan26');
        if (positionTspan) {
          // Mettre à jour le texte avec la position actuelle
          positionTspan.textContent = `x ${position.x.toFixed(0)} y ${position.y.toFixed(0)} z ${position.z.toFixed(0)}`;
        }

        // Trouver l'élément tspan qui contient la vitesse
        const speedTspan = svgRef.current.querySelector('#tspan26-9');
        if (speedTspan) {
          // Mettre à jour le texte avec la vitesse actuelle
          speedTspan.textContent = `${speed.toFixed(0)}u/s`;

          // Changer la couleur en fonction de la vitesse
          const speedText = speedTspan.parentElement;
          if (speedText) {
            if (speed > 200) {
              speedText.setAttribute('fill', '#ff6b6b'); // Rouge pour vitesse élevée
            } else if (speed > 100) {
              speedText.setAttribute('fill', '#ffcc00'); // Jaune pour vitesse moyenne
            } else {
              speedText.setAttribute('fill', '#4CAF50'); // Vert pour vitesse normale
            }
          }
        }
      }
    };

    // Charger le SVG depuis le fichier
    fetch(`${import.meta.env.BASE_URL}img/hud-example.svg`)
      .then(response => response.text())
      .then(svgText => {
        if (svgRef.current) {
          // Insérer le contenu SVG dans notre élément
          svgRef.current.innerHTML = svgText;
          // Mettre à jour les informations
          updateHudInfo();
        }
      })
      .catch(error => {
        console.error('Erreur lors du chargement du SVG:', error);
      });

    // Mettre à jour les informations lorsqu'elles changent
    updateHudInfo();
  }, [position, speed]);

  return (
    <div
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    />
  );
};

export default HudSvg;
