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
      console.log('     🎯 NIVEAUX:');
      console.log('       window.game.switchLevel("shepherd") = Shepherd\'s Gate (pousser dans le trou)');
      console.log('       window.game.switchLevel("piper") = Pied Piper (faire suivre)');
      console.log('       window.game.getLevelInfo() = Infos niveau actuel');
      console.log('     🔧 DEBUG:');
      console.log('       window.game.toggleDebug() = Toggle tout le debug');
      console.log('       window.game.toggleShoutRadiusDebug() = Toggle uniquement le rayon de cri');
      console.log('       window.game.toggleNpcDebug() = Toggle les flèches de destination des NPCs');
      console.log('     📝 TUTORIAL:');
      console.log('       window.game.toggleTutorialArrow() = Toggle l\'image "this is you"');
      console.log('       window.game.resetTutorial() = Remettre le tutorial à zéro');
      console.log('       window.game.forceHideTutorial() = Forcer le masquage du tutorial');
      console.log('       window.game.getTutorialDebugState() = État complet du tutorial');
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
      
    </>
  );
};

export default TrollingGame; 