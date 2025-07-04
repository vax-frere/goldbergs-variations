import { useNavigate } from "react-router-dom";
import { Typography, Box, Container } from "@mui/material";
import { motion } from "framer-motion";
import useSound from "use-sound";
import Navbar from "../components/Navbar";
import PageTransition, {
  staggerContainerVariants,
  pageVariants,
} from "../components/PageTransition";
import { getSoundPath } from "../utils/assetLoader";
import VibButton from "../components/VibButton";

const Disclaimer = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound(getSoundPath("switch-on.mp3"), {
    volume: 0.5,
  });

  const handleContinueClick = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate("/intro");
    }, 300);
  };

  return (
    <>
      <Navbar />
      <PageTransition>
        <Container maxWidth="md">
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="motion-div"
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                textAlign: "center",
                py: 4,
              }}
            >
              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.8,
                    maxWidth: "700px",
                    opacity: 0.9,
                    fontWeight: 400,
                    letterSpacing: "0.3px",
                    textAlign: "left",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  You are about to explore the documented case of an individual 
                  who simultaneously operated as an ISIS terrorist, neo-Nazi activist, 
                  feminist writer, and free speech advocate online between 2013-2015.
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.8,
                    maxWidth: "700px",
                    opacity: 0.9,
                    fontWeight: 600,
                    letterSpacing: "0.3px",
                    textAlign: "left",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  None of these personas were real. 
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.8,
                    maxWidth: "700px",
                    opacity: 0.9,
                    fontWeight: 400,
                    letterSpacing: "0.3px",
                    textAlign: "left",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  This interactive experience examines how truth can be 
                  manipulated in digital spaces and how information bubbles 
                  shape our understanding of reality.
                </Typography>

                <Box sx={{ 
                  backgroundColor: "rgba(255, 255, 0, 0.1)", 
                  border: "1px solid rgba(255, 255, 0, 0.3)",
                  borderRadius: 1,
                  p: 2,
                  mb: 3,
                  maxWidth: "700px",
                  mx: "auto"
                }}>
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.6,
                      opacity: 0.95,
                      fontWeight: 600,
                      letterSpacing: "0.2px",
                      textAlign: "left",
                      color: "#FFD700",
                      mb: 1,
                    }}
                  >
                    ⚠️ CONTENT WARNING
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.6,
                      opacity: 0.9,
                      fontWeight: 400,
                      letterSpacing: "0.2px",
                      textAlign: "left",
                    }}
                  >
                    This work contains real hate speech, violent rhetoric, 
                    and extremist content extracted from court documents 
                    and verified journalistic sources.
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.6,
                      opacity: 0.9,
                      fontWeight: 400,
                      letterSpacing: "0.2px",
                      textAlign: "left",
                      mt: 1,
                    }}
                  >
                    These views do not represent the opinions of the creators.
                    This is documentary art about the dangers of digital manipulation.
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.6,
                    maxWidth: "700px",
                    opacity: 0.7,
                    fontWeight: 400,
                    letterSpacing: "0.2px",
                    textAlign: "left",
                    mx: "auto",
                    mb: 2,
                    fontStyle: "italic",
                  }}
                >
                  BASED ON: FBI court filings, investigative journalism, 
                  and Goldberg's own post-incarceration interviews
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.6,
                    maxWidth: "700px",
                    opacity: 0.8,
                    fontWeight: 500,
                    letterSpacing: "0.2px",
                    textAlign: "center",
                    mx: "auto",
                    mb: 1,
                  }}
                >
                  "A story that must be told" about the post-truth era.
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    lineHeight: 1.6,
                    maxWidth: "700px",
                    opacity: 0.7,
                    fontWeight: 400,
                    letterSpacing: "0.2px",
                    textAlign: "center",
                    mx: "auto",
                    mb: 3,
                  }}
                >
                  Recommended for mature audiences (16+)
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <VibButton
                  onClick={handleContinueClick}
                  width={180}
                  height={45}
                >
                  I Understand
                </VibButton>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </PageTransition>
    </>
  );
};

export default Disclaimer; 