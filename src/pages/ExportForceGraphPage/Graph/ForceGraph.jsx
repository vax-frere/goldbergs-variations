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
import { Html, Text } from "@react-three/drei";
import * as d3 from "d3";
// import { COLORS } from "./Node/Node"; // Non utilisé car tous les nodes sont blancs sauf cluster masters
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

// Contexte pour l'affichage d'informations UI (simplifié)
export const ForceGraphContext = createContext(null);

// Composant pour afficher les axes helper
const AxesHelper = ({ size = 100 }) => {
  const { scene } = useThree();

  useEffect(() => {
    const axesHelper = new THREE.AxesHelper(size);
    scene.add(axesHelper);

    return () => {
      scene.remove(axesHelper);
    };
  }, [scene, size]);

  return null;
};

// Tableau des districts avec leurs couleurs (même que dans Game2/Graph.jsx)
const DISTRICTS = [
  { text: "Libertarians", position: [250, 200, -250], color: "#c0392b" },
  { text: "Antisystem", position: [-200, 250, 0], color: "#f39c12" },
  { text: "Conservatives", position: [250, -200, 200], color: "#d35400" },
  { text: "Nationalists", position: [-250, -150, -250], color: "#27ae60" },
  { text: "Religious", position: [200, 250, 150], color: "#fff8e" },
  { text: "Culture", position: [-300, 100, 250], color: "#3498db" },
  { text: "Social justice", position: [0, -250, 0], color: "#44adfff" },
];

// Couleurs de clusters supprimées car tous les nodes sont blancs sauf cluster masters
// const clusterColors = [ ... ];

// Composant pour afficher le nom d'un cluster
const ClusterLabel = ({ position, text, color }) => {
  if (!position || !text) return null;

  return (
    <Text
      position={[position.x, position.y + 30, position.z]}
      fontSize={50}
      color={color || "#ffffff"}
      anchorX="center"
      anchorY="middle"
      material-transparent={true}
      material-depthWrite={false}
      outlineWidth={2}
      outlineColor="black"
    >
      {text}
    </Text>
  );
};

// Composant principal du graphe 3D - simplifié sans gestion de caméra ni nœuds
const ForceGraphComponent = forwardRef((props, ref) => {
  const { graphData = { nodes: [], links: [] } } = props;
  const isLoadingGraph = !graphData?.nodes?.length;
  const graphError = props.graphError || null;
  const fgRef = useRef();
  const repositionedRef = useRef(false); // Flag pour indiquer si le repositionnement a été effectué

  // Variable supprimée car non utilisée
  // const nodeMap = useMemo(() => { ... }, [graphData]);

  // Calculer les centroïdes et trouver les cluster masters de chaque cluster
  const clusterInfo = useMemo(() => {
    if (!graphData?.nodes?.length)
      return {
        centroids: {},
        mainPersonas: {},
        clusterDistricts: {},
        clusterMasters: {},
      };

    const clusters = {};
    const centroids = {};
    const mainPersonas = {};
    const clusterDistricts = {}; // Map cluster -> thematicGroup du cluster master
    const clusterMasters = {}; // Map cluster -> node cluster master

    // ÉTAPE 1: Identifier d'abord tous les cluster masters
    graphData.nodes.forEach((node) => {
      if (node.cluster === undefined) return;

      // Identifier les cluster masters
      if (node.type === "character" && node.isClusterMaster === true) {
        clusterMasters[node.cluster] = node;
        mainPersonas[node.cluster] = node.name;

        // Associer le cluster au thematicGroup du cluster master
        if (node.thematicGroup) {
          clusterDistricts[node.cluster] = node.thematicGroup;
          console.log(
            `🎯 Cluster ${node.cluster} → District "${node.thematicGroup}" (Master: ${node.name})`
          );
        } else {
          console.warn(
            `⚠️ Cluster Master ${node.name} (cluster ${node.cluster}) n'a pas de thematicGroup`
          );
        }
      }
    });

    // ÉTAPE 2: Traiter tous les nodes et calculer les centroïdes
    graphData.nodes.forEach((node) => {
      if (node.cluster === undefined) return;

      // Initialiser les structures pour ce cluster si nécessaire
      if (!clusters[node.cluster]) {
        clusters[node.cluster] = [];
        centroids[node.cluster] = { x: 0, y: 0, z: 0, count: 0 };
      }

      // Ajouter le nœud à son cluster
      clusters[node.cluster].push(node);

      // Ajouter à la somme pour le calcul du centroïde (si coordonnées définies)
      if (
        node.x !== undefined &&
        node.y !== undefined &&
        node.z !== undefined
      ) {
        centroids[node.cluster].x += node.x;
        centroids[node.cluster].y += node.y;
        centroids[node.cluster].z += node.z;
        centroids[node.cluster].count++;
      }
    });

    // ÉTAPE 3: Normaliser les centroïdes
    Object.keys(centroids).forEach((cluster) => {
      const c = centroids[cluster];
      if (c.count > 0) {
        c.x /= c.count;
        c.y /= c.count;
        c.z /= c.count;
      }
    });

    // ÉTAPE 4: Vérifier que tous les clusters ont un master
    const allClusters = Object.keys(clusters);
    const clustersWithMasters = Object.keys(clusterMasters);
    const clustersWithoutMasters = allClusters.filter(
      (c) => !clustersWithMasters.includes(c)
    );

    if (clustersWithoutMasters.length > 0) {
      console.warn(
        `⚠️ ${clustersWithoutMasters.length} clusters sans cluster master:`,
        clustersWithoutMasters
      );
    }

    // Debug: Afficher les associations cluster -> district
    console.log("🏛️ Associations Cluster -> District:", clusterDistricts);
    console.log(
      "👥 Cluster Masters par cluster:",
      Object.fromEntries(
        Object.entries(clusterMasters).map(([cluster, master]) => [
          cluster,
          master.name,
        ])
      )
    );
    console.log(
      `📊 Total: ${
        Object.keys(clusterDistricts).length
      } clusters avec district assigné sur ${
        allClusters.length
      } clusters trouvés (41 attendus)`
    );

    // Vérification finale
    if (Object.keys(clusterMasters).length !== 41) {
      console.warn(
        `⚠️ ATTENTION: ${
          Object.keys(clusterMasters).length
        } cluster masters trouvés au lieu de 41 attendus`
      );

      // Lister les cluster masters trouvés pour debug
      console.log("🔍 Cluster Masters trouvés:");
      Object.entries(clusterMasters).forEach(([cluster, master]) => {
        console.log(
          `  - Cluster ${cluster}: ${master.name} (${
            master.thematicGroup || "pas de thematicGroup"
          })`
        );
      });
    } else {
      console.log(`✅ Parfait: 41 cluster masters trouvés comme attendu`);
    }

    return { centroids, mainPersonas, clusterDistricts, clusterMasters };
  }, [graphData]);

  // Exposer des méthodes via la référence
  useImperativeHandle(
    ref,
    () => ({
      // Méthode pour récupérer les positions des noeuds
      getNodesPositions: () => {
        if (!fgRef.current || !graphData?.nodes) {
          console.warn(
            "Impossible de récupérer les positions des noeuds - références manquantes"
          );
          return [];
        }

        try {
          const graphInstance = fgRef.current;
          const nodeObjects = graphInstance.__nodeObjects || {};
          const d3NodeMap = graphInstance.graphData?.nodes
            ? new Map(graphInstance.graphData.nodes.map((n) => [n.id, n]))
            : new Map();

          // Fusionner les données avec les positions actuelles
          return graphData.nodes.map((node) => {
            const nodeObj = nodeObjects[node.id];
            const clusterProps = {
              cluster: node.cluster,
              offsetX: node.offsetX,
              offsetY: node.offsetY,
              offsetZ: node.offsetZ,
            };

            // Priorité aux positions du graphe 3D
            if (nodeObj?.position) {
              return {
                ...node,
                ...clusterProps,
                x: nodeObj.position.x,
                y: nodeObj.position.y,
                z: nodeObj.position.z,
              };
            }

            // Sinon utiliser les positions du graphe D3
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

            // En dernier recours, utiliser les données du nœud
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
          return graphData.nodes.map((node) => ({
            ...node,
            cluster: node.cluster,
            offsetX: node.offsetX,
            offsetY: node.offsetY,
            offsetZ: node.offsetZ,
            x: node.x || node.coordinates?.x || 0,
            y: node.y || node.coordinates?.y || 0,
            z: node.z || node.coordinates?.z || 0,
          }));
        }
      },

      // Indique si le graphe est stabilisé
      isStabilized: () => !fgRef.current?.d3Force("simulation")?.alpha(),

      // Force la stabilisation du graphe
      stabilize: () => {
        const simulation = fgRef.current?.d3Force("simulation");
        if (simulation) {
          simulation.alpha(0);
          simulation.stop();
        }
      },

      // Méthode pour libérer les positions fixées (permettre le mouvement libre)
      unfixPositions: () => {
        if (fgRef.current) {
          const simulation = fgRef.current.d3Force("simulation");
          if (simulation) {
            const nodes = simulation.nodes();
            nodes.forEach((node) => {
              if (node.fx !== undefined) {
                delete node.fx;
                delete node.fy;
                delete node.fz;
              }
            });
            console.log(
              "🔓 Positions libérées - les nodes peuvent maintenant bouger librement"
            );
            simulation.alpha(0.3);
            simulation.restart();
          }
        }
      },
    }),
    [graphData]
  );

  // Déterminer quelles données afficher
  const displayData = graphError || !graphData ? null : graphData;

  // Vérifier si les données sont vraiment disponibles et complètes
  const dataIsReady =
    !isLoadingGraph &&
    displayData?.nodes?.length > 0 &&
    displayData?.links?.length > 0;

  // Variable supprimée car non utilisée
  // const nodeConnections = useMemo(() => { ... }, [displayData]);

  useEffect(() => {
    console.log(
      "🔄 useEffect déclenché, dataIsReady:",
      dataIsReady,
      "clusterMasters:",
      Object.keys(clusterInfo.clusterMasters || {}).length
    );

    if (!dataIsReady) {
      console.log("❌ dataIsReady est false, arrêt de useEffect");
      return;
    }

    if (
      !clusterInfo.clusterMasters ||
      Object.keys(clusterInfo.clusterMasters).length === 0
    ) {
      console.log("❌ clusterInfo.clusterMasters vide, arrêt de useEffect");
      return;
    }

    console.log(
      "✅ dataIsReady est true, configuration du repositionnement..."
    );
    console.log(
      "📊 clusterInfo.clusterMasters:",
      Object.keys(clusterInfo.clusterMasters || {}).length
    );
    console.log(
      "📊 clusterInfo.clusterDistricts:",
      Object.keys(clusterInfo.clusterDistricts || {}).length
    );

    // Reset du flag de repositionnement quand les données changent
    repositionedRef.current = false;

    // Configuration des forces D3 pour améliorer la séparation des districts
    const setupDistrictForces = (attempt = 1) => {
      console.log(`🚀 setupDistrictForces appelé (tentative ${attempt})`);

      if (!fgRef.current) {
        console.warn("❌ fgRef.current n'est pas disponible");
        if (attempt < 10) {
          console.log(`⏳ Nouvelle tentative dans 1s...`);
          setTimeout(() => setupDistrictForces(attempt + 1), 1000);
        }
        return;
      }

      // Debug: voir ce qui est disponible dans fgRef.current
      console.log("🔍 fgRef.current:", fgRef.current);
      console.log("🔍 fgRef.current.d3Force:", typeof fgRef.current.d3Force);

      // Essayons différents noms de forces
      const forceNames = [
        "simulation",
        "link",
        "charge",
        "center",
        "x",
        "y",
        "z",
      ];
      forceNames.forEach((name) => {
        const force = fgRef.current.d3Force(name);
        console.log(`🔍 d3Force("${name}"):`, force ? "TROUVÉ" : "undefined");
      });

      // Essayons d'accéder directement à la simulation
      let simulation = fgRef.current.d3Force("simulation");

      // Si pas trouvé, essayons sans paramètre ou avec d'autres noms
      if (!simulation) {
        simulation = fgRef.current.d3Force();
        console.log("🔍 d3Force() sans paramètre:", simulation);
      }

      if (!simulation) {
        // Essayons d'accéder via les forces existantes
        const linkForce = fgRef.current.d3Force("link");
        const chargeForce = fgRef.current.d3Force("charge");
        const centerForce = fgRef.current.d3Force("center");

        console.log("🔍 linkForce:", linkForce);
        console.log("🔍 chargeForce:", chargeForce);
        console.log("🔍 centerForce:", centerForce);

        // Vérifions si les forces ont des propriétés utiles
        if (linkForce) {
          console.log("🔍 linkForce.nodes:", typeof linkForce.nodes);
          console.log("🔍 linkForce.links:", typeof linkForce.links);
        }

        if (chargeForce) {
          console.log("🔍 chargeForce.nodes:", typeof chargeForce.nodes);
        }

        if (centerForce) {
          console.log("🔍 centerForce.nodes:", typeof centerForce.nodes);
        }

        // Dans D3, les forces ont une référence vers leur simulation
        if (linkForce && linkForce.simulation) {
          simulation = linkForce.simulation;
          console.log("🔍 simulation via linkForce:", simulation);
        } else if (chargeForce && chargeForce.simulation) {
          simulation = chargeForce.simulation;
          console.log("🔍 simulation via chargeForce:", simulation);
        } else if (centerForce && centerForce.simulation) {
          simulation = centerForce.simulation;
          console.log("🔍 simulation via centerForce:", simulation);
        }

        // Essayons aussi d'accéder via des propriétés internes
        if (!simulation && fgRef.current.__simulation) {
          simulation = fgRef.current.__simulation;
          console.log("🔍 simulation via __simulation:", simulation);
        }

        if (!simulation && fgRef.current._simulation) {
          simulation = fgRef.current._simulation;
          console.log("🔍 simulation via _simulation:", simulation);
        }
      }

      // Si nous n'avons pas trouvé la simulation, essayons de travailler directement avec les forces
      if (!simulation) {
        console.log(
          "🔄 Pas de simulation trouvée, essayons de travailler avec les forces directement..."
        );

        const linkForce = fgRef.current.d3Force("link");
        if (
          linkForce &&
          linkForce.links &&
          typeof linkForce.links === "function"
        ) {
          const links = linkForce.links();
          console.log("🔍 Links trouvés:", links.length);

          if (links.length > 0) {
            // Extraire les nodes des links
            const nodesSet = new Set();
            links.forEach((link) => {
              if (link.source) nodesSet.add(link.source);
              if (link.target) nodesSet.add(link.target);
            });
            const nodes = Array.from(nodesSet);
            console.log("🔍 Nodes extraits des links:", nodes.length);

            if (nodes.length > 0) {
              // Créer un objet simulation factice
              simulation = {
                nodes: () => nodes,
                alpha: () => 0.3,
                restart: () => {
                  console.log("🔄 Simulation restart simulé");
                  if (fgRef.current.d3ReheatSimulation) {
                    fgRef.current.d3ReheatSimulation();
                  }
                },
                force: (name, force) => {
                  if (force === undefined) {
                    // Getter - retourner la force existante ou null
                    return fgRef.current.d3Force(name) || null;
                  } else {
                    // Setter - ajouter la force via fgRef
                    console.log(
                      `🔧 Ajout de la force "${name}" via fgRef.current.d3Force`
                    );
                    return fgRef.current.d3Force(name, force);
                  }
                },
              };
              console.log(
                "✅ Simulation factice créée avec",
                nodes.length,
                "nodes"
              );
            }
          }
        }

        if (!simulation) {
          console.warn("❌ Impossible de créer une simulation, même factice");
          if (attempt < 10) {
            console.log(`⏳ Nouvelle tentative dans 1s...`);
            setTimeout(() => setupDistrictForces(attempt + 1), 1000);
          }
          return;
        }
      }

      console.log(
        "✅ Simulation D3 trouvée, nombre de nodes:",
        simulation.nodes().length
      );
      console.log(
        "✅ clusterInfo disponible:",
        Object.keys(clusterInfo.clusterMasters).length,
        "cluster masters"
      );

      // ÉTAPE 1: Repositionner immédiatement les clusters selon le thematicGroup de leur cluster master
      const repositionClustersByDistrict = () => {
        const nodes = simulation.nodes();
        console.log(
          "🔄 Repositionnement des clusters par district basé sur les cluster masters..."
        );

        // Test de la fonction getDistrictPosition
        console.log("🧪 Test des positions de districts:");
        DISTRICTS.forEach((district) => {
          const pos = getDistrictPosition(district.text);
          console.log(`  ${district.text}: [${pos.join(", ")}]`);
        });

        console.log("📊 Nodes dans la simulation:", nodes.length);
        console.log(
          "📊 Clusters avec masters:",
          Object.keys(clusterInfo.clusterMasters)
        );
        console.log(
          "📊 Clusters avec districts:",
          Object.keys(clusterInfo.clusterDistricts)
        );

        // Compter les repositionnements par cluster
        const repositionedClusters = new Set();
        let repositionedNodesCount = 0;

        nodes.forEach((node, index) => {
          // Debug pour les premiers nodes
          if (index < 5) {
            console.log(
              `🔍 Node ${index}: cluster=${
                node.cluster
              }, hasMaster=${!!clusterInfo.clusterMasters[
                node.cluster
              ]}, hasDistrict=${!!clusterInfo.clusterDistricts[node.cluster]}`
            );
          }

          // Vérifier que le cluster a un master et un district assigné
          if (
            node.cluster !== undefined &&
            clusterInfo.clusterMasters[node.cluster] &&
            clusterInfo.clusterDistricts[node.cluster]
          ) {
            const clusterMaster = clusterInfo.clusterMasters[node.cluster];
            const clusterThematicGroup =
              clusterInfo.clusterDistricts[node.cluster];
            const districtPosition = getDistrictPosition(clusterThematicGroup);

            // Log seulement une fois par cluster avec informations du master
            if (!repositionedClusters.has(node.cluster)) {
              const oldPos = `[${node.x?.toFixed(1) || "undefined"}, ${
                node.y?.toFixed(1) || "undefined"
              }, ${node.z?.toFixed(1) || "undefined"}]`;
              console.log(
                `📍 Cluster ${node.cluster} (Master: ${
                  clusterMaster.name
                }, District: ${clusterThematicGroup}): ${oldPos} → [${districtPosition.join(
                  ", "
                )}]`
              );
              repositionedClusters.add(node.cluster);
            }

            // Position de base du district pour ce cluster
            const baseX = districtPosition[0];
            const baseY = districtPosition[1];
            const baseZ = districtPosition[2];

            // Dispersion cohérente pour tout le cluster
            const clusterSeed = node.cluster * 1000;
            const spreadRadius = 150;
            const clusterAngle = (clusterSeed % 360) * (Math.PI / 180);
            const clusterDistance = (clusterSeed % 100) * (spreadRadius / 100);

            // Nouvelle position du cluster
            const clusterX = baseX + Math.cos(clusterAngle) * clusterDistance;
            const clusterY = baseY + ((clusterSeed % 200) - 100);
            const clusterZ = baseZ + Math.sin(clusterAngle) * clusterDistance;

            // Dispersion individuelle au sein du cluster
            let nodeX = clusterX;
            let nodeY = clusterY;
            let nodeZ = clusterZ;

            if (
              node.offsetX !== undefined &&
              node.offsetY !== undefined &&
              node.offsetZ !== undefined
            ) {
              // Utiliser les offsets relatifs du cluster pour la dispersion interne
              nodeX += node.offsetX * 0.2; // Réduire l'influence des offsets
              nodeY += node.offsetY * 0.2;
              nodeZ += node.offsetZ * 0.2;
            } else {
              // Dispersion aléatoire réduite pour les nodes sans offsets
              const nodeAngle = Math.random() * Math.PI * 2;
              const nodeDistance = Math.random() * 50;
              nodeX += Math.cos(nodeAngle) * nodeDistance;
              nodeZ += Math.sin(nodeAngle) * nodeDistance;
              nodeY += (Math.random() - 0.5) * 30;
            }

            // Ajustement selon le type
            if (node.type === "platform") {
              nodeY += 20;
            } else if (node.type === "character" && node.id.includes("_")) {
              // Personnage secondaire - plus proche du centre du cluster
              const secondaryAngle = Math.random() * Math.PI * 2;
              const secondaryRadius = 15 + Math.random() * 10;
              nodeX += Math.cos(secondaryAngle) * secondaryRadius;
              nodeZ += Math.sin(secondaryAngle) * secondaryRadius;
            }

            // FORCER la nouvelle position
            const oldX = node.x;
            const oldY = node.y;
            const oldZ = node.z;

            node.x = nodeX;
            node.y = nodeY;
            node.z = nodeZ;

            // Debug: Afficher le changement de position pour quelques nodes
            if (Math.random() < 0.01) {
              // 1% des nodes pour éviter trop de logs
              console.log(
                `🔄 Node ${node.id}: [${oldX?.toFixed(1)}, ${oldY?.toFixed(
                  1
                )}, ${oldZ?.toFixed(1)}] → [${nodeX.toFixed(
                  1
                )}, ${nodeY.toFixed(1)}, ${nodeZ.toFixed(1)}]`
              );
            }

            // Réinitialiser les vitesses pour éviter les mouvements erratiques
            node.vx = 0;
            node.vy = 0;
            node.vz = 0;

            repositionedNodesCount++;
          }
        });

        // Afficher un résumé des repositionnements
        const clusterList = Object.keys(clusterInfo.clusterDistricts);
        const totalNodes = nodes.length;

        console.log("✅ Repositionnement terminé");
        console.log(
          `📊 Résumé: ${repositionedNodesCount}/${totalNodes} nodes repositionnés dans ${clusterList.length} clusters avec cluster master`
        );
        console.log(
          "🏛️ Districts utilisés:",
          Object.values(clusterInfo.clusterDistricts)
        );
        console.log(
          `🎯 Clusters repositionnés:`,
          Array.from(repositionedClusters).sort((a, b) => a - b)
        );

        // Marquer le repositionnement comme terminé
        repositionedRef.current = true;

        // Ne pas fixer les positions - laisser les forces personnalisées maintenir le positionnement
        console.log(
          "🌊 Positions repositionnées, les forces personnalisées maintiendront l'organisation par districts"
        );

        // Redémarrer la simulation avec une énergie modérée
        simulation.alpha(0.3);
        simulation.restart();
      };

      // Appliquer le repositionnement immédiatement
      repositionClustersByDistrict();

      // Force de séparation entre clusters de districts différents + distribution sphérique globale
      const districtSeparationForce = (alpha) => {
        const nodes = simulation.nodes();
        const sphereRadius = 600; // Rayon de la sphère globale
        const sphereCenter = { x: 0, y: 0, z: 0 }; // Centre de la sphère

        // PARTIE 1: Force de distribution sphérique globale pour tous les clusters
        // Calculer les centres de chaque cluster
        const clusterCenters = {};
        const clusterNodeCounts = {};

        nodes.forEach((node) => {
          if (node.cluster === undefined) return;

          if (!clusterCenters[node.cluster]) {
            clusterCenters[node.cluster] = { x: 0, y: 0, z: 0 };
            clusterNodeCounts[node.cluster] = 0;
          }

          clusterCenters[node.cluster].x += node.x;
          clusterCenters[node.cluster].y += node.y;
          clusterCenters[node.cluster].z += node.z;
          clusterNodeCounts[node.cluster]++;
        });

        // Normaliser les centres de clusters
        Object.keys(clusterCenters).forEach((clusterId) => {
          const center = clusterCenters[clusterId];
          const count = clusterNodeCounts[clusterId];
          if (count > 0) {
            center.x /= count;
            center.y /= count;
            center.z /= count;
          }
        });

        // Appliquer la force sphérique sur chaque cluster
        const clusterIds = Object.keys(clusterCenters);
        clusterIds.forEach((clusterId, index) => {
          // Calculer la position idéale sur la sphère pour ce cluster
          // Distribution uniforme basée sur l'index du cluster
          const phi = Math.acos(1 - (2 * (index + 0.5)) / clusterIds.length); // Angle polaire
          const theta = Math.PI * (1 + Math.sqrt(5)) * index; // Angle azimutal (spirale dorée)

          const idealX =
            sphereCenter.x + sphereRadius * Math.sin(phi) * Math.cos(theta);
          const idealY = sphereCenter.y + sphereRadius * Math.cos(phi);
          const idealZ =
            sphereCenter.z + sphereRadius * Math.sin(phi) * Math.sin(theta);

          // Appliquer la force vers la position idéale sur tous les nodes du cluster
          nodes.forEach((node) => {
            if (node.cluster == clusterId) {
              const dx = idealX - node.x;
              const dy = idealY - node.y;
              const dz = idealZ - node.z;

              const sphereForce = alpha * 0.01; // Force modérée vers la sphère
              node.vx += dx * sphereForce;
              node.vy += dy * sphereForce;
              node.vz += dz * sphereForce;
            }
          });
        });

        // PARTIE 2: Force de séparation entre clusters de districts différents (code original)
        nodes.forEach((nodeA) => {
          if (
            nodeA.cluster === undefined ||
            !clusterInfo.clusterDistricts[nodeA.cluster]
          )
            return;

          const clusterDistrictA = clusterInfo.clusterDistricts[nodeA.cluster];

          nodes.forEach((nodeB) => {
            if (
              nodeA === nodeB ||
              nodeB.cluster === undefined ||
              !clusterInfo.clusterDistricts[nodeB.cluster]
            )
              return;

            const clusterDistrictB =
              clusterInfo.clusterDistricts[nodeB.cluster];

            // Si les clusters sont dans des districts différents, les repousser
            if (clusterDistrictA !== clusterDistrictB) {
              const dx = nodeA.x - nodeB.x;
              const dy = nodeA.y - nodeB.y;
              const dz = nodeA.z - nodeB.z;
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

              if (distance < 400) {
                // Distance minimale entre clusters de districts différents
                const force = (alpha * 0.05 * (400 - distance)) / distance; // Réduit de 0.15 à 0.05
                const fx = dx * force;
                const fy = dy * force;
                const fz = dz * force;

                nodeA.vx += fx;
                nodeA.vy += fy;
                nodeA.vz += fz;
                nodeB.vx -= fx;
                nodeB.vy -= fy;
                nodeB.vz -= fz;
              }
            }
          });
        });
      };

      // Force d'attraction des clusters vers le centre de leur district
      const districtCenterForce = (alpha) => {
        const nodes = simulation.nodes();

        nodes.forEach((node) => {
          if (
            node.cluster === undefined ||
            !clusterInfo.clusterDistricts[node.cluster]
          )
            return;

          const clusterDistrict = clusterInfo.clusterDistricts[node.cluster];
          const districtPosition = getDistrictPosition(clusterDistrict);

          const dx = districtPosition[0] - node.x;
          const dy = districtPosition[1] - node.y;
          const dz = districtPosition[2] - node.z;

          const force = alpha * 0.02; // Force d'attraction vers le centre du district (équilibrée)
          node.vx += dx * force;
          node.vy += dy * force;
          node.vz += dz * force;
        });
      };

      // Force de cohésion interne des clusters
      const clusterCohesionForce = (alpha) => {
        const nodes = simulation.nodes();
        const clusterCenters = {};

        // Calculer les centres de chaque cluster
        nodes.forEach((node) => {
          if (node.cluster === undefined) return;

          if (!clusterCenters[node.cluster]) {
            clusterCenters[node.cluster] = { x: 0, y: 0, z: 0, count: 0 };
          }

          clusterCenters[node.cluster].x += node.x;
          clusterCenters[node.cluster].y += node.y;
          clusterCenters[node.cluster].z += node.z;
          clusterCenters[node.cluster].count++;
        });

        // Normaliser les centres
        Object.keys(clusterCenters).forEach((clusterId) => {
          const center = clusterCenters[clusterId];
          if (center.count > 0) {
            center.x /= center.count;
            center.y /= center.count;
            center.z /= center.count;
          }
        });

        // Appliquer la force de cohésion
        nodes.forEach((node) => {
          if (node.cluster === undefined || !clusterCenters[node.cluster])
            return;

          const center = clusterCenters[node.cluster];
          const dx = center.x - node.x;
          const dy = center.y - node.y;
          const dz = center.z - node.z;

          const force = alpha * 0.04; // Force de cohésion interne du cluster réduite (de 0.08 à 0.04)
          node.vx += dx * force;
          node.vy += dy * force;
          node.vz += dz * force;
        });
      };

      // Ajouter les forces personnalisées
      simulation.force("districtSeparation", districtSeparationForce);
      simulation.force("districtCenter", districtCenterForce);
      simulation.force("clusterCohesion", clusterCohesionForce);
    };

    // Configurer les forces après un délai pour s'assurer que la simulation est prête
    const timeoutId = setTimeout(setupDistrictForces, 1000);

    // Animation avec throttling pour améliorer la performance
    let animationFrameId;
    let lastFrameTime = 0;
    const frameInterval = 33; // 30 FPS environ

    const animate = (currentTime) => {
      if (currentTime - lastFrameTime > frameInterval && fgRef.current) {
        fgRef.current.tickFrame();
        lastFrameTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dataIsReady, clusterInfo]);

  // Afficher l'état de chargement/erreur si nécessaire
  if (!dataIsReady) return <Html center />;
  if (graphError) {
    return (
      <Html center>
        <div style={{ color: "red", fontSize: "18px", textAlign: "center" }}>
          Erreur de chargement: {graphError}
        </div>
      </Html>
    );
  }

  // Fonction pour obtenir la couleur d'un district par son nom
  const getDistrictPosition = (thematicGroup) => {
    const district = DISTRICTS.find((d) => d.text === thematicGroup);
    return district ? district.position : [500, 0, 0];
  };

  // Fonction pour obtenir la couleur d'un district par son nom
  const getDistrictColor = (thematicGroup) => {
    const district = DISTRICTS.find((d) => d.text === thematicGroup);
    return district ? district.color : "#ffffff"; // Blanc par défaut
  };

  // Fonctions pour le rendu du graphe
  const getNodeColor = (node) => {
    // SEULS les cluster masters sont colorés par district
    if (
      node.type === "character" &&
      node.isClusterMaster &&
      node.thematicGroup
    ) {
      console.log(
        `🎨 Cluster Master ${node.name} (${
          node.thematicGroup
        }) → ${getDistrictColor(node.thematicGroup)}`
      );
      return getDistrictColor(node.thematicGroup);
    }

    // Tous les autres nodes sont blancs
    return "#ffffff";
  };

  const getLinkColor = () => {
    // Tous les liens sont blancs/gris clair
    return "#aaaaaa";
  };

  // Fonction supprimée car nodePositionUpdate ne fonctionne pas dans cette version
  // const calculateNodePosition = (node) => { ... };

  return (
    <ForceGraphContext.Provider value={{}}>
      {/* Axes helper pour visualiser les axes X, Y, Z */}
      <AxesHelper size={200} />

      {/* Labels des districts */}
      {DISTRICTS.map((district, index) => (
        <ClusterLabel
          key={`district-${index}`}
          position={{
            x: district.position[0],
            y: district.position[1], // Légèrement au-dessus
            z: district.position[2],
          }}
          text={district.text}
          color={district.color}
        />
      ))}

      <R3fForceGraph
        ref={fgRef}
        graphData={displayData}
        nodeLabel="name"
        linkOpacity={0.3}
        showNavInfo={false}
        cooldownTicks={1000}
        cooldownTime={5000}
        backgroundColor="#000000"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.5}
        d3AlphaMin={0.001}
        forceEngine="d3"
        dagMode={null}
        nodeRelSize={25}
        linkDirectionalParticles={0}
        nodeVal={(node) => node.value || 1}
        nodeColor={getNodeColor}
        linkColor={getLinkColor}
        nodeAutoColorBy="cluster"
        // nodePositionUpdate ne semble pas fonctionner dans cette version
        nodeThreeObject={(node) => {
          // Pour les nœuds qui sont des représentants principaux de cluster
          if (
            node.type === "character" &&
            !node.id.includes("_") &&
            node.name &&
            node.cluster !== undefined
          ) {
            // Créer un groupe pour contenir à la fois le nœud et son label
            const group = new THREE.Group();

            // Ajouter le nœud standard
            const nodeObj = createNodeObject(node);
            group.add(nodeObj);

            // Couleur du texte : blanc pour tous les labels
            const textColor = "#ffffff";

            // Créer le label du cluster
            const labelMesh = new Text();
            labelMesh.text = node.name;
            labelMesh.fontSize = 50;
            labelMesh.color = textColor;
            labelMesh.anchorX = "center";
            labelMesh.anchorY = "middle";
            labelMesh.position.set(0, 50, 0); // Positionner au-dessus du nœud
            labelMesh.material.transparent = true;
            labelMesh.material.depthWrite = false;
            labelMesh.outlineWidth = 2;
            labelMesh.outlineColor = "black";

            group.add(labelMesh);
            return group;
          }

          // Pour les nœuds standards
          return createNodeObject(node);
        }}
        linkThreeObject={createLinkObject}
        linkPositionUpdate={(linkObj, { start, end }) => {
          updateLinkPosition(linkObj, start, end);
          return true;
        }}
      />
    </ForceGraphContext.Provider>
  );
});

export default ForceGraphComponent;
