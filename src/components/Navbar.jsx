import { useNavigate, useLocation } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { useState } from "react";

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
        {!isHome && (
          <IconButton
            onClick={handleBack}
            aria-label="Back"
            sx={{
              color: "#f5f5f5",
              width: 50,
              height: 50,
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <ArrowBackIcon fontSize="large" />
          </IconButton>
        )}
      </Box>

      {/* Sound toggle button - always visible */}
      <IconButton
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute" : "Mute"}
        sx={{
          color: "#f5f5f5",
          width: 50,
          height: 50,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            transform: "scale(1.05)",
          },
        }}
      >
        {isMuted ? (
          <VolumeOffIcon fontSize="large" />
        ) : (
          <VolumeUpIcon fontSize="large" />
        )}
      </IconButton>
    </Box>
  );
};

export default Navbar;
