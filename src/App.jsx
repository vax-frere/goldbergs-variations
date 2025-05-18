import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "./theme";
import Home from "./pages/Home";
import Controls from "./pages/Controls";
import Game from "./pages/Game";
import Work from "./pages/Work";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BackgroundCanvas from "./components/BackgroundCanvas";

function App() {
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BackgroundCanvas />
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/game" element={<Game />} />
          <Route path="/spatialize-and-export-forcegraph" element={<Work />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </ThemeProvider>
  );
}

export default App;
