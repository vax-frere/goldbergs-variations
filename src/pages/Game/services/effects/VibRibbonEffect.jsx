import React, { memo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";

/**
 * Effet visuel style Vib Ribbon
 * Rayons circulaires qui partent du centre vers l'extérieur
 */
export class VibRibbonEffect {
  constructor() {
    this.id = null;
    this.position = { x: 0, y: 0, z: 0 };
    this.config = null;
    this.startTime = 0;
    this.progress = 0;
    this.isActive = false;
    this.onComplete = null;

    // Propriétés spécifiques aux rayons
    this.rays = [];
    this.currentScale = 1;
    this.currentOpacity = 1;
  }

  // Configuration par défaut pour l'effet vib ribbon
  static getDefaultConfig() {
    return {
      duration: 0.4, // Plus rapide
      maxScale: 3.0,
      color: [1.0, 1.0, 1.0], // Blanc pur
      opacity: 0.8,
      rayCount: 12, // Nombre de rayons (comme une horloge)
      rayLength: 1.0, // Longueur maximale des rayons
      rayWidth: 0.1, // Largeur des rayons
      rayInnerRadius: 3.6, // Distance du centre où commencent les rayons (augmentée)
      animationOffset: 0.3, // Décalage d'animation entre les rayons
      randomFactor: 0.5, // Facteur de variation aléatoire (0 = pas de variation, 1 = variation maximale)
      randomSeed: Math.random(), // Seed aléatoire pour que chaque trigger soit différent
    };
  }

  // Initialiser l'effet
  initialize(position, config = {}, onComplete = null) {
    this.position = { ...position };

    // Générer un nouveau seed aléatoire si pas fourni dans la config
    const configWithRandomSeed = {
      ...VibRibbonEffect.getDefaultConfig(),
      ...config,
    };

    // Forcer un nouveau seed à chaque initialisation pour avoir des variations différentes
    if (!config.randomSeed) {
      configWithRandomSeed.randomSeed = Math.random();
    }

    this.config = configWithRandomSeed;
    this.startTime = performance.now();
    this.progress = 0;
    this.isActive = true;
    this.onComplete = onComplete;

    // Initialiser les rayons
    this.initializeRays();

    return this;
  }

  // Créer les rayons
  initializeRays() {
    this.rays = [];
    const rayCount = this.config.rayCount;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;

      // Générer des variations aléatoires uniques pour ce rayon
      // Utiliser le seed + index pour avoir des valeurs reproductibles mais différentes
      const rayRandomSeed = this.config.randomSeed + i * 0.1;
      const randomAngleOffset =
        (this.seededRandom(rayRandomSeed) - 0.5) *
        this.config.randomFactor *
        0.5; // Variation d'angle
      const randomInnerOffset =
        (this.seededRandom(rayRandomSeed + 0.33) - 0.5) *
        this.config.randomFactor *
        0.4; // Variation rayon interne
      const randomLengthOffset =
        (this.seededRandom(rayRandomSeed + 0.66) - 0.5) *
        this.config.randomFactor *
        0.6; // Variation longueur

      this.rays.push({
        angle: angle,
        startDelay: (i * this.config.animationOffset) / rayCount, // Délai échelonné
        currentLength: 0,
        currentWidth: this.config.rayWidth,
        opacity: 1,
        // Variations aléatoires pour ce rayon
        randomAngleOffset: randomAngleOffset,
        randomInnerOffset: randomInnerOffset,
        randomLengthOffset: randomLengthOffset,
        // Positions calculées
        startPos: { x: 0, y: 0, z: 0 },
        endPos: { x: 0, y: 0, z: 0 },
      });
    }
  }

  // Mettre à jour l'effet
  update(deltaTime) {
    if (!this.isActive) return false;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    this.progress = Math.min(elapsed / (this.config.duration * 1000), 1.0);

    // Propriétés globales
    this.currentScale = 1 + this.progress * (this.config.maxScale - 1);
    this.currentOpacity = this.config.opacity * (1 - this.progress); // Fade out linéaire

    // Mettre à jour chaque rayon
    this.updateRays();

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

  // Mettre à jour les rayons
  updateRays() {
    this.rays.forEach((ray) => {
      // Calculer le progrès de ce rayon avec son délai
      const rayProgress = Math.max(0, this.progress - ray.startDelay);

      if (rayProgress <= 0) {
        ray.currentLength = 0;
        ray.opacity = 0;
        return;
      }

      // Animation du rayon : expansion rapide puis fade
      const expansionProgress = Math.min(rayProgress * 2, 1); // Expansion sur la première moitié
      const fadeProgress = Math.max(0, rayProgress - 0.5) * 2; // Fade sur la seconde moitié

      // Longueur du rayon avec easing
      const easedExpansion = this.easeOutQuart(expansionProgress);
      ray.currentLength =
        easedExpansion * this.config.rayLength * this.currentScale;

      // Opacité du rayon
      ray.opacity = this.currentOpacity * (1 - fadeProgress);

      // Largeur du rayon (légère variation)
      ray.currentWidth =
        this.config.rayWidth * (1 + Math.sin(rayProgress * Math.PI) * 0.3);

      // Calculer les positions du rayon
      const cos = Math.cos(ray.angle);
      const sin = Math.sin(ray.angle);

      // Rayon interne et externe avec variations aléatoires
      const baseInnerRadius = this.config.rayInnerRadius * this.currentScale;
      const baseLengthWithVariation =
        ray.currentLength * (1 + ray.randomLengthOffset);

      // Appliquer les variations aléatoires
      const adjustedAngle = ray.angle + ray.randomAngleOffset;
      const adjustedInnerRadius = baseInnerRadius * (1 + ray.randomInnerOffset);
      const adjustedCos = Math.cos(adjustedAngle);
      const adjustedSin = Math.sin(adjustedAngle);

      const outerRadius = adjustedInnerRadius + baseLengthWithVariation;

      // Position de départ (rayon interne avec variation)
      ray.startPos = {
        x: this.position.x + adjustedCos * adjustedInnerRadius,
        y: this.position.y + adjustedSin * adjustedInnerRadius,
        z: this.position.z,
      };

      // Position de fin (extérieur avec variation)
      ray.endPos = {
        x: this.position.x + adjustedCos * outerRadius,
        y: this.position.y + adjustedSin * outerRadius,
        z: this.position.z,
      };
    });
  }

  // Fonction d'easing
  easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
  }

  // Générateur de nombres pseudo-aléatoires avec seed
  // Utilise un algorithme simple mais efficace pour avoir des résultats reproductibles
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Réinitialiser l'effet pour réutilisation
  reset() {
    this.id = null;
    this.isActive = false;
    this.progress = 0;
    this.onComplete = null;
    this.currentScale = 1;
    this.currentOpacity = 1;
    this.rays = [];
  }

  // Obtenir les données pour le rendu
  getRenderData() {
    if (!this.isActive) return null;

    return {
      id: this.id,
      type: "vib-ribbon",
      position: this.position,
      rays: this.rays.filter(
        (ray) => ray.opacity > 0.01 && ray.currentLength > 0
      ),
      globalScale: this.currentScale,
      globalOpacity: this.currentOpacity,
      progress: this.progress,
    };
  }
}

/**
 * Composant React pour le rendu de l'effet Vib Ribbon
 */
export const VibRibbonEffectRenderer = memo(({ effectData }) => {
  const groupRef = useRef();

  return (
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
      position={[
        effectData.position.x,
        effectData.position.y,
        effectData.position.z,
      ]}
    >
      <group ref={groupRef}>
        {effectData.rays.map((ray, index) => {
          // Calculer la direction et la longueur du rayon
          const direction = {
            x: ray.endPos.x - ray.startPos.x,
            y: ray.endPos.y - ray.startPos.y,
            z: ray.endPos.z - ray.startPos.z,
          };

          // Position au milieu du rayon (entre startPos et endPos)
          // Convertir en coordonnées relatives au centre de l'effet
          const midPosition = {
            x: ray.startPos.x + direction.x * 0.5 - effectData.position.x,
            y: ray.startPos.y + direction.y * 0.5 - effectData.position.y,
            z: ray.startPos.z + direction.z * 0.5 - effectData.position.z,
          };

          // Calculer la longueur du rayon
          const length = Math.sqrt(
            direction.x * direction.x +
              direction.y * direction.y +
              direction.z * direction.z
          );

          // Calculer l'angle du rayon dans le plan 2D (puisqu'on est dans un billboard)
          const angle = Math.atan2(direction.y, direction.x);

          return (
            <mesh
              key={index}
              position={[midPosition.x, midPosition.y, 0]} // Z=0 car on est dans un billboard
              rotation={[0, 0, angle]} // Rotation autour de Z pour orienter le rayon
              renderOrder={100 + index}
            >
              {/* Utiliser un plane simple orienté le long de l'axe X */}
              <planeGeometry args={[length, ray.currentWidth * 2]} />
              <meshBasicMaterial
                transparent={true}
                opacity={ray.opacity}
                color={new THREE.Color(1, 1, 1)} // Blanc pur
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
      </group>
    </Billboard>
  );
});

VibRibbonEffectRenderer.displayName = "VibRibbonEffectRenderer";

export default VibRibbonEffect;
