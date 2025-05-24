import { useEffect, useRef } from "react";
import useGameStore from "./store";
import useCollisionStore, {
  CollisionLayers,
} from "./services/CollisionService";

/**
 * Gestionnaire d'état de jeu qui configure les collisions en fonction
 * de l'état actuel du jeu (navigation, exploration, dialogue, etc.)
 */
const GameStateManager = ({ debugMode = false }) => {
  // Accéder au service de collision
  const collisionService = useCollisionStore();

  // Accéder au store du jeu
  const {
    activeClusterId,
    activeNodeId,
    activeInteractiveElementId,
    activeDialogue,
    isInMenuMode,
    isInCutscene,
  } = useGameStore();

  // Référence pour le dernier état connu
  const lastStateRef = useRef({
    activeClusterId: null,
    activeNodeId: null,
    activeInteractiveElementId: null,
    activeDialogue: null,
    isInMenuMode: false,
    isInCutscene: false,
    debugMode: false,
  });

  // Déterminer l'état actuel du jeu
  const isExploringCluster = activeClusterId !== null;
  const isInteractingWithNode = activeNodeId !== null;
  const isInteractingWithElement = activeInteractiveElementId !== null;
  const isInDialogue = activeDialogue !== null;

  // Configuration des collisions en fonction de l'état du jeu
  useEffect(() => {
    // Vérifier si l'état a réellement changé pour éviter les mises à jour inutiles
    const lastState = lastStateRef.current;
    const currentState = {
      activeClusterId,
      activeNodeId,
      activeInteractiveElementId,
      activeDialogue,
      isInMenuMode,
      isInCutscene,
      debugMode,
    };

    // Vérifier si l'état est identique au précédent
    const stateChanged =
      lastState.activeClusterId !== activeClusterId ||
      lastState.activeNodeId !== activeNodeId ||
      lastState.activeInteractiveElementId !== activeInteractiveElementId ||
      lastState.activeDialogue !== activeDialogue ||
      lastState.isInMenuMode !== isInMenuMode ||
      lastState.isInCutscene !== isInCutscene ||
      lastState.debugMode !== debugMode;

    // Si rien n'a changé, ne pas mettre à jour
    if (!stateChanged) return;

    // Mettre à jour la référence
    lastStateRef.current = currentState;

    if (debugMode) {
      console.log(
        "GameStateManager: Configuring collision layers for current state",
        {
          isExploringCluster,
          isInteractingWithNode,
          isInteractingWithElement,
          isInDialogue,
          isInMenuMode,
          isInCutscene,
        }
      );
    }

    // État 1: Mode menu ou cutscene - Désactiver toutes les collisions
    if (isInMenuMode || isInCutscene) {
      collisionService.setCollisionMask(CollisionLayers.NONE);
      return;
    }

    // État 2: En dialogue - N'autoriser que les collisions interactives de l'UI
    if (isInDialogue) {
      collisionService.setCollisionMask(CollisionLayers.UI_ONLY);
      return;
    }

    // État 3: Explorer un cluster - Activer les nœuds, désactiver les clusters
    if (isExploringCluster) {
      // Utiliser le préréglage EXPLORATION (nodes + clusters)
      // mais désactiver les collisions avec les autres clusters
      collisionService.setCollisionMask(CollisionLayers.EXPLORATION);
      return;
    }

    // État 4: Navigation normale - Tout activer sauf les nœuds
    collisionService.setCollisionMask(
      CollisionLayers.createMask(
        CollisionLayers.CLUSTERS,
        CollisionLayers.INTERACTIVE,
        CollisionLayers.DEFAULT
      )
    );
  }, [
    activeClusterId,
    activeNodeId,
    activeInteractiveElementId,
    activeDialogue,
    isInMenuMode,
    isInCutscene,
    isExploringCluster,
    isInteractingWithNode,
    isInteractingWithElement,
    isInDialogue,
    debugMode,
    collisionService,
  ]);

  return null; // Ce composant ne rend rien visuellement
};

export default GameStateManager;
