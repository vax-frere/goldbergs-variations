#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * 🎨 Générateur de Spritesheet SVG Multi-Animations
 * Combine tous les SVGs d'animations en un seul spritesheet
 * Support de plusieurs animations avec nombres de frames variables
 */

// Configuration
const EXPORTS_DIR = './exports';
const OUTPUT_FILE = './character-spritesheet.svg';

// Ordre des directions (important pour la cohérence)
const DIRECTIONS = [
  'front',        // 0 - Vers le bas
  'frontright',   // 1 - Diagonale bas-droite (accepte aussi front-right)
  'right',        // 2 - Vers la droite
  'backright',    // 3 - Diagonale haut-droite (accepte aussi back-right)
  'back',         // 4 - Vers le haut
  'backleft',     // 5 - Diagonale haut-gauche (accepte aussi back-left)
  'left',         // 6 - Vers la gauche
  'frontleft'     // 7 - Diagonale bas-gauche (accepte aussi front-left)
];

// Mapping pour compatibilité avec les anciennes directions
const DIRECTION_ALIASES = {
  'front-right': 'frontright',
  'back-right': 'backright', 
  'back-left': 'backleft',
  'front-left': 'frontleft'
};

const SPRITE_WIDTH = 120;  // Largeur de chaque sprite (réduit de 600 à 120)
const SPRITE_HEIGHT = 200; // Hauteur de chaque sprite (réduit de 1000 à 200)

/**
 * Lire et parser un fichier SVG
 */
function readSvgFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extraire le contenu entre les balises <svg>...</svg>
    const svgMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (!svgMatch) {
      console.warn(`⚠️ Impossible de parser ${filePath}`);
      return null;
    }
    
    // Extraire les attributs viewBox si présents
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 600 1000';
    
    // Nettoyage: supprimer tous les attributs inkscape:* et forcer stroke-width="2.0"
    let inner = svgMatch[1]
      // retirer attributs inkscape:xxx="..."
      .replace(/\s+inkscape:[^=\s]+="[^"]*"/g, '')
      // forcer l'épaisseur de trait
      .replace(/stroke-width="1\.0"/g, 'stroke-width="2.0"');
    
    return {
      content: inner,
      viewBox: viewBox,
      originalPath: filePath
    };
  } catch (error) {
    console.warn(`⚠️ Erreur lecture ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Analyser et organiser les SVGs par animation, direction et frame
 */
function analyzeAndOrganizeSvgs() {
  const organized = {};
  const files = fs.readdirSync(EXPORTS_DIR).filter(file => file.endsWith('.svg'));
  
  console.log(`📁 Trouvé ${files.length} fichiers SVG`);
  
  files.forEach(file => {
    // Parser le nouveau format : animation_direction_frame.svg
    const match = file.match(/^(.+)_(.+)_(\d{2})\.svg$/);
    if (!match) {
      console.warn(`⚠️ Nom de fichier non reconnu : ${file} (format attendu: animation_direction_XX.svg)`);
      return;
    }
    
    const [, animation, direction, frameStr] = match;
    const frameNum = parseInt(frameStr, 10);
    
    // Normaliser la direction (gérer les aliases)
    const normalizedDirection = DIRECTION_ALIASES[direction] || direction;
    
    if (!DIRECTIONS.includes(normalizedDirection)) {
      console.warn(`⚠️ Direction inconnue : ${direction} dans ${file}`);
      return;
    }
    
    // Initialiser l'animation si nécessaire
    if (!organized[animation]) {
      organized[animation] = {};
      DIRECTIONS.forEach(dir => {
        organized[animation][dir] = [];
      });
    }
    
    // Lire le contenu SVG
    const svgData = readSvgFile(path.join(EXPORTS_DIR, file));
    if (svgData) {
      organized[animation][normalizedDirection][frameNum] = svgData;
      console.log(`✅ ${animation} → ${normalizedDirection}_${frameStr} (frame ${frameNum})`);
    }
  });
  
  return organized;
}

/**
 * Calculer les statistiques des animations
 */
function calculateAnimationStats(organizedSvgs) {
  const stats = {};
  let maxFrames = 0;
  
  Object.keys(organizedSvgs).forEach(animation => {
    const animData = organizedSvgs[animation];
    
    // Compter le nombre max de frames pour cette animation
    let animMaxFrames = 0;
    DIRECTIONS.forEach(direction => {
      const frames = animData[direction];
      const frameCount = frames.filter(frame => frame !== undefined).length;
      animMaxFrames = Math.max(animMaxFrames, frameCount);
    });
    
    stats[animation] = {
      maxFrames: animMaxFrames,
      directions: {}
    };
    
    // Statistiques par direction
    DIRECTIONS.forEach(direction => {
      const frames = animData[direction];
      const frameCount = frames.filter(frame => frame !== undefined).length;
      stats[animation].directions[direction] = {
        frameCount: frameCount,
        frames: frames.map((frame, index) => frame ? index : null).filter(i => i !== null)
      };
    });
    
    maxFrames = Math.max(maxFrames, animMaxFrames);
    console.log(`📊 Animation "${animation}": ${animMaxFrames} frames max`);
  });
  
  console.log(`📏 Largeur du spritesheet basée sur : ${maxFrames} frames max`);
  
  return { stats, maxFrames };
}

/**
 * Générer le spritesheet SVG multi-animations
 */
function generateMultiAnimationSpritesheet(organizedSvgs, maxFrames) {
  const animations = Object.keys(organizedSvgs);
  const totalWidth = SPRITE_WIDTH * maxFrames;
  const totalHeight = SPRITE_HEIGHT * DIRECTIONS.length * animations.length;
  
  console.log(`🎨 Génération spritesheet ${totalWidth}x${totalHeight}`);
  console.log(`📐 ${animations.length} animations × ${DIRECTIONS.length} directions × max ${maxFrames} frames`);
  
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" style="background-color: transparent;">
  <!-- Spritesheet multi-animations généré automatiquement -->
  <!-- ${animations.length} animations × ${DIRECTIONS.length} directions × max ${maxFrames} frames -->
  
`;

  let spriteCount = 0;
  let currentRow = 0;
  
  // Pour chaque animation
  animations.forEach((animation, animIndex) => {
    svgContent += `  <!-- =============================================== -->\n`;
    svgContent += `  <!-- Animation: ${animation} (lignes ${currentRow}-${currentRow + DIRECTIONS.length - 1}) -->\n`;
    svgContent += `  <!-- =============================================== -->\n`;
    
    const animData = organizedSvgs[animation];
    
    // Pour chaque direction de cette animation
    DIRECTIONS.forEach((direction, dirIndex) => {
      const row = currentRow + dirIndex;
      const y = row * SPRITE_HEIGHT;
      
      svgContent += `  <!-- ${animation} - ${direction} (ligne ${row}) -->\n`;
      
      const frames = animData[direction];
      const frameCount = frames.filter(frame => frame !== undefined).length;
      
      // Pour chaque frame de cette direction
      for (let frameIndex = 0; frameIndex < maxFrames; frameIndex++) {
        const x = frameIndex * SPRITE_WIDTH;
        const sprite = frames[frameIndex];
        
        if (sprite) {
          svgContent += `  <!-- ${animation}_${direction}_${frameIndex.toString().padStart(2, '0')} -->\n`;
          svgContent += `  <g transform="translate(${x}, ${y})">\n`;
          svgContent += sprite.content.split('\n').map(line => `    ${line}`).join('\n');
          svgContent += `\n  </g>\n`;
          spriteCount++;
        } else if (frameIndex < frameCount) {
          // Frame manquante dans la séquence
          svgContent += `  <!-- MANQUANT: ${animation}_${direction}_${frameIndex.toString().padStart(2, '0')} -->\n`;
          svgContent += `  <rect x="${x}" y="${y}" width="${SPRITE_WIDTH}" height="${SPRITE_HEIGHT}" fill="none" stroke="#ff0000" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>\n`;
          svgContent += `  <text x="${x + SPRITE_WIDTH/2}" y="${y + SPRITE_HEIGHT/2}" text-anchor="middle" fill="#ff0000" font-size="24">MANQUANT</text>\n`;
          console.warn(`❌ Sprite manquant : ${animation}_${direction}_${frameIndex.toString().padStart(2, '0')}`);
        }
        // Sinon on ne dessine rien (espace vide pour les frames au-delà de la séquence)
      }
      
      svgContent += '\n';
    });
    
    currentRow += DIRECTIONS.length;
    svgContent += '\n';
  });
  
  svgContent += `</svg>`;
  
  console.log(`✨ ${spriteCount} sprites générés sur ${animations.length * DIRECTIONS.length * maxFrames} positions possibles`);
  
  return svgContent;
}

/**
 * Générer les métadonnées multi-animations
 */
function generateMultiAnimationMetadata(organizedSvgs, maxFrames) {
  const animations = Object.keys(organizedSvgs);
  const totalWidth = SPRITE_WIDTH * maxFrames;
  const totalHeight = SPRITE_HEIGHT * DIRECTIONS.length * animations.length;
  
  const metadata = {
    spritesheet: {
      width: totalWidth,
      height: totalHeight,
      spriteWidth: SPRITE_WIDTH,
      spriteHeight: SPRITE_HEIGHT,
      maxFramesPerAnimation: maxFrames,
      animationsCount: animations.length,
      directionsCount: DIRECTIONS.length
    },
    animations: {},
    directions: DIRECTIONS
  };
  
  let currentRow = 0;
  
  // Métadonnées par animation
  animations.forEach((animation, animIndex) => {
    const animData = organizedSvgs[animation];
    
    // Calculer le nombre max de frames pour cette animation
    let animMaxFrames = 0;
    DIRECTIONS.forEach(direction => {
      const frames = animData[direction];
      const frameCount = frames.filter(frame => frame !== undefined).length;
      animMaxFrames = Math.max(animMaxFrames, frameCount);
    });
    
    metadata.animations[animation] = {
      index: animIndex,
      startRow: currentRow,
      endRow: currentRow + DIRECTIONS.length - 1,
      maxFrames: animMaxFrames,
      directions: {},
      frameData: {}
    };
    
    // Métadonnées par direction pour cette animation
    DIRECTIONS.forEach((direction, dirIndex) => {
      const row = currentRow + dirIndex;
      const frames = animData[direction];
      const frameCount = frames.filter(frame => frame !== undefined).length;
      
      metadata.animations[animation].directions[direction] = {
        directionIndex: dirIndex,
        row: row,
        frameCount: frameCount,
        y: row * SPRITE_HEIGHT
      };
      
      // Données des frames pour cette direction
      metadata.animations[animation].frameData[direction] = {
        frames: frames.map((frame, index) => {
          if (frame) {
            return {
              frame: index,
              x: index * SPRITE_WIDTH,
              y: row * SPRITE_HEIGHT,
              exists: true
            };
          }
          return null;
        }).filter(f => f !== null)
      };
    });
    
    currentRow += DIRECTIONS.length;
  });
  
  return metadata;
}

/**
 * Script principal
 */
function main() {
  console.log('🎨 === Générateur de Spritesheet SVG Multi-Animations ===\n');
  
  // Vérifier que le dossier exports existe
  if (!fs.existsSync(EXPORTS_DIR)) {
    console.error(`❌ Dossier ${EXPORTS_DIR} introuvable !`);
    process.exit(1);
  }
  
  // Analyser et organiser les SVGs
  console.log('📂 Analyse des animations...');
  const organizedSvgs = analyzeAndOrganizeSvgs();
  
  const animationNames = Object.keys(organizedSvgs);
  if (animationNames.length === 0) {
    console.error('❌ Aucune animation trouvée !');
    process.exit(1);
  }
  
  console.log(`\n🎭 Animations détectées : ${animationNames.join(', ')}`);
  
  // Calculer les statistiques
  const { stats, maxFrames } = calculateAnimationStats(organizedSvgs);
  
  // Générer le spritesheet
  console.log('\n🎨 Génération du spritesheet multi-animations...');
  let spritesheetSvg = generateMultiAnimationSpritesheet(organizedSvgs, maxFrames);
  
  // Remplacer les traits noirs par des traits blancs
  console.log('🎨 Conversion des traits noirs en blancs...');
  spritesheetSvg = spritesheetSvg.replace(/stroke="rgb\(0, 0, 0\)"/g, 'stroke="rgb(255, 255, 255)"');
  
  // Nettoyage global de sécurité: supprimer les attributs inkscape:* restants et forcer stroke-width="2.0"
  spritesheetSvg = spritesheetSvg
    .replace(/\s+inkscape:[^=\s]+="[^"]*"/g, '')
    .replace(/stroke-width="1\.0"/g, 'stroke-width="3.0"');
  
  // Écrire le fichier SVG
  fs.writeFileSync(OUTPUT_FILE, spritesheetSvg, 'utf8');
  console.log(`✅ Spritesheet sauvegardé : ${OUTPUT_FILE}`);
  
  // Générer et sauvegarder les métadonnées
  const metadata = generateMultiAnimationMetadata(organizedSvgs, maxFrames);
  const metadataFile = OUTPUT_FILE.replace('.svg', '-metadata.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`✅ Métadonnées sauvegardées : ${metadataFile}`);
  
  // Copie automatique vers les dossiers de destination
  console.log('\n📦 Copie vers les dossiers de destination...');
  
  const destinations = [
    '../public/blender/',
    '../public/img/trolling-game/'
  ];
  
  destinations.forEach(destDir => {
    try {
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        console.log(`📁 Dossier créé : ${destDir}`);
      }
      
      // Copier le spritesheet
      const destSpritesheet = path.join(destDir, path.basename(OUTPUT_FILE));
      fs.copyFileSync(OUTPUT_FILE, destSpritesheet);
      
      // Copier les métadonnées
      const destMetadata = path.join(destDir, path.basename(metadataFile));
      fs.copyFileSync(metadataFile, destMetadata);
      
      console.log(`✅ Copié vers : ${destDir}`);
    } catch (error) {
      console.warn(`⚠️ Erreur copie vers ${destDir}:`, error.message);
    }
  });
  
  console.log('\n🎉 Spritesheet multi-animations généré avec succès !');
  console.log(`📏 Dimensions : ${metadata.spritesheet.width}x${metadata.spritesheet.height}`);
  console.log(`🎭 ${animationNames.length} animations × ${DIRECTIONS.length} directions × max ${maxFrames} frames`);
  
  // Résumé par animation
  console.log('\n📊 Résumé des animations :');
  animationNames.forEach(anim => {
    const animStats = stats[anim];
    console.log(`   ${anim}: ${animStats.maxFrames} frames max`);
  });
}

// Exécuter le script
main(); 