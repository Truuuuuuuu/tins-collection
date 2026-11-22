import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "../components/BackButton";
import EmptyBagIllustration from "../components/EmptyBagIllustration";
import QtyStepper from "../components/QtyStepper";
import Toast from "../components/Toast";
import { formatPrice } from "../lib/format";
import { imageUrl } from "../lib/images";
import {
  buildOrderMessage,
  copyToClipboard,
  messengerUrl,
} from "../lib/messenger";
import { fetchProducts } from "../lib/products";
import type { Product } from "../lib/types";
import { sizeLabel } from "../lib/types";
import { cartTotal, useCart } from "../store/cart";

export default function Cart() {
  const { lines, setQty, remove, clear, reconcile } = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // The order message, and whether it reached the clipboard. Shown in a step-by-step dialog,
  // because Messenger can't pre-fill text: the customer has to paste it themselves.
  const [handoff, setHandoff] = useState<{
    message: string;
    copied: boolean;
  } | null>(null);

  // Check the saved cart against live stock whenever the page opens.
  useEffect(() => {
    fetchProducts()
      .then((ps) => {
        setProducts(ps);
        setNotices(reconcile(ps));
      })
      .catch(() => setProducts([]));
  }, [reconcile]);

  const stockFor = (variantId: string) =>
    products?.flatMap((p) => p.product_variants).find((v) => v.id === variantId)
      ?.stock ?? 1;

  const order = async () => {
    const message = buildOrderMessage(lines);
    setHandoff({ message, copied: await copyToClipboard(message) });
  };

  const copyAgain = async () => {
    if (!handoff) return;
    const copied = await copyToClipboard(handoff.message);
    setHandoff({ ...handoff, copied });
    setToast(
      copied
        ? "Order copied again"
        : "Couldn't copy. Select the text and copy it instead.",
    );
  };

  // Close the dialog with Escape.
  useEffect(() => {
    if (!handoff) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHandoff(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handoff]);

  if (lines.length === 0)
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <EmptyBagIllustration className="mb-6 w-56 max-w-full sm:w-64" />
        <h1 className="font-display text-3xl">Your cart is empty</h1>
        {notices.length > 0 && (
          <ul className="mt-3 text-sm text-muted">
            {notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <Link to="/" className="btn-primary mt-6">
          Browse items
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton historyBack />
      <h1 className="mt-4 font-display text-3xl sm:text-4xl">Your cart</h1>

      {notices.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <li key={l.variantId} className="flex gap-4 py-4">
            <Link
              to={`/product/${l.productId}`}
              className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-subtle"
            >
              {l.image && (
                <img
                  src={imageUrl(l.image)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="text-sm text-muted">
                    {[
                      sizeLabel(l.size),
                      l.condition === "preloved" ? "Pre-loved" : null,
                      formatPrice(l.price),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">
                  {formatPrice(l.price * l.qty)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <QtyStepper
                  value={l.qty}
                  max={stockFor(l.variantId)}
                  onChange={(n) => setQty(l.variantId, n)}
                />
                <button
                  className="text-sm text-muted underline-offset-2 hover:text-red-700 hover:underline"
                  onClick={() => remove(l.variantId)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between text-lg">
        <span>Total</span>
        <span className="font-semibold">{formatPrice(cartTotal(lines))}</span>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <p className="text-sm text-muted">
          We take orders through Facebook Messenger. Tapping the button copies
          your order, then you
          <strong className="text-ink"> paste it in our chat and send</strong>.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="btn-accent flex-1 py-3" onClick={order}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.99-.88a.8.8 0 0 1 .53-.04c.91.25 1.88.39 2.9.39 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
            </svg>
            Order via Messenger
          </button>
          <button className="btn-ghost" onClick={clear}>
            Clear cart
          </button>
        </div>
      </div>

      {handoff && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setHandoff(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="handoff-title"
          >
            {handoff.copied ? (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
                    aria-hidden
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  <h2 id="handoff-title" className="font-display text-xl">
                    Your order is copied
                  </h2>
                </div>
                <ol className="mt-4 space-y-2.5 text-sm">
                  {[
                    <>
                      Tap <strong>Open Messenger</strong> below.
                    </>,
                    <>
                      In the chat, <strong>long-press the message box</strong>{" "}
                      and tap <strong>Paste</strong>.
                    </>,
                    <>
                      Tap <strong>Send</strong>. We'll reply to confirm your
                      order.
                    </>,
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle text-xs font-semibold">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-muted [&_strong]:font-medium [&_strong]:text-ink">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <details className="mt-4 rounded-lg border border-line text-sm">
                  <summary className="cursor-pointer px-3 py-2 text-muted">
                    See what you'll paste
                  </summary>
                  <pre className="whitespace-pre-wrap border-t border-line px-3 py-2 font-sans text-xs leading-relaxed">
                    {handoff.message}
                  </pre>
                </details>
              </>
            ) : (
              <>
                <h2 id="handoff-title" className="font-display text-xl">
                  Copy your order
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Your browser didn't let us copy it automatically. Select all
                  the text below and copy it, then open Messenger and paste it
                  in the chat.
                </p>
                <textarea
                  readOnly
                  value={handoff.message}
                  rows={8}
                  className="input mt-3 font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-px shrink-0"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              This feature is supported on mobile devices only
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a
                href={messengerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent flex-1 py-3"
              >
                Open Messenger
              </a>
              {handoff.copied && (
                <button className="btn-ghost" onClick={copyAgain}>
                  Copy again
                </button>
              )}
              <button className="btn-ghost" onClick={() => setHandoff(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
