import { create } from 'zustand'

interface SearchState {
  query: string
  setQuery: (query: string) => void
}

/** The shop's search text, shared by the header search (large screens) and the catalog page. */
export const useSearch = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}))

/** The admin item search, shared by the admin header (large screens) and the dashboard. Kept apart from the shop's. */
export const useAdminSearch = create<SearchState>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}))
