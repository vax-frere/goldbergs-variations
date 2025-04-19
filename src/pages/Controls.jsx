import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container } from "@mui/material";
import PageTransition from "../components/PageTransition";

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

  return (
    <PageTransition>
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="h2" component="h1" gutterBottom>
            Contrôles
          </Typography>

          <Box sx={{ my: 4 }}>
            <ControlsSvg />
          </Box>

          <Typography variant="body1" paragraph>
            Les Variations Goldberg sont une œuvre composée de 30 variations sur
            un aria. Préparez-vous à explorer l'univers de Bach à travers cette
            expérience interactive.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/game")}
            sx={{
              mt: 2,
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: "1.2rem",
              fontWeight: "bold",
              textTransform: "none",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 6px 25px rgba(0, 0, 0, 0.3)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            Explorer
          </Button>
        </Box>
      </Container>
    </PageTransition>
  );
};

export default Controls;
