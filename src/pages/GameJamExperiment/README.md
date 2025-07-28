# Game Jam Experiment - Jeu Style Pokemon 2D

## Description
Un jeu 2D vue du dessus style Pokemon créé avec Phaser et respectant les principes SOLID. Le joueur évolue dans une école avec des étudiants qui se déplacent aléatoirement. Quand le joueur entre en contact avec un étudiant, un effet de bruit général est appliqué au jeu.

## Fonctionnalités
- **Joueur** : Personnage bleu contrôlable avec les flèches ou WASD
- **Étudiants** : NPCs orange qui se déplacent aléatoirement dans l'école
- **Interactions** : Contact avec les étudiants déclenche des effets visuels et sonores
- **Effets de bruit** : Tremblement d'écran, overlay visuel, distorsion des entités
- **Collisions** : Système de collision avec les murs et entités
- **Système de niveaux** : Passage entre différents niveaux via des portes interactives
- **Portes interactives** : Popup d'interaction et changement de niveau avec ESPACE

## Contrôles
- **Flèches directionnelles** ou **WASD** : Déplacer le joueur
- **ESPACE** : Interagir avec les portes et autres entités
- **P** : Activer/désactiver le mode debug
- **Approchez-vous des étudiants** : Interaction automatique

## Architecture (Principes SOLID)

### Single Responsibility Principle
- `EntityManager` : Gère uniquement les entités
- `CollisionSystem` : Gère uniquement les collisions
- `EffectManager` : Gère uniquement les effets
- `SchoolLevel` : Gère uniquement la logique du niveau

### Open/Closed Principle
- Classes abstraites (`BaseEntity`, `IEffect`, `IBehavior`) extensibles
- Nouveau niveau = nouvelle classe héritant de `ILevel`
- Nouveaux effets = nouvelles classes héritant de `IEffect`

### Liskov Substitution Principle
- Toutes les entités (`Player`, `Student`, `Wall`) peuvent remplacer `BaseEntity`
- Tous les effets peuvent remplacer `IEffect`

### Interface Segregation Principle
- Interfaces spécifiques : `IMovable`, `ICollidable`, `IInteractable`
- Entités implémentent seulement les interfaces nécessaires

### Dependency Inversion Principle
- Systèmes dépendent d'abstractions, pas d'implémentations concrètes
- Injection de dépendances dans les constructeurs

## Structure des fichiers

```
GameJamExperiment/
├── GameJamExperiment.jsx     # Composant React principal
├── core/                     # Systèmes principaux
│   ├── interfaces.js         # Interfaces/abstractions
│   ├── Game.js              # Classe principale Phaser
│   ├── GameScene.js         # Scène principale
│   ├── EntityManager.js     # Gestion des entités
│   └── CollisionSystem.js   # Système de collision
├── entities/                 # Entités du jeu
│   ├── BaseEntity.js        # Classe de base
│   ├── Player.js            # Joueur
│   ├── Student.js           # Étudiant NPC
│   ├── Wall.js              # Mur/obstacle
│   ├── Door.js              # Porte interactive
│   └── behaviors/           # Comportements IA
│       └── RandomWalkBehavior.js
├── effects/                  # Effets visuels/sonores
│   ├── EffectManager.js     # Gestionnaire d'effets
│   └── NoiseEffect.js       # Effet de bruit
└── levels/                   # Niveaux du jeu
    ├── SchoolLevel.js       # Niveau école (niveau 1)
    └── Level2.js            # Niveau 2 (plus petit et vide)
```

## Extensibilité

### Ajouter un nouveau niveau
1. Créer une classe héritant de `ILevel`
2. Implémenter `init()`, `update()`, `cleanup()`
3. Ajouter au router dans `GameScene`

### Ajouter une nouvelle entité
1. Créer une classe héritant de `BaseEntity`
2. Implémenter les interfaces nécessaires (`IMovable`, `ICollidable`, etc.)
3. Ajouter au `EntityManager`

### Ajouter un nouvel effet
1. Créer une classe héritant de `IEffect`
2. Implémenter `apply()`, `remove()`, `isFinished()`
3. Ajouter au `EffectManager`

## Technologies utilisées
- **Phaser 3** : Moteur de jeu 2D
- **React** : Interface utilisateur
- **MUI** : Composants UI
- **ES6+ Classes** : Architecture orientée objet

## Système de niveaux
Le jeu dispose maintenant d'un système de niveaux multi-niveaux :

### Niveau 1 (SchoolLevel)
- **Taille** : 768x568 pixels
- **Contenu** : École avec étudiants, murs, décorations
- **Effets** : Effet de bruit basé sur la distance avec les étudiants
- **Porte** : Située à droite du niveau, mène au niveau 2

### Niveau 2 (Level2)
- **Taille** : 432x332 pixels (plus petit)
- **Contenu** : Niveau vide avec seulement les murs de périmètre
- **Particularité** : Aucun effet de bruit, environnement calme
- **Couleur** : Sol bleuté pour différencier du niveau 1

### Interaction avec les portes
1. **Proximité** : Approchez-vous de la porte (rayon de 60 pixels)
2. **Popup** : Un message apparaît : "Appuyez sur [ESPACE] pour entrer"
3. **Interaction** : Appuyez sur ESPACE pour changer de niveau
4. **Transition** : Le niveau se nettoie automatiquement et le nouveau niveau se charge

## Prochaines étapes
- Ajouter des sprites réels
- Implémenter des sons
- Créer d'autres niveaux
- Ajouter plus d'interactions
- Système de score/progression
- Ajouter un moyen de revenir au niveau 1 depuis le niveau 2 