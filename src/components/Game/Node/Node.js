import * as THREE from "three";
import { SimpleMode } from "./components/SimpleMode";
import { AdvancedMode } from "./components/AdvancedMode";

/**
 * Palette de couleurs pour les différents types de nœuds
 */
export const COLORS = {
  source: "#4ecdc4",
  joshua: "#ff6b6b",
  character: "#fab1a0",
  contact: "#74b9ff",
  background: "#000119",
  centralJoshua: "#FF6700",
  fbi: "#FFD700",
  // Couleurs pour les groupes thématiques
  thematicGroups: {
    politics: "#8e44ad", // Violet
    entertainment: "#3498db", // Bleu
    science: "#2ecc71", // Vert
    business: "#f39c12", // Orange
    sports: "#e74c3c", // Rouge
    technology: "#1abc9c", // Turquoise
    health: "#d35400", // Orange foncé
    education: "#27ae60", // Vert foncé
    media: "#c0392b", // Rouge foncé
    religion: "#f1c40f", // Jaune
    military: "#7f8c8d", // Gris
    default: "#ecf0f1", // Blanc cassé (pour les groupes non définis)
  },
};

/**
 * Modes d'affichage des nœuds
 */
export const DISPLAY_MODES = {
  SIMPLE: "simple",
  ADVANCED: "advanced",
};

/**
 * Crée un objet THREE.js personnalisé pour représenter un nœud dans le graphe
 */
export class Node {
  constructor(node, displayMode = DISPLAY_MODES.SIMPLE) {
    this.node = node;
    this.displayMode = displayMode;
    this.group = new THREE.Group();
    this.renderMode = null;
    this.createMesh();
  }

  createMesh() {
    // Supprimer l'ancien mesh si nécessaire
    if (this.renderMode) {
      const oldMesh = this.renderMode.getMesh();
      if (oldMesh && this.group.children.includes(oldMesh)) {
        this.group.remove(oldMesh);
      }
    }

    // Créer le nouveau composant de rendu selon le mode choisi
    if (this.displayMode === DISPLAY_MODES.SIMPLE) {
      this.renderMode = new SimpleMode(this.node);
    } else {
      this.renderMode = new AdvancedMode(this.node);
    }

    // Ajouter le nouveau mesh au groupe
    this.group.add(this.renderMode.getMesh());
  }

  setDisplayMode(mode) {
    if (this.displayMode !== mode) {
      this.displayMode = mode;
      this.createMesh();
    }
  }

  getMesh() {
    return this.group;
  }
}
