import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container } from "@mui/material";
import { motion } from "framer-motion";
import useSound from "use-sound";
import Navbar from "../components/Navbar";
import PageTransition, {
  staggerContainerVariants,
  pageVariants,
} from "../components/PageTransition";
import { getSoundPath } from "../utils/assetLoader";

const Home = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound(getSoundPath("switch-on.mp3"), {
    volume: 0.5,
  });

  const handleEnterClick = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate("/controls");
    }, 300); // Ajoute un court délai pour que le son puisse jouer avant la navigation
  };

  const highlightedText = (text) => {
    return text.split(" ").map((word, i) => {
      // Mots à mettre en gras (mots clés importants)
      const keyWords = [
        "40,000",
        "galaxy of extremist",
        "whimsical",
        "impersonated",
        "Joker",
        "Lombardi",
        "obsessions",
        "interactive",
        "data visualization",
      ];

      return keyWords.some((keyword) => word.includes(keyword)) ? (
        <strong key={i}>{word} </strong>
      ) : (
        word + " "
      );
    });
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
                gap: 2,
                textAlign: "center",
              }}
            >
              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    mb: 0.2,
                    fontWeight: 500,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Goldberg's Variations
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{
                    fontWeight: 300,
                    fontStyle: "italic",
                    opacity: 0.75,
                    mb: 4,
                    letterSpacing: "0.5px",
                  }}
                >
                  A journey inside Joshua Ryne Goldberg's Thought
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="body1"
                  paragraph
                  sx={{
                    lineHeight: 1.7,
                    maxWidth: "800px",
                    opacity: 0.85,
                    fontWeight: 300,
                    letterSpacing: "0.3px",
                  }}
                >
                  {highlightedText(
                    "From 40,000 posts (2006-2015), this work unfolds a narrative galaxy of extremist, whimsical, or impersonated characters. Inspired by Lombardi, this data visualization maps political obsessions and geek culture. It simulates a fragmented mind experiencing the world as a simulation, unveiling a digital Joker confronting the Internet's contradictions."
                  )}
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <Button
                  size="large"
                  onClick={handleEnterClick}
                  sx={{
                    mt: 2,
                    px: 4,
                    py: 1.2,
                    fontWeight: 400,
                  }}
                >
                  Enter
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </PageTransition>
    </>
  );
};

export default Home;
