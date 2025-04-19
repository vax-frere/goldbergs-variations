import { useNavigate } from "react-router-dom";
import { Typography, Button, Box, Container } from "@mui/material";
import PageTransition from "../components/PageTransition";

const Home = () => {
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
          <Typography variant="h1" component="h1" gutterBottom>
            Goldberg's Variations
          </Typography>

          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            sx={{
              fontStyle: "italic",
              opacity: 0.9,
              mb: 3,
            }}
          >
            A journey inside Joshua's Thought Loop
          </Typography>

          <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
            From an archive of over 40,000 posts accumulated between 2006 and
            2015, across twenty-hour days spent online, this work unfolds a
            narrative galaxy of extremist, whimsical, or impersonated
            characters. Inspired by Mark Lombardi's narrative structures, this
            interactive data visualization maps his political obsessions, geek
            culture, and solipsistic visions of a world experienced as a
            simulation. This immersive installation creates a simulation of his
            fragmented mind, revealing the project of a digital "Joker"
            confronting the Internet with its own contradictions.
          </Typography>

          <Button
            size="large"
            onClick={() => navigate("/controls")}
            sx={{ mt: 3 }}
          >
            Enter
          </Button>
        </Box>
      </Container>
    </PageTransition>
  );
};

export default Home;
