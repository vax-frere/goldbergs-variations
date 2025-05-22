/**
 * Liste des textures à précharger pour le jeu
 * Cette liste peut être étendue avec toutes les textures utilisées dans l'application
 */
export const getTexturesToPreload = () => {
  // Liste les types de dossiers où se trouvent les textures
  const imageDirectories = [
    "/img", // Dossier principal d'images
    "/img/platforms", // Dossier des plateformes
    "/img/characters", // Dossier des personnages
  ];

  // Liste des icônes SVG à précharger
  const svgFiles = [
    // IMPORTANT: Image centrale du jeu (prioritaire)
    "joshua-goldberg.svg",

    // Icônes UI et navigation
    "default.svg",
    "gamepad.svg",
    "keyboard.svg",
    "arrows.svg",
    "wasd.svg",
    "zqsd.svg",
    "hud-example.svg",
    "star-1.svg",
    "star-2.svg",
    "star-3.svg",
    "star-4.svg",
    "star-5.svg",
    "star-6.svg",

    // Personnages et éléments centraux
    "character.svg",
    "journalist.svg",

    // Plateformes et réseaux sociaux
    "facebook.svg",
    "twitter.svg",
    "reddit.svg",
    "youtube.svg",
    "wikipedia.svg",
    "wordpress.svg",
    "medium.svg",
    "lastfm.svg",
    "imdb.svg",
    "deviantart.svg",
    "disqus.svg",
    "thoughtcatalog.svg",
    "tough-catalog.svg",
    "toughcatalog.svg",
    "stormfront.svg",
    "dailystormer.svg",
    "dailykos.svg",
    "times-of-israel.svg",
    "surespot.svg",
    "techdirt.svg",
    "feministing.svg",
    "filmboard.svg",
    "animesuki.svg",
    "anime-news-network.svg",
    "bluelight.svg",
    "adultswim.svg",
    "adult-swim.svg",
    "Adult Swim.svg",
    "JustPaste.it.svg",
    "8chan.svg",
    "4chan.svg",
    "4plebs.svg",

    // Autres icônes
    "mail.svg",
    "email.svg",
    "e-mail.svg",
    "fbi.svg",
  ];

  // Images PNG et autres formats à précharger
  const imageFiles = [
    // Images principales
    "character.png",
    "journalist.png",
    "fbi.png",
    "facebook.webp",
  ];

  // Images de plateformes (sous-dossier platforms)
  const platformImages = [
    "platform-4chan.png",
    "platform-4plebs.png",
    "platform-8chan.png",
    "platform-Adult Swim.png",
    "platform-JustPaste.it.png",
    "platform-animesuki.png",
    "platform-badmovies.png",
    "platform-bluelight.png",
    "platform-criterion.png",
    "platform-dailykos.png",
    "platform-dailystormer.png",
    "platform-deviantart.png",
    "platform-digitpress.png",
    "platform-disqus.png",
    "platform-facebook.png",
    "platform-filmboards.png",
    "platform-imdb.png",
    "platform-lastfm.png",
    "platform-medium.png",
    "platform-notfound.png",
    "platform-reddit.png",
    "platform-stormfront.png",
    "platform-surespot.png",
    "platform-tezukainenglish.png",
    "platform-twitter.png",
    "platform-thoughtcatalog.png",
    "platform-vnn.png",
    "platform-wikipedia.png",
    "platform-wordpress.png",
    "platform-youtube.png",
    "platform-wrong-planet.png",
    "platform-ytmnd.png",
  ];

  // Images de personnages (sous-dossier characters)
  const characterImages = [
    "24-129-100-84.png",
    "Death_to_SJWs.png",
    "amina-blackberry.png",
    "bw anime fan.png",
    "emily-americana.png",
    "emily-goldstein.png",
    "josh-bornstein.png",
    "madotsuki-the-dreamer.png",
    "metacanadian.png",
    "michael-slay.png",
    "moon-metropolis.png",
    "ryoko-tamada.png",
    "tanya-cohen.png",
    "wake-up-white-man.png",
  ];

  // Liste pour stocker toutes les textures à précharger
  const texturesToPreload = [];

  // Ajouter les icônes SVG
  svgFiles.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/${file}`,
    });
  });

  // Ajouter les images dans le dossier principal
  imageFiles.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/${file}`,
    });
  });

  // Ajouter les images de plateformes
  platformImages.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/platforms/${file}`,
    });
  });

  // Ajouter les images de personnages
  characterImages.forEach((file) => {
    texturesToPreload.push({
      id: file,
      url: `/img/characters/${file}`,
    });
  });

  console.log(
    "[getTexturesToPreload] Textures à précharger:",
    texturesToPreload
  );
  return texturesToPreload;
};

/**
 * Récupère une texture spécifique à partir du gestionnaire de textures
 */
export const getTexture = (textures, id) => {
  if (!textures[id]) {
    console.warn(`Texture non trouvée: ${id}`);
    return null;
  }
  return textures[id];
};

/**
 * Vérifie si une URL est une URL d'image (PNG, JPG, SVG, etc.)
 */
export const isImageUrl = (url) => {
  if (!url) return false;
  return /\.(jpe?g|png|gif|svg|webp)$/i.test(url);
};

/**
 * Convertit une URL absolue ou relative en ID de texture
 */
export const urlToTextureId = (url) => {
  if (!url) return null;

  // Extraire uniquement le nom du fichier avec extension
  const match = url.match(/([^/]+)$/);
  const result = match ? match[1] : url;

  console.log("[urlToTextureId]", {
    input: url,
    extracted: result,
    match: match ? match[0] : null,
  });

  return result;
};
