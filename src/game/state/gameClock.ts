/**
 * Freezing a game's clock while you are somewhere else.
 *
 * Every game stores its timers as absolute timestamps - `readyAt`,
 * `doneAt`, `bornAt` - which is what lets progress survive a reload. The
 * side effect is that all of them advance on wall-clock time whether you
 * are watching or not.
 *
 * Rather than give each game its own clock (which would mean rewriting
 * every timer in every game), a paused game is simply left alone and its
 * timestamps are pushed *forward* by the time you were away when you come
 * back. From the game's point of view no time passed at all, and none of
 * its own logic has to know that pausing exists.
 *
 * This module has no imports on purpose: the store needs it, and so does
 * the map canvas, and neither may import the minigame registry without
 * creating a cycle.
 */

/**
 * Which progress keys each game owns. Most games are one key named after
 * themselves; the farmstead is several buildings under one roof, so
 * pausing it has to move all of their clocks together.
 */
export const GAME_SAVE_KEYS: Record<string, string[]> = {
  farmstead: ['barn', 'field', 'kitchen'],
}

export function saveKeysOf(gameId: string): string[] {
  return GAME_SAVE_KEYS[gameId] ?? [gameId]
}

/**
 * Anything at or above this is treated as an epoch timestamp; anything
 * below it is left alone.
 *
 * The gap is enormous and deliberate. Real timestamps are ~1.79e12 and
 * climbing, while every other number a save holds - prices, levels,
 * counts, stored durations like `wateredMs` - is under a million. Nothing
 * in the game can plausibly land between the two, so a blanket rule is
 * safer here than hand-listing timestamp fields, which would silently
 * miss one every time a new game is added.
 */
const TIMESTAMP_FLOOR = 1e12

/** Recursively push every timestamp in a save forward by `delta` ms. */
export function shiftTimestamps<T>(value: T, delta: number): T {
  if (typeof value === 'number') {
    return (value >= TIMESTAMP_FLOOR ? value + delta : value) as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => shiftTimestamps(v, delta)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        shiftTimestamps(v, delta),
      ])
    ) as T
  }
  return value
}
