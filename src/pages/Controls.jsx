import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container, Grid } from "@mui/material";
import { motion } from "framer-motion";
import useSound from "use-sound";
import PageTransition, {
  staggerContainerVariants,
  pageVariants,
} from "../components/PageTransition";

const Controls = () => {
  const navigate = useNavigate();
  const [playSwitchSound] = useSound("/sounds/switch-on.mp3", { volume: 0.5 });

  const handleExploreClick = () => {
    playSwitchSound();
    setTimeout(() => {
      navigate("/game");
    }, 300); // Ajoute un court délai pour que le son puisse jouer avant la navigation
  };

  const highlightedText = (text) => {
    return text.split(" ").map((word, i) => {
      // Mots à mettre en gras (mots clés importants)
      const keyWords = [
        "interconnected",
        "digital",
        "visualization",
        "relationships",
        "labyrinthine",
        "patterns",
      ];

      return keyWords.some((keyword) => word.includes(keyword)) ? (
        <strong key={i}>{word} </strong>
      ) : (
        word + " "
      );
    });
  };

  return (
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
              gap: 2,
              textAlign: "center",
            }}
          >
            <motion.div variants={pageVariants} className="motion-div">
              <Typography
                variant="h2"
                component="h2"
                sx={{ mt: 4, mb: 2, fontWeight: 500 }}
              >
                Game Controls
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
                You will pilot a <strong>spacecraft</strong> through Joshua's{" "}
                <strong>mind</strong>, exploring the
                <strong> neural pathways</strong> and{" "}
                <strong>musical memories</strong> that form his consciousness.
                Navigate through the <strong>digital footprints</strong> of his
                online presence, where <strong>40,000 posts</strong> form a vast
                network of thoughts.
              </Typography>
            </motion.div>

            <motion.div variants={pageVariants} className="motion-div">
              <Grid container justifyContent="center" alignItems="center">
                <Grid
                  item
                  xs={12}
                  md={8}
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <Box sx={{ maxWidth: "100%", overflow: "hidden" }}>
                    <img
                      src="/img/gamepad.svg"
                      alt="Gamepad Controls"
                      style={{
                        maxWidth: "100%",
                        height: "auto",
                        maxHeight: "400px",
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </motion.div>

            <motion.div variants={pageVariants} className="motion-div">
              <Button
                size="large"
                onClick={handleExploreClick}
                sx={{
                  mt: 1,
                  px: 4,
                  py: 1.2,
                  fontWeight: 400,
                }}
              >
                Let's explore
              </Button>
            </motion.div>
          </Box>
        </motion.div>
      </Container>
    </PageTransition>
  );
};

export default Controls;
