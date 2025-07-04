import { memo, useEffect } from "react";
import { Stats } from "@react-three/drei";

const StatsDebugPanel = memo(() => {
  useEffect(() => {
    // Injecter du CSS pour repositionner les stats sans les déplacer physiquement
    const style = document.createElement('style');
    style.id = 'stats-debug-panel-style';
    style.textContent = `
      div[style*="position: fixed"][style*="top: 0px"][style*="left: 0px"] {
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 10001 !important;
        background-color: rgba(0, 0, 0, 0.8) !important;
        border: 1px solid red !important;
        border-radius: 8px !important;
        padding: 8px !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Nettoyer le style quand le composant se démonte
      const existingStyle = document.getElementById('stats-debug-panel-style');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  return <Stats />;
});

export default StatsDebugPanel; 