import {
  useEffect,
  useRef,
  useMemo,
  createContext,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import R3fForceGraph from "r3f-forcegraph";
import {
  createNodeObject,
  createLinkObject,
  updateLinkPosition,
} from "./utils/nodeUtils";
import { Html } from "@react-three/drei";
import * as d3 from "d3";
import { COLORS } from "./Node/Node";

// Contexte pour l'affichage d'informations UI (simplifié)
export const ForceGraphContext = createContext(null);

// Fonction utilitaire pour exporter des données JSON en fichier téléchargeable
const exportJsonFile = (data, filename) => {
  // Convertir les données en chaîne JSON formatée
  const jsonString = JSON.stringify(data, null, 2);

  // Créer un blob avec le contenu JSON
  const blob = new Blob([jsonString], { type: "application/json" });

  // Créer une URL pour le blob
  const url = URL.createObjectURL(blob);

  // Créer un élément <a> pour le téléchargement
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Ajouter l'élément au DOM, cliquer dessus, puis le supprimer
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libérer l'URL
  URL.revokeObjectURL(url);
};

// Tableau de couleurs pour les clusters (mémorisé)
const clusterColors = [
  "#e41a1c", // rouge
  "#377eb8", // bleu
  "#4daf4a", // vert
  "#984ea3", // violet
  "#ff7f00", // orange
  "#ffff33", // jaune
  "#a65628", // marron
  "#f781bf", // rose
  "#999999", // gris
  "#66c2a5", // turquoise
];

// Composant principal du graphe 3D - simplifié sans gestion de caméra ni nœuds
const ForceGraphComponent = forwardRef((props, ref) => {
  // Au lieu d'utiliser le contexte, utiliser les props
  const { graphData = { nodes: [], links: [] } } = props;
  const isLoadingGraph =
    !graphData || !graphData.nodes || graphData.nodes.length === 0;
  const graphError = props.graphError || null;

  const fgRef = useRef();

  // Pré-calcul d'une map d'ID de nœuds pour un accès plus rapide
  const nodeMap = useMemo(() => {
    if (!graphData || !graphData.nodes) return {};
    return graphData.nodes.reduce((map, node) => {
      map[node.id] = node;
      return map;
    }, {});
  }, [graphData]);

  // Exposer des méthodes via la référence
  useImperativeHandle(
    ref,
    () => ({
      // Méthode pour récupérer les positions des noeuds
      getNodesPositions: () => {
        if (!fgRef.current || !graphData || !graphData.nodes) {
          console.warn(
            "Impossible de récupérer les positions des noeuds - références manquantes"
          );
          return [];
        }

        try {
          // Accéder au graphe interne pour récupérer les positions
          const graphInstance = fgRef.current;

          // Vérifier si le graphInstance a déjà des objets avec des positions
          if (graphInstance.__nodeObjects) {
            const nodeObjects = graphInstance.__nodeObjects;

            // Utiliser directement les nœuds du graphData qui sont déjà fusionnés
            // et ajouter les positions du graphInstance
            return graphData.nodes.map((node) => {
              const nodeObj = nodeObjects[node.id];

              // Propriétés de cluster à conserver
              const clusterProps = {
                cluster: node.cluster,
                offsetX: node.offsetX,
                offsetY: node.offsetY,
                offsetZ: node.offsetZ,
              };

              // Si le nœud a un objet associé avec position dans le graphe, l'utiliser
              if (nodeObj && nodeObj.position) {
                return {
                  ...node, // Conserver toutes les propriétés du nœud fusionné
                  ...clusterProps, // S'assurer que les propriétés de cluster sont préservées
                  x: nodeObj.position.x,
                  y: nodeObj.position.y,
                  z: nodeObj.position.z,
                };
              }

              // Fallback aux données du graphe d3
              if (graphInstance.graphData && graphInstance.graphData.nodes) {
                // Utiliser une Map pour accélérer la recherche d'un nœud par ID
                const d3NodeMap = new Map(
                  graphInstance.graphData.nodes.map((n) => [n.id, n])
                );
                const d3Node = d3NodeMap.get(node.id);

                if (d3Node) {
                  return {
                    ...node,
                    ...clusterProps,
                    x: d3Node.x || node.x || 0,
                    y: d3Node.y || node.y || 0,
                    z: d3Node.z || node.z || 0,
                  };
                }
              }

              // Dernier recours: utiliser les données disponibles dans le nœud
              return {
                ...node,
                ...clusterProps,
                x: node.x || node.coordinates?.x || 0,
                y: node.y || node.coordinates?.y || 0,
                z: node.z || node.coordinates?.z || 0,
              };
            });
          }

          // Méthode de secours
          return graphData.nodes.map((node) => {
            const clusterProps = {
              cluster: node.cluster,
              offsetX: node.offsetX,
              offsetY: node.offsetY,
              offsetZ: node.offsetZ,
            };

            return {
              ...node,
              ...clusterProps,
              x: node.x || node.coordinates?.x || 0,
              y: node.y || node.coordinates?.y || 0,
              z: node.z || node.coordinates?.z || 0,
            };
          });
        } catch (error) {
          console.error("Erreur lors de la récupération des positions:", error);

          // Dernier recours: utiliser les données du contexte directement
          return graphData.nodes.map((node) => {
            const clusterProps = {
              cluster: node.cluster,
              offsetX: node.offsetX,
              offsetY: node.offsetY,
              offsetZ: node.offsetZ,
            };

            return {
              ...node,
              ...clusterProps,
              x: node.x || node.coordinates?.x || 0,
              y: node.y || node.coordinates?.y || 0,
              z: node.z || node.coordinates?.z || 0,
            };
          });
        }
      },

      // Indique si le graphe est stabilisé
      isStabilized: () => {
        return fgRef.current
          ? !fgRef.current.d3Force("simulation")?.alpha()
          : false;
      },

      // Force la stabilisation du graphe
      stabilize: () => {
        if (fgRef.current) {
          const simulation = fgRef.current.d3Force("simulation");
          if (simulation) {
            simulation.alpha(0);
            simulation.stop();
          }
        }
      },
    }),
    [graphData]
  );

  // Déterminer quelles données afficher (données réelles ou données de secours)
  const displayData = graphError || !graphData ? null : graphData;

  // Vérifier si les données sont vraiment disponibles et complètes
  const dataIsReady =
    !isLoadingGraph &&
    displayData &&
    displayData.nodes &&
    displayData.links &&
    displayData.nodes.length > 0 &&
    displayData.links.length > 0;

  // Pré-calcul des connexions pour chaque nœud (mémorisé)
  const nodeConnections = useMemo(() => {
    if (!displayData || !displayData.nodes || !displayData.links) return {};

    const connections = {};

    // Initialiser le tableau de connexions pour chaque nœud
    displayData.nodes.forEach((node) => {
      connections[node.id] = [];
    });

    // Remplir les connexions basées sur les liens
    displayData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;

      if (connections[sourceId]) {
        connections[sourceId].push(targetId);
      }

      if (connections[targetId]) {
        connections[targetId].push(sourceId);
      }
    });

    return connections;
  }, [displayData]);

  useEffect(() => {
    // Add animation/rotation with throttling for performance
    let animationFrameId;
    let lastFrameTime = 0;
    const frameInterval = 33; // Environ 30 FPS au lieu de 60+ FPS pour réduire les calculs

    const animate = (currentTime) => {
      if (currentTime - lastFrameTime > frameInterval) {
        if (fgRef.current && dataIsReady) {
          fgRef.current.tickFrame();
        }
        lastFrameTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (dataIsReady) {
      animate(0);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dataIsReady]);

  // Afficher l'état de chargement directement dans la scène 3D
  if (!dataIsReady) {
    return <Html center />;
  }

  // Afficher l'état d'erreur directement dans la scène 3D
  if (graphError) {
    return (
      <Html center>
        <div style={{ color: "red", fontSize: "18px", textAlign: "center" }}>
          Erreur de chargement: {graphError}
        </div>
      </Html>
    );
  }

  // Dans le contexte 3D, ne retourner que des éléments 3D !
  return (
    <ForceGraphContext.Provider value={{}}>
      <R3fForceGraph
        ref={fgRef}
        graphData={displayData}
        nodeLabel="name"
        linkOpacity={0.3}
        showNavInfo={false}
        cooldownTicks={1000}
        cooldownTime={5000}
        backgroundColor="#000000"
        // Paramètres ajustés pour meilleures performances
        d3AlphaDecay={0.02} // Légèrement augmenté pour stabiliser plus vite
        d3VelocityDecay={0.5}
        d3AlphaMin={0.001}
        forceEngine="d3"
        dagMode={null}
        nodeRelSize={25}
        linkDirectionalParticles={0} // Désactivé pour améliorer les performances
        nodeVal={(node) => node.value || 1}
        nodeColor={(node) => {
          // Coloration basée sur le groupe thématique pour les personnages
          if (node.color) return node.color;

          if (node.isJoshua) {
            return COLORS.joshua;
          } else if (node.type === "platform" || node.type === "source") {
            return COLORS.source;
          } else if (node.type === "character" && node.thematicGroup) {
            return (
              COLORS.thematicGroups[node.thematicGroup] ||
              COLORS.thematicGroups.default
            );
          }

          // Fallback aux couleurs par cluster pour les autres nœuds
          if (node.cluster !== undefined) {
            return clusterColors[node.cluster % clusterColors.length];
          }

          return COLORS.character;
        }}
        linkColor={(link) => {
          const sourceId =
            typeof link.source === "object" ? link.source.id : link.source;

          // Utiliser la Map précalculée au lieu de find() pour une recherche plus rapide
          const sourceNode = nodeMap[sourceId];

          if (!sourceNode) return "#aaaaaa";

          if (sourceNode.type === "character" && sourceNode.thematicGroup) {
            return (
              COLORS.thematicGroups[sourceNode.thematicGroup] ||
              COLORS.thematicGroups.default
            );
          }

          if (sourceNode.cluster !== undefined) {
            return clusterColors[sourceNode.cluster % clusterColors.length];
          }

          return "#aaaaaa";
        }}
        nodeAutoColorBy="cluster"
        nodePositionUpdate={(node) => {
          // Si le nœud n'a pas encore de position définie
          if (
            node.x === undefined ||
            node.y === undefined ||
            node.z === undefined
          ) {
            if (
              node.offsetX !== undefined &&
              node.offsetY !== undefined &&
              node.offsetZ !== undefined
            ) {
              // Position initiale basée sur les offsets du cluster
              node.x = node.offsetX;
              node.y = node.offsetY;
              node.z = node.offsetZ;

              if (node.type === "platform") {
                node.y += 20;
              } else if (node.type === "character") {
                if (!node.id.includes("_")) {
                  // Personnage central - déjà au centre de son cluster
                } else {
                  // Personnage secondaire
                  const angle = Math.random() * Math.PI * 2;
                  const radius = 30 + Math.random() * 20;

                  node.x += Math.cos(angle) * radius;
                  node.z += Math.sin(angle) * radius;
                }
              }

              // Perturbation aléatoire réduite
              node.x += (Math.random() - 0.5) * 5;
              node.y += (Math.random() - 0.5) * 5;
              node.z += (Math.random() - 0.5) * 5;
            }
          }
          return false;
        }}
        d3Force={(engine) => {
          // Force de charge (répulsion entre nœuds)
          engine
            .force("charge")
            .strength((node) => (node.type === "platform" ? -30 : -40))
            .distanceMax(100);

          // Force de centre
          engine.force("center").strength(0.05);

          // Force des liens
          engine.force("link").strength((link) => {
            const sourceId =
              typeof link.source === "object" ? link.source.id : link.source;
            const targetId =
              typeof link.target === "object" ? link.target.id : link.target;

            // Utiliser nodeMap pour recherche rapide
            const sourceNode = nodeMap[sourceId];
            const targetNode = nodeMap[targetId];

            if (
              (sourceNode?.type === "platform" &&
                targetNode?.type === "character") ||
              (sourceNode?.type === "character" &&
                targetNode?.type === "platform")
            ) {
              return 0.7;
            }

            return 0.5;
          });

          // Force de collision
          engine.force("collision", d3.forceCollide().radius(10).strength(0.7));

          // Combiner les forces de platformPositioning, cluster, et interCluster pour optimiser
          engine.force("combinedForces", (alpha) => {
            // Précalculer les centroïdes des clusters dans une seule passe
            const centroids = {};
            const getPlatformConnections = nodeConnections;

            // Calculer les centres de chaque cluster
            displayData.nodes.forEach((node) => {
              if (node.cluster === undefined) return;

              if (!centroids[node.cluster]) {
                centroids[node.cluster] = { x: 0, y: 0, z: 0, count: 0 };
              }

              centroids[node.cluster].x += node.x || 0;
              centroids[node.cluster].y += node.y || 0;
              centroids[node.cluster].z += node.z || 0;
              centroids[node.cluster].count++;
            });

            // Normaliser les centroïdes
            Object.keys(centroids).forEach((cluster) => {
              const c = centroids[cluster];
              if (c.count > 0) {
                c.x /= c.count;
                c.y /= c.count;
                c.z /= c.count;
              }
            });

            // 1. Gérer le positionnement des plateformes
            const platformStrength = 0.2 * alpha;

            // 2. Gérer les forces de cluster
            const clusterStrength = 0.3 * alpha;
            const platformClusterStrength = 0.2 * alpha;

            // 3. Gérer la répulsion entre clusters
            const repulsionStrength = 0.5 * alpha;
            const minDistance = 200;

            // Appliquer toutes les forces en une seule passe sur chaque nœud
            displayData.nodes.forEach((node) => {
              // PARTIE 1: Positionnement des plateformes
              if (node.type === "platform") {
                const connectedCharacters =
                  nodeConnections[node.id]?.filter((connId) => {
                    return nodeMap[connId]?.type === "character";
                  }) || [];

                if (connectedCharacters.length >= 2) {
                  let centerX = 0,
                    centerY = 0,
                    centerZ = 0;
                  let count = 0;

                  connectedCharacters.forEach((charId) => {
                    const charNode = nodeMap[charId];
                    if (
                      charNode &&
                      charNode.x !== undefined &&
                      charNode.y !== undefined &&
                      charNode.z !== undefined
                    ) {
                      centerX += charNode.x;
                      centerY += charNode.y;
                      centerZ += charNode.z;
                      count++;
                    }
                  });

                  if (count > 0) {
                    centerX /= count;
                    centerY /= count;
                    centerZ /= count;

                    node.vx =
                      (node.vx || 0) +
                      (centerX - (node.x || 0)) * platformStrength;
                    node.vy =
                      (node.vy || 0) +
                      (centerY + 15 - (node.y || 0)) * platformStrength;
                    node.vz =
                      (node.vz || 0) +
                      (centerZ - (node.z || 0)) * platformStrength;
                  }
                }
              }

              // PARTIE 2: Force de cluster
              if (node.cluster !== undefined) {
                const centroid = centroids[node.cluster];
                if (centroid) {
                  const strength =
                    node.type === "platform"
                      ? platformClusterStrength
                      : clusterStrength;

                  node.vx =
                    (node.vx || 0) + (centroid.x - (node.x || 0)) * strength;
                  node.vy =
                    (node.vy || 0) + (centroid.y - (node.y || 0)) * strength;
                  node.vz =
                    (node.vz || 0) + (centroid.z - (node.z || 0)) * strength;
                }
              }
            });

            // PARTIE 3: Répulsion entre clusters (ne peut pas être combinée dans la même boucle)
            const clusters = Object.keys(centroids);
            for (let i = 0; i < clusters.length; i++) {
              for (let j = i + 1; j < clusters.length; j++) {
                const c1 = centroids[clusters[i]];
                const c2 = centroids[clusters[j]];

                const dx = c2.x - c1.x;
                const dy = c2.y - c1.y;
                const dz = c2.z - c1.z;

                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (distance === 0) continue;

                const force = Math.min(
                  1,
                  Math.max(0, (minDistance - distance) / minDistance)
                );
                if (force <= 0) continue;

                const forceX = (dx / distance) * force * repulsionStrength;
                const forceY = (dy / distance) * force * repulsionStrength;
                const forceZ = (dz / distance) * force * repulsionStrength;

                // Appliquer la répulsion mais seulement sur un échantillon de nœuds pour optimiser
                // (50% des nœuds par cluster maximum)
                const cluster1 = parseInt(clusters[i]);
                const cluster2 = parseInt(clusters[j]);

                displayData.nodes.forEach((node, idx) => {
                  if (node.cluster === undefined) return;

                  // N'appliquer la force qu'à 1 nœud sur 2 pour gagner en performance
                  if (idx % 2 !== 0) return;

                  if (node.cluster === cluster1) {
                    node.vx = (node.vx || 0) - forceX;
                    node.vy = (node.vy || 0) - forceY;
                    node.vz = (node.vz || 0) - forceZ;
                  } else if (node.cluster === cluster2) {
                    node.vx = (node.vx || 0) + forceX;
                    node.vy = (node.vy || 0) + forceY;
                    node.vz = (node.vz || 0) + forceZ;
                  }
                });
              }
            }
          });
        }}
        nodeThreeObject={(node) => createNodeObject(node)}
        linkThreeObject={(link) => {
          // Obtenir les positions réelles des nœuds avec nodeMap
          const sourceId =
            typeof link.source === "object" ? link.source.id : link.source;
          const targetId =
            typeof link.target === "object" ? link.target.id : link.target;

          const sourceNode = nodeMap[sourceId] || {};
          const targetNode = nodeMap[targetId] || {};

          // Créer des positions avec des coordonnées par défaut
          const sourcePos = {
            x: sourceNode.x || 0,
            y: sourceNode.y || 0,
            z: sourceNode.z || 0,
            ...sourceNode,
          };

          const targetPos = {
            x: targetNode.x || 0,
            y: targetNode.y || 0,
            z: targetNode.z || 0,
            ...targetNode,
          };

          // Créer l'objet lien avec les positions des nœuds
          return null;
          return createLinkObject(link, sourcePos, targetPos);
        }}
        linkPositionUpdate={(linkObj, { start, end }, link) => {
          // updateLinkPosition(linkObj, start, end);
          return true;
        }}
      />
    </ForceGraphContext.Provider>
  );
});

export default ForceGraphComponent;
