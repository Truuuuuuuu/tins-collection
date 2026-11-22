import { create } from 'zustand'

/** The shop's search text, shared by the header search (large screens) and the catalog page. */
export const useSearch = create<{ query: string; setQuery: (query: string) => void }>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
}))
