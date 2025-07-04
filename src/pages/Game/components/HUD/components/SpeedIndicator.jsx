import React from 'react';
import { useCameraSpeedWithLevels } from '../../../hooks/useCameraSpeed';

const SpeedIndicator = () => {
  // Hook optimisé pour la vitesse
  const speedData = useCameraSpeedWithLevels({ low: 100, medium: 200, high: 300 }, 'SpeedIndicator');

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "20px",
        height: "20px",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <defs>
          <mask id="borderMask">
            {/* Rectangle blanc extérieur - définit la zone visible maximale */}
            <rect width="20" height="20" fill="white" />
            {/* Rectangle noir intérieur - crée le "creux" */}
            <rect x="2" y="2" width="16" height="16" fill="black" />
          </mask>
        </defs>

        {/* Contour statique - toujours visible */}
        <rect
          width="20"
          height="20"
          fill="none"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth="1"
        />

        {/* Rectangle masqué qui se remplit selon la vitesse - blanc uniquement */}
        <rect
          width="20"
          height={20 * speedData.normalized}
          y={20 - 20 * speedData.normalized}
          fill="rgba(255, 255, 255, 0.3)"
          mask="url(#borderMask)"
          style={{
            transition: "height 0.15s ease-out, y 0.15s ease-out",
          }}
        />

        {/* Croix centrale */}
        <g stroke="rgba(255, 255, 255, 0.8)" strokeWidth="0.5">
          {/* Ligne horizontale */}
          <line x1="6" y1="10" x2="14" y2="10" />
          {/* Ligne verticale */}
          <line x1="10" y1="6" x2="10" y2="14" />
        </g>
      </svg>
    </div>
  );
};

export default SpeedIndicator; 