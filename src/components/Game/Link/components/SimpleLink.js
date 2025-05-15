import * as THREE from "three";

/**
 * Classe représentant un lien simple entre deux nœuds dans le graphe
 */
export class SimpleLink {
  constructor(link, source, target) {
    this.link = link;
    this.source = source;
    this.target = target;
    this.group = new THREE.Group();
    this.offsetDistance = 7.5; // Distance d'offset depuis les nœuds
    this.linkRadius = 0.2; // Rayon du tube représentant le lien
    this.createMesh();
  }

  createMesh() {
    // Vérifier que les positions des nœuds sont correctes
    this.ensureNodePositions();

    // Calculer les positions avec offset
    const { startPoint, endPoint } = this.calculateOffsetPoints(
      new THREE.Vector3(this.source.x, this.source.y, this.source.z),
      new THREE.Vector3(this.target.x, this.target.y, this.target.z)
    );

    // Créer un tube simple pour le lien
    const path = new THREE.LineCurve3(startPoint, endPoint);
    const tubeGeometry = new THREE.TubeGeometry(
      path,
      1,
      this.linkRadius,
      8,
      false
    );

    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 1,
      depthTest: true,
    });

    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.group.add(tube);

    // Stocker les références pour les mises à jour
    this.group.userData = {
      tube,
      startPoint: startPoint.clone(),
      endPoint: endPoint.clone(),
      link: this,
    };
  }

  // S'assure que les nœuds source et cible ont des coordonnées valides
  ensureNodePositions() {
    // Vérifier si les positions sont des nombres valides
    const validateCoord = (coord) => typeof coord === "number" && !isNaN(coord);

    // Si source.x n'est pas un nombre valide mais source est un objet avec x
    if (
      !validateCoord(this.source.x) &&
      typeof this.source === "object" &&
      validateCoord(this.source.fx)
    ) {
      this.source.x = this.source.fx;
      this.source.y = this.source.fy;
      this.source.z = this.source.fz || 0;
    }

    // Si target.x n'est pas un nombre valide mais target est un objet avec x
    if (
      !validateCoord(this.target.x) &&
      typeof this.target === "object" &&
      validateCoord(this.target.fx)
    ) {
      this.target.x = this.target.fx;
      this.target.y = this.target.fy;
      this.target.z = this.target.fz || 0;
    }

    // Utiliser des valeurs par défaut si toujours pas valides
    if (!validateCoord(this.source.x)) {
      console.warn(
        "Source node position is invalid, using default position",
        this.source
      );
      this.source.x = 0;
      this.source.y = 0;
      this.source.z = 0;
    }

    if (!validateCoord(this.target.x)) {
      console.warn(
        "Target node position is invalid, using default position",
        this.target
      );
      this.target.x = 10;
      this.target.y = 10;
      this.target.z = 10;
    }
  }

  // Calcule les points de début et de fin avec offset
  calculateOffsetPoints(sourcePoint, targetPoint) {
    // Calculer la direction du vecteur
    const direction = new THREE.Vector3()
      .subVectors(targetPoint, sourcePoint)
      .normalize();

    // Calculer les points avec offset
    const startPoint = new THREE.Vector3()
      .copy(sourcePoint)
      .addScaledVector(direction, this.offsetDistance);

    const endPoint = new THREE.Vector3()
      .copy(targetPoint)
      .addScaledVector(direction, -this.offsetDistance);

    return { startPoint, endPoint };
  }

  updatePosition(source, target) {
    try {
      // Mettre à jour les positions source et target
      this.source = source;
      this.target = target;

      // Calculer les points avec offset
      const { startPoint, endPoint } = this.calculateOffsetPoints(
        source,
        target
      );

      // Mettre à jour le tube (lien)
      if (this.group.userData.tube) {
        this.group.remove(this.group.userData.tube);

        const path = new THREE.LineCurve3(startPoint, endPoint);
        const tubeGeometry = new THREE.TubeGeometry(
          path,
          1,
          this.linkRadius,
          8,
          false
        );

        const tubeMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.8,
          depthTest: true,
        });

        const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.group.add(tube);
        this.group.userData.tube = tube;
      }
    } catch (e) {
      console.warn("Erreur lors de la mise à jour de la position du lien:", e);
    }
  }

  getMesh() {
    return this.group;
  }
}
