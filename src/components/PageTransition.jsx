import { motion } from "framer-motion";
import PropTypes from "prop-types";

const PageTransition = ({ children }) => {
  // Animation pour le conteneur principal (fade in/out)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1.0], // cubic-bezier easing
      }}
      className="motion-div"
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      {children}
    </motion.div>
  );
};

// Variantes pour les éléments entrants avec optimisations pour réduire le flicker
export const pageVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 18,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.96,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Variantes pour le conteneur avec staggering
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.06,
      staggerDirection: -1, // Stagger dans l'autre sens en sortant
      when: "afterChildren",
      ease: "easeIn",
    },
  },
};

PageTransition.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PageTransition;
