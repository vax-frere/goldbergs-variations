import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container, Grid } from "@mui/material";
import PageTransition from "../components/PageTransition";
import StaggerAnimation, {
  StaggerItem,
  StaggerItemScale,
} from "../components/StaggerAnimation";

// SVG des contrôles (représentation simple d'une clé de sol)
const ControlsSvg = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 20C80 20 60 40 60 70C60 90 70 105 85 115C75 125 65 140 65 160C65 180 80 195 100 195C120 195 135 180 135 160C135 145 125 135 110 135C105 135 100 137 95 140C93 130 100 120 110 115C125 125 145 115 145 90C145 55 125 20 100 20ZM100 50C110 50 115 60 115 70C115 80 110 90 100 90C90 90 85 80 85 70C85 60 90 50 100 50ZM100 155C105 155 110 157 110 165C110 173 105 175 100 175C95 175 90 173 90 165C90 157 95 155 100 155Z"
      fill="#f5f5f5"
    />
  </svg>
);

const Controls = () => {
  const navigate = useNavigate();

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
            <StaggerItem>
              <Box sx={{ my: 1, maxWidth: "100%", overflow: "hidden" }}>
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
            </StaggerItem>

            <StaggerItem>
              <Typography
                variant="body1"
                paragraph
                sx={{
                  mt: 3,
                  maxWidth: "800px",
                  opacity: 0.85,
                  fontWeight: 300,
                  letterSpacing: "0.3px",
                  lineHeight: 1.7,
                }}
              >
                {highlightedText(
                  "Navigate through Joshua's mind by exploring the interconnected nodes of his digital consciousness. This visualization maps the patterns and relationships between his online personas and obsessions. Prepare yourself for a journey through a labyrinthine data structure of thought patterns."
                )}
              </Typography>
            </StaggerItem>

            <StaggerItemScale>
              <Button
                size="large"
                onClick={() => navigate("/game")}
                sx={{
                  mt: 1,
                  px: 4,
                  py: 1.2,
                  fontWeight: 400,
                }}
              >
                Explore
              </Button>
            </StaggerItemScale>
          </Box>
        </StaggerAnimation>
      </Container>
    </PageTransition>
  );
};

export default Controls;
