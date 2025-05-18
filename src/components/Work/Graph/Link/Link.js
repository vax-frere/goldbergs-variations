import * as THREE from "three";
import { SimpleLink } from "./components/SimpleLink";
import { Link as AdvancedLink } from "./components/AdvancedLink";

/**
 * Classe factory pour les liens entre nœuds dans le graphe
 * Choisit entre la version simple ou avancée en fonction des options
 */
export class Link {
  constructor(link, source, target, options = {}) {
    // Créer l'instance appropriée en fonction de l'option advanced
    const { advanced = false } = options;

    // Créer soit un lien simple, soit un lien avancé
    this.linkInstance = advanced
      ? new AdvancedLink(link, source, target)
      : new SimpleLink(link, source, target);
  }

  // Délègue toutes les méthodes importantes à l'instance de lien sous-jacente

  updatePosition(source, target, camera) {
    return this.linkInstance.updatePosition(source, target, camera);
  }

  getMesh() {
    return this.linkInstance.getMesh();
  }
}
