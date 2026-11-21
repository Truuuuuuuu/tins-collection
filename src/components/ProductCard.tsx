import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { imageUrl } from '../lib/images'
import type { Product } from '../lib/types'
import { isSoldOut } from '../lib/types'
import ConditionBadge from './ConditionBadge'
import SoldOutBadge from './SoldOutBadge'

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = isSoldOut(product)
  const cover = product.image_paths[0]
  const availableSizes = soldOut ? [] : product.product_variants.filter((v) => v.stock > 0)
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-subtle">
        {cover ? (
          <img
            src={imageUrl(cover)}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-60 grayscale-[40%]' : ''}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-4xl text-muted/30">T</div>
        )}
        {soldOut ? (
          <SoldOutBadge className="absolute left-3 top-3" />
        ) : (
          <ConditionBadge condition={product.condition} className="absolute left-3 top-3 shadow-sm" />
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{product.name}</h3>
          {product.category && <p className="text-xs text-muted">{product.category}</p>}
        </div>
        <p className="shrink-0 text-sm font-semibold">{formatPrice(product.price)}</p>
      </div>
      {availableSizes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1" aria-label="Available sizes">
          {availableSizes.map((v) => (
            <li key={v.id} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted">
              {v.size}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
