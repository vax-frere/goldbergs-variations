import Phaser from 'phaser';
import { EntityManager } from './EntityManager';
import { CollisionSystem } from './CollisionSystem';
import { SoundManager } from './SoundManager';
import { FootstepsSystem } from '../systems/FootstepsSystem';
import { DepthSortingSystem } from '../systems/DepthSortingSystem';
import { PiedPiperLevel } from '../levels/PiedPiperLevel';
import { ShepherdsGateLevel } from '../levels/ShepherdsGateLevel';
import { ScapegoatLevel } from '../levels/ScapegoatLevel';
import type { LevelType } from '../types/types';

export class GameScene extends Phaser.Scene {
  entityManager: EntityManager | null;
  collisionSystem: CollisionSystem | null;
  soundManager: SoundManager | null;
  footstepsSystem: FootstepsSystem | null;
  depthSortingSystem: DepthSortingSystem | null;
  currentLevel: any;
  availableLevels: Record<string, new (...args: any[]) => any>;
  currentLevelType: LevelType;
  caveatFontLoaded: boolean;
  caveatFontReady!: Promise<void>;
  transitionOverlay: any;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: any;
  spaceKey!: Phaser.Input.Keyboard.Key;
  shiftKey!: Phaser.Input.Keyboard.Key;
  debugKey!: Phaser.Input.Keyboard.Key;
  spaceKeyPressed: boolean;
  debugKeyPressed: boolean;

  constructor() {
    super({ key: 'GameScene' });
    this.entityManager = null;
    this.collisionSystem = null;
    this.soundManager = null;
    this.footstepsSystem = null;
    this.depthSortingSystem = null;
    this.currentLevel = null;

    this.availableLevels = {
      shepherd: ShepherdsGateLevel,
      piper: PiedPiperLevel,
      scapegoat: ScapegoatLevel,
    };
    this.currentLevelType = 'scapegoat';
    this.caveatFontLoaded = false;
    this.transitionOverlay = null;
    this.spaceKeyPressed = false;
    this.debugKeyPressed = false;
  }

  ensureCaveatFont(): Promise<void> {
    console.log('📝 🔄 PRELOAD: Vérification et chargement forcé de Caveat...');

    this.caveatFontReady = new Promise((resolve) => {
      const checkCaveat = () => {
        if (document.fonts && document.fonts.check) {
          return (
            document.fonts.check('40px "Caveat"') ||
            document.fonts.check('40px Caveat')
          );
        }
        return false;
      };

      if (checkCaveat()) {
        console.log('📝 ✅ PRELOAD: Caveat déjà disponible');
        this.caveatFontLoaded = true;
        resolve();
        return;
      }

      if (window.FontFace) {
        try {
          const baseUrl =
            import.meta?.env?.BASE_URL != null ? import.meta.env.BASE_URL : '/';
          const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
          const fontHref = `${normalizedBase}fonts/caveat.ttf`;
          console.log('📝 ⏳ PRELOAD: Chargement via FontFace de', fontHref);
          const face = new FontFace(
            'Caveat',
            `url(${fontHref}) format("truetype")`
          );
          face
            .load()
            .then((loadedFace) => {
              try {
                if (document.fonts?.add) {
                  document.fonts.add(loadedFace);
                }
              } catch (e) {
                console.warn(
                  '📝 ⚠️ PRELOAD: Ajout document.fonts.add a échoué',
                  e
                );
              }
              console.log('📝 ✅ PRELOAD: Caveat chargée via FontFace');
              this.caveatFontLoaded = true;
              resolve();
            })
            .catch((error) => {
              console.warn(
                '📝 ⚠️ PRELOAD: FontFace load a échoué, tentative via document.fonts.load',
                error
              );
              if (document.fonts?.load) {
                document.fonts
                  .load('40px "Caveat"')
                  .then(() => {
                    console.log(
                      '📝 ✅ PRELOAD: Caveat chargée via document.fonts.load'
                    );
                    this.caveatFontLoaded = true;
                    resolve();
                  })
                  .catch((err2) => {
                    console.warn(
                      '📝 ⚠️ PRELOAD: document.fonts.load a échoué',
                      err2
                    );
                    resolve();
                  });
              } else {
                setTimeout(resolve, 800);
              }
            });
        } catch (error) {
          console.warn(
            '📝 ⚠️ PRELOAD: Exception FontFace, fallback document.fonts.load',
            error
          );
          if (document.fonts?.load) {
            document.fonts
              .load('40px "Caveat"')
              .then(() => {
                this.caveatFontLoaded = true;
                resolve();
              })
              .catch(() => resolve());
          } else {
            setTimeout(resolve, 800);
          }
        }
      } else if (document.fonts?.load) {
        console.log(
          '📝 ⏳ PRELOAD: FontFace non dispo, tentative via document.fonts.load'
        );
        document.fonts
          .load('40px "Caveat"')
          .then(() => {
            this.caveatFontLoaded = true;
            resolve();
          })
          .catch(() => resolve());
      } else {
        console.log('📝 ⚠️ PRELOAD: Aucune API de police, délai de sécurité');
        setTimeout(resolve, 800);
      }
    });

    return this.caveatFontReady;
  }

  preload(): void {
    this.ensureCaveatFont();

    this.load.spritesheet(
      'character-spritesheet',
      'img/trolling-game/character-spritesheet.svg',
      {
        frameWidth: 120,
        frameHeight: 200,
        startFrame: 0,
        endFrame: -1,
      }
    );

    this.load.json(
      'character-metadata',
      'img/trolling-game/character-spritesheet-metadata.json'
    );

    this.load.image('onomatope-1', 'img/trolling-game/onomatope-1.png');
    this.load.image('this-is-you', 'img/trolling-game/this-is-you.svg');
    this.load.image('tutorial', 'img/trolling-game/tutorial.svg');
    this.load.image('star-effect', 'img/trolling-game/heart.svg');

    for (let i = 1; i <= 11; i++) {
      this.load.audio(`foot-${i}`, `sounds/trolling-game/foot-${i}.mp3`);
    }

    for (let i = 1; i <= 4; i++) {
      this.load.audio(
        `child-shout-${i}`,
        `sounds/trolling-game/child-shout-${i}.mp3`
      );
    }

    this.load.audio('cry', 'sounds/trolling-game/cry.mp3');
    this.load.audio('touch', 'sounds/trolling-game/touch.mp3');
    this.load.audio('claps', 'sounds/trolling-game/claps.mp3');
    this.load.audio('splat', 'sounds/trolling-game/splat.mp3');
  }

  create(data?: { targetLevel?: LevelType }): void {
    if (
      data &&
      data.targetLevel &&
      this.availableLevels[data.targetLevel] != null
    ) {
      this.currentLevelType = data.targetLevel;
    }
    this.waitForFontThenCreate();
  }

  async waitForFontThenCreate(): Promise<void> {
    console.log('📝 🔄 CREATE: Attente de Caveat...');

    if (this.caveatFontReady) {
      await this.caveatFontReady;
    }

    console.log('📝 ✅ CREATE: Caveat prête - création de la scène');

    this.createScene();
  }

  createScene(): void {
    this.createTransitionOverlay();

    this.physics.world.setBounds(0, 0, 1600, 1200);
    this.physics.world.gravity.set(0, 0);
    this.physics.world.overlapBias = 4;
    this.physics.world.separationBias = 4;
    this.physics.world.maxSubSteps = 10;

    console.log('🔵 Physique Phaser activée - Collisions cercles garanties');

    this.initSystems();
    this.loadMainLevel();
    this.setupInput();
    this.hideTransitionOverlay();
  }

  createTransitionOverlay(): void {
    if (!this.transitionOverlay) {
      this.transitionOverlay = this.add.rectangle(
        800,
        600,
        1600,
        1200,
        0x000000
      );
      this.transitionOverlay.setDepth(10000);
      this.transitionOverlay.setAlpha(0.8);
    }
  }

  hideTransitionOverlay(): void {
    if (this.transitionOverlay) {
      this.tweens.add({
        targets: this.transitionOverlay,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          if (this.transitionOverlay) {
            this.transitionOverlay.destroy();
            this.transitionOverlay = null;
          }
        },
      });
    }
  }

  initSystems(): void {
    this.entityManager = new EntityManager();
    this.collisionSystem = new CollisionSystem();
    this.soundManager = new SoundManager(this);
    this.footstepsSystem = new FootstepsSystem(this.soundManager);
    this.depthSortingSystem = new DepthSortingSystem(this);

    this.soundManager.init();
  }

  loadMainLevel(): void {
    this.loadLevel(this.currentLevelType);
  }

  loadLevel(levelType: LevelType = 'shepherd'): void {
    if (this.currentLevel) {
      this.currentLevel.cleanup();
    }

    if (!this.availableLevels[levelType]) {
      console.error(
        `❌ Niveau '${levelType}' inexistant. Chargement de Shepherd's Gate.`
      );
      levelType = 'shepherd';
    }

    const LevelClass = this.availableLevels[levelType];
    this.currentLevel = new LevelClass(
      this,
      this.entityManager!,
      this.collisionSystem!,
      this.footstepsSystem!
    );
    this.currentLevelType = levelType;

    console.log(`🎯 Chargement niveau: ${levelType}`);
    this.currentLevel.init();

    if (this.currentLevel.getLevelStats) {
      const stats = this.currentLevel.getLevelStats();
      console.log('📊 Stats niveau:', stats);
    }
  }

  switchToLevel(levelType: LevelType): void {
    if (levelType === this.currentLevelType) {
      console.log(`📋 Déjà sur le niveau '${levelType}'`);
      return;
    }

    console.log(`🔄 Basculement: ${this.currentLevelType} → ${levelType}`);
    this.loadLevel(levelType);
  }

  loadNextLevel(): boolean {
    const levelProgression: LevelType[] = ['scapegoat', 'piper', 'shepherd'];
    const currentIndex = levelProgression.indexOf(this.currentLevelType);

    if (currentIndex === -1) {
      console.warn(
        `⚠️ Niveau actuel '${this.currentLevelType}' non trouvé dans la progression`
      );
      return false;
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex >= levelProgression.length) {
      console.log('🎯 TOUS LES NIVEAUX TERMINÉS ! Retour au début.');
      this.loadLevel(levelProgression[0]);
      return true;
    }

    const nextLevelType = levelProgression[nextIndex];
    console.log(
      `🎯 PROGRESSION AUTOMATIQUE: ${this.currentLevelType} → ${nextLevelType}`
    );

    setTimeout(() => {
      this.loadLevel(nextLevelType);
    }, 500);

    return true;
  }

  setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D');
    this.spaceKey = this.input.keyboard!.addKey('SPACE');
    this.shiftKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT
    );
    this.debugKey = this.input.keyboard!.addKey('P');

    this.spaceKeyPressed = false;
    this.debugKeyPressed = false;
  }

  handleResize(width: number, height: number): void {
    this.scale.resize(width, height);

    if (this.currentLevel && this.currentLevel.handleResize) {
      this.currentLevel.handleResize(width, height);
    }
  }

  update(time: number, delta: number): void {
    this.handlePlayerInput();

    if (this.currentLevel) {
      this.currentLevel.update(time, delta);
    }

    this.collisionSystem!.update();

    if (this.depthSortingSystem) {
      this.depthSortingSystem.update();
    }

    if (this.footstepsSystem && this.currentLevel) {
      if (this.currentLevel.player) {
        this.footstepsSystem.updatePlayerFootsteps(
          this.currentLevel.player,
          delta
        );
      }

      const npcs = this.entityManager!.getNpcs();
      if (npcs.length > 0) {
        this.footstepsSystem.updateNpcFootsteps(npcs);
      }
    }
  }

  handlePlayerInput(): void {
    const player = this.currentLevel?.player;
    if (!player) return;

    if (!player.playerState.canReceiveInput()) {
      return;
    }

    const directions = {
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
    };

    player.setMovement(directions);

    if (player.movementController?.setSprintEnabled) {
      const sprinting = !!(this.shiftKey && this.shiftKey.isDown);
      player.movementController.setSprintEnabled(sprinting);
    }

    if (this.spaceKey.isDown && !this.spaceKeyPressed) {
      this.spaceKeyPressed = true;
      player.shout();
    }

    if (!this.spaceKey.isDown) {
      this.spaceKeyPressed = false;
    }

    if (this.debugKey.isDown && !this.debugKeyPressed) {
      this.debugKeyPressed = true;

      const win = window as any;
      if (win.game && win.game.toggleDebug) {
        const debugState = win.game.toggleDebug();
        console.log(
          `🔧 Debug mode: ${debugState ? 'ACTIVÉ' : 'DÉSACTIVÉ'} (Touche B)`
        );
      }
    }

    if (!this.debugKey.isDown) {
      this.debugKeyPressed = false;
    }
  }
}
