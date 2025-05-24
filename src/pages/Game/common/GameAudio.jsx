import { useEffect, useRef } from "react";
import { PositionalAudio } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import useAssets from "../../../hooks/useAssets";
import useGameStore from "../store";

/**
 * Composant gérant tous les sons du jeu en utilisant Three.js Audio
 *
 * Ce composant précharge et gère tous les sons du jeu en utilisant
 * l'API Audio de Three.js via React Three Fiber
 */
const GameAudio = () => {
  // Accès aux assets pour récupérer les chemins des fichiers audio
  const assets = useAssets();

  // Accès au contexte Three.js
  const { camera } = useThree();

  // Références aux objets audio
  const ambientAudioRef = useRef();
  const interviewAudioRef = useRef();

  // Récupérer l'état audio global
  const audioEnabled = useGameStore((state) => state.audioEnabled);

  // Effet pour gérer l'activation/désactivation de l'audio en fonction de l'état global
  useEffect(() => {
    // Gestion du son ambiant
    if (ambientAudioRef.current) {
      if (audioEnabled) {
        ambientAudioRef.current.play();
      } else {
        ambientAudioRef.current.pause();
      }
    }

    // Gestion du son interview
    if (interviewAudioRef.current) {
      if (audioEnabled) {
        interviewAudioRef.current.play();
      } else {
        interviewAudioRef.current.pause();
      }
    }
  }, [audioEnabled]);

  // Si les assets ne sont pas prêts, ne rien afficher
  if (!assets.isReady) return null;

  return (
    <group>
      {/* Son d'ambiance */}
      <PositionalAudio
        ref={ambientAudioRef}
        url={assets.getSoundPath("ambiant.mp3")}
        distance={1000} // Distance d'audibilité maximale
        loop={true}
        autoplay={audioEnabled}
        volume={0.1}
      />

      {/* Son d'interview */}
      <PositionalAudio
        ref={interviewAudioRef}
        url={assets.getSoundPath("interview.m4a")}
        distance={1000} // Distance d'audibilité maximale
        loop={true}
        autoplay={audioEnabled}
        volume={0.7}
      />
    </group>
  );
};

export default GameAudio;
