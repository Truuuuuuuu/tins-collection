// Categories are typed freely in the admin form, so the same category can be saved with
// different capitals or spacing ("Pants", "pAnts", "pants "). These helpers treat those as one.

export interface CategoryOption {
  /** Comparison key: trimmed, single-spaced, lowercase. */
  key: string
  /** The spelling shown to shoppers. */
  label: string
}

export const categoryKey = (category: string) => category.trim().replace(/\s+/g, ' ').toLowerCase()

/** "pAnts" → "Pants", "t-shirts" → "T-shirts": capital first letter of each word, rest lowercase. */
const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

/**
 * One option per distinct category. The label is a neatly capitalised spelling when one
 * exists ("Pants" over "pAnts"), otherwise the spelling used by the most items.
 */
export function categoryOptions(categories: string[]): CategoryOption[] {
  const spellings = new Map<string, Map<string, number>>()
  for (const raw of categories) {
    const key = categoryKey(raw)
    if (!key) continue
    const label = raw.trim().replace(/\s+/g, ' ')
    const counts = spellings.get(key) ?? new Map<string, number>()
    counts.set(label, (counts.get(label) ?? 0) + 1)
    spellings.set(key, counts)
  }
  const options: CategoryOption[] = []
  for (const [key, counts] of spellings) {
    const [label] = [...counts.entries()].sort(
      ([a, an], [b, bn]) =>
        Number(b === titleCase(b)) - Number(a === titleCase(a)) ||
        bn - an ||
        a.localeCompare(b),
    )[0]
    options.push({ key, label })
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

/** The existing spelling of a typed category, or the typed text tidied up if it's new. */
export function matchCategory(input: string, options: CategoryOption[]): string {
  const key = categoryKey(input)
  return options.find((o) => o.key === key)?.label ?? input.trim().replace(/\s+/g, ' ')
}
