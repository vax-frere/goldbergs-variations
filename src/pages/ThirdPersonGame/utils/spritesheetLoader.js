/**
 * Loader pour le spritesheet Yume Nikki réel
 */

import * as THREE from 'three';
import { getImagePath } from '../../../utils/assetLoader';

/**
 * Charge le vrai spritesheet Yume Nikki
 */
export const loadYumeNikkiSpritesheet = () => {
  return new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    
    // Remettre le vrai spritesheet Yume Nikki avec transparence
    const spritesheetPath = getImagePath('yume-nikki-character-spritesheet-transparent.png');
    
    console.log('🔍 Chargement du spritesheet Yume Nikki depuis:', spritesheetPath);
    console.log('🌐 BASE_URL actuelle:', import.meta.env.BASE_URL);
    console.log('📁 URL complète générée:', spritesheetPath);
    
    // Test rapide de la disponibilité de l'image
    const testImage = new Image();
    testImage.onload = () => {
      console.log('✅ Image accessible via test direct');
      loadTexture();
    };
    testImage.onerror = () => {
      console.error('❌ Image non accessible via test direct');
      console.error('🔗 URL testée:', spritesheetPath);
      // On essaie quand même le TextureLoader au cas où
      loadTexture();
    };
    testImage.src = spritesheetPath;
    
    function loadTexture() {
      textureLoader.load(
        spritesheetPath,
        // onLoad
        (texture) => {
          console.log('✅ Spritesheet chargé avec succès !');
          console.log('📊 Détails de la texture:', {
            width: texture.image.width,
            height: texture.image.height,
            format: texture.format,
            type: texture.type,
            image: texture.image,
            uuid: texture.uuid
          });
          
          // Configuration pour le style pixelisé avec valeurs numériques directes
          texture.magFilter = 1003; // THREE.NearestFilter
          texture.minFilter = 1003; // THREE.NearestFilter
          texture.wrapS = 1001;     // THREE.ClampToEdgeWrap
          texture.wrapT = 1001;     // THREE.ClampToEdgeWrap
          texture.flipY = true;     // Retourner la texture pour corriger l'orientation
          texture.needsUpdate = true;
          
          console.log('⚙️ Configuration texture appliquée:', {
            magFilter: texture.magFilter,
            minFilter: texture.minFilter,
            wrapS: texture.wrapS,
            wrapT: texture.wrapT,
            flipY: texture.flipY
          });
          
          // Vérifier que l'image est bien chargée
          if (!texture.image || texture.image.width === 0 || texture.image.height === 0) {
            console.error('❌ Image vide ou invalide');
            reject(new Error('Image invalide'));
            return;
          }
          
          console.log('🎯 Texture prête à être utilisée');
          resolve(texture);
        },
        // onProgress
        (progress) => {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📥 Chargement spritesheet: ${percent}%`);
        },
        // onError
        (error) => {
          console.error('❌ Erreur lors du chargement du spritesheet:', error);
          console.error('🔗 URL testée:', spritesheetPath);
          reject(error);
        }
      );
    }
  });
};

/**
 * Fonction pour analyser les dimensions du spritesheet et ajuster les constantes
 */
export const analyzeSpritesheet = (texture) => {
  const width = texture.image.width;
  const height = texture.image.height;
  
  console.log(`🔬 Analyse du spritesheet: ${width}x${height}`);
  
  // Estimation basée on des dimensions typiques de spritesheets Yume Nikki
  // Souvent 3 colonnes x 4 lignes pour les directions
  const estimatedCols = 3;
  const estimatedRows = 4;
  
  const frameWidth = width / estimatedCols;
  const frameHeight = height / estimatedRows;
  
  console.log(`📐 Dimensions estimées par frame: ${frameWidth}x${frameHeight}`);
  
  const params = {
    totalWidth: width,
    totalHeight: height,
    frameWidth: Math.floor(frameWidth),
    frameHeight: Math.floor(frameHeight),
    cols: estimatedCols,
    rows: estimatedRows,
    uvScaleX: 1 / estimatedCols,
    uvScaleY: 1 / estimatedRows
  };
  
  console.log('📋 Paramètres calculés:', params);
  
  return params;
}; 