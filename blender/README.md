# 🎨 Générateur de Spritesheet SVG Multi-Animations

Ce dossier contient un générateur automatique de spritesheet SVG qui combine plusieurs animations de personnage en un seul fichier optimisé.

## 📊 Spritesheet Actuel

**Dimensions :** `22200×48000` pixels
- **6 animations** distinctes
- **8 directions** par animation (front, frontright, right, backright, back, backleft, left, frontleft)
- **37 frames maximum** par direction (déterminé par l'animation la plus longue)
- **920 sprites** au total

### 🎭 Animations Disponibles

| Animation | Frames Max | Description |
|-----------|------------|-------------|
| `idle9` | 17 frames | Animation d'inactivité |
| `proudstrutinplace` | 37 frames | Animation de marche fière sur place |
| `running` | 6 frames | Animation de course |
| `skipforward` | 23 frames | Animation de saut en avant |
| `walking` | 9 frames | Animation de marche normale |
| `zombiescream` | 23 frames | Animation de cri de zombie |

## 🚀 Utilisation

### Génération du Spritesheet

```bash
node create_spritesheet.js
```

### Structure des Fichiers Sources

Les fichiers SVG doivent suivre le format : `{animation}_{direction}_{frame}.svg`

**Exemple :**
- `walking_front_00.svg` à `walking_front_08.svg`
- `running_backright_00.svg` à `running_backright_05.svg`
- `idle9_left_00.svg` à `idle9_left_16.svg`

### Directions Supportées

Le générateur accepte les formats suivants :
- `front`, `back`, `left`, `right`
- `frontleft`, `frontright`, `backleft`, `backright`
- Aussi compatible avec : `front-left`, `front-right`, `back-left`, `back-right`

## 📁 Fichiers Générés

### `character-spritesheet.svg` (14M)
Le spritesheet principal contenant toutes les animations organisées verticalement :
- Chaque animation occupe 8 lignes (une par direction)
- Largeur adaptative basée sur l'animation avec le plus de frames
- Chaque sprite : `600×1000` pixels

### `character-spritesheet-metadata.json` (132K)
Métadonnées complètes incluant :
- Dimensions globales du spritesheet
- Position et taille de chaque animation
- Coordonnées exactes de chaque frame
- Statistiques par animation et direction

## 🎯 Utilisation dans le Jeu

### Exemple d'accès aux frames

```javascript
// Accès direct par animation et direction
const metadata = require('./character-spritesheet-metadata.json');

// Obtenir les frames de l'animation "walking" direction "front"
const walkingFrontFrames = metadata.animations.walking.frameData.front.frames;

// Exemple de frame : { frame: 0, x: 0, y: 8000, exists: true }
const firstFrame = walkingFrontFrames[0];
```

### Organisation du Spritesheet

```
Ligne 0-7   : idle9 (8 directions)
Ligne 8-15  : proudstrutinplace (8 directions)  
Ligne 16-23 : running (8 directions)
Ligne 24-31 : skipforward (8 directions)
Ligne 32-39 : walking (8 directions)
Ligne 40-47 : zombiescream (8 directions)
```

## ⚙️ Configuration

### Variables Principales (dans `create_spritesheet.js`)

```javascript
const SPRITE_WIDTH = 600;   // Largeur de chaque sprite
const SPRITE_HEIGHT = 1000; // Hauteur de chaque sprite
const EXPORTS_DIR = './exports'; // Dossier des SVGs sources
```

### Ajout d'une Nouvelle Animation

1. Placez vos fichiers SVG dans `/exports` avec le format : `{nouvelleAnim}_{direction}_{frame}.svg`
2. Lancez `node create_spritesheet.js`
3. Le script détectera automatiquement la nouvelle animation
4. La largeur du spritesheet s'adaptera si nécessaire

## 🔧 Fonctionnalités

- ✅ **Détection automatique** des animations et frames
- ✅ **Largeur adaptative** basée sur l'animation la plus longue
- ✅ **Compatibilité** avec différents formats de noms de directions
- ✅ **Gestion des frames manquantes** avec visualisation d'erreur
- ✅ **Métadonnées riches** pour une intégration facile
- ✅ **Préservation de la qualité** vectorielle SVG
- ✅ **Organisation claire** par blocs d'animation

## 📈 Statistiques

- **920 fichiers SVG** traités
- **6 animations** distinctes
- **37 frames max** par direction (proudstrutinplace)
- **Taux d'utilisation :** 920/1776 positions (51.8%)
- **Taille finale :** 14M (SVG) + 132K (métadonnées) 