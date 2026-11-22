export type SortOrder = 'newest' | 'price-asc' | 'price-desc'

export const SORT_LABEL: Record<SortOrder, string> = {
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
}
