import { useState } from 'react'

/**
 * Splits a list into pages. Goes back to page 1 whenever `resetKey` changes (e.g. new filters),
 * and never points past the last page when the list shrinks.
 */
export function usePagination<T>(items: T[], perPage: number, resetKey = '') {
  const [state, setState] = useState({ page: 1, key: resetKey })
  // Adjusting state during render (instead of in an effect) avoids a flash of the old page.
  if (state.key !== resetKey) setState({ page: 1, key: resetKey })
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  const page = Math.min(state.key === resetKey ? state.page : 1, pageCount)
  return {
    page,
    pageCount,
    pageItems: items.slice((page - 1) * perPage, page * perPage),
    setPage: (p: number) => setState({ page: p, key: resetKey }),
    /** e.g. "11–20 of 47" */
    range: items.length === 0 ? '0' : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, items.length)} of ${items.length}`,
  }
}
