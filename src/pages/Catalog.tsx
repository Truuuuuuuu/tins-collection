import { useEffect, useMemo, useRef, useState } from "react";
import FilterMenu from "../components/FilterMenu";
import FloatingSearch from "../components/FloatingSearch";
import ProductCard from "../components/ProductCard";
import type { Condition } from "../lib/types";
import type { ItemType } from "../lib/types";
import { CONDITION_LABEL, ITEM_TYPE_LABEL, isSoldOut, itemType } from "../lib/types";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useProducts } from "../lib/useProducts";
import { useSearch } from "../store/search";

const TYPE_KEYWORDS: Record<string, ItemType> = {
  accessories: "accessories",
  accessory: "accessories",
  clothing: "clothing",
  clothes: "clothing",
};

export default function Catalog() {
  const { products, loading, error } = useProducts();
  const { query, setQuery } = useSearch();
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [condition, setCondition] = useState<Condition | "all">("all");
  const [page, setPage] = useState(1);
  const gridTop = useRef<HTMLDivElement>(null);
  // Matches Tailwind's md breakpoint: 10 per page on phones, 20 on larger screens.
  const perPage = useMediaQuery("(min-width: 768px)") ? 20 : 10;
  // On large screens the search lives in the sticky header, so no in-page or floating search.
  const searchInHeader = useMediaQuery("(min-width: 1024px)");

  const allCategories = useMemo(
    () =>
      Array.from(
        new Set(products.map((p) => p.category).filter(Boolean)),
      ).sort(),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Searching a type's name (e.g. "Accessories", "CLOTHING") shows every item of that type.
    const searchedType = TYPE_KEYWORDS[q];
    return (
      products
        .filter((p) => types.length === 0 || types.includes(itemType(p)))
        .filter(
          (p) => categories.length === 0 || categories.includes(p.category),
        )
        .filter((p) => condition === "all" || p.condition === condition)
        .filter((p) => !hideSoldOut || !isSoldOut(p))
        .filter(
          (p) =>
            !q ||
            (searchedType && itemType(p) === searchedType) ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
        // Available items first, sold-out ones sink to the bottom.
        .sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)))
    );
  }, [products, query, types, categories, condition, hideSoldOut]);

  // Start over from page 1 whenever the filters change.
  useEffect(() => setPage(1), [query, types, categories, condition, hideSoldOut]);

  const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visible.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const goTo = (p: number) => {
    setPage(p);
    gridTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="py-8 sm:py-12">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-ink">
          Clothing &amp; accessories
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
          Find your new{" "}
          <span className="font-script text-[1.15em] font-bold text-brand-ink">
            favorite
          </span>{" "}
          piece.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Handpicked clothes and accessories, brand new and pre-loved.
        </p>
      </section>

      <div
        ref={gridTop}
        id="results"
        className="mb-6 flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex gap-2 sm:max-w-md sm:flex-1 lg:flex-none">
          {!searchInHeader && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items"
              className="input h-10 border-brand/50"
              aria-label="Search items"
            />
          )}
          <FilterMenu
            types={types}
            onTypesChange={setTypes}
            categories={allCategories}
            selected={categories}
            onChange={setCategories}
            hideSoldOut={hideSoldOut}
            onHideSoldOutChange={setHideSoldOut}
          />
        </div>
        <div
          className="grid shrink-0 grid-cols-3 gap-1 rounded-full border border-line bg-subtle p-1 sm:ml-auto"
          role="group"
          aria-label="Condition"
        >
          {(["all", "new", "preloved"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              aria-pressed={c === condition}
              className={`min-h-9 rounded-full px-3 text-sm transition ${
                c === condition
                  ? "bg-brand font-medium text-white shadow-sm shadow-brand/20"
                  : "text-muted hover:text-ink"
              }`}
            >
              {c === "all" ? "All" : CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {(types.length > 0 || categories.length > 0 || hideSoldOut) && (
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
          {[
            ...types.map((t) => ({
              key: `type-${t}`,
              label: ITEM_TYPE_LABEL[t],
              remove: () => setTypes((ts) => ts.filter((x) => x !== t)),
            })),
            ...categories.map((c) => ({
              key: `category-${c}`,
              label: c,
              remove: () => setCategories((cs) => cs.filter((x) => x !== c)),
            })),
            ...(hideSoldOut
              ? [
                  {
                    key: "sold-out",
                    label: "Hide sold out",
                    remove: () => setHideSoldOut(false),
                  },
                ]
              : []),
          ].map((f) => (
            <button
              key={f.key}
              onClick={f.remove}
              className="flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pl-3 pr-2 text-sm text-brand-ink hover:bg-brand/15"
              aria-label={`Remove ${f.label} filter`}
            >
              {f.label}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            onClick={() => {
              setTypes([]);
              setCategories([]);
              setHideSoldOut(false);
            }}
            className="px-1 text-sm text-muted hover:text-brand-ink"
          >
            Clear all
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}
      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-2xl bg-subtle"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-20 text-center text-muted">
          {products.length === 0
            ? "No items yet. Check back soon!"
            : "Nothing matches your search."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
            {pageItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <nav
            className="mt-10 flex items-center justify-center gap-2"
            aria-label="Pagination"
          >
            <button
              className="btn-ghost min-h-11 px-4"
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <p className="px-2 text-sm text-muted sm:hidden">
              {currentPage} / {pageCount}
            </p>
            <div className="hidden gap-1 sm:flex">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => goTo(n)}
                  aria-current={n === currentPage ? "page" : undefined}
                  className={`h-11 min-w-11 rounded-full px-3 text-sm transition ${
                    n === currentPage
                      ? "bg-brand font-semibold text-white"
                      : "text-muted hover:text-brand-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              className="btn-ghost min-h-11 px-4"
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              Next
            </button>
          </nav>
        </>
      )}

      {!searchInHeader && (
        <FloatingSearch
          anchor={gridTop}
          value={query}
          onChange={setQuery}
          onSubmit={() =>
            gridTop.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        />
      )}
    </>
  );
}
