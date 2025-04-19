import { useNavigate, useLocation } from "react-router-dom";
import { Box } from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Composant pour un bouton d'icône animé
const AnimatedIconButton = ({ onClick, ariaLabel, children }) => {
  return (
    <motion.button
      onClick={onClick}
      aria-label={ariaLabel}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
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
  const [isMuted, setIsMuted] = useState(false);

  const isHome = location.pathname === "/";

  const handleBack = () => {
    navigate(-1);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // La fonctionnalité réelle de contrôle du son sera implémentée plus tard
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
        zIndex: 1000,
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

      {/* Sound toggle button - always visible */}
      <AnimatePresence mode="wait" initial={false}>
        <AnimatedIconButton
          key={isMuted ? "muted" : "unmuted"}
          onClick={toggleMute}
          ariaLabel={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeOffOutlinedIcon fontSize="large" />
          ) : (
            <VolumeUpOutlinedIcon fontSize="large" />
          )}
        </AnimatedIconButton>
      </AnimatePresence>
    </Box>
  );
};

export default Navbar;
