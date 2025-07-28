# TrollingGame - Version Simplifiée

## Description
Un jeu 2D minimaliste vue du dessus créé avec Phaser. Le joueur évolue dans un niveau simple avec seulement les murs du périmètre.

## Fonctionnalités
- **Joueur** : Personnage contrôlable avec les flèches directionnelles ou WASD
- **Niveau unique** : Un seul niveau appelé "main" avec le joueur au centre
- **Murs de périmètre** : Collisions avec les bords du niveau
- **Animations** : Animations de marche et d'arrêt dans les 4 directions

## Contrôles
- **Flèches directionnelles** ou **WASD** : Déplacer le joueur

## Structure des fichiers

```
TrollingGame/
├── GameJamExperiment.jsx     # Composant React principal
├── core/                     # Systèmes principaux
│   ├── interfaces.js         # Interfaces/abstractions
│   ├── Game.js              # Classe principale Phaser
│   ├── GameScene.js         # Scène principale
│   ├── EntityManager.js     # Gestion des entités
│   └── CollisionSystem.js   # Système de collision
├── entities/                 # Entités du jeu
│   ├── BaseEntity.js        # Classe de base
│   ├── Player.js            # Joueur (simplifié)
│   └── Wall.js              # Mur/obstacle
└── levels/                   # Niveau du jeu
    └── MainLevel.js         # Niveau principal unique
```

## Entités

### Player (Joueur)
- **Position** : Centré dans le niveau (400, 300)
- **Sprite** : Yume Nikki character spritesheet
- **Mouvement** : 4 directions avec animations
- **Collisions** : Avec les murs du périmètre

### Wall (Mur)
- **Position** : Tout autour du périmètre du niveau
- **Taille** : 32x32 pixels
- **Couleur** : Marron (#8b4513)

### MainLevel (Niveau Principal)
- **Taille** : 800x600 pixels
- **Contenu** : Joueur au centre + murs du périmètre
- **Arrière-plan** : Vert foncé (#2d5f3f)

## Technologies utilisées
- **Phaser 3** : Moteur de jeu 2D
- **React** : Interface utilisateur
- **MUI** : Composants UI
- **ES6+ Classes** : Architecture orientée objet simplifiée

## Architecture Simplifiée

Le jeu suit une architecture simple avec :
- Un seul niveau (`MainLevel`)
- Seulement les entités nécessaires (`Player`, `Wall`)
- Systèmes de base (`EntityManager`, `CollisionSystem`)
- Pas d'effets, d'IA complexe ou de système multi-niveaux

## Objectif
Ce jeu sert de base minimaliste pour d'éventuelles extensions futures, avec une structure propre et simple à comprendre. 