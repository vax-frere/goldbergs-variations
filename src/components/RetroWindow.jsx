import React, { useState, useRef } from 'react';
import { Box } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import WindowContentParser from './WindowContentParser';

const RetroWindow = ({ 
  title = "Untitled Window", 
  children, 
  onClose, 
  width = 600, 
  height = 400,
  isOpen = true,
  initialPosition = { x: 100, y: 100 },
  zIndex = 9999,
  onFocus
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  const handleMouseDown = (e) => {
    // Focus la fenêtre quand on clique dessus
    if (onFocus) {
      onFocus();
    }
    
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleWindowClick = () => {
    // Focus la fenêtre quand on clique n'importe où dessus
    if (onFocus) {
      onFocus();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ajouter les event listeners globaux pour le drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Variantes d'animation pour la fenêtre
  const windowVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.8,
        duration: 0.3,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -10,
      transition: {
        duration: 0.15, // 2x plus rapide que l'entrée (0.3s -> 0.15s)
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  // Ne pas rendre si isOpen est false
  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <Box
        component={motion.div}
        ref={windowRef}
        onClick={handleWindowClick}
        variants={windowVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        sx={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: width,
          height: height,
          backgroundColor: '#000000',
          border: '2px solid #ffffff',
          boxShadow: '2px 2px 0px #ffffff',
          zIndex: zIndex,
          fontFamily: 'monospace',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          userSelect: 'none'
        }}
      >
        {/* Barre de titre */}
        <Box
          onMouseDown={handleMouseDown}
          sx={{
            height: '24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
            border: '1px solid #ffffff',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <Box sx={{ 
            fontSize: '11px', 
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </Box>
          
          {/* Bouton de fermeture */}
          <Box
            onClick={onClose}
            sx={{
              width: '16px',
              height: '14px',
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#000000',
              '&:hover': {
                backgroundColor: '#cccccc'
              },
              '&:active': {
                backgroundColor: '#999999'
              }
            }}
          >
            ×
          </Box>
        </Box>

        {/* Contenu avec scroll */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#000000',
            color: '#ffffff',
            border: '1px solid #ffffff',
            margin: '2px',
            overflow: 'auto',
            padding: '8px',
            
            // Style de scrollbar rétro en noir et blanc
            '&::-webkit-scrollbar': {
              width: '16px',
              backgroundColor: '#000000'
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#000000',
              border: '1px solid #ffffff'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              '&:hover': {
                backgroundColor: '#cccccc'
              },
              '&:active': {
                backgroundColor: '#999999'
              }
            },
            '&::-webkit-scrollbar-button': {
              height: '16px',
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              '&:hover': {
                backgroundColor: '#cccccc'
              },
              '&:active': {
                backgroundColor: '#999999'
              }
            },
            '&::-webkit-scrollbar-button:vertical:start:decrement': {
              backgroundImage: 'linear-gradient(45deg, transparent 30%, #000000 30%, #000000 70%, transparent 70%)',
              backgroundSize: '8px 8px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            },
            '&::-webkit-scrollbar-button:vertical:end:increment': {
              backgroundImage: 'linear-gradient(-45deg, transparent 30%, #000000 30%, #000000 70%, transparent 70%)',
              backgroundSize: '8px 8px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }
          }}
        >
          <WindowContentParser content={children} />
        </Box>

        {/* Barre de statut */}
        <Box
          sx={{
            height: '18px',
            backgroundColor: '#000000',
            border: '1px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 4px',
            fontSize: '10px',
            color: '#ffffff'
          }}
        >
          Ready
        </Box>
      </Box>
    </AnimatePresence>
  );
};

export default RetroWindow; 