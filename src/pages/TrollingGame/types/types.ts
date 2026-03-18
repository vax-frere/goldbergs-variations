import Phaser from 'phaser';

// ================================
// GEOMETRY
// ================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ================================
// ENTITY INTERFACES
// ================================

export interface IUpdateable {
  update(delta: number): void;
}

export interface IDestroyable {
  destroy(): void;
}

export interface ICollidable {
  getBounds(): Bounds;
  onCollision(other: unknown): void;
}

// ================================
// PLAYER
// ================================

export const PlayerStates = {
  INTRO: 'intro',
  PLAYING: 'playing',
  PAUSED: 'paused',
  CUTSCENE: 'cutscene',
} as const;

export type PlayerState = typeof PlayerStates[keyof typeof PlayerStates];

export interface DirectionInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface ShoutBehaviorConfig {
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  duration?: number;
}

export interface TrailBehaviorConfig {
  chainLength: number;
  linkDistance: number;
  constraintStrength: number;
  damping: number;
  lineWidth: number;
  lineColor: number;
  alpha: number;
  debugOnly: boolean;
  followersPerPoint: number;
  followPointDistance: number;
}

export interface AuraLayer {
  radius: number;
  color: number;
  alpha: number;
}

// ================================
// NPC
// ================================

export const NpcStates = {
  NORMAL: 'normal',
  FLEEING: 'fleeing',
  TREMBLING: 'trembling',
  FOLLOWING: 'following',
  MIGRATING: 'migrating',
  ORGANISM_MIGRATING: 'organism_migrating',
} as const;

export type NpcState = typeof NpcStates[keyof typeof NpcStates];

export interface NpcConfig {
  groupId?: number;
  speed?: number;
  immuneToShout?: boolean;
  canTremble?: boolean;
  mass?: number;
  drag?: number;
  bounce?: number;
  canFollow?: boolean;
}

export interface StarEffectConfig {
  offsetY: number;
  scale: number;
  duration: number;
  moveUpDistance: number;
  fadeOutDelay: number;
}

// ================================
// LEVEL
// ================================

export type LevelType = 'shepherd' | 'piper' | 'scapegoat';

export interface BaseLevelConfig {
  name: string;
  description: string;
  npcCount: number;
  wallSize: number;
  wallThickness: number;
}

export interface PiedPiperLevelConfig extends BaseLevelConfig {
  mechanic: 'FOLLOW_TO_EXIT';
  completionPercentage: number;
}

export interface ShepherdsGateLevelConfig extends BaseLevelConfig {
  mechanic: 'PUSH_INTO_HOLE';
  holeRadius: number;
  holeFallThreshold: number;
  requiredFallenNpcs: number;
}

export interface ScapegoatLevelConfig extends BaseLevelConfig {
  mechanic: 'FIND_AND_ISOLATE';
  agitationRadius: number;
  agitationCheckInterval: number;
  agitationChance: number;
  isolationRadius: number;
  maxNearbyNpcs: number;
  isolationDuration: number;
}

// ================================
// SYSTEMS
// ================================

export interface FootstepData {
  lastStepTime: number;
  personalRhythm: number;
  isMoving: boolean;
  isPlayer: boolean;
}

export interface SoundPoolConfig {
  maxConcurrent: number;
  globalCooldown: number;
}

export interface FootstepsConfig {
  playerBaseStepInterval: number;
  playerRandomVariation: number;
  npcBaseStepInterval: number;
  npcRandomVariation: number;
  spatialClusterRadius: number;
  maxPerCluster: number;
}

// ================================
// SCENE EXTENSIONS
// ================================

export interface GameSceneData {
  targetLevel?: LevelType;
}

/**
 * Extended Phaser.Scene type that includes our custom systems.
 * Used to avoid `scene.currentLevel.player` chains.
 */
export interface TrollingGameScene extends Phaser.Scene {
  entityManager: any; // Will be typed properly as we migrate
  collisionSystem: any;
  soundManager: any;
  footstepsSystem: any;
  depthSortingSystem: any;
  currentLevel: any;
  currentLevelType: LevelType;
}
