import React, { memo, useState, useEffect, useMemo } from "react";
import TextScramble from "../../TextScramble/TextScramble";
import useGameStore from "../store";
import "./TextPanel.css";

/**
 * Composant qui affiche un panel de texte en bas de l'écran
 * Affiche le nom du cluster actif et sa biographie
 * Se cache quand aucun cluster n'est actif
 * Optimisé avec memo pour éviter les re-rendus inutiles
 */
const TextPanel = memo(() => {
  // Récupérer les informations sur le cluster actif depuis le store global
  const activeClusterId = useGameStore((state) => state.activeClusterId);
  const activeClusterName = useGameStore((state) => state.activeClusterName);
  const activeClusterSlug = useGameStore((state) => state.activeClusterSlug);

  // État local pour savoir si le texte est affiché
  const [isVisible, setIsVisible] = useState(false);
  // État pour stocker les données de la base de données
  const [databaseData, setDatabaseData] = useState([]);
  // État pour stocker la biographie du persona actif
  const [activeBio, setActiveBio] = useState("");
  // État pour stocker la thématique du persona actif
  const [activeThematic, setActiveThematic] = useState("");

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

  // Mettre à jour la biographie et la thématique lorsque le slug change
  useEffect(() => {
    if (activeClusterSlug && databaseData.length > 0) {
      const persona = databaseData.find((p) => p.slug === activeClusterSlug);
      if (persona) {
        setActiveBio(persona.biography);
        setActiveThematic(persona.thematic || "");
      } else {
        setActiveBio("");
        setActiveThematic("");
      }
    } else {
      setActiveBio("");
      setActiveThematic("");
    }
  }, [activeClusterSlug, databaseData]);

  // Effet pour animer l'apparition/disparition du panel
  useEffect(() => {
    if (activeClusterId && activeClusterName) {
      setIsVisible(true);
    } else {
      // Disparition immédiate au lieu d'attendre
      setIsVisible(false);
    }
  }, [activeClusterId, activeClusterName]);

  // Pas de texte à afficher, on cache le panel
  if (!isVisible || !activeClusterName) {
    return null;
  }

  return (
    <div className="text-panel">
      <div className="text-panel-content">
        <TextScramble
          text={activeClusterName || ""}
          className="text-panel-text"
          speed={0.6}
        />
        {activeThematic && (
          <TextScramble
            text={activeThematic}
            className="text-panel-thematic"
            speed={0.4}
          />
        )}
        {activeBio && (
          <TextScramble
            text={activeBio}
            className="text-panel-bio"
            speed={0.3}
          />
        )}
      </div>
    </div>
  );
});

TextPanel.displayName = "TextPanel";

export default TextPanel;
