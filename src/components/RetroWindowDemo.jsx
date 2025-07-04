import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useRetroWindowService } from '../pages/Game/services/RetroWindowService';
import RetroWindowManager from '../pages/Game/components/HUD/components/RetroWindowManager';

const RetroWindowDemo = () => {
  const retroWindowService = useRetroWindowService();

  // Initialiser le service au montage
  useEffect(() => {
    console.log('🪟 [RetroWindowDemo] Initializing service...');
    const success = retroWindowService.initialize();
    console.log('🪟 [RetroWindowDemo] Service initialized:', success);
    
    return () => {
      // Nettoyer au démontage
      console.log('🪟 [RetroWindowDemo] Cleaning up service...');
      retroWindowService.cleanup();
    };
  }, [retroWindowService]);

  const handleOpenWindow = () => {
    console.log('🪟 [RetroWindowDemo] Opening system window...');
    const windowConfig = {
      id: 'demo_window',
      title: 'System Information - C:\\WINDOWS\\SYSTEM32',
      width: 500,
      height: 350,
      content: `Microsoft Windows 95

System Resources:
Memory: 16,384 KB
Available: 8,192 KB

Disk Space:
Drive C: 2,048 MB
Available: 1,024 MB

Network:
Protocol: TCP/IP
Status: Connected

User Information:
Name: Administrator
Domain: WORKGROUP

System Files:
AUTOEXEC.BAT
CONFIG.SYS
COMMAND.COM
WIN.COM

Registry Entries:
HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows

Device Manager:
Display Adapter: VGA Compatible
Sound Card: Sound Blaster 16
Network Adapter: NE2000 Compatible

This is a demonstration of a retro-style window component.
You can scroll through this content using the scrollbar on the right.
The window has a classic Windows 95/98 appearance with:
- Black (#000000) background
- White borders
- Monospace font
- Retro scrollbar styling
- Smooth animations powered by Framer Motion

Click the X button in the top-right corner to close this window.
The window will animate out smoothly when closed.`
    };

    const result = retroWindowService.openWindow(windowConfig);
    console.log('🪟 [RetroWindowDemo] Window opened:', result);
  };

  const handleOpenRandomWindow = () => {
    console.log('🪟 [RetroWindowDemo] Opening random window...');
    const randomTexts = [
      "SYSTEM ERROR 404\n\nFile not found in the matrix.\nPlease try again later.\n\nError Code: 0x80004005\nModule: KERNEL32.DLL",
      "HACKING IN PROGRESS...\n\n> Connecting to mainframe...\n> Bypassing firewall...\n> Downloading secrets...\n> Access granted!\n\nWelcome to the underground.",
      "RETRO TERMINAL v2.1\n\nC:\\> dir\nVolume in drive C is SYSTEM\nDirectory of C:\\\n\nAUTOEXEC.BAT    1,024  01-01-95\nCONFIG.SYS      2,048  01-01-95\nWIN.COM        65,536  01-01-95\n\n3 File(s)     68,608 bytes\n         1,048,576 bytes free",
      "DIGITAL ARCHAEOLOGY\n\nExploring the ruins of cyberspace...\n\nFound artifacts:\n- Forgotten memes\n- Lost forum posts  \n- Ancient flame wars\n- Dial-up memories\n\nThe internet remembers everything.",
      "MEME GENERATOR v1.0\n\nGenerating random meme...\n\n[████████████████████] 100%\n\nResult: ALL YOUR BASE ARE BELONG TO US\n\nClassic level: MAXIMUM\nNostalgia factor: 9000+\n\nPress any key to continue..."
    ];

    const randomTitle = [
      "SYSTEM ERROR",
      "CYBER PROTOCOL",
      "RETRO TERMINAL", 
      "DIGITAL RUINS",
      "MEME FACTORY"
    ];

    const randomIndex = Math.floor(Math.random() * randomTexts.length);

    const windowConfig = {
      id: `random_window_${Date.now()}`,
      title: randomTitle[randomIndex],
      width: 450,
      height: 300,
      content: randomTexts[randomIndex]
    };

    const result = retroWindowService.openWindow(windowConfig);
    console.log('🪟 [RetroWindowDemo] Random window opened:', result);
  };

  const handleCloseAllWindows = () => {
    console.log('🪟 [RetroWindowDemo] Closing all windows...');
    const result = retroWindowService.closeAllWindows();
    console.log('🪟 [RetroWindowDemo] All windows closed:', result);
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Démonstration RetroWindow avec Service
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
        Cette démo utilise maintenant le RetroWindowService pour gérer les fenêtres.
        Les fenêtres sont centrées automatiquement et ont des animations fluides.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          onClick={handleOpenWindow}
        >
          Ouvrir fenêtre système
        </Button>

        <Button 
          variant="outlined" 
          onClick={handleOpenRandomWindow}
        >
          Ouvrir fenêtre aléatoire
        </Button>

        <Button 
          variant="text" 
          color="error"
          onClick={handleCloseAllWindows}
        >
          Fermer toutes les fenêtres
        </Button>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
        💡 Les fenêtres sont déplaçables, centrées automatiquement et s'animent à l'ouverture/fermeture
      </Typography>

      {/* Gestionnaire des fenêtres rétro */}
      <RetroWindowManager />
    </Box>
  );
};

export default RetroWindowDemo; 