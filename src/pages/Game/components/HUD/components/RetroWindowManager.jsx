import React, { useEffect } from 'react';
import RetroWindow from '../../../../../components/RetroWindow';
import { useRetroWindowStore, useRetroWindowService } from '../../../services/RetroWindowService';

/**
 * Composant pour gérer l'affichage des fenêtres rétro dans le jeu
 */
const RetroWindowManager = () => {
  const windowsState = useRetroWindowStore();
  const retroWindowService = useRetroWindowService();

  // Initialiser le service au montage
  useEffect(() => {
    retroWindowService.initialize();
    
    return () => {
      // Nettoyer au démontage
      retroWindowService.cleanup();
    };
  }, [retroWindowService]);

  // Convertir la Map en Array pour le rendu
  const windowsArray = Array.from(windowsState.windows.values());

  const handleCloseWindow = (windowId) => {
    retroWindowService.closeWindow(windowId);
  };

  const handleFocusWindow = (windowId) => {
    windowsState.focusWindow(windowId);
  };

  return (
    <>
      {windowsArray.map((window) => (
        // Afficher la fenêtre tant qu'elle n'est pas complètement supprimée du store
        // Cela permet à l'animation de sortie de se jouer
        <RetroWindow
            key={window.id}
            title={window.title}
            onClose={() => handleCloseWindow(window.id)}
            onFocus={() => handleFocusWindow(window.id)}
            width={window.width}
            height={window.height}
            initialPosition={window.position}
            zIndex={window.zIndex}
            isOpen={window.isOpen}
          >
            {window.image && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <img 
                  src={window.image} 
                  alt="Window content" 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    border: '1px solid #ffffff',
                    filter: 'grayscale(100%)'
                  }} 
                />
              </div>
            )}
            <div style={{ 
              fontFamily: 'monospace', 
              fontSize: '12px', 
              color: '#ffffff',
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap'
            }}>
              {window.content}
            </div>
          </RetroWindow>
      ))}
    </>
  );
};

export default RetroWindowManager; 