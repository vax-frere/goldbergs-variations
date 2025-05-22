import React, { memo, useMemo, useRef, useEffect, useState } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import useAssets from "../../../../hooks/useAssets";

/**
 * Composant Link optimisé avec React.memo pour éviter les re-rendus inutiles
 * S'affiche en mode simple (ligne) ou advanced (ligne avec flèche) selon la prop mode
 * Utilise le système d'assets centralisé pour les matériaux
 */
const OptimizedLink = memo(
  ({ sourceNode, targetNode, mode = "simple", isDirect = true }) => {
    // 1. Tous les hooks doivent être appelés au début du composant
    // Utiliser notre service d'assets centralisé
    const assets = useAssets();

    // 2. Définir toutes les variables d'état et conditions utilisées par les hooks
    const displayMode = mode;
    const isIndirect = isDirect === false || isDirect === "Indirect";
    const isDashed = displayMode === "advanced" && isIndirect;

    // Constantes pour les lignes en pointillé
    const dashSize = 2.0;
    const gapSize = 0.25;

    // Constantes pour les flèches
    const arrowSize = 2.0; // Taille de la flèche
    const arrowAngle = Math.PI / 4; // Angle de 45 degrés pour les branches de la flèche

    // 3. Vérification précoce pour savoir si on doit rendre quoi que ce soit
    const shouldRender =
      sourceNode?.x !== undefined &&
      sourceNode?.y !== undefined &&
      sourceNode?.z !== undefined &&
      targetNode?.x !== undefined &&
      targetNode?.y !== undefined &&
      targetNode?.z !== undefined &&
      assets.isReady;

    // 4. Calculer les valeurs mémoïsées - toujours définir tous les hooks, même si on n'utilise pas leur résultat
    const vectorData = useMemo(() => {
      if (!shouldRender)
        return {
          sourceVector: null,
          targetVector: null,
          direction: null,
          sourceWithOffset: null,
          targetWithOffset: null,
          points: [
            [0, 0, 0],
            [0, 0, 0],
          ],
        };

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
      shouldRender,
      sourceNode?.x,
      sourceNode?.y,
      sourceNode?.z,
      targetNode?.x,
      targetNode?.y,
      targetNode?.z,
      sourceNode?.value,
      targetNode?.value,
    ]);

    const { points, direction, targetWithOffset } = vectorData;

    // 5. Arrow vectors - toujours définir le hook
    const arrowVectors = useMemo(() => {
      if (!shouldRender || displayMode !== "advanced") {
        return null;
      }

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
    }, [
      shouldRender,
      displayMode,
      direction,
      targetWithOffset,
      arrowSize,
      arrowAngle,
    ]);

    // 6. Dashed line geometry - toujours définir le hook
    const dashedLineGeometry = useMemo(() => {
      if (!shouldRender || !isDashed) {
        return null;
      }

      // Créer une BufferGeometry à partir des points
      const geometry = new THREE.BufferGeometry();

      // Convertir les points 2D en format Vector3
      const vertices = [
        new THREE.Vector3(points[0][0], points[0][1], points[0][2]),
        new THREE.Vector3(points[1][0], points[1][1], points[1][2]),
      ];

      // Calculer la distance entre les points
      const distance = vertices[0].distanceTo(vertices[1]);

      // Ajouter les sommets à la géométrie
      geometry.setFromPoints(vertices);

      // Ajouter l'attribut lineDistance requis pour LineDashedMaterial
      const lineDistances = [0, distance];
      geometry.setAttribute(
        "lineDistance",
        new THREE.Float32BufferAttribute(lineDistances, 1)
      );

      return geometry;
    }, [shouldRender, isDashed, points]);

    // 7. Effets pour créer les matériaux
    useEffect(() => {
      if (!assets.isReady) return;

      // Créer tous les matériaux dans un seul effet
      assets.createMaterial("link-simple", () => {
        return new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.3,
        });
      });

      assets.createMaterial("link-advanced", () => {
        return new THREE.LineBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.8,
        });
      });

      assets.createMaterial("link-dashed", () => {
        return new THREE.LineDashedMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: 0.8,
          dashSize: dashSize,
          gapSize: gapSize,
        });
      });
    }, [assets.isReady, dashSize, gapSize]);

    // 8. Early return après les hooks si on ne doit rien afficher
    if (!shouldRender) {
      return null;
    }

    // Récupérer les matériaux depuis le service d'assets
    const simpleMaterial = assets.getMaterial("link-simple");
    const advancedMaterial = assets.getMaterial("link-advanced");
    const dashedMaterial = assets.getMaterial("link-dashed");

    // Si les matériaux ne sont pas encore disponibles, ne rien afficher
    if (!simpleMaterial || !advancedMaterial || (isDashed && !dashedMaterial)) {
      return null;
    }

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
          {/* Ligne principale (normale ou en pointillé) */}
          {isDashed ? (
            <line>
              <primitive object={dashedLineGeometry} attach="geometry" />
              <primitive object={dashedMaterial} attach="material" />
            </line>
          ) : (
            <Line
              points={points}
              color="#ffffff"
              lineWidth={0.75}
              material={advancedMaterial}
            />
          )}

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
    const prevIsDirect = prevProps.isDirect;
    const nextIsDirect = nextProps.isDirect;

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

    // Si l'état isDirect a changé, re-rendre
    if (prevIsDirect !== nextIsDirect) {
      return false;
    }

    // Si aucune des propriétés importantes n'a changé, ne pas re-rendre
    return true;
  }
);

// Définir un nom explicite pour le composant (utile pour le débogage)
OptimizedLink.displayName = "OptimizedLink";

export default OptimizedLink;
