import { useCallback, useEffect, useRef } from 'react'
import { useHomesteadStore } from './store'

/**
 * Per-minigame saved state, stored under the minigame's id and persisted
 * to localStorage by the store. Works like `useState`, but the value
 * survives reloads.
 *
 * Only write *durable* facts through this hook - coins earned, crops
 * planted, when the kitten was born. Fast-changing display state (a
 * marker sliding along a bar, a need bar draining every tick) should stay
 * in ordinary `useState`, since every write here touches localStorage.
 *
 * For anything that grows over time, save a timestamp rather than a
 * percentage: `plantedAt` keeps growing correctly across a reload, where
 * a saved `progress: 40` would freeze the moment the tab closed.
 */
export function useMinigameProgress<T>(
  id: string,
  createInitial: () => T
): [T, (next: T | ((prev: T) => T)) => void] {
  const stored = useHomesteadStore((s) => s.progress[id]) as T | undefined

  // Built once so the value is stable until the store has been seeded.
  const fallback = useRef<T | undefined>(undefined)
  if (fallback.current === undefined) fallback.current = createInitial()

  const value = stored ?? fallback.current

  // Seed the save on first visit so later loads read a real entry.
  useEffect(() => {
    if (stored === undefined) {
      useHomesteadStore.getState().setProgress(id, fallback.current)
    }
  }, [id, stored])

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const store = useHomesteadStore.getState()
      // Read through the store rather than the closure so rapid successive
      // updates in one tick still build on each other.
      const prev = (store.progress[id] as T | undefined) ?? (fallback.current as T)
      const resolved =
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      store.setProgress(id, resolved)
    },
    [id]
  )

  return [value, update]
}
