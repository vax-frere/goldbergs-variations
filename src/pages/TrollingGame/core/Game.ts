import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { AmbientScene } from './AmbientScene';

export class Game {
  container: HTMLElement;
  phaserGame: Phaser.Game | null;
  debugPhysics: boolean;
  debugShoutRadius: boolean;
  debugNpcs: boolean;
  tutorialShown: boolean;
  private _handleResizeBound: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.phaserGame = null;

    this.debugPhysics = this.loadDebugSetting('debugPhysics', false);
    this.debugShoutRadius = this.loadDebugSetting('debugShoutRadius', false);
    this.debugNpcs = this.loadDebugSetting('debugNpcs', false);

    this.tutorialShown = false;

    this._handleResizeBound = this.handleResize.bind(this);
    this.init();
  }

  loadDebugSetting(key: string, defaultValue: boolean): boolean {
    try {
      const saved = localStorage.getItem(`trollingGame_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(
        `Erreur lors du chargement de ${key} depuis localStorage:`,
        error
      );
      return defaultValue;
    }
  }

  saveDebugSetting(key: string, value: boolean): void {
    try {
      localStorage.setItem(`trollingGame_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(
        `Erreur lors de la sauvegarde de ${key} dans localStorage:`,
        error
      );
    }
  }

  loadGameSetting<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(`trollingGame_${key}`);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.warn(
        `Erreur lors du chargement de ${key} depuis localStorage:`,
        error
      );
      return defaultValue;
    }
  }

  saveGameSetting(key: string, value: unknown): void {
    try {
      localStorage.setItem(`trollingGame_${key}`, JSON.stringify(value));
    } catch (error) {
      console.warn(
        `Erreur lors de la sauvegarde de ${key} dans localStorage:`,
        error
      );
    }
  }

  init(): void {
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: this.container,
      backgroundColor: '#000000',
      resolution: window.devicePixelRatio || 1,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: this.debugPhysics,
          fixedStep: true,
          fps: 60,
          timeScale: 1,
        },
      },
      fps: {
        target: 60,
        min: 60,
        forceSetTimeOut: false,
      },
      scene: [AmbientScene, GameScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
        autoRound: true,
      },
      render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        antialiasGL: true,
      },
    };

    this.phaserGame = new Phaser.Game(config);

    this.phaserGame.events.on('hidden', () => {
      const gameScene = this.phaserGame!.scene.getScene('GameScene');
      if (gameScene) this.phaserGame!.scene.pause('GameScene');
      const ambient = this.phaserGame!.scene.getScene('AmbientScene');
      if (ambient) this.phaserGame!.scene.pause('AmbientScene');
    });
    this.phaserGame.events.on('visible', () => {
      const ambient = this.phaserGame!.scene.getScene('AmbientScene');
      if (ambient) this.phaserGame!.scene.resume('AmbientScene');
      const gameScene = this.phaserGame!.scene.getScene('GameScene');
      if (gameScene) this.phaserGame!.scene.resume('GameScene');
    });

    window.addEventListener('resize', this._handleResizeBound);
  }

  handleResize(): void {
    if (this.phaserGame) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      console.log(
        `📱 Resize: ${width}x${height} - Adaptation complète du jeu`
      );

      this.phaserGame.scale.resize(width, height);

      if (this.phaserGame.scene.scenes[0]) {
        const scene = this.phaserGame.scene.scenes[0] as any;
        if (scene.handleResize) {
          scene.handleResize(width, height);
        }
      }
    }
  }

  toggleDebug(): { physics: boolean; shoutRadius: boolean } {
    this.debugPhysics = !this.debugPhysics;
    this.debugShoutRadius = !this.debugShoutRadius;

    this.saveDebugSetting('debugPhysics', this.debugPhysics);
    this.saveDebugSetting('debugShoutRadius', this.debugShoutRadius);

    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (this.phaserGame && gameScene) {
      const scene = gameScene;

      if (scene.physics && scene.physics.world) {
        if (scene.physics.world.debugGraphic) {
          scene.physics.world.debugGraphic.destroy();
          scene.physics.world.debugGraphic = null;
        }

        const childrenToDestroy = scene.children.list.filter(
          (child: any) =>
            child.type === 'Graphics' &&
            child.name &&
            (child.name.includes('debug') ||
              child.name.includes('trail') ||
              child.name.includes('shout') ||
              child.name.includes('trembling'))
        );
        childrenToDestroy.forEach((child: any) => child.destroy());

        if (this.debugPhysics) {
          scene.physics.world.drawDebug = true;
          scene.physics.world.defaults.debugShowBody = true;
          scene.physics.world.defaults.debugShowStaticBody = true;
          scene.physics.world.defaults.debugShowVelocity = true;
          scene.physics.world.defaults.bodyDebugColor = 0xff00ff;
          scene.physics.world.defaults.staticBodyDebugColor = 0x0000ff;
          scene.physics.world.defaults.velocityDebugColor = 0x00ff00;
          scene.physics.world.createDebugGraphic();
        } else {
          scene.physics.world.drawDebug = false;
          scene.physics.world.defaults.debugShowBody = false;
          scene.physics.world.defaults.debugShowStaticBody = false;
          scene.physics.world.defaults.debugShowVelocity = false;
        }
      }

      this.forceUpdateAllDebugVisuals(scene);

      if (this.debugPhysics) {
        console.log('🔵 DEBUG PHYSIQUE: ACTIVÉ - Colliders visibles');
      } else {
        console.log('🔴 DEBUG PHYSIQUE: DÉSACTIVÉ - Colliders cachés');
      }

      if (this.debugShoutRadius) {
        console.log("🔴 DEBUG RAYON CRI: ACTIVÉ - Rayon d'effet visible");
      } else {
        console.log("🔴 DEBUG RAYON CRI: DÉSACTIVÉ - Rayon d'effet caché");
      }
    }

    return { physics: this.debugPhysics, shoutRadius: this.debugShoutRadius };
  }

  toggleShoutRadiusDebug(): boolean {
    this.debugShoutRadius = !this.debugShoutRadius;

    this.saveDebugSetting('debugShoutRadius', this.debugShoutRadius);

    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (this.phaserGame && gameScene) {
      const scene = gameScene;
      this.forceUpdateAllDebugVisuals(scene);

      if (this.debugShoutRadius) {
        console.log("🔴 DEBUG RAYON CRI: ACTIVÉ - Rayon d'effet visible");
      } else {
        console.log("🔴 DEBUG RAYON CRI: DÉSACTIVÉ - Rayon d'effet caché");
      }
    }

    return this.debugShoutRadius;
  }

  forceUpdateAllDebugVisuals(scene: any): void {
    if (!scene || !scene.currentLevel) return;

    const level = scene.currentLevel;

    if (level.player) {
      if (level.player.trailBehavior) {
        level.player.trailBehavior.updateVisibility();
      }

      if (this.debugShoutRadius) {
        if (
          !level.player.debugRenderer ||
          !level.player.debugRenderer.isDebugEnabled
        ) {
          level.player.setDebugEnabled(true);
        }
        level.player.debugRenderer.forceUpdateDebugVisuals();
      } else {
        if (
          level.player.debugRenderer &&
          level.player.debugRenderer.isDebugEnabled
        ) {
          level.player.setDebugEnabled(false);
        }
      }
    }

    if (level.npcSpawner) {
      if (this.debugPhysics || this.debugShoutRadius || this.debugNpcs) {
        level.npcSpawner.createDebugDataForAllNpcs();
        level.npcSpawner.createMigrationDebugVisual();
      } else {
        level.npcSpawner.clearMigrationDebugVisual();
      }

      const allNpcs = level.npcSpawner.getAllNpcs();
      allNpcs.forEach((npc: any) => {
        if (npc.trailBehavior) {
          npc.trailBehavior.updateVisibility();
        }
      });
    }

    if (!this.debugShoutRadius && !this.debugPhysics) {
      const childrenToCheck = [...scene.children.list];

      childrenToCheck.forEach((child: any) => {
        if (child.type === 'Graphics') {
          if (
            child.name &&
            (child.name.includes('debug') ||
              child.name.includes('trail') ||
              child.name.includes('shout') ||
              child.name.includes('radius'))
          ) {
            try {
              child.destroy();
            } catch (error) {
              console.warn('⚠️ Erreur nettoyage graphics:', error);
            }
          } else if (!child.name && child.lineStyle && child.fillStyle) {
            child.setVisible(false);
          }
        } else if (child.type === 'Text') {
          const text = child.text || '';
          if (
            text.includes('Radius:') ||
            text.includes('Force:') ||
            text.includes('Followers:') ||
            text.includes('Trembling:') ||
            text.includes('Collision:')
          ) {
            try {
              child.destroy();
            } catch (error) {
              console.warn('⚠️ Erreur nettoyage text:', error);
            }
          }
        }
      });
    }

    console.log('🔄 Mise à jour forcée de tous les éléments visuels de debug');
  }

  toggleTutorialArrow(): boolean {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (
      !gameScene ||
      !gameScene.currentLevel ||
      !gameScene.currentLevel.tutorialTextManager
    ) {
      console.warn(
        '⚠️ Impossible de toggle tutorial text: pas de tutorialTextManager disponible'
      );
      return false;
    }

    const tutorialManager = gameScene.currentLevel.tutorialTextManager;
    const status = tutorialManager.getStatus();

    const hasVisibleTexts = Object.values(status.texts).some(
      (text: any) => text.visible
    );
    const hasVisibleImages = status.images.length > 0;

    if (hasVisibleTexts || hasVisibleImages) {
      tutorialManager.hideAllTexts();
      tutorialManager.hideAllTutorialImages();
      console.log('📝 Tutorial text + images: CACHÉ');
    } else {
      const player = tutorialManager.getPlayer();
      if (player && player.sprite) {
        tutorialManager.showYouText();
        tutorialManager.showThemText();
        console.log('📝 Tutorial text + images: AFFICHÉ (debug)');
      }
    }

    return !(hasVisibleTexts || hasVisibleImages);
  }

  forceHideTutorial(): void {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (
      !gameScene ||
      !gameScene.currentLevel ||
      !gameScene.currentLevel.tutorialTextManager
    ) {
      console.warn(
        '⚠️ Impossible de forcer masquage tutorial: pas de tutorialTextManager disponible'
      );
      return;
    }

    const tutorialManager = gameScene.currentLevel.tutorialTextManager;
    tutorialManager.forceHideAll();
    console.log('📝 Tutorial: MASQUAGE FORCÉ');
  }

  getTutorialDebugState(): any {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (
      !gameScene ||
      !gameScene.currentLevel ||
      !gameScene.currentLevel.tutorialTextManager
    ) {
      console.warn(
        "⚠️ Impossible d'obtenir état tutorial: pas de tutorialTextManager disponible"
      );
      return null;
    }

    const state =
      gameScene.currentLevel.tutorialTextManager.getDebugState();
    console.log('📝 DEBUG Tutorial State:', state);
    return state;
  }

  toggleNpcDebug(): boolean {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (
      !gameScene ||
      !gameScene.currentLevel ||
      !gameScene.currentLevel.npcSpawner
    ) {
      console.warn(
        '⚠️ Impossible de toggle NPC debug: pas de NPCs disponibles'
      );
      return false;
    }

    this.debugNpcs = !this.debugNpcs;
    this.saveDebugSetting('debugNpcs', this.debugNpcs);

    const npcSpawner = gameScene.currentLevel.npcSpawner;

    if (this.debugNpcs) {
      npcSpawner.createDebugDataForAllNpcs();
      npcSpawner.createMigrationDebugVisual();
      console.log('🎯 NPCs debug: AFFICHÉ (destinations et flèches)');
    } else {
      npcSpawner.clearMigrationDebugVisual();
      console.log('🎯 NPCs debug: CACHÉ (destinations et flèches)');
    }

    return this.debugNpcs;
  }

  switchLevel(levelType: string = 'shepherd'): boolean {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (!gameScene) {
      console.warn(
        '⚠️ Impossible de changer de niveau: pas de GameScene disponible'
      );
      return false;
    }

    const gameSceneLevels = Object.keys(gameScene.availableLevels);
    if (!gameSceneLevels.includes(levelType)) {
      console.warn(
        `⚠️ Niveau '${levelType}' inexistant. Disponibles: ${gameSceneLevels.join(', ')}`
      );
      return false;
    }

    gameScene.switchToLevel(levelType);

    if (gameScene.currentLevel && gameScene.currentLevel.getLevelStats) {
      const stats = gameScene.currentLevel.getLevelStats();
      console.log(`🎯 Niveau actuel: ${levelType}`, stats);
    }

    return true;
  }

  getLevelInfo(): any {
    const gameScene = this.phaserGame!.scene.getScene('GameScene') as any;
    if (!gameScene || !gameScene.currentLevel) {
      console.warn('⚠️ Pas de niveau actuel');
      return null;
    }

    const info = {
      currentType: gameScene.currentLevelType,
      availableLevels: Object.keys(gameScene.availableLevels),
      stats: gameScene.currentLevel.getLevelStats
        ? gameScene.currentLevel.getLevelStats()
        : null,
    };

    console.log('📊 Informations niveau actuel:', info);
    return info;
  }

  shouldShowTutorial(): boolean {
    return !this.tutorialShown;
  }

  markTutorialAsShown(): void {
    this.tutorialShown = true;
    console.log(
      '✅ Tutorial marqué comme vu - ne s\'affichera plus dans cette session'
    );
  }

  resetTutorial(): boolean {
    this.tutorialShown = false;
    console.log(
      '🔄 Tutorial remis à zéro - s\'affichera à nouveau dans cette session'
    );
    return false;
  }

  destroy(): void {
    window.removeEventListener('resize', this._handleResizeBound);

    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = null;
    }
  }
}
