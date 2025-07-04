/**
 * Constantes du jeu Third Person
 * Style Yume Nikki - Minimal et dreamlike
 */

// Configuration de la caméra
export const CAMERA_CONFIG = {
  FOV: 50, // FOV réduit pour effet couloir
  NEAR: 0.1,
  FAR: 1000,
  HEIGHT_OFFSET: 8, // Hauteur de caméra fixe
  DISTANCE: 15, // Distance du joueur
  FOLLOW_SPEED: 2, // Vitesse de suivi de la caméra
};

// Configuration du joueur
export const PLAYER_CONFIG = {
  MOVE_SPEED: 5, // Vitesse normale restaurée
  ROTATION_SPEED: 3, // Vitesse normale restaurée
  SIZE: { width: 2, height: 3 }, // Taille du billboard
  SPRITE_SIZE: { width: 140, height: 190 }, // Taille d'une frame
  ANIMATION_SPEED: 0.15, // Vitesse d'animation (secondes par frame)
};

// Configuration du spritesheet
export const SPRITE_CONFIG = {
  COLS: 3, // 3 colonnes (3 frames par direction)
  ROWS: 4, // 4 lignes (4 directions)
  DIRECTIONS: {
    DOWN: 2,   // Bas
    LEFT: 3,   // Gauche  
    RIGHT: 1,  // Droite
    UP: 0,     // Haut
  },
  IDLE_FRAME: 1, // Frame du milieu pour l'état idle
};

// Configuration du monde
export const WORLD_CONFIG = {
  FLOOR_SIZE: 50,
  WALL_HEIGHT: 10,
  WALL_THICKNESS: 1,
  ROOM_SIZE: 20,
};

// Couleurs Yume Nikki (pastel, douces)
export const COLORS = {
  FLOOR: '#E8D5B7',
  WALLS: '#C8A882',
  AMBIENT: '#F5F0E8',
  PLAYER_OUTLINE: '#5A5A5A',
};

// Contrôles clavier
export const CONTROLS = {
  // Mouvement (AZERTY physique mais codes QWERTY)
  FORWARD: ['KeyW', 'ArrowUp'],        // Z sur AZERTY = KeyW
  BACKWARD: ['KeyS', 'ArrowDown'],     // S sur AZERTY = KeyS
  STRAFE_LEFT: ['KeyA'],               // Q sur AZERTY = KeyA
  STRAFE_RIGHT: ['KeyD'],              // D sur AZERTY = KeyD
  
  // Debug
  DEBUG_DOWNLOAD_SPRITESHEET: ['KeyP'],
}; 