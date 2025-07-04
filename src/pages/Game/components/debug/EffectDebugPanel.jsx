import React, { useState, useEffect } from "react";
import useEffectStore, { EFFECT_TYPES } from "../../services/EffectService";

/**
 * Panneau de debug pour les effets visuels
 */
const EffectDebugPanel = () => {
  const effectStore = useEffectStore();
  const [effectInfo, setEffectInfo] = useState({
    activeEffectsCount: 0,
    activeEffects: [],
    defaultEffectType: EFFECT_TYPES.VIB_RIBBON,
    lastUpdateTime: 0,
  });

  // Update effect information every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      // Utiliser les propriétés directement du store sans vérification d'existence
      const activeEffects = effectStore.activeEffects || [];
      const activeEffectsCount = activeEffects.length;
      const defaultEffectType = effectStore.defaultEffectType || EFFECT_TYPES.VIB_RIBBON;
      const lastUpdateTime = effectStore.lastUpdateTime || 0;

      setEffectInfo({
        activeEffectsCount,
        activeEffects: activeEffects.slice(0, 5), // Limiter à 5 pour l'affichage
        defaultEffectType,
        lastUpdateTime,
      });
    }, 100);

    return () => clearInterval(interval);
  }, [effectStore]);

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>✨ Effect System Debug</h3>

      {/* Effect Stats */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          System Status
        </div>
        <div style={{ fontSize: "10px", color: "#ccc" }}>

          <div style={{ fontSize: "9px", color: "#888" }}>
            Store Connected: {effectStore ? "✅" : "❌"}
          </div>
        </div>
      </div>

      {/* Active Pool Effects */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Pool Active Effects ({effectStore?.effectPool?.activeEffects?.size || 0})
        </div>
        
        {effectStore?.effectPool?.activeEffects?.size > 0 ? (
          <>
            {Array.from(effectStore.effectPool.activeEffects.entries()).slice(0, 8).map(([id, effect]) => {
              let renderData = null;
              try {
                renderData = effect.getRenderData();
              } catch (e) {
                renderData = { type: "Error", position: { x: 0, y: 0, z: 0 } };
              }
              
              return (
                <div
                  key={id}
                  style={{
                    marginBottom: "4px",
                    padding: "4px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "2px",
                    fontSize: "9px",
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2px"
                  }}>
                    <span style={{ fontWeight: "bold", color: "#00aaff" }}>
                      {renderData?.type || "Unknown"}
                    </span>
                    <span style={{ fontSize: "8px", color: "#888" }}>
                      ID: {id.split('_')[1] || id}
                    </span>
                  </div>
                  <div style={{ color: "#ccc", fontSize: "8px" }}>
                    Pos: [{renderData?.position?.x?.toFixed(1) || "0"}, {renderData?.position?.y?.toFixed(1) || "0"}, {renderData?.position?.z?.toFixed(1) || "0"}]
                  </div>
                  {renderData?.progress !== undefined && (
                    <div style={{ 
                      width: "100%", 
                      height: "2px", 
                      backgroundColor: "rgba(255,255,255,0.2)", 
                      borderRadius: "1px",
                      marginTop: "2px",
                      overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${Math.min(100, renderData.progress * 100)}%`,
                        height: "100%",
                        backgroundColor: "#00aaff",
                        transition: "width 0.1s ease-out"
                      }} />
                    </div>
                  )}
                  {renderData?.scale && (
                    <div style={{ color: "#999", fontSize: "8px", marginTop: "1px" }}>
                      Scale: {renderData.scale.toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
            {effectStore.effectPool.activeEffects.size > 8 && (
              <div style={{ fontSize: "8px", color: "#888", textAlign: "center", marginTop: "4px" }}>
                ... et {effectStore.effectPool.activeEffects.size - 8} autres
              </div>
            )}
          </>
        ) : (
          <div style={{ 
            fontSize: "10px", 
            color: "#888", 
            textAlign: "center",
            padding: "12px",
            fontStyle: "italic"
          }}>
                         {effectStore?.effectPool ? "No active effects at the moment" : "Effect pool not initialized"}
          </div>
        )}
      </div>


    </div>
  );
};

export default EffectDebugPanel; 