/**
 * Hook useGameState - Gestion de l'état global du jeu
 * Centralise la logique d'état selon le principe Single Responsibility
 */

import { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

export const useGameState = () => {
  const [gameState, setGameState] = useState({
    isPlaying: false,
    isPaused: false,
    playerPosition: new THREE.Vector3(0, 0, 0),
    cameraTarget: new THREE.Vector3(0, 0, 0),
  });

  // Démarrer le jeu
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false
    }));
  }, []);

  // Pauser le jeu
  const pauseGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: true
    }));
  }, []);

  // Reprendre le jeu
  const resumeGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPaused: false
    }));
  }, []);

  // Arrêter le jeu
  const stopGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false
    }));
  }, []);

  // Mettre à jour la position du joueur
  const updatePlayerPosition = useCallback((newPosition) => {
    setGameState(prev => ({
      ...prev,
      playerPosition: newPosition.clone(),
      cameraTarget: newPosition.clone()
    }));
  }, []);

  // Auto-start du jeu
  useEffect(() => {
    startGame();
  }, [startGame]);

  return {
    // État
    gameState,
    
    // Actions
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    updatePlayerPosition,
    
    // États dérivés
    isActive: gameState.isPlaying && !gameState.isPaused,
    playerPosition: gameState.playerPosition,
    cameraTarget: gameState.cameraTarget,
  };
}; 