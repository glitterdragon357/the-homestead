import { FishArt } from '../minigames/fishing/FishArt'
import { FarmArt } from '../minigames/farm/FarmArt'
import { ITEMS } from './items'

/**
 * Draws any inventory item, dispatching to whichever art set owns it. The
 * market shows fish and cheese side by side, so it needs one component
 * that doesn't care where an item came from.
 */
export function ItemArt({ item, size = 40 }: { item: string; size?: number }) {
  const def = ITEMS[item]
  if (def?.art === 'fish') return <FishArt species={item} size={size} />
  return <FarmArt subject={item} size={size} />
}
