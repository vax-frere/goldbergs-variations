import { useState, useEffect, useCallback } from 'react';
import useSound from 'use-sound';
import { Box, Typography } from '@mui/material';
import { getSoundPath } from '../utils/assetLoader';

const TypewriterText = ({ 
  text, 
  speed = 50, 
  onComplete,
  keywords = {
    primary: { color: '#FFD700' }, // Couleur par défaut pour les mots-clés primaires
    secondary: { color: '#00FF00' }, // Couleur par défaut pour les mots-clés secondaires
    tertiary: { color: '#FF69B4' } // Couleur par défaut pour les mots-clés tertiaires
  }
}) => {
  const [displayedParts, setDisplayedParts] = useState([]);
  const [isTyping, setIsTyping] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [soundCounter, setSoundCounter] = useState(0);

  // Sons de clavier aléatoires
  const [playKeyboard1] = useSound(getSoundPath('keyboard-1.mp3'), { volume: 0.05 });
  const [playKeyboard2] = useSound(getSoundPath('keyboard-2.mp3'), { volume: 0.05 });
  const [playKeyboard3] = useSound(getSoundPath('keyboard-3.mp3'), { volume: 0.05 });
  const [playKeyboard4] = useSound(getSoundPath('keyboard-4.mp3'), { volume: 0.05 });
  const [playKeyboard5] = useSound(getSoundPath('keyboard-5.mp3'), { volume: 0.05 });
  const [playKeyboard6] = useSound(getSoundPath('keyboard-6.mp3'), { volume: 0.05 });

  const playRandomKeyboardSound = useCallback(() => {
    const sounds = [
      playKeyboard1,
      playKeyboard2,
      playKeyboard3,
      playKeyboard4,
      playKeyboard5,
      playKeyboard6
    ];
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    randomSound();
  }, [playKeyboard1, playKeyboard2, playKeyboard3, playKeyboard4, playKeyboard5, playKeyboard6]);

  const skipAnimation = useCallback(() => {
    if (!isComplete) {
      const parts = parseText(text);
      setDisplayedParts(parts);
      setIsTyping(false);
      setIsComplete(true);
      onComplete?.();
    }
  }, [text, isComplete, onComplete]);

  useEffect(() => {
    const handleKeyPress = () => {
      skipAnimation();
    };

    const handleClick = () => {
      skipAnimation();
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [skipAnimation]);

  const parseText = (text) => {
    const parts = [];
    let currentText = '';
    let currentTag = null;
    let i = 0;

    while (i < text.length) {
      if (text[i] === '<') {
        // Gérer les balises spéciales
        if (text.substring(i, i + 5) === '<br/>') {
          if (currentText) {
            parts.push({ text: currentText, tag: currentTag });
            currentText = '';
          }
          parts.push({ text: '\n', tag: 'br' });
          i += 5;
          continue;
        }

        if (text[i + 1] === '/') {
          // Fin d'un tag
          if (currentText) {
            parts.push({ text: currentText, tag: currentTag });
            currentText = '';
          }
          currentTag = null;
          i = text.indexOf('>', i) + 1;
        } else {
          // Début d'un tag
          if (currentText) {
            parts.push({ text: currentText, tag: currentTag });
            currentText = '';
          }
          const tagEnd = text.indexOf('>', i);
          const tag = text.substring(i + 1, tagEnd);
          currentTag = tag;
          i = tagEnd + 1;
        }
      } else {
        currentText += text[i];
        i++;
      }
    }

    if (currentText) {
      parts.push({ text: currentText, tag: currentTag });
    }

    return parts;
  };

  useEffect(() => {
    if (!isTyping) return;

    const allParts = parseText(text);
    let currentPartIndex = 0;
    let currentCharIndex = 0;
    let currentParts = [];

    const typeNextChar = () => {
      if (currentPartIndex >= allParts.length) {
        setIsTyping(false);
        setIsComplete(true);
        onComplete?.();
        return;
      }

      const currentPart = allParts[currentPartIndex];
      
      if (currentCharIndex < currentPart.text.length) {
        // Créer une copie du texte actuel avec le caractère suivant
        const newText = currentPart.text.substring(0, currentCharIndex + 1);
        const newPart = { ...currentPart, text: newText };
        
        // Mettre à jour les parties affichées
        const updatedParts = [...currentParts];
        updatedParts[currentPartIndex] = newPart;
        setDisplayedParts(updatedParts);
        
        currentCharIndex++;
        if (currentPart.text[currentCharIndex - 1] !== '\n') {
          setSoundCounter(prev => {
            const newCounter = prev + 1;
            if (newCounter % 5 === 0) {
              playRandomKeyboardSound();
            }
            return newCounter;
          });
        }
      } else {
        // Passer à la partie suivante
        currentParts = [...currentParts, currentPart];
        currentPartIndex++;
        currentCharIndex = 0;
      }
    };

    const interval = setInterval(typeNextChar, speed);
    return () => clearInterval(interval);
  }, [text, speed, isTyping, onComplete, playRandomKeyboardSound]);

  const renderText = () => {
    return displayedParts.map((part, index) => {
      if (part.tag === 'br') {
        return <br key={index} />;
      }
      
      return (
        <Typography
          key={index}
          component="span"
          sx={{
            color: part.tag ? keywords[part.tag]?.color : 'inherit',
            fontWeight: part.tag === 'primary' ? 'bold' : 'normal',
            lineHeight: 1.7,
            opacity: 0.85,
            letterSpacing: '0.3px'
          }}
        >
          {part.text}
        </Typography>
      );
    });
  };

  return (
    <Box sx={{ minHeight: '1.5em' }}>
      {renderText()}
    </Box>
  );
};

export default TypewriterText; 