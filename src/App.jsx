import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "./theme";
import Home from "./pages/Home";
import Controls from "./pages/Controls";
import Game from "./pages/Game/Game";
import Game2 from "./pages/Game2/Game";
import ExportForceGraphPage from "./pages/ExportForceGraphPage/ExportForceGraphPage";
import MovablePage from "./pages/MovablePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BackgroundCanvas from "./components/BackgroundCanvas";

function App() {
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BackgroundCanvas />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/game2" element={<Game />} />
          <Route path="/game" element={<Game2 />} />
          <Route
            path="/spatialize-and-export-forcegraph"
            element={<ExportForceGraphPage />}
          />
          <Route path="/move-and-export-forcegraph" element={<MovablePage />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </ThemeProvider>
  );
}

export default App;
