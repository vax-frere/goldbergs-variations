# Service de gestion des assets

Ce service centralise le chargement et la gestion de tous les assets du jeu en un seul point.

## Caractéristiques

- Chargement centralisé des textures, sons, données et modèles
- Gestion des géométries, matériaux et meshes instanciés
- Préchargement des assets pour une meilleure expérience utilisateur
- Suivi de l'état de chargement avec pourcentage de progression
- Hook React pour une intégration facile dans les composants
- Fonctions utilitaires pour accéder aux assets

## Comment utiliser le service

### Initialisation

Le service peut être initialisé de deux façons :

1. Automatiquement via le hook `useAssets`
2. Manuellement via la fonction `initializeAssetService`

### Utilisation dans un composant React

```jsx
import React from "react";
import useAssets from "../hooks/useAssets";

const MyComponent = () => {
  // Initialisation automatique
  const assets = useAssets({ autoInit: true });

  // Vérifier si les assets sont prêts
  if (!assets.isReady) {
    return <div>Chargement... {assets.progress}%</div>;
  }

  return (
    <div>
      {/* Utiliser des images */}
      <img src={assets.getImagePath("joshua-goldberg.svg")} alt="Joshua" />

      {/* Utiliser des sons */}
      <audio src={assets.getSoundPath("ambiant.mp3")} />

      {/* Utiliser des données JSON */}
      <button onClick={() => console.log(assets.getData("database"))}>
        Afficher les données
      </button>
    </div>
  );
};
```

### Utilisation en dehors d'un composant React

```js
import useAssetStore, {
  initializeAssetService,
} from "../services/AssetService";

// Initialiser le service
const assetService = initializeAssetService();

// Vérifier l'état du chargement
console.log(`Chargement: ${assetService.loading.progress}%`);

// Utiliser le service
const imagePath = assetService.getImagePath("joshua-goldberg.svg");
const soundPath = assetService.getSoundPath("ambiant.mp3");
```

### Utilisation des géométries instanciées

```jsx
import React, { useRef, useEffect } from "react";
import useAssets from "../hooks/useAssets";
import * as THREE from "three";

const InstancedMeshComponent = ({ count = 1000 }) => {
  const assets = useAssets({ autoInit: true });
  const meshRef = useRef();

  useEffect(() => {
    if (!assets.isReady || !meshRef.current) return;

    // Créer ou récupérer une géométrie
    const sphereGeometry = assets.createGeometry(
      "sphere-instance",
      () => new THREE.SphereGeometry(1, 16, 16)
    );

    // Créer ou récupérer un matériau
    const sphereMaterial = assets.createMaterial(
      "instanced-material",
      () => new THREE.MeshPhongMaterial({ color: 0xffffff })
    );

    // Créer un mesh instancié
    const instancedMesh = assets.createInstancedMesh("stars", {
      geometry: sphereGeometry,
      material: sphereMaterial,
      count: count,
    });

    // Positionner les instances
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 1000
      );
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    // Ajouter à la scène
    meshRef.current.add(instancedMesh);

    return () => {
      // Nettoyer
      if (meshRef.current) {
        meshRef.current.remove(instancedMesh);
      }
    };
  }, [assets.isReady, count]);

  return <group ref={meshRef} />;
};
```

## Ajouter de nouveaux assets

Pour ajouter de nouveaux assets à précharger, modifiez les fonctions dans `AssetService.js` :

```js
// Pour ajouter de nouvelles textures
export function getDefaultTexturesToPreload() {
  // Ajouter vos nouvelles textures ici
  const svgFiles = [
    "joshua-goldberg.svg",
    "ma-nouvelle-texture.svg", // <-- Nouvelle texture
  ];

  // ...
}

// Pour ajouter de nouveaux sons
export function getDefaultSoundsToPreload() {
  const soundFiles = [
    "ambiant.mp3",
    "mon-nouveau-son.mp3", // <-- Nouveau son
  ];

  // ...
}

// Pour ajouter de nouvelles données
export function getDefaultDataToPreload() {
  return [
    { id: "database", url: `/data/database.data.json` },
    { id: "mesNouvelleDonnees", url: `/data/mes-donnees.json` }, // <-- Nouvelles données
  ];
}

// Pour ajouter de nouvelles géométries
export function getDefaultGeometriesToPreload() {
  return [
    {
      id: "sphere-simple",
      createFn: () => new THREE.SphereGeometry(1, 8, 8),
    },
    {
      id: "ma-geometrie", // <-- Nouvelle géométrie
      createFn: () => new THREE.TorusGeometry(2, 0.5, 16, 32),
    },
  ];
}

// Pour ajouter de nouveaux matériaux
export function getDefaultMaterialsToPreload() {
  return [
    {
      id: "basic-white",
      createFn: () =>
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.8,
        }),
    },
    {
      id: "mon-materiau", // <-- Nouveau matériau
      createFn: () =>
        new THREE.MeshStandardMaterial({
          color: 0xff00ff,
          metalness: 0.5,
          roughness: 0.2,
        }),
    },
  ];
}
```

## Types d'assets supportés

Le service prend en charge les types d'assets suivants :

- `TEXTURE` : Images, textures et SVG
- `SOUND` : Fichiers audio (mp3, wav, etc.)
- `DATA` : Fichiers de données (JSON)
- `MODEL` : Modèles 3D
- `JSON` : Fichiers JSON spécifiques
- `GEOMETRY` : Géométries THREE.js
- `MATERIAL` : Matériaux THREE.js
- `INSTANCED_MESH` : Meshes instanciés THREE.js

## Performances avec les géométries instanciées

L'utilisation de `InstancedMesh` permet de dessiner efficacement un grand nombre d'objets 3D avec les mêmes performances qu'un seul objet. Voici quelques conseils :

1. **Réutilisation** : Utilisez le même ID pour récupérer une géométrie ou un matériau déjà créé
2. **Gestion mémoire** : Appelez `dispose()` quand vous n'avez plus besoin des ressources
3. **Matrices** : Utilisez `setMatrixAt()` pour positionner/orienter/mettre à l'échelle chaque instance
4. **Mise à jour** : N'oubliez pas `instanceMatrix.needsUpdate = true` après modification

## Avantages de cette approche

1. **Centralisation** : Tous les assets sont gérés à un seul endroit
2. **Préchargement** : Les assets sont chargés à l'avance pour éviter les problèmes pendant le jeu
3. **Cohérence** : Interface unifiée pour accéder à tous les types d'assets
4. **Performance** : Évite le chargement multiple des mêmes assets et optimise le rendu avec les géométries instanciées
5. **Suivi** : Permet de suivre facilement l'état de chargement et d'afficher une progression
6. **Gestion mémoire** : Méthodes pour disposer proprement les ressources WebGL
