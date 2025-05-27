/**
 * Service de gestion générique du contenu textuel
 * Permet d'afficher des informations dans le TextPanel depuis n'importe où dans le jeu
 */
class TextContentService {
  constructor() {
    this.currentContent = null;
    this.listeners = new Set();
    this.assets = null;
  }

  /**
   * Initialise le service avec les assets
   * @param {Object} assets - AssetManager instance
   */
  initialize(assets) {
    this.assets = assets;
  }

  /**
   * Affiche du contenu dans le TextPanel
   * @param {string|Object} content - Contenu à afficher
   */
  show(content) {
    const normalized = this.normalizeContent(content);

    // Si on a un ID, on essaie de résoudre depuis la base
    if (normalized.id) {
      const resolvedData = this.resolveFromDatabase(normalized.id);
      if (resolvedData) {
        // Merge des données résolues avec le contenu fourni
        // IMPORTANT: préserver le type de template demandé
        this.currentContent = {
          ...resolvedData, // Données de la base/graphe
          ...normalized, // Type de template et autres paramètres demandés
          // Garder les données importantes de la résolution
          name: resolvedData.name || normalized.name,
          description: resolvedData.description || resolvedData.biography,
          biography: resolvedData.biography || resolvedData.description,
        };
      } else {
        // Fallback sur le texte fourni ou message par défaut
        this.currentContent = {
          ...normalized,
          text:
            normalized.fallbackText ||
            normalized.text ||
            "Information non disponible",
        };
      }
    } else {
      // Pas d'ID, on utilise le contenu tel quel
      this.currentContent = normalized;
    }

    console.log(
      "[TextContentService] Final currentContent:",
      this.currentContent
    );
    this.notifyListeners();
  }

  /**
   * Cache le contenu du TextPanel
   */
  hide() {
    this.currentContent = null;
    this.notifyListeners();
  }

  /**
   * Récupère le contenu actuel
   * @returns {Object|null} Contenu actuel
   */
  getCurrentContent() {
    return this.currentContent;
  }

  /**
   * Normalise le contenu en objet standard
   * @param {string|Object} content - Contenu à normaliser
   * @returns {Object} Contenu normalisé
   */
  normalizeContent(content) {
    if (typeof content === "string") {
      return {
        type: "simple",
        text: content,
      };
    }

    return {
      type: "simple",
      ...content,
    };
  }

  /**
   * Résout les données depuis la base de données
   * @param {string} id - ID/slug à rechercher
   * @returns {Object|null} Données résolues ou null
   */
  resolveFromDatabase(id) {
    if (!this.assets || !this.assets.isReady || !id) {
      console.log(
        "[TextContentService] Cannot resolve - assets not ready or no id:",
        { assetsReady: this.assets?.isReady, id }
      );
      return null;
    }

    // Récupérer la base de données et le graphe depuis l'asset manager
    const database = this.assets.getData("database");
    const graphData = this.assets.getData("graph");
    const platformsData = this.assets.getData("platforms");

    console.log("[TextContentService] Resolving data for id:", id);
    console.log("[TextContentService] Database available:", !!database);
    console.log("[TextContentService] GraphData available:", !!graphData);
    console.log(
      "[TextContentService] PlatformsData available:",
      !!platformsData
    );

    let data = null;

    // Chercher dans la base de données
    if (database) {
      data = database.find((item) => item.slug === id);
      console.log("[TextContentService] Found in database:", !!data);
    }

    // Chercher dans les nœuds du graphe
    if (graphData?.nodes) {
      // CORRECTION: Prioriser la recherche par ID exact d'abord
      let node = graphData.nodes.find((n) => String(n.id) === id);

      // Si pas trouvé par ID, chercher par nodeId
      if (!node) {
        node = graphData.nodes.find((n) => n.nodeId === id);
      }

      // Si toujours pas trouvé, chercher par clusterId (en dernier recours)
      if (!node) {
        node = graphData.nodes.find((n) => n.clusterId === id);
      }

      if (node) {
        console.log("[TextContentService] Found in graph nodes:", node);

        // Si c'est un nœud de type plateforme, enrichir avec les données des plateformes
        if (node.type === "platform" && platformsData) {
          const platformInfo = this.resolvePlatformData(
            node.name,
            platformsData
          );
          if (platformInfo) {
            console.log(
              "[TextContentService] Found platform info:",
              platformInfo
            );
            data = {
              ...node,
              ...(data || {}), // Les données de la base écrasent celles du graphe si elles existent
              name: data?.name || platformInfo.name || node.name || node.id,
              description: data?.description || platformInfo.description,
              type: "platform", // MODIFICATION: Forcer le type "platform" pour les plateformes
              svgAsset: platformInfo.svgAsset, // Ajouter la référence à l'asset SVG
            };
          } else {
            // Fallback si la plateforme n'est pas trouvée dans platforms.data.json
            data = {
              ...node,
              ...(data || {}),
              name: data?.name || node.name || node.id,
              description: data?.description || `Plateforme: ${node.name}`,
              type: "platform", // MODIFICATION: Forcer le type "platform" pour les plateformes
            };
          }
        } else {
          // Si on a déjà des données de la base, les fusionner avec celles du graphe
          data = {
            ...node,
            ...(data || {}), // Les données de la base écrasent celles du graphe si elles existent
            name: data?.name || node.name || node.id, // Priorité au nom de la base
            type: data?.type || node.type, // Priorité au type de la base
          };
        }
      } else {
        console.log(
          "[TextContentService] Not found in graph nodes for id:",
          id
        );
      }
    }

    console.log("[TextContentService] Final resolved data:", data);
    return data;
  }

  /**
   * Résout les informations d'une plateforme depuis platforms.data.json
   * @param {string} platformName - Nom de la plateforme à rechercher
   * @param {Array} platformsData - Données des plateformes depuis l'AssetManager
   * @returns {Object|null} Informations de la plateforme ou null
   */
  resolvePlatformData(platformName, platformsData) {
    if (!platformsData || !Array.isArray(platformsData) || !platformName) {
      return null;
    }

    // Normaliser le nom de la plateforme pour la recherche
    const normalizedName = platformName.toLowerCase().trim();

    // Chercher par nom exact d'abord
    let platform = platformsData.find(
      (p) => p.name && p.name.toLowerCase() === normalizedName
    );

    // Si pas trouvé, chercher par ID
    if (!platform) {
      platform = platformsData.find(
        (p) => p.id && p.id.toLowerCase() === normalizedName
      );
    }

    // Si toujours pas trouvé, chercher par correspondance partielle dans le nom
    if (!platform) {
      platform = platformsData.find(
        (p) => p.name && p.name.toLowerCase().includes(normalizedName)
      );
    }

    // NOUVEAU: Si toujours pas trouvé, essayer de matcher avec les assets SVG des plateformes
    if (!platform && this.assets) {
      const platformSvgKey = `platforms/${normalizedName}.svg`;
      const hasAsset =
        this.assets.getTexture && this.assets.getTexture(platformSvgKey);

      console.log(
        `[TextContentService] Checking for platform asset: ${platformSvgKey}, found: ${!!hasAsset}`
      );

      if (hasAsset) {
        // Créer une plateforme basique avec les informations disponibles
        platform = {
          id: normalizedName,
          name: platformName, // Garder le nom original
          description: `Plateforme: ${platformName}`,
          svgAsset: platformSvgKey, // Ajouter une référence à l'asset SVG
        };

        console.log(
          `[TextContentService] Created platform from asset: ${platformSvgKey}`,
          platform
        );
      }
    }

    if (platform) {
      console.log(
        `[TextContentService] Platform "${platformName}" matched with:`,
        platform
      );
      return {
        id: platform.id,
        name: platform.name,
        description: platform.description,
        svgAsset: platform.svgAsset, // Inclure la référence à l'asset si disponible
      };
    }

    console.log(
      `[TextContentService] Platform "${platformName}" not found in platforms data`
    );
    return null;
  }

  /**
   * Ajoute un listener pour les changements de contenu
   * @param {Function} listener - Fonction à appeler lors des changements
   */
  addListener(listener) {
    this.listeners.add(listener);
  }

  /**
   * Supprime un listener
   * @param {Function} listener - Fonction à supprimer
   */
  removeListener(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notifie tous les listeners des changements
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentContent);
      } catch (error) {
        console.error("Error in TextContentService listener:", error);
      }
    });
  }

  /**
   * Méthode utilitaire pour afficher du contenu simple
   * Facilite la migration depuis l'ancien système
   * @param {Object} options - Options pour le contenu simple
   * @param {string} options.title - Titre du contenu
   * @param {string} options.text - Texte du contenu
   * @param {string} [options.type] - Type de contenu (par défaut "simple")
   */
  showSimple({ title, text, type = "simple" }) {
    this.show({
      type,
      title,
      text,
    });
  }

  /**
   * Méthode utilitaire pour afficher du contenu de personnage
   * @param {Object} options - Options pour le contenu de personnage
   * @param {string} options.name - Nom du personnage
   * @param {string} options.description - Description du personnage
   * @param {string} [options.type] - Type de contenu (par défaut "character")
   */
  showCharacter({ name, description, type = "character" }) {
    this.show({
      type,
      title: name,
      text: description,
    });
  }
}

// Instance singleton
const textContentService = new TextContentService();

export default textContentService;
