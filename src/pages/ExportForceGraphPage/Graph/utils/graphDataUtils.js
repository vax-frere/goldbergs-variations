/**
 * ============================================================================
 * GRAPH DATA UTILITIES
 * ============================================================================
 *
 * Ce fichier contient toutes les utilitaires pour charger, construire et
 * analyser les données du graphe de personnages.
 *
 * Fonctions principales :
 * - loadGraphData() : Point d'entrée principal pour charger les données
 * - buildGraphFromCharacterData() : Construction du graphe à partir des données
 * - getNodesWithPositions() : Récupération des positions des nœuds
 * - analyzeGraphClusters() : Analyse et debug des clusters
 * - cleanOrphanLinks() : Nettoyage des liens orphelins
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Configuration pour les logs de debug du graphe
 * Mettre à true pour activer les logs détaillés
 */
const DEBUG_GRAPH = true;

// ============================================================================
// FONCTIONS PUBLIQUES PRINCIPALES
// ============================================================================

/**
 * Point d'entrée principal : charge les données depuis database.data.json
 * et construit le graphe complet
 *
 * @param {Object} config - Configuration optionnelle
 * @returns {Promise<{nodes: Array, links: Array}>} Données du graphe
 */
export const loadGraphData = async (config = {}) => {
  try {
    if (DEBUG_GRAPH) {
      console.log(
        "Début du chargement des données depuis database.data.json..."
      );
    }

    // Charger le fichier database.data.json
    const response = await fetch(
      `${import.meta.env.BASE_URL}data/database.data.json`
    );
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const characterData = await response.json();
    if (DEBUG_GRAPH) {
      console.log(`Données chargées: ${characterData.length} personnages`);
    }

    // Vérifier la structure des données
    if (!Array.isArray(characterData)) {
      throw new Error(
        "Structure de données invalide: attendu un tableau de personnages"
      );
    }

    // Générer le graphe
    if (DEBUG_GRAPH) console.log("Génération dynamique du graphe...");
    const graphData = buildGraphFromCharacterData(characterData);

    // Nettoyer les liens orphelins
    const cleanedData = cleanOrphanLinks(graphData.nodes, graphData.links);
    if (DEBUG_GRAPH) {
      console.log(
        `🧹 Nettoyage: ${cleanedData.orphanLinksRemoved} liens orphelins supprimés`
      );
    }

    // Analyse des clusters (debug uniquement)
    if (DEBUG_GRAPH) {
      analyzeGraphClusters(cleanedData.nodes, cleanedData.links);
    }

    // Combiner les statistiques
    const combinedStats = {
      ...graphData.stats,
      orphanLinksRemoved: cleanedData.orphanLinksRemoved,
    };

    return {
      nodes: cleanedData.nodes,
      links: cleanedData.links,
      stats: combinedStats,
    };
  } catch (err) {
    console.error("Erreur lors du chargement des données:", err);
    throw err;
  }
};

/**
 * Construit le graphe complet à partir des données de personnages
 *
 * @param {Array} characterData - Données brutes des personnages
 * @returns {{nodes: Array, links: Array}} Graphe construit
 */
export const buildGraphFromCharacterData = (characterData) => {
  if (DEBUG_GRAPH) console.log("Début de la construction du graphe...");

  // Filtrer les personnages qui n'ont ni liens, ni posts, ni sources
  const relevantCharacters = characterData.filter((character) => {
    const hasLinks = character.links && character.links.length > 0;
    const hasPosts = character.totalPosts && character.totalPosts > 0;
    const hasSources = character.sources && character.sources.length > 0;
    return hasLinks || hasPosts || hasSources;
  });

  if (DEBUG_GRAPH)
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

  // Tableau pour garder une trace des origines de clusterIds
  const clusterOrigins = {};

  // Pour suivre quels clusterIds sont réellement utilisés
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
    duplicateCharactersRemoved: 0,
    clustersRemoved: 0,
    finalClusters: 0,
  };

  // Pour chaque personnage, créer un mini-graphe
  relevantCharacters.forEach((character, characterIndex) => {
    // Vérifier si le personnage a un slug
    if (!character.slug) {
      stats.charactersWithoutSlug++;
      if (DEBUG_GRAPH)
        console.log(
          `[ATTENTION] Personnage sans slug ignoré: ${
            character.displayName || "Inconnu"
          }`
        );
      return;
    }

    // Marquer ce clusterId comme utilisé
    usedClusters.add(character.slug);

    if (DEBUG_GRAPH)
      console.log(
        `[PERSONNAGE] Traitement de "${
          character.displayName || character.slug
        }" (ClusterId ${character.slug})`
      );

    // Récupérer un ID unique pour créer des nœuds distincts même si même slug
    const characterNodeId = `${character.slug}_${nodeIdCounter++}`;

    // Vérifier si c'est le premier personnage dans ce clusterId (origine du clusterId)
    const isClusterOrigin = !clusterOrigins[character.slug];

    // Si c'est l'origine, l'enregistrer
    if (isClusterOrigin) {
      clusterOrigins[character.slug] = characterNodeId;
      if (DEBUG_GRAPH)
        console.log(
          `  - [ORIGINE] Ce personnage est l'origine du clusterId ${character.slug}`
        );
    }

    // Créer le nœud de ce personnage
    const characterNode = {
      id: characterNodeId,
      originalId: character.slug, // Garder le slug original pour les liens
      nodeId: character.slug, // Nouveau nom pour le slug
      type: character.isJoshua ? "persona_character" : "external_character",
      name: character.displayName || character.slug,
      nodeThematicGroup: character.thematicGroup, // Thématique propre au nœud
      clusterThematicGroup: character.thematicGroup, // Sera mis à jour avec le master du cluster
      // Ajouter le nombre total de posts pour dimensionner le texte
      totalPosts: character.totalPosts || 0,
      // Créer un groupe visuel pour aider à distinguer les mini-graphes
      clusterId: character.slug, // Utiliser le slug comme clusterId
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
      if (DEBUG_GRAPH)
        console.log(`  - Sources: ${character.sources.join(", ") || "aucune"}`);

      character.sources.forEach((platform) => {
        if (!platform) return;

        let platformNodeId;

        // Vérifier si cette plateforme existe déjà dans ce cluster
        if (platformNodesInCluster[platform]) {
          // Réutiliser l'ID existant
          platformNodeId = platformNodesInCluster[platform];
          stats.platformsReused++;
          if (DEBUG_GRAPH)
            console.log(`    * Plateforme "${platform}" réutilisée`);
        } else {
          // Créer un ID unique pour ce nœud de plateforme
          platformNodeId = `platform_${platform}_${nodeIdCounter++}`;
          stats.platformsCreated++;
          if (DEBUG_GRAPH)
            console.log(
              `    * Plateforme "${platform}" créée (id: ${platformNodeId})`
            );

          // Créer le nœud de plateforme
          const platformNode = {
            id: platformNodeId,
            nodeId: `${platform}_${character.slug}`, // ID unique pour la plateforme
            type: "platform",
            name: platform,
            nodeThematicGroup: character.thematicGroup, // Hériter du thematicGroup du personnage
            clusterThematicGroup: character.thematicGroup, // Sera mis à jour avec le master du cluster
            clusterId: character.slug,
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
          type: "character_platform_connection",
          isDirect: "Direct",
          relationType: "Présence",
          nodeThematicGroup: character.thematicGroup, // Ajouter le thematicGroup au lien
          clusterThematicGroup: character.thematicGroup, // Thématique du cluster
        });
      });
    }

    // 2. Ajouter les liens vers d'autres personnages et leurs plateformes
    if (character.links && Array.isArray(character.links)) {
      if (DEBUG_GRAPH)
        console.log(
          `  - ${character.links.length} liens vers d'autres personnages`
        );

      character.links.forEach((link, linkIndex) => {
        if (!link.target) {
          if (DEBUG_GRAPH)
            console.log(`    * Lien #${linkIndex + 1} ignoré: cible manquante`);
          return;
        }

        // Vérifier que la cible existe dans les données
        const targetCharacter = characterData.find(
          (c) => c.slug === link.target
        );
        if (!targetCharacter) {
          stats.targetsNotFound++;
          if (DEBUG_GRAPH)
            console.log(
              `    * Lien #${linkIndex + 1}: CIBLE NON TROUVÉE "${link.target}"`
            );
          return;
        }

        if (DEBUG_GRAPH)
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
          nodeId: link.target, // Nouveau nom pour le slug
          type: targetCharacter.isJoshua
            ? "persona_character"
            : "external_character",
          name: targetCharacter.displayName || link.target,
          nodeThematicGroup: targetCharacter.thematicGroup, // Thématique propre au nœud cible
          clusterThematicGroup: character.thematicGroup, // Hérite du cluster du personnage source
          // Ajouter le nombre total de posts pour le personnage cible
          totalPosts: targetCharacter.totalPosts || 0,
          clusterId: character.slug,
        };

        // Ajouter le nœud cible à notre collection
        allNodes.push(targetNode);

        // Ajouter les plateformes du personnage cible depuis ses sources
        if (targetCharacter.sources && Array.isArray(targetCharacter.sources)) {
          if (DEBUG_GRAPH)
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
              if (DEBUG_GRAPH)
                console.log(
                  `        * Plateforme "${platform}" créée pour la cible`
                );

              // Créer le nœud de plateforme
              const platformNode = {
                id: platformNodeId,
                nodeId: `${platform}_${character.slug}`, // ID unique pour la plateforme
                type: "platform",
                name: platform,
                nodeThematicGroup: character.thematicGroup, // Hériter du thematicGroup du personnage
                clusterThematicGroup: character.thematicGroup, // Sera mis à jour avec le master du cluster
                clusterId: character.slug,
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
              type: "character_platform_connection",
              isDirect: "Direct",
              relationType: "Présence",
              nodeThematicGroup: character.thematicGroup, // Ajouter le thematicGroup au lien
              clusterThematicGroup: character.thematicGroup, // Thématique du cluster
            });
          });
        }

        // 3. Vérifier s'il y a des plateformes dans ce lien
        if (
          link.platforms &&
          Array.isArray(link.platforms) &&
          link.platforms.length > 0
        ) {
          if (DEBUG_GRAPH)
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
                nodeId: `${platform}_${character.slug}`, // ID unique pour la plateforme
                type: "platform",
                name: platform,
                nodeThematicGroup: character.thematicGroup, // Hériter du thematicGroup du personnage
                clusterThematicGroup: character.thematicGroup, // Sera mis à jour avec le master du cluster
                clusterId: character.slug,
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
              type: "platform_connection",
              isDirect: "Direct",
              relationType: "Communication",
              nodeThematicGroup: character.thematicGroup, // Ajouter le thematicGroup au lien
              clusterThematicGroup: character.thematicGroup, // Thématique du cluster
              originalLinkData: link,
            });

            // La plateforme se connecte au personnage cible
            allLinks.push({
              source: platformNodeId,
              target: targetNodeId,
              type: "platform_connection",
              isDirect: "Direct",
              relationType: "Communication",
              nodeThematicGroup: character.thematicGroup, // Ajouter le thematicGroup au lien
              clusterThematicGroup: character.thematicGroup, // Thématique du cluster
              originalLinkData: link,
            });
          });
        } else {
          // S'il n'y a pas de plateformes, créer un lien direct entre les personnages
          if (DEBUG_GRAPH)
            console.log(`      - Lien direct (sans plateforme intermédiaire)`);
          stats.directCharacterLinks++;

          allLinks.push({
            source: characterNodeId,
            target: targetNodeId,
            type: link.type || "character_connection",
            isDirect: link.isDirect || "Indirect",
            relationType: link.relationType || "",
            linkType: link.linkType || "",
            nodeThematicGroup: character.thematicGroup, // Ajouter le thematicGroup au lien
            clusterThematicGroup: character.thematicGroup, // Thématique du cluster
          });
        }
      });
    } else {
      if (DEBUG_GRAPH) console.log(`  - Aucun lien vers d'autres personnages`);
    }
  });

  // Après avoir créé tous les nœuds, s'assurer que chaque clusterId utilisé a un nœud d'origine défini
  if (DEBUG_GRAPH)
    console.log(
      `Début de l'analyse des clusterIds... ${usedClusters.size} clusterIds réellement utilisés dans le graphe`
    );
  if (DEBUG_GRAPH)
    console.log(
      `ClusterIds utilisés: ${Array.from(usedClusters).sort().join(", ")}`
    );

  // 2. Pour chaque clusterId qui n'a pas d'origine, désigner un nœud comme origine
  usedClusters.forEach((clusterSlug) => {
    // Vérifier si ce clusterId a une origine
    if (!clusterOrigins[clusterSlug]) {
      stats.clustersWithNoOrigin++;
      if (DEBUG_GRAPH)
        console.log(
          `ClusterId ${clusterSlug} n'a pas de nœud d'origine défini`
        );

      // Filtrer les nœuds de caractères dans ce clusterId
      const nodesInCluster = allNodes.filter(
        (node) =>
          node.clusterId === clusterSlug &&
          (node.type === "persona_character" ||
            node.type === "external_character")
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
        if (DEBUG_GRAPH)
          console.log(
            `"${designatedOrigin.name}" (${
              designatedOrigin.totalPosts || 0
            } posts) désigné comme origine du clusterId ${clusterSlug}`
          );

        // Mettre à jour le registre des origines
        clusterOrigins[clusterSlug] = designatedOrigin.id;
      } else {
        if (DEBUG_GRAPH)
          console.log(
            `Impossible de désigner une origine pour le clusterId ${clusterSlug}: aucun personnage trouvé`
          );
      }
    }
  });

  // Déduplication des personnages au sein de chaque clusterId
  if (DEBUG_GRAPH)
    console.log("Déduplication des personnages au sein de chaque clusterId...");

  // Grouper les nœuds par clusterId et originalId pour identifier les doublons
  const nodesByClusterAndOriginal = {};
  const nodesToKeep = [];
  const idRemapping = {};

  allNodes.forEach((node) => {
    if (node.type === "platform") {
      // Garder toutes les plateformes
      nodesToKeep.push(node);
      return;
    }

    if (
      (node.type === "persona_character" ||
        node.type === "external_character") &&
      node.originalId
    ) {
      const key = `${node.clusterId}_${node.originalId}`;

      if (!nodesByClusterAndOriginal[key]) {
        // Premier nœud de ce personnage dans ce cluster
        nodesByClusterAndOriginal[key] = node;
        nodesToKeep.push(node);
      } else {
        // Doublon détecté
        const existingNode = nodesByClusterAndOriginal[key];
        idRemapping[node.id] = existingNode.id;
        stats.duplicateCharactersRemoved++;

        // Si ce doublon était marqué comme origine, transférer le statut
        if (node.isClusterOrigin) {
          existingNode.isClusterOrigin = true;
          clusterOrigins[node.clusterId] = existingNode.id;
        }
      }
    } else {
      // Autres types de nœuds
      nodesToKeep.push(node);
    }
  });

  // Mettre à jour les liens avec les IDs remappés
  const updatedLinks = allLinks.map((link) => ({
    ...link,
    source: idRemapping[link.source] || link.source,
    target: idRemapping[link.target] || link.target,
  }));

  // Remplacer les tableaux
  allNodes = nodesToKeep;
  allLinks = updatedLinks;

  // Propager le clusterThematicGroup du nœud maître à tous les nœuds du cluster
  if (DEBUG_GRAPH)
    console.log(
      "Propagation du clusterThematicGroup depuis les nœuds maîtres..."
    );

  // Identifier les thématiques des clusters depuis leurs nœuds maîtres
  const clusterThematicGroups = {};
  allNodes.forEach((node) => {
    if (node.isClusterOrigin && node.nodeThematicGroup) {
      clusterThematicGroups[node.clusterId] = node.nodeThematicGroup;
    }
  });

  // Appliquer le clusterThematicGroup à tous les nœuds
  allNodes.forEach((node) => {
    if (clusterThematicGroups[node.clusterId]) {
      node.clusterThematicGroup = clusterThematicGroups[node.clusterId];
    }
  });

  // Appliquer le clusterThematicGroup à tous les liens
  allLinks.forEach((link) => {
    // Trouver le nœud source pour déterminer son cluster
    const sourceNode = allNodes.find((n) => n.id === link.source);
    if (sourceNode && clusterThematicGroups[sourceNode.clusterId]) {
      link.clusterThematicGroup = clusterThematicGroups[sourceNode.clusterId];
    }
  });

  if (DEBUG_GRAPH)
    console.log(
      `Propagé clusterThematicGroup pour ${
        Object.keys(clusterThematicGroups).length
      } clusters`
    );

  // Passe finale : supprimer tous les clusters sans connexion avec des personas
  if (DEBUG_GRAPH)
    console.log("Début du nettoyage des clusters sans personas...");
  const finalCleanedData = removeNonPersonaClusters(allNodes, allLinks);
  allNodes = finalCleanedData.nodes;
  allLinks = finalCleanedData.links;

  // Utiliser les vraies statistiques de nettoyage
  stats.nodesRemovedFinal = finalCleanedData.nodesRemoved;
  stats.linksRemovedFinal = finalCleanedData.linksRemoved;
  stats.clustersRemoved = finalCleanedData.clustersRemoved;
  stats.finalClusters = new Set(allNodes.map((n) => n.clusterId)).size;

  // Log des statistiques détaillées
  if (DEBUG_GRAPH) {
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
      `  - ClusterIds sans origine détectés: ${stats.clustersWithNoOrigin}`
    );
    console.log(
      `  - Origines désignées automatiquement: ${stats.originsDesignated}`
    );
    console.log(`  - ClusterIds réellement utilisés: ${usedClusters.size}`);
    console.log(
      `  - Doublons de personnages supprimés: ${stats.duplicateCharactersRemoved}`
    );
    console.log(
      `  - Clusters supprimés (sans personas): ${stats.clustersRemoved}`
    );
    console.log(`  - Clusters finaux conservés: ${stats.finalClusters}`);

    console.log(
      `[GRAPHE] ${allNodes.length} nœuds (après nettoyage final) dont ${
        allNodes.filter((n) => n.type === "platform").length
      } plateformes et ${allLinks.length} liens`
    );

    console.log(
      `[CLUSTERIDS] ${stats.finalClusters} clusters finaux (tous connectés à des personas)`
    );

    // Log de la liste unique des plateformes présentes dans le graphe
    const uniquePlatforms = new Set();
    allNodes.forEach((node) => {
      if (node.type === "platform") {
        uniquePlatforms.add(node.name);
      }
    });

    const platformsList = Array.from(uniquePlatforms).sort();
    console.log(
      `[PLATEFORMES] ${platformsList.length} plateformes uniques dans le graphe:`
    );
    console.log(`  ${platformsList.join(", ")}`);
  }

  return {
    nodes: allNodes,
    links: allLinks,
    stats: {
      charactersWithoutSlug: stats.charactersWithoutSlug,
      duplicateCharactersRemoved: stats.duplicateCharactersRemoved,
      clustersRemoved: stats.clustersRemoved,
      finalClusters: stats.finalClusters,
      targetsNotFound: stats.targetsNotFound,
      platformsCreated: stats.platformsCreated,
      platformsReused: stats.platformsReused,
      nodesRemovedFinal: stats.nodesRemovedFinal,
      linksRemovedFinal: stats.linksRemovedFinal,
    },
  };
};

/**
 * Récupère les positions actuelles des nœuds depuis l'instance du graphe 3D
 *
 * @param {Object} graphInstanceRef - Référence à l'instance du graphe
 * @param {Object} graphData - Données actuelles du graphe
 * @returns {Array} Nœuds avec leurs positions
 */
export const getNodesWithPositions = (graphInstanceRef, graphData) => {
  let nodesWithPositions = [];

  if (
    graphInstanceRef.current &&
    typeof graphInstanceRef.current.getNodesPositions === "function"
  ) {
    // Récupérer les positions des nœuds depuis l'instance du graphe
    nodesWithPositions = graphInstanceRef.current.getNodesPositions();
    if (DEBUG_GRAPH)
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
            clusterId: originalNode.clusterId,
          };
        }
        return posNode;
      });

      if (DEBUG_GRAPH)
        console.log(`Nœuds enrichis avec les informations de cluster`);
    }
  } else {
    // Si la référence n'est pas disponible, utiliser les données de l'état
    if (DEBUG_GRAPH)
      console.log("Utilisation des données d'état pour l'export");
    nodesWithPositions = graphData.nodes;
  }

  // Analyser les clusters dans les données exportées
  const clusters = new Set();
  nodesWithPositions.forEach((node) => {
    if (node.clusterId !== undefined) {
      clusters.add(node.clusterId);
    }
  });

  if (DEBUG_GRAPH)
    console.log(`Clusters distincts identifiés dans les données exportées`);
  return nodesWithPositions;
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Nettoie les liens orphelins (qui pointent vers des nœuds inexistants)
 *
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Array} links - Tableau des liens du graphe
 * @returns {{nodes: Array, links: Array}} Données nettoyées
 */
export const cleanOrphanLinks = (nodes, links) => {
  // Créer un Set des IDs de nodes existants pour une recherche rapide
  const nodeIds = new Set(nodes.map((node) => node.id));

  let orphanLinksRemoved = 0;

  // Filtrer les liens pour ne garder que ceux dont source et target existent
  const validLinks = links.filter((link) => {
    const sourceExists = nodeIds.has(link.source);
    const targetExists = nodeIds.has(link.target);

    if (!sourceExists || !targetExists) {
      orphanLinksRemoved++;
      if (DEBUG_GRAPH)
        console.warn(
          `🔗 Lien orphelin supprimé: ${link.source} -> ${link.target} (source: ${sourceExists}, target: ${targetExists})`
        );
      return false;
    }

    return true;
  });

  return {
    nodes: nodes,
    links: validLinks,
    orphanLinksRemoved: orphanLinksRemoved,
  };
};

/**
 * Supprime tous les clusters qui n'ont pas de connexion (même indirecte) avec des personas
 * Seuls les clusters ayant un persona comme origine (cluster master) sont conservés
 *
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Array} links - Tableau des liens du graphe
 * @returns {{nodes: Array, links: Array}} Données nettoyées
 */
export const removeNonPersonaClusters = (nodes, links) => {
  if (DEBUG_GRAPH) console.log("🧹 Nettoyage des clusters sans personas...");

  // 1. Identifier tous les clusters qui ont un persona comme origine
  const personaClusters = new Set();

  nodes.forEach((node) => {
    if (node.type === "persona_character" && node.isClusterOrigin) {
      personaClusters.add(node.clusterId);
      if (DEBUG_GRAPH) {
        console.log(
          `✅ Cluster ${node.clusterId} conservé (origine persona: ${node.name})`
        );
      }
    }
  });

  // 2. Construire un graphe de connexions entre clusters pour identifier les connexions indirectes
  const clusterConnections = new Map();

  links.forEach((link) => {
    const sourceNode = nodes.find((n) => n.id === link.source);
    const targetNode = nodes.find((n) => n.id === link.target);

    if (
      sourceNode &&
      targetNode &&
      sourceNode.clusterId !== targetNode.clusterId
    ) {
      // Lien inter-cluster
      if (!clusterConnections.has(sourceNode.clusterId)) {
        clusterConnections.set(sourceNode.clusterId, new Set());
      }
      if (!clusterConnections.has(targetNode.clusterId)) {
        clusterConnections.set(targetNode.clusterId, new Set());
      }

      clusterConnections.get(sourceNode.clusterId).add(targetNode.clusterId);
      clusterConnections.get(targetNode.clusterId).add(sourceNode.clusterId);
    }
  });

  // 3. Utiliser un parcours en largeur pour trouver tous les clusters connectés aux personas
  const connectedClusters = new Set(personaClusters);
  const queue = [...personaClusters];

  while (queue.length > 0) {
    const currentCluster = queue.shift();
    const connections = clusterConnections.get(currentCluster);

    if (connections) {
      connections.forEach((connectedCluster) => {
        if (!connectedClusters.has(connectedCluster)) {
          connectedClusters.add(connectedCluster);
          queue.push(connectedCluster);
          if (DEBUG_GRAPH) {
            console.log(
              `✅ Cluster ${connectedCluster} conservé (connexion indirecte avec personas)`
            );
          }
        }
      });
    }
  }

  // 4. Identifier les clusters à supprimer
  const allClusters = new Set();
  nodes.forEach((node) => allClusters.add(node.clusterId));

  const clustersToRemove = new Set();
  allClusters.forEach((clusterId) => {
    if (!connectedClusters.has(clusterId)) {
      clustersToRemove.add(clusterId);
    }
  });

  // 5. Filtrer les nœuds et liens
  const filteredNodes = nodes.filter((node) => {
    const shouldKeep = connectedClusters.has(node.clusterId);
    if (!shouldKeep && DEBUG_GRAPH) {
      console.log(
        `❌ Nœud supprimé: ${node.name} (cluster ${node.clusterId} sans persona)`
      );
    }
    return shouldKeep;
  });

  const filteredLinks = links.filter((link) => {
    const sourceNode = nodes.find((n) => n.id === link.source);
    const targetNode = nodes.find((n) => n.id === link.target);

    if (!sourceNode || !targetNode) return false;

    const shouldKeep =
      connectedClusters.has(sourceNode.clusterId) &&
      connectedClusters.has(targetNode.clusterId);

    if (!shouldKeep && DEBUG_GRAPH) {
      console.log(
        `❌ Lien supprimé: ${link.source} -> ${link.target} (clusters sans persona)`
      );
    }

    return shouldKeep;
  });

  if (DEBUG_GRAPH) {
    console.log(`🧹 Nettoyage terminé:`);
    console.log(`  - Clusters avec personas: ${personaClusters.size}`);
    console.log(`  - Clusters connectés conservés: ${connectedClusters.size}`);
    console.log(`  - Clusters supprimés: ${clustersToRemove.size}`);
    console.log(
      `  - Nœuds: ${nodes.length} → ${filteredNodes.length} (${
        nodes.length - filteredNodes.length
      } supprimés)`
    );
    console.log(
      `  - Liens: ${links.length} → ${filteredLinks.length} (${
        links.length - filteredLinks.length
      } supprimés)`
    );

    if (clustersToRemove.size > 0) {
      console.log(
        `  - Clusters supprimés: ${Array.from(clustersToRemove).join(", ")}`
      );
    }
  }

  return {
    nodes: filteredNodes,
    links: filteredLinks,
    nodesRemoved: nodes.length - filteredNodes.length,
    linksRemoved: links.length - filteredLinks.length,
    clustersRemoved: clustersToRemove.size,
  };
};

/**
 * Analyse et affiche des informations détaillées sur les clusters créés
 * (Fonction de debug uniquement)
 *
 * @param {Array} nodes - Tableau des nœuds du graphe
 * @param {Array} links - Tableau des liens du graphe
 */
export const analyzeGraphClusters = (nodes, links) => {
  if (DEBUG_GRAPH) console.log("Début de l'analyse des clusters...");

  // Regrouper les nœuds par cluster
  const clusterMap = {};

  // Identifier les personnages à l'origine de chaque cluster
  const clusterOrigins = {};
  // Pour identifier l'origine, on utilise le caractère d'index le plus bas dans chaque cluster
  const relevantCharacters = nodes.filter(
    (node) =>
      node.type === "persona_character" || node.type === "external_character"
  );

  // Trier les personnages par index d'origine
  const sortedCharacters = [...relevantCharacters].sort((a, b) => {
    // Extraire l'index du format "slug_index"
    const indexA = parseInt(a.id.split("_").pop());
    const indexB = parseInt(b.id.split("_").pop());
    return indexA - indexB;
  });

  // Le premier personnage de chaque cluster est considéré comme l'origine
  sortedCharacters.forEach((char) => {
    if (!clusterOrigins[char.clusterId]) {
      clusterOrigins[char.clusterId] = {
        name: char.name,
        id: char.id,
        originalId: char.originalId,
        type: char.type,
        totalPosts: char.totalPosts,
      };
    }
  });

  nodes.forEach((node) => {
    if (!clusterMap[node.clusterId]) {
      clusterMap[node.clusterId] = {
        id: node.clusterId,
        nodes: [],
        characters: [],
        platforms: [],
        origin: clusterOrigins[node.clusterId] || { name: "Inconnu" },
      };
    }

    clusterMap[node.clusterId].nodes.push(node);

    if (
      node.type === "persona_character" ||
      node.type === "external_character"
    ) {
      if (!clusterMap[node.clusterId].characters.includes(node.name)) {
        clusterMap[node.clusterId].characters.push(node.name);
      }
    } else if (node.type === "platform") {
      if (!clusterMap[node.clusterId].platforms.includes(node.name)) {
        clusterMap[node.clusterId].platforms.push(node.name);
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
      const sourceCluster = sourceNode.clusterId;
      const targetCluster = targetNode.clusterId;

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
  if (DEBUG_GRAPH) {
    console.log("Détails par cluster:");
    Object.values(clusterMap).forEach((cluster) => {
      const originInfo =
        cluster.origin.type === "persona_character"
          ? `${cluster.origin.name} (Joshua, ${
              cluster.origin.totalPosts || 0
            } posts)`
          : `${cluster.origin.name} (${cluster.origin.totalPosts || 0} posts)`;

      console.log(`[CLUSTER ${cluster.id}] Origine: ${originInfo}`);

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
                ([targetCluster, count]) =>
                  `Cluster ${targetCluster} (${count})`
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
  }

  return clusterMap;
};
