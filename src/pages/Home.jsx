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
import ManyFaces from "../components/ManyFaces";

const Home = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound(getSoundPath("switch-on.mp3"), {
    volume: 0.5,
  });

  const handleEnterClick = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate("/disclaimer");
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
                gap: 2,
                textAlign: "center",
              }}
            >
              <motion.div variants={pageVariants} className="motion-div">
                <Box sx={{ mb: 4 }}>
                  <ManyFaces size="160px" />
                </Box>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <Typography
                  variant="h1"
                  component="h1"
                  sx={{
                    mb: -1.5,
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
                    opacity: 0.4,
                    mb: 4,
                    letterSpacing: "0.5px",
                  }}
                >
                  A journey inside Joshua Ryne Goldberg's Mind
                </Typography>
              </motion.div>

              <motion.div variants={pageVariants} className="motion-div">
                <VibButton onClick={handleEnterClick} width={180} height={45}>
                  Enter
                </VibButton>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </PageTransition>
    </>
  );
};

export default Home;
