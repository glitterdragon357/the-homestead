# The Homestead

Isometric homestead sim where moving to certain tiles launches minigames.

## Stack

- **Vite + React 19 + TypeScript** - app shell, build tooling
- **PixiJS v8 via `@pixi/react` v8** - isometric world rendering (WebGL canvas)
- **Zustand** - game state (player position, tiles, active minigame)
- DynamoDB backend - not wired up yet, see "Where the backend fits" below

`@pixi/react` v8 is currently in beta and requires React 19 (it's a ground-up
rewrite from the old `<Stage>`/`<Sprite>` v7 API to an `extend()` +
`<Application>` pattern). If `npm install` fails to resolve the pinned beta
version, check `npm view @pixi/react versions` for the current tag and bump
`package.json`.

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Click tiles to move the player marker.
The brown "dirt" tile launches a stub farming minigame.

## Architecture

```
src/
  game/
    isometric/coords.ts     - grid <-> screen pixel math (2:1 diamond projection)
    world/
      tiles.ts               - tile data model + starter map layout
      HomesteadCanvas.tsx     - Pixi canvas: renders tiles, player, handles clicks
    state/
      store.ts                - Zustand store: player position, tiles, active minigame
    minigames/
      registry.ts              - id -> component map, the plug-in point
      MinigameOverlay.tsx       - full-screen overlay that mounts the active minigame
      farming/FarmingMinigame.tsx  - example minigame (timing-bar stub)
  ui/
    HUD.tsx                  - simple overlay UI (position, hints)
  App.tsx                    - wires canvas + HUD + minigame overlay together
```

### Adding a new minigame

1. Create `src/game/minigames/<name>/<Name>Minigame.tsx`. It receives
   `{ onComplete, onExit }` props - call `onComplete(result)` when the
   player finishes, `onExit()` if they back out. It can be plain
   React/DOM (like the farming stub) or mount its own `<Application>`
   internally for anything more animated.
2. Register it in `src/game/minigames/registry.ts`.
3. Point a tile at it: in `tiles.ts`, set `minigameId: '<name>'` on any
   tile. Stepping onto that tile auto-opens the overlay.

Minigames are intentionally decoupled from the world/canvas code - they
don't need to know about isometric math, tile data, or how they were
launched.

### Movement

Currently click-to-teleport (no pathfinding/animation). `movePlayerTo` in
the store is the single chokepoint for player movement - that's where
you'd add path validation, walk animation, or movement cost later.

## Where the backend fits

Nothing talks to DynamoDB yet - state lives only in the Zustand store
(page refresh resets it). Suggested next step when you get there: add a
thin API layer (API Gateway + Lambda, or a small Express/Fastify service)
with routes like:

- `GET /homestead/:id` - load tiles + player state + inventory
- `PUT /homestead/:id` - save state (debounced, or on minigame completion)

Then swap `buildStarterMap()` and the store's initial state for a fetch on
app load, and call the save endpoint from `movePlayerTo` / minigame
`onComplete` handlers.

## Known rough edges (scaffold, not production)

- Canvas is a fixed 960x640 - no resize handling yet.
- No sprite art - tiles/player are flat-shaded Pixi Graphics shapes.
- No save/load, no auth, no multiplayer.
- `@pixi/react` v8 is beta; pin exact versions once you're building on this
  for real.
