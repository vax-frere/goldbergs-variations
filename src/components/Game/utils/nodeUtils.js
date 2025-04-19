import * as THREE from "three";
// import Node from "../Node/Node"; // No longer needed here
// import Link from "../Link/Link"; // No longer needed here

/**
 * Palette de couleurs pour les différents types de nœuds
 */
export const COLORS = {
  source: "#4ecdc4",
  joshua: "#ff6b6b",
  character: "#fab1a0",
  contact: "#74b9ff",
  background: "#000119",
  centralJoshua: "#FF6700", // Couleur orange vif pour le nœud central Joshua
  fbi: "#FFD700", // Couleur dorée pour les nœuds FBI
};

/**
 * Crée un objet THREE.js personnalisé pour représenter un nœud dans le graphe
 * @param {Object} node - Le nœud à représenter visuellement
 * @returns {THREE.Group} Un groupe THREE.js contenant la forme 3D et le texte du nœud
 */
// export const createNodeObject = (node) => { ... }; // Remove function

/**
 * Crée un objet THREE.js pour représenter un lien entre deux nœuds
 * @param {Object} link - Les données du lien
 * @param {THREE.Vector3} source - Position du nœud source
 * @param {THREE.Vector3} target - Position du nœud cible
 * @returns {THREE.Object3D} Un objet THREE.js représentant le lien
 */
// export const createLinkObject = (link, source, target) => { ... }; // Remove function

/**
 * Met à jour la position d'un lien entre deux nœuds
 * @param {THREE.Object3D} linkObject - L'objet THREE.js à mettre à jour
 * @param {THREE.Vector3} source - Nouvelle position du nœud source
 * @param {THREE.Vector3} target - Nouvelle position du nœud cible
 */
// export const updateLinkPosition = (linkObject, source, target) => { ... }; // Remove function
