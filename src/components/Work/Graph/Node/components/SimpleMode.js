import * as THREE from "three";
import { COLORS } from "../Node";

/**
 * SimpleMode component - Renders node as a simple white sphere
 */
export class SimpleMode {
  constructor(node) {
    this.node = node;
    this.group = new THREE.Group();
    this.createMesh();
  }

  createMesh() {
    // Taille de base pour la sphère
    let size = 1;

    // Légère variation de taille selon le type de nœud
    if (this.node.id === "central_joshua") {
      size = 2;
    } else if (this.node.type === "source" || this.node.type === "platform") {
      size = 2;
    }

    // Déterminer la couleur du nœud en fonction de son type et de son groupe thématique
    let nodeColor = "white";

    // if (this.node.id === "central_joshua") {
    //   nodeColor = COLORS.centralJoshua;
    // } else if (this.node.isJoshua) {
    //   nodeColor = COLORS.joshua;
    // } else if (this.node.type === "source" || this.node.type === "platform") {
    //   nodeColor = COLORS.source;
    // } else if (this.node.type === "character" && this.node.thematicGroup) {
    //   // Utiliser la couleur du groupe thématique si disponible
    //   nodeColor =
    //     COLORS.thematicGroups[this.node.thematicGroup] ||
    //     COLORS.thematicGroups.default;
    // } else if (this.node.type === "character") {
    //   nodeColor = COLORS.character;
    // }

    // Création d'une sphère avec la couleur appropriée
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(nodeColor),
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    this.group.add(mesh);
  }

  getMesh() {
    return this.group;
  }
}
