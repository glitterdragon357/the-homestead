/**
 * Jigsaw.
 *
 * A picture is cut into a grid, every piece is tipped out below the
 * board in a random order, and you drag them up to where you think they
 * go. Nothing is hidden - all of the pieces are down there all of the
 * time, which is what makes it a puzzle about looking rather than about
 * hunting through a pile.
 *
 * The pictures are drawn rather than loaded: a handful of scenes built
 * out of shapes, so there is nothing to download and every cut is clean
 * at any size.
 */

export const BOARD = { w: 560, h: 420 }
/** How near a piece has to be dropped to snap home, in board pixels. */
export const SNAP = 34

export interface Cut {
  key: string
  name: string
  cols: number
  rows: number
  /** What finishing it is worth. */
  pay: number
}

export const CUTS: Cut[] = [
  { key: 'six', name: 'Six pieces', cols: 3, rows: 2, pay: 40 },
  { key: 'twelve', name: 'Twelve', cols: 4, rows: 3, pay: 90 },
  { key: 'twenty', name: 'Twenty', cols: 5, rows: 4, pay: 170 },
  { key: 'thirty', name: 'Thirty', cols: 6, rows: 5, pay: 280 },
  { key: 'fiftysix', name: 'Fifty-six', cols: 8, rows: 7, pay: 520 },
]

export const CUT_BY_KEY: Record<string, Cut> = Object.fromEntries(CUTS.map((c) => [c.key, c]))

export interface Scene {
  key: string
  name: string
  blurb: string
}

export const SCENES: Scene[] = [
  { key: 'harbour', name: 'The Harbour', blurb: 'Boats, a low sun and a long jetty.' },
  { key: 'orchard', name: 'The Orchard', blurb: 'Rows of trees on a green slope.' },
  { key: 'peaks', name: 'The Peaks', blurb: 'Snow, rock and a very cold lake.' },
  { key: 'market', name: 'Night Market', blurb: 'Awnings, lanterns and a lot of colour.' },
  { key: 'reef', name: 'The Reef', blurb: 'Coral, fish and light coming down through it.' },
  { key: 'balloons', name: 'Balloons', blurb: 'Seven of them, over a patchwork of fields.' },
]

export const SCENE_BY_KEY: Record<string, Scene> = Object.fromEntries(SCENES.map((s) => [s.key, s]))

/** One piece of a cut-up picture. */
export interface Piece {
  /** Where it belongs, in grid terms. */
  col: number
  row: number
  /** Where it is right now, top-left, in board coordinates. */
  x: number
  y: number
  home: boolean
  /** Painting order, so a picked-up piece comes to the front. */
  z: number
}

export interface JigsawSave {
  scene: string
  cut: string
  done: number
  best: Record<string, number>
  music?: boolean
}

export const initialJigsaw: JigsawSave = {
  scene: 'harbour',
  cut: 'twelve',
  done: 0,
  best: {},
}

/**
 * What a finished puzzle pays.
 *
 * Time matters, but only so far: there is a bonus for being quick and it
 * never falls below half, because a jigsaw you are taking your time over
 * is a jigsaw being enjoyed rather than one being failed.
 */
export function payFor(cut: Cut, seconds: number): number {
  const par = cut.cols * cut.rows * 6
  const speed = Math.max(0.5, Math.min(1.5, par / Math.max(1, seconds)))
  return Math.round(cut.pay * speed)
}

/** Where a piece belongs on the board. */
export function homeOf(cut: Cut, col: number, row: number): { x: number; y: number } {
  return { x: (col * BOARD.w) / cut.cols, y: (row * BOARD.h) / cut.rows }
}

export function pieceSize(cut: Cut): { w: number; h: number } {
  return { w: BOARD.w / cut.cols, h: BOARD.h / cut.rows }
}
