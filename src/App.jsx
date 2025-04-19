import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "./theme";
import Home from "./pages/Home";
import Controls from "./pages/Controls";
import Game from "./pages/Game";
import Navbar from "./components/Navbar";

function App() {
  const location = useLocation();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/game" element={<Game />} />
        </Routes>
      </AnimatePresence>
    </ThemeProvider>
  );
}

export default App;
