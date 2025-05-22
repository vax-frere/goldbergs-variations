import React, { memo, useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import useGraphStore from "../store";
import useGameStore from "../../store";
import { useTextures } from "../../common/TexturePreloader";
import { urlToTextureId } from "../../utils/textureUtils";
import { getOrCreateGeometry, getOrCreateMaterial } from "../cache";
import NodeHoverEffect from "../effects/NodeHoverEffect";
import SvgPath from "../../common/SvgPath";

/**
 * Composant Node optimisé avec React.memo pour éviter les re-rendus inutiles
 * S'affiche en mode simple ou advanced selon la prop mode
 */
const OptimizedNode = memo(
  ({ node, mode = "simple" }) => {
    // Si le nœud n'a pas de position, ne pas le rendre
    if (!node.x || !node.y || !node.z) {
      return null;
    }

    // État pour gérer les erreurs de chargement des SVG
    const [svgError, setSvgError] = useState(false);

    // Récupérer les états du store pour vérifier si ce nœud est actif
    const activeNodeId = useGameStore((state) => state.activeNodeId);
    const isNodeActive = node.id === activeNodeId;

    // Vérifier si le nœud a déjà été visité
    const isNodeVisited = useGameStore((state) => state.isNodeVisited(node.id));

    // Récupérer les textures préchargées
    const { textures, loaded } = useTextures();

    // Créer un ID unique pour ce nœud
    const nodeId = node.id || "unknown";

    // Mode d'affichage fourni par les props
    const displayMode = mode;

    // Taille de base pour tous les nœuds
    const size = 1.5;
    // Taille des icônes
    const iconSize = 5;

    // Vérifier si c'est un nœud principal du cluster
    const isClusterMaster = node.isClusterMaster === true;

    // Vérifier si c'est une plateforme
    const isPlatform = node.type === "platform";

    // Déterminer le chemin vers le fichier SVG à utiliser
    const svgPath = useMemo(() => {
      // Si une erreur de chargement s'est produite, utiliser le SVG par défaut
      if (svgError) {
        return `/img/default.svg`;
      }

      // Cas spécial prioritaire : si le nom contient "fbi", utiliser fbi.svg
      if (node.name && node.name.toLowerCase().includes("fbi")) {
        return `/img/fbi.svg`;
      }

      // Cas spécial : nœud principal du cluster ou nœud avec isJoshua=true utilise character.svg
      if (isClusterMaster || node.isJoshua === true) {
        return `/img/character.svg`;
      }

      // Cas spécial : type "character" utilise journalist.svg
      if (node.type === "character") {
        return `/img/journalist.svg`;
      }

      // Si c'est un type de nœud connu (platform), utiliser directement ce type
      if (isPlatform && node.name) {
        return `/img/${node.name}.svg`;
      }

      // Traitement standard pour les autres cas
      const iconValue = node.icon || node.name || node.type || "default";
      const fileName = iconValue.endsWith(".svg")
        ? iconValue
        : `${iconValue}.svg`;
      return `/img/${fileName}`;
    }, [
      node.icon,
      node.name,
      node.type,
      node.isJoshua,
      svgError,
      isClusterMaster,
      isPlatform,
    ]);

    // Fonction pour gérer les erreurs de chargement SVG
    const handleSvgError = () => {
      console.log(
        `Erreur de chargement SVG pour ${
          node.name || node.id
        }, utilisation de default.svg`
      );
      setSvgError(true);
    };

    // Appliquer des styles très différents selon l'état de visite
    // Pour rendre évident si un noeud a été visité ou non
    const visitedNodeStyle = useMemo(() => {
      // Les noeuds principaux ne changent pas d'apparence
      if (isClusterMaster) {
        return {
          color: "white",
          opacity: 1.0,
          lineWidth: 1.5,
        };
      }

      // Style différent selon l'état de visite
      if (isNodeVisited) {
        return {
          color: "#777777", // Couleur grise pour les nœuds visités
          opacity: 0.3, // Beaucoup plus transparent
          lineWidth: 0.5, // Lignes plus fines
        };
      } else {
        return {
          color: "white", // Couleur blanche pour les nœuds non visités
          opacity: 1.0, // Complètement opaque
          lineWidth: 1.5, // Lignes normales
        };
      }
    }, [isNodeVisited, isClusterMaster]);

    // Calculer l'opacité du texte
    const textOpacity = useMemo(() => {
      if (isClusterMaster) return 1.0;
      return isNodeVisited ? 0.4 : 1.0; // Texte beaucoup plus transparent pour les nœuds visités
    }, [isNodeVisited, isClusterMaster]);

    // Texte du nœud
    const nodeTextProps = useMemo(() => {
      return {
        fontSize: isClusterMaster ? 5 : 2,
        color: isNodeVisited ? "#aaaaaa" : "#ffffff", // Couleur plus claire pour les nœuds visités
        opacity: textOpacity,
      };
    }, [isClusterMaster, isNodeVisited, textOpacity]);

    // Matériau pour la sphère de base
    const sphereMaterial = useMemo(() => {
      // Utiliser une couleur unique pour tous les types de noeuds
      return getOrCreateMaterial("default-sphere", () => {
        return new THREE.MeshBasicMaterial({
          color: new THREE.Color("#ffffff"),
          transparent: true,
          opacity: 0.7,
        });
      });
    }, []);

    const sphereGeometry = useMemo(() => {
      return getOrCreateGeometry("sphere-simple", () => {
        return new THREE.SphereGeometry(size, 8, 8);
      });
    }, [size, displayMode]);

    // Mémoiser les couleurs pour l'effet de hover
    const hoverEffectColor = useMemo(() => {
      // Couleur blanche pour l'effet de hover standard
      return [1.0, 1.0, 1.0];
    }, []);

    // Taille de l'icône avec modification selon le type de nœud (sans la réduction pour les visités)
    const iconFinalSize = iconSize * (isClusterMaster ? 3 : 1.5);

    // Rendu conditionnel optimisé
    return (
      <group position={[node.x, node.y, node.z]}>
        {/* Sphère de base */}
        {displayMode === "simple" && (
          <mesh geometry={sphereGeometry}>
            <primitive object={sphereMaterial} attach="material" />
          </mesh>
        )}

        {/* Texte (visible uniquement en mode advanced et pour les nœuds non-plateforme) */}
        {node.name && displayMode === "advanced" && !isPlatform && (
          <Billboard position={[0, size + (isClusterMaster ? 12 : 10), 0]}>
            <Text
              fontSize={nodeTextProps.fontSize}
              color={nodeTextProps.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={isClusterMaster ? 0.5 : 0}
              outlineColor="#000000"
              opacity={nodeTextProps.opacity}
            >
              {node.name}
            </Text>
          </Billboard>
        )}

        {/* Icône avec SVGPath (visible uniquement en mode advanced) */}
        {displayMode === "advanced" && (
          <SvgPath
            svgPath={svgPath}
            size={iconFinalSize}
            position={[0, 0, 0]}
            isBillboard={true}
            opacity={visitedNodeStyle.opacity}
            color={visitedNodeStyle.color}
            lineWidth={visitedNodeStyle.lineWidth}
            onError={handleSvgError}
          />
        )}

        {/* Effet de hover lorsque le nœud est actif */}
        {displayMode === "advanced" && (
          <NodeHoverEffect
            position={[0, 0, 0]}
            active={isNodeActive}
            size={size * (isClusterMaster ? 1.8 : 1.5)}
            color={hoverEffectColor}
            opacity={isNodeVisited ? 0.3 : 0.8} // Effet de hover beaucoup plus subtil pour les nœuds visités
            node={node}
          />
        )}
      </group>
    );
  },
  (prevProps, nextProps) => {
    // Fonction de comparaison personnalisée pour React.memo
    // Ne re-rendre que si les propriétés importantes ont changé
    const prevNode = prevProps.node;
    const nextNode = nextProps.node;
    const prevMode = prevProps.mode;
    const nextMode = nextProps.mode;

    // Si le mode a changé, re-rendre
    if (prevMode !== nextMode) {
      return false;
    }

    // Si les positions des nœuds ont changé, re-rendre
    if (
      prevNode.x !== nextNode.x ||
      prevNode.y !== nextNode.y ||
      prevNode.z !== nextNode.z
    ) {
      return false;
    }

    // Si les propriétés d'affichage ont changé, re-rendre
    if (
      prevNode.name !== nextNode.name ||
      prevNode.type !== nextNode.type ||
      prevNode.icon !== nextNode.icon ||
      prevNode.value !== nextNode.value ||
      prevNode.isClusterMaster !== nextNode.isClusterMaster ||
      prevNode.isJoshua !== nextNode.isJoshua
    ) {
      return false;
    }

    // Si l'état de visite a changé, re-rendre
    // Note: Nous ne pouvons pas comparer l'état de visite directement car il vient du store global
    // et serait toujours différent. La comparaison se fera via les effets dans le composant.

    // Si aucune des propriétés importantes n'a changé, ne pas re-rendre
    return true;
  }
);

// Définir un nom explicite pour le composant (utile pour le débogage)
OptimizedNode.displayName = "OptimizedNode";

export default OptimizedNode;
