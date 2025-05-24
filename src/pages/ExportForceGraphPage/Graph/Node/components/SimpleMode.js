import * as THREE from "three";
import { COLORS } from "../Node";

// Tableau des districts avec leurs couleurs (même que dans ForceGraph.jsx et Game2/Graph.jsx)
const DISTRICTS = [
  { text: "Libertarians", position: [500, 200, -300], color: "#c0392b" },
  { text: "Antisystem", position: [-200, 350, 200], color: "#f39c12" },
  { text: "Conservatives", position: [300, -200, 400], color: "#d35400" },
  { text: "Nationalists", position: [-500, -150, -250], color: "#27ae60" },
  { text: "Religious", position: [200, 400, 300], color: "#fff8e" },
  { text: "Culture", position: [-300, 100, 500], color: "#3498db" },
  { text: "Social justice", position: [-150, -350, 100], color: "#44adfff" },
];

/**
 * SimpleMode component - Renders node as a simple sphere with thematic group colors
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

    // Fonction pour obtenir la couleur d'un district par son nom
    const getDistrictColor = (thematicGroup) => {
      const district = DISTRICTS.find(d => d.text === thematicGroup);
      return district ? district.color : "#ffffff"; // Blanc par défaut
    };

    // Déterminer la couleur du nœud : seuls les cluster masters sont colorés
    let nodeColor = "white";

    if (this.node.type === "character" && this.node.isClusterMaster && this.node.thematicGroup) {
      // SEULS les cluster masters utilisent les couleurs des districts
      nodeColor = getDistrictColor(this.node.thematicGroup);
    }

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
