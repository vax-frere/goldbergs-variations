import React, { useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import useAssets from "../hooks/useAssets";

const Skybox = ({ radius = 1000, opacity = 1.0, intensity = 1.0 }) => {
  const assets = useAssets({ autoInit: false });
  const [hdrTexture, setHdrTexture] = useState(null);

  // Charger la texture HDR
  useEffect(() => {
    if (!assets.isReady) return;

    const loader = new RGBELoader();
    const hdrPath = assets.getImagePath("space.hdr");

    loader.load(
      hdrPath,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        setHdrTexture(texture);
      },
      undefined,
      (error) => {
        console.error("Erreur lors du chargement du HDR:", error);
      }
    );
  }, [assets.isReady]);

  // Créer la géométrie de la sphère pour la skybox
  const skyboxGeometry = useMemo(() => {
    const geometry = new THREE.SphereGeometry(radius, 60, 40);
    return geometry;
  }, [radius]);

  // Créer le matériau avec la texture HDR
  const skyboxMaterial = useMemo(() => {
    if (!hdrTexture) return null;

    return new THREE.MeshBasicMaterial({
      map: hdrTexture,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
      opacity: opacity,
      transparent: opacity < 1.0,
    });
  }, [hdrTexture, opacity]);

  // Ne pas rendre si les assets ne sont pas prêts ou si la texture n'est pas chargée
  if (!assets.isReady || !hdrTexture || !skyboxMaterial) {
    return null;
  }

  return <mesh geometry={skyboxGeometry} material={skyboxMaterial} />;
};

export default Skybox;
