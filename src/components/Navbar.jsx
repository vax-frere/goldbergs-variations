import { useNavigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSound from "use-sound";

// Composant pour un bouton d'icône animé
const AnimatedIconButton = ({ onClick, ariaLabel, children, transition }) => {
  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={
        transition || {
          type: "spring",
          stiffness: 300,
          damping: 20,
        }
      }
      whileHover={{ scale: 1.05 }}
      style={{
        background: "transparent",
        border: "none",
        color: "#f5f5f5",
        width: 50,
        height: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
    </motion.button>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [playSwitchSound] = useSound(
    `${import.meta.env.BASE_URL}sounds/switch-on.mp3`,
    { volume: 0.5 }
  );

  const isHome = location.pathname === "/";

  const handleBack = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate(-1);
    }, 300); // Ajoute un court délai pour que le son puisse jouer avant la navigation
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px",
        zIndex: 999,
      }}
    >
      {/* Back button, only visible when not on home page */}
      <Box>
        <AnimatePresence mode="wait">
          {!isHome && (
            <AnimatedIconButton
              key="back-button"
              onClick={handleBack}
              ariaLabel="Back"
            >
              <ArrowBackOutlinedIcon fontSize="large" />
            </AnimatedIconButton>
          )}
        </AnimatePresence>
      </Box>

      {/* Espace vide à droite pour maintenir l'alignement */}
      <Box sx={{ width: 50 }} />
    </Box>
  );
};

export default Navbar;
