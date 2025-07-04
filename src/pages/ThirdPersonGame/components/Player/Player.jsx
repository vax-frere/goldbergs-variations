/**
 * Composant Player - Personnage avec billboard animé
 * Respecte le principe Single Responsibility
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, useRapier } from '@react-three/rapier';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';

import { PLAYER_CONFIG, SPRITE_CONFIG } from '../../utils/constants';
import { SpriteAnimationSystem } from '../../systems/SpriteAnimationSystem';
import { inputSystem } from '../../systems/InputSystem';
import { physicsSystem } from '../../systems/PhysicsSystem';
import { loadYumeNikkiSpritesheet, analyzeSpritesheet } from '../../utils/spritesheetLoader';
import { createTestSpritesheet, downloadTestSpritesheet } from '../../utils/createTestSpritesheet';

const Player = ({ position = [0, 0, 0], onPositionChange, onRotationChange }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const spriteRef = useRef();
  const rigidBodyRef = useRef(); // Référence au RigidBody pour les collisions
  const debugArrowRef = useRef(); // Référence pour la flèche de debug
  const playerPosition = useRef(new THREE.Vector3(...position));
  const playerRotation = useRef(0); // Rotation Y du personnage
  const [animationSystem] = useState(() => new SpriteAnimationSystem());
  const [spriteTexture, setSpriteTexture] = useState(null);
  const [spritesheetParams, setSpritesheetParams] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook Rapier pour accéder à l'API de physique
  const { world } = useRapier();
  
  // Charger le vrai spritesheet Yume Nikki
  useEffect(() => {
    let isMounted = true;
    
    const loadSpritesheet = async () => {
      try {
        console.log('🎮 Player: Tentative de chargement du spritesheet Yume Nikki...');
        const texture = await loadYumeNikkiSpritesheet();
        
        if (isMounted) {
          console.log('🎮 Player: Spritesheet reçu, analyse en cours...');
          const params = analyzeSpritesheet(texture);
          
          console.log('🎮 Player: Configuration de la texture...');
          setSpriteTexture(texture);
          setSpritesheetParams(params);
          setIsLoading(false);
          
          console.log('✅ Player: Spritesheet Yume Nikki configuré avec succès !', {
            texture: texture,
            params: params,
            imageLoaded: texture.image && texture.image.complete
          });
        }
      } catch (error) {
        console.warn('⚠️ Player: Impossible de charger le spritesheet Yume Nikki, utilisation du spritesheet de test:', error);
        
        if (isMounted) {
          console.log('🔄 Player: Chargement du spritesheet de test...');
          // Fallback vers le spritesheet de test
          const testTexture = createTestSpritesheet();
          setSpriteTexture(testTexture);
          setSpritesheetParams({
            frameWidth: 140,
            frameHeight: 190,
            cols: 3,
            rows: 4,
            uvScaleX: 1/3,
            uvScaleY: 1/4
          });
          setIsLoading(false);
          console.log('✅ Player: Spritesheet de test configuré');
        }
      }
    };
    
    loadSpritesheet();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Enregistrement dans le système de physique
  useEffect(() => {
    const handlePlayerCollision = (otherObjectId, collisionData) => {
      console.log(`🚫 Player: Collision avec ${otherObjectId}`, collisionData);
      // Logique de réaction aux collisions (son, effet visuel, etc.)
    };

    physicsSystem.addCollisionCallback('player', handlePlayerCollision);
    
    return () => {
      physicsSystem.removeCollisionCallback('player');
    };
  }, []);

  // Synchronisation position initiale RigidBody
  useEffect(() => {
    if (rigidBodyRef.current && !isLoading) {
      // S'assurer que la position du RigidBody correspond à playerPosition.current
      const currentPos = rigidBodyRef.current.translation();
      playerPosition.current.set(currentPos.x, currentPos.y, currentPos.z);
      
      // Notifier la position initiale
      if (onPositionChange) {
        onPositionChange(playerPosition.current);
      }
      
      console.log('🎯 Player: Position initiale synchronisée', playerPosition.current);
    }
  }, [isLoading, onPositionChange]);

  // Gestionnaire pour les commandes de debug
  useEffect(() => {
    const handleDebugCommands = (type, key) => {
      if (type === 'debug_download_spritesheet' || key === 'KeyP') {
        console.log("Téléchargement du spritesheet de test...");
        downloadTestSpritesheet();
      }
    };

    inputSystem.addListener('player_debug', handleDebugCommands);
    
    return () => {
      inputSystem.removeListener('player_debug');
    };
  }, []);

  // Boucle de jeu principale avec collisions
  useFrame((state, deltaTime) => {
    if (!rigidBodyRef.current || !spriteTexture || isLoading) return;

    // Obtenir les inputs
    const movementVector = inputSystem.getMovementVector();
    const mouseDelta = inputSystem.getMouseDelta();
    
    // Rotation avec la souris (horizontal seulement)
    if (mouseDelta.x !== 0 && inputSystem.isMouseCaptured()) {
      playerRotation.current += mouseDelta.x * PLAYER_CONFIG.ROTATION_SPEED;
      
      // NE PAS appliquer la rotation au RigidBody (le sprite sera en billboard)
      // rigidBodyRef.current.setRotation({ x: 0, y: playerRotation.current, z: 0, w: 1 }, true);
      
      // Notifier TOUJOURS la rotation pour fluidité maximale
      if (onRotationChange) {
        onRotationChange(playerRotation.current);
      }
    }

    // Mouvement relatif à la direction du joueur avec collisions respectées (avant/arrière + strafe)
    const speed = PLAYER_CONFIG.MOVE_SPEED;
    
    // Rotation du joueur pour transformer les mouvements locaux en world
    const cos = Math.cos(playerRotation.current);
    const sin = Math.sin(playerRotation.current);
    
    // Calculer la vélocité en fonction des inputs (X = strafe, Z = avant/arrière)
    let velocityX = 0;
    let velocityZ = 0;
    
    if (movementVector.x !== 0 || movementVector.z !== 0) {
      // Transformer les mouvements locaux en mouvement world
      // X local (strafe) devient rotation de 90° par rapport à la direction
      const strafeX = movementVector.x * cos;  // Strafe X en world X
      const strafeZ = -movementVector.x * sin; // Strafe X en world Z
      
      // Z local (avant/arrière) selon la direction du joueur
      const forwardX = movementVector.z * sin;  // Forward Z en world X
      const forwardZ = movementVector.z * cos;  // Forward Z en world Z
      
      // Combiner strafe et forward
      velocityX = (strafeX + forwardX) * speed;
      velocityZ = (strafeZ + forwardZ) * speed;
    }
    
    // Appliquer la vélocité au RigidBody (respecte les collisions)
    rigidBodyRef.current.setLinvel({ x: velocityX, y: 0, z: velocityZ }, true);
    
    // Mettre à jour notre référence de position depuis le RigidBody
    const currentPos = rigidBodyRef.current.translation();
    playerPosition.current.set(currentPos.x, currentPos.y, currentPos.z);
    
    // Notifier TOUJOURS la position (pas de seuil) pour fluidité maximale
    if (onPositionChange) {
      onPositionChange(playerPosition.current);
    }

    // Application texture (une seule fois, pas à chaque frame)
    if (materialRef.current && spriteTexture && !materialRef.current.textureApplied) {
      console.log('🖼️ Application initiale de la texture au matériau...');
      materialRef.current.map = spriteTexture;
      materialRef.current.color.setHex(0xffffff);
      materialRef.current.needsUpdate = true;
      materialRef.current.textureApplied = true;
      console.log('✅ Texture appliquée avec succès au personnage');
    }

    // Système d'animation réactivé
    animationSystem.updateDirection(movementVector);
    animationSystem.update(deltaTime);

    // Mettre à jour les coordonnées UV du sprite pour l'animation
    const animState = animationSystem.getAnimationState();
    if (materialRef.current.map && spritesheetParams) {
      // Utiliser les paramètres du vrai spritesheet
      const uvScaleX = spritesheetParams.uvScaleX;
      const uvScaleY = spritesheetParams.uvScaleY;
      
      materialRef.current.map.offset.set(animState.uvOffset[0], animState.uvOffset[1]);
      materialRef.current.map.repeat.set(uvScaleX, uvScaleY);
      // Pas de needsUpdate ici car l'offset/repeat se met à jour automatiquement
    }

    // Mettre à jour la rotation de la flèche de debug directement
    if (debugArrowRef.current) {
      debugArrowRef.current.rotation.y = playerRotation.current;
    }
  });

  // Afficher un placeholder AVEC RigidBody pour éviter la transition brutale
  if (isLoading || !spriteTexture) {
    return (
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicVelocityBased"
        colliders="ball"
        position={[0, 0, 0]} // MÊME position que le vrai RigidBody
        enabledRotations={[false, false, false]}
      >
        {/* Placeholder pendant le chargement */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 2, 0.5]} />
          <meshBasicMaterial color="gray" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </RigidBody>
    );
  }

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="kinematicVelocityBased" // Contrôle par vélocité + collisions respectées
      colliders="ball" // Collider sphérique simple pour le joueur
      position={[0, 0, 0]} // Position fixe initiale, le mouvement se fait par vélocité
      enabledRotations={[false, false, false]} // Empêcher la rotation physique
      onCollisionEnter={(payload) => {
        // Notifier le système de physique d'une collision
        physicsSystem.notifyCollision('player', 'unknown', payload);
        console.log('🚫 Player: Collision détectée !', payload);
      }}
    >
      {/* Sprite du personnage avec Billboard (toujours face à la caméra) */}
      <Billboard
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <mesh
          ref={spriteRef}
          position={[0, PLAYER_CONFIG.SIZE.height / 2, 0]}
        >
          <planeGeometry 
            args={[PLAYER_CONFIG.SIZE.width, PLAYER_CONFIG.SIZE.height]} 
          />
          <meshBasicMaterial
            ref={materialRef}
            map={spriteTexture}
            side={THREE.DoubleSide}
            color="white"
            transparent={true}
            alphaTest={0.1}
          />
        </mesh>
      </Billboard>
      
      {/* Debug séparé du Billboard pour éviter les conflits */}
      <group ref={meshRef}>
        {/* Debug : Afficher une petite sphère rouge pour indiquer la position */}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
        
        {/* Debug : Afficher une flèche pour indiquer la direction du joueur */}
        <group ref={debugArrowRef} rotation={[0, 0, 0]}>
          <mesh position={[0, 2, 0.5]} rotation={[-Math.PI/2, 0, 0]}>
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshBasicMaterial color="blue" />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
};

export default Player; 