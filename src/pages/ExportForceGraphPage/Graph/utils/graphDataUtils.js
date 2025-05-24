/**
 * Configuration globale pour les paramètres du graphe - permet de contrôler les réglages
 */
export const graphConfig = {
  // Configuration des clusters
  clusterCount: 20, // Augmenté pour permettre plus de clusters (était 10)
  clusterSpreadFactor: 300, // Facteur pour l'espacement des clusters (était 300)
  clusterStrategy: "sequential", // "sequential" ou "modulo" pour la répartition des clusters
  // Autres paramètres de rendu
  minTextSize: 0.8,
  maxTextSize: 2.5,
  joshuaNodeSize: 10,
  characterNodeSize: 5,
  platformNodeSize: 15,
  // Groupes visuels
  joshuaGroup: 1,
  characterGroup: 2,
  platformGroup: 3,
};

/**
 * Calcule la taille du texte en fonction du nombre de posts
 * @param {Number} totalPosts - Nombre total de posts du personnage
 * @returns {Number} Taille du texte à utiliser
 */
const calculateTextSize = (totalPosts) => {
  if (!totalPosts || isNaN(totalPosts)) {
    return 1; // Taille par défaut si pas de données
  }

  // Définir des limites pour éviter des textes trop petits ou trop grands
  const minSize = graphConfig.minTextSize; // Taille minimale
  const maxSize = graphConfig.maxTextSize; // Taille maximale

  // Utiliser une fonction logarithmique pour avoir une échelle plus adaptée
  // car les différences de posts peuvent être très grandes
  const size = Math.log10(totalPosts + 1) / 2;

  // Limiter la taille entre min et max
  return Math.max(minSize, Math.min(maxSize, size));
};

/**
 * Loads character data from the database.data.json file and constructs nodes and links for the graph
 * @param {Object} config - Configuration optionnelle pour surcharger les paramètres par défaut
 * @returns {Promise<{nodes: Array, links: Array}>} A promise that resolves to an object containing nodes and links arrays
 */
export const loadGraphData = async (config = {}) => {
  try {
    // Fusionner la configuration par défaut avec les paramètres fournis
    // Appliquer toute configuration passée, SAUF 'verbose' qui est global
    const { verbose, ...restConfig } = config; // Séparer 'verbose' s'il est passé
    Object.assign(graphConfig, restConfig);
    console.log("Configuration appliquée:", graphConfig);

    console.log("Début du chargement des données...");

    // Charger le fichier final_spatialized_graph.data.json qui contient les thematicGroup et positions
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/final_spatialized_graph.data.json`
    );
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const graphData = await response.json();
    console.log(
      `Données chargées depuis final_spatialized_graph.data.json: ${graphData.nodes?.length || 0} nodes, ${graphData.links?.length || 0} links`
    );

    // Vérifier que les données ont la structure attendue
    if (!graphData.nodes || !graphData.links) {
      throw new Error("Structure de données invalide: nodes ou links manquants");
    }

    // Nettoyer les liens orphelins
    const cleanedData = cleanOrphanLinks(graphData.nodes, graphData.links);
    console.log(`🧹 Nettoyage: ${graphData.links.length - cleanedData.links.length} liens orphelins supprimés`);

    // Analyse des clusters après chargement
    analyzeGraphClusters(cleanedData.nodes, cleanedData.links);

    return { nodes: cleanedData.nodes, links: cleanedData.links };
  } catch (err) {
    console.error("Erreur lors du chargement des données:", err);
    throw err;
  }
};

/**
 * Analyse et affiche des informations détaillées sur les clusters créés
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Array} links - Tableau des liens du graphe
 */
export const analyzeGraphClusters = (nodes, links) => {
  console.log("Début de l'analyse des clusters...");

  // Regrouper les nœuds par cluster
  const clusterMap = {};

  // Identifier les personnages à l'origine de chaque cluster
  const clusterOrigins = {};
  // Pour identifier l'origine, on utilise le caractère d'index le plus bas dans chaque cluster
  const relevantCharacters = nodes.filter((node) => node.type === "character");

  // Trier les personnages par index d'origine
  const sortedCharacters = [...relevantCharacters].sort((a, b) => {
    // Extraire l'index du format "slug_index"
    const indexA = parseInt(a.id.split("_").pop());
    const indexB = parseInt(b.id.split("_").pop());
    return indexA - indexB;
  });

  // Le premier personnage de chaque cluster est considéré comme l'origine
  sortedCharacters.forEach((char) => {
    if (!clusterOrigins[char.cluster]) {
      clusterOrigins[char.cluster] = {
        name: char.name,
        id: char.id,
        originalId: char.originalId,
        isJoshua: char.isJoshua,
        totalPosts: char.totalPosts,
      };
    }
  });

  nodes.forEach((node) => {
    if (!clusterMap[node.cluster]) {
      clusterMap[node.cluster] = {
        id: node.cluster,
        nodes: [],
        characters: [],
        platforms: [],
        offsetX: node.offsetX || 0,
        offsetY: node.offsetY || 0,
        offsetZ: node.offsetZ || 0,
        origin: clusterOrigins[node.cluster] || { name: "Inconnu" },
      };
    }

    clusterMap[node.cluster].nodes.push(node);

    if (node.type === "character") {
      if (!clusterMap[node.cluster].characters.includes(node.name)) {
        clusterMap[node.cluster].characters.push(node.name);
      }
    } else if (node.type === "platform") {
      if (!clusterMap[node.cluster].platforms.includes(node.name)) {
        clusterMap[node.cluster].platforms.push(node.name);
      }
    }
  });

  // Calculer les liens intra-cluster et inter-clusters
  const clusterLinks = {};
  links.forEach((link) => {
    // Trouver les nœuds source et cible
    const sourceNode = nodes.find((n) => n.id === link.source);
    const targetNode = nodes.find((n) => n.id === link.target);

    if (sourceNode && targetNode) {
      const sourceCluster = sourceNode.cluster;
      const targetCluster = targetNode.cluster;

      // Initialiser les compteurs de liens
      if (!clusterLinks[sourceCluster]) {
        clusterLinks[sourceCluster] = { internal: 0, external: {} };
      }

      // Compter les liens internes et externes
      if (sourceCluster === targetCluster) {
        clusterLinks[sourceCluster].internal++;
      } else {
        if (!clusterLinks[sourceCluster].external[targetCluster]) {
          clusterLinks[sourceCluster].external[targetCluster] = 0;
        }
        clusterLinks[sourceCluster].external[targetCluster]++;
      }
    }
  });

  // Afficher les informations pour chaque cluster
  console.log("Détails par cluster:");
  Object.values(clusterMap).forEach((cluster) => {
    const originInfo = cluster.origin.isJoshua
      ? `${cluster.origin.name} (Joshua, ${
          cluster.origin.totalPosts || 0
        } posts)`
      : `${cluster.origin.name} (${cluster.origin.totalPosts || 0} posts)`;

    console.log(`[CLUSTER ${cluster.id}] Origine: ${originInfo}`);

    // Afficher la position seulement si les offsets existent
    if (cluster.offsetX !== 0 || cluster.offsetY !== 0 || cluster.offsetZ !== 0) {
      console.log(
        `  - Position offset: (${cluster.offsetX.toFixed(2)}, ${cluster.offsetY.toFixed(
          2
        )}, ${cluster.offsetZ.toFixed(2)})`
      );
    } else {
      console.log(`  - Position offset: Non définie (utilise positions du fichier)`);
    }
    console.log(
      `  - ${cluster.nodes.length} nœuds (${cluster.characters.length} personnages, ${cluster.platforms.length} plateformes)`
    );
    console.log(`  - Personnages: ${cluster.characters.join(", ")}`);
    console.log(`  - Plateformes: ${cluster.platforms.join(", ")}`);

    // Afficher les informations sur les liens
    if (clusterLinks[cluster.id]) {
      console.log(`  - ${clusterLinks[cluster.id].internal} liens internes`);

      const externalLinks = clusterLinks[cluster.id].external;
      if (Object.keys(externalLinks).length > 0) {
        console.log(
          `  - Liens externes vers: ${Object.entries(externalLinks)
            .map(
              ([targetCluster, count]) => `Cluster ${targetCluster} (${count})`
            )
            .join(", ")}`
        );
      } else {
        console.log(`  - Aucun lien externe`);
      }
    }
    console.log("");
  });

  // Statistiques globales
  console.log(
    `Début de l'analyse des clusters... ${
      Object.keys(clusterMap).length
    } clusters analysés`
  );

  // Identifier les clusters les plus grands et les plus connectés
  const largestCluster = Object.values(clusterMap).sort(
    (a, b) => b.nodes.length - a.nodes.length
  )[0];

  console.log(
    `Cluster le plus grand: Cluster ${largestCluster.id} (origine: ${largestCluster.origin.name}) avec ${largestCluster.nodes.length} nœuds`
  );

  // Créer une visualisation textuelles des clusters
  console.log("Carte des clusters et leurs origines:");
  console.log(
    Object.values(clusterMap)
      .map((cluster) => `  C${cluster.id}: ${cluster.origin.name}`)
      .join("\n")
  );

  return clusterMap;
};

/**
 * Builds a graph structure (nodes and links) from character data
 * @param {Array} characterData - Array of character objects from database.data.json
 * @returns {{nodes: Array, links: Array}} Object containing nodes and links arrays
 */
export const buildGraphFromCharacterData = (characterData) => {
  console.log("Début de la construction du graphe...");

  // Filtrer les personnages qui n'ont ni liens, ni posts, ni sources
  const relevantCharacters = characterData.filter((character) => {
    const hasLinks = character.links && character.links.length > 0;
    const hasPosts = character.totalPosts && character.totalPosts > 0;
    const hasSources = character.sources && character.sources.length > 0;
    return hasLinks || hasPosts || hasSources;
  });

  console.log(
    `FILTRAGE ${
      characterData.length - relevantCharacters.length
    } personnages ignorés car sans liens, posts ni sources (${
      relevantCharacters.length
    } personnages conservés)`
  );

  // Nouveaux tableaux de tous les nœuds et liens (avec redondances possibles)
  let allNodes = [];
  let allLinks = [];

  // Identifiant unique pour les nœuds qui peuvent être dupliqués
  let nodeIdCounter = 0;

  // Pour la stratégie séquentielle, on garde un compteur de cluster incrémental
  let currentClusterIndex = 0;

  // La carte des positions des clusters pour maintenir une répartition spatiale équilibrée
  const clusterPositions = {};

  // Tableau pour garder une trace des origines de clusters
  const clusterOrigins = {};

  // Pour suivre quels clusters sont réellement utilisés
  const usedClusters = new Set();

  // Statistiques pour suivi détaillé
  const stats = {
    charactersWithoutSlug: 0,
    platformsCreated: 0,
    platformsReused: 0,
    directCharacterLinks: 0,
    platformIntermediaryLinks: 0,
    targetsNotFound: 0,
    clustersWithNoOrigin: 0,
    originsDesignated: 0,
    sequentialClusters: 0,
    duplicateCharactersRemoved: 0,
  };

  // Pour chaque personnage, créer un mini-graphe
  relevantCharacters.forEach((character, characterIndex) => {
    // Vérifier si le personnage a un slug
    if (!character.slug) {
      stats.charactersWithoutSlug++;
      console.log(
        `[ATTENTION] Personnage sans slug ignoré: ${
          character.displayName || "Inconnu"
        }`
      );
      return;
    }

    // Calculer le cluster en fonction de la stratégie choisie
    let clusterIndex;

    if (graphConfig.clusterStrategy === "sequential") {
      // Déterminer si ce personnage doit commencer un nouveau cluster
      const shouldStartNewCluster =
        character.isClusterRoot ||
        characterIndex === 0 ||
        currentClusterIndex === 0 ||
        character.isJoshua;

      if (shouldStartNewCluster) {
        currentClusterIndex++;
        stats.sequentialClusters++;
        console.log(
          `[CLUSTER] Création du cluster #${currentClusterIndex} pour "${
            character.displayName || character.slug
          }"`
        );
      }

      clusterIndex = currentClusterIndex;
    } else {
      // Stratégie par défaut (modulo)
      clusterIndex = characterIndex % graphConfig.clusterCount;
    }

    // Marquer ce cluster comme utilisé
    usedClusters.add(clusterIndex);

    // Générer ou réutiliser les décalages pour ce cluster
    let offsetX, offsetY, offsetZ;

    if (clusterPositions[clusterIndex]) {
      // Réutiliser les mêmes décalages pour tout le cluster
      offsetX = clusterPositions[clusterIndex].x;
      offsetY = clusterPositions[clusterIndex].y;
      offsetZ = clusterPositions[clusterIndex].z;
    } else {
      // Générer de nouveaux décalages pour ce cluster
      offsetX = (Math.random() - 0.5) * graphConfig.clusterSpreadFactor;
      offsetY = (Math.random() - 0.5) * graphConfig.clusterSpreadFactor;
      offsetZ = (Math.random() - 0.5) * graphConfig.clusterSpreadFactor;

      // Enregistrer ces décalages pour les futurs nœuds du même cluster
      clusterPositions[clusterIndex] = { x: offsetX, y: offsetY, z: offsetZ };
    }

    console.log(
      `[PERSONNAGE] Traitement de "${
        character.displayName || character.slug
      }" (Cluster ${clusterIndex})`
    );

    // Récupérer un ID unique pour créer des nœuds distincts même si même slug
    const characterNodeId = `${character.slug}_${nodeIdCounter++}`;

    // Vérifier si c'est le premier personnage dans ce cluster (origine du cluster)
    const isClusterOrigin = !clusterOrigins[clusterIndex];

    // Si c'est l'origine, l'enregistrer
    if (isClusterOrigin) {
      clusterOrigins[clusterIndex] = characterNodeId;
      console.log(
        `  - [ORIGINE] Ce personnage est l'origine du cluster ${clusterIndex}`
      );
    }

    // Créer le nœud de ce personnage
    const characterNode = {
      id: characterNodeId,
      originalId: character.slug, // Garder le slug original pour les liens
      type: "character",
      name: character.displayName || character.slug,
      value: character.isJoshua
        ? graphConfig.joshuaNodeSize
        : graphConfig.characterNodeSize,
      group: character.isJoshua
        ? graphConfig.joshuaGroup
        : graphConfig.characterGroup,
      thematicGroup: character.thematicGroup,
      isJoshua: character.isJoshua || false,
      // Ajouter le nombre total de posts pour dimensionner le texte
      totalPosts: character.totalPosts || 0,
      // Calculer une taille de texte proportionnelle au nombre de posts
      textSize: calculateTextSize(character.totalPosts),
      // Créer un groupe visuel pour aider à distinguer les mini-graphes
      cluster: clusterIndex,
      // Ajouter une propriété de décalage pour positionner chaque mini-graphe séparément
      offsetX: offsetX,
      offsetY: offsetY,
      offsetZ: offsetZ,
      // Marquer ce nœud comme l'origine du cluster
      isClusterOrigin: isClusterOrigin,
    };

    // Ajouter le nœud du personnage à notre collection
    allNodes.push(characterNode);

    // Dictionnaire pour suivre les plateformes déjà créées dans ce cluster
    // La clé est le nom de la plateforme, la valeur est l'ID du nœud
    const platformNodesInCluster = {};

    // 1. Ajouter les plateformes du personnage depuis la clé "sources" (au lieu de "platform")
    if (character.sources && Array.isArray(character.sources)) {
      console.log(`  - Sources: ${character.sources.join(", ") || "aucune"}`);

      character.sources.forEach((platform) => {
        if (!platform) return;

        let platformNodeId;

        // Vérifier si cette plateforme existe déjà dans ce cluster
        if (platformNodesInCluster[platform]) {
          // Réutiliser l'ID existant
          platformNodeId = platformNodesInCluster[platform];
          stats.platformsReused++;
          console.log(`    * Plateforme "${platform}" réutilisée`);
        } else {
          // Créer un ID unique pour ce nœud de plateforme
          platformNodeId = `platform_${platform}_${nodeIdCounter++}`;
          stats.platformsCreated++;
          console.log(
            `    * Plateforme "${platform}" créée (id: ${platformNodeId})`
          );

          // Créer le nœud de plateforme
          const platformNode = {
            id: platformNodeId,
            type: "platform",
            name: platform,
            value: graphConfig.platformNodeSize,
            group: graphConfig.platformGroup,
            cluster: clusterIndex,
            // Utiliser le même décalage que le personnage parent
            offsetX: characterNode.offsetX,
            offsetY: characterNode.offsetY,
            offsetZ: characterNode.offsetZ,
          };

          // Ajouter le nœud de plateforme à notre collection
          allNodes.push(platformNode);

          // Mémoriser cette plateforme pour ce cluster
          platformNodesInCluster[platform] = platformNodeId;
        }

        // Créer un lien entre le personnage et sa plateforme
        allLinks.push({
          source: characterNodeId,
          target: platformNodeId,
          value: 1.5,
          type: "character_platform_connection",
          isDirect: "Direct",
          relationType: "Présence",
        });
      });
    }

    // 2. Ajouter les liens vers d'autres personnages et leurs plateformes
    if (character.links && Array.isArray(character.links)) {
      console.log(
        `  - ${character.links.length} liens vers d'autres personnages`
      );

      character.links.forEach((link, linkIndex) => {
        if (!link.target) {
          console.log(`    * Lien #${linkIndex + 1} ignoré: cible manquante`);
          return;
        }

        // Vérifier que la cible existe dans les données
        const targetCharacter = characterData.find(
          (c) => c.slug === link.target
        );
        if (!targetCharacter) {
          stats.targetsNotFound++;
          console.log(
            `    * Lien #${linkIndex + 1}: CIBLE NON TROUVÉE "${link.target}"`
          );
          return;
        }

        console.log(
          `    * Lien #${linkIndex + 1} vers "${
            targetCharacter.displayName || link.target
          }"`
        );

        // Créer un nœud pour le personnage cible
        const targetNodeId = `${link.target}_${nodeIdCounter++}`;
        const targetNode = {
          id: targetNodeId,
          originalId: link.target,
          type: "character",
          name: targetCharacter.displayName || link.target,
          value: targetCharacter.isJoshua
            ? graphConfig.joshuaNodeSize
            : graphConfig.characterNodeSize,
          group: targetCharacter.isJoshua
            ? graphConfig.joshuaGroup
            : graphConfig.characterGroup,
          isJoshua: targetCharacter.isJoshua || false,
          // Ajouter le nombre total de posts pour le personnage cible
          totalPosts: targetCharacter.totalPosts || 0,
          // Calculer une taille de texte proportionnelle au nombre de posts
          textSize: calculateTextSize(targetCharacter.totalPosts),
          cluster: clusterIndex,
          // Utiliser le même décalage que le personnage parent
          offsetX: characterNode.offsetX,
          offsetY: characterNode.offsetY,
          offsetZ: characterNode.offsetZ,
        };

        // Ajouter le nœud cible à notre collection
        allNodes.push(targetNode);

        // Ajouter les plateformes du personnage cible depuis ses sources
        if (targetCharacter.sources && Array.isArray(targetCharacter.sources)) {
          console.log(
            `      - Sources de la cible: ${
              targetCharacter.sources.join(", ") || "aucune"
            }`
          );

          targetCharacter.sources.forEach((platform) => {
            if (!platform) return;

            let platformNodeId;

            // Vérifier si cette plateforme existe déjà dans ce cluster
            if (platformNodesInCluster[platform]) {
              // Réutiliser l'ID existant
              platformNodeId = platformNodesInCluster[platform];
              stats.platformsReused++;
            } else {
              // Créer un ID unique pour ce nœud de plateforme
              platformNodeId = `platform_${platform}_${nodeIdCounter++}`;
              stats.platformsCreated++;
              console.log(
                `        * Plateforme "${platform}" créée pour la cible`
              );

              // Créer le nœud de plateforme
              const platformNode = {
                id: platformNodeId,
                type: "platform",
                name: platform,
                value: graphConfig.platformNodeSize,
                group: graphConfig.platformGroup,
                cluster: clusterIndex,
                // Utiliser le même décalage que le personnage parent
                offsetX: characterNode.offsetX,
                offsetY: characterNode.offsetY,
                offsetZ: characterNode.offsetZ,
              };

              // Ajouter le nœud de plateforme à notre collection
              allNodes.push(platformNode);

              // Mémoriser cette plateforme pour ce cluster
              platformNodesInCluster[platform] = platformNodeId;
            }

            // Créer un lien entre le personnage cible et sa plateforme
            allLinks.push({
              source: targetNodeId,
              target: platformNodeId,
              value: 1.5,
              type: "character_platform_connection",
              isDirect: "Direct",
              relationType: "Présence",
            });
          });
        }

        // 3. Vérifier s'il y a des plateformes dans ce lien
        if (
          link.platforms &&
          Array.isArray(link.platforms) &&
          link.platforms.length > 0
        ) {
          console.log(
            `      - Plateformes intermédiaires: ${link.platforms.join(", ")}`
          );
          stats.platformIntermediaryLinks++;

          // Utiliser les plateformes comme intermédiaires - ne pas créer de lien direct
          link.platforms.forEach((platform) => {
            if (!platform) return;

            let platformNodeId;

            // Vérifier si cette plateforme existe déjà dans ce cluster
            if (platformNodesInCluster[platform]) {
              // Réutiliser l'ID existant
              platformNodeId = platformNodesInCluster[platform];
              stats.platformsReused++;
            } else {
              // Créer un ID unique pour ce nœud de plateforme
              platformNodeId = `platform_${platform}_${nodeIdCounter++}`;
              stats.platformsCreated++;

              // Créer le nœud de plateforme
              const platformNode = {
                id: platformNodeId,
                type: "platform",
                name: platform,
                value: graphConfig.platformNodeSize,
                group: graphConfig.platformGroup,
                cluster: clusterIndex,
                // Utiliser le même décalage que le personnage parent
                offsetX: characterNode.offsetX,
                offsetY: characterNode.offsetY,
                offsetZ: characterNode.offsetZ,
              };

              // Ajouter le nœud de plateforme à notre collection
              allNodes.push(platformNode);

              // Mémoriser cette plateforme pour ce cluster
              platformNodesInCluster[platform] = platformNodeId;
            }

            // Créer des liens entre les personnages et la plateforme
            // Le personnage source se connecte à la plateforme
            allLinks.push({
              source: characterNodeId,
              target: platformNodeId,
              value: 1,
              type: "platform_connection",
              isDirect: "Direct",
              relationType: "Communication",
              originalLinkData: link, // Conserver les données du lien original
            });

            // La plateforme se connecte au personnage cible
            allLinks.push({
              source: platformNodeId,
              target: targetNodeId,
              value: 1,
              type: "platform_connection",
              isDirect: "Direct",
              relationType: "Communication",
              originalLinkData: link, // Conserver les données du lien original
            });
          });
        } else {
          // S'il n'y a pas de plateformes, créer un lien direct entre les personnages
          console.log(`      - Lien direct (sans plateforme intermédiaire)`);
          stats.directCharacterLinks++;

          allLinks.push({
            source: characterNodeId,
            target: targetNodeId,
            value: 2,
            type: link.type || "character_connection",
            isDirect: link.isDirect || "Indirect",
            relationType: link.relationType || "",
            linkType: link.linkType || "",
          });
        }
      });
    } else {
      console.log(`  - Aucun lien vers d'autres personnages`);
    }
  });

  // Après avoir créé tous les nœuds, s'assurer que chaque cluster utilisé a un nœud d'origine défini
  console.log(
    `Début de l'analyse des clusters... ${usedClusters.size} clusters réellement utilisés dans le graphe`
  );
  console.log(
    `Clusters utilisés: ${Array.from(usedClusters)
      .sort((a, b) => a - b)
      .join(", ")}`
  );

  if (graphConfig.clusterStrategy === "sequential") {
    console.log(
      `Début de l'analyse des clusters... ${stats.sequentialClusters} clusters séquentiels créés`
    );
  }

  // 2. Pour chaque cluster qui n'a pas d'origine, désigner un nœud comme origine
  usedClusters.forEach((clusterIndex) => {
    // Vérifier si ce cluster a une origine
    if (!clusterOrigins[clusterIndex]) {
      stats.clustersWithNoOrigin++;
      console.log(`Cluster ${clusterIndex} n'a pas de nœud d'origine défini`);

      // Filtrer les nœuds de caractères dans ce cluster
      const nodesInCluster = allNodes.filter(
        (node) => node.cluster === clusterIndex && node.type === "character"
      );

      if (nodesInCluster.length > 0) {
        // Trier les nœuds par nombre de posts (préférer le personnage avec le plus de posts)
        nodesInCluster.sort(
          (a, b) => (b.totalPosts || 0) - (a.totalPosts || 0)
        );

        // Désigner le meilleur candidat comme origine
        const designatedOrigin = nodesInCluster[0];
        designatedOrigin.isClusterOrigin = true;

        stats.originsDesignated++;
        console.log(
          `"${designatedOrigin.name}" (${
            designatedOrigin.totalPosts || 0
          } posts) désigné comme origine du cluster ${clusterIndex}`
        );

        // Mettre à jour le registre des origines
        clusterOrigins[clusterIndex] = designatedOrigin.id;
      } else {
        console.log(
          `Impossible de désigner une origine pour le cluster ${clusterIndex}: aucun personnage trouvé`
        );
      }
    }
  });

  // Déduplication des personnages au sein de chaque cluster
  console.log("Déduplication des personnages au sein de chaque cluster...");

  // On va dupliquer les tableaux originaux car nous allons les modifier
  const originalNodes = [...allNodes];
  const originalLinks = [...allLinks];

  // Réinitialiser les tableaux
  allNodes = [];
  allLinks = [];

  // Dictionnaire pour suivre les nœuds déjà traités par cluster
  const processedCharactersByCluster = {};

  // Dictionnaire pour le remapping des IDs (ancienID -> nouveauID)
  const idRemapping = {};

  // Dictionnaire pour stocker les slugs des clusters
  const clusterSlugs = {};

  // Première passe : identifier les slugs des clusters à partir des origines
  originalNodes.forEach((node) => {
    if (node.isClusterOrigin && node.originalId) {
      clusterSlugs[node.cluster] = node.originalId;
    }
  });

  // Traiter chaque nœud original
  originalNodes.forEach((node) => {
    const clusterIndex = node.cluster;

    // Ajouter le clusterSlug à chaque nœud
    node.clusterSlug = clusterSlugs[clusterIndex] || null;

    // Initialiser le suivi pour ce cluster si nécessaire
    if (!processedCharactersByCluster[clusterIndex]) {
      processedCharactersByCluster[clusterIndex] = {};
    }

    // Si c'est un nœud de plateforme, on le garde toujours
    // (la déduplication des plateformes est déjà gérée lors de la création)
    if (node.type === "platform") {
      allNodes.push(node);
      return;
    }

    // Pour les personnages, vérifier s'il s'agit d'un doublon
    if (node.type === "character" && node.originalId) {
      const characterOriginalId = node.originalId;

      // Si ce personnage a déjà été traité dans ce cluster
      if (processedCharactersByCluster[clusterIndex][characterOriginalId]) {
        // C'est un doublon, on enregistre son ID pour le remapping des liens
        const existingNodeId =
          processedCharactersByCluster[clusterIndex][characterOriginalId];
        idRemapping[node.id] = existingNodeId;
        stats.duplicateCharactersRemoved++;

        // Si ce doublon était marqué comme origine de cluster, transférer ce statut au nœud conservé
        if (node.isClusterOrigin) {
          const existingNode = originalNodes.find(
            (n) => n.id === existingNodeId
          );
          if (existingNode) {
            existingNode.isClusterOrigin = true;

            // Mettre à jour le registre des origines
            clusterOrigins[clusterIndex] = existingNodeId;

            console.log(
              `[DÉDUPLICATION] Transféré le statut d'origine du cluster ${clusterIndex} à "${existingNode.name}"`
            );
          }
        }

        return; // Ne pas ajouter ce nœud
      }

      // Premier nœud de ce personnage dans ce cluster, l'enregistrer
      processedCharactersByCluster[clusterIndex][characterOriginalId] = node.id;
    }

    // Dans tous les autres cas, conserver le nœud
    allNodes.push(node);
  });

  // Maintenant, ajuster les liens pour utiliser les IDs dédupliqués
  originalLinks.forEach((link) => {
    // Créer une copie du lien
    const newLink = { ...link };

    // Remplacer l'ID source si nécessaire
    if (idRemapping[newLink.source]) {
      newLink.source = idRemapping[newLink.source];
    }

    // Remplacer l'ID cible si nécessaire
    if (idRemapping[newLink.target]) {
      newLink.target = idRemapping[newLink.target];
    }

    // Ajouter le lien ajusté
    allLinks.push(newLink);
  });

  console.log(
    `Début de l'analyse des clusters... ${stats.duplicateCharactersRemoved} personnages dupliqués supprimés`
  );

  // Log des statistiques détaillées
  console.log("STATISTIQUES");
  console.log(
    `  - Personnages sans slug ignorés: ${stats.charactersWithoutSlug}`
  );
  console.log(`  - Plateformes créées: ${stats.platformsCreated}`);
  console.log(`  - Plateformes réutilisées: ${stats.platformsReused}`);
  console.log(
    `  - Liens directs entre personnages: ${stats.directCharacterLinks}`
  );
  console.log(
    `  - Liens via plateformes intermédiaires: ${stats.platformIntermediaryLinks}`
  );
  console.log(`  - Cibles non trouvées: ${stats.targetsNotFound}`);
  console.log(
    `  - Clusters sans origine détectés: ${stats.clustersWithNoOrigin}`
  );
  console.log(
    `  - Origines désignées automatiquement: ${stats.originsDesignated}`
  );
  console.log(`  - Clusters réellement utilisés: ${usedClusters.size}`);
  console.log(
    `  - Doublons de personnages supprimés: ${stats.duplicateCharactersRemoved}`
  );

  console.log(
    `[GRAPHE] ${allNodes.length} nœuds (après déduplication) dont ${
      allNodes.filter((n) => n.type === "platform").length
    } plateformes et ${allLinks.length} liens`
  );

  console.log(`[CLUSTERS] ${usedClusters.size} clusters de mini-graphes créés`);

  return { nodes: allNodes, links: allLinks };
};

/**
 * Helper function to get node positions from the graph instance
 * @param {Object} graphInstanceRef - Reference to the graph instance
 * @param {Object} graphData - Current graph data
 * @returns {Array} - Array of nodes with their positions
 */
export const getNodesWithPositions = (graphInstanceRef, graphData) => {
  let nodesWithPositions = [];

  if (
    graphInstanceRef.current &&
    typeof graphInstanceRef.current.getNodesPositions === "function"
  ) {
    // Récupérer les positions des nœuds depuis l'instance du graphe
    nodesWithPositions = graphInstanceRef.current.getNodesPositions();
    console.log(`Récupéré ${nodesWithPositions.length} nœuds avec positions`);

    // S'assurer que les informations de cluster sont préservées
    // en fusionnant les positions actuelles avec les informations originales des nœuds
    if (graphData && graphData.nodes) {
      // Créer une map des nœuds originaux pour un accès rapide
      const originalNodesMap = {};
      graphData.nodes.forEach((node) => {
        originalNodesMap[node.id] = node;
      });

      // Enrichir les positions récupérées avec les métadonnées des nœuds originaux
      nodesWithPositions = nodesWithPositions.map((posNode) => {
        const originalNode = originalNodesMap[posNode.id];
        if (originalNode) {
          return {
            ...originalNode,
            // Préserver les positions courantes
            x: posNode.x,
            y: posNode.y,
            z: posNode.z,
            // S'assurer que les informations de cluster sont conservées
            cluster: originalNode.cluster,
            offsetX: originalNode.offsetX,
            offsetY: originalNode.offsetY,
            offsetZ: originalNode.offsetZ,
          };
        }
        return posNode;
      });

      console.log(`Nœuds enrichis avec les informations de cluster`);
    }
  } else {
    // Si la référence n'est pas disponible, utiliser les données de l'état
    console.log("Utilisation des données d'état pour l'export");
    nodesWithPositions = graphData.nodes;
  }

  // Analyser les clusters dans les données exportées
  const clusters = new Set();
  nodesWithPositions.forEach((node) => {
    if (node.cluster !== undefined) {
      clusters.add(node.cluster);
    }
  });

  console.log(`Clusters distincts identifiés dans les données exportées`);
  return nodesWithPositions;
};

/**
 * Fonction utilitaire pour ajuster dynamiquement la configuration du graphe
 * @param {Object} newConfig - Nouvelles valeurs de configuration à appliquer
 * @returns {Object} - Configuration mise à jour
 */
export const updateGraphConfig = (newConfig) => {
  // Séparer 'verbose' de la config à appliquer, car il est géré globalement
  const { verbose, ...restConfig } = newConfig;
  console.log("Mise à jour de la configuration du graphe");
  console.log("  - Ancienne config:", { ...graphConfig });

  // Fusionner la nouvelle configuration avec l'existante
  Object.assign(graphConfig, restConfig);

  console.log("  - Nouvelle config:", { ...graphConfig });
  return graphConfig;
};

/**
 * Nettoie les liens orphelins (qui pointent vers des nodes inexistants)
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Array} links - Tableau des liens du graphe
 * @returns {{nodes: Array, links: Array}} Données nettoyées
 */
export const cleanOrphanLinks = (nodes, links) => {
  // Créer un Set des IDs de nodes existants pour une recherche rapide
  const nodeIds = new Set(nodes.map(node => node.id));

  // Filtrer les liens pour ne garder que ceux dont source et target existent
  const validLinks = links.filter(link => {
    const sourceExists = nodeIds.has(link.source);
    const targetExists = nodeIds.has(link.target);

    if (!sourceExists || !targetExists) {
      console.warn(`🔗 Lien orphelin supprimé: ${link.source} -> ${link.target} (source: ${sourceExists}, target: ${targetExists})`);
      return false;
    }

    return true;
  });

  return {
    nodes: nodes,
    links: validLinks
  };
};
