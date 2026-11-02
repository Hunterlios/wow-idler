// Akcje talentów: nauka, auto-rozdanie, reset u trenera.
import { TALENTS, canLearnTalent, talentPoints, spentTotal, respecCost } from '../data/talents'
import { log } from './sim'
import type { GameState } from './types'

export function learnTalent(s: GameState, id: string) {
  const h = s.hero
  if (!canLearnTalent(h.cls, h.talents, h.level, id)) return false
  h.talents[id] = (h.talents[id] ?? 0) + 1
  return true
}

// Rozdaje wolne punkty w wybrane drzewko (od góry, jak typowy build), nadmiar do pozostałych
export function autoTalents(s: GameState, tree: number) {
  const h = s.hero
  let n = 0
  for (let guard = 0; guard < 80 && spentTotal(h.talents) < talentPoints(h.level); guard++) {
    const order = [tree, (tree + 1) % 3, (tree + 2) % 3]
    let done = false
    for (const tr of order) {
      const list = TALENTS[h.cls].filter((t) => t.tree === tr).sort((a, b) => a.tier - b.tier || a.col - b.col)
      const pick = list.find((t) => canLearnTalent(h.cls, h.talents, h.level, t.id))
      if (pick) { h.talents[pick.id] = (h.talents[pick.id] ?? 0) + 1; n++; done = true; break }
    }
    if (!done) break
  }
  return n
}

export function resetTalents(s: GameState): string | null {
  if (s.where !== 'capital') return 'You can reset talents at a trainer in a capital city.'
  const cost = respecCost(s.hero.level)
  if (s.hero.copper < cost) return 'Not enough money.'
  s.hero.copper -= cost
  s.hero.talents = {}
  log(s, 'Talents reset.', '#ffd100')
  return null
}
