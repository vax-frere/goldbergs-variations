import React, { memo, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { getImagePath } from "../../../../../utils/assetLoader";

/**
 * Component to display the persona portrait very far in the background
 */
const PersonaPortrait = memo(({ clusterId, assets }) => {
  const camera = useThree((state) => state.camera);
  const [portraitTexture, setPortraitTexture] = useState(null);
  const [personaData, setPersonaData] = useState(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const portraitRef = useRef();

  // Resolve persona data and portrait texture
  useEffect(() => {
    if (!assets.isReady || !clusterId) return;

    // Get database to find persona info
    const database = assets.getData("database");
    if (!database) return;

    // Find persona by clusterId (slug)
    const persona = database.find((item) => item.slug === clusterId);
    if (!persona) {
      console.log(
        `[PersonaPortrait] Persona not found for cluster: ${clusterId}`
      );
      return;
    }

    console.log(`[PersonaPortrait] Found persona:`, persona);
    setPersonaData(persona);

    // Try to load portrait image based on persona slug
    const imagePath = getImagePath(`characters/${persona.slug}.png`);
    console.log(`[PersonaPortrait] Trying to load image: ${imagePath}`);

    // Use THREE.TextureLoader to load the image
    const loader = new THREE.TextureLoader();
    loader.load(
      imagePath,
      (texture) => {
        console.log(
          `[PersonaPortrait] Successfully loaded texture: ${imagePath}`
        );
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        setPortraitTexture(texture);
        setIsUsingFallback(false); // Original image loaded
      },
      undefined,
      (error) => {
        console.warn(
          `[PersonaPortrait] Failed to load texture: ${imagePath}, trying fallback`,
          error
        );

        // Try fallback image like in TextPanel
        const fallbackPath = assets.getImagePath("character.svg");
        console.log(`[PersonaPortrait] Trying fallback image: ${fallbackPath}`);

        loader.load(
          fallbackPath,
          (fallbackTexture) => {
            console.log(
              `[PersonaPortrait] Successfully loaded fallback texture: ${fallbackPath}`
            );
            fallbackTexture.minFilter = THREE.LinearFilter;
            fallbackTexture.magFilter = THREE.LinearFilter;
            setPortraitTexture(fallbackTexture);
            setIsUsingFallback(true); // Fallback image loaded
          },
          undefined,
          (fallbackError) => {
            console.error(
              `[PersonaPortrait] Failed to load fallback texture: ${fallbackPath}`,
              fallbackError
            );
          }
        );
      }
    );
  }, [assets.isReady, clusterId, assets.getImagePath]);

  // Position the portrait in front of the camera when loaded
  useEffect(() => {
    if (!camera || !portraitRef.current || !portraitTexture) return;

    // Get camera direction and position the portrait very far in front
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const distance = 8000; // Very far distance
    const portraitPosition = camera.position
      .clone()
      .add(cameraDirection.multiplyScalar(distance));

    // Position the portrait
    portraitRef.current.position.copy(portraitPosition);

    // Make it face the camera
    portraitRef.current.lookAt(camera.position);

    console.log(`[PersonaPortrait] Positioned portrait at:`, portraitPosition);
  }, [camera, portraitTexture]);

  if (!portraitTexture || !personaData) return null;

  return (
    <mesh ref={portraitRef}>
      <planeGeometry args={[4000, 4000]} /> {/* Much larger plane */}
      <meshBasicMaterial
        map={portraitTexture}
        transparent={true}
        opacity={isUsingFallback ? 0.0075 : 0.01} // Lower opacity when using fallback
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

PersonaPortrait.displayName = "PersonaPortrait";

export default PersonaPortrait;
