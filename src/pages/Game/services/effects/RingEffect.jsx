import React, { memo, useRef, useEffect } from "react";
import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Effet visuel d'anneau expansif simple
 * Basé sur l'ancien NodeHoverEffect
 */
export class RingEffect {
  constructor() {
    this.id = null;
    this.position = { x: 0, y: 0, z: 0 };
    this.config = null;
    this.startTime = 0;
    this.progress = 0;
    this.isActive = false;
    this.onComplete = null;

    // Propriétés d'animation calculées
    this.currentScale = 1;
    this.currentOpacity = 1;
    this.currentColor = [1, 1, 1];
    this.currentThickness = 0.1;
  }

  // Configuration par défaut pour l'effet d'anneau
  static getDefaultConfig() {
    return {
      duration: 0.8,
      maxScale: 6.0,
      color: [1.0, 1.0, 1.0],
      opacity: 0.6,
      minThickness: 0.3,
      maxThickness: 0.1,
    };
  }

  // Initialiser l'effet
  initialize(position, config = {}, onComplete = null) {
    this.position = { ...position };
    this.config = {
      ...RingEffect.getDefaultConfig(),
      ...config,
    };
    this.startTime = performance.now();
    this.progress = 0;
    this.isActive = true;
    this.onComplete = onComplete;

    return this;
  }

  // Mettre à jour l'effet
  update(deltaTime) {
    if (!this.isActive) return false;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    this.progress = Math.min(elapsed / (this.config.duration * 1000), 1.0);

    // Appliquer l'easing (easeOutCubic comme NodeHoverEffect)
    const easedProgress = this.easeOutCubic(this.progress);

    // Calculer les propriétés d'animation dans le style NodeHoverEffect
    this.updateProperties(easedProgress);

    // Vérifier si l'effet est terminé
    if (this.progress >= 1.0) {
      this.isActive = false;
      if (this.onComplete) {
        this.onComplete(this);
      }
      return false;
    }

    return true;
  }

  updateProperties(easedProgress) {
    const config = this.config;

    // Style NodeHoverEffect : échelle qui augmente avec easing
    this.currentScale = 1 + easedProgress * (config.maxScale - 1);

    // Opacité qui diminue avec easeInQuad (comme NodeHoverEffect)
    const opacityProgress = this.progress * this.progress; // easeInQuad
    this.currentOpacity = config.opacity * (1 - opacityProgress);

    // Épaisseur qui diminue progressivement
    this.currentThickness =
      config.minThickness +
      this.progress * (config.maxThickness - config.minThickness);

    // Couleur
    this.currentColor = [...config.color];
  }

  easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  // Réinitialiser l'effet pour réutilisation
  reset() {
    this.id = null;
    this.isActive = false;
    this.progress = 0;
    this.onComplete = null;
    this.currentScale = 1;
    this.currentOpacity = 1;
    this.currentColor = [1, 1, 1];
    this.currentThickness = 0.1;
  }

  // Obtenir les données pour le rendu
  getRenderData() {
    if (!this.isActive) return null;

    return {
      id: this.id,
      type: "ring",
      position: this.position,
      scale: this.currentScale,
      opacity: this.currentOpacity,
      color: this.currentColor,
      thickness: this.currentThickness,
      progress: this.progress,
    };
  }
}

/**
 * Composant React pour le rendu de l'effet d'anneau
 */
export const RingEffectRenderer = memo(({ effectData }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const geometryRef = useRef();

  // Mettre à jour l'anneau en temps réel
  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;

    // Mettre à jour l'échelle
    meshRef.current.scale.setScalar(effectData.scale);

    // Mettre à jour l'opacité
    materialRef.current.opacity = effectData.opacity;

    // Mettre à jour l'épaisseur de l'anneau
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }

    const innerRadius = Math.max(0, 1.0 - effectData.thickness);
    geometryRef.current = new THREE.RingGeometry(innerRadius, 1.0, 32);
    meshRef.current.geometry = geometryRef.current;

    // Mettre à jour la couleur
    materialRef.current.color.setRGB(
      effectData.color[0],
      effectData.color[1],
      effectData.color[2]
    );
  });

  // Nettoyer la géométrie au démontage
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
    };
  }, []);

  return (
    <group
      position={[
        effectData.position.x,
        effectData.position.y,
        effectData.position.z,
      ]}
    >
      <Billboard follow={true}>
        <mesh ref={meshRef} renderOrder={100}>
          <ringGeometry args={[0.7, 1.0, 32]} ref={geometryRef} />
          <meshBasicMaterial
            ref={materialRef}
            transparent={true}
            opacity={effectData.opacity}
            color={
              new THREE.Color(
                effectData.color[0],
                effectData.color[1],
                effectData.color[2]
              )
            }
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Billboard>
    </group>
  );
});

RingEffectRenderer.displayName = "RingEffectRenderer";

export default RingEffect;
