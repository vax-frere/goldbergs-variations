import React, { memo, useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import useGraphStore from "../store";
import { getOrCreateMaterial } from "../cache";

/**
 * Composant Link optimisé avec React.memo pour éviter les re-rendus inutiles
 * S'affiche en mode simple (ligne) ou advanced (ligne avec flèche) selon la prop mode
 */
const OptimizedLink = memo(
  ({ sourceNode, targetNode, mode = "simple" }) => {
    // Ne rien afficher si les nœuds source ou destination n'ont pas de coordonnées
    if (
      !sourceNode?.x ||
      !sourceNode?.y ||
      !sourceNode?.z ||
      !targetNode?.x ||
      !targetNode?.y ||
      !targetNode?.z
    ) {
      return null;
    }

    // Mode d'affichage fourni par les props
    const displayMode = mode;

    // Constantes pour les flèches
    const arrowSize = 2.0; // Taille de la flèche
    const arrowAngle = Math.PI / 4; // Angle de 45 degrés pour les branches de la flèche
    const offsetDistance = 7.5; // Distance d'offset pour les flèches

    // Calculer l'offset pour les points de départ et d'arrivée (mémoisation)
    const {
      sourceVector,
      targetVector,
      direction,
      sourceWithOffset,
      targetWithOffset,
      points,
    } = useMemo(() => {
      // On crée un vecteur de la source vers la cible
      const srcVector = new THREE.Vector3(
        sourceNode.x,
        sourceNode.y,
        sourceNode.z
      );

      const tgtVector = new THREE.Vector3(
        targetNode.x,
        targetNode.y,
        targetNode.z
      );

      // Direction du lien (vecteur normalisé)
      const dir = new THREE.Vector3()
        .subVectors(tgtVector, srcVector)
        .normalize();

      // Décaler les points de départ et d'arrivée
      // On utilise la taille du nœud si disponible, sinon une valeur par défaut
      const sourceRadius = sourceNode.value || 5;
      const targetRadius = targetNode.value || 5;

      // Appliquer les offsets
      const srcWithOffset = new THREE.Vector3().addVectors(
        srcVector,
        dir.clone().multiplyScalar(sourceRadius)
      );

      const tgtWithOffset = new THREE.Vector3().addVectors(
        tgtVector,
        dir.clone().multiplyScalar(-targetRadius)
      );

      // Points pour la ligne avec offsets
      const pts = [
        [srcWithOffset.x, srcWithOffset.y, srcWithOffset.z],
        [tgtWithOffset.x, tgtWithOffset.y, tgtWithOffset.z],
      ];

      return {
        sourceVector: srcVector,
        targetVector: tgtVector,
        direction: dir,
        sourceWithOffset: srcWithOffset,
        targetWithOffset: tgtWithOffset,
        points: pts,
      };
    }, [
      sourceNode.x,
      sourceNode.y,
      sourceNode.z,
      targetNode.x,
      targetNode.y,
      targetNode.z,
      sourceNode.value,
      targetNode.value,
    ]);

    // Récupérer les matériaux pour les deux modes depuis le cache centralisé
    const simpleMaterial = useMemo(() => {
      return getOrCreateMaterial("link-simple", () => {
        return new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.3,
        });
      });
    }, []);

    const advancedMaterial = useMemo(() => {
      return getOrCreateMaterial("link-advanced", () => {
        return new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.8,
        });
      });
    }, []);

    // Créer les vecteurs pour les flèches
    const arrowVectors = useMemo(() => {
      if (displayMode !== "advanced") return null;

      // Trouver un vecteur perpendiculaire
      const up = new THREE.Vector3(0, 1, 0);
      let perpendicular = new THREE.Vector3()
        .crossVectors(direction, up)
        .normalize();

      // Si le lien est presque vertical, utiliser un autre vecteur de référence
      if (perpendicular.length() < 0.1) {
        perpendicular = new THREE.Vector3(1, 0, 0);
      }

      // Calculer les branches de la flèche
      const branch1Dir = new THREE.Vector3().copy(direction).negate();
      branch1Dir.applyAxisAngle(perpendicular, arrowAngle);

      const branch2Dir = new THREE.Vector3().copy(direction).negate();
      branch2Dir.applyAxisAngle(perpendicular, -arrowAngle);

      // Calculer les points de fin des branches
      const branch1End = new THREE.Vector3()
        .copy(targetWithOffset)
        .addScaledVector(branch1Dir, arrowSize);

      const branch2End = new THREE.Vector3()
        .copy(targetWithOffset)
        .addScaledVector(branch2Dir, arrowSize);

      return {
        branch1Start: targetWithOffset,
        branch1End,
        branch2Start: targetWithOffset,
        branch2End,
      };
    }, [displayMode, direction, targetWithOffset, arrowSize, arrowAngle]);

    // Rendu optimisé avec le type de lien approprié selon le mode
    if (displayMode === "simple") {
      return (
        <Line
          points={points}
          color="#ffffff"
          lineWidth={0.25}
          material={simpleMaterial}
        />
      );
    } else {
      // Mode avancé avec flèche
      return (
        <group>
          {/* Ligne principale */}
          <Line
            points={points}
            color="#ffffff"
            lineWidth={0.75}
            material={advancedMaterial}
          />

          {/* Branches de la flèche */}
          {arrowVectors && (
            <>
              <Line
                points={[
                  [
                    arrowVectors.branch1Start.x,
                    arrowVectors.branch1Start.y,
                    arrowVectors.branch1Start.z,
                  ],
                  [
                    arrowVectors.branch1End.x,
                    arrowVectors.branch1End.y,
                    arrowVectors.branch1End.z,
                  ],
                ]}
                color="#ffffff"
                lineWidth={0.5}
              />
              <Line
                points={[
                  [
                    arrowVectors.branch2Start.x,
                    arrowVectors.branch2Start.y,
                    arrowVectors.branch2Start.z,
                  ],
                  [
                    arrowVectors.branch2End.x,
                    arrowVectors.branch2End.y,
                    arrowVectors.branch2End.z,
                  ],
                ]}
                color="#ffffff"
                lineWidth={0.5}
              />
            </>
          )}
        </group>
      );
    }
  },
  (prevProps, nextProps) => {
    // Fonction de comparaison personnalisée pour React.memo
    // Ne re-rendre que si les propriétés importantes ont changé
    const prevSource = prevProps.sourceNode;
    const prevTarget = prevProps.targetNode;
    const nextSource = nextProps.sourceNode;
    const nextTarget = nextProps.targetNode;
    const prevMode = prevProps.mode;
    const nextMode = nextProps.mode;

    // Si le mode a changé, re-rendre
    if (prevMode !== nextMode) {
      return false;
    }

    // Si les positions des nœuds ont changé, re-rendre
    if (
      prevSource.x !== nextSource.x ||
      prevSource.y !== nextSource.y ||
      prevSource.z !== nextSource.z ||
      prevTarget.x !== nextTarget.x ||
      prevTarget.y !== nextTarget.y ||
      prevTarget.z !== nextTarget.z
    ) {
      return false;
    }

    // Si les valeurs (tailles) des nœuds ont changé, re-rendre
    if (
      prevSource.value !== nextSource.value ||
      prevTarget.value !== nextTarget.value
    ) {
      return false;
    }

    // Si aucune des propriétés importantes n'a changé, ne pas re-rendre
    return true;
  }
);

// Définir un nom explicite pour le composant (utile pour le débogage)
OptimizedLink.displayName = "OptimizedLink";

export default OptimizedLink;
