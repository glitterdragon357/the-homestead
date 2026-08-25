import { useCallback } from 'react'
import { Application, extend } from '@pixi/react'
import { Container, Graphics, Text } from 'pixi.js'
import type { Graphics as PixiGraphics } from 'pixi.js'
import { useHomesteadStore } from '../state/store'
import { gridToScreen, DEFAULT_TILE, type GridPoint } from '../isometric/coords'
import type { HomesteadTile } from './tiles'

// Register the Pixi classes we use as JSX components (pixi/react v8 pattern).
extend({ Container, Graphics, Text })

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 640

// Screen-space origin so the map is roughly centered in the canvas.
const ORIGIN = { x: CANVAS_WIDTH / 2, y: 80 }

const TILE_COLORS: Record<HomesteadTile['type'], number> = {
  grass: 0x6fa84f,
  dirt: 0x8a6a3d,
  water: 0x3f7fbf,
  building: 0x9a8f7c,
}

function TileMesh({ tile }: { tile: HomesteadTile }) {
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

  return (
    <>
      <pixiGraphics
        draw={draw}
        x={ORIGIN.x + sx - w / 2}
        y={ORIGIN.y + sy}
        eventMode="static"
        cursor={tile.walkable ? 'pointer' : 'default'}
        onClick={() => movePlayerTo({ x: tile.x, y: tile.y })}
      />
      {tile.icon && (
        <pixiText
          text={tile.icon}
          anchor={0.5}
          x={ORIGIN.x + sx}
          y={ORIGIN.y + sy + h / 2 - 6}
          style={{ fontSize: 28 }}
          eventMode="none"
        />
      )}
    </>
  )
}

function PlayerMarker({ position }: { position: GridPoint }) {
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
      x={ORIGIN.x + sx}
      y={ORIGIN.y + sy + DEFAULT_TILE.height / 2}
    />
  )
}

export function HomesteadCanvas() {
  const tiles = useHomesteadStore((s) => s.tiles)
  const player = useHomesteadStore((s) => s.player)

  return (
    <Application width={CANVAS_WIDTH} height={CANVAS_HEIGHT} background={0x1c2a1a}>
      <pixiContainer>
        {tiles.map((tile) => (
          <TileMesh key={`${tile.x}-${tile.y}`} tile={tile} />
        ))}
        <PlayerMarker position={player} />
      </pixiContainer>
    </Application>
  )
}
