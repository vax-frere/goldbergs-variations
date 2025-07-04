import React, { memo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import useEffectStore, {
  createEffectRenderer,
} from "../services/EffectService";

/**
 * Composant générique pour un effet visuel
 */
const EffectInstance = memo(({ effectData }) => {
  // Obtenir le bon composant de rendu selon le type d'effet
  const EffectRendererComponent = createEffectRenderer(effectData);

  if (!EffectRendererComponent) {
    console.warn(`Aucun renderer trouvé pour l'effet: ${effectData.type}`);
    return null;
  }

  return <EffectRendererComponent effectData={effectData} />;
});

EffectInstance.displayName = "EffectInstance";

/**
 * Composant principal pour le rendu de tous les effets
 * Gère la mise à jour du système d'effets et le rendu
 */
const EffectRenderer = memo(() => {
  const updateEffects = useEffectStore((state) => state.updateEffects);
  const activeEffects = useEffectStore((state) => state.activeEffects);

  // Mettre à jour le système d'effets à chaque frame
  useFrame((_, deltaTime) => {
    updateEffects(deltaTime);
  });

  // Debug: afficher les effets actifs (désactivé pour éviter le spam)
  // useEffect(() => {
  //   if (activeEffects.length > 0) {
  //     console.log("[EffectRenderer] Active effects:", activeEffects.length);
  //     activeEffects.forEach((effect, index) => {
  //       console.log(`Effect ${index}:`, {
  //         id: effect.id,
  //         type: effect.type,
  //         progress: effect.progress,
  //         position: effect.position,
  //       });
  //     });
  //   }
  // }, [activeEffects]);

  // Ne rien rendre s'il n'y a pas d'effets actifs
  if (activeEffects.length === 0) {
    return null;
  }

  return (
    <group name="effect-renderer">
      {activeEffects.map((effectData) => (
        <EffectInstance key={effectData.id} effectData={effectData} />
      ))}
    </group>
  );
});

EffectRenderer.displayName = "EffectRenderer";

export default EffectRenderer;
