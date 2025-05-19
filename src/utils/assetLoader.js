/**
 * Helper function to load assets with the correct base URL prefix
 * @param {string} path - The path to the asset relative to the public folder
 * @returns {string} - The complete URL to the asset including the base URL
 */
export const getAssetPath = (path) => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

/**
 * Helper for loading image assets specifically
 * @param {string} path - The path to the image relative to the public/img folder
 * @returns {string} - The complete URL to the image
 */
export const getImagePath = (path) => {
  const imgPath = path.startsWith("img/") ? path : `img/${path}`;
  return getAssetPath(imgPath);
};

/**
 * Helper for loading data assets specifically
 * @param {string} path - The path to the data file relative to the public/data folder
 * @returns {string} - The complete URL to the data file
 */
export const getDataPath = (path) => {
  const dataPath = path.startsWith("data/") ? path : `data/${path}`;
  return getAssetPath(dataPath);
};

/**
 * Helper for loading sound assets specifically
 * @param {string} path - The path to the sound file relative to the public/sounds folder
 * @returns {string} - The complete URL to the sound file
 */
export const getSoundPath = (path) => {
  const soundPath = path.startsWith("sounds/") ? path : `sounds/${path}`;
  return getAssetPath(soundPath);
};
