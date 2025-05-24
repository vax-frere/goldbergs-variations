import React, { memo, useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import CustomText from "../../../components/CustomText";
import SvgPath from "../../../components/SvgPath";
import NodeHoverEffect from "./NodeHoverEffect";
import useGameStore from "../../../store";

/**
 * Composant AdvancedNode - Version améliorée des nœuds pour le mode avancé
 */
const AdvancedNode = memo(({ node, isActive = false }) => {
  const [svgError, setSvgError] = useState(false);
  const [showEffect, setShowEffect] = useState(false);
  const [effectKey, setEffectKey] = useState(0);

  // Vérifier si le nœud a déjà été visité
  const isNodeVisited = useGameStore((state) =>
    state.isNodeVisited(node.slug || String(node.id))
  );

  // Tailles de base
  const size = 8;
  const iconSize = 5;

  // Vérifier si c'est un nœud principal du cluster
  const isClusterMaster = node.isClusterMaster === true;
  const isPlatform = node.type === "platform";

  // Calculer l'opacité en fonction de l'état de visite
  const nodeStyle = useMemo(() => {
    if (isClusterMaster) {
      return {
        opacity: 1.0,
        textOpacity: 1.0,
      };
    }
    return {
      opacity: isNodeVisited ? 0.1 : 1.0,
      textOpacity: isNodeVisited ? 0.1 : 1.0,
    };
  }, [isNodeVisited, isClusterMaster]);

  // Gérer l'effet temporaire quand le nœud devient actif
  useEffect(() => {
    if (isActive) {
      setShowEffect(true);
      setEffectKey((prev) => prev + 1);
      const timer = setTimeout(() => {
        setShowEffect(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Déterminer le chemin vers le fichier SVG à utiliser
  const svgPath = useMemo(() => {
    if (svgError) {
      return `/img/default.svg`;
    }

    if (node.name?.toLowerCase().includes("fbi")) {
      return `/img/fbi.svg`;
    }

    if (isClusterMaster || node.isJoshua === true) {
      return `/img/character.svg`;
    }

    if (node.type === "character") {
      return `/img/journalist.svg`;
    }

    if (isPlatform && node.name) {
      return `/img/${node.name}.svg`;
    }

    const iconValue = node.icon || node.name || node.type || "default";
    const fileName = iconValue.endsWith(".svg")
      ? iconValue
      : `${iconValue}.svg`;
    return `/img/${fileName}`;
  }, [node, svgError, isClusterMaster, isPlatform]);

  // Taille finale de l'icône
  const iconFinalSize = iconSize * (isClusterMaster ? 3 : 1.5);

  return (
    <group position={[node.x || 0, node.y || 0, node.z || 0]}>
      {/* Icône SVG avec Billboard */}
      <Billboard>
        <group scale={[iconFinalSize, iconFinalSize, 1]}>
          <SvgPath
            svgPath={svgPath}
            color="#ffffff"
            opacity={nodeStyle.opacity}
            lineWidth={1.5}
            onError={() => setSvgError(true)}
            size={1.0}
          />
        </group>
      </Billboard>

      {/* Label du nœud */}
      {node.name && !isPlatform && (
        <Billboard position={[0, size + (isClusterMaster ? 12 : 10), 0]}>
          <CustomText
            text={node.name}
            position={[0, 0, 0]}
            size={isClusterMaster ? 5 : 2}
            color="#ffffff"
            maxDistance={100}
            minDistance={20}
            outline={true}
            outlineWidth={isClusterMaster ? 0.5 : 0}
            outlineColor="#000000"
            opacity={nodeStyle.textOpacity}
          />
        </Billboard>
      )}

      {/* Effet de survol temporaire */}
      {showEffect && (
        <NodeHoverEffect
          key={effectKey}
          position={[0, 0, 0]}
          active={true}
          size={isClusterMaster ? 6 : 4}
          color={isClusterMaster ? [0, 1, 0] : [1, 1, 1]}
          opacity={nodeStyle.opacity * 0.8}
        />
      )}
    </group>
  );
});

AdvancedNode.displayName = "AdvancedNode";

export default AdvancedNode;
