import { useLayoutEffect, useMemo, useRef, useState } from "react";
import EmptyRackIllustration from "../components/EmptyRackIllustration";
import NoResultsIllustration from "../components/NoResultsIllustration";
import FilterMenu from "../components/FilterMenu";
import FloatingSearch from "../components/FloatingSearch";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";
import type { SortOrder } from "../lib/sort";
import SortMenu from "../components/SortMenu";
import { ProductGridSkeleton } from "../components/Skeletons";
import type { Condition } from "../lib/types";
import type { Audience, ItemType } from "../lib/types";
import { AUDIENCE_LABEL, CONDITION_LABEL, ITEM_TYPE_LABEL, isSoldOut, itemType, priceRange } from "../lib/types";
import { categoryKey, categoryOptions } from "../lib/categories";
import { useMediaQuery } from "../lib/useMediaQuery";
import { usePagination } from "../lib/usePagination";
import { useProducts } from "../lib/useProducts";
import { useSearch } from "../store/search";

const TYPE_KEYWORDS: Record<string, ItemType> = {
  accessories: "accessories",
  accessory: "accessories",
  clothing: "clothing",
  clothes: "clothing",
};

// Searching "men", "ladies", "kids"… shows every item for them.
const AUDIENCE_KEYWORDS: Record<string, Audience> = {
  men: "men",
  mens: "men",
  "men's": "men",
  male: "men",
  women: "women",
  womens: "women",
  "women's": "women",
  ladies: "women",
  female: "women",
  kids: "kids",
  kid: "kids",
  children: "kids",
};

// Homepage tabs, in the order shoppers see them.
const AUDIENCE_TABS = ["all", "women", "men", "kids"] as const;

const CONDITIONS = ["all", "new", "preloved"] as const;

export default function Catalog() {
  const { products, loading, error } = useProducts();
  const { query, setQuery } = useSearch();
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  // The tab that matches the current pick; none when several were ticked in Filters.
  const audienceTab =
    audiences.length === 0 ? "all" : audiences.length === 1 ? audiences[0] : null;
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [condition, setCondition] = useState<Condition | "all">("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const gridTop = useRef<HTMLDivElement>(null);
  // The pink bar under the active tab slides to wherever that tab sits (tabs differ in width).
  const tabsNav = useRef<HTMLElement>(null);
  const tabButtons = useRef<Partial<Record<string, HTMLButtonElement>>>({});
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  // No slide on first paint, only when switching.
  const [barReady, setBarReady] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const el = audienceTab ? tabButtons.current[audienceTab] : undefined;
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    const frame = requestAnimationFrame(() => setBarReady(true));
    // Re-measure when the row resizes, e.g. once the display font loads or the screen rotates.
    const observer = new ResizeObserver(measure);
    if (tabsNav.current) observer.observe(tabsNav.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [audienceTab]);
  // Matches Tailwind's md breakpoint: 10 per page on phones, 20 on larger screens.
  const perPage = useMediaQuery("(min-width: 768px)") ? 20 : 10;
  // On large screens the search lives in the sticky header, so no in-page or floating search.
  const searchInHeader = useMediaQuery("(min-width: 1024px)");

  // One entry per category, ignoring capitals and spacing ("Pants" and "pAnts" are the same).
  const allCategories = useMemo(
    () => categoryOptions(products.map((p) => p.category)),
    [products],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Searching a type's name (e.g. "Accessories", "CLOTHING") shows every item of that type.
    const searchedType = TYPE_KEYWORDS[q];
    const searchedAudience = AUDIENCE_KEYWORDS[q];
    return (
      products
        .filter((p) => types.length === 0 || types.includes(itemType(p)))
        .filter(
          (p) =>
            audiences.length === 0 ||
            audiences.some((a) => p.audiences.includes(a)),
        )
        .filter(
          (p) =>
            categories.length === 0 ||
            categories.includes(categoryKey(p.category)),
        )
        .filter((p) => condition === "all" || p.condition === condition)
        .filter((p) => !hideSoldOut || !isSoldOut(p))
        .filter(
          (p) =>
            !q ||
            (searchedType && itemType(p) === searchedType) ||
            (searchedAudience && p.audiences.includes(searchedAudience)) ||
            p.name.toLowerCase().includes(q) ||
            categoryKey(p.category).includes(q) ||
            p.description.toLowerCase().includes(q),
        )
        // Available items first, sold-out ones sink to the bottom; then the chosen order.
        // Products arrive newest first, so "newest" keeps that order.
        .sort(
          (a, b) =>
            Number(isSoldOut(a)) - Number(isSoldOut(b)) ||
            // Items with several prices: low-to-high uses their lowest price, high-to-low their highest.
            (sort === "price-asc" ? priceRange(a).min - priceRange(b).min : 0) ||
            (sort === "price-desc" ? priceRange(b).max - priceRange(a).max : 0),
        )
    );
  }, [products, query, types, audiences, categories, condition, hideSoldOut, sort]);


  // Start over from page 1 whenever the search, filters or sort change.
  const {
    page: currentPage,
    pageCount,
    pageItems,
    setPage,
  } = usePagination(
    visible,
    perPage,
    JSON.stringify([query, types, audiences, categories, condition, hideSoldOut, sort]),
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

      <nav
        ref={tabsNav}
        className="relative mb-6 flex gap-6 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none] sm:gap-8"
        aria-label="Shop for"
      >
        {AUDIENCE_TABS.map((t) => {
          const on = t === audienceTab;
          return (
            <button
              key={t}
              ref={(el) => {
                tabButtons.current[t] = el ?? undefined;
              }}
              onClick={() => setAudiences(t === "all" ? [] : [t])}
              aria-pressed={on}
              className={`relative shrink-0 pb-3.5 pt-1 font-display text-lg transition-colors duration-300 sm:text-xl ${
                on ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {t === "all" ? "All" : AUDIENCE_LABEL[t]}
            </button>
          );
        })}
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-brand motion-reduce:transition-none ${
            barReady
              ? "transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
              : ""
          }`}
          style={{
            width: bar?.width ?? 0,
            transform: `translateX(${bar?.left ?? 0}px)`,
            opacity: bar ? 1 : 0,
          }}
        />
      </nav>

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
            audiences={audiences}
            onAudiencesChange={setAudiences}
            categories={allCategories}
            selected={categories}
            onChange={setCategories}
            hideSoldOut={hideSoldOut}
            onHideSoldOutChange={setHideSoldOut}
            resultCount={visible.length}
          />
          <SortMenu value={sort} onChange={setSort} />
        </div>
        <div
          className="relative grid shrink-0 grid-cols-3 gap-1 rounded-full border border-line bg-subtle p-1 sm:ml-auto"
          role="group"
          aria-label="Condition"
        >
          {/* Pink pill that slides under the selected tab. Each step is one column plus the 4px gap. */}
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc((100%-1rem)/3)] rounded-full bg-brand shadow-sm shadow-brand/20 transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none"
            style={{
              transform: `translateX(calc(${CONDITIONS.indexOf(condition)} * (100% + 0.25rem)))`,
            }}
          />
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              aria-pressed={c === condition}
              className={`relative min-h-9 rounded-full px-3 text-sm transition-colors duration-300 ${
                c === condition
                  ? "font-medium text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {c === "all" ? "All" : CONDITION_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {(types.length > 0 || audiences.length > 1 || categories.length > 0 || hideSoldOut) && (
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
          {[
            ...(audiences.length > 1 ? audiences : []).map((a) => ({
              key: `audience-${a}`,
              label: AUDIENCE_LABEL[a],
              remove: () => setAudiences((xs) => xs.filter((x) => x !== a)),
            })),
            ...types.map((t) => ({
              key: `type-${t}`,
              label: ITEM_TYPE_LABEL[t],
              remove: () => setTypes((ts) => ts.filter((x) => x !== t)),
            })),
            ...categories.map((c) => ({
              key: `category-${c}`,
              label: allCategories.find((o) => o.key === c)?.label ?? c,
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
              setAudiences([]);
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
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <EmptyRackIllustration className="w-56 max-w-full sm:w-64" />
          <p className="mt-6 text-muted">No items yet. Check back soon!</p>
        </div>
      ) : visible.length === 0 ? (
        <div
          key={`${condition}-${audiences.join()}`}
          className="flex flex-col items-center py-16 text-center motion-safe:animate-[tab-in_.4s_ease-out_both]"
        >
          <NoResultsIllustration className="w-56 max-w-full sm:w-64" />
          <p className="mt-6 text-muted">Nothing matches your search.</p>
        </div>
      ) : (
        <>
          {/* Keyed on the tab so switching tabs remounts the grid and replays the staggered fade-in. */}
          <div
            key={`${condition}-${audiences.join()}`}
            className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
          >
            {pageItems.map((p, i) => (
              <div
                key={p.id}
                className="motion-safe:animate-[tab-in_.45s_cubic-bezier(.16,1,.3,1)_both]"
                style={{ animationDelay: `${Math.min(i, 11) * 40}ms` }}
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onChange={goTo}
            className="mt-10"
          />
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
