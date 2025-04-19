import * as THREE from "three";

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
    let size = 2;

    // Légère variation de taille selon le type de nœud
    if (this.node.id === "central_joshua") {
      size = 2;
    } else if (this.node.type === "source" || this.node.type === "platform") {
      size = 2;
    }

    // Création d'une sphère blanche simple
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("white"),
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
