import React, { memo, useState, useRef } from "react";
import useGameStore from "../../../store";
import useAssets from "../../../hooks/useAssets";
import useAudioManager from "../../../services/AudioManager";

/**
 * Composant pour afficher le statut audio avec des icônes SVG personnalisées
 * @returns {JSX.Element} - Le composant AudioStatus
 */
const AudioStatus = memo(() => {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const audioVolume = useGameStore((state) => state.audioVolume);
  const toggleAudio = useGameStore((state) => state.toggleAudio);
  const setAudioVolume = useGameStore((state) => state.setAudioVolume);
  const { getImagePath, isReady } = useAssets();
  const audioManager = useAudioManager();
  
  const [showVolumeBar, setShowVolumeBar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const volumeBarRef = useRef(null);

  // Si les assets ne sont pas encore chargés, ne pas afficher le composant
  if (!isReady) {
    return null;
  }

  // Gestion du clic sur le bouton principal
  const handleMainButtonClick = (e) => {
    // Shift+clic = debug complet
    if (e.shiftKey) {
      console.log("🔍 [AudioStatus] Debug mode activé");
      audioManager.debugAllAudioElements();
      return;
    }
    
    // Ctrl+clic = force stop tout
    if (e.ctrlKey || e.metaKey) {
      console.log("🚨 [AudioStatus] Force stop all audio");
      audioManager.forceStopAllAudio();
      return;
    }
    
    // Clic normal = toggle
    toggleAudio();
  };

  // Gestion du clic sur la barre de volume
  const handleVolumeBarClick = (e) => {
    e.stopPropagation(); // Empêcher le clic de remonter au bouton principal
    const rect = volumeBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, x / rect.width));
    setAudioVolume(newVolume);
  };

  // Gestion du drag de la barre de volume
  const handleVolumeBarMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  // Gestion du mouvement de la souris pendant le drag
  const handleMouseMove = (e) => {
    if (isDragging && volumeBarRef.current) {
      const rect = volumeBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newVolume = Math.max(0, Math.min(1, x / rect.width));
      setAudioVolume(newVolume);
    }
  };

  // Gestion de la fin du drag
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ajouter/supprimer les listeners de drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      style={{
        position: "absolute",
        top: "25px",
        right: "25px",
        zIndex: 1000,
      }}
      onMouseEnter={() => setShowVolumeBar(true)}
      onMouseLeave={() => !isDragging && setShowVolumeBar(false)}
    >
      {/* Container qui s'étend vers la gauche */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 1)",
          border: "1px solid rgba(255, 255, 255, 1)",
          borderRadius: "0px",
          height: "50px",
          width: showVolumeBar ? "200px" : "50px",
          transition: "width 0.3s ease-out",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Barre de volume (prend tout l'espace disponible à gauche) */}
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            width: showVolumeBar ? "149px" : "0px", // 200px - 50px (bouton) - 1px (border)
            height: "100%",
            padding: showVolumeBar ? "0 15px" : "0",
            display: "flex",
            alignItems: "center",
            opacity: showVolumeBar ? 1 : 0,
            transition: "opacity 0.3s ease-out, width 0.3s ease-out, padding 0.3s ease-out",
            pointerEvents: showVolumeBar ? "auto" : "none",
          }}
        >
          {/* Container de la barre de volume */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* Barre de volume interactive */}
            <div
              ref={volumeBarRef}
              style={{
                flex: 1,
                height: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                borderRadius: "2px",
                position: "relative",
                cursor: "pointer",
              }}
              onClick={handleVolumeBarClick}
              onMouseDown={handleVolumeBarMouseDown}
            >
              {/* Barre de progression */}
              <div
                style={{
                  width: `${audioVolume * 100}%`,
                  height: "100%",
                  backgroundColor: "#ffffff",
                  borderRadius: "2px",
                  transition: isDragging ? "none" : "width 0.1s ease-out",
                }}
              />
              {/* Curseur */}
              <div
                style={{
                  position: "absolute",
                  left: `${audioVolume * 100}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "12px",
                  height: "12px",
                  backgroundColor: "#ffffff",
                  borderRadius: "50%",
                  cursor: "grab",
                  transition: isDragging ? "none" : "left 0.1s ease-out",
                }}
              />
            </div>
            
            {/* Pourcentage */}
            <div
              style={{
                color: "#ffffff",
                fontSize: "11px",
                fontFamily: "monospace",
                minWidth: "30px",
                textAlign: "right",
              }}
            >
              {Math.round(audioVolume * 100)}%
            </div>
          </div>
        </div>

        {/* Bouton audio (toujours fixe à droite) */}
        <div
          style={{
            position: "absolute",
            right: "0",
            top: "0",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backgroundColor: "rgba(0, 0, 0, 1)",
            borderLeft: showVolumeBar ? "1px solid rgba(255, 255, 255, 0.3)" : "none",
            transition: "border-left 0.3s ease-out",
          }}
          onClick={handleMainButtonClick}
          title={
            audioVolume > 0 
              ? "Désactiver le son (M) • Shift+clic: Debug • Ctrl+clic: Force Stop" 
              : "Activer le son (M) • Shift+clic: Debug • Ctrl+clic: Force Stop"
          }
        >
          <img
            src={
              audioVolume > 0 ? getImagePath("unmute.svg") : getImagePath("mute.svg")
            }
            alt={audioVolume > 0 ? "Son activé" : "Son désactivé"}
            style={{
              width: "24px",
              height: "24px",
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default AudioStatus;
