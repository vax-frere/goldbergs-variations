import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";

const BackgroundContainer = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 0,
  background: "#000",
  opacity: 0.3,
});

const ImageContainer = styled("div")({
  position: "relative",
  width: "100px",
  height: "100px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
});

const PreloaderImage = styled("img")({
  position: "absolute",
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transition: "opacity 0.5s ease-in-out", // Transition plus rapide
});

const PreloaderBackground = ({ isLoading }) => {
  // Initialiser avec un index aléatoire
  const [currentImageIndex, setCurrentImageIndex] = useState(
    Math.floor(Math.random() * 8)
  );
  const [images, setImages] = useState([]);
  const [opacities, setOpacities] = useState([]);

  // Charger les images au montage du composant
  useEffect(() => {
    const imageCount = 8; // 0 à 7
    const loadedImages = Array.from(
      { length: imageCount },
      (_, i) => `${import.meta.env.BASE_URL || "/"}img/preloader/${i}.webp`
    );
    setImages(loadedImages);

    // Initialiser avec l'image aléatoire visible
    const initialOpacities = new Array(imageCount).fill(0);
    initialOpacities[currentImageIndex] = 1;
    setOpacities(initialOpacities);
  }, [currentImageIndex]); // Dépendance à currentImageIndex pour s'assurer que la bonne image est visible

  // Gérer l'animation des images
  useEffect(() => {
    if (!isLoading || images.length === 0) return;

    const animationInterval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;

        // Mettre à jour les opacités avec overlap
        setOpacities((prevOpacities) => {
          const newOpacities = [...prevOpacities];
          // L'image actuelle reste partiellement visible pendant la transition
          newOpacities[prevIndex] = 0.3;
          newOpacities[nextIndex] = 1;
          return newOpacities;
        });

        return nextIndex;
      });
    }, 800); // Changement plus rapide

    return () => clearInterval(animationInterval);
  }, [isLoading, images.length]);

  return (
    <BackgroundContainer>
      <ImageContainer>
        {images.map((src, index) => (
          <PreloaderImage
            key={src}
            src={src}
            alt={`Preloader ${index}`}
            style={{
              opacity: opacities[index],
              zIndex: index === currentImageIndex ? 1 : 0,
            }}
          />
        ))}
      </ImageContainer>
    </BackgroundContainer>
  );
};

export default PreloaderBackground;
