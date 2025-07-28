import { IEffect } from '../core/interfaces';

export class NoiseEffect extends IEffect {
  constructor(scene) {
    super();
    this.scene = scene;
    this.isActive = false;
    this.baseIntensity = 1.0;
    this.currentIntensity = 0; // Intensité actuelle basée sur la distance
    this.targetIntensity = 0;
    
    // Propriétés de l'effet
    this.noiseGraphics = null;
    this.glitchGraphics = null;
    this.perlinGraphics = null;
    
    // Propriétés audio
    this.audioContext = null;
    this.audioBuffer = null;
    this.audioSource = null;
    this.gainNode = null;
    this.isAudioLoaded = false;
    this.isAudioPlaying = false;
    
    // Configuration pour effet progressif mais visible
    this.minNoiseIntensity = 0.015; // Opacité minimale plus subtile
    this.maxNoiseIntensity = 0.25; // Opacité maximale plus subtile
    this.minGlitchIntensity = 0.008; // Glitches plus subtils au minimum
    this.maxGlitchIntensity = 0.15; // Glitches plus subtils au maximum
    this.minPerlinIntensity = 0.02; // Perlin plus subtil au minimum
    this.maxPerlinIntensity = 0.4; // Perlin plus subtil au maximum
    
    // Configuration audio plus subtile
    this.minAudioVolume = 0.0; // Volume minimum (silence)
    this.maxAudioVolume = 0.15; // Volume maximum plus subtil
    
    // this.shakeIntensity = 4.0; // Supprimé : effet de shake désactivé
    
    // Transition plus rapide pour éviter la boucle infinie start/stop
    this.intensitySpeed = 0.08; // Transition plus rapide pour éviter l'effet de sortie
    
    // Variables pour bruit de Perlin
    this.perlinSeed = Math.random() * 1000;
    this.perlinScale = 0.08; // Plus petit pour plus de détail
    this.perlinTime = 0;
    this.perlinSpeed = 0.3; // Plus lent pour plus de douceur
    
    // Variables pour glitches très doux
    this.glitchLines = [];
    this.glitchTimer = 0;
    
    this.initializeGraphics();
    this.initializeAudio();
    // NE PAS démarrer automatiquement l'effet
  }

  initializeGraphics() {
    // Créer les overlays graphiques - invisibles au début
    this.perlinGraphics = this.scene.add.graphics();
    this.perlinGraphics.setDepth(999);
    this.perlinGraphics.setVisible(false); // Invisibles au début
    this.perlinGraphics.setAlpha(0); // Opacité 0 au début
    
    this.noiseGraphics = this.scene.add.graphics();
    this.noiseGraphics.setDepth(1000);
    this.noiseGraphics.setVisible(false); // Invisibles au début
    this.noiseGraphics.setAlpha(0); // Opacité 0 au début
    
    this.glitchGraphics = this.scene.add.graphics();
    this.glitchGraphics.setDepth(1001);
    this.glitchGraphics.setVisible(false); // Invisibles au début
    this.glitchGraphics.setAlpha(0); // Opacité 0 au début
  }

  async initializeAudio() {
    try {
      // Créer le contexte audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Créer le nœud de gain pour contrôler le volume
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0; // Commencer à 0
      
      // Créer un générateur de bruit blanc
      this.createNoiseGenerator();
      
      this.isAudioLoaded = true;
      console.log('🔊 Générateur de bruit blanc créé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la création du générateur audio:', error);
      this.isAudioLoaded = false;
    }
  }

  createNoiseGenerator() {
    // Créer un buffer pour le bruit blanc
    const bufferSize = this.audioContext.sampleRate * 2; // 2 secondes de bruit
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    // Générer du bruit blanc avec filtrage pour un son plus doux
    for (let i = 0; i < bufferSize; i++) {
      // Bruit blanc de base
      const whiteNoise = Math.random() * 2 - 1;
      
      // Appliquer un filtrage simple pour adoucir le bruit
      const filtered = whiteNoise * 0.3;
      
      // Ajouter une composante basse fréquence pour plus de profondeur
      const lowFreq = Math.sin(i * 0.001) * 0.1;
      
      output[i] = filtered + lowFreq;
    }
    
    // Stocker le buffer pour réutilisation
    this.noiseBuffer = buffer;
  }

  startAudioLoop() {
    if (!this.isAudioLoaded || this.isAudioPlaying) return;
    
    try {
      // Reprendre le contexte audio si nécessaire
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Créer une nouvelle source audio avec le bruit généré
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = this.noiseBuffer;
      this.audioSource.loop = true; // Boucle infinie parfaite
      
      // Ajouter un filtre passe-bas pour adoucir le son
      this.filterNode = this.audioContext.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 4000; // Couper les hautes fréquences agressives
      this.filterNode.Q.value = 0.5;
      
      // Connecter: source → filtre → gain → destination
      this.audioSource.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      
      // Démarrer la lecture
      this.audioSource.start();
      this.isAudioPlaying = true;
      
      console.log('🔊 Générateur de bruit blanc démarré en boucle');
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du générateur audio:', error);
    }
  }

  stopAudioLoop() {
    if (!this.isAudioPlaying || !this.audioSource) return;
    
    try {
      this.audioSource.stop();
      this.audioSource.disconnect();
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
      this.audioSource = null;
      this.isAudioPlaying = false;
      
      console.log('🔇 Générateur de bruit blanc arrêté');
    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt du générateur audio:', error);
    }
  }

  updateAudioVolume() {
    if (!this.isAudioLoaded || !this.gainNode) return;
    
    // Calculer le volume basé sur l'intensité actuelle avec une courbe plus douce
    const volume = this.minAudioVolume + (this.maxAudioVolume - this.minAudioVolume) * Math.pow(this.currentIntensity, 0.8);
    
    // Appliquer une transition douce au volume
    this.gainNode.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    
    // Moduler légèrement la fréquence de coupure du filtre selon l'intensité
    if (this.filterNode) {
      const cutoffFreq = 2000 + (this.currentIntensity * 3000); // Entre 2kHz et 5kHz
      this.filterNode.frequency.setTargetAtTime(cutoffFreq, this.audioContext.currentTime, 0.2);
    }
  }

  // Nouvelle méthode pour définir l'intensité basée sur la distance
  setDistanceIntensity(intensity) {
    const previousTarget = this.targetIntensity;
    this.targetIntensity = Math.max(0, Math.min(1, intensity));
    
    // Log si l'intensité change significativement
    if (Math.abs(this.targetIntensity - previousTarget) > 0.1) {
      console.log(`🔊 NoiseEffect: Intensité cible ${(previousTarget * 100).toFixed(1)}% → ${(this.targetIntensity * 100).toFixed(1)}%`);
    }
    
    // Démarrer l'effet seulement si intensité > 0
    if (this.targetIntensity > 0 && !this.isActive) {
      this.startContinuousEffect();
      console.log(`🔊 NoiseEffect: Démarrage de l'effet (intensité: ${(this.targetIntensity * 100).toFixed(1)}%)`);
    }
    // Arrêter l'effet si intensité = 0
    else if (this.targetIntensity === 0 && this.isActive) {
      this.stopContinuousEffect();
      console.log(`🔊 NoiseEffect: Arrêt de l'effet`);
    }
  }

  startContinuousEffect() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.currentIntensity = 0;
    this.perlinTime = 0;
    this.glitchTimer = 0;
    
    // Démarrer l'audio en boucle
    this.startAudioLoop();
    
    console.log('🔊 Effet de bruit continu activé');
  }

  stopContinuousEffect() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // Arrêter l'audio
    this.stopAudioLoop();
    
    console.log('🔇 Effet de bruit continu désactivé');
  }

  // Générateur de bruit de Perlin amélioré
  noise(x, y, z = 0) {
    const seed = this.perlinSeed;
    // Hash function pour du vrai bruit pseudo-aléatoire
    let hash = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164 + seed) * 43758.5453;
    return (hash - Math.floor(hash)) * 2 - 1;
  }

  smoothNoise(x, y, z = 0) {
    // Interpolation bilinéaire pour un bruit plus lisse
    const intX = Math.floor(x);
    const intY = Math.floor(y);
    const fracX = x - intX;
    const fracY = y - intY;
    
    // Les 4 coins
    const a = this.noise(intX, intY, z);
    const b = this.noise(intX + 1, intY, z);
    const c = this.noise(intX, intY + 1, z);
    const d = this.noise(intX + 1, intY + 1, z);
    
    // Interpolation
    const i1 = this.interpolate(a, b, fracX);
    const i2 = this.interpolate(c, d, fracX);
    
    return this.interpolate(i1, i2, fracY);
  }

  interpolate(a, b, t) {
    // Interpolation cosinus pour plus de douceur
    const ft = t * Math.PI;
    const f = (1 - Math.cos(ft)) * 0.5;
    return a * (1 - f) + b * f;
  }

  // Octaves de bruit pour plus de complexité
  perlinNoise(x, y, z = 0) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    
    // 3 octaves pour un bruit riche
    for (let i = 0; i < 3; i++) {
      value += this.smoothNoise(x * frequency, y * frequency, z) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value;
  }

  startEffect() {
    // Méthode legacy - l'effet est maintenant toujours actif
    this.setDistanceIntensity(this.baseIntensity);
  }

  stopEffect() {
    // Méthode legacy - ramène juste l'intensité à 0
    this.setDistanceIntensity(0);
  }

  // Méthodes legacy pour compatibilité
  apply(target) {
    this.setDistanceIntensity(this.baseIntensity);
  }

  remove(target) {
    this.setDistanceIntensity(0);
  }

  update(delta) {
    // Toujours mettre à jour l'intensité pour le fade-out
    this.updateIntensity(delta);
    
    // Mettre à jour le volume audio en fonction de l'intensité
    this.updateAudioVolume();
    
    // Si l'intensité est très faible ET que l'intensité cible est aussi à 0, forcer l'arrêt complet
    if (this.currentIntensity < 0.005 && this.targetIntensity === 0) {
      if (this.isActive) {
        this.stopContinuousEffect();
      }
      return; // Sortir early pour éviter toute génération
    }
    
    // Si l'effet est actif, générer du nouveau bruit
    if (this.isActive) {
      this.perlinTime += delta * 0.001 * this.perlinSpeed;
      this.glitchTimer += delta;
      
      // Mettre à jour les effets visuels seulement si nécessaire
      if (this.currentIntensity > 0.01 || this.targetIntensity > 0) {
        this.updatePerlinEffect(delta);
        this.updateNoiseEffect(delta);
        this.updateGlitchEffect(delta);
      }
      // this.updateSubtleShake(delta); // Désactivé : effet de shake de caméra supprimé
    }
    
    // Désactiver la génération de bruit si intensité cible = 0
    if (this.targetIntensity === 0 && this.currentIntensity < 0.02) {
      if (this.isActive) {
        this.stopContinuousEffect();
      }
    }
  }

  updateIntensity(delta) {
    // Transition très douce vers l'intensité cible
    const diff = this.targetIntensity - this.currentIntensity;
    this.currentIntensity += diff * this.intensitySpeed * (delta / 16);
    
    // Forcer à 0 si très proche de 0
    if (Math.abs(this.currentIntensity) < 0.01) {
      this.currentIntensity = 0;
    }
    
    // Courbe d'interpolation modérée pour la progressivité
    const smoothedIntensity = Math.pow(this.currentIntensity, 1.5); // Courbe modérée
    
    // TOUJOURS nettoyer et masquer si intensité très faible ET intensité cible à 0
    if (this.currentIntensity < 0.005 && this.targetIntensity === 0) {
      // Vérifier que les objets graphiques existent avant d'appeler clear()
      if (this.perlinGraphics) {
        this.perlinGraphics.clear();
        this.perlinGraphics.setVisible(false);
        this.perlinGraphics.setAlpha(0);
      }
      if (this.noiseGraphics) {
        this.noiseGraphics.clear();
        this.noiseGraphics.setVisible(false);
        this.noiseGraphics.setAlpha(0);
      }
      if (this.glitchGraphics) {
        this.glitchGraphics.clear();
        this.glitchGraphics.setVisible(false);
        this.glitchGraphics.setAlpha(0);
      }
      return; // Sortir early pour éviter tout autre traitement
    }
    
    // Si l'intensité cible est 0, on va vers 0 complètement
    if (this.targetIntensity === 0) {
      const perlinAlpha = smoothedIntensity * this.maxPerlinIntensity;
      const noiseAlpha = smoothedIntensity * this.maxNoiseIntensity;
      const glitchAlpha = smoothedIntensity * this.maxGlitchIntensity;
      
      // Vérifier que les objets graphiques existent avant de les modifier
      if (this.perlinGraphics) {
        this.perlinGraphics.setAlpha(perlinAlpha);
      }
      if (this.noiseGraphics) {
        this.noiseGraphics.setAlpha(noiseAlpha);
      }
      if (this.glitchGraphics) {
        this.glitchGraphics.setAlpha(glitchAlpha);
      }
    } else {
      // Interpolation progressive entre les opacités min et max avec courbe ultra exponentielle
      const perlinAlpha = this.minPerlinIntensity + (this.maxPerlinIntensity - this.minPerlinIntensity) * smoothedIntensity;
      const noiseAlpha = this.minNoiseIntensity + (this.maxNoiseIntensity - this.minNoiseIntensity) * smoothedIntensity;
      const glitchAlpha = this.minGlitchIntensity + (this.maxGlitchIntensity - this.minGlitchIntensity) * smoothedIntensity;
      
      // Vérifier que les objets graphiques existent avant de les modifier
      if (this.perlinGraphics) {
        this.perlinGraphics.setAlpha(perlinAlpha);
        this.perlinGraphics.setVisible(true);
      }
      if (this.noiseGraphics) {
        this.noiseGraphics.setAlpha(noiseAlpha);
        this.noiseGraphics.setVisible(true);
      }
      if (this.glitchGraphics) {
        this.glitchGraphics.setAlpha(glitchAlpha);
        this.glitchGraphics.setVisible(true);
      }
    }
  }

  updatePerlinEffect(delta) {
    if (!this.perlinGraphics) return;
    this.perlinGraphics.clear();
    
    const screenWidth = this.scene.sys.canvas.width;
    const screenHeight = this.scene.sys.canvas.height;
    const step = 3; // Résolution plus fine pour plus de densité
    
    // Générer le bruit de Perlin avec octaves - TOUJOURS
    for (let x = 0; x < screenWidth; x += step) {
      for (let y = 0; y < screenHeight; y += step) {
        const noiseValue = this.perlinNoise(
          x * this.perlinScale, 
          y * this.perlinScale, 
          this.perlinTime
        );
        
        // Convertir en valeur incluant le noir complet pour plus de contraste
        const normalizedNoise = (noiseValue + 1) * 0.5; // 0 à 1
        // Amplifier le contraste pour inclure plus de noir et blanc
        const contrastNoise = Math.pow(normalizedNoise, 0.7); // Courbe qui favorise les extrêmes
        const grayValue = Math.floor(contrastNoise * 255);
        const color = (grayValue << 16) | (grayValue << 8) | grayValue;
        
        // Alpha plus agressif pour saturer davantage l'écran
        const alpha = 0.9 * (0.3 + 0.7 * Math.abs(noiseValue)); // Alpha plus fort et plus constant
        
        if (alpha > 0.02) { // Seuil encore plus bas pour plus de saturation
          this.perlinGraphics.fillStyle(color, alpha);
          this.perlinGraphics.fillRect(x, y, step, step);
        }
      }
    }
  }

  updateNoiseEffect(delta) {
    if (!this.noiseGraphics) return;
    this.noiseGraphics.clear();
    
    const screenWidth = this.scene.sys.canvas.width;
    const screenHeight = this.scene.sys.canvas.height;
    
    // Bruit blanc avec courbe exponentielle ultra agressive
    const baseDensity = 0; // Pas de densité de base
    const maxDensity = 1200; // Densité maximale beaucoup plus élevée
    const density = Math.floor(baseDensity + maxDensity * Math.pow(this.currentIntensity, 3.0)); // Courbe plus agressive
    
    for (let i = 0; i < density; i++) {
      const x = Math.random() * screenWidth;
      const y = Math.random() * screenHeight;
      
      // Taille variable avec courbe exponentielle
      const baseSize = 0.3;
      const maxSize = 3; // Taille maximale plus grande
      const size = baseSize + (maxSize - baseSize) * Math.pow(this.currentIntensity, 3.0) * Math.random();
      
      const grayValue = Math.floor(Math.random() * 256);
      const color = (grayValue << 16) | (grayValue << 8) | grayValue;
      
      // Alpha constant, l'opacité est gérée par setAlpha
      const pixelAlpha = 0.8 * Math.random();
      
      this.noiseGraphics.fillStyle(color, pixelAlpha);
      this.noiseGraphics.fillRect(x, y, size, size);
    }
  }

  updateGlitchEffect(delta) {
    if (!this.glitchGraphics) return;
    this.glitchGraphics.clear();
    
    const screenWidth = this.scene.sys.canvas.width;
    const screenHeight = this.scene.sys.canvas.height;
    
    // Glitches qui apparaissent plus tôt avec courbe plus douce
    const glitchChance = 0.02 * Math.pow(this.currentIntensity, 0.8); // Courbe plus douce pour apparition plus tôt
    
    if (this.glitchTimer > 120 && Math.random() < glitchChance) {
      const numLines = Math.floor(Math.random() * 5) + 1; // 1-5 lignes
      
      for (let i = 0; i < numLines; i++) {
        const y = Math.random() * screenHeight;
        const height = 1 + Math.floor(Math.random() * 4 * this.currentIntensity); // Hauteur variable
        const displacement = (Math.random() - 0.5) * 12 * (0.2 + 0.8 * this.currentIntensity);
        
        // RGB separation progressive et plus violente
        const separation = (0.3 + 1.2 * this.currentIntensity) * 1.5;
        const alpha = 0.8; // Alpha plus fort
        
        // Canal rouge
        this.glitchGraphics.fillStyle(0xff0000, alpha);
        this.glitchGraphics.fillRect(displacement - separation, y, screenWidth * 0.6, height);
        
        // Canal vert
        this.glitchGraphics.fillStyle(0x00ff00, alpha);
        this.glitchGraphics.fillRect(displacement, y, screenWidth * 0.6, height);
        
        // Canal bleu
        this.glitchGraphics.fillStyle(0x0000ff, alpha);
        this.glitchGraphics.fillRect(displacement + separation, y, screenWidth * 0.6, height);
      }
      
      this.glitchTimer = 0;
    }
  }

  // updateSubtleShake() supprimée - effet de shake de caméra désactivé

  isFinished() {
    return false; // Effet toujours actif
  }

  setIntensity(intensity) {
    this.baseIntensity = Math.max(0, Math.min(1, intensity));
  }

  setDuration(duration) {
    // Plus utilisé avec le nouveau système progressif
  }

  clear() {
    this.isActive = false;
    this.currentIntensity = 0;
    this.targetIntensity = 0;
    
    // Arrêter et nettoyer l'audio
    this.stopAudioLoop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
    this.gainNode = null;
    this.isAudioLoaded = false;
    
    if (this.noiseGraphics) {
      this.noiseGraphics.destroy();
      this.noiseGraphics = null;
    }
    if (this.glitchGraphics) {
      this.glitchGraphics.destroy();
      this.glitchGraphics = null;
    }
    if (this.perlinGraphics) {
      this.perlinGraphics.destroy();
      this.perlinGraphics = null;
    }
  }

  // Méthodes utilitaires
  getIntensity() {
    return this.currentIntensity;
  }

  getCurrentIntensity() {
    return this.currentIntensity;
  }

  getTargetIntensity() {
    return this.targetIntensity;
  }
} 