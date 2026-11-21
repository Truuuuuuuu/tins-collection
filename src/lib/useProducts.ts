import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from './format'
import { fetchProducts } from './products'
import type { Product } from './types'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () =>
      fetchProducts().then(
        (ps) => {
          setProducts(ps)
          setError(null)
          setLoading(false)
        },
        (e: unknown) => {
          setError(errorMessage(e, 'Could not load products'))
          setLoading(false)
        },
      ),
    [],
  )

  useEffect(() => {
    reload()
  }, [reload])

  return { products, setProducts, loading, error, reload }
}
