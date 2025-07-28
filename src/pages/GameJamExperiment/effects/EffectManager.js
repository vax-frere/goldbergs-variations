import { IEffect } from '../core/interfaces';
import { NoiseEffect } from './NoiseEffect';

export class EffectManager {
  constructor(scene) {
    this.scene = scene;
    this.activeEffects = new Map();
    this.effectQueue = [];
    this.nextEffectId = 0;
    
    // Préparer les effets
    this.noiseEffect = new NoiseEffect(scene);
  }

  // Ajouter un effet
  addEffect(effect, target = null) {
    const effectId = this.nextEffectId++;
    const effectData = {
      id: effectId,
      effect: effect,
      target: target,
      startTime: Date.now()
    };
    
    this.activeEffects.set(effectId, effectData);
    
    // Appliquer l'effet
    if (effect.apply) {
      effect.apply(target);
    }
    
    return effectId;
  }

  // Supprimer un effet
  removeEffect(effectId) {
    const effectData = this.activeEffects.get(effectId);
    if (!effectData) return false;
    
    const { effect, target } = effectData;
    
    // Supprimer l'effet
    if (effect.remove) {
      effect.remove(target);
    }
    
    this.activeEffects.delete(effectId);
    return true;
  }

  // Appliquer l'effet de bruit
  applyNoiseEffect(intensity = 1.0, duration = 2000) {
    this.noiseEffect.setIntensity(intensity);
    this.noiseEffect.setDuration(duration);
    return this.addEffect(this.noiseEffect);
  }

  // Appliquer un effet de tremblement d'écran
  applyScreenShake(intensity = 5, duration = 500) {
    const shakeEffect = {
      apply: () => {
        this.scene.cameras.main.shake(duration, intensity);
      },
      remove: () => {
        // Le shake se termine automatiquement
      },
      isFinished: () => {
        return !this.scene.cameras.main.isShaking;
      }
    };
    
    return this.addEffect(shakeEffect);
  }

  // Appliquer un effet de flash
  applyFlash(color = 0xffffff, duration = 200) {
    const flashEffect = {
      apply: () => {
        this.scene.cameras.main.flash(duration, color);
      },
      remove: () => {
        // Le flash se termine automatiquement
      },
      isFinished: () => {
        return !this.scene.cameras.main.isFlashing;
      }
    };
    
    return this.addEffect(flashEffect);
  }

  // Appliquer un effet de distorsion sur une entité
  applyEntityDistortion(entity, intensity = 0.1, duration = 1000) {
    const distortionEffect = {
      originalScale: { x: entity.sprite.scaleX, y: entity.sprite.scaleY },
      timer: 0,
      maxDuration: duration,
      
      apply: (target) => {
        // Commencer la distorsion
        this.distortionTween = this.scene.tweens.add({
          targets: target.sprite,
          scaleX: this.originalScale.x + intensity,
          scaleY: this.originalScale.y + intensity,
          duration: duration / 4,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut'
        });
      },
      
      remove: (target) => {
        if (this.distortionTween) {
          this.distortionTween.stop();
        }
        target.sprite.setScale(this.originalScale.x, this.originalScale.y);
      },
      
      update: (delta) => {
        this.timer += delta;
      },
      
      isFinished: () => {
        return this.timer >= this.maxDuration;
      }
    };
    
    return this.addEffect(distortionEffect, entity);
  }

  // Appliquer un effet de particules
  applyParticleEffect(x, y, particleConfig = {}) {
    const defaultConfig = {
      key: 'particle',
      quantity: 10,
      scale: { start: 0.5, end: 0 },
      speed: { min: 50, max: 100 },
      blendMode: 'ADD',
      lifespan: 1000
    };
    
    const config = { ...defaultConfig, ...particleConfig };
    
    const particleEffect = {
      emitter: null,
      
      apply: () => {
        // Créer un émetteur de particules simple
        this.emitter = this.scene.add.particles(x, y, 'student', {
          scale: config.scale,
          speed: config.speed,
          blendMode: config.blendMode,
          lifespan: config.lifespan,
          quantity: config.quantity
        });
        
        // Émettre une fois
        this.emitter.explode(config.quantity);
      },
      
      remove: () => {
        if (this.emitter) {
          this.emitter.destroy();
          this.emitter = null;
        }
      },
      
      isFinished: () => {
        return !this.emitter || this.emitter.getAliveParticleCount() === 0;
      }
    };
    
    return this.addEffect(particleEffect);
  }

  // Mettre à jour tous les effets
  update(delta) {
    const effectsToRemove = [];
    
    for (const [effectId, effectData] of this.activeEffects) {
      const { effect, target } = effectData;
      
      // Mettre à jour l'effet s'il a une méthode update
      if (effect.update) {
        effect.update(delta);
      }
      
      // Vérifier si l'effet est terminé
      if (effect.isFinished && effect.isFinished()) {
        effectsToRemove.push(effectId);
      }
    }
    
    // Supprimer les effets terminés
    for (const effectId of effectsToRemove) {
      this.removeEffect(effectId);
    }
    
    // Mettre à jour l'effet de bruit
    this.noiseEffect.update(delta);
  }

  // Nettoyer tous les effets
  clear() {
    for (const [effectId, effectData] of this.activeEffects) {
      const { effect, target } = effectData;
      if (effect.remove) {
        effect.remove(target);
      }
    }
    
    this.activeEffects.clear();
    this.effectQueue = [];
    this.noiseEffect.clear();
  }

  // Obtenir les effets actifs
  getActiveEffects() {
    return Array.from(this.activeEffects.values());
  }

  // Vérifier si un effet est actif
  isEffectActive(effectId) {
    return this.activeEffects.has(effectId);
  }

  // Obtenir le nombre d'effets actifs
  getActiveEffectCount() {
    return this.activeEffects.size;
  }
} 