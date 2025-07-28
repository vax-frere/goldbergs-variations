import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Game } from './core/Game';

const TrollingGame = () => {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      // Initialiser le jeu Phaser
      phaserGameRef.current = new Game(gameRef.current);
      
      // Exposer globalement pour debug
      window.game = phaserGameRef.current;
      
      // Instructions debug dans la console
      console.log('🎮 TrollingGame initialisé!');
      console.log('🔧 DEBUG MODE:');
      console.log('   Touche P = Activer/désactiver les colliders + rayon de cri');
      console.log('   Console:');
      console.log('     window.game.toggleDebug() = Toggle tout le debug');
      console.log('     window.game.toggleShoutRadiusDebug() = Toggle uniquement le rayon de cri');
    }

    return () => {
      // Nettoyer le jeu lors du démontage
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy();
        phaserGameRef.current = null;
      }
      
      // Nettoyer la référence globale
      if (window.game) {
        delete window.game;
      }
    };
  }, []);

  return (
    <>
      <Box
        ref={gameRef}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#000000',
          zIndex: 1000,
        }}
      />
      
      {/* Légende des contrôles */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          padding: '5px 8px',
          borderRadius: '3px',
          zIndex: 1001,
          lineHeight: '1.2',
        }}
              >
          Controls: Arrows: move • Space: shout
        </div>
    </>
  );
};

export default TrollingGame; 