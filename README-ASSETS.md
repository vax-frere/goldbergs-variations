# Gestion des Assets dans Goldbergs Variations

Ce document explique comment les assets sont gérés dans l'application Goldbergs Variations.

## Système d'assets centralisé

### Introduction

Ce système centralisé permet de gérer tous les assets (textures, sons, géométries, matériaux) de l'application de manière cohérente et optimisée.

Les fonctionnalités principales incluent :

- Chargement asynchrone des assets
- Gestion centralisée du cycle de vie des ressources
- Accès uniforme depuis n'importe quel composant
- Évite la duplication de ressources et optimise la mémoire

### Migration depuis l'ancien système

L'ancien système de cache et de préchargement de textures a été complètement supprimé. Les fichiers suivants ont été supprimés :

- `src/pages/Game/Graph/cache.js`
- `src/pages/Game/common/TexturePreloader.jsx`
- `src/pages/Game/utils/textureUtils.js`
- `src/pages/Game/Graph/store.js`

Tous les composants ont été mis à jour pour utiliser le nouveau service d'assets.

### Utilisation

Pour utiliser le système d'assets dans un composant React :

```jsx
import useAssets from "../hooks/useAssets";

const MyComponent = () => {
  // Initialise et récupère le service d'assets
  const assets = useAssets();

  // Vérifie si les assets sont prêts
  if (!assets.isReady) {
    return <p>Chargement...</p>;
  }

  // Récupère une image depuis le service d'assets
  const imagePath = assets.getImagePath("mon-image.svg");

  // Récupère une texture
  const texture = assets.getTexture("my-texture");

  // Crée ou récupère une géométrie
  const geometry = assets.createGeometry("my-geometry", () => {
    return new THREE.SphereGeometry(1, 16, 16);
  });

  // etc.
};
```

### API du service d'assets

Le service d'assets expose les méthodes suivantes :

#### Getters de ressources

- `getTexture(id)` : Récupère une texture par son ID
- `getSoundAsset(id)` : Récupère un asset audio par son ID
- `getDataAsset(id)` : Récupère des données par leur ID
- `getGeometry(id)` : Récupère une géométrie par son ID
- `getMaterial(id)` : Récupère un matériau par son ID
- `getInstancedMesh(id)` : Récupère un InstancedMesh par son ID

#### Getters de chemins

- `getImagePath(path)` : Récupère le chemin complet d'une image
- `getSoundPath(path)` : Récupère le chemin complet d'un son
- `getDataPath(path)` : Récupère le chemin complet d'un fichier de données

#### Aliases

- `getImage(path)` : Alias pour getImagePath
- `getSound(path)` : Alias pour getSoundPath
- `getAudio(path)` : Alias pour getSoundPath
- `getData(path)` : Alias pour getDataPath

#### Création d'assets Three.js

- `createGeometry(id, createFn)` : Crée ou récupère une géométrie
- `createMaterial(id, createFn)` : Crée ou récupère un matériau
- `createInstancedMesh(id, createFn)` : Crée ou récupère un InstancedMesh

#### Gestion des données personnalisées

- `getCustomData(id)` : Récupère des données personnalisées stockées
- `setCustomData(id, data)` : Stocke des données personnalisées

#### Nettoyage

- `dispose()` : Nettoie toutes les ressources

## Composants Migrés vers le Service d'Assets

Les composants suivants ont été migrés pour utiliser le service d'assets centralisé :

### 1. Stars

Le composant `Stars` utilise maintenant le service d'assets pour gérer les textures des étoiles, ce qui évite de charger plusieurs fois la même texture et améliore les performances.

### 2. ShootingStar

Les étoiles filantes utilisent le service d'assets pour :

- Créer et stocker la texture du point lumineux
- Gérer les matériaux des particules et des traînées
- Partager les ressources entre plusieurs instances

### 3. OptimizedLink

Les liens du graphe utilisent le service d'assets pour :

- Gérer les matériaux des lignes (simple, avancé, pointillé)
- Réutiliser les mêmes matériaux pour tous les liens
- Créer des matériaux à la demande pour différents modes d'affichage

### 4. SvgPath

Le composant `SvgPath` utilise le service d'assets pour :

- Parser et stocker les données SVG
- Éviter de parser plusieurs fois le même SVG
- Gérer les matériaux des lignes SVG
- Maintenir un cache efficace des géométries SVG

### 5. InteractiveImage

Les images interactives utilisent maintenant le service d'assets pour :

- Résoudre les chemins des images SVG
- Gérer les matériaux des boîtes englobantes (en mode debug)
- S'assurer que les assets sont prêts avant l'affichage

### 6. Cache de Compatibilité

Le système de cache a été complètement supprimé, y compris la couche de compatibilité. Tous les composants utilisent maintenant directement le service d'assets centralisé, ce qui permet une gestion plus efficace des ressources et une meilleure performance globale de l'application.

## Bonnes Pratiques

1. Toujours vérifier si les assets sont prêts avec `if (!assets.isReady) return null;`
2. Utiliser les fonctions `create*` pour les assets dynamiques
3. Utiliser les fonctions `get*` pour récupérer les assets existants
4. Fournir des ID uniques et descriptifs pour les assets
5. Disposer correctement les assets lorsqu'ils ne sont plus utilisés

## Migration Future

D'autres composants peuvent être migrés progressivement vers le service d'assets centralisé pour améliorer davantage les performances et la gestion de la mémoire.
