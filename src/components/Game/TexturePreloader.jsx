import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import * as THREE from "three";

// Créer un contexte pour stocker les textures
export const TextureContext = createContext({
  textures: {},
  loaded: false,
  progress: 0,
});

// Hook personnalisé pour accéder aux textures
export const useTextures = () => useContext(TextureContext);

/**
 * Précharge toutes les textures et les rend disponibles via un contexte React
 */
const TexturePreloader = ({ children, texturesList = [] }) => {
  const [state, setState] = useState({
    textures: {},
    loaded: false,
    progress: 0,
  });

  // Référence pour suivre les textures chargées
  const loadedTexturesRef = useRef({});
  const loadedCountRef = useRef(0);
  const totalTexturesRef = useRef(texturesList.length);

  useEffect(() => {
    // Réinitialiser les compteurs et références quand la liste change
    loadedCountRef.current = 0;
    loadedTexturesRef.current = {};
    totalTexturesRef.current = texturesList.length;

    // Si aucune texture à charger, marquer comme chargé
    if (texturesList.length === 0) {
      console.log("[TexturePreloader] Aucune texture à charger");
      setState({ textures: {}, loaded: true, progress: 100 });
      return;
    }

    console.log("[TexturePreloader] Chargement des textures:", texturesList);

    const textureLoader = new THREE.TextureLoader();

    // Fonction pour mettre à jour l'état de chargement
    const updateProgress = (id, texture = null) => {
      // Incrémenter le compteur
      loadedCountRef.current++;

      // Si une texture est fournie, la stocker
      if (texture && id) {
        loadedTexturesRef.current[id] = texture;
      }

      // Calculer la progression
      const progress = Math.floor(
        (loadedCountRef.current / totalTexturesRef.current) * 100
      );
      const isComplete = loadedCountRef.current === totalTexturesRef.current;

      // Mettre à jour l'état une seule fois
      setState((prev) => ({
        ...prev,
        textures: { ...loadedTexturesRef.current },
        progress,
        loaded: isComplete,
      }));

      if (isComplete) {
        console.log(
          "[TexturePreloader] Toutes les textures sont chargées:",
          loadedTexturesRef.current
        );
      }
    };

    // Charger chaque texture
    texturesList.forEach(({ id, url }) => {
      textureLoader.load(
        url,
        (texture) => {
          // Configurer la texture
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;

          console.log(`[TexturePreloader] Texture chargée: ${id} (${url})`);

          // Mettre à jour la progression avec la texture
          updateProgress(id, texture);
        },
        // Progression (non utilisé mais requis par l'API)
        undefined,
        // Erreur
        (error) => {
          console.error(
            `[TexturePreloader] Erreur lors du chargement de la texture ${url}:`,
            error
          );
          // Mettre à jour la progression sans texture
          updateProgress(null);
        }
      );
    });

    // Nettoyage lors du démontage
    return () => {
      // Libérer les textures si nécessaire
      Object.values(loadedTexturesRef.current).forEach((texture) => {
        if (texture && texture.dispose) {
          texture.dispose();
        }
      });
    };
  }, [texturesList]);

  // Vérifier si l'enfant est une fonction et lui transmettre l'état
  if (typeof children === "function") {
    return (
      <TextureContext.Provider value={state}>
        {children(state)}
      </TextureContext.Provider>
    );
  }

  // Sinon, rendre les enfants normalement
  return (
    <TextureContext.Provider value={state}>{children}</TextureContext.Provider>
  );
};

export default TexturePreloader;
