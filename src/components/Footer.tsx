import { Link, useLocation } from "react-router-dom";
import { SHOP_NAME } from "../lib/format";
import { messengerUrl } from "../lib/messenger";
import { facebookUrl, mapsUrl, storeAddress } from "../lib/shop";
import Wordmark from "./Wordmark";

const STEPS = [
  "Add items to your cart, picking a size for clothes.",
  "Tap “Order via Messenger” and send us the message.",
  "We confirm stock, payment and delivery in the chat.",
];

export default function Footer() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;
  // The homepage has a floating search bar at the bottom below lg, so leave room for it.
  const roomForSearch = pathname === "/";
  const facebook = facebookUrl();

  return (
    <footer
      className={`border-t border-blush-line bg-blush ${roomForSearch ? "pb-24 lg:pb-0" : ""}`}
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Brand new and pre-loved clothing and accessories, handpicked and in
            limited stock.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ink">
            How to order
          </h2>
          <ol className="mt-4 space-y-3 text-sm">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-brand-ink ring-1 ring-blush-line">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ink">
            Questions?
          </h2>
          <p className="mt-4 text-sm text-muted">
            Ask about sizes, measurements or a pre-loved item's condition. We're
            happy to help.
          </p>
          <a
            href={messengerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mt-4 min-h-11 whitespace-nowrap px-4"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="blue"
              aria-hidden
            >
              <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78a.8.8 0 0 0 1.12.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.88.38 2.91.38 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
            </svg>
            <p className="text-blue-700">Message us on Messenger</p>
          </a>
        </div>

        {(facebook || storeAddress) && (
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-brand-ink">
              Where to find us
            </h2>
            <ul className="mt-4 space-y-4 text-sm">
              {storeAddress && (
                <li className="flex gap-3">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-brand-ink"
                    aria-hidden
                  >
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  <div>
                    <p className="text-ink">{storeAddress}</p>
                    <a
                      href={mapsUrl(storeAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex min-h-8 items-center font-medium text-brand-ink underline-offset-2 hover:underline"
                    >
                      Get directions →
                    </a>
                  </div>
                </li>
              )}
              {facebook && (
                <li>
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-11 items-center gap-3"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#1877F2"
                      className="shrink-0"
                      aria-hidden
                    >
                      <path d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.93-1.95 1.87V12h3.33l-.53 3.47h-2.8v8.38A12 12 0 0 0 24 12Z" />
                    </svg>
                    <span>
                      <span className="flex items-center gap-1 text-ink group-hover:text-brand-ink">
                        Tin's Collection
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          aria-hidden
                        >
                          <path d="M7 17 17 7M8 7h9v9" />
                        </svg>
                        <span className="sr-only">(opens in a new tab)</span>
                      </span>
                      <span className="block text-muted">
                        Our official Facebook page
                      </span>
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-blush-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {SHOP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
