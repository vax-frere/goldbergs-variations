// ================================
// PLAYER
// ================================

export const PLAYER = {
  SPEED: 150,
  SCALE: 0.6,
  SHOUT_COOLDOWN: 500,
  FOLLOWER_SHOUT_RATIO: 0.2,
  FOLLOWER_SHOUT_DELAY_PER_NPC: 25,
  FOLLOWER_SHOUT_RANDOM_OFFSET: 300,
  DELTA_CLAMP: 33,

  AURA: [
    { radius: 70, color: 0x2a0845, alpha: 0.06 },
    { radius: 55, color: 0x320a50, alpha: 0.08 },
    { radius: 40, color: 0x3d0f5c, alpha: 0.10 },
    { radius: 25, color: 0x4a1568, alpha: 0.12 },
  ],

  ANIMATION: {
    MOVEMENT_THRESHOLD: 1.2,
    IDLE_THRESHOLD: 0.5,
  },

  SHOUT: {
    OFFSET_X: 60,
    OFFSET_Y: -10,
    SCALE: 0.3,
    DURATION: 750,
  },

  TRAIL: {
    CHAIN_LENGTH: 20,
    LINK_DISTANCE: 30,
    CONSTRAINT_STRENGTH: 0.9,
    DAMPING: 0.88,
    LINE_WIDTH: 3,
    LINE_COLOR: 0x00ff88,
    ALPHA: 0.8,
    DEBUG_ONLY: true,
    FOLLOWERS_PER_POINT: 8,
    FOLLOW_POINT_DISTANCE: 80,
  },

  FORCE: {
    TREMBLING_RADIUS_MULTIPLIER_PER_FOLLOWER: 0.01,
  },
} as const;

// ================================
// NPC
// ================================

export const NPC = {
  SPEED: 150,
  SCALE: 0.6,
  MASS: 0.5,
  DELTA_CLAMP: 33,

  ANIMATION: {
    MOVEMENT_THRESHOLD: 0.8,
    IDLE_THRESHOLD: 0.3,
  },

  SHOUT: {
    DURATION: 750,
  },

  STAR_EFFECT: {
    OFFSET_Y: -65,
    SCALE: 0.2,
    DURATION: 600,
    MOVE_UP_DISTANCE: 25,
    FADE_OUT_DELAY: 150,
  },

  BEHAVIOR: {
    TREMBLE_INTENSITY: 3,
  },

  STATE: {
    PRE_TREMBLE_RADIUS: 110,
    FLEE_SAFE_DISTANCE: 200,
    FLEE_DURATION_BASE: 1500,
    FLEE_DURATION_RANDOM: 1000,
    TREMBLE_COLLISION_RADIUS: 25,
    COMFORT_ZONE: 25,
    FOLLOW_STOP_DISTANCE: 20,
    STUCK_TRIGGER_MS: 420,
  },

  MOVEMENT: {
    WANDER_SPEED: 30,
    FLEE_SPEED: 180,
    FOLLOW_SPEED: 160,
    MAX_FLEE_SPEED: 250,
    MAX_FOLLOW_SPEED: 200,
    MAX_WANDER_SPEED: 50,
  },

  MIGRATION: {
    SPEED: 120,
    TOLERANCE: 15,
  },
} as const;

// ================================
// LEVEL DEFAULTS
// ================================

export const LEVEL = {
  WALL_SIZE: 25,
  WALL_THICKNESS: 40,
  NPC_HEIGHT: 64,
  TRANSITION_DURATION: 300,
  FALLBACK_ACTIVATION_TIME: 10000,

  PIED_PIPER: {
    NPC_COUNT: 20,
    COMPLETION_PERCENTAGE: 0.6,
  },

  SHEPHERDS_GATE: {
    NPC_COUNT: 10,
    HOLE_RADIUS: 60,
    HOLE_FALL_THRESHOLD: 30,
    REQUIRED_FALLEN: 5,
  },

  SCAPEGOAT: {
    NPC_COUNT: 15,
    AGITATION_RADIUS: 200,
    AGITATION_CHECK_INTERVAL: 800,
    AGITATION_CHANCE: 0.15,
    AGITATION_TREMBLE_RATIO: 0.6,
    AGITATION_FLEE_DURATION_BASE: 800,
    AGITATION_FLEE_DURATION_RANDOM: 1200,
    ISOLATION_RADIUS: 200,
    MAX_NEARBY_NPCS: 0,
    ISOLATION_DURATION: 3000,
    SCAPEGOAT_MASS: 0.3,
    SCAPEGOAT_DRAG: 8,
    SCAPEGOAT_BOUNCE: 0.1,
    NPC_MASS: 0.6,
    NPC_DRAG: 30,
    NPC_BOUNCE: 0.2,
  },
} as const;

// ================================
// SOUND
// ================================

export const SOUND = {
  AMBIENT_VOLUME: 0.075,
  FOOTSTEP_VOLUME: 0.1,
  CHILD_SHOUT_VOLUME: 0.1,
  CRY_VOLUME: 0.1,
  TOUCH_VOLUME: 0.1,
  CLAPS_VOLUME: 0.4,
  SPLAT_VOLUME: 0.4,

  FOOTSTEPS: {
    PLAYER_BASE_INTERVAL: 550,
    PLAYER_RANDOM_VARIATION: 0.15,
    NPC_BASE_INTERVAL: 550,
    NPC_RANDOM_VARIATION: 0.15,
    MAX_CONCURRENT: 2,
    GLOBAL_COOLDOWN: 200,
    SPATIAL_CLUSTER_RADIUS: 400,
    MAX_PER_CLUSTER: 3,
  },
} as const;

// ================================
// PHYSICS
// ================================

export const PHYSICS = {
  WORLD_BOUNDS: { x: 0, y: 0, width: 1600, height: 1200 },
  OVERLAP_BIAS: 4,
  SEPARATION_BIAS: 4,
  MAX_SUB_STEPS: 10,
} as const;
