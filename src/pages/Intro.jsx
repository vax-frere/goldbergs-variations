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
import BoldText from "../components/BoldText";
import VibButton from "../components/VibButton";

const Intro = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound(getSoundPath("switch-on.mp3"), {
    volume: 0.5,
  });

  const handleContinueClick = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate("/controls");
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
                gap: 4,
                textAlign: "center",
                py: 4,
              }}
            >
              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    mb: 3,
                    fontWeight: 500,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Introduction
                </Typography>
                <Typography
                  variant="body1"
                  paragraph
                  sx={{
                    lineHeight: 1.7,
                    maxWidth: "800px",
                    opacity: 0.85,
                    fontWeight: 300,
                    letterSpacing: "0.3px",
                    textAlign: "center",
                    mx: "auto",
                  }}
                >
                  <BoldText text="From <b>40,000</b> posts (2006-2015), this work unfolds a narrative <b>galaxy of extremist</b>, <b>whimsical</b>, or <b>impersonated</b> characters. Inspired by <b>Lombardi</b>, this <b>data visualization</b> maps political <b>obsessions</b> and geek culture. It simulates a fragmented mind experiencing the world as a simulation, unveiling a digital <b>Joker</b> confronting the Internet's contradictions." />
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <VibButton
                  onClick={handleContinueClick}
                  width={180}
                  height={45}
                >
                  Continue
                </VibButton>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </PageTransition>
    </>
  );
};

export default Intro;
