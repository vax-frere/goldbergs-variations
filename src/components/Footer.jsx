import {
  Box,
  Typography,
  Modal,
  Paper,
  IconButton,
  Fade,
  Link,
} from "@mui/material";
import { motion } from "framer-motion";
import { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import { GamepadIndicator } from "../pages/Game/components/AdvancedCameraController/CameraIndicators";
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
              width: { xs: "90%", sm: "60%" },
              bgcolor: "black",
              color: "#f5f5f5",
              boxShadow: 24,
              p: 4,
              borderRadius: 0,
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
              First presented at the <strong>Vidéoformes Festival</strong>{" "}
              (Chapelle de l'Oratoire), this installation explores the digital
              stream of consciousness of <strong>Joshua Ryne Goldberg</strong>,
              the world's most prolific nihilistic troll.
              <br />
              <br />
              Drawing from an archive of over <strong>40,000 posts</strong>{" "}
              accumulated between 2006 and 2015, through twenty-hour days spent
              on the Internet, the work unfolds a narrative galaxy of{" "}
              <strong>
                extremist, fantastical, or impersonated characters
              </strong>
              .
              <br />
              <br />
              Inspired by <strong>Mark Lombardi's narrative structures</strong>,
              this interactive data visualization maps his political obsessions,
              geek culture, and solipsistic visions of a world experienced as a
              simulation. This immersive device constitutes a simulation of his{" "}
              <strong>fragmented thought</strong>, revealing the project of a
              digital <strong>"Joker"</strong> confronting the Internet with its
              own contradictions.
              <br />
              <br />
              Explore the complete{" "}
              <Link
                href="https://tfrere.github.io/joshua-post-timeline/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>database here</strong>
              </Link>{" "}
            </Typography>
            <Typography variant="subtitle1" fontWeight="500" gutterBottom>
              Credits:
            </Typography>

            <Typography variant="body2" paragraph sx={{ fontWeight: 300 }}>
              <strong>Artist & Artistic Direction:</strong>{" "}
              <Link
                href="https://linktr.ee/ismael_jchandoutis"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chandouti Ismael
              </Link>
              <br />
              <strong>Technical Development:</strong>{" "}
              <Link
                href="https://datawrap.fr/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Benjamin Vaxelaire
              </Link>
              ,{" "}
              <Link
                href="https://tfrere.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Frere Thibaud
              </Link>
              <br />
              <strong>Data scraping:</strong> Aymeric Georgin, xxx
              <br />
              <strong>Global advices:</strong> Paloma sanchez
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
