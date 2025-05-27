import React, { useState, useEffect, memo } from "react";
import useTextContent from "../../../hooks/useTextContent";
import useAssets from "../../../hooks/useAssets";
import { THEMATIC_COLORS } from "../../../constants/thematicColors";
import "./TextPanel.css";

/**
 * Composant TextPanel générique utilisant le TextContentService
 * Supporte deux types de templates : simple et detailed
 */
const TextPanel = memo(() => {
  const content = useTextContent();
  const assets = useAssets();

  // États pour les métadonnées (images, etc.)
  const [characterImageExists, setCharacterImageExists] = useState(false);

  // Vérifier si l'image du personnage existe dans l'AssetManager
  useEffect(() => {
    // CORRECTION: Utiliser l'ID unique au lieu du slug pour l'image
    const imageKey = content?.id || content?.slug;
    if (!imageKey || !assets.isReady) {
      setCharacterImageExists(false);
      return;
    }

    // Vérifier si l'image existe dans l'AssetManager
    const imageId = `${imageKey}.png`;
    const texture = assets.getTexture(imageId);
    const exists = texture !== null && texture !== undefined;

    setCharacterImageExists(exists);
  }, [content?.id, content?.slug, assets.isReady, assets.getTexture]);

  // Fonction pour rendre l'icône du genre
  const renderGenderIcon = () => {
    if (!content?.genre) return null;

    // Déterminer l'icône à afficher en fonction du genre
    const iconSrc =
      content.genre.toLowerCase() === "masculin"
        ? assets.getImagePath("male.svg")
        : content.genre.toLowerCase() === "féminin"
        ? assets.getImagePath("female.svg")
        : assets.getImagePath("neutral.svg");

    return (
      <img
        src={iconSrc}
        alt={content.genre}
        className="gender-icon"
        title={content.genre}
      />
    );
  };

  // Obtenir l'URL de l'image à afficher (spécifique au personnage ou par défaut)
  const getCharacterImageUrl = () => {
    // CORRECTION: Utiliser l'ID unique au lieu du slug pour l'image
    const imageKey = content?.id || content?.slug;
    if (characterImageExists && imageKey) {
      // Récupérer la texture depuis l'AssetManager
      const imageId = `${imageKey}.png`;
      const texture = assets.getTexture(imageId);

      if (texture && texture.image) {
        // Retourner l'URL de l'image de la texture
        return texture.image.src;
      }
    }

    // Image par défaut
    return assets.getImagePath("character.svg");
  };

  // Obtenir l'URL de l'image de la plateforme
  const getPlatformImageUrl = () => {
    // Si on a une référence à l'asset SVG, l'utiliser
    if (content?.svgAsset) {
      const texture = assets.getTexture(content.svgAsset);
      if (texture && texture.image) {
        return texture.image.src;
      }
    }

    // Sinon, essayer de construire le nom du fichier SVG à partir du nom de la plateforme
    if (content?.name) {
      const platformSvgKey = `platforms/${content.name.toLowerCase()}.svg`;
      const texture = assets.getTexture(platformSvgKey);
      if (texture && texture.image) {
        return texture.image.src;
      }
    }

    // Image par défaut pour les plateformes
    return assets.getImagePath("default.svg");
  };

  // Pas de contenu à afficher
  if (!content) {
    return null;
  }

  // Template simple : juste un message
  if (content.type === "simple") {
    return (
      <div className="text-panel text-panel-simple">
        <div className="text-panel-content text-panel-content-simple">
          <div className="text-panel-text-content">
            <div className="text-panel-bio">{content.text}</div>
          </div>
        </div>
      </div>
    );
  }

  // Template detailed : informations complètes
  if (content.type === "detailed" || content.type === "platform") {
    const isPlatform = content.type === "platform";
    const title = content.name || content.id || "Unknown";
    const bio = content.biography || content.description || "";
    const thematic = content.thematic || content.type || "";
    const postCount = content.totalPosts || 0;

    // Déterminer la couleur du thématique selon le thematicGroup
    const getThematicColor = () => {
      if (content.thematicGroup && THEMATIC_COLORS[content.thematicGroup]) {
        return THEMATIC_COLORS[content.thematicGroup];
      }
      return "#ffffff"; // Couleur par défaut
    };

    return (
      <div className="text-panel">
        <div className="text-panel-content">
          <div className="text-panel-image">
            <img
              src={isPlatform ? getPlatformImageUrl() : getCharacterImageUrl()}
              alt={title}
            />
          </div>
          <div className="text-panel-text-content">
            <div className="text-panel-header">
              <div
                className="text-panel-title"
                style={{ color: getThematicColor() }}
              >
                {title}
              </div>

              {!isPlatform && (
                <div className="text-panel-metadata">
                  {content.genre && content.genre !== "" && renderGenderIcon()}

                  {postCount > 0 && (
                    <div className="post-count">
                      <span className="post-count-number">{postCount}</span>
                      <span className="post-count-label">posts</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {thematic && (
              <div
                className="text-panel-thematic"
                style={{ color: getThematicColor() }}
              >
                {thematic}
              </div>
            )}

            {bio && <div className="text-panel-bio">{bio}</div>}
          </div>
        </div>
      </div>
    );
  }

  // Fallback pour types inconnus
  return (
    <div className="text-panel text-panel-simple">
      <div className="text-panel-content text-panel-content-simple">
        <div className="text-panel-text-content">
          <div className="text-panel-bio">
            {content.text || "Unknown content"}
          </div>
        </div>
      </div>
    </div>
  );
});

TextPanel.displayName = "TextPanel";

export default TextPanel;
