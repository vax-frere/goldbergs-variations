import React, { useState, useEffect, memo } from "react";
import { styled } from "@mui/material/styles";
import { getImagePath } from "../../../../utils/assetLoader";

// Styles
const Container = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  pointerEvents: "none",
});

const ImageWrapper = styled("div")({
  position: "relative",
  width: "100px",
  height: "100px",
});

const Image = styled("img")({
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  transition: "opacity 0.15s ease-in-out",
});

const PreloaderBackground = memo(() => {
  const [activeIndex, setActiveIndex] = useState(Math.floor(Math.random() * 8));
  const [prevIndex, setPrevIndex] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        setPrevIndex(prev);
        return (prev + 1) % 8;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  return (
    <Container>
      <ImageWrapper>
        {Array.from({ length: 8 }, (_, i) => (
          <Image
            key={i}
            src={getImagePath(`preloader/${i}.webp`)}
            alt={`Head ${i}`}
            style={{
              opacity: i === activeIndex ? 0.3 : i === prevIndex ? 0.1 : 0,
            }}
          />
        ))}
      </ImageWrapper>
    </Container>
  );
});

export default PreloaderBackground;
