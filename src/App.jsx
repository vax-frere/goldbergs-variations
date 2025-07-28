import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

import theme from "./theme";
import Home from "./pages/Home";
import Disclaimer from "./pages/Disclaimer";
import Intro from "./pages/Intro";
import Controls from "./pages/Controls";
import Game from "./pages/Game/Game";
import ExportForceGraphPage from "./pages/ExportForceGraphPage/ExportForceGraphPage";
import MovablePage from "./pages/MovablePage";
import Playground from "./pages/Playground";
import TimelinePage from "./pages/TimelinePage";
import DevIndex from "./pages/DevIndex";
import ThirdPersonGame from "./pages/ThirdPersonGame/ThirdPersonGame";
import GameJamExperiment from "./pages/GameJamExperiment/GameJamExperiment";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BackgroundCanvas from "./components/BackgroundCanvas";
import TrollingGame from "./pages/TrollingGame/TrollingGame";

function App() {
  const location = useLocation();
  const isDev = process.env.NODE_ENV !== 'production';
  
  // Routes où le BackgroundCanvas doit être affiché
  const backgroundRoutes = ['/', '/disclaimer', '/intro', '/controls', '/game'];
  const footerRoutes = ['/', '/disclaimer', '/intro', '/controls'];
  const showBackground = backgroundRoutes.includes(location.pathname);
  const showFooter = footerRoutes.includes(location.pathname);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {showBackground && <BackgroundCanvas />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/game" element={<Game />} />
          
          <Route path="/dev" element={<DevIndex />} />
          <Route path="/dev/timeline" element={<TimelinePage />} />
          <Route path="/dev/playground" element={<Playground />} />
          <Route path="/dev/thirdperson" element={<ThirdPersonGame />} />
          <Route path="/dev/gamejam" element={<GameJamExperiment />} />
          <Route path="/dev/trollinggame" element={<TrollingGame />} />
          <Route
            path="/dev/spatialize-and-export-forcegraph"
            element={<ExportForceGraphPage />}
          />
          <Route path="/dev/move-and-export-forcegraph" element={<MovablePage />} />
        </Routes>
      </AnimatePresence>
      {showFooter && <Footer />}
    </ThemeProvider>
  );
}

export default App;
