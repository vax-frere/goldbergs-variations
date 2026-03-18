import React, { useEffect, useRef } from 'react';
import { Game } from './core/Game';

const TrollingGame = () => {
  const gameRef = useRef(null);
  const phaserGameRef = useRef(null);

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      phaserGameRef.current = new Game(gameRef.current);
      window.game = phaserGameRef.current;
      
      console.log('🎮 TrollingGame initialisé!');
      console.log('🔧 DEBUG MODE:');
      console.log('   Touche P = Activer/désactiver les colliders + rayon de cri');
      console.log('   Console:');
      console.log('     🎯 NIVEAUX:');
      console.log('       window.game.switchLevel("shepherd") = Shepherd\'s Gate');
      console.log('       window.game.switchLevel("piper") = Pied Piper');
      console.log('       window.game.switchLevel("scapegoat") = Scapegoat');
      console.log('       window.game.getLevelInfo() = Infos niveau actuel');
      console.log('     🔧 DEBUG:');
      console.log('       window.game.toggleDebug() = Toggle tout le debug');
      console.log('       window.game.toggleShoutRadiusDebug() = Toggle rayon de cri');
      console.log('       window.game.toggleNpcDebug() = Toggle flèches NPCs');
      console.log('     📝 TUTORIAL:');
      console.log('       window.game.toggleTutorialArrow() = Toggle "this is you"');
      console.log('       window.game.resetTutorial() = Reset tutorial');
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy();
        phaserGameRef.current = null;
      }
      if (window.game) {
        delete window.game;
      }
    };
  }, []);

  return (
    <div
      ref={gameRef}
      style={{
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
  );
};

export default TrollingGame;
