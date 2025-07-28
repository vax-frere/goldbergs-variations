import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { Game } from './core/Game';

const GameJamExperiment = () => {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      // Initialiser le jeu Phaser
      phaserGameRef.current = new Game(gameRef.current);
    }

    return () => {
      // Nettoyer le jeu lors du démontage
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy();
        phaserGameRef.current = null;
      }
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
      }}
    >
      <Box
        ref={gameRef}
        sx={{
          width: 800,
          height: 600,
          border: '2px solid #333',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      />
    </Box>
  );
};

export default GameJamExperiment; 