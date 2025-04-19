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

          <Typography variant="body1" paragraph>
            Une expérience interactive inspirée des Variations Goldberg de
            Johann Sebastian Bach. Explorez la musique et les motifs à travers
            une interface ludique et visuelle.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/controls")}
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
            Commencer
          </Button>
        </Box>
      </Container>
    </PageTransition>
  );
};

export default Home;
