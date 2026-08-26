/**
 * The trades that hold money, in one list.
 *
 * Names and icons live here rather than in the minigame registry because
 * the registry imports every game component, and the gift control is used
 * *by* those components - reading names from the registry would make a
 * cycle. This module imports nothing, so anyone can read it.
 */

export interface Trade {
  id: string
  label: string
  icon: string
}

export const TRADES: Trade[] = [
  { id: 'farmstead', label: 'Farmstead', icon: '🚜' },
  { id: 'fishing', label: 'Fishing', icon: '🎣' },
  { id: 'pottery', label: 'Pottery', icon: '🏺' },
  { id: 'lumber', label: 'Woodlot', icon: '🌲' },
  { id: 'fruit', label: 'Orchard', icon: '🍎' },
  { id: 'vet', label: 'Vet', icon: '🩺' },
  { id: 'doctor', label: 'Doctor', icon: '⚕️' },
]

export const TRADE_IDS = TRADES.map((t) => t.id)

export function tradeLabel(id: string): string {
  return TRADES.find((t) => t.id === id)?.label ?? id
}
