import React, { memo, useRef } from "react";
import { Billboard } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../hooks/useAssets";

/**
 * Effet visuel de notes de musique qui virevoltent
 * Affiche des notes de musique qui apparaissent, se déplacent et disparaissent
 * pour indiquer qu'un son est en train de se jouer
 */
export class MusicNotesEffect {
  constructor() {
    this.id = null;
    this.position = { x: 0, y: 0, z: 0 };
    this.config = null;
    this.startTime = 0;
    this.progress = 0;
    this.isActive = false;
    this.onComplete = null;

    // Propriétés spécifiques aux notes
    this.notes = [];
    this.lastNoteSpawnTime = 0;
    this.noteSpawnInterval = 0;
  }

  // Configuration par défaut pour l'effet de notes de musique
  static getDefaultConfig() {
    return {
      continuous: true, // Mode continu pour un effet sans interruption
      duration: 12.0, // Durée d'un cycle
      noteCount: 5, // 5 notes simultanées
      spawnInterval: 0.6, // Une nouvelle note toutes les 0.6 secondes
      noteLifetime: 4.0, // Chaque note vit 4 secondes
      movementRadius: 8.0, // Rayon de mouvement autour du centre
      movementSpeed: 3.0, // Vitesse de mouvement
      noteScale: 0.15, // Taille des notes
      opacity: 0.1,
      travelDistance: 120.0, // Distance totale que les notes doivent parcourir (plus grande)
      minScale: 24.0, // Taille minimale (même de très loin)
      maxScale: 64.0, // Taille maximale (de très près)
      scaleDistance: 50.0, // Distance de référence pour le calcul de l'échelle
      color: [1.0, 1.0, 1.0], // Blanc par défaut
      randomFactor: 0.7, // Facteur de variation aléatoire
      randomSeed: Math.random(),
    };
  }

  // Initialiser l'effet
  initialize(position, config = {}, onComplete = null) {
    this.position = { ...position };

    // Générer un nouveau seed aléatoire si pas fourni dans la config
    const configWithRandomSeed = {
      ...MusicNotesEffect.getDefaultConfig(),
      ...config,
    };

    if (!config.randomSeed) {
      configWithRandomSeed.randomSeed = Math.random();
    }

    this.config = configWithRandomSeed;
    this.startTime = performance.now();
    this.progress = 0;
    this.isActive = true;
    this.onComplete = onComplete;

    // Initialiser les propriétés de spawn
    this.notes = [];
    this.lastNoteSpawnTime = 0;
    this.noteSpawnInterval = this.config.spawnInterval * 1000; // Convertir en ms

    return this;
  }

  // Mettre à jour l'effet
  update(deltaTime) {
    if (!this.isActive) return false;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    this.progress = Math.min(elapsed / (this.config.duration * 1000), 1.0);

    // Spawner de nouvelles notes si nécessaire
    this.spawnNotesIfNeeded(currentTime);

    // Mettre à jour toutes les notes existantes
    this.updateNotes(deltaTime);

    // Nettoyer les notes expirées
    this.cleanupExpiredNotes(currentTime);

    // Vérifier si l'effet est terminé
    if (this.progress >= 1.0) {
      if (this.config.continuous) {
        // Mode continu : redémarrer le cycle sans interruption
        this.startTime = currentTime; // Redémarrer le timer
        this.progress = 0;
        // Ne pas appeler onComplete, continuer l'effet
        return true;
      } else {
        // Mode normal : terminer l'effet
        this.isActive = false;
        if (this.onComplete) {
          this.onComplete(this);
        }
        return false;
      }
    }

    return true;
  }

  // Spawner de nouvelles notes si nécessaire
  spawnNotesIfNeeded(currentTime) {
    // En mode continu, toujours essayer de spawner des notes
    // En mode normal, respecter la durée de l'effet
    const shouldSpawn = this.config.continuous || this.progress < 0.9;

    if (!shouldSpawn) return;

    // Vérifier si on peut spawner une nouvelle note
    const timeSinceLastSpawn = currentTime - this.lastNoteSpawnTime;
    const canSpawn =
      this.notes.length < this.config.noteCount &&
      timeSinceLastSpawn >= this.noteSpawnInterval;

    if (canSpawn) {
      this.spawnNote(currentTime);
      this.lastNoteSpawnTime = currentTime;
    }
  }

  // Créer une nouvelle note
  spawnNote(currentTime) {
    const noteIndex = this.notes.length;
    const seed =
      this.config.randomSeed + noteIndex * 0.1 + currentTime * 0.0001; // Ajouter le temps pour plus de variation

    // Choisir aléatoirement une des 3 notes de musique
    const noteTypes = [
      "music-note-1.svg",
      "music-note-2.svg",
      "music-note-3.svg",
    ];
    const noteType =
      noteTypes[Math.floor(this.seededRandom(seed) * noteTypes.length)];

    // Position de départ : toujours au centre de l'effet
    const startPosition = {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
    };

    // Direction principale : vers le haut et la droite avec plus de variation
    const baseAngle = Math.PI / 4; // 45 degrés (haut-droite)
    const angleVariation = (this.seededRandom(seed + 0.1) - 0.5) * 0.6; // Plus de variation pour des trajectoires différentes
    const finalAngle = baseAngle + angleVariation;

    // Calculer la vitesse avec plus de variation pour des trajectoires uniques
    const travelDistance =
      this.config.travelDistance * (0.6 + this.seededRandom(seed + 0.2) * 0.8); // Plus de variation dans la distance
    const noteLifetimeSeconds =
      this.config.noteLifetime * (0.8 + this.seededRandom(seed + 0.25) * 0.4); // Variation dans la durée de vie
    const requiredSpeed = travelDistance / noteLifetimeSeconds;

    // Vitesse finale avec plus de variation
    const speedVariation = 0.7 + this.seededRandom(seed + 0.3) * 0.6; // Variation de vitesse plus importante
    const finalSpeed =
      (requiredSpeed * this.config.movementSpeed * speedVariation) / 3.0;

    const velocity = {
      x: Math.cos(finalAngle) * finalSpeed,
      y: Math.sin(finalAngle) * finalSpeed,
      z: 0,
    };

    // Paramètres d'oscillation très variés pour des trajectoires uniques
    const oscillationAmplitude =
      (travelDistance / 80.0) * (0.5 + this.seededRandom(seed + 0.4) * 1.0); // Amplitude très variable
    const oscillationFrequency = 0.8 + this.seededRandom(seed + 0.5) * 2.0; // Fréquence très variable
    const oscillationPhase = this.seededRandom(seed + 0.6) * Math.PI * 2; // Phase aléatoire

    // Paramètres d'oscillation secondaire pour plus de complexité
    const secondaryOscillationAmplitude =
      oscillationAmplitude * (0.3 + this.seededRandom(seed + 0.7) * 0.4);
    const secondaryOscillationFrequency =
      oscillationFrequency * (1.5 + this.seededRandom(seed + 0.8) * 1.0);
    const secondaryOscillationPhase =
      this.seededRandom(seed + 0.9) * Math.PI * 2;

    // Rotation très réduite pour effet traînée de fumée (garder stable)
    const rotationSpeed = (this.seededRandom(seed + 1.0) - 0.5) * 0.15; // Rotation encore plus réduite

    const note = {
      id: `note_${noteIndex}_${currentTime}`,
      type: noteType,
      spawnTime: currentTime,
      lifetime: noteLifetimeSeconds * 1000, // Convertir en ms

      // Position
      startPosition: { ...startPosition },
      currentPosition: { ...startPosition },

      // Mouvement
      velocity: velocity,
      baseVelocity: { ...velocity }, // Garder la vitesse de base pour les calculs
      travelDistance: travelDistance, // Distance que cette note doit parcourir

      // Oscillation principale
      oscillationAmplitude: oscillationAmplitude,
      oscillationFrequency: oscillationFrequency,
      oscillationPhase: oscillationPhase,

      // Oscillation secondaire pour plus de complexité
      secondaryOscillationAmplitude: secondaryOscillationAmplitude,
      secondaryOscillationFrequency: secondaryOscillationFrequency,
      secondaryOscillationPhase: secondaryOscillationPhase,

      // Animation
      scale: this.config.noteScale,
      opacity: 0,
      rotation: 0,
      rotationSpeed: rotationSpeed,

      // Propriétés calculées
      age: 0,
      ageProgress: 0,
    };

    this.notes.push(note);
  }

  // Mettre à jour toutes les notes
  updateNotes(deltaTime) {
    this.notes.forEach((note) => {
      const currentTime = performance.now();
      note.age = currentTime - note.spawnTime;
      note.ageProgress = Math.min(note.age / note.lifetime, 1.0);

      // Animation d'apparition et de disparition
      if (note.ageProgress < 0.15) {
        // Fade in rapide
        note.opacity = this.config.opacity * (note.ageProgress / 0.15);
        note.scale =
          this.config.noteScale * this.easeOutBack(note.ageProgress / 0.15);
      } else if (note.ageProgress > 0.7) {
        // Fade out progressif pour l'effet de traînée
        const fadeProgress = (note.ageProgress - 0.7) / 0.3;
        note.opacity = this.config.opacity * (1 - fadeProgress);
        note.scale = this.config.noteScale * (1 - fadeProgress * 0.2);
      } else {
        // Phase stable
        note.opacity = this.config.opacity;
        note.scale = this.config.noteScale;
      }

      // Mouvement principal : direction haut-droite avec oscillations complexes
      const timeInSeconds = note.age * 0.001; // Convertir en secondes

      // Mouvement de base (direction principale)
      const baseMovementX = note.baseVelocity.x * deltaTime;
      const baseMovementY = note.baseVelocity.y * deltaTime;

      // Oscillation perpendiculaire à la direction principale
      // Calculer la direction perpendiculaire (rotation de 90°)
      const perpX = -note.baseVelocity.y; // Perpendiculaire X
      const perpY = note.baseVelocity.x; // Perpendiculaire Y
      const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
      const perpNormX = perpX / perpLength;
      const perpNormY = perpY / perpLength;

      // Oscillation principale
      const oscillationValue = Math.sin(
        timeInSeconds * note.oscillationFrequency + note.oscillationPhase
      );
      const primaryOscillationX =
        perpNormX * oscillationValue * note.oscillationAmplitude * deltaTime;
      const primaryOscillationY =
        perpNormY * oscillationValue * note.oscillationAmplitude * deltaTime;

      // Oscillation secondaire pour plus de complexité (dans la direction principale)
      const secondaryOscillationValue = Math.sin(
        timeInSeconds * note.secondaryOscillationFrequency +
          note.secondaryOscillationPhase
      );
      const directionNormX =
        note.baseVelocity.x /
        Math.sqrt(
          note.baseVelocity.x * note.baseVelocity.x +
            note.baseVelocity.y * note.baseVelocity.y
        );
      const directionNormY =
        note.baseVelocity.y /
        Math.sqrt(
          note.baseVelocity.x * note.baseVelocity.x +
            note.baseVelocity.y * note.baseVelocity.y
        );

      const secondaryOscillationX =
        directionNormX *
        secondaryOscillationValue *
        note.secondaryOscillationAmplitude *
        deltaTime;
      const secondaryOscillationY =
        directionNormY *
        secondaryOscillationValue *
        note.secondaryOscillationAmplitude *
        deltaTime;

      // Appliquer le mouvement total (base + oscillations)
      note.currentPosition.x +=
        baseMovementX + primaryOscillationX + secondaryOscillationX;
      note.currentPosition.y +=
        baseMovementY + primaryOscillationY + secondaryOscillationY;

      // Rotation très réduite (garder stable)
      note.rotation += note.rotationSpeed * deltaTime;

      // Ralentir progressivement le mouvement (effet de résistance de l'air)
      const slowdownFactor = 1 - note.ageProgress * 0.15; // Ralentissement plus doux
      note.velocity.x = note.baseVelocity.x * slowdownFactor;
      note.velocity.y = note.baseVelocity.y * slowdownFactor;
    });
  }

  // Nettoyer les notes expirées
  cleanupExpiredNotes(currentTime) {
    this.notes = this.notes.filter((note) => {
      return note.age < note.lifetime;
    });
  }

  // Fonction d'easing pour l'apparition des notes
  easeOutBack(x) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // Générateur de nombres pseudo-aléatoires avec seed
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
    this.notes = [];
    this.lastNoteSpawnTime = 0;
  }

  // Obtenir les données pour le rendu
  getRenderData() {
    if (!this.isActive) return null;

    return {
      id: this.id,
      type: "music-notes",
      position: this.position,
      notes: this.notes.filter((note) => note.opacity > 0.01),
      progress: this.progress,
      config: this.config,
    };
  }
}

/**
 * Composant React pour le rendu de l'effet de notes de musique
 */
export const MusicNotesEffectRenderer = memo(({ effectData }) => {
  const groupRef = useRef();
  const { getTexture, isReady } = useAssets();
  const { camera } = useThree();

  // Ne pas rendre si les assets ne sont pas prêts
  if (!isReady) {
    console.log("[MusicNotesEffect] Assets pas encore prêts");
    return null;
  }

  // Calculer la distance de la caméra à l'effet pour l'échelle adaptative
  const effectPosition = new THREE.Vector3(
    effectData.position.x,
    effectData.position.y,
    effectData.position.z
  );
  const cameraDistance = camera.position.distanceTo(effectPosition);

  return (
    <group ref={groupRef} name="music-notes-effect">
      {effectData.notes.map((note) => {
        // Calculer l'échelle adaptative basée sur la distance de la caméra
        const baseScale = note.scale || 2.0;
        // Utiliser les paramètres de configuration si disponibles
        const minScale = effectData.config?.minScale || 24.0;
        const maxScale = effectData.config?.maxScale || 64.0;
        const scaleDistance = effectData.config?.scaleDistance || 50.0;

        // Nouvelle formule d'échelle adaptative plus efficace
        // Plus on est loin, plus l'échelle augmente pour rester visible
        const normalizedDistance = cameraDistance / scaleDistance;
        const scaleFactor = 1.0 + normalizedDistance * 2.0; // Facteur multiplicateur
        const adaptiveScale = Math.min(
          maxScale,
          Math.max(minScale, baseScale * scaleFactor)
        );

        // Debug: afficher les valeurs de calcul
        if (note.id.includes("note_0_")) {
          // Log seulement pour la première note pour éviter le spam
          console.log(
            `[MusicNotesEffect] Distance caméra: ${cameraDistance.toFixed(
              2
            )}, Scale adaptative: ${adaptiveScale.toFixed(
              2
            )}, Base: ${baseScale}, Factor: ${scaleFactor.toFixed(2)}`
          );
        }

        // Obtenir la texture de la note
        const texture = getTexture(note.type);

        // Debug: vérifier si la texture est chargée
        if (!texture) {
          console.warn(
            `[MusicNotesEffect] Texture non trouvée pour: ${note.type}`
          );

          // Fallback: utiliser une géométrie simple
          return (
            <Billboard
              key={note.id}
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
              position={[
                note.currentPosition.x,
                note.currentPosition.y,
                note.currentPosition.z,
              ]}
            >
              <mesh
                rotation={[0, 0, note.rotation]}
                scale={[adaptiveScale, adaptiveScale, adaptiveScale]}
                renderOrder={200}
              >
                {/* Fallback: cercle simple */}
                <circleGeometry args={[0.5, 8]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent={true}
                  opacity={note.opacity}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            </Billboard>
          );
        }

        return (
          <Billboard
            key={note.id}
            follow={true}
            lockX={false}
            lockY={false}
            lockZ={false}
            position={[
              note.currentPosition.x,
              note.currentPosition.y,
              note.currentPosition.z,
            ]}
          >
            <mesh
              rotation={[0, 0, note.rotation]}
              scale={[adaptiveScale, adaptiveScale, adaptiveScale]}
              renderOrder={200}
            >
              <planeGeometry args={[1.5, 1.5]} />
              <meshBasicMaterial
                map={texture}
                transparent={true}
                opacity={note.opacity}
                depthWrite={false}
                alphaTest={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Billboard>
        );
      })}
    </group>
  );
});

MusicNotesEffectRenderer.displayName = "MusicNotesEffectRenderer";

export default MusicNotesEffect;
