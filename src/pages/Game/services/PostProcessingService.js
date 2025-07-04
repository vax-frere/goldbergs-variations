import { create } from "zustand";

// Configuration par défaut
const DEFAULT_CONFIG = {
  bloom: {
    intensity: 0.15,
    luminanceThreshold: 0.4,
    luminanceSmoothing: 0.9,
  },
  toneMapping: {
    exposure: 1,
    contrast: 1,
  },
  glitch: {
    active: false,
    strength: [0.1, 0.2],
    duration: 0.5,
  },
  noise: {
    active: true,
    intensity: 0,
    speed: 1,
  },
};

// Fonction d'interpolation
const lerp = (start, end, t) => start * (1 - t) + end * t;

// Fonction d'easing
const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Store Zustand pour le post-processing
const usePostProcessingStore = create((set, get) => ({
  config: DEFAULT_CONFIG,
  activePreset: "NORMAL",

  // Appliquer un effet temporaire
  applyTemporaryEffect: (effectName, duration = 1000) => {
    const originalConfig = { ...get().config };
    let newConfig;

    switch (effectName) {
      case "bloom":
        // Animation du bloom
        const startIntensity = originalConfig.bloom.intensity;
        const targetIntensity = startIntensity * 3;
        const steps = 40; // Plus d'étapes pour une animation plus fluide
        const stepDuration = duration / steps;
        let currentStep = 0;

        const bloomInterval = setInterval(() => {
          if (currentStep >= steps) {
            clearInterval(bloomInterval);
            return;
          }

          const progress = currentStep / steps;
          // Animation complète : montée puis descente
          const t = progress < 0.5 
            ? easeInOutQuad(progress * 2) // Montée
            : easeInOutQuad(1 - (progress - 0.5) * 2); // Descente
          
          const currentIntensity = lerp(startIntensity, targetIntensity, t);
          
          set({
            config: {
              ...originalConfig,
              bloom: {
                ...originalConfig.bloom,
                intensity: currentIntensity,
              },
            },
          });

          currentStep++;
        }, stepDuration);
        return;

      case "glitch":
        newConfig = {
          ...originalConfig,
          glitch: {
            active: true,
            strength: [0.5, 0.8],
            duration: 0.5,
          },
        };
        break;

      case "noise":
        // Animation du noise
        const startNoise = 0;
        const targetNoise = 0.5;
        const noiseSteps = 30;
        const noiseStepDuration = duration / noiseSteps;
        let noiseStep = 0;

        const noiseInterval = setInterval(() => {
          if (noiseStep >= noiseSteps) {
            clearInterval(noiseInterval);
            set({
              config: {
                ...originalConfig,
                noise: {
                  ...originalConfig.noise,
                  active: false,
                  intensity: 0,
                },
              },
            });
            return;
          }

          const progress = noiseStep / noiseSteps;
          const t = progress < 0.5 
            ? easeInOutQuad(progress * 2) // Montée
            : easeInOutQuad(1 - (progress - 0.5) * 2); // Descente
          
          const currentIntensity = lerp(startNoise, targetNoise, t);
          
          set({
            config: {
              ...originalConfig,
              noise: {
                ...originalConfig.noise,
                active: true,
                intensity: currentIntensity,
                speed: 1 + currentIntensity * 2, // La vitesse augmente avec l'intensité
              },
            },
          });

          noiseStep++;
        }, noiseStepDuration);
        return;

      case "toneMapping":
        newConfig = {
          ...originalConfig,
          toneMapping: {
            ...originalConfig.toneMapping,
            exposure: originalConfig.toneMapping.exposure * 2,
            contrast: originalConfig.toneMapping.contrast * 1.5,
          },
        };
        break;

      default:
        return;
    }

    // Appliquer l'effet temporaire
    set({ config: newConfig });

    // Restaurer la configuration originale après la durée spécifiée
    setTimeout(() => {
      set({ config: originalConfig });
    }, duration);
  },
}));

export default usePostProcessingStore; 