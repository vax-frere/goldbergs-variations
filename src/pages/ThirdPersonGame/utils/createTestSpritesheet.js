/**
 * Utilitaire pour créer une texture de spritesheet de test
 * À remplacer par la vraie texture quand elle sera disponible
 */

import * as THREE from 'three';
import { SPRITE_CONFIG } from './constants';

/**
 * Crée une texture de spritesheet de test avec des couleurs pour chaque direction
 */
export const createTestSpritesheet = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Dimensions du canvas (3 colonnes x 4 lignes)
  const frameWidth = 140;
  const frameHeight = 190;
  canvas.width = frameWidth * SPRITE_CONFIG.COLS;
  canvas.height = frameHeight * SPRITE_CONFIG.ROWS;
  
  // Couleurs pour chaque direction (plus vives pour être bien visibles)
  const directionColors = [
    '#FF4444', // BAS - Rouge vif
    '#44FFFF', // GAUCHE - Cyan vif  
    '#4444FF', // DROITE - Bleu vif
    '#44FF44', // HAUT - Vert vif
  ];
  
  const directionNames = ['BAS', 'GAUCHE', 'DROITE', 'HAUT'];
  
  // Fond blanc pour tout le canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Dessiner chaque frame
  for (let row = 0; row < SPRITE_CONFIG.ROWS; row++) {
    for (let col = 0; col < SPRITE_CONFIG.COLS; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;
      
      // Couleur de base pour cette direction
      ctx.fillStyle = directionColors[row];
      ctx.fillRect(x + 10, y + 10, frameWidth - 20, frameHeight - 20);
      
      // Bordure noire épaisse pour visualiser les frames
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, frameWidth, frameHeight);
      
      // Forme différente pour chaque frame d'animation
      const centerX = x + frameWidth / 2;
      const centerY = y + frameHeight / 2;
      
      // Dessiner des formes différentes selon la frame
      ctx.fillStyle = '#FFFFFF';
      if (col === 0) {
        // Frame 0 : cercle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (col === 1) {
        // Frame 1 : carré (frame idle)
        ctx.fillRect(centerX - 15, centerY - 15, 30, 30);
      } else if (col === 2) {
        // Frame 2 : triangle
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX - 17, centerY + 10);
        ctx.lineTo(centerX + 17, centerY + 10);
        ctx.closePath();
        ctx.fill();
      }
      
      // Texte pour identifier la direction et frame
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(directionNames[row], centerX, y + 25);
      ctx.fillText(`F${col}`, centerX, y + frameHeight - 15);
      
      // Numéro de ligne/colonne en petit
      ctx.font = '10px Arial';
      ctx.fillText(`${row},${col}`, centerX, centerY + 40);
    }
  }
  
  // Créer la texture Three.js
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrap;
  texture.wrapT = THREE.ClampToEdgeWrap;
  texture.flipY = false; // Important : ne pas retourner la texture
  
  // Debug : afficher la texture dans la console
  console.log('Spritesheet de test créé:', {
    width: canvas.width,
    height: canvas.height,
    texture: texture
  });
  
  return texture;
};

/**
 * Sauvegarde la texture de test comme image (pour debug)
 * Appelle cette fonction depuis la console pour télécharger la texture de test
 */
export const downloadTestSpritesheet = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const frameWidth = 140;
  const frameHeight = 190;
  canvas.width = frameWidth * SPRITE_CONFIG.COLS;
  canvas.height = frameHeight * SPRITE_CONFIG.ROWS;
  
  // Même logique de génération que createTestSpritesheet
  const directionColors = ['#FF4444', '#44FFFF', '#4444FF', '#44FF44'];
  const directionNames = ['BAS', 'GAUCHE', 'DROITE', 'HAUT'];
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  for (let row = 0; row < SPRITE_CONFIG.ROWS; row++) {
    for (let col = 0; col < SPRITE_CONFIG.COLS; col++) {
      const x = col * frameWidth;
      const y = row * frameHeight;
      
      ctx.fillStyle = directionColors[row];
      ctx.fillRect(x + 10, y + 10, frameWidth - 20, frameHeight - 20);
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, frameWidth, frameHeight);
      
      const centerX = x + frameWidth / 2;
      const centerY = y + frameHeight / 2;
      
      ctx.fillStyle = '#FFFFFF';
      if (col === 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fill();
      } else if (col === 1) {
        ctx.fillRect(centerX - 15, centerY - 15, 30, 30);
      } else if (col === 2) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX - 17, centerY + 10);
        ctx.lineTo(centerX + 17, centerY + 10);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(directionNames[row], centerX, y + 25);
      ctx.fillText(`F${col}`, centerX, y + frameHeight - 15);
      
      ctx.font = '10px Arial';
      ctx.fillText(`${row},${col}`, centerX, centerY + 40);
    }
  }
  
  // Télécharger l'image
  const link = document.createElement('a');
  link.download = 'test-spritesheet.png';
  link.href = canvas.toDataURL();
  link.click();
  
  console.log('Spritesheet de test téléchargé !');
};

// Exposer la fonction dans window pour pouvoir l'appeler depuis la console
if (typeof window !== 'undefined') {
  window.downloadTestSpritesheet = downloadTestSpritesheet;
} 