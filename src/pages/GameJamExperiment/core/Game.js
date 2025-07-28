import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { TransitionScene } from './TransitionScene';

export class Game {
  constructor(container) {
    this.container = container;
    this.phaserGame = null;
    this.init();
  }

  init() {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: this.container,
      backgroundColor: '#2d5f3f',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [GameScene, TransitionScene]
    };

    this.phaserGame = new Phaser.Game(config);
  }

  destroy() {
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = null;
    }
  }
} 