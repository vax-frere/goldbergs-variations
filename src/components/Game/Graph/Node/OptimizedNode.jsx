import React, { memo, useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { Billboard, Text } from "@react-three/drei";
import useGraphStore from "../store";
import { useTextures } from "../../TexturePreloader";
import { urlToTextureId } from "../../utils/textureUtils";
import { getOrCreateGeometry, getOrCreateMaterial } from "../cache";

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

    // Récupérer les textures préchargées
    const { textures, loaded } = useTextures();

    // Créer un ID unique pour ce nœud
    const nodeId = node.id || "unknown";

    // Mode d'affichage fourni par les props
    const displayMode = mode;

    // Taille de base pour tous les nœuds
    const size = 3;
    const iconSize = 10;

    // Obtenir l'ID de la texture à partir de l'URL
    const textureId = useMemo(() => {
      // Si l'icône est une URL ou un nom simple, essayer de l'extraire
      const iconValue = node.icon || node.name || node.type || "default";

      // Si c'est un type de nœud connu, utiliser directement ce type
      if (node.type === "platform" && node.name) {
        console.log(
          `Node est une plateforme, utilisation du nom: ${node.name}.svg`
        );
        return `${node.name}.svg`;
      }

      // Sinon, essayer d'extraire depuis l'icône
      return urlToTextureId(
        iconValue + (iconValue.endsWith(".svg") ? "" : ".svg")
      );
    }, [node.icon, node.name, node.type]);

    // Récupérer la texture préchargée si disponible
    const iconTexture = useMemo(() => {
      if (!textureId || !loaded) return null;

      const texture = textures[textureId];

      // Si la texture exacte n'existe pas, essayer de trouver une texture alternative
      if (!texture) {
        // console.log(
        //   `Texture non trouvée: ${textureId}, recherche d'alternatives`
        // );

        // Essayer avec un autre format (.png)
        const pngId = textureId.replace(".svg", ".png");
        const pngTexture = textures[pngId];

        if (pngTexture) {
          console.log(`Alternative trouvée: ${pngId}`);
          return pngTexture;
        }

        // Si toujours pas de texture, utiliser la texture par défaut
        const defaultTexture = textures["default.svg"];
        if (defaultTexture) {
          // console.log(
          //   `Utilisation de la texture par défaut pour: ${textureId}`
          // );
          return defaultTexture;
        }

        return null;
      }

      return texture;
    }, [textureId, textures, loaded]);

    // Mémoiser les propriétés textuelles pour éviter les recréations inutiles
    const nodeTextProps = useMemo(() => {
      return {
        fontSize: 1.5,
        color: "#ffffff",
        anchorX: "center",
        anchorY: "middle",
        text: node.label || "",
      };
    }, [node.label]);

    // Mémoiser les propriétés d'icône pour éviter les recréations inutiles
    const nodeIconProps = useMemo(() => {
      // Moins restrictif: si on a une texture, créer les props
      if (textureId) {
        return {
          scale: [size * 1.5, size * 1.5, 1],
        };
      }
      return null;
    }, [textureId, size]);

    // Récupérer le matériau de la sphère depuis le cache centralisé
    const sphereMaterial = useMemo(() => {
      const materialKey = `node-${displayMode}-sphere`;
      return getOrCreateMaterial(materialKey, () => {
        return new THREE.MeshBasicMaterial({
          color: "#ffffff",
          transparent: true,
          opacity: displayMode === "simple" ? 0.8 : 0.2,
        });
      });
    }, [displayMode]);

    // Récupérer ou créer le matériau de l'icône
    const iconMaterial = useMemo(() => {
      if (!iconTexture) return null;

      const materialKey = `node-${nodeId}-${displayMode}-icon`;

      return getOrCreateMaterial(materialKey, () => {
        return new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 1, // Toujours visible
          map: iconTexture,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: false, // Désactiver le test de profondeur
          alphaTest: 0.1, // Ajuster pour éviter les artefacts de transparence
        });
      });
    }, [displayMode, iconTexture, nodeId]);

    // Géométries récupérées depuis le cache centralisé
    const sphereGeometry = useMemo(() => {
      const detail = displayMode === "advanced" ? 16 : 8;
      const geometryKey =
        displayMode === "advanced" ? "sphere-advanced" : "sphere-simple";

      return getOrCreateGeometry(geometryKey, () => {
        return new THREE.SphereGeometry(size, detail, detail);
      });
    }, [size, displayMode]);

    const planeGeometry = useMemo(() => {
      return getOrCreateGeometry("plane", () => {
        return new THREE.PlaneGeometry(1, 1);
      });
    }, []);

    // Rendu conditionnel optimisé
    return (
      <group position={[node.x, node.y, node.z]}>
        {/* Sphère de base */}
        {displayMode === "simple" && (
          <mesh geometry={sphereGeometry}>
            <primitive object={sphereMaterial} attach="material" />
          </mesh>
        )}

        {/* Texte (visible uniquement en mode advanced) */}
        {node.name && displayMode === "advanced" && (
          <Billboard position={[0, size + 10, 0]}>
            <Text
              fontSize={nodeTextProps.fontSize}
              color={nodeTextProps.color}
              anchorX="center"
              anchorY="middle"
            >
              {node.name}
            </Text>
          </Billboard>
        )}

        {/* Icône (visible uniquement en mode advanced) */}
        {iconTexture && displayMode === "advanced" && (
          <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
            <mesh
              scale={[iconSize * 1.5, iconSize * 1.5, 1]}
              geometry={planeGeometry}
              renderOrder={1000}
            >
              <primitive object={iconMaterial} attach="material" />
            </mesh>
          </Billboard>
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

    // Si les positions du nœud ont changé, re-rendre
    if (
      prevNode.x !== nextNode.x ||
      prevNode.y !== nextNode.y ||
      prevNode.z !== nextNode.z
    ) {
      return false;
    }

    // Si le label ou l'icône ont changé, re-rendre
    if (prevNode.label !== nextNode.label || prevNode.icon !== nextNode.icon) {
      return false;
    }

    // Si aucune des propriétés importantes n'a changé, ne pas re-rendre
    return true;
  }
);

// Définir un nom explicite pour le composant (utile pour le débogage)
OptimizedNode.displayName = "OptimizedNode";

export default OptimizedNode;
