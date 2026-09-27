import { useCallback, useEffect, useRef, useState } from 'react'
import type { MinigameProps } from '../registry'
import { useMinigameProgress } from '../../state/useMinigameProgress'
import { usePurse } from '../../state/usePurse'
import { GiftRow } from '../../economy/GiftRow'
import { useAmbientMusic } from '../../audio/useAmbientMusic'
import { sceneImage } from './jigsawDraw'
import { RECIPES } from './jigsawScenes'
import {
  BOARD,
  CUTS,
  CUT_BY_KEY,
  SNAP,
  homeOf,
  initialJigsaw,
  payFor,
  pieceSize,
  type Cut,
  type JigsawSave,
  type Piece,
} from './jigsawData'

/**
 * Jigsaw.
 *
 * The board is up top and every piece is tipped out below it, scrambled,
 * all of them visible all of the time. Pick one up with the mouse, drag
 * it to where you think it goes, and it snaps home if you are close.
 *
 * Drawn on a canvas rather than as elements, because fifty-six draggable
 * divs with their own images is a great deal of layout for something
 * that is one picture cut into rectangles.
 */

/** The whole stage: the board on top, the loose pieces underneath. */
// Tall enough that the bottom row of a fifty-six piece cut still fits.
// At the first size the last row ran off the canvas and those pieces
// could not be picked up at all.
const VIEW = { width: BOARD.w + 120, height: BOARD.h + 340 }
const BOARD_X = 60
const BOARD_Y = 30
/** Where the scrambled pieces live. */
const TRAY_Y = BOARD_Y + BOARD.h + 26

export function JigsawMinigame({ onExit }: MinigameProps) {
  const [save, setSave] = useMinigameProgress<JigsawSave>('jigsaw', () => initialJigsaw)
  const { coins, earn } = usePurse('jigsaw')
  const saveRef = useRef(save)
  saveRef.current = save

  const music = save.music !== false
  useAmbientMusic(music, 'calm', 0.4)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const piecesRef = useRef<Piece[]>([])
  const heldRef = useRef<{ piece: Piece; dx: number; dy: number } | null>(null)
  const startedRef = useRef(0)
  const zRef = useRef(1)

  // The order the picture groups appear in, taken from the recipes so a
  // new one only has to name its group.
  const groups = [...new Set(RECIPES.map((r) => r.group))]

  const [playing, setPlaying] = useState(false)
  const [placed, setPlaced] = useState(0)
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState<null | { pay: number; seconds: number; best: boolean }>(null)

  const scene = RECIPES.find((r) => r.key === save.scene) ?? RECIPES[0]

  /* ---------------------------------------------------------------- */
  /* Tipping the box out                                               */
  /* ---------------------------------------------------------------- */

  const scramble = useCallback((c: Cut) => {
    const { w, h } = pieceSize(c)
    const out: Piece[] = []
    for (let row = 0; row < c.rows; row++) {
      for (let col = 0; col < c.cols; col++) out.push({ col, row, x: 0, y: 0, home: false, z: 0 })
    }
    // Spread them over the tray without stacking them completely, so
    // every piece is at least partly visible from the start.
    const across = Math.ceil(Math.sqrt(out.length * 2.4))
    const slots = out.map((_, i) => i)
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }
    const cellW = (VIEW.width - 40) / across
    const rows = Math.ceil(out.length / across)
    const cellH = Math.max(w * 0.5, (VIEW.height - TRAY_Y - 20) / rows)
    out.forEach((p, i) => {
      const slot = slots[i]
      const cx = 20 + (slot % across) * cellW + (cellW - w) / 2
      const cy = TRAY_Y + Math.floor(slot / across) * cellH
      p.x = cx + (Math.random() - 0.5) * 10
      p.y = cy + (Math.random() - 0.5) * 8
      p.z = i
    })
    void h
    return out
  }, [])

  function start() {
    const c = CUT_BY_KEY[saveRef.current.cut] ?? CUTS[1]
    piecesRef.current = scramble(c)
    heldRef.current = null
    startedRef.current = performance.now()
    zRef.current = piecesRef.current.length
    setTotal(c.cols * c.rows)
    setPlaced(0)
    setResult(null)
    setPlaying(true)
  }

  const finish = useCallback(() => {
    const c = CUT_BY_KEY[saveRef.current.cut] ?? CUTS[1]
    const seconds = Math.round((performance.now() - startedRef.current) / 1000)
    const pay = payFor(c, seconds)
    earn(pay)
    const key = `${saveRef.current.scene}:${c.key}`
    const was = saveRef.current.best?.[key]
    const best = was === undefined || seconds < was
    setSave((s) => ({
      ...s,
      done: (s.done ?? 0) + 1,
      best: { ...(s.best ?? {}), [key]: best ? seconds : (was as number) },
    }))
    setResult({ pay, seconds, best })
    setPlaying(false)
  }, [earn, setSave])

  /* ---------------------------------------------------------------- */
  /* Drawing                                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!playing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const c = CUT_BY_KEY[saveRef.current.cut] ?? CUTS[1]
    const img = sceneImage(saveRef.current.scene)
    const { w, h } = pieceSize(c)
    let raf = 0

    const frame = () => {
      raf = requestAnimationFrame(frame)
      ctx.fillStyle = '#171a22'
      ctx.fillRect(0, 0, VIEW.width, VIEW.height)

      // The board is a pale well, not a dark one.
      //
      // Half these pictures have a night sky or a deep sea in them, and
      // against a near-black board those pieces simply vanished - you
      // could not see what you were dragging. Light ground, dark pieces.
      ctx.fillStyle = '#5a6376'
      ctx.fillRect(BOARD_X, BOARD_Y, BOARD.w, BOARD.h)
      ctx.strokeStyle = 'rgba(20,24,32,0.3)'
      ctx.lineWidth = 1
      for (let i = 1; i < c.cols; i++) {
        ctx.beginPath()
        ctx.moveTo(BOARD_X + (i * BOARD.w) / c.cols, BOARD_Y)
        ctx.lineTo(BOARD_X + (i * BOARD.w) / c.cols, BOARD_Y + BOARD.h)
        ctx.stroke()
      }
      for (let i = 1; i < c.rows; i++) {
        ctx.beginPath()
        ctx.moveTo(BOARD_X, BOARD_Y + (i * BOARD.h) / c.rows)
        ctx.lineTo(BOARD_X + BOARD.w, BOARD_Y + (i * BOARD.h) / c.rows)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(220,236,255,0.55)'
      ctx.lineWidth = 2
      ctx.strokeRect(BOARD_X, BOARD_Y, BOARD.w, BOARD.h)

      // The table the loose pieces are lying on, also pale.
      ctx.fillStyle = '#3c434f'
      ctx.fillRect(14, TRAY_Y - 14, VIEW.width - 28, VIEW.height - TRAY_Y + 6)

      const held = heldRef.current
      const order = [...piecesRef.current].sort((a, b) => a.z - b.z)
      for (const p of order) {
        const sx = (p.col * BOARD.w) / c.cols
        const sy = (p.row * BOARD.h) / c.rows
        const lifted = held?.piece === p

        // Every loose piece casts a shadow, so it reads as a thing lying
        // on the table rather than a hole cut in it.
        if (!p.home) {
          ctx.save()
          ctx.shadowColor = 'rgba(0,0,0,0.55)'
          ctx.shadowBlur = lifted ? 20 : 7
          ctx.shadowOffsetY = lifted ? 9 : 3
          ctx.fillStyle = '#000'
          ctx.fillRect(p.x, p.y, w, h)
          ctx.restore()
        }
        ctx.drawImage(img, sx, sy, w, h, p.x, p.y, w, h)

        // Pieces on the board sit flush; loose ones get a bright edge so
        // a dark piece still has a visible outline on a dark picture.
        ctx.strokeStyle = p.home ? 'rgba(255,255,255,0.08)' : 'rgba(236,244,255,0.7)'
        ctx.lineWidth = p.home ? 1 : 1.4
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, w - 1, h - 1)
        if (lifted) {
          ctx.strokeStyle = 'rgba(255,232,168,0.9)'
          ctx.lineWidth = 2
          ctx.strokeRect(p.x + 1, p.y + 1, w - 2, h - 2)
        }
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  /* ---------------------------------------------------------------- */
  /* Dragging                                                          */
  /* ---------------------------------------------------------------- */

  const at = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    return {
      x: ((e.clientX - box.left) / box.width) * VIEW.width,
      y: ((e.clientY - box.top) / box.height) * VIEW.height,
    }
  }

  function grab(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = CUT_BY_KEY[saveRef.current.cut] ?? CUTS[1]
    const { w, h } = pieceSize(c)
    const p = at(e)
    // Topmost first, so clicking a pile takes the piece you can see.
    const order = [...piecesRef.current].sort((a, b) => b.z - a.z)
    for (const piece of order) {
      if (piece.home) continue
      if (p.x < piece.x || p.x > piece.x + w || p.y < piece.y || p.y > piece.y + h) continue
      piece.z = ++zRef.current
      heldRef.current = { piece, dx: p.x - piece.x, dy: p.y - piece.y }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const held = heldRef.current
    if (!held) return
    const p = at(e)
    held.piece.x = p.x - held.dx
    held.piece.y = p.y - held.dy
  }

  function drop() {
    const held = heldRef.current
    if (!held) return
    heldRef.current = null
    const c = CUT_BY_KEY[saveRef.current.cut] ?? CUTS[1]
    const home = homeOf(c, held.piece.col, held.piece.row)
    const want = { x: BOARD_X + home.x, y: BOARD_Y + home.y }
    if (Math.abs(held.piece.x - want.x) < SNAP && Math.abs(held.piece.y - want.y) < SNAP) {
      held.piece.x = want.x
      held.piece.y = want.y
      held.piece.home = true
      held.piece.z = 0
      const done = piecesRef.current.filter((q) => q.home).length
      setPlaced(done)
      if (done === piecesRef.current.length) finish()
    }
  }

  /* ---------------------------------------------------------------- */
  /* Screens                                                           */
  /* ---------------------------------------------------------------- */

  if (playing) {
    return (
      <div style={S.wrap}>
        <div style={S.stage}>
          <canvas
            ref={canvasRef}
            width={VIEW.width}
            height={VIEW.height}
            style={S.canvas}
            onPointerDown={grab}
            onPointerMove={move}
            onPointerUp={drop}
            onPointerCancel={drop}
          />
          <div style={S.hud}>
            <span style={S.title}>{scene.name}</span>
            <span style={S.count}>
              {placed} of {total}
            </span>
            <button style={S.give} onClick={() => setPlaying(false)}>
              Put it away
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
      <div style={S.sheet}>
        <div style={S.head}>
          <h2 style={S.h2}>Jigsaw</h2>
          <span style={S.coins}>🪙 {coins}</span>
        </div>

        <GiftRow from="jigsaw" />

        {result && (
          <div style={S.result}>
            <strong>Finished in {result.seconds}s.</strong> {result.pay} 🪙
            {result.best && <span style={S.best}> · your best for this one</span>}
          </div>
        )}

        <p style={S.label}>Picture · {RECIPES.length} of them</p>
        <div style={S.scroller}>
          {groups.map((group) => (
            <div key={group}>
              <p style={S.group}>{group}</p>
              <div style={S.grid}>
                {RECIPES.filter((r) => r.group === group).map((r) => (
                  <button
                    key={r.key}
                    style={{ ...S.card, ...(save.scene === r.key ? S.cardOn : null) }}
                    onClick={() => setSave((v) => ({ ...v, scene: r.key }))}
                  >
                    <ScenePreview scene={r.key} />
                    <span style={S.cardName}>{r.name}</span>
                    <span style={S.cardNote}>{r.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={S.label}>Pieces</p>
        <div style={S.row}>
          {CUTS.map((c) => {
            const best = save.best?.[`${save.scene}:${c.key}`]
            return (
              <button
                key={c.key}
                style={{ ...S.chip, ...(save.cut === c.key ? S.chipOn : null) }}
                onClick={() => setSave((v) => ({ ...v, cut: c.key }))}
              >
                {c.name}
                {best !== undefined && <span style={S.chipBest}> · {best}s</span>}
              </button>
            )
          })}
        </div>

        <button style={S.go} onClick={start}>
          Tip the box out
        </button>

        <label style={S.musicRow}>
          <input
            type="checkbox"
            checked={music}
            onChange={(e) => setSave((s) => ({ ...s, music: e.target.checked }))}
          />
          <span>Music</span>
        </label>

        <button style={S.leave} onClick={onExit}>
          Leave the table
        </button>
      </div>
    </div>
  )
}

/** A thumbnail of a scene, painted by the same code that cuts it up. */
function ScenePreview({ scene }: { scene: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.drawImage(sceneImage(scene), 0, 0, BOARD.w, BOARD.h, 0, 0, c.width, c.height)
  }, [scene])
  return <canvas ref={ref} width={150} height={112} style={{ width: '100%', borderRadius: 6, display: 'block' }} />
}

const S: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  stage: { position: 'relative', maxWidth: '96vw' },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: 14,
    touchAction: 'none',
    cursor: 'grab',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  hud: {
    position: 'absolute',
    top: 8,
    left: 14,
    right: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#e6eefc',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 13,
  },
  title: { fontWeight: 700 },
  count: { opacity: 0.75, fontVariantNumeric: 'tabular-nums' },
  give: {
    marginLeft: 'auto',
    font: 'inherit',
    fontSize: 12,
    padding: '3px 10px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.18)',
    background: 'rgba(0,0,0,0.4)',
    color: '#e6eefc',
    cursor: 'pointer',
  },
  sheet: {
    width: 580,
    maxWidth: '94vw',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#131a26',
    color: '#e6eefc',
    borderRadius: 16,
    padding: 22,
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  h2: { margin: 0, fontSize: 24, fontFamily: 'Georgia, serif', color: '#9ad0ff' },
  coins: { fontSize: 15 },
  result: {
    margin: '14px 0',
    padding: '10px 12px',
    borderRadius: 10,
    background: 'rgba(154,208,255,0.13)',
    fontSize: 14,
  },
  best: { color: '#8ef0b4' },
  label: { margin: '16px 0 7px', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.55 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  scroller: {
    maxHeight: 300,
    overflowY: 'auto',
    padding: 8,
    borderRadius: 10,
    background: 'rgba(0,0,0,0.18)',
  },
  group: {
    margin: '6px 2px 7px',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.5,
  },
  card: {
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 7,
    borderRadius: 9,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    color: '#e6eefc',
    cursor: 'pointer',
    font: 'inherit',
  },
  cardOn: { border: '1px solid #4aa3e0', background: 'rgba(74,163,224,0.17)' },
  cardName: { fontWeight: 700, fontSize: 12 },
  cardNote: { fontSize: 10.5, opacity: 0.6, lineHeight: 1.3 },
  row: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    font: 'inherit',
    fontSize: 12,
    padding: '5px 11px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent',
    color: 'rgba(230,238,252,0.75)',
    cursor: 'pointer',
  },
  chipOn: { background: '#4aa3e0', color: '#06202e', border: '1px solid #4aa3e0', fontWeight: 700 },
  chipBest: { opacity: 0.7 },
  go: {
    width: '100%',
    marginTop: 18,
    padding: '12px 16px',
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: '#4aa3e0',
    color: '#04202f',
    cursor: 'pointer',
  },
  musicRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 14, opacity: 0.8 },
  leave: {
    display: 'block',
    margin: '12px auto 0',
    background: 'none',
    border: 'none',
    color: 'rgba(230,238,252,0.6)',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 13,
  },
}
