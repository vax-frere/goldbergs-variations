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
