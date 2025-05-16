import { useRef, useMemo, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import PulseEffect from "./effects/PulseEffect";

// Import des renderers
import { SphereRenderer, BillboardRenderer } from "./renderers";

// Import des constantes et fonctions utilitaires
import {
  SIZE,
  MIN_IMPACT_SIZE,
  MAX_IMPACT_SIZE,
  USE_IMPACT_SIZE,
  SPHERE_SEGMENTS,
  ANIMATION_AMPLITUDE,
  ANIMATION_SPEED,
  IDLE_MOVEMENT_SPEED_VARIATION,
  IDLE_MOVEMENT_MAX_DISTANCE,
  EXPLOSION_DURATION,
  EXPLOSION_STAGGER,
  EXPLOSION_PATH_VARIATION,
  SIZE_VARIATION_FACTOR,
  EXPLOSION_ARC_FACTOR,
  TRANSITION_DURATION,
} from "./utils/constants";

import {
  calculateGradientColorByDistance,
  calculateExplosionPositions,
  calculateOscillationPositions,
  easeOutCubic,
  easeOutExpo,
} from "./utils/animationUtils";

// Facteur d'agrandissement des coordonnées
const COORDINATES_SCALE_FACTOR = 3.75;

// ----------------------------------------------------------------------------------
// Types et documentation
// ----------------------------------------------------------------------------------
/**
 * @typedef {Object} Post
 * @property {string} id - ID unique du post
 * @property {string} slug - Slug du post
 * @property {string} content - Contenu du post
 *
 * Format 1: Coordonnées directement au niveau racine
 * @property {number} [x] - Position X
 * @property {number} [y] - Position Y
 * @property {number} [z] - Position Z
 *
 * Format 2: Coordonnées dans un objet imbriqué
 * @property {Object} [coordinates] - Coordonnées 3D du post
 * @property {number} [coordinates.x] - Position X
 * @property {number} [coordinates.y] - Position Y
 * @property {number} [coordinates.z] - Position Z
 *
 * @property {Array} color - Couleur RGB du post
 * @property {number} [impact] - Valeur d'impact du post (1-1000)
 * @property {boolean} [isJoshuaCharacter] - Indique si le post appartient à un personnage Joshua
 */

// ----------------------------------------------------------------------------------
// Composant principal Posts
// ----------------------------------------------------------------------------------
/**
 * Composant pour le rendu ultra-optimisé des posts en utilisant instancedMesh
 * @param {Object} props - Propriétés du composant
 * @param {Array} props.data - Données des posts (optionnel, si non fourni, le composant chargera ses propres données)
 * @param {string} [props.renderer="sphere"] - Type de renderer à utiliser ('sphere' ou 'billboard')
 * @param {string} [props.dataUrl="/data/spatialized_posts.data.json"] - URL du fichier JSON des posts à charger
 * @param {number} [props.explosionDuration=5] - Durée de l'animation d'explosion initiale en secondes
 * @param {number} [props.explosionStagger=EXPLOSION_STAGGER] - Décalage temporel entre les particules (0-1)
 * @param {number} [props.explosionPathVariation=EXPLOSION_PATH_VARIATION] - Variation des trajectoires durant l'explosion
 * @param {number} [props.sizeVariationFactor=SIZE_VARIATION_FACTOR] - Facteur de variation de la taille pendant l'explosion
 * @param {number} [props.explosionArcFactor=EXPLOSION_ARC_FACTOR] - Facteur pour l'amplitude des arcs durant l'explosion
 * @param {number} [props.transitionDuration=TRANSITION_DURATION] - Durée de la transition entre l'explosion et les positions finales
 */
export function Posts({
  data: externalData,
  renderer = "billboard",
  dataUrl = `${import.meta.env.BASE_URL}data/spatialized_posts.data.json`,
  explosionDuration = 5,
  explosionStagger = EXPLOSION_STAGGER,
  explosionPathVariation = EXPLOSION_PATH_VARIATION,
  sizeVariationFactor = SIZE_VARIATION_FACTOR,
  explosionArcFactor = EXPLOSION_ARC_FACTOR,
  transitionDuration = TRANSITION_DURATION,
}) {
  // ----------------------------------------------------------------------------------
  // Références et état
  // ----------------------------------------------------------------------------------
  // État pour stocker les données des posts
  const [localPostsData, setLocalPostsData] = useState([]);
  const [isLoading, setIsLoading] = useState(externalData ? false : true);
  const [error, setError] = useState(null);

  // État pour l'animation d'explosion
  const [animatedData, setAnimatedData] = useState([]);

  // Données à utiliser - soit externes (passées en props) soit locales (chargées par le composant)
  const data = externalData || localPostsData;

  // Références pour les instances et la caméra
  const meshRef = useRef();
  const { camera } = useThree();

  // Références pour l'animation
  const originalPositions = useRef([]); // Positions originales des points
  const originalSizes = useRef([]); // Tailles originales
  const originalColors = useRef([]); // Couleurs originales
  const tempObject = useMemo(() => new THREE.Object3D(), []); // Objet temporaire pour manipuler chaque instance

  // Références pour l'animation générale
  const timeRef = useRef(0);

  // Références pour l'animation d'explosion
  const explosionProgressRef = useRef(0);
  const explosionCompleteRef = useRef(false);
  const postExplosionTimeRef = useRef(0);
  const firstRenderRef = useRef(true);

  // ----------------------------------------------------------------------------------
  // Chargement des données
  // ----------------------------------------------------------------------------------
  // Charger les données des posts si aucune donnée externe n'est fournie
  useEffect(() => {
    // Ne pas charger si des données externes sont fournies
    if (externalData) return;

    const loadPostsData = async () => {
      try {
        setIsLoading(true);

        // Charger les données des posts depuis le fichier JSON
        const response = await fetch(dataUrl);

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const postsData = await response.json();

        // Valider et traiter les données
        if (Array.isArray(postsData)) {
          // Traiter les posts pour assurer que toutes les propriétés nécessaires sont présentes
          const processedPosts = postsData.map((post) => ({
            ...post,
            // S'assurer que les coordonnées sont correctes
            x: post.x !== undefined ? post.x : post.coordinates?.x || 0,
            y: post.y !== undefined ? post.y : post.coordinates?.y || 0,
            z: post.z !== undefined ? post.z : post.coordinates?.z || 0,
            // Initialiser d'autres propriétés si nécessaire
            isJoshuaCharacter: post.isJoshuaCharacter || false,
            color: post.color || [1.0, 1.0, 1.0],
            impact: post.impact || Math.random() * 100,
          }));

          console.log(`Posts chargés: ${processedPosts.length} posts`);
          setLocalPostsData(processedPosts);
        } else {
          throw new Error("Format de données des posts invalide");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement des posts:", err.message);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadPostsData();
  }, [externalData, dataUrl]);

  // ----------------------------------------------------------------------------------
  // Initialisation de l'animation d'explosion
  // ----------------------------------------------------------------------------------
  // Créer une copie animée des données où tous les points commencent au centre
  useEffect(() => {
    if (!data || data.length === 0) return;

    // Réinitialiser les états d'animation
    explosionProgressRef.current = 0;
    explosionCompleteRef.current = false;
    timeRef.current = 0;
    postExplosionTimeRef.current = 0;
    firstRenderRef.current = true;

    // Créer une copie des données avec tous les posts au centre
    const initialData = data.map((post) => ({
      ...post,
      // Sauvegarder les coordonnées originales dans des propriétés spéciales
      originalX:
        (post.x !== undefined ? post.x : post.coordinates?.x || 0) *
        COORDINATES_SCALE_FACTOR,
      originalY:
        (post.y !== undefined ? post.y : post.coordinates?.y || 0) *
        COORDINATES_SCALE_FACTOR,
      originalZ:
        (post.z !== undefined ? post.z : post.coordinates?.z || 0) *
        COORDINATES_SCALE_FACTOR,
      // Définir les coordonnées initiales au centre (0,0,0)
      x: 0,
      y: 0,
      z: 0,
      // Si post.coordinates existe, mettre également à jour
      ...(post.coordinates
        ? {
            coordinates: {
              ...post.coordinates,
              x: 0,
              y: 0,
              z: 0,
            },
          }
        : {}),
    }));

    setAnimatedData(initialData);
  }, [data]);

  // ----------------------------------------------------------------------------------
  // Mise à jour de l'animation d'explosion
  // ----------------------------------------------------------------------------------
  // Mettre à jour les positions des posts pendant l'animation
  useFrame((state, delta) => {
    // Mise à jour du temps global
    timeRef.current += delta;

    // Mise à jour du progrès de l'explosion
    if (!explosionCompleteRef.current) {
      explosionProgressRef.current += delta / explosionDuration;

      // Vérifier si l'explosion est terminée
      if (explosionProgressRef.current >= 1.0) {
        explosionProgressRef.current = 1.0;
        explosionCompleteRef.current = true;
        postExplosionTimeRef.current = 0;
      }

      // Mettre à jour les positions des posts pendant l'explosion
      if (data && data.length > 0 && animatedData.length > 0) {
        const updatedData = animatedData.map((post, index) => {
          // Positions originales
          const baseX = post.originalX;
          const baseY = post.originalY;
          const baseZ = post.originalZ;

          // Calculer la position basée sur l'animation d'explosion
          const result = calculateExplosionPositions({
            index,
            baseX,
            baseY,
            baseZ,
            baseSize: 1,
            isInTransition: false,
            progress: explosionProgressRef.current,
            stagger: explosionStagger,
            pathVariation: explosionPathVariation,
            arcFactor: explosionArcFactor,
            sizeVariationFactor,
          });

          return {
            ...post,
            x: result.finalX,
            y: result.finalY,
            z: result.finalZ,
            ...(post.coordinates
              ? {
                  coordinates: {
                    ...post.coordinates,
                    x: result.finalX,
                    y: result.finalY,
                    z: result.finalZ,
                  },
                }
              : {}),
          };
        });

        setAnimatedData(updatedData);

        // Pour que le SphereRenderer puisse afficher l'animation pendant l'explosion
        if (meshRef.current) {
          updatedData.forEach((post, index) => {
            if (index >= updatedData.length || !meshRef.current) return;

            // Déterminer la taille en fonction de l'impact
            let size = SIZE;
            if (
              USE_IMPACT_SIZE &&
              post.impact !== undefined &&
              !isNaN(post.impact) &&
              post.impact > 0
            ) {
              const impactValue = Math.max(1, Math.min(500, post.impact));
              const normalizedImpact = Math.log(impactValue) / Math.log(500);
              size =
                MIN_IMPACT_SIZE +
                normalizedImpact * (MAX_IMPACT_SIZE - MIN_IMPACT_SIZE);
            }

            // Appliquer les transformations à l'objet temporaire
            tempObject.position.set(post.x, post.y, post.z);
            tempObject.scale.set(size, size, size);
            tempObject.updateMatrix();

            // Mettre à jour la matrice de l'instance correspondante
            meshRef.current.setMatrixAt(index, tempObject.matrix);
          });

          // Marquer le tampon de matrice comme nécessitant une mise à jour
          if (meshRef.current.instanceMatrix) {
            meshRef.current.instanceMatrix.needsUpdate = true;
          }
        }
      }
    } else if (firstRenderRef.current) {
      // Une fois l'explosion terminée, remettre les posts à leurs positions finales
      firstRenderRef.current = false;

      // Restaurer les positions originales
      const finalData = animatedData.map((post) => ({
        ...post,
        x: post.originalX,
        y: post.originalY,
        z: post.originalZ,
        ...(post.coordinates
          ? {
              coordinates: {
                ...post.coordinates,
                x: post.originalX,
                y: post.originalY,
                z: post.originalZ,
              },
            }
          : {}),
      }));

      setAnimatedData(finalData);

      // Maintenir les posts à leurs positions finales après l'explosion
      if (meshRef.current) {
        finalData.forEach((post, index) => {
          if (index >= finalData.length || !meshRef.current) return;

          // Déterminer la taille en fonction de l'impact
          let size = SIZE;
          if (
            USE_IMPACT_SIZE &&
            post.impact !== undefined &&
            !isNaN(post.impact) &&
            post.impact > 0
          ) {
            const impactValue = Math.max(1, Math.min(500, post.impact));
            const normalizedImpact = Math.log(impactValue) / Math.log(500);
            size =
              MIN_IMPACT_SIZE +
              normalizedImpact * (MAX_IMPACT_SIZE - MIN_IMPACT_SIZE);
          }

          // Appliquer les transformations à l'objet temporaire avec la position finale
          tempObject.position.set(
            post.originalX,
            post.originalY,
            post.originalZ
          );
          tempObject.scale.set(size, size, size);
          tempObject.updateMatrix();

          // Mettre à jour la matrice de l'instance correspondante
          meshRef.current.setMatrixAt(index, tempObject.matrix);
        });

        // Marquer le tampon de matrice comme nécessitant une mise à jour
        if (meshRef.current.instanceMatrix) {
          meshRef.current.instanceMatrix.needsUpdate = true;
        }
      }
    }
  });

  // ----------------------------------------------------------------------------------
  // Initialisation des données des posts
  // ----------------------------------------------------------------------------------
  useEffect(() => {
    if (!data || !data.length) return;

    // Tableaux pour stocker les valeurs originales
    const positions = new Float32Array(data.length * 3);
    const sizes = new Float32Array(data.length);
    const colors = new Float32Array(data.length * 3);

    // Distance maximale pour le gradient de couleur
    const maxDistance = 1000;

    // Pour chaque post, initialiser les positions, tailles et couleurs
    data.forEach((post, index) => {
      // Extraire les coordonnées, soit directement, soit depuis le sous-objet coordinates
      const x =
        (post.x !== undefined ? post.x : post.coordinates?.x || 0) *
        COORDINATES_SCALE_FACTOR;
      const y =
        (post.y !== undefined ? post.y : post.coordinates?.y || 0) *
        COORDINATES_SCALE_FACTOR;
      const z =
        (post.z !== undefined ? post.z : post.coordinates?.z || 0) *
        COORDINATES_SCALE_FACTOR;

      // Stocker la position
      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      // Déterminer la taille en fonction de l'impact
      let size = SIZE;
      if (
        USE_IMPACT_SIZE &&
        post.impact !== undefined &&
        !isNaN(post.impact) &&
        post.impact > 0
      ) {
        const impactValue = Math.max(1, Math.min(500, post.impact));
        const normalizedImpact = Math.log(impactValue) / Math.log(500);
        size =
          MIN_IMPACT_SIZE +
          normalizedImpact * (MAX_IMPACT_SIZE - MIN_IMPACT_SIZE);
      }

      // Stocker la taille
      sizes[index] = size;

      // Utiliser la couleur du post ou générer une couleur basée sur la distance
      if (post.color && Array.isArray(post.color) && post.color.length >= 3) {
        colors[index * 3] = post.color[0];
        colors[index * 3 + 1] = post.color[1];
        colors[index * 3 + 2] = post.color[2];
      } else {
        // Calculer la couleur en fonction de la distance au centre
        let [r, g, b] = calculateGradientColorByDistance({
          x,
          y,
          z,
          maxDistance,
        });

        colors[index * 3] = r;
        colors[index * 3 + 1] = g;
        colors[index * 3 + 2] = b;
      }
    });

    // Stocker les valeurs originales
    originalPositions.current = positions;
    originalSizes.current = sizes;
    originalColors.current = colors;
  }, [data]);

  // ----------------------------------------------------------------------------------
  // Rendu
  // ----------------------------------------------------------------------------------
  // Afficher un indicateur de chargement si nécessaire
  if (isLoading) {
    return null;
  }

  // Gérer les erreurs
  if (error) {
    console.error("Erreur lors du chargement des posts:", error);
    return null;
  }

  // Ne rien afficher si pas de données
  if (!data || data.length === 0) {
    return null;
  }

  // Déterminer quelles données utiliser pour le rendu
  const renderData = animatedData.length > 0 ? animatedData : data;

  return (
    <>
      {/* Rendu des posts avec le renderer sélectionné */}
      {renderer === "sphere" ? (
        <SphereRenderer
          meshRef={meshRef}
          data={renderData}
          SPHERE_SEGMENTS={SPHERE_SEGMENTS}
          SIZE={SIZE}
          MIN_IMPACT_SIZE={MIN_IMPACT_SIZE}
          MAX_IMPACT_SIZE={MAX_IMPACT_SIZE}
        />
      ) : (
        <BillboardRenderer
          ref={meshRef}
          data={renderData}
          SIZE={SIZE}
          MIN_IMPACT_SIZE={MIN_IMPACT_SIZE}
          MAX_IMPACT_SIZE={MAX_IMPACT_SIZE}
        />
      )}
    </>
  );
}

export default Posts;
