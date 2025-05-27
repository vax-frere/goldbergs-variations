/**
 * Index des effets visuels disponibles
 */

import {
  VibRibbonEffect,
  VibRibbonEffectRenderer,
} from "./VibRibbonEffect.jsx";
import { RingEffect, RingEffectRenderer } from "./RingEffect.jsx";
import {
  MusicNotesEffect,
  MusicNotesEffectRenderer,
} from "./MusicNotesEffect.jsx";

// Re-export des classes d'effets pour l'utilisation externe
export { VibRibbonEffect, RingEffect, MusicNotesEffect };

// Re-export des composants de rendu
export {
  VibRibbonEffectRenderer,
  RingEffectRenderer,
  MusicNotesEffectRenderer,
};

// Types d'effets disponibles
export const EFFECT_TYPES = {
  VIB_RIBBON: "vib-ribbon",
  RING: "ring",
  MUSIC_NOTES: "music-notes",
};

// Factory pour créer les effets
export const createEffect = (type) => {
  switch (type) {
    case EFFECT_TYPES.VIB_RIBBON:
      return new VibRibbonEffect();
    case EFFECT_TYPES.RING:
      return new RingEffect();
    case EFFECT_TYPES.MUSIC_NOTES:
      return new MusicNotesEffect();
    default:
      console.warn(
        `Type d'effet inconnu: ${type}, utilisation de l'effet par défaut (vib-ribbon)`
      );
      return new VibRibbonEffect();
  }
};

// Factory pour créer les composants de rendu
export const createEffectRenderer = (effectData) => {
  switch (effectData.type) {
    case EFFECT_TYPES.VIB_RIBBON:
      return VibRibbonEffectRenderer;
    case EFFECT_TYPES.RING:
      return RingEffectRenderer;
    case EFFECT_TYPES.MUSIC_NOTES:
      return MusicNotesEffectRenderer;
    default:
      console.warn(`Type d'effet inconnu: ${effectData.type}`);
      return null;
  }
};

export default {
  VibRibbonEffect,
  RingEffect,
  MusicNotesEffect,
  VibRibbonEffectRenderer,
  RingEffectRenderer,
  MusicNotesEffectRenderer,
  EFFECT_TYPES,
  createEffect,
  createEffectRenderer,
};
