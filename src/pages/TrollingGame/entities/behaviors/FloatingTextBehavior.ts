/**
 * 🎯 SYSTÈME SOLID : FloatingTextBehavior
 * Gère l'affichage de textes flottants avec des conditions d'apparition/disparition
 */
export class FloatingTextBehavior {
  scene: any;
  config: Record<string, any>;
  textObjects: Map<string, any>;
  isPlayerMoving: boolean;
  playerMovementThreshold: number;
  lastPlayerPosition: { x: number; y: number } | null;

  constructor(scene: any, config: Record<string, any> = {}) {
    this.scene = scene;
    this.config = {
      fontFamily: 'Caveat',
      fontSize: 32,
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
      autoHideOnPlayerMovement: true,
      ...config,
    };

    this.textObjects = new Map();
    this.isPlayerMoving = false;
    this.playerMovementThreshold = 0.1;
    this.lastPlayerPosition = null;

    this.setupPlayerMovementDetection();
  }

  createText(
    id: string,
    text: string,
    x: number,
    y: number,
    options: Record<string, any> = {}
  ): any {
    this.destroyText(id);

    const config = {
      ...this.config,
      ...options,
    };

    console.log(`📝 DEBUG: Création texte "${text}" (id: ${id})`);
    console.log(`📝 DEBUG: Position: (${x}, ${y})`);
    console.log(`📝 DEBUG: Config:`, config);

    const textObject = this.scene.add.text(x, y, text, {
      fontFamily: config.fontFamily,
      fontSize: `${config.fontSize}px`,
      color: config.color,
      stroke: config.stroke,
      strokeThickness: config.strokeThickness,
      align: 'center',
    });

    console.log(`📝 DEBUG: Texte Phaser créé:`, textObject);

    textObject.setOrigin(0.5, 0.5);
    textObject.setDepth(1000);

    console.log(`📝 DEBUG: Texte visible: ${textObject.visible}`);
    console.log(`📝 DEBUG: Texte alpha: ${textObject.alpha}`);
    console.log(`📝 DEBUG: Position finale: (${textObject.x}, ${textObject.y})`);

    const textData = {
      object: textObject,
      id: id,
      config: config,
      visible: true,
      autoHideOnPlayerMovement: config.autoHideOnPlayerMovement,
    };

    this.textObjects.set(id, textData);

    const forceFontRefresh = (label: string) => {
      if (textObject && textObject.active) {
        textObject.setFontFamily(config.fontFamily);
        textObject.setText(textObject.text);
        console.log(
          `📝 DEBUG: Re-render texte (${label}) pour garantir la police correcte`
        );
      }
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => forceFontRefresh('fonts.ready'));
    }

    if (
      this.scene &&
      this.scene.caveatFontReady &&
      typeof this.scene.caveatFontReady.then === 'function'
    ) {
      this.scene.caveatFontReady.then(() =>
        forceFontRefresh('scene.caveatFontReady')
      );
    }

    if (this.scene && this.scene.time && this.scene.time.delayedCall) {
      this.scene.time.delayedCall(100, () =>
        forceFontRefresh('delayedCall-100ms')
      );
    }

    console.log(`📝 Texte créé: "${text}" à (${x}, ${y})`);
    return textObject;
  }

  destroyText(id: string): void {
    const textData = this.textObjects.get(id);
    if (textData) {
      textData.object.destroy();
      this.textObjects.delete(id);
      console.log(`📝 Texte détruit: ${id}`);
    }
  }

  updateTextPosition(id: string, x: number, y: number): void {
    const textData = this.textObjects.get(id);
    if (textData && textData.visible) {
      textData.object.setPosition(x, y);
    }
  }

  hideText(id: string): void {
    console.log(
      `📝 DEBUG FloatingTextBehavior.hideText: Tentative masquage texte "${id}"`
    );

    const textData = this.textObjects.get(id);
    if (textData) {
      console.log(
        `📝 DEBUG FloatingTextBehavior.hideText: Texte "${id}" trouvé, début fade-out...`
      );

      this.scene.tweens.add({
        targets: textData.object,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          textData.object.setVisible(false);
          textData.visible = false;
          console.log(
            `📝 DEBUG FloatingTextBehavior.hideText: Fade-out "${id}" terminé`
          );
        },
      });

      console.log(
        `📝 DEBUG FloatingTextBehavior.hideText: Fade-out "${id}" démarré`
      );
    } else {
      console.log(
        `📝 DEBUG FloatingTextBehavior.hideText: Texte "${id}" NON TROUVÉ`
      );
      console.log(
        `📝 DEBUG FloatingTextBehavior.hideText: Textes disponibles:`,
        Array.from(this.textObjects.keys())
      );
    }
  }

  showText(id: string): void {
    const textData = this.textObjects.get(id);
    if (textData) {
      textData.object.setVisible(true);
      textData.visible = true;
      console.log(`📝 Texte affiché: ${id}`);
    }
  }

  setupPlayerMovementDetection(): void {
    const player = this.getPlayer();
    if (player && player.sprite) {
      this.lastPlayerPosition = {
        x: player.sprite.x,
        y: player.sprite.y,
      };
    }
  }

  update(_delta: number): void {
    if (!this.config.autoHideOnPlayerMovement) return;
  }

  onPlayerStartMoving(): void {
    console.log('📝 Joueur en mouvement - délégation au TutorialTextManager');
    this.notifyTutorialManagerMovement();
  }

  notifyTutorialManagerMovement(): void {
    if (
      this.scene.currentLevel &&
      this.scene.currentLevel.tutorialTextManager
    ) {
      this.scene.currentLevel.tutorialTextManager.onPlayerInput();
      console.log(
        '📝 DEBUG: Mouvement du joueur délégué au TutorialTextManager'
      );
    }
  }

  getPlayer(): any {
    if (this.scene.currentLevel && this.scene.currentLevel.player) {
      return this.scene.currentLevel.player;
    }
    return null;
  }

  destroy(): void {
    this.textObjects.forEach((textData: any) => {
      textData.object.destroy();
    });
    this.textObjects.clear();
    console.log('📝 FloatingTextBehavior détruit');
  }

  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.textObjects.forEach((textData: any, id: string) => {
      status[id] = {
        visible: textData.visible,
        position: {
          x: textData.object.x,
          y: textData.object.y,
        },
      };
    });
    return status;
  }
}
