import * as THREE from "three";

// Caches globaux centralisés
const geometryCache = new Map();
const materialCache = new Map();
const textureCache = new Map();

/**
 * Récupère ou crée une géométrie
 * @param {string} key - Clé unique pour identifier la géométrie
 * @param {Function} createFn - Fonction pour créer la géométrie si elle n'existe pas
 * @returns {THREE.BufferGeometry} La géométrie récupérée ou créée
 */
export function getOrCreateGeometry(key, createFn) {
  if (!geometryCache.has(key)) {
    const geometry = createFn();
    geometryCache.set(key, geometry);
  }
  return geometryCache.get(key);
}

/**
 * Récupère ou crée un matériau
 * @param {string} key - Clé unique pour identifier le matériau
 * @param {Function} createFn - Fonction pour créer le matériau s'il n'existe pas
 * @returns {THREE.Material} Le matériau récupéré ou créé
 */
export function getOrCreateMaterial(key, createFn) {
  if (!materialCache.has(key)) {
    const material = createFn();
    materialCache.set(key, material);
  }
  return materialCache.get(key);
}

/**
 * Enregistre une texture dans le cache
 * @param {string} key - Clé unique pour identifier la texture
 * @param {THREE.Texture} texture - La texture à stocker
 */
export function storeTexture(key, texture) {
  textureCache.set(key, texture);
}

/**
 * Récupère une texture du cache
 * @param {string} key - Clé unique pour identifier la texture
 * @returns {THREE.Texture|null} La texture si elle existe, null sinon
 */
export function getTexture(key) {
  return textureCache.has(key) ? textureCache.get(key) : null;
}

/**
 * Précharge des géométries communes
 */
export function preloadCommonGeometries() {
  getOrCreateGeometry("sphere-simple", () => new THREE.SphereGeometry(3, 8, 8));
  getOrCreateGeometry(
    "sphere-advanced",
    () => new THREE.SphereGeometry(3, 16, 16)
  );
  getOrCreateGeometry("plane", () => new THREE.PlaneGeometry(1, 1));
}

/**
 * Précharge des matériaux communs
 */
export function preloadCommonMaterials() {
  getOrCreateMaterial(
    "node-simple-sphere",
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
      })
  );

  getOrCreateMaterial(
    "node-advanced-sphere",
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.2,
      })
  );

  getOrCreateMaterial(
    "link-simple",
    () =>
      new THREE.LineBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.3,
      })
  );

  getOrCreateMaterial(
    "link-advanced",
    () =>
      new THREE.LineBasicMaterial({
        color: "#4080ff",
        transparent: true,
        opacity: 0.8,
      })
  );

  getOrCreateMaterial(
    "link-dashed",
    () =>
      new THREE.LineDashedMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.8,
        dashSize: 1.0,
        gapSize: 1.0,
      })
  );
}

/**
 * Nettoie tous les caches (à appeler lors du démontage)
 */
export function clearCaches() {
  // Disposer de toutes les géométries
  geometryCache.forEach((geometry) => {
    geometry.dispose();
  });
  geometryCache.clear();

  // Disposer de tous les matériaux
  materialCache.forEach((material) => {
    material.dispose();
  });
  materialCache.clear();

  // Disposer de toutes les textures
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
}
