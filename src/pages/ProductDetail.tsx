import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Lightbox from "../components/Lightbox";
import QtyStepper from "../components/QtyStepper";
import BackButton from "../components/BackButton";
import ColorSwatch from "../components/ColorSwatch";
import ConditionBadge from "../components/ConditionBadge";
import { ProductDetailSkeleton } from "../components/Skeletons";
import SizePicker from "../components/SizePicker";
import SoldOutBadge from "../components/SoldOutBadge";
import Toast from "../components/Toast";
import Price, { PriceRange } from "../components/Price";
import { imageUrl } from "../lib/images";
import { flyToCart } from "../lib/flyToCart";
import { fetchProduct } from "../lib/products";
import type { Product, Variant } from "../lib/types";
import {
  audienceLabel,
  colorOf,
  colorStock,
  hasSizePrices,
  hasSizes,
  isSoldOut,
  priceRange,
  sizePrice,
  variantLabel,
} from "../lib/types";
import { useCart } from "../store/cart";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [variant, setVariant] = useState<Variant | null>(null);
  // The picked color, for items that come in colors.
  const [colorId, setColorId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);
  const inCart = useCart(
    (s) => s.lines.find((l) => l.variantId === variant?.id)?.qty ?? 0,
  );

  useEffect(() => {
    if (!id) return;
    fetchProduct(id)
      .then((p) => {
        setProduct(p);
        const firstAvailable =
          p?.product_variants.find((v) => v.stock > 0) ?? null;
        setVariant(firstAvailable);
        const color = p && firstAvailable ? colorOf(p, firstAvailable) : null;
        setColorId(color?.id ?? p?.product_colors[0]?.id ?? null);
        // Open on the first photo of that color, when it has one.
        if (p && color?.image_paths[0])
          setActiveImage(Math.max(0, p.image_paths.indexOf(color.image_paths[0])));
      })
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined)
    return <ProductDetailSkeleton />;
  if (product === null)
    return (
      <div className="py-20 text-center">
        <p className="text-muted">This item isn't available anymore.</p>
        <Link to="/" className="btn-ghost mt-4">
          Back to shop
        </Link>
      </div>
    );

  const soldOut = isSoldOut(product);
  const colors = product.product_colors;
  // Sizes on offer: the picked color's, or all of them for items without colors.
  const sizeOptions = colors.length
    ? product.product_variants.filter((v) => v.color_id === colorId)
    : product.product_variants;

  const pickColor = (id: string) => {
    if (id === colorId) return;
    setColorId(id);
    setQty(1);
    // Keep the same size when this color has it in stock; otherwise its first size in stock.
    const inColor = product.product_variants.filter((v) => v.color_id === id);
    setVariant(
      inColor.find((v) => v.size === variant?.size && v.stock > 0) ??
        inColor.find((v) => v.stock > 0) ??
        null,
    );
    const photo = colors.find((c) => c.id === id)?.image_paths[0];
    if (photo) setActiveImage(Math.max(0, product.image_paths.indexOf(photo)));
  };
  const pickedColor = colors.find((c) => c.id === colorId) ?? null;
  const remaining = variant ? variant.stock - inCart : 0;
  const canAdd = !soldOut && variant !== null && remaining > 0;

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!variant) return;
    add(
      {
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        size: variant.size,
        color: colorOf(product, variant)?.name,
        condition: product.condition,
        price: sizePrice(product, variant),
        qty,
        image: colorOf(product, variant)?.image_paths[0] ?? product.image_paths[0],
      },
      variant.stock,
    );
    const photo = product.image_paths[activeImage] ?? product.image_paths[0];
    flyToCart([photoRef.current, e.currentTarget], photo ? imageUrl(photo) : undefined);
    const option = variantLabel(product, variant);
    setToast(`Added ${product.name}${option ? ` (${option})` : ""} to cart`);
    setQty(1);
  };

  return (
    <>
      <BackButton />
      <div className="mt-4 grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <div
            ref={photoRef}
            className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-subtle"
          >
            {product.image_paths[activeImage] ? (
              <button
                type="button"
                className="group block h-full w-full cursor-zoom-in"
                onClick={() => setViewerOpen(true)}
                aria-label="View full photo"
              >
                <img
                  src={imageUrl(product.image_paths[activeImage])}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                <span
                  className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm transition group-hover:scale-110"
                  aria-hidden
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center font-display text-6xl text-muted/30">
                T
              </div>
            )}
            {soldOut && <SoldOutBadge className="absolute left-4 top-4" />}
          </div>
          {product.image_paths.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {product.image_paths.map((path, i) => (
                <button
                  key={path}
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? "border-brand" : "border-transparent"}`}
                  aria-label={`Photo ${i + 1}`}
                >
                  <img
                    src={imageUrl(path)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ConditionBadge condition={product.condition} />
            {(product.category || product.audiences.length > 0) && (
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ink">
                {[audienceLabel(product.audiences), product.category]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            {product.name}
          </h1>
          {/* The picked size's price; the full range until a size is picked (or when sold out). */}
          <p className="mt-3 text-xl font-semibold" aria-live="polite">
            {variant && !soldOut
              ? <Price amount={sizePrice(product, variant)} />
              : <PriceRange {...priceRange(product)} />}
          </p>
          {hasSizePrices(product) && !soldOut && (
            <p className="mt-1 text-xs text-muted">
              Price depends on size: <PriceRange {...priceRange(product)} />
            </p>
          )}
          {product.description && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-muted">
              {product.description}
            </p>
          )}

          {soldOut ? (
            <p className="mt-8 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
              This item is sold out. Message us if you'd like to be notified
              when it's back.
            </p>
          ) : (
            <div className="mt-8 space-y-6">
              <div>
                {colors.length > 0 && (
                  <div className="mb-5">
                    <span className="label">
                      Color{pickedColor && <span className="font-normal text-muted">: {pickedColor.name}</span>}
                    </span>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
                      {colors.map((c) => {
                        const out = colorStock(product, c.id) === 0;
                        const selected = c.id === colorId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={out}
                            onClick={() => pickColor(c.id)}
                            className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition ${
                              selected ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-line bg-surface hover:border-brand"
                            } ${out ? "cursor-not-allowed text-muted line-through opacity-50 hover:border-line" : ""}`}
                          >
                            <ColorSwatch hex={c.hex} size={22} />
                            {c.name}
                            {out && <span className="sr-only"> (sold out)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {hasSizes(product.product_variants) && (
                  <>
                    <span className="label">Size</span>
                    <SizePicker
                      variants={sizeOptions}
                      selectedId={variant?.id ?? null}
                      onSelect={(v) => {
                        setVariant(v);
                        setQty(1);
                      }}
                    />
                  </>
                )}
                {variant?.measurements && (
                  <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm">
                    <span className="font-medium">
                      {hasSizes(product.product_variants) ? `Size ${variant.size} measurements: ` : "Measurements: "}
                    </span>
                    <span className="text-muted">{variant.measurements}</span>
                  </p>
                )}
                {variant && (
                  <p className="mt-2 text-xs text-muted">
                    {variant.stock <= 3
                      ? `Only ${variant.stock} left`
                      : `${variant.stock} in stock`}
                    {inCart > 0 && ` · ${inCart} already in your cart`}
                  </p>
                )}
              </div>
              <div>
                <span className="label">Quantity</span>
                <QtyStepper
                  value={qty}
                  max={Math.max(1, remaining)}
                  onChange={setQty}
                />
              </div>
              <button
                className="btn-primary w-full py-3 sm:w-auto sm:px-10"
                onClick={handleAdd}
                disabled={!canAdd}
              >
                {variant && remaining <= 0
                  ? "All available stock is in your cart"
                  : "Add to cart"}
              </button>
            </div>
          )}
        </div>
      </div>
      {viewerOpen && (
        <Lightbox
          images={product.image_paths.map(imageUrl)}
          index={activeImage}
          alt={product.name}
          onIndexChange={setActiveImage}
          onClose={() => setViewerOpen(false)}
        />
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
