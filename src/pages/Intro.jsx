import { useNavigate } from "react-router-dom";
import { Box, Container } from "@mui/material";
import { motion } from "framer-motion";
import useSound from "use-sound";
import Navbar from "../components/Navbar";
import PageTransition, {
  staggerContainerVariants,
  pageVariants,
} from "../components/PageTransition";
import { getSoundPath } from "../utils/assetLoader";
import TypewriterText from "../components/TypewriterText";
import VibButton from "../components/VibButton";
import { useState } from "react";

const Intro = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound(getSoundPath("switch-on.mp3"), {
    volume: 0.5,
  });
  const [isTextComplete, setIsTextComplete] = useState(false);

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
        <Container maxWidth="lg">
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
                <Box sx={{ maxWidth: "800px", mx: "auto" }}>
                  <TypewriterText
                    text="<primary>Joshua Ryne Goldberg</primary>, the world's most prolific nihilistic troll, spent <primary>14 to 20 hours a day</primary> on the Internet between 2006 and 2015. Under multiple identities, he embodied characters with opposing ideologies: <secondary>jihadist</secondary>, <secondary>feminist</secondary>, <secondary>neo-nazi</secondary>, manipulating media and social networks. His arrest by the FBI in 2015 revealed a fragmented mind, diagnosed with schizophrenia, who had turned the Internet into his personal theater.<br/><br/>Inspired by <primary>Lombardi's</primary> narrative structures, this <secondary>data visualization</secondary> maps his <secondary>political obsessions</secondary> and geek culture through a galaxy of <primary>40,000 posts</primary>. The experience simulates a fragmented mind experiencing the world as a simulation, unveiling a digital <primary>Joker</primary> confronting the Internet's contradictions."
                    speed={30}
                    keywords={{
                      primary: { color: "#FFD700" },
                      secondary: { color: "#00FF00" }
                    }}
                    onComplete={() => setIsTextComplete(true)}
                  />
                </Box>
              </motion.div>

              {isTextComplete && (
                <motion.div
                  variants={pageVariants}
                  initial="hidden"
                  animate="visible"
                  className="motion-div"
                >
                  <VibButton
                    onClick={handleContinueClick}
                    width={180}
                    height={45}
                  >
                    Continue
                  </VibButton>
                </motion.div>
              )}
            </Box>
          </motion.div>
        </Container>
      </PageTransition>
    </>
  );
};

export default Intro;
