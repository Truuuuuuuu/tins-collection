import { Link } from 'react-router-dom'
import Price from './Price'
import { imageUrl } from '../lib/images'
import type { Product } from '../lib/types'
import { colorStock, hasSizes, isSoldOut, priceRange, totalStock } from '../lib/types'
import ColorSwatch from './ColorSwatch'
import ConditionBadge from './ConditionBadge'
import SoldOutBadge from './SoldOutBadge'

export default function ProductCard({ product }: { product: Product }) {
  const soldOut = isSoldOut(product)
  const cover = product.image_paths[0]
  const stock = totalStock(product)
  // Each size once, even when it's in stock in several colors.
  const availableSizes =
    soldOut || !hasSizes(product.product_variants)
      ? []
      : [...new Set(product.product_variants.filter((v) => v.stock > 0).map((v) => v.size))]
  const availableColors = soldOut ? [] : product.product_colors.filter((c) => colorStock(product, c.id) > 0)
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
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <SoldOutBadge />
          ) : (
            <ConditionBadge condition={product.condition} className="shadow-sm" />
          )}
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`truncate text-sm font-medium ${soldOut ? 'text-muted' : ''}`}>{product.name}</h3>
          {availableColors.length > 0 && (
            <ul className="flex shrink-0 items-center -space-x-1" aria-label={`Colors: ${availableColors.map((c) => c.name).join(', ')}`}>
              {availableColors.slice(0, 4).map((c) => (
                <li key={c.id} className="flex rounded-full ring-2 ring-surface">
                  <ColorSwatch hex={c.hex} size={12} />
                </li>
              ))}
              {availableColors.length > 4 && <li className="pl-2 text-[11px] text-muted">+{availableColors.length - 4}</li>}
            </ul>
          )}
        </div>
        <p className={`mt-0.5 text-xl font-semibold leading-snug ${soldOut ? 'text-muted/70' : 'text-brand-ink'}`}>{/* Lowest price a shopper can pay; the product page shows each size's price. */}<Price amount={priceRange(product).min} /></p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {availableSizes.length > 0 ? (
          <ul className="flex min-w-0 flex-wrap gap-1" aria-label="Available sizes">
            {availableSizes.map((size) => (
              <li key={size} className="rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium leading-none text-muted">
                {size}
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
