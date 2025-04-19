import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container } from "@mui/material";
import PageTransition from "../components/PageTransition";
import StaggerAnimation, {
  StaggerItem,
  StaggerItemScale,
} from "../components/StaggerAnimation";

const Home = () => {
  const navigate = useNavigate();

  const highlightedText = (text) => {
    return text.split(" ").map((word, i) => {
      // Mots à mettre en gras (mots clés importants)
      const keyWords = [
        "40,000",
        "extremist",
        "simulation",
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
    <PageTransition>
      <Container maxWidth="md">
        <StaggerAnimation>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              textAlign: "center",
            }}
          >
            <StaggerItemScale>
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
            </StaggerItemScale>

            <StaggerItem>
              <Typography
                variant="h5"
                component="h5"
                sx={{
                  fontWeight: 300,
                  fontStyle: "italic",
                  opacity: 0.75,
                  mb: 4,
                  letterSpacing: "0.5px",
                }}
              >
                A journey inside Joshua's Thought Loop
              </Typography>
            </StaggerItem>

            <StaggerItem>
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
            </StaggerItem>

            <StaggerItemScale>
              <Button
                size="large"
                onClick={() => navigate("/controls")}
                sx={{
                  mt: 2,
                  px: 4,
                  py: 1.2,
                  fontWeight: 400,
                }}
              >
                Enter
              </Button>
            </StaggerItemScale>
          </Box>
        </StaggerAnimation>
      </Container>
    </PageTransition>
  );
};

export default Home;
