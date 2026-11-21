import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Lightbox from "../components/Lightbox";
import QtyStepper from "../components/QtyStepper";
import BackButton from "../components/BackButton";
import ConditionBadge from "../components/ConditionBadge";
import SizePicker from "../components/SizePicker";
import SoldOutBadge from "../components/SoldOutBadge";
import Toast from "../components/Toast";
import { formatPrice } from "../lib/format";
import { imageUrl } from "../lib/images";
import { flyToCart } from "../lib/flyToCart";
import { fetchProduct } from "../lib/products";
import type { Product, Variant } from "../lib/types";
import { hasSizes, isSoldOut, sizeLabel } from "../lib/types";
import { useCart } from "../store/cart";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  const [variant, setVariant] = useState<Variant | null>(null);
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
      })
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined)
    return <p className="py-20 text-center text-muted">Loading…</p>;
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
        condition: product.condition,
        price: product.price,
        qty,
        image: product.image_paths[0],
      },
      variant.stock,
    );
    const photo = product.image_paths[activeImage] ?? product.image_paths[0];
    flyToCart([photoRef.current, e.currentTarget], photo ? imageUrl(photo) : undefined);
    const size = sizeLabel(variant.size);
    setToast(`Added ${product.name}${size ? ` (${size})` : ""} to cart`);
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
            {product.category && (
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ink">
                {product.category}
              </p>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl font-semibold">
            {formatPrice(product.price)}
          </p>
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
                {hasSizes(product.product_variants) && (
                  <>
                    <span className="label">Size</span>
                    <SizePicker
                      variants={product.product_variants}
                      selectedId={variant?.id ?? null}
                      onSelect={(v) => {
                        setVariant(v);
                        setQty(1);
                      }}
                    />
                  </>
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
