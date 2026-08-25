import { useCallback } from 'react'
import { useHomesteadStore } from './store'

/**
 * One game's purse. Money is per-game, so a panel names its own purse once
 * here and then reads `coins` / calls `earn` and `spend` without repeating
 * which game it is - which is what stops a stray call quietly spending the
 * wrong game's takings.
 */
export function usePurse(game: string) {
  const coins = useHomesteadStore((s) => s.purses[game] ?? 0)
  const earnRaw = useHomesteadStore((s) => s.earn)
  const spendRaw = useHomesteadStore((s) => s.spend)

  const earn = useCallback((amount: number) => earnRaw(game, amount), [earnRaw, game])
  const spend = useCallback((amount: number) => spendRaw(game, amount), [spendRaw, game])

  return { coins, earn, spend }
}
