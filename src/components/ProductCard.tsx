import { Link } from 'react-router-dom'
import { formatPrice } from '../lib/format'
import { imageUrl } from '../lib/images'
import type { Product } from '../lib/types'
import { hasSizes, isSoldOut, totalStock } from '../lib/types'
import ConditionBadge from './ConditionBadge'
import SoldOutBadge from './SoldOutBadge'

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = isSoldOut(product)
  const cover = product.image_paths[0]
  const stock = totalStock(product)
  const availableSizes = soldOut || !hasSizes(product.product_variants) ? [] : product.product_variants.filter((v) => v.stock > 0)
  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-subtle">
        {cover ? (
          <img
            src={imageUrl(cover)}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] ${soldOut ? 'opacity-60 grayscale-[70%]' : ''}`}
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
      <div className="mt-3">
        <h3 className={`truncate text-sm font-medium ${soldOut ? 'text-muted' : ''}`}>{product.name}</h3>
        <p className={`mt-0.5 text-xl font-semibold leading-snug ${soldOut ? 'text-muted/70' : 'text-brand-ink'}`}>{formatPrice(product.price)}</p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {availableSizes.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-1" aria-label="Available sizes">
            {availableSizes.map((v) => (
              <li key={v.id} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted">
                {v.size}
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        <p className={`shrink-0 text-xs ${!soldOut && stock <= 3 ? 'font-medium text-ink' : 'text-muted'}`}>
          {soldOut ? 'Sold out' : stock <= 3 ? `Only ${stock} left` : `${stock} in stock`}
        </p>
      </div>
    </Link>
  )
}
