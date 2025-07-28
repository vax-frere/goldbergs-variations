import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Wall } from '../entities/Wall';
import { Door } from '../entities/Door';
import { Psychologist } from '../entities/Psychologist';

export class Level2 extends ILevel {
  constructor() {
    super();
    this.scene = null;
    this.entityManager = null;
    this.collisionSystem = null;
    this.effectManager = null;
    this.player = null;
    this.walls = [];
    this.door = null;
    this.psychologist = null;
    this.isInitialized = false;
    
    // Musique de fond
    this.backgroundMusic = null;
    
    // Configuration du niveau 2 - plus petit que le niveau 1 et centré dans l'écran
    // Écran : 800x600, Niveau : 400x300
    // Centrage : x = (800-400)/2 = 200, y = (600-300)/2 = 150
    this.levelConfig = {
      playerStartX: 250, // Devant la porte (mur de gauche)
      playerStartY: 300, // Centre vertical du niveau
      levelBounds: {
        x: 200,  // Centré horizontalement
        y: 150,  // Centré verticalement
        width: 400, // Beaucoup plus petit que le niveau 1 (736)
        height: 300  // Beaucoup plus petit que le niveau 1 (536)
      }
    };
    
    console.log('🏢 Niveau 2 créé (plus petit et vide)');
  }

  init(scene) {
    console.log('🏢 Initialisation du niveau 2...');
    this.scene = scene;
    this.entityManager = scene.getEntityManager();
    this.collisionSystem = scene.getCollisionSystem();
    this.effectManager = scene.getEffectManager();
    
    // Démarrer la musique de fond
    this.startBackgroundMusic();
    
    // Créer le niveau
    this.createLevel();
    this.setupCollisions();
    
    this.isInitialized = true;
    console.log('✅ Niveau 2 initialisé avec succès !');
  }

  createLevel() {
    // Créer l'environnement du psychologue
    this.createPsychologistEnvironment();
    
    // Créer le joueur
    this.createPlayer();
    
    // Créer les murs de périmètre
    this.createWalls();
    
    // Créer le psychologue au centre
    this.createPsychologist();
    
    // Créer une porte de retour vers le niveau 1
    this.createReturnDoor();
    
    console.log('👨‍⚕️ Bureau du psychologue créé !');
  }

  startBackgroundMusic() {
    try {
      // Créer et démarrer la musique de fond
      this.backgroundMusic = this.scene.sound.add('level-2', {
        loop: true,
        volume: 0.3
      });
      
      this.backgroundMusic.play();
      console.log('🎵 Musique de fond démarrée pour le niveau 2');
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la musique:', error);
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
      this.backgroundMusic.destroy();
      this.backgroundMusic = null;
      console.log('🔇 Musique de fond arrêtée');
    }
  }

  createPsychologistEnvironment() {
    // Créer un sol avec une couleur apaisante pour le bureau du psychologue
    const bounds = this.levelConfig.levelBounds;
    const tileSize = 32;
    
    for (let x = bounds.x; x < bounds.x + bounds.width; x += tileSize) {
      for (let y = bounds.y; y < bounds.y + bounds.height; y += tileSize) {
        const isLightTile = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        const tileColor = isLightTile ? 0xf0f8ff : 0xe8f4f8; // Couleur très douce bleu-vert
        
        const tile = this.scene.add.rectangle(
          x + tileSize/2, 
          y + tileSize/2, 
          tileSize, 
          tileSize, 
          tileColor
        );
        tile.setStrokeStyle(1, 0xd0e7ff);
        tile.setDepth(0);
      }
    }
    
    // Ajouter quelques éléments décoratifs pour le bureau
    this.addPsychologistDecorations();
  }

  addPsychologistDecorations() {
    const bounds = this.levelConfig.levelBounds;
    
    // Bureau du psychologue (rectangle marron) - au centre-fond du niveau
    // Taille proportionnelle au personnage principal (70x95 pixels)
    const desk = this.scene.add.rectangle(
      bounds.x + bounds.width/2, // Centre horizontal
      bounds.y + bounds.height/2 - 40, // Légèrement vers le fond
      90, 50, 0x8B4513 // Taille ajustée : 90x50 pixels
    );
    desk.setStrokeStyle(2, 0x654321);
    desk.setDepth(1);
    
    // Chaises pour les patients (rectangles bleus) - face au bureau
    // Taille proportionnelle au personnage principal
    const chair1 = this.scene.add.rectangle(
      bounds.x + bounds.width/2 - 40, // À gauche du bureau
      bounds.y + bounds.height/2 + 40, // Face au bureau (plus vers l'avant)
      40, 40, 0x4a90e2 // Taille ajustée : 40x40 pixels
    );
    chair1.setDepth(1);
    
    const chair2 = this.scene.add.rectangle(
      bounds.x + bounds.width/2 + 40, // À droite du bureau
      bounds.y + bounds.height/2 + 40, // Face au bureau (plus vers l'avant)
      40, 40, 0x4a90e2 // Taille ajustée : 40x40 pixels
    );
    chair2.setDepth(1);
    
    // Plantes décoratives (cercles verts)
    const plant1 = this.scene.add.circle(
      bounds.x + 50, 
      bounds.y + 50, 
      15, 0x228B22
    );
    plant1.setDepth(1);
    
    const plant2 = this.scene.add.circle(
      bounds.x + bounds.width - 50, 
      bounds.y + bounds.height - 50, 
      15, 0x228B22
    );
    plant2.setDepth(1);
  }

  createPlayer() {
    // Créer le joueur à la position de départ du niveau 2
    this.player = new Player(
      this.scene,
      this.levelConfig.playerStartX,
      this.levelConfig.playerStartY
    );
    
    // Configurer les limites du joueur pour le niveau 2
    this.player.setWorldBounds(this.levelConfig.levelBounds);
    
    // Ajouter le joueur au gestionnaire d'entités
    this.entityManager.addEntity(this.player, 'player');
    
    console.log('👤 Joueur créé dans le niveau 2');
  }

  createWalls() {
    const bounds = this.levelConfig.levelBounds;
    
    // Créer les murs du périmètre
    const wallPositions = [
      // Mur du haut
      ...this.createWallLine(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y),
      // Mur du bas
      ...this.createWallLine(bounds.x, bounds.y + bounds.height, bounds.x + bounds.width, bounds.y + bounds.height),
      // Mur de gauche
      ...this.createWallLine(bounds.x, bounds.y, bounds.x, bounds.y + bounds.height),
      // Mur de droite
      ...this.createWallLine(bounds.x + bounds.width, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height)
    ];
    
    // Créer les entités mur
    for (const pos of wallPositions) {
      const wall = new Wall(this.scene, pos.x, pos.y);
      this.entityManager.addEntity(wall, 'wall');
      this.walls.push(wall);
    }
    
    console.log(`🧱 ${wallPositions.length} murs créés pour le niveau 2`);
  }

  createWallLine(x1, y1, x2, y2) {
    const positions = [];
    const wallSize = 32;
    
    if (x1 === x2) {
      // Ligne verticale
      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);
      
      for (let y = startY; y <= endY; y += wallSize) {
        positions.push({ x: x1, y: y });
      }
    } else {
      // Ligne horizontale
      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);
      
      for (let x = startX; x <= endX; x += wallSize) {
        positions.push({ x: x, y: y1 });
      }
    }
    
    return positions;
  }

  setupCollisions() {
    // Configurer les collisions pour le niveau 2
    this.collisionSystem.addCollisionPair('player', 'wall', (player, wall) => {
      player.onCollision(wall);
    });
    
    console.log('🔄 Collisions configurées pour le niveau 2');
  }

  update(delta) {
    // Mise à jour minimale pour le niveau 2
    // Le niveau 2 est principalement vide, pas besoin de logique complexe
    
    // Pas d'effet de bruit dans le niveau 2
    // Pas d'étudiants à gérer
    
    // Juste s'assurer que le joueur reste dans les limites
    if (this.player) {
      // Mise à jour handled par l'EntityManager
    }
  }

  createPsychologist() {
    // Créer le psychologue derrière son bureau au centre-fond du niveau
    const bounds = this.levelConfig.levelBounds;
    const psychologistX = bounds.x + bounds.width/2; // Centre horizontal (aligné avec le bureau)
    const psychologistY = bounds.y + bounds.height/2 - 80; // Derrière le bureau
    
    this.psychologist = new Psychologist(this.scene, psychologistX, psychologistY);
    this.entityManager.addEntity(this.psychologist, 'psychologist');
    
    console.log(`👨‍⚕️ Psychologue créé derrière son bureau à (${psychologistX}, ${psychologistY}), face aux chaises`);
  }

  createReturnDoor() {
    // Créer une porte de retour au centre du mur de gauche
    const bounds = this.levelConfig.levelBounds;
    const doorX = bounds.x; // Sur le mur de gauche (alignée avec le mur)
    const doorY = bounds.y + bounds.height / 2; // Au centre vertical
    
    this.door = new Door(this.scene, doorX, doorY, 'horizontal');
    // Modifier la porte pour retourner au niveau 1
    this.door.targetLevel = 'school';
    this.door.changeLevel = () => {
      if (this.door.scene.changeLevel) {
        this.door.scene.changeLevel('school', 'Classroom');
      }
    };
    
    this.entityManager.addEntity(this.door, 'door');
    
    console.log(`🚪 Porte de retour créée à (${doorX}, ${doorY})`);
  }

  cleanup() {
    console.log('🧹 Nettoyage du bureau du psychologue...');
    
    // Arrêter la musique de fond
    this.stopBackgroundMusic();
    
    // Réinitialiser les références locales (les entités seront nettoyées par GameScene)
    this.walls = [];
    this.door = null;
    this.psychologist = null;
    this.player = null;
    
    this.isInitialized = false;
    console.log('✅ Bureau du psychologue nettoyé (entités gérées par GameScene)');
  }

  // Méthodes utilitaires
  getPlayer() {
    return this.player;
  }

  getLevelBounds() {
    return this.levelConfig.levelBounds;
  }

  getPlayerStartPosition() {
    return {
      x: this.levelConfig.playerStartX,
      y: this.levelConfig.playerStartY
    };
  }

  // Méthode pour retourner au niveau 1 (pourrait être ajoutée plus tard)
  changeToLevel1() {
    console.log('🏫 Demande de retour au niveau 1...');
    // Cette méthode pourrait être implémentée plus tard
  }

  // Méthode de debug
  toggleDebug(show) {
    // Pas grand chose à déboguer dans un niveau vide
    if (this.player && this.player.toggleDebugHitboxes) {
      this.player.toggleDebugHitboxes(show);
    }
  }
} 