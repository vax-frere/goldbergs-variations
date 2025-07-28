import { Link } from "react-router-dom";
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Container } from "@mui/material";

function DevIndex() {
  const devPages = [
    { path: "/dev/timeline", name: "Timeline des Personas", description: "Visualisation temporelle de l'activité des personas avec D3.js" },
    { path: "/dev/playground", name: "Playground", description: "Page de test et expérimentation" },
    { path: "/dev/thirdperson", name: "Third Person Game", description: "Jeu en vue third person style Yume Nikki avec R3F" },
    { path: "/dev/gamejam", name: "Game Jam Experiment", description: "Jeu style Pokemon 2D avec Phaser - École avec étudiants et effets de bruit" },
    { path: "/dev/spatialize-and-export-forcegraph", name: "Spatialize & Export", description: "Export du graphe de force spatialisé" },
    { path: "/dev/move-and-export-forcegraph", name: "Move & Export", description: "Déplacement et export du graphe de force" }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Pages de Développement
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Ces pages sont uniquement disponibles en mode développement.
      </Typography>
      
      <List>
        {devPages.map((page) => (
          <ListItem key={page.path} disablePadding>
            <ListItemButton component={Link} to={page.path}>
              <ListItemText
                primary={page.name}
                secondary={page.description}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ mt: 4 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary">
            ← Retour à l'accueil
          </Typography>
        </Link>
      </Box>
    </Container>
  );
}

export default DevIndex; 