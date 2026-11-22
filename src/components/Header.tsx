import { useEffect } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { CART_TARGET_ATTR } from "../lib/flyToCart";
import { SHOP_NAME } from "../lib/format";
import { cartCount, useCart } from "../store/cart";
import { useSearch } from "../store/search";
import AdminMenu from "./AdminMenu";
import AdminNav from "./AdminNav";
import Wordmark from "./Wordmark";

export default function Header() {
  const count = useCart((s) => cartCount(s.lines));
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith("/admin");
  const auth = useAuth();

  useEffect(() => {
    document.title = inAdmin ? `${SHOP_NAME} | Admin` : SHOP_NAME;
  }, [inAdmin]);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_minmax(0,28rem)_1fr]">
        <Link
          to={inAdmin ? "/admin" : "/"}
          className="justify-self-start font-display text-2xl font-semibold tracking-tight"
        >
          <Wordmark />
          {inAdmin && (
            <span className="ml-2 align-middle text-xs font-sans font-medium uppercase tracking-widest text-brand-ink">
              Admin
            </span>
          )}
        </Link>
        {!inAdmin ? (
          <ShopSearch onShop={pathname === "/"} />
        ) : (
          auth.status === "signed-in" &&
          auth.isAdmin && <AdminNav placement="header" />
        )}
        <nav className="flex items-center gap-2 justify-self-end text-sm lg:col-start-3">
          {inAdmin ? (
            auth.status === "signed-in" && auth.isAdmin ? (
              <AdminMenu email={auth.session.user.email ?? ""} />
            ) : (
              <Link to="/" className="btn-ghost">
                View shop
              </Link>
            )
          ) : (
            <NavLink
              to="/cart"
              {...{ [CART_TARGET_ATTR]: "" }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:text-brand-ink"
              aria-label={`Cart, ${count} items`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2.5 3.5h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L20.5 7.5H5.6" />
                <circle cx="9.5" cy="19.75" r="1.25" />
                <circle cx="17" cy="19.75" r="1.25" />
              </svg>
              {count > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-none text-white">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Large screens only: the shop search, centered in the header. Typing on another page jumps to the shop. */
function ShopSearch({ onShop }: { onShop: boolean }) {
  const { query, setQuery } = useSearch();
  const navigate = useNavigate();
  return (
    <HeaderSearch
      query={query}
      placeholder="Search items"
      onType={(q) => {
        setQuery(q);
        if (!onShop) navigate("/");
      }}
      onSubmit={() => {
        if (!onShop) navigate("/");
        // Jump down to the results, below the intro.
        else
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    />
  );
}

/** Pill-shaped search field with the round pink search button. */
function HeaderSearch({
  query,
  placeholder,
  onType,
  onSubmit,
}: {
  query: string;
  placeholder: string;
  onType: (query: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      role="search"
      className="relative hidden w-full lg:block"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        type="search"
        enterKeyHint="search"
        value={query}
        onChange={(e) => onType(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input h-10 rounded-full border-brand/50 pl-4 pr-11 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand cursor-pointer"
        aria-label="Search"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
