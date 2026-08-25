import { useCallback, useEffect, useMemo, useState } from 'react'
import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useHomesteadStore } from '../state/store'
import { gridToScreen, DEFAULT_TILE, type GridPoint } from '../isometric/coords'
import { MINIGAME_REGISTRY, type PendingBadge } from '../minigames/registry'
import { saveKeysOf } from '../state/gameClock'
import type { HomesteadTile } from './tiles'

// Register the Pixi classes we use as JSX components (pixi/react v8 pattern).
extend({ Container, Graphics, Text })

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 640

/**
 * Vertical origin that centres the map, derived from the tile size rather
 * than hardcoded. Changing the tile ratio (the camera angle) changes how
 * deep the diamond is: a fixed origin clips the far corner when the angle
 * steepens, and leaves the map stranded near the top when it flattens.
 */
function computeOrigin(tiles: HomesteadTile[]) {
  const maxX = Math.max(...tiles.map((t) => t.x))
  const maxY = Math.max(...tiles.map((t) => t.y))
  const h = DEFAULT_TILE.height
  const mapHeight = ((maxX + maxY) * h) / 2 + h
  return { x: CANVAS_WIDTH / 2, y: Math.max(8, (CANVAS_HEIGHT - mapHeight) / 2) }
}

interface Origin {
  x: number
  y: number
}

const TILE_COLORS: Record<HomesteadTile['type'], number> = {
  grass: 0x6fa84f,
  dirt: 0x8a6a3d,
  water: 0x3f7fbf,
  building: 0x9a8f7c,
  forest: 0x3f6b38,
  orchard: 0x7fa84a,
}

function TileMesh({
  tile,
  origin,
  badge,
}: {
  tile: HomesteadTile
  origin: Origin
  badge: PendingBadge | null
}) {
  const movePlayerTo = useHomesteadStore((s) => s.movePlayerTo)
  const { x: sx, y: sy } = gridToScreen(tile, DEFAULT_TILE)
  const w = DEFAULT_TILE.width
  const h = DEFAULT_TILE.height
  const color = TILE_COLORS[tile.type]

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      g.poly([0, h / 2, w / 2, 0, w, h / 2, w / 2, h])
      g.fill({ color, alpha: tile.walkable ? 1 : 0.85 })
      g.stroke({ width: 1, color: 0x2f2a20, alpha: 0.25 })
    },
    [color, h, w, tile.walkable]
  )

  const badgeColor = badge?.urgent ? 0xd9534f : 0xe0a32f
  const drawBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear()
      if (!badge) return
      g.circle(0, 0, 11)
      g.fill({ color: badgeColor })
      g.stroke({ width: 2, color: 0xfdf6e3 })
    },
    [badge, badgeColor]
  )

  return (
    <>
      <pixiGraphics
        draw={draw}
        x={origin.x + sx - w / 2}
        y={origin.y + sy}
        eventMode="static"
        cursor={tile.walkable ? 'pointer' : 'default'}
        // `click` is mouse-only in Pixi and `tap` is touch-only; `pointertap`
        // fires for both, so tiles stay tappable on phones and tablets.
        onPointerTap={() => movePlayerTo({ x: tile.x, y: tile.y })}
      />
      {tile.icon && (
        <pixiText
          text={tile.icon}
          anchor={0.5}
          x={origin.x + sx}
          y={origin.y + sy + h / 2 - 8}
          style={{ fontSize: 26 }}
          eventMode="none"
        />
      )}
      {badge && (
        <>
          <pixiGraphics
            draw={drawBadge}
            x={origin.x + sx + 16}
            y={origin.y + sy + h / 2 - 22}
            eventMode="none"
          />
          <pixiText
            text={String(badge.count)}
            anchor={0.5}
            x={origin.x + sx + 16}
            y={origin.y + sy + h / 2 - 22}
            style={{ fontSize: 13, fill: 0xffffff, fontWeight: 'bold' }}
            eventMode="none"
          />
        </>
      )}
    </>
  )
}

function PlayerMarker({ position, origin }: { position: GridPoint; origin: Origin }) {
  const { x: sx, y: sy } = gridToScreen(position, DEFAULT_TILE)

  const draw = useCallback((g: PixiGraphics) => {
    g.clear()
    g.circle(0, 0, 14)
    g.fill({ color: 0xd94f4f })
    g.stroke({ width: 2, color: 0x5a1f1f })
  }, [])

  return (
    <pixiGraphics
      draw={draw}
      x={origin.x + sx}
      y={origin.y + sy + DEFAULT_TILE.height / 2}
    />
  )
}

export function HomesteadCanvas() {
  const tiles = useHomesteadStore((s) => s.tiles)
  const player = useHomesteadStore((s) => s.player)
  const progress = useHomesteadStore((s) => s.progress)
  const pausedAt = useHomesteadStore((s) => s.pausedAt)
  const origin = useMemo(() => computeOrigin(tiles), [tiles])

  // The badges are time-based, so the map needs its own slow heartbeat to
  // notice that an egg finished or a crop ripened while you were standing
  // out here. One second is plenty for timers measured in minutes.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const badges = useMemo(() => {
    const out: Record<string, PendingBadge | null> = {}
    for (const [id, def] of Object.entries(MINIGAME_REGISTRY)) {
      if (!def.pending) {
        out[id] = null
        continue
      }
      // A frozen game must be judged at the moment it was frozen, or its
      // badge would keep counting up for work its own timers never did.
      const frozen = pausedAt[saveKeysOf(id)[0]]
      out[id] = def.pending(progress, frozen ?? now)
    }
    return out
  }, [progress, pausedAt, now])

  return (
    <Application width={CANVAS_WIDTH} height={CANVAS_HEIGHT} background={0x1c2a1a}>
      <pixiContainer>
        {tiles.map((tile) => (
          <TileMesh
            key={`${tile.x}-${tile.y}`}
            tile={tile}
            origin={origin}
            badge={tile.minigameId ? badges[tile.minigameId] ?? null : null}
          />
        ))}
        <PlayerMarker position={player} origin={origin} />
      </pixiContainer>
    </Application>
  )
}
