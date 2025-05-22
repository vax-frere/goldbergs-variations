import React, { memo, useState, useEffect, useMemo } from "react";
import TextScramble from "../../../components/TextScramble/TextScramble";
import useGameStore from "../store";
import "./TextPanel.css";
import { getImagePath } from "../../../utils/assetLoader";

/**
 * Composant qui affiche un panel de texte en bas de l'écran
 * - En vue globale : Affiche les informations selon les priorités :
 *   1. Éléments interactifs
 *   2. Nœuds actifs
 *   3. Clusters survolés
 * - En mode cluster actif : Affiche uniquement les informations des nœuds actifs
 * Optimisé avec memo pour éviter les re-rendus inutiles
 */
const TextPanel = memo(() => {
  // Récupérer les informations sur le cluster depuis le store global
  const activeClusterId = useGameStore((state) => state.activeClusterId);
  const hoveredClusterId = useGameStore((state) => state.hoveredClusterId);
  const hoveredClusterName = useGameStore((state) => state.hoveredClusterName);
  const hoveredClusterSlug = useGameStore((state) => state.hoveredClusterSlug);

  // Récupérer les informations sur le nœud actif depuis le store global
  const activeNodeId = useGameStore((state) => state.activeNodeId);
  const activeNodeName = useGameStore((state) => state.activeNodeName);
  const activeNodeData = useGameStore((state) => state.activeNodeData);

  // Récupérer les informations sur l'élément interactif actif
  const activeInteractiveElementId = useGameStore(
    (state) => state.activeInteractiveElementId
  );
  const activeInteractiveElementType = useGameStore(
    (state) => state.activeInteractiveElementType
  );
  const activeInteractiveElementData = useGameStore(
    (state) => state.activeInteractiveElementData
  );

  // Déterminer si un cluster est actif
  const hasActiveCluster = activeClusterId !== null;
  // Déterminer si un élément interactif est actif
  const hasActiveInteractiveElement = activeInteractiveElementId !== null;

  // État local pour savoir si le texte est affiché
  const [isVisible, setIsVisible] = useState(false);
  // État pour stocker les données de la base de données
  const [databaseData, setDatabaseData] = useState([]);
  // État pour stocker la biographie du persona/nœud
  const [displayBio, setDisplayBio] = useState("");
  // État pour stocker la thématique du persona/nœud
  const [displayThematic, setDisplayThematic] = useState("");
  // État pour stocker le titre courant (cluster ou nœud)
  const [currentTitle, setCurrentTitle] = useState("");
  // État pour traquer le mode plateforme
  const [isPlatformMode, setIsPlatformMode] = useState(false);
  // État pour stocker le nombre de posts
  const [postCount, setPostCount] = useState(null);
  // État pour stocker le genre
  const [genre, setGenre] = useState(null);
  // État pour stocker le slug actif pour l'image
  const [currentSlug, setCurrentSlug] = useState(null);
  // État pour vérifier si l'image spécifique au personnage existe
  const [characterImageExists, setCharacterImageExists] = useState(false);

  // Charger les données de la base de données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/database.data.json`
        );
        if (!response.ok) {
          throw new Error("Impossible de charger les données");
        }
        const data = await response.json();
        setDatabaseData(data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la base de données:",
          error
        );
      }
    };

    fetchData();
  }, []);

  // Vérifier si l'image du personnage existe
  useEffect(() => {
    if (!currentSlug) {
      setCharacterImageExists(false);
      return;
    }

    const checkImage = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };

    const verifyImage = async () => {
      const imgUrl = getImagePath(`characters/${currentSlug}.png`);
      const exists = await checkImage(imgUrl);
      setCharacterImageExists(exists);
    };

    verifyImage();
  }, [currentSlug]);

  // Mettre à jour le contenu du panel en fonction du contexte
  useEffect(() => {
    // Réinitialiser les compteurs
    setPostCount(null);
    setGenre(null);
    setCurrentSlug(null);

    // Vérifier si on est en mode plateforme
    const platformMode = activeNodeData?.type?.toLowerCase() === "platform";
    setIsPlatformMode(platformMode);

    // Chercher des données supplémentaires dans la base de données
    const findExtraData = (slug) => {
      if (!slug || databaseData.length === 0) return;

      setCurrentSlug(slug);

      const persona = databaseData.find((p) => p.slug === slug);
      if (persona) {
        // Récupérer le nombre de posts si disponible
        if (persona.posts && Array.isArray(persona.posts)) {
          setPostCount(persona.posts.length);
        }

        // Récupérer le genre si disponible
        if (persona.genre) {
          setGenre(persona.genre);
        }
      }
    };

    // Priorité 1: Afficher les informations de l'élément interactif actif
    if (hasActiveInteractiveElement) {
      const elementData = activeInteractiveElementData || {};
      setDisplayBio(elementData.description || "");
      setDisplayThematic(activeInteractiveElementType || "Image interactive");
      setCurrentTitle(elementData.title || "");
      setIsVisible(true);
      console.log(
        "TextPanel: Affichage des informations de l'élément interactif",
        elementData.title
      );
    }
    // Priorité 2: Afficher les informations du nœud actif (principalement pour les clusters)
    else if (activeNodeId) {
      setDisplayBio(activeNodeData?.description || "");
      setDisplayThematic(activeNodeData?.type || "");
      setCurrentTitle(activeNodeName);
      setIsVisible(true);

      // Recherche d'informations supplémentaires pour le nœud actif
      if (activeNodeData?.slug) {
        findExtraData(activeNodeData.slug);
      }

      console.log(
        "TextPanel: Affichage des informations du nœud actif",
        activeNodeName
      );
    }
    // Priorité 3: Si un cluster est actif mais aucun nœud n'est actif, cacher le panel
    else if (hasActiveCluster) {
      setDisplayBio("");
      setDisplayThematic("");
      setCurrentTitle("");
      setIsVisible(false);
      console.log(
        "TextPanel: Aucun nœud actif dans le cluster actif, panneau masqué"
      );
    }
    // Priorité 4: Si aucun cluster n'est actif et aucun nœud n'est actif, mais un cluster est survolé
    else if (hoveredClusterId && hoveredClusterName) {
      if (hoveredClusterSlug && databaseData.length > 0) {
        const persona = databaseData.find((p) => p.slug === hoveredClusterSlug);
        if (persona) {
          setDisplayBio(persona.biography);
          setDisplayThematic(persona.thematic || "");

          // Recherche d'informations supplémentaires pour le cluster survolé
          findExtraData(hoveredClusterSlug);
        } else {
          setDisplayBio("");
          setDisplayThematic("");
        }
      }
      setCurrentTitle(hoveredClusterName);
      setIsVisible(true);
      console.log(
        "TextPanel: Affichage des informations du cluster survolé",
        hoveredClusterName
      );
    }
    // Aucun élément interactif activé, cacher le panel
    else {
      setDisplayBio("");
      setDisplayThematic("");
      setCurrentTitle("");
      setIsVisible(false);
      console.log("TextPanel: Aucun élément interactif, panneau masqué");
    }
  }, [
    hasActiveCluster,
    hoveredClusterId,
    hoveredClusterName,
    hoveredClusterSlug,
    databaseData,
    activeNodeId,
    activeNodeName,
    activeNodeData,
    hasActiveInteractiveElement,
    activeInteractiveElementId,
    activeInteractiveElementType,
    activeInteractiveElementData,
  ]);

  // Fonction pour rendre l'icône du genre
  const renderGenderIcon = () => {
    if (!genre) return null;

    // Déterminer l'icône à afficher en fonction du genre
    const iconSrc =
      genre.toLowerCase() === "masculin"
        ? getImagePath("male.svg")
        : genre.toLowerCase() === "féminin"
        ? getImagePath("female.svg")
        : getImagePath("neutral.svg");

    return (
      <img src={iconSrc} alt={genre} className="gender-icon" title={genre} />
    );
  };

  // Obtenir l'URL de l'image à afficher (spécifique au personnage ou par défaut)
  const getCharacterImageUrl = () => {
    if (characterImageExists && currentSlug) {
      return getImagePath(`characters/${currentSlug}.png`);
    }
    return getImagePath("character.svg");
  };

  // Pas de texte à afficher, on cache le panel
  if (!isVisible) {
    return null;
  }

  // Afficher uniquement le nom de la plateforme si on est en mode plateforme
  if (isPlatformMode) {
    return (
      <div className="text-panel">
        <div className="text-panel-content platform-only">
          <div className="platform-content">
            <TextScramble
              key={`title-${currentTitle}`}
              text={currentTitle || ""}
              className="text-panel-title platform-text"
              speed={0.6}
            />
            <TextScramble
              key={`platform-${currentTitle}`}
              text="Plateforme"
              className="text-panel-thematic platform-subtitle"
              speed={0.4}
            />
          </div>
        </div>
      </div>
    );
  }

  // Affichage standard avec image et texte
  return (
    <div className="text-panel">
      <div className="text-panel-content">
        <div className="text-panel-image">
          <img src={getCharacterImageUrl()} alt={currentTitle || "Character"} />
        </div>
        <div className="text-panel-text-content">
          <div className="text-panel-header">
            <TextScramble
              key={`title-${currentTitle}`}
              text={currentTitle || ""}
              className="text-panel-title"
              speed={0.6}
            />

            <div className="text-panel-metadata">
              {genre && renderGenderIcon()}

              {postCount !== null && (
                <div className="post-count">
                  <TextScramble
                    key={`count-${currentTitle}-${postCount}`}
                    text={postCount.toString()}
                    className="post-count-number"
                    speed={0.7}
                  />
                  <TextScramble
                    key={`posts-${currentTitle}`}
                    text="posts"
                    className="post-count-label"
                    speed={0.5}
                  />
                </div>
              )}
            </div>
          </div>

          {displayThematic && (
            <TextScramble
              key={`thematic-${currentTitle}-${displayThematic}`}
              text={displayThematic}
              className="text-panel-thematic"
              speed={0.4}
            />
          )}
          {displayBio && (
            <TextScramble
              key={`bio-${currentTitle}-${displayBio.substring(0, 10)}`}
              text={displayBio}
              className="text-panel-bio"
              speed={0.3}
            />
          )}
        </div>
      </div>
    </div>
  );
});

TextPanel.displayName = "TextPanel";

export default TextPanel;
