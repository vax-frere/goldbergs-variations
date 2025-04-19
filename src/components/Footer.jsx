import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      sx={{
        position: "fixed",
        bottom: "12px",
        left: "15px",
        zIndex: 1000,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.8rem",
          opacity: 0.5,
          color: "#f5f5f5",
          fontWeight: 300,
          letterSpacing: "0.2px",
        }}
      >
        Chandouti Ismael - Benjamin Vaxelaire - Frere Thibaud
      </Typography>
    </Box>
  );
};

export default Footer;
