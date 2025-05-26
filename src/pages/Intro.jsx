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
                    mb: 4,
                  }}
                >
                  <BoldText text="<b>Joshua Ryne Goldberg</b>, the world's most prolific nihilistic troll, spent <b>14 to 20 hours a day</b> on the Internet between 2006 and 2015. Under multiple identities, he embodied characters with opposing ideologies: <b>jihadist</b>, <b>feminist</b>, <b>neo-nazi</b>, manipulating media and social networks. His arrest by the FBI in 2015 revealed a fragmented mind, diagnosed with schizophrenia, who had turned the Internet into his personal theater." />
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
                  <BoldText text="Inspired by <b>Lombardi's</b> narrative structures, this <b>data visualization</b> maps his <b>political obsessions</b> and geek culture through a galaxy of <b>40,000 posts</b>. The experience simulates a fragmented mind experiencing the world as a simulation, unveiling a digital <b>Joker</b> confronting the Internet's contradictions." />
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
