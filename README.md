# Trolling Game

A 2D top-down game built with Phaser 3 and React. The player navigates levels, shouts to attract NPCs, and leads them through various objectives.

## Quick Start

```bash
npm install
npm run dev
```

## Controls

- **Arrow keys / WASD** — Move
- **Shift** — Sprint
- **Space** — Shout (attracts nearby NPCs)

## Levels

| Level | Description |
|---|---|
| **Scapegoat** | Default starting level |
| **Pied Piper** | Lead followers to objectives |
| **Shepherd's Gate** | Push NPCs into goals |

Switch levels via console: `window.game.switchLevel("piper")`

## Architecture

```
src/pages/TrollingGame/
├── TrollingGame.jsx          # React wrapper
├── core/                     # Engine layer
│   ├── Game.js               # Phaser config + debug API
│   ├── GameScene.js          # Main scene (preload, create, update)
│   ├── AmbientScene.js       # Persistent ambient audio
│   ├── EntityManager.js      # Entity registry
│   ├── CollisionSystem.js    # Physics collisions
│   ├── SoundManager.js       # Audio pool
│   ├── PlayerState.js        # Player state machine
│   └── interfaces.js         # Shared types
├── entities/                 # Game objects
│   ├── BaseEntity.js
│   ├── Player.js
│   ├── Npc.js
│   ├── Wall.js
│   ├── behaviors/            # Composable behaviors (shout, trail, animation, etc.)
│   ├── npc/                  # NPC sub-controllers (state, movement, follow, migration)
│   └── player/               # Player sub-controllers (movement, collision, followers)
├── levels/                   # Level definitions
│   ├── ScapegoatLevel.js
│   ├── PiedPiperLevel.js
│   └── ShepherdsGateLevel.js
└── systems/                  # Game systems
    ├── NpcSpawner.js
    ├── FootstepsSystem.js
    ├── DepthSortingSystem.js
    ├── FlowFieldService.js
    ├── GroupFleeingSystem.js
    ├── IntroSequence.js
    ├── OutroSequence.js
    └── TutorialTextManager.js
```

## Tech Stack

- **Phaser 3** — Game engine (physics, sprites, audio)
- **React 19** — Mounting wrapper
- **Vite** — Dev server & build

## Debug Console

```js
window.game.toggleDebug()          // Physics colliders + shout radius
window.game.toggleNpcDebug()       // NPC destination arrows
window.game.toggleShoutRadiusDebug() // Shout radius only
window.game.getLevelInfo()         // Current level stats
window.game.resetTutorial()       // Re-show tutorial
```
