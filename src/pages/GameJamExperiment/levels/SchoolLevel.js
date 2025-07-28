import { ILevel } from '../core/interfaces';
import { Player } from '../entities/Player';
import { Student } from '../entities/Student';
import { Wall } from '../entities/Wall';
import { Door } from '../entities/Door';
import { NoiseEffect } from '../effects/NoiseEffect';

export class SchoolLevel extends ILevel {
  constructor() {
    super();
    this.scene = null;
    this.entityManager = null;
    this.collisionSystem = null;
    this.effectManager = null;
    this.player = null;
    this.students = [];
    this.walls = [];
    this.door = null;
    this.isInitialized = false;
    this.noiseEffect = null;
    
    // Musique de fond
    this.backgroundMusic = null;
    
    // Configuration du niveau - centré dans l'écran 800x600
    // Centrage : x = (800-736)/2 = 32, y = (600-536)/2 = 32 ✓ (déjà centré)
    this.levelConfig = {
      studentCount: 5,
      playerStartX: 112,  // À gauche du niveau (32 + 80 = 112)
      playerStartY: 300,  // Centre vertical du niveau (32 + 536/2 = 300)
      schoolBounds: {
        x: 32,    // Centré horizontalement
        y: 32,    // Centré verticalement
        width: 736,
        height: 536
      }
    };
    
    // Configuration pour l'effet de distance progressive
    this.maxEffectDistance = 150; // Distance maximale d'effet
    this.minEffectDistance = 20;   // Distance minimale pour effet maximum
    this.currentMaxIntensity = 0; // Intensité maximale actuelle
    this.updateTimer = 0; // Timer pour éviter de calculer trop souvent
    this.updateInterval = 20; // Mise à jour plus fréquente pour plus de fluidité
  }

  init(scene) {
    console.log('🏫 Initialisation du niveau SchoolLevel...');
    this.scene = scene;
    this.entityManager = scene.getEntityManager();
    this.collisionSystem = scene.getCollisionSystem();
    this.effectManager = scene.getEffectManager();
    
    // Démarrer la musique de fond
    this.startBackgroundMusic();
    
    // Créer l'effet de bruit pour ce niveau
    this.noiseEffect = new NoiseEffect(scene);
    console.log('🔊 NoiseEffect créé:', !!this.noiseEffect);
    
    // Créer le niveau
    this.createLevel();
    this.setupCollisions();
    
    this.isInitialized = true;
    console.log('✅ Niveau SchoolLevel initialisé avec succès !');
  }

  startBackgroundMusic() {
    try {
      // Créer et démarrer la musique de fond
      this.backgroundMusic = this.scene.sound.add('level-1-music', {
        loop: true,
        volume: 0.3
      });
      
      this.backgroundMusic.play();
      console.log('🎵 Musique de fond démarrée pour le niveau 1');
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

  createLevel() {
    // Créer l'environnement de l'école
    this.createSchoolEnvironment();
    
    // Créer le joueur
    this.createPlayer();
    
    // Créer les étudiants
    this.createStudents();
    
    // Créer les murs
    this.createWalls();
    
    // Créer la porte vers le niveau 2
    this.createDoor();
    
    console.log('🏫 Niveau école créé avec succès !');
  }

  createSchoolEnvironment() {
    // Créer le sol de l'école avec effet de carreaux
    const bounds = this.levelConfig.schoolBounds;
    const tileSize = 32;
    
    for (let x = bounds.x; x < bounds.x + bounds.width; x += tileSize) {
      for (let y = bounds.y; y < bounds.y + bounds.height; y += tileSize) {
        const isLightTile = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
        const tileColor = isLightTile ? 0xf0f0f0 : 0xe0e0e0;
        
        const tile = this.scene.add.rectangle(
          x + tileSize/2, 
          y + tileSize/2, 
          tileSize, 
          tileSize, 
          tileColor
        );
        tile.setStrokeStyle(1, 0xcccccc);
        tile.setDepth(0);
      }
    }
    
    // Ajouter quelques éléments décoratifs
    this.addDecorations();
  }

  addDecorations() {
    // Ajouter des "bureaux" ou éléments décoratifs bien répartis dans le niveau
    const bounds = this.levelConfig.schoolBounds;
    const decorations = [
      { x: bounds.x + 150, y: bounds.y + 150, type: 'desk' },
      { x: bounds.x + 350, y: bounds.y + 100, type: 'desk' },
      { x: bounds.x + 550, y: bounds.y + 200, type: 'desk' },
      { x: bounds.x + 250, y: bounds.y + 300, type: 'desk' },
      { x: bounds.x + 450, y: bounds.y + 350, type: 'desk' }
    ];
    
    for (const decoration of decorations) {
      // Créer un rectangle coloré pour représenter un bureau
      const desk = this.scene.add.rectangle(decoration.x, decoration.y, 60, 40, 0x8B4513);
      desk.setStrokeStyle(2, 0x654321);
      desk.setDepth(1);
    }
  }

  createPlayer() {
    this.player = new Player(
      this.scene,
      this.levelConfig.playerStartX,
      this.levelConfig.playerStartY
    );
    
    // Configurer les limites du joueur
    this.player.setWorldBounds(this.levelConfig.schoolBounds);
    
    // Ajouter le joueur au gestionnaire d'entités
    this.entityManager.addEntity(this.player, 'player');
    
    console.log('👤 Joueur créé');
  }

  createStudents() {
    console.log('🎓 Création des étudiants...');
    // Positions prédéfinies pour les étudiants - relativement aux bounds du niveau
    const bounds = this.levelConfig.schoolBounds;
    const studentPositions = [
      { x: bounds.x + 100, y: bounds.y + 250 },
      { x: bounds.x + 400, y: bounds.y + 150 },
      { x: bounds.x + 600, y: bounds.y + 300 },
      { x: bounds.x + 200, y: bounds.y + 400 },
      { x: bounds.x + 500, y: bounds.y + 450 }
    ];
    
    // Créer les étudiants
    for (let i = 0; i < this.levelConfig.studentCount; i++) {
      const pos = studentPositions[i] || {
        x: Math.random() * (this.levelConfig.schoolBounds.width - 100) + 50,
        y: Math.random() * (this.levelConfig.schoolBounds.height - 100) + 50
      };
      
      const student = new Student(this.scene, pos.x, pos.y);
      
      // Configurer les limites de mouvement
      student.setMovementBounds(this.levelConfig.schoolBounds);
      
      // Ajouter l'étudiant au gestionnaire d'entités
      this.entityManager.addEntity(student, 'student');
      this.students.push(student);
      
      console.log(`🎓 Étudiant ${i + 1} créé à (${pos.x}, ${pos.y}), sprite visible:`, student.sprite.visible);
    }
    
    console.log(`✅ ${this.students.length} étudiants créés au total`);
  }

  createWalls() {
    const bounds = this.levelConfig.schoolBounds;
    
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
    
    console.log(`🧱 ${wallPositions.length} murs créés`);
  }

  createDoor() {
    // Créer la porte au centre du mur de droite
    const bounds = this.levelConfig.schoolBounds;
    const doorX = bounds.x + bounds.width; // Sur le mur de droite (alignée avec le mur)
    const doorY = bounds.y + bounds.height / 2; // Au centre vertical du mur
    
    this.door = new Door(this.scene, doorX, doorY, 'horizontal');
    this.entityManager.addEntity(this.door, 'door');
    
    console.log(`🚪 Porte créée au centre du mur de droite à (${doorX}, ${doorY})`);
  }

  createWallLine(x1, y1, x2, y2) {
    const walls = [];
    const wallSize = 32;
    
    // Calculer la distance et la direction
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Créer les murs le long de la ligne
    const steps = Math.ceil(length / wallSize);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      
      walls.push({ x, y });
    }
    
    return walls;
  }

  setupCollisions() {
    // Configuration des collisions mur-joueur
    for (const wall of this.walls) {
      this.collisionSystem.addCollisionPair(this.player, wall);
    }
    
    // Configuration des collisions joueur-étudiants
    for (const student of this.students) {
      this.collisionSystem.addCollisionPair(this.player, student);
    }
    
    console.log(`🎯 Collisions configurées: ${this.walls.length} murs, ${this.students.length} étudiants`);
  }

  // Calculer l'intensité d'effet basée sur la distance
  calculateDistanceIntensity(playerPos, studentPos) {
    const distance = Math.sqrt(
      Math.pow(playerPos.x - studentPos.x, 2) + 
      Math.pow(playerPos.y - studentPos.y, 2)
    );
    
    if (distance > this.maxEffectDistance) {
      return 0; // Pas d'effet si trop loin
    }
    
    if (distance < this.minEffectDistance) {
      return 1; // Effet maximum si très proche
    }
    
    // Interpolation inverse : plus on est proche, plus l'effet est intense
    const normalizedDistance = (distance - this.minEffectDistance) / (this.maxEffectDistance - this.minEffectDistance);
    
    // Courbe progressive et visible
    let intensity = 1 - normalizedDistance;
    
    // Courbe exponentielle modérée pour la progressivité
    intensity = Math.pow(intensity, 1.8); // Courbe modérée
    
    return intensity;
  }

  // Mettre à jour l'effet de bruit basé sur la distance
  updateNoiseEffect() {
    if (!this.player || !this.noiseEffect) {
      console.log('⚠️ Player ou NoiseEffect manquant:', { player: !!this.player, noiseEffect: !!this.noiseEffect });
      return;
    }
    
    if (this.students.length === 0) {
      console.log('⚠️ Aucun étudiant trouvé !');
      return;
    }
    
    let maxIntensity = 0;
    let closestDistance = Infinity;
    let closestStudentIndex = -1;
    
    // Calculer l'intensité maximale parmi tous les étudiants
    for (let i = 0; i < this.students.length; i++) {
      const student = this.students[i];
      const distance = Math.sqrt(
        Math.pow(this.player.sprite.x - student.sprite.x, 2) + 
        Math.pow(this.player.sprite.y - student.sprite.y, 2)
      );
      
      const intensity = this.calculateDistanceIntensity(
        { x: this.player.sprite.x, y: this.player.sprite.y },
        { x: student.sprite.x, y: student.sprite.y }
      );
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestStudentIndex = i;
      }
      
      maxIntensity = Math.max(maxIntensity, intensity);
    }
    
    // Appliquer l'intensité à l'effet de bruit
    this.noiseEffect.setDistanceIntensity(maxIntensity);
    this.currentMaxIntensity = maxIntensity;
    
    // Debug info détaillé temporairement
    if (this.updateTimer % 200 < 50) {
      console.log(`🔊 Effet de bruit - Intensité: ${(maxIntensity * 100).toFixed(1)}%`);
      console.log(`   📏 Distance la plus proche: ${closestDistance.toFixed(1)}px (étudiant ${closestStudentIndex})`);
      console.log(`   🎯 Joueur à (${this.player.sprite.x.toFixed(1)}, ${this.player.sprite.y.toFixed(1)})`);
      console.log(`   🎓 ${this.students.length} étudiants total`);
      console.log(`   💫 Effet actif: ${this.noiseEffect.isActive ? 'OUI' : 'NON'}`);
      console.log(`   📊 Intensité courante: ${(this.noiseEffect.getCurrentIntensity() * 100).toFixed(1)}%`);
    }
  }

  update(delta) {
    if (!this.isInitialized) return;
    
    this.updateTimer += delta;
    
    // Mettre à jour l'effet de bruit à intervalles réguliers
    if (this.updateTimer >= this.updateInterval) {
      this.updateNoiseEffect();
      this.updateTimer = 0;
    }
    
    // Mettre à jour l'effet de bruit
    if (this.noiseEffect) {
      this.noiseEffect.update(delta);
    }
  }

  // Méthodes utilitaires pour l'effet
  getCurrentEffectIntensity() {
    return this.currentMaxIntensity;
  }

  getEffectStatus() {
    if (!this.noiseEffect) return 'disabled';
    return this.noiseEffect.isActive ? 'active' : 'inactive';
  }

  // Méthodes d'information sur le niveau
  getPlayerPosition() {
    return this.player ? { x: this.player.sprite.x, y: this.player.sprite.y } : null;
  }

  getStudentCount() {
    return this.students.length;
  }

  getActiveStudents() {
    return this.students.filter(student => student.isActive);
  }

  getLevelBounds() {
    return this.levelConfig.schoolBounds;
  }

  cleanup() {
    console.log('🧹 Nettoyage du niveau SchoolLevel...');
    
    // Arrêter la musique de fond
    this.stopBackgroundMusic();
    
    // Nettoyer l'effet de bruit spécifique au niveau
    if (this.noiseEffect) {
      this.noiseEffect.clear();
      this.noiseEffect = null;
    }
    
    // Réinitialiser les références locales (les entités seront nettoyées par GameScene)
    this.students = [];
    this.walls = [];
    this.door = null;
    this.player = null;
    
    this.isInitialized = false;
    console.log('✅ Niveau SchoolLevel nettoyé (entités gérées par GameScene)');
  }

  destroy() {
    this.cleanup();
    console.log('🏫 Niveau École détruit');
  }

  // Toggle du debug pour tous les étudiants
  toggleStudentsDebug(show = true) {
    this.students.forEach(student => {
      if (student.toggleDebugHitboxes) {
        student.toggleDebugHitboxes(show);
      }
    });
  }
} 