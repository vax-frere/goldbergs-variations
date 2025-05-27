import { useState, useEffect } from "react";
import textContentService from "../services/TextContentService";

/**
 * Hook pour écouter les changements de contenu du TextContentService
 * @returns {Object|null} Contenu actuel ou null
 */
const useTextContent = () => {
  const [content, setContent] = useState(
    textContentService.getCurrentContent()
  );

  useEffect(() => {
    // Fonction listener pour les changements
    const handleContentChange = (newContent) => {
      setContent(newContent);
    };

    // S'abonner aux changements
    textContentService.addListener(handleContentChange);

    // Récupérer le contenu initial au cas où il y en aurait déjà un
    setContent(textContentService.getCurrentContent());

    // Nettoyage lors du démontage
    return () => {
      textContentService.removeListener(handleContentChange);
    };
  }, []);

  return content;
};

export default useTextContent;
