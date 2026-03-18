/**
 * 🎯 SYSTÈME DE CRI DIFFÉRENCIÉ
 * Player : Animation zombiescream (cri effrayant)
 * NPCs : Animation cheerwithbothhandsup (célébration/encouragement)
 */
export class ShoutBehavior {
  owner: any;
  scene: any;
  config: Record<string, any>;
  isScreaming: boolean;
  screamStartTime: number;
  originalAnimation: string | null;
  screamTimer: any;
  _onAnimationComplete: (() => void) | null;
  _onAnimationEventName: string | null;

  constructor(owner: any, config: Record<string, any> = {}) {
    this.owner = owner;
    this.scene = owner.scene;

    this.config = {
      duration: config.duration || 800,
      playerDurationMs: config.playerDurationMs || config.duration || 800,
      npcCheerDurationMs: config.npcCheerDurationMs || 1800,
      ...config,
    };

    this.isScreaming = false;
    this.screamStartTime = 0;
    this.originalAnimation = null;
    this.screamTimer = null;
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;
  }

  shout(): void {
    if (this.isScreaming) return;

    this.startScreamAnimation();
  }

  startScreamAnimation(): void {
    if (!this.owner.sprite || !this.owner.animationBehavior) {
      console.error(
        `🧟 ❌ ${this.owner.entityType}: Sprite ou animationBehavior manquant`
      );
      return;
    }

    const diagnosticData: Record<string, any> = {
      entityType: this.owner.entityType,
      hasAnimationBehavior: !!this.owner.animationBehavior,
      facing: this.owner.animationBehavior.facing,
    };

    if (this.owner.entityType === 'npc') {
      diagnosticData.cheerDownExists = this.scene.anims.exists(
        'cheerwithbothhandsup-down'
      );
      diagnosticData.cheerUpExists = this.scene.anims.exists(
        'cheerwithbothhandsup-up'
      );
      diagnosticData.cheerLeftExists = this.scene.anims.exists(
        'cheerwithbothhandsup-left'
      );
      diagnosticData.cheerRightExists = this.scene.anims.exists(
        'cheerwithbothhandsup-right'
      );
    } else {
      diagnosticData.zombiescreamDownExists = this.scene.anims.exists(
        'zombiescream-down'
      );
      diagnosticData.zombiescreamUpExists = this.scene.anims.exists(
        'zombiescream-up'
      );
      diagnosticData.zombiescreamLeftExists = this.scene.anims.exists(
        'zombiescream-left'
      );
      diagnosticData.zombiescreamRightExists = this.scene.anims.exists(
        'zombiescream-right'
      );
    }

    console.log(
      `🎭 🔍 ${this.owner.entityType} diagnostic animations:`,
      diagnosticData
    );

    if (this.owner.animationBehavior.ensureAnimationsExist) {
      this.owner.animationBehavior.ensureAnimationsExist();
    }

    this.originalAnimation = this.owner.animationBehavior.currentAnimation;

    this.isScreaming = true;
    this.screamStartTime = Date.now();

    if (this.owner.movementController) {
      if (this.owner.movementController.stopMovement) {
        this.owner.movementController.stopMovement();
      } else if (this.owner.movementController.stop) {
        this.owner.movementController.stop();
      }
    }

    const facing = this.owner.animationBehavior.facing || 'down';

    let screamAnimation: string;
    let fallbackKey: string;
    let animationType: string;

    if (this.owner.entityType === 'npc') {
      screamAnimation = `cheerwithbothhandsup-${facing}`;
      fallbackKey = 'cheerwithbothhandsup-down';
      animationType = 'cheer';
    } else {
      screamAnimation = `zombiescream-${facing}`;
      fallbackKey = 'zombiescream-down';
      animationType = 'scream';
    }

    console.log(
      `🎭 ${this.owner.entityType} ${animationType} → facing=${facing}, animationKey=${screamAnimation}`
    );

    let playedKey: string | null = null;
    if (this.scene.anims.exists(screamAnimation)) {
      console.log(
        `🎭 ✅ ${this.owner.entityType} commence à ${animationType} ! Animation: ${screamAnimation}`
      );
      this.owner.sprite.play(screamAnimation);
      playedKey = screamAnimation;
    } else {
      console.warn(
        `🎭 ⚠️ ${this.owner.entityType} Animation ${animationType} non trouvée: ${screamAnimation}`
      );
      if (this.scene.anims.exists(fallbackKey)) {
        console.log(
          `🎭 🔄 ${this.owner.entityType} Fallback vers: ${fallbackKey}`
        );
        this.owner.sprite.play(fallbackKey);
        playedKey = fallbackKey;
      } else {
        console.error(
          `🎭 💀 ${this.owner.entityType} AUCUNE animation ${animationType} disponible !`
        );
      }
    }

    if (playedKey) {
      this._onAnimationEventName = `animationcomplete-${playedKey}`;
      this._onAnimationComplete = () => {
        this.stopScreamAnimation();
      };
      this.owner.sprite.once(
        this._onAnimationEventName,
        this._onAnimationComplete
      );

      const baseFallback =
        this.owner.entityType === 'npc'
          ? this.config.npcCheerDurationMs || this.config.duration
          : this.config.playerDurationMs || this.config.duration;
      let safetyMs = baseFallback;
      try {
        const animObj = this.scene.anims.get(playedKey);
        if (animObj) {
          const frameCount = Array.isArray(animObj.frames)
            ? animObj.frames.length
            : animObj.getTotalFrames
              ? animObj.getTotalFrames()
              : 0;
          const rate = animObj.frameRate || 24;
          if (frameCount > 0 && rate > 0) {
            const estimated = Math.ceil((frameCount / rate) * 1000) + 120;
            safetyMs = Math.max(safetyMs, estimated);
          }
        }
      } catch (_) {}

      this.screamTimer = this.scene.time.delayedCall(safetyMs, () => {
        this.stopScreamAnimation();
      });
    } else {
      const fallbackMs =
        this.owner.entityType === 'npc'
          ? this.config.npcCheerDurationMs || this.config.duration
          : this.config.playerDurationMs || this.config.duration;
      this.screamTimer = this.scene.time.delayedCall(fallbackMs, () => {
        this.stopScreamAnimation();
      });
    }
  }

  stopScreamAnimation(): void {
    if (!this.isScreaming) return;

    console.log(`🧟 ${this.owner.entityType} arrête de crier`);

    this.isScreaming = false;
    this.screamStartTime = 0;

    try {
      if (this.screamTimer && this.screamTimer.remove) {
        this.screamTimer.remove(false);
      }
    } catch (_) {}
    this.screamTimer = null;
    if (this._onAnimationComplete) {
      const ev = this._onAnimationEventName || 'animationcomplete';
      try {
        this.owner?.sprite?.off(ev, this._onAnimationComplete);
      } catch (_) {}
    }
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;

    if (this.owner.movementController && this.owner.entityType === 'npc') {
      // NPCs reprennent via leur update cycle
    }

    if (this.owner.animationBehavior) {
      this.owner.animationBehavior.updateAnimation();
    }
  }

  update(_delta: number): void {
    // On s'appuie sur l'évènement 'animationcomplete-<key>' et le timer de secours.
  }

  destroy(): void {
    if (this.isScreaming) {
      this.stopScreamAnimation();
    }
    try {
      if (this.screamTimer && this.screamTimer.remove) {
        this.screamTimer.remove(false);
      }
    } catch (_) {}
    this.screamTimer = null;
    if (this._onAnimationComplete) {
      const ev = this._onAnimationEventName || 'animationcomplete';
      try {
        this.owner?.sprite?.off(ev, this._onAnimationComplete);
      } catch (_) {}
    }
    this._onAnimationComplete = null;
    this._onAnimationEventName = null;
  }

  hasActiveShapes(): boolean {
    return this.isScreaming;
  }

  getActiveShapeCount(): number {
    return this.isScreaming ? 1 : 0;
  }
}
