import React, { useState, useEffect } from "react";
import useCollisionStore, { CollisionLayers } from "../../services/CollisionService";

/**
 * Panneau de debug pour le système de collision
 */
const CollisionDebugPanel = () => {
  const collisionStore = useCollisionStore();
  const [collisionInfo, setCollisionInfo] = useState({
    systemStatus: {},
    detectionSettings: {},
    boundingBoxCounts: {},
    stats: {},
    lastDetected: {},
    activeCollisions: null,
  });

  // Update collision information every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        // System Status
        const systemStatus = {
          collisionMask: collisionStore.collisionMask,
          maskBinary: collisionStore.collisionMask.toString(2).padStart(8, '0'),
          debugMode: collisionStore.debugMode,
          debugCollision: collisionStore.debugCollision,
          lastCheckTime: collisionStore.lastCheckTime,
          timeSinceLastCheck: Date.now() - collisionStore.lastCheckTime,
        };

        // Detection Settings
        const detectionSettings = {
          throttleTime: collisionStore.settings.throttleTime,
          detectionPointDistance: collisionStore.settings.detectionPointDistance,
          detectionBox: collisionStore.settings.detectionBox,
          hysteresisDelay: collisionStore.collisionHysteresis.hysteresisDelay,
          requiredConsistency: collisionStore.collisionHysteresis.requiredConsistency,
        };

        // Bounding Box Counts
        const boundingBoxCounts = {
          clusters: Object.keys(collisionStore.boundingBoxes.clusters).length,
          nodes: Object.keys(collisionStore.boundingBoxes.nodes).length,
          interactiveElements: Object.keys(collisionStore.boundingBoxes.interactiveElements).length,
        };

        // Stats
        const stats = { ...collisionStore.stats };

        // Last Detected
        const lastDetected = { ...collisionStore.lastDetected };

        // Active Collisions (appeler detectCollisions pour obtenir l'état actuel)
        const activeCollisions = collisionStore.detectCollisions();

        setCollisionInfo({
          systemStatus,
          detectionSettings,
          boundingBoxCounts,
          stats,
          lastDetected,
          activeCollisions,
        });
      } catch (error) {
        console.warn('[CollisionDebugPanel] Error updating collision info:', error);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [collisionStore]);

  const formatLayerName = (layerValue) => {
    const layerNames = {
      [CollisionLayers.DEFAULT]: 'DEFAULT',
      [CollisionLayers.CLUSTERS]: 'CLUSTERS',
      [CollisionLayers.NODES]: 'NODES',
      [CollisionLayers.INTERACTIVE]: 'INTERACTIVE',
    };
    return layerNames[layerValue] || `CUSTOM(${layerValue})`;
  };

  const getEnabledLayers = () => {
    const layers = [];
    Object.entries(CollisionLayers).forEach(([name, value]) => {
      if (typeof value === 'number' && (collisionInfo.systemStatus.collisionMask & value) !== 0) {
        if (name !== 'ALL' && name !== 'NONE' && !name.includes('create') && !name.includes('UI_') && !name.includes('NAVIGATION') && !name.includes('EXPLORATION')) {
          layers.push(name);
        }
      }
    });
    return layers;
  };

  return (
    <div>
      <h3 style={{ margin: "0 0 12px 0", fontSize: "13px" }}>🎯 Collision System Debug</h3>

      {/* System Status */}
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
          <div>
            Collision Mask: {" "}
            <span style={{ 
              color: "#00aaff",
              backgroundColor: "rgba(0, 170, 255, 0.2)",
              padding: "1px 4px",
              borderRadius: "2px",
              fontSize: "9px"
            }}>
              {collisionInfo.systemStatus.maskBinary}
            </span>
          </div>
          <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>
            Active Layers: {getEnabledLayers().join(', ') || 'None'}
          </div>
          <div style={{ fontSize: "9px", color: "#888" }}>
            Check Interval: {collisionInfo.detectionSettings.throttleTime || 0}ms
          </div>
        </div>
      </div>

      {/* Bounding Boxes */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Registered Bounding Boxes
        </div>
        <div style={{ fontSize: "10px", color: "#ccc" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Clusters:</span>
            <span style={{ color: collisionInfo.boundingBoxCounts.clusters > 0 ? "#4CAF50" : "#888" }}>
              {collisionInfo.boundingBoxCounts.clusters}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Nodes:</span>
            <span style={{ color: collisionInfo.boundingBoxCounts.nodes > 0 ? "#4CAF50" : "#888" }}>
              {collisionInfo.boundingBoxCounts.nodes}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Interactive:</span>
            <span style={{ color: collisionInfo.boundingBoxCounts.interactiveElements > 0 ? "#4CAF50" : "#888" }}>
              {collisionInfo.boundingBoxCounts.interactiveElements}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div
        style={{
          marginBottom: "12px",
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Detection Statistics
        </div>
        <div style={{ fontSize: "10px", color: "#ccc" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total Calls:</span>
            <span style={{ color: "#00aaff" }}>{collisionInfo.stats.detectionCalls || 0}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Collisions Found:</span>
            <span style={{ color: "#4CAF50" }}>{collisionInfo.stats.collisionsFound || 0}</span>
          </div>
          <div style={{ fontSize: "9px", color: "#888", marginTop: "4px" }}>
            <div>Clusters: {collisionInfo.stats.clusterDetections || 0}</div>
            <div>Nodes: {collisionInfo.stats.nodeDetections || 0}</div>
            <div>Interactive: {collisionInfo.stats.interactiveElementDetections || 0}</div>
          </div>
          <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>
            Last Detection: {(collisionInfo.stats.lastDetectionTime || 0).toFixed(2)}ms
          </div>
        </div>
      </div>

      {/* Active Collisions */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "3px",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
          Active Collisions
        </div>
        
        {collisionInfo.activeCollisions?.hasCollisions ? (
          <div style={{ fontSize: "10px", color: "#ccc" }}>
            {/* Clusters */}
            {collisionInfo.activeCollisions.clusters.length > 0 && (
              <div style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "#4CAF50", fontWeight: "bold" }}>
                  🏛️ Clusters ({collisionInfo.activeCollisions.clusters.length})
                </div>
                {collisionInfo.activeCollisions.clusters.map((cluster, index) => (
                  <div key={cluster.id || index} style={{ 
                    fontSize: "8px", 
                    color: "#ccc", 
                    marginLeft: "8px",
                    marginBottom: "2px"
                  }}>
                    {cluster.name} (d: {cluster.distance?.toFixed(1) || '?'})
                  </div>
                ))}
              </div>
            )}

            {/* Nodes */}
            {collisionInfo.activeCollisions.nodes.length > 0 && (
              <div style={{ marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "#ffcc00", fontWeight: "bold" }}>
                  🔗 Nodes ({collisionInfo.activeCollisions.nodes.length})
                </div>
                {collisionInfo.activeCollisions.nodes.map((node, index) => (
                  <div key={node.id || index} style={{ 
                    fontSize: "8px", 
                    color: "#ccc", 
                    marginLeft: "8px",
                    marginBottom: "2px"
                  }}>
                    {node.name} (d: {node.distance?.toFixed(1) || '?'})
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Elements */}
            {collisionInfo.activeCollisions.interactiveElements.length > 0 && (
              <div>
                <div style={{ fontSize: "9px", color: "#ff6b6b", fontWeight: "bold" }}>
                  ⚡ Interactive ({collisionInfo.activeCollisions.interactiveElements.length})
                </div>
                {collisionInfo.activeCollisions.interactiveElements.map((element, index) => (
                  <div key={element.id || index} style={{ 
                    fontSize: "8px", 
                    color: "#ccc", 
                    marginLeft: "8px",
                    marginBottom: "2px"
                  }}>
                    {element.id} (d: {element.distance?.toFixed(1) || '?'})
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            fontSize: "10px", 
            color: "#888", 
            textAlign: "center",
            padding: "12px",
            fontStyle: "italic"
          }}>
            No active collisions detected
          </div>
        )}
      </div>
    </div>
  );
};

export default CollisionDebugPanel; 