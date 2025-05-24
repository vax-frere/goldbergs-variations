import React, { useState, useEffect, memo } from "react";
import useGameStore, { useActiveNodeData } from "../../../store";
import useAssets from "../../../hooks/useAssets";
import "./TextPanel.css";

/**
 * Composant qui affiche un panel de texte en bas de l'écran
 * - Affiche les informations des clusters survolés
 * - Affiche les informations des nœuds actifs en mode cluster avancé
 * Optimisé avec memo pour éviter les re-rendus inutiles
 */
const TextPanel = memo(() => {
  // Récupérer les slugs depuis le store global
  const hoveredClusterSlug = useGameStore((state) => state.hoveredCluster);
  const activeClusterSlug = useGameStore((state) => state.activeCluster);
  const activeNodeSlug = useActiveNodeData(); // Maintenant c'est juste un slug

  console.log("TextPanel - Rendu du composant:", {
    hoveredClusterSlug,
    activeClusterSlug,
    activeNodeSlug,
  });

  // Récupérer les assets
  const assets = useAssets();

  // État local pour stocker les données
  const [isVisible, setIsVisible] = useState(false);
  const [displayBio, setDisplayBio] = useState("");
  const [displayThematic, setDisplayThematic] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [genre, setGenre] = useState(null);
  const [postCount, setPostCount] = useState(null);
  const [currentSlug, setCurrentSlug] = useState(null);
  const [characterImageExists, setCharacterImageExists] = useState(false);

  // Fonction pour chercher les données d'un élément par son slug
  const findDataBySlug = (slug) => {
    if (!slug || !assets.isReady) return null;

    // Récupérer la base de données depuis l'asset manager
    const database = assets.getData("database");
    const graphData = assets.getData("graph");

    let data = null;

    // Chercher dans la base de données
    if (database) {
      data = database.find((item) => item.slug === slug);
    }

    // Chercher dans les nœuds du graphe
    if (graphData?.nodes) {
      const node = graphData.nodes.find(
        (n) => n.slug === slug || String(n.id) === slug
      );
      if (node) {
        // Si on a déjà des données de la base, les fusionner avec celles du graphe
        data = {
          ...node,
          ...(data || {}), // Les données de la base écrasent celles du graphe si elles existent
          name: data?.name || node.name || node.id, // Priorité au nom de la base
          type: data?.type || node.type, // Priorité au type de la base
        };
      }
    }

    return data;
  };

  useEffect(() => {
    // Réinitialiser les états
    setPostCount(null);
    setGenre(null);
    setCurrentSlug(null);
    setDisplayBio("");
    setDisplayThematic("");
    setCurrentTitle("");

    // Fonction pour afficher les données
    const displayData = (data) => {
      if (!data) {
        setIsVisible(false);
        return;
      }

      setCurrentTitle(data.name || data.id);
      setDisplayBio(data.biography || data.description || "");
      setDisplayThematic(data.thematic || data.type || "");
      setCurrentSlug(data.slug);

      setPostCount(data.totalPosts || 0);

      if (data.genre) {
        setGenre(data.genre);
      }

      setIsVisible(true);
    };

    // Priorité 1: Nœud actif
    if (activeNodeSlug) {
      const nodeData = findDataBySlug(activeNodeSlug);
      displayData(nodeData);
    }
    // Priorité 2: Cluster actif
    else if (activeClusterSlug) {
      const clusterData = findDataBySlug(activeClusterSlug);
      displayData(clusterData);
    }
    // Priorité 3: Cluster survolé
    else if (hoveredClusterSlug) {
      const clusterData = findDataBySlug(hoveredClusterSlug);
      displayData(clusterData);
    }
    // Rien d'actif
    else {
      setIsVisible(false);
    }
  }, [activeNodeSlug, activeClusterSlug, hoveredClusterSlug, assets]);

  // Vérifier si l'image du personnage existe dans l'AssetManager
  useEffect(() => {
    if (!currentSlug || !assets.isReady) {
      setCharacterImageExists(false);
      return;
    }

    // Vérifier si l'image existe dans l'AssetManager
    const imageId = `character_${currentSlug}.png`;
    const texture = assets.getTexture(imageId);
    const exists = texture !== null && texture !== undefined;

    console.log(`TextPanel - Vérification image pour ${currentSlug}:`, exists);
    setCharacterImageExists(exists);
  }, [currentSlug, assets.isReady, assets.getTexture]);

  // Fonction pour rendre l'icône du genre
  const renderGenderIcon = () => {
    if (!genre) return null;

    // Déterminer l'icône à afficher en fonction du genre
    const iconSrc =
      genre.toLowerCase() === "masculin"
        ? assets.getImagePath("male.svg")
        : genre.toLowerCase() === "féminin"
        ? assets.getImagePath("female.svg")
        : assets.getImagePath("neutral.svg");

    return (
      <img src={iconSrc} alt={genre} className="gender-icon" title={genre} />
    );
  };

  // Obtenir l'URL de l'image à afficher (spécifique au personnage ou par défaut)
  const getCharacterImageUrl = () => {
    if (characterImageExists && currentSlug) {
      // Récupérer la texture depuis l'AssetManager
      const imageId = `character_${currentSlug}.png`;
      const texture = assets.getTexture(imageId);

      if (texture && texture.image) {
        // Retourner l'URL de l'image de la texture
        return texture.image.src;
      }
    }

    // Image par défaut
    return assets.getImagePath("character.svg");
  };

  // Pas de texte à afficher, on cache le panel
  if (!isVisible) {
    console.log("TextPanel - Panel caché, isVisible:", isVisible);
    return null;
  }

  console.log("TextPanel - Panel visible, rendu du contenu:", {
    currentTitle,
    displayBio: displayBio.substring(0, 50) + "...",
    displayThematic,
    currentSlug,
  });

  // Affichage standard avec image et texte
  return (
    <div className="text-panel">
      <div className="text-panel-content">
        <div className="text-panel-image">
          <img src={getCharacterImageUrl()} alt={currentTitle || "Character"} />
        </div>
        <div className="text-panel-text-content">
          <div className="text-panel-header">
            <div className="text-panel-title">{currentTitle || ""}</div>

            <div className="text-panel-metadata">
              {genre && renderGenderIcon()}

              {postCount !== null && (
                <div className="post-count">
                  <span className="post-count-number">{postCount}</span>
                  <span className="post-count-label">posts</span>
                </div>
              )}
            </div>
          </div>

          {displayThematic && (
            <div className="text-panel-thematic">{displayThematic}</div>
          )}

          {displayBio && <div className="text-panel-bio">{displayBio}</div>}
        </div>
      </div>
    </div>
  );
});

TextPanel.displayName = "TextPanel";

export default TextPanel;
