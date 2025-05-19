import { Box, Typography, Modal, Paper, IconButton, Fade } from "@mui/material";
import { motion } from "framer-motion";
import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { GamepadIndicator } from "./Game/AdvancedCameraController/CameraIndicators";

const Footer = () => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        sx={{
          position: "fixed",
          bottom: "32px",
          left: "35px",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: "0.8rem",
            opacity: 0.5,
            color: "#f5f5f5",
            fontWeight: 300,
            letterSpacing: "0.2px",
            marginRight: "5px",
          }}
        >
          <span
            onClick={handleOpen}
            style={{
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            About this experience
          </span>
        </Typography>

        {/* Séparateur vertical */}
        <Box
          sx={{
            height: "12px",
            width: "1px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            margin: "0 10px",
            display: "inline-block",
          }}
        />

        <GamepadIndicator isCompact={true} />
      </Box>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="about-modal-title"
        aria-describedby="about-modal-description"
        closeAfterTransition
      >
        <Fade in={open} timeout={400}>
          <Paper
            variant="outlined"
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: "90%", sm: "500px" },
              maxWidth: "600px",
              bgcolor: "black",
              color: "#f5f5f5",
              boxShadow: 24,
              p: 4,
              borderRadius: 2,
              outline: "none",
              maxHeight: "80vh",
              overflow: "auto",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: "#f5f5f5",
              }}
            >
              <CloseIcon />
            </IconButton>

            <Typography
              id="about-modal-title"
              variant="h6"
              component="h2"
              gutterBottom
            >
              About this experience
            </Typography>

            <Typography
              id="about-modal-description"
              sx={{ mt: 2, mb: 3, fontWeight: 300 }}
            >
              From 40,000 posts (2006-2015), this work unfolds a narrative
              galaxy of extremist, whimsical, or impersonated characters. It
              simulates a fragmented mind experiencing the world as a
              simulation, unveiling a digital Joker confronting the Internet's
              contradictions.
            </Typography>

            <Typography variant="subtitle1" fontWeight="500" gutterBottom>
              Credits:
            </Typography>

            <Typography variant="body2" paragraph sx={{ fontWeight: 300 }}>
              <strong>Artistic Direction:</strong> Chandouti Ismael
              <br />
              <strong>Design & Development:</strong> Benjamin Vaxelaire, Frere
              Thibaud
              <br />
              <strong>Based on:</strong> Joshua Ryne Goldberg's online
              activities
            </Typography>
          </Paper>
        </Fade>
      </Modal>
    </>
  );
};

export default Footer;
