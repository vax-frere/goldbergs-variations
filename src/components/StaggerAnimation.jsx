import { motion } from "framer-motion";
import PropTypes from "prop-types";

const StaggerAnimation = ({
  children,
  delay = 0,
  staggerDelay = 0.1,
  className,
  style,
}) => {
  // Configuration de l'animation en cascade
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
};

// Composant pour chaque élément animé
export const StaggerItem = ({ children, className, style }) => {
  const item = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 20,
        mass: 0.9,
      },
    },
  };

  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
};

// Variante avec léger effet de zoom
export const StaggerItemScale = ({ children, className, style }) => {
  const item = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 250,
        damping: 20,
        mass: 0.9,
      },
    },
  };

  return (
    <motion.div className={className} style={style} variants={item}>
      {children}
    </motion.div>
  );
};

StaggerAnimation.propTypes = {
  children: PropTypes.node.isRequired,
  delay: PropTypes.number,
  staggerDelay: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
};

StaggerItem.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

StaggerItemScale.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default StaggerAnimation;
