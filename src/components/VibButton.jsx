import React, { useRef, useEffect, useState } from "react";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";

const ButtonContainer = styled("button")(({ theme }) => ({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "20px 40px",
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "180px",
  "&:hover": {
    "& .button-content": {
      color: theme.palette.primary.main,
    },
    "& .polygon": {
      stroke: theme.palette.primary.main,
      strokeWidth: "2.5px",
    },
  },
}));

const ButtonContent = styled("span")(({ theme }) => ({
  position: "relative",
  zIndex: 1,
  color: "#fff",
  fontSize: "1rem",
  fontWeight: 400,
  display: "block",
  transition: "none",
  pointerEvents: "none",
  whiteSpace: "nowrap",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
}));

const DISTORTION_AMOUNT = 5;
const SAFETY_MARGIN = DISTORTION_AMOUNT * 2;
const VIBRATION_INTERVAL = 75; // Intervalle de mise à jour en ms

const generatePolygonPoints = (width, height) => {
  // Generate random offsets for each corner
  const randomOffset = () => ({
    x: (Math.random() - 0.5) * DISTORTION_AMOUNT,
    y: (Math.random() - 0.5) * DISTORTION_AMOUNT,
  });

  // Base rectangle corners with safety margin
  const topLeft = { x: SAFETY_MARGIN, y: SAFETY_MARGIN };
  const topRight = { x: width - SAFETY_MARGIN, y: SAFETY_MARGIN };
  const bottomRight = { x: width - SAFETY_MARGIN, y: height - SAFETY_MARGIN };
  const bottomLeft = { x: SAFETY_MARGIN, y: height - SAFETY_MARGIN };

  // Add random offsets to each corner
  const corners = [topLeft, topRight, bottomRight, bottomLeft].map(
    (corner) => ({
      x: corner.x + randomOffset().x,
      y: corner.y + randomOffset().y,
    })
  );

  // Generate the points string for the polygon
  return corners.map((point) => `${point.x},${point.y}`).join(" ");
};

const VibButton = ({ children, onClick }) => {
  const buttonRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [polygonPoints, setPolygonPoints] = useState("");

  useEffect(() => {
    if (buttonRef.current) {
      const updateDimensions = () => {
        const rect = buttonRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width + SAFETY_MARGIN * 2,
          height: rect.height + SAFETY_MARGIN * 2,
        });
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      // Initial points
      setPolygonPoints(
        generatePolygonPoints(dimensions.width, dimensions.height)
      );

      // Set up the interval for continuous updates
      const interval = setInterval(() => {
        setPolygonPoints(
          generatePolygonPoints(dimensions.width, dimensions.height)
        );
      }, VIBRATION_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [dimensions.width, dimensions.height]);

  return (
    <ButtonContainer ref={buttonRef} onClick={onClick}>
      <ButtonContent className="button-content">{children}</ButtonContent>
      {dimensions.width > 0 && (
        <svg
          style={{
            position: "absolute",
            top: -SAFETY_MARGIN,
            left: -SAFETY_MARGIN,
            width: `calc(100% + ${SAFETY_MARGIN * 2}px)`,
            height: `calc(100% + ${SAFETY_MARGIN * 2}px)`,
            pointerEvents: "none",
          }}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          <motion.polygon
            className="polygon"
            points={polygonPoints}
            fill="black"
            stroke="#fff"
            strokeWidth="2"
            transition={{ duration: 0 }}
          />
        </svg>
      )}
    </ButtonContainer>
  );
};

export default VibButton;
