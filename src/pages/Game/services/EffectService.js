/**
 * Service de gestion des effets visuels refactorisé
 * Utilise des effets externalisés avec support pour différents types
 */
import { create } from "zustand";
import {
  createEffect,
  createEffectRenderer,
  EFFECT_TYPES,
} from "./effects/index.js";

// Pool d'effets refactorisé
class EffectPool {
  constructor(size = 15, defaultEffectType = EFFECT_TYPES.VIB_RIBBON) {
    this.pool = new Map(); // Pool séparé par type d'effet
    this.activeEffects = new Map();
    this.nextId = 0;
    this.defaultEffectType = defaultEffectType;

    // Initialiser les pools pour chaque type d'effet
    Object.values(EFFECT_TYPES).forEach((type) => {
      this.pool.set(type, []);
      // Pré-créer quelques effets de chaque type
      for (
        let i = 0;
        i < Math.ceil(size / Object.keys(EFFECT_TYPES).length);
        i++
      ) {
        this.pool.get(type).push(createEffect(type));
      }
    });
  }

  // Récupérer un effet du pool
  acquire(effectType = this.defaultEffectType) {
    const typePool = this.pool.get(effectType);
    if (typePool && typePool.length > 0) {
      return typePool.pop();
    }
    // Créer un nouvel effet si le pool est vide
    return createEffect(effectType);
  }

  // Remettre un effet dans le pool
  release(effect) {
    if (!effect.getRenderData) return; // Vérification de sécurité

    const renderData = effect.getRenderData();
    const effectType = renderData ? renderData.type : this.defaultEffectType;

    effect.reset();

    const typePool = this.pool.get(effectType);
    if (typePool) {
      typePool.push(effect);
    }
  }

  // Créer un nouvel effet
  spawn(
    position,
    config = {},
    effectType = this.defaultEffectType,
    onComplete = null
  ) {
    const effect = this.acquire(effectType);

    effect.id = `effect_${this.nextId++}`;
    effect.initialize(position, config, onComplete);

    this.activeEffects.set(effect.id, effect);
    return effect;
  }

  // Mettre à jour tous les effets actifs
  update(deltaTime) {
    const effectsToRemove = [];

    this.activeEffects.forEach((effect) => {
      const isStillActive = effect.update(deltaTime);

      if (!isStillActive) {
        effectsToRemove.push(effect.id);
      }
    });

    // Nettoyer les effets terminés
    effectsToRemove.forEach((id) => {
      const effect = this.activeEffects.get(id);
      this.activeEffects.delete(id);
      this.release(effect);
    });
  }

  // Obtenir tous les effets actifs avec leurs données de rendu
  getActiveEffects() {
    return Array.from(this.activeEffects.values())
      .map((effect) => effect.getRenderData())
      .filter((data) => data !== null);
  }

  // Nettoyer tous les effets
  clear() {
    this.activeEffects.forEach((effect) => {
      this.release(effect);
    });
    this.activeEffects.clear();
  }

  // Changer le type d'effet par défaut
  setDefaultEffectType(effectType) {
    if (Object.values(EFFECT_TYPES).includes(effectType)) {
      this.defaultEffectType = effectType;
    } else {
      console.warn(`Type d'effet invalide: ${effectType}`);
    }
  }
}

// Store Zustand refactorisé
const useEffectStore = create((set, get) => ({
  // Instance du pool d'effets
  effectPool: new EffectPool(20, EFFECT_TYPES.VIB_RIBBON),

  // Effets actifs (pour le rendu React)
  activeEffects: [],

  // Type d'effet par défaut
  defaultEffectType: EFFECT_TYPES.VIB_RIBBON,

  // Dernière mise à jour
  lastUpdateTime: 0,

  /**
   * Déclencher un nouvel effet
   * @param {Object} position - Position {x, y, z}
   * @param {Object} config - Configuration personnalisée
   * @param {string} effectType - Type d'effet (optionnel)
   * @param {Function} onComplete - Callback de fin d'animation
   */
  triggerEffect: (
    position,
    config = {},
    effectType = null,
    onComplete = null
  ) => {
    const state = get();
    const typeToUse = effectType || state.defaultEffectType;
    const effect = state.effectPool.spawn(
      position,
      config,
      typeToUse,
      onComplete
    );

    // Mettre à jour la liste des effets actifs pour React
    set({ activeEffects: state.effectPool.getActiveEffects() });

    return effect.id;
  },

  /**
   * Déclencher un effet vib ribbon spécifiquement
   * @param {Object} position - Position {x, y, z}
   * @param {Object} config - Configuration personnalisée
   * @param {Function} onComplete - Callback de fin d'animation
   */
  triggerVibRibbonEffect: (position, config = {}, onComplete = null) => {
    const { triggerEffect } = get();
    return triggerEffect(position, config, EFFECT_TYPES.VIB_RIBBON, onComplete);
  },

  /**
   * Déclencher un effet d'anneau spécifiquement
   * @param {Object} position - Position {x, y, z}
   * @param {Object} config - Configuration personnalisée
   * @param {Function} onComplete - Callback de fin d'animation
   */
  triggerRingEffect: (position, config = {}, onComplete = null) => {
    const { triggerEffect } = get();
    return triggerEffect(position, config, EFFECT_TYPES.RING, onComplete);
  },

  /**
   * Déclencher un effet de notes de musique spécifiquement
   * @param {Object} position - Position {x, y, z}
   * @param {Object} config - Configuration personnalisée
   * @param {Function} onComplete - Callback de fin d'animation
   */
  triggerMusicNotesEffect: (position, config = {}, onComplete = null) => {
    const { triggerEffect } = get();
    return triggerEffect(
      position,
      config,
      EFFECT_TYPES.MUSIC_NOTES,
      onComplete
    );
  },

  /**
   * Changer le type d'effet par défaut
   * @param {string} effectType - Nouveau type d'effet par défaut
   */
  setDefaultEffectType: (effectType) => {
    const state = get();
    state.effectPool.setDefaultEffectType(effectType);
    set({ defaultEffectType: effectType });
  },

  /**
   * Mettre à jour tous les effets (appelé depuis useFrame)
   * @param {number} deltaTime - Temps écoulé depuis la dernière frame
   */
  updateEffects: (deltaTime) => {
    const state = get();
    const currentTime = performance.now();

    // Mettre à jour le pool d'effets
    state.effectPool.update(deltaTime);

    // Toujours mettre à jour la liste pour React pour s'assurer que les changements sont visibles
    const newActiveEffects = state.effectPool.getActiveEffects();

    // Forcer la mise à jour si il y a des effets actifs
    if (newActiveEffects.length > 0 || state.activeEffects.length > 0) {
      set({
        activeEffects: [...newActiveEffects], // Créer un nouveau tableau pour forcer le re-render
        lastUpdateTime: currentTime,
      });
    }
  },

  /**
   * Nettoyer tous les effets
   */
  clearAllEffects: () => {
    const state = get();
    state.effectPool.clear();
    set({ activeEffects: [] });
  },

  /**
   * Arrêter un effet spécifique par son ID
   * @param {string} effectId - ID de l'effet à arrêter
   */
  stopEffect: (effectId) => {
    const state = get();
    const effect = state.effectPool.activeEffects.get(effectId);

    if (effect) {
      // Marquer l'effet comme inactif pour qu'il soit nettoyé au prochain update
      effect.isActive = false;
      console.log(`[EffectService] Arrêt de l'effet ${effectId}`);

      // Forcer une mise à jour immédiate
      state.effectPool.update(0);
      set({ activeEffects: state.effectPool.getActiveEffects() });

      return true;
    }

    console.warn(`[EffectService] Effet ${effectId} non trouvé pour arrêt`);
    return false;
  },
}));

// Exporter aussi les types d'effets pour faciliter l'utilisation
export { EFFECT_TYPES, createEffectRenderer };
export default useEffectStore;
