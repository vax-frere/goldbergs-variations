/**
 * CameraMetricsPerformancePanel - Panneau de monitoring des performances
 * 
 * Affiche les statistiques du CameraMetricsManager pour optimiser les performances
 */

import React, { useState, useEffect } from 'react';
import { cameraMetricsManager } from '../../services/CameraMetricsManager';

const CameraMetricsPerformancePanel = ({ graphRef, visible = true }) => {
  const [stats, setStats] = useState(null);
  const [refreshRate, setRefreshRate] = useState(1000); // 1 seconde par défaut

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      setStats(cameraMetricsManager.getPerformanceStats());
    };

    // Mise à jour initiale
    updateStats();

    // Mise à jour périodique
    const interval = setInterval(updateStats, refreshRate);

    return () => clearInterval(interval);
  }, [visible, refreshRate]);

  const resetStats = () => {
    cameraMetricsManager.resetPerformanceStats();
    setStats(cameraMetricsManager.getPerformanceStats());
  };

  if (!visible || !stats) return null;

  const formatNumber = (num) => {
    if (num < 1000) return num.toFixed(1);
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  };

  const formatTime = (ms) => {
    if (ms < 1000) return ms.toFixed(0) + 'ms';
    if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
    return (ms / 60000).toFixed(1) + 'min';
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency > 0.8) return '#ff6b6b'; // Rouge - trop de throttling
    if (efficiency > 0.5) return '#ffcc00'; // Jaune - throttling modéré
    return '#4CAF50'; // Vert - throttling optimal
  };

  const getPerformanceColor = (fps) => {
    if (fps > 60) return '#ff6b6b'; // Rouge - trop d'updates
    if (fps > 30) return '#ffcc00'; // Jaune - updates modérées
    return '#4CAF50'; // Vert - updates optimales
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '8px'
      }}>
        <h3 style={{ margin: 0, fontSize: '13px', color: '#4CAF50' }}>
          ⚡ Camera Metrics Performance
        </h3>
        <button
          onClick={resetStats}
          style={{
            background: 'rgba(76, 175, 80, 0.2)',
            border: '1px solid #4CAF50',
            color: '#4CAF50',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {/* Uptime */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Uptime:</span>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>
            {formatTime(stats.uptime)}
          </span>
        </div>

        {/* Updates per second */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Updates/sec:</span>
          <span style={{ 
            color: getPerformanceColor(stats.updatesPerSecond), 
            fontWeight: 'bold' 
          }}>
            {stats.updatesPerSecond.toFixed(1)}
          </span>
        </div>

        {/* Notifications per second */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Notifications/sec:</span>
          <span style={{ 
            color: getPerformanceColor(stats.notificationsPerSecond), 
            fontWeight: 'bold' 
          }}>
            {stats.notificationsPerSecond.toFixed(1)}
          </span>
        </div>

        {/* Total updates */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Total Updates:</span>
          <span style={{ color: '#fff' }}>
            {formatNumber(stats.updateCount)}
          </span>
        </div>

        {/* Total notifications */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Total Notifications:</span>
          <span style={{ color: '#fff' }}>
            {formatNumber(stats.subscriberNotifications)}
          </span>
        </div>

        {/* Throttled updates */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Throttled:</span>
          <span style={{ color: '#ff9800' }}>
            {formatNumber(stats.throttledUpdates)}
          </span>
        </div>

        {/* Throttle efficiency */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#ccc' }}>Throttle Efficiency:</span>
          <span style={{ 
            color: getEfficiencyColor(stats.throttleEfficiency || 0), 
            fontWeight: 'bold' 
          }}>
            {((stats.throttleEfficiency || 0) * 100).toFixed(1)}%
          </span>
        </div>

        {/* Refresh rate control */}
        <div style={{ 
          marginTop: '8px', 
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ccc', fontSize: '10px' }}>Refresh Rate:</span>
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(Number(e.target.value))}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '10px'
              }}
            >
              <option value={100}>100ms</option>
              <option value={500}>500ms</option>
              <option value={1000}>1s</option>
              <option value={2000}>2s</option>
            </select>
          </div>
        </div>

        {/* Performance tips */}
        <div style={{ 
          marginTop: '8px', 
          padding: '6px',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderRadius: '4px',
          fontSize: '9px',
          color: '#4CAF50'
        }}>
          💡 <strong>Tips:</strong><br/>
          • Throttle efficiency &gt; 50% = optimal<br/>
          • Updates/sec &lt; 30 = good performance<br/>
          • High throttled count = system working well
        </div>
      </div>
    </div>
  );
};

export default CameraMetricsPerformancePanel; 