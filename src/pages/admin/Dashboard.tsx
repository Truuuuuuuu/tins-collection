import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BulkActionSheet from "../../components/BulkActionSheet";
import FilterMenu from "../../components/FilterMenu";
import Pagination from "../../components/Pagination";
import { AdminListSkeleton, Bone } from "../../components/Skeletons";
import SoldOutBadge from "../../components/SoldOutBadge";
import StockStepper from "../../components/StockStepper";
import Toast from "../../components/Toast";
import {
  errorMessage,
  formatPrice,
  formatPriceRange,
} from "../../lib/format";
import { imageUrl } from "../../lib/images";
import {
  purgeExpiredTrash,
  setSoldOut,
  TRASH_DAYS,
  trashProducts,
  updateAudiences,
  updateCategory,
  updateStock,
} from "../../lib/products";
import { fetchSales, saleTotal, startOfMonth } from "../../lib/sales";
import {
  categoryKey,
  categoryOptions,
  matchCategory,
} from "../../lib/categories";
import type {
  Audience,
  Condition,
  ItemType,
  Product,
  StockStatus,
} from "../../lib/types";
import {
  AUDIENCE_LABEL,
  AUDIENCES,
  audienceLabel,
  CONDITION_LABEL,
  ITEM_TYPE_LABEL,
  STOCK_STATUS_LABEL,
  hasSizePrices,
  isSoldOut,
  itemType,
  priceRange,
  sizeLabel,
  sizePrice,
  stockStatus,
  totalStock,
} from "../../lib/types";
import { usePagination } from "../../lib/usePagination";
import { useProducts } from "../../lib/useProducts";
import { useAdminSearch } from "../../store/search";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Dashboard() {
  const { products, setProducts, loading, error, reload } = useProducts();
  const { query, setQuery } = useAdminSearch();
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [stock, setStock] = useState<StockStatus[]>([]);
  const [tidying, setTidying] = useState(false);
  // Bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState<Product[] | null>(
    null,
  );
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [audienceDialog, setAudienceDialog] = useState(false);
  const [newAudiences, setNewAudiences] = useState<Audience[]>([]);
  // This month's sales: undefined while loading, null if sales aren't set up in the database yet.
  const [monthSales, setMonthSales] = useState<
    { total: number; pieces: number } | null | undefined
  >(undefined);
  const listTop = useRef<HTMLDivElement>(null);
  // Coming back from the item form: which item was just saved, so it can glow in the list.
  const location = useLocation();
  const navigate = useNavigate();
  const [justSaved, setJustSaved] = useState<string | null>(null);
  useEffect(() => {
    const saved = (location.state as { saved?: { id: string; name: string; isNew: boolean } } | null)?.saved;
    if (!saved) return;
    setJustSaved(saved.id);
    setToast(saved.isNew ? `“${saved.name}” added` : `Changes to “${saved.name}” saved`);
    // Forget it, so a refresh or going back doesn't replay the highlight.
    navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    fetchSales(startOfMonth())
      .then((sales) =>
        setMonthSales({
          total: saleTotal(sales),
          pieces: sales.reduce((n, s) => n + s.qty, 0),
        }),
      )
      .catch(() => setMonthSales(null));
    // Items left in "Recently deleted" past the limit are removed for good (photos included).
    purgeExpiredTrash().catch(() => undefined);
  }, []);

  const patch = (id: string, fn: (p: Product) => Product) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));

  const run = async (
    id: string,
    action: () => Promise<void>,
    success: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      setToast(success);
    } catch (e) {
      setToast(errorMessage(e, "Something went wrong"));
      reload();
    } finally {
      setBusyId(null);
    }
  };

  const changeStock = (p: Product, variantId: string, value: number) => {
    const n = Math.max(0, Math.floor(value || 0));
    patch(p.id, (x) => ({
      ...x,
      product_variants: x.product_variants.map((v) =>
        v.id === variantId ? { ...v, stock: n } : v,
      ),
    }));
    run(p.id, () => updateStock(variantId, n), "Stock updated");
  };

  const toggleSoldOut = (p: Product) => {
    patch(p.id, (x) => ({ ...x, is_sold_out: !x.is_sold_out }));
    run(
      p.id,
      () => setSoldOut(p.id, !p.is_sold_out),
      p.is_sold_out ? "Marked available" : "Marked sold out",
    );
  };

  const q = query.trim().toLowerCase();
  const allCategories = useMemo(
    () => categoryOptions(products.map((p) => p.category)),
    [products],
  );
  const visible = products
    .filter((p) => types.length === 0 || types.includes(itemType(p)))
    .filter(
      (p) =>
        categories.length === 0 || categories.includes(categoryKey(p.category)),
    )
    .filter((p) => conditions.length === 0 || conditions.includes(p.condition))
    .filter(
      (p) =>
        audiences.length === 0 || audiences.some((a) => p.audiences.includes(a)),
    )
    .filter((p) => stock.length === 0 || stock.includes(stockStatus(p)))
    .filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        categoryKey(p.category).includes(q),
    );
  // 10 per page; back to page 1 whenever the search or filters change.
  const pager = usePagination(
    visible,
    10,
    JSON.stringify([q, types, categories, conditions, audiences, stock]),
  );
  // Once the list has loaded, open the page holding the saved item and scroll it into view.
  const savedIndex = justSaved ? visible.findIndex((p) => p.id === justSaved) : -1;
  const savedPage = savedIndex === -1 ? null : Math.floor(savedIndex / 10) + 1;
  useEffect(() => {
    if (loading || !justSaved) return;
    if (savedPage && savedPage !== pager.page) return pager.setPage(savedPage);
    document
      .getElementById(`item-${justSaved}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(() => setJustSaved(null), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, justSaved, savedPage, pager.page]);
  const goToPage = (n: number) => {
    pager.setPage(n);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  // Only items you can see count as selected, so a bulk action never touches hidden items.
  const picked = visible.filter((p) => selected.has(p.id));

  const togglePick = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const pickAll = () => setSelected(new Set(visible.map((p) => p.id)));
  const clearPicked = () => setSelected(new Set());

  const bulk = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      setToast(success);
      clearPicked();
    } catch (e) {
      setToast(errorMessage(e, "Something went wrong"));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const bulkSoldOut = (soldOut: boolean) => {
    const ids = picked.map((p) => p.id);
    bulk(
      async () => {
        await setSoldOut(ids, soldOut);
        setProducts((ps) =>
          ps.map((p) =>
            ids.includes(p.id) ? { ...p, is_sold_out: soldOut } : p,
          ),
        );
      },
      `${plural(ids.length, "item")} marked ${soldOut ? "sold out" : "available"}`,
    );
  };

  const saveBulkCategory = () => {
    const ids = picked.map((p) => p.id);
    const category = matchCategory(newCategory, allCategories);
    setCategoryDialog(false);
    bulk(
      async () => {
        await updateCategory(ids, category);
        setProducts((ps) =>
          ps.map((p) => (ids.includes(p.id) ? { ...p, category } : p)),
        );
      },
      category
        ? `Moved ${plural(ids.length, "item")} to “${category}”`
        : `Removed the category from ${plural(ids.length, "item")}`,
    );
  };

  const saveBulkAudiences = () => {
    const ids = picked.map((p) => p.id);
    const chosen = AUDIENCES.filter((a) => newAudiences.includes(a));
    setAudienceDialog(false);
    bulk(
      async () => {
        await updateAudiences(ids, chosen);
        setProducts((ps) =>
          ps.map((p) => (ids.includes(p.id) ? { ...p, audiences: chosen } : p)),
        );
      },
      chosen.length
        ? `${plural(ids.length, "item")} now for ${audienceLabel(chosen)}`
        : `Cleared “Shop for” on ${plural(ids.length, "item")}`,
    );
  };

  const confirmTrash = () => {
    if (!confirmingDelete) return;
    const ids = confirmingDelete.map((p) => p.id);
    setConfirmingDelete(null);
    bulk(
      async () => {
        await trashProducts(ids);
        setProducts((ps) => ps.filter((p) => !ids.includes(p.id)));
      },
      ids.length === 1
        ? "Moved to Recently deleted"
        : `Moved ${plural(ids.length, "item")} to Recently deleted`,
    );
  };

  const activeFilters = [
    // The search field lives in the tab bar and can be closed, so show what it's filtering here too.
    ...(q
      ? [
          {
            key: "search",
            label: `“${query.trim()}”`,
            remove: () => setQuery(""),
          },
        ]
      : []),
    ...types.map((t) => ({
      key: `type-${t}`,
      label: ITEM_TYPE_LABEL[t],
      remove: () => setTypes((xs) => xs.filter((x) => x !== t)),
    })),
    ...conditions.map((c) => ({
      key: `condition-${c}`,
      label: CONDITION_LABEL[c],
      remove: () => setConditions((xs) => xs.filter((x) => x !== c)),
    })),
    ...audiences.map((a) => ({
      key: `audience-${a}`,
      label: AUDIENCE_LABEL[a],
      remove: () => setAudiences((xs) => xs.filter((x) => x !== a)),
    })),
    ...categories.map((c) => ({
      key: `category-${c}`,
      label: allCategories.find((o) => o.key === c)?.label ?? c,
      remove: () => setCategories((xs) => xs.filter((x) => x !== c)),
    })),
    ...stock.map((s) => ({
      key: `stock-${s}`,
      label: STOCK_STATUS_LABEL[s],
      remove: () => setStock((xs) => xs.filter((x) => x !== s)),
    })),
  ];
  const clearFilters = () => {
    setQuery("");
    setTypes([]);
    setCategories([]);
    setConditions([]);
    setAudiences([]);
    setStock([]);
  };
  /** Overview shortcut: show only one stock status and jump to the list. */
  const showOnly = (status: StockStatus) => {
    clearFilters();
    setQuery("");
    setStock([status]);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Items saved with a different spelling of an existing category ("pAnts" when "Pants" exists).
  const mismatched = products.filter(
    (p) =>
      p.category && matchCategory(p.category, allCategories) !== p.category,
  );
  const tidyCategories = async () => {
    setTidying(true);
    try {
      for (const p of mismatched) {
        const category = matchCategory(p.category, allCategories);
        await updateCategory(p.id, category);
        patch(p.id, (x) => ({ ...x, category }));
      }
      setToast(`Tidied ${plural(mismatched.length, "category name")}`);
    } catch (e) {
      setToast(errorMessage(e, "Could not tidy categories"));
      reload();
    } finally {
      setTidying(false);
    }
  };

  const soldOutCount = products.filter(isSoldOut).length;
  const available = products.filter((p) => !isSoldOut(p));
  // Only stock that can actually be bought: items marked sold out don't count.
  const unitsInStock = available.reduce((n, p) => n + totalStock(p), 0);
  // What everything still for sale is worth: each size's price × its stock.
  const inventoryValue = available.reduce(
    (n, p) =>
      n +
      p.product_variants.reduce((m, v) => m + sizePrice(p, v) * v.stock, 0),
    0,
  );
  // Same "Only N left" threshold shoppers see on product cards.
  const runningLow = available.filter((p) => totalStock(p) <= 3).length;

  return (
    <>
      <section aria-labelledby="overview-title">
        <h1 id="overview-title" className="font-display text-3xl">
          Overview
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            loading={monthSales === undefined}
            label="Sales this month"
            value={monthSales ? formatPrice(Math.round(monthSales.total)) : "—"}
            note={
              monthSales ? (
                // Green once something has sold this month.
                <span
                  className={
                    monthSales.pieces > 0 ? "font-medium text-emerald-700" : ""
                  }
                >
                  {plural(monthSales.pieces, "piece")} sold
                </span>
              ) : (
                "Not set up yet: see README"
              )
            }
            to="/admin/sales"
          />
          <StatCard
            loading={loading}
            label="Inventory value"
            value={formatPrice(Math.round(inventoryValue))}
            note={`Across ${plural(products.length, "item")} listed`}
          />
          <StatCard
            loading={loading}
            label="Sold out"
            value={soldOutCount}
            highlight={soldOutCount > 0}
            note={
              products.length === 0
                ? "Nothing listed yet"
                : soldOutCount === 0
                  ? "Everything is available"
                  : `${Math.round((soldOutCount / products.length) * 100)}% of your items`
            }
            onClick={soldOutCount > 0 ? () => showOnly("sold-out") : undefined}
          />
          <StatCard
            loading={loading}
            label="Units in stock"
            value={unitsInStock}
            // Color by total units: red 0–4, orange 5–10, green 11 and up.
            note={
              <StockLabel tone={stockTone(unitsInStock)}>
                {unitsInStock === 0
                  ? "Nothing left to sell"
                  : runningLow > 0
                    ? `${plural(runningLow, "item")} running low`
                    : STOCK_TONE[stockTone(unitsInStock)].label}
              </StockLabel>
            }
            onClick={runningLow > 0 ? () => showOnly("low") : undefined}
          />
        </div>
      </section>

      <div
        ref={listTop}
        className="mt-10 flex scroll-mt-36 flex-wrap items-center justify-between gap-3"
      >
        <h2 className="font-display text-2xl">Items</h2>
        <div className="flex items-center gap-2">
          <FilterMenu
            types={types}
            onTypesChange={setTypes}
            categories={allCategories}
            selected={categories}
            onChange={setCategories}
            conditions={conditions}
            onConditionsChange={setConditions}
            audiences={audiences}
            onAudiencesChange={setAudiences}
            stock={stock}
            onStockChange={setStock}
            resultCount={visible.length}
            align="right"
          />
          <Link to="/admin/new" className="btn-primary">
            + Add item
          </Link>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
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
            onClick={clearFilters}
            className="px-1 text-sm text-muted hover:text-brand-ink"
          >
            Clear all
          </button>
          <span className="ml-auto text-sm text-muted">
            Showing {visible.length} of {products.length}
          </span>
        </div>
      )}

      {!loading && mismatched.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            {plural(mismatched.length, "item")}{" "}
            {mismatched.length === 1 ? "uses" : "use"} a different spelling of
            an existing category (e.g. “{mismatched[0].category}” → “
            {matchCategory(mismatched[0].category, allCategories)}”).
          </p>
          <button
            className="btn-ghost px-4 py-1.5"
            onClick={tidyCategories}
            disabled={tidying}
          >
            {tidying ? "Tidying…" : "Tidy up"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <AdminListSkeleton />
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {products.length
            ? "No items match your search or filters."
            : "No items yet. Add your first one!"}
        </p>
      ) : (
        <>
          {/* "Select all" lives in the bulk-action sheet, which appears once an item is ticked. */}
          <p className="mt-6 px-1 text-right text-sm text-muted tabular-nums">
            {pager.range}
          </p>
          <ul className="mt-3 space-y-3">
            {pager.pageItems.map((p) => (
              <li
                key={p.id}
                id={`item-${p.id}`}
                className={`scroll-mt-40 rounded-2xl border bg-surface p-4 transition ${selected.has(p.id) ? "border-brand ring-1 ring-brand" : "border-line"} ${busyId === p.id ? "opacity-70" : ""} ${justSaved === p.id ? "motion-safe:animate-[saved-glow_2.4s_ease-out_both] motion-reduce:border-brand" : ""}`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand"
                    checked={selected.has(p.id)}
                    onChange={() => togglePick(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-subtle">
                    {p.image_paths[0] && (
                      <img
                        src={imageUrl(p.image_paths[0])}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-medium">{p.name}</h3>
                      {isSoldOut(p) && <SoldOutBadge />}
                    </div>
                    <p className="text-sm text-muted">
                      {formatPriceRange(priceRange(p, true))} ·{" "}
                      {CONDITION_LABEL[p.condition]}
                      {p.audiences.length > 0 &&
                        ` · ${audienceLabel(p.audiences)}`}
                      {p.category &&
                        ` · ${matchCategory(p.category, allCategories)}`}{" "}
                      · {totalStock(p)} in stock
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.product_variants.map((v) => (
                        <StockStepper
                          key={v.id}
                          // With per-size prices, each stepper shows its size's price too.
                          size={
                            hasSizePrices(p)
                              ? `${sizeLabel(v.size) ?? "Stock"} · ${formatPrice(sizePrice(p, v))}`
                              : (sizeLabel(v.size) ?? "Stock")
                          }
                          stock={v.stock}
                          onCommit={(n) => changeStock(p, v.id, n)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
                  <button
                    className="btn-ghost px-4 py-1.5"
                    onClick={() => toggleSoldOut(p)}
                    disabled={busyId === p.id}
                  >
                    {p.is_sold_out ? "Mark available" : "Mark sold out"}
                  </button>
                  <Link
                    to={`/admin/edit/${p.id}`}
                    className="btn-ghost px-4 py-1.5"
                  >
                    Edit
                  </Link>
                  <button
                    className="btn-danger ml-auto px-4 py-1.5"
                    onClick={() => setConfirmingDelete([p])}
                    disabled={busyId === p.id}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={pager.page}
            pageCount={pager.pageCount}
            onChange={goToPage}
            className="mt-8"
          />
          {/* Extra room at the bottom so the action bar never covers the last item or the pages. */}
          {picked.length > 0 && <div className="h-52 sm:h-48" aria-hidden />}
        </>
      )}

      <BulkActionSheet
        count={picked.length}
        total={visible.length}
        onSelectAll={pickAll}
        onClear={clearPicked}
        busy={busy}
        actions={[
          {
            label: "Sold out",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></svg>,
            onClick: () => bulkSoldOut(true),
          },
          {
            label: "Available",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg>,
            onClick: () => bulkSoldOut(false),
          },
          {
            label: "Category",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>,
            onClick: () => {
              setNewCategory("");
              setCategoryDialog(true);
            },
          },
          {
            label: "Shop for",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 7M18 20a6 6 0 0 0-2.5-4.9" /></svg>,
            onClick: () => {
              // Start from what the picked items share, so a quick Save changes nothing unexpected.
              setNewAudiences(
                AUDIENCES.filter((a) => picked.every((p) => p.audiences.includes(a))),
              );
              setAudienceDialog(true);
            },
          },
          {
            label: "Delete",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
            onClick: () => setConfirmingDelete(picked),
            danger: true,
          },
        ]}
      />

      {confirmingDelete && (
        <Dialog
          title={
            confirmingDelete.length === 1
              ? `Delete “${confirmingDelete[0].name}”?`
              : `Delete ${plural(confirmingDelete.length, "item")}?`
          }
          onClose={() => setConfirmingDelete(null)}
        >
          <p className="mt-2 text-sm text-muted">
            {confirmingDelete.length === 1 ? "It moves" : "They move"} to{" "}
            <strong className="text-ink">Recently deleted</strong> and{" "}
            {confirmingDelete.length === 1 ? "disappears" : "disappear"} from
            the shop. You can restore{" "}
            {confirmingDelete.length === 1 ? "it" : "them"} for {TRASH_DAYS}{" "}
            days, then {confirmingDelete.length === 1 ? "it is" : "they are"}{" "}
            removed for good, photos included.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              className="btn flex-1 bg-red-700 text-white hover:bg-red-800"
              onClick={confirmTrash}
            >
              Delete
            </button>
            <button
              className="btn-ghost flex-1"
              onClick={() => setConfirmingDelete(null)}
            >
              Cancel
            </button>
          </div>
        </Dialog>
      )}

      {categoryDialog && (
        <Dialog
          title={`Change category of ${plural(picked.length, "item")}`}
          onClose={() => setCategoryDialog(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBulkCategory();
            }}
          >
            <label className="label mt-3" htmlFor="bulk-category">
              New category
            </label>
            <input
              id="bulk-category"
              className="input"
              list="bulk-category-options"
              autoComplete="off"
              autoFocus
              placeholder="e.g. Dresses (leave empty for none)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <datalist id="bulk-category-options">
              {allCategories.map((c) => (
                <option key={c.key} value={c.label} />
              ))}
            </datalist>
            {newCategory.trim() &&
              matchCategory(newCategory, allCategories) !==
                newCategory.trim() && (
                <p className="mt-1.5 text-xs text-muted">
                  Will be saved as{" "}
                  <span className="font-medium text-ink">
                    “{matchCategory(newCategory, allCategories)}”
                  </span>{" "}
                  to match your existing category.
                </p>
              )}
            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary flex-1">
                Save
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setCategoryDialog(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {audienceDialog && (
        <Dialog
          title={`Who ${picked.length === 1 ? "is this item" : `are ${plural(picked.length, "item")}`} for?`}
          onClose={() => setAudienceDialog(false)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBulkAudiences();
            }}
          >
            <p className="mt-2 text-sm text-muted">
              Pick more than one for unisex items. Leave all off to clear it.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {AUDIENCES.map((a) => {
                const on = newAudiences.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setNewAudiences((xs) =>
                        on ? xs.filter((x) => x !== a) : [...xs, a],
                      )
                    }
                    className={`min-h-11 rounded-xl border text-sm font-medium transition active:scale-95 ${
                      on
                        ? "border-brand bg-brand text-white shadow-sm shadow-brand/20"
                        : "border-line bg-surface text-muted hover:border-brand hover:text-ink"
                    }`}
                  >
                    {AUDIENCE_LABEL[a]}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="btn-primary flex-1">
                Save
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setAudienceDialog(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

/** Centered on larger screens, docked to the bottom on phones. Closes on Escape or a tap outside. */
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="font-display text-xl">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

// Text colors chosen to stay readable on the white card (all above 4.5:1 contrast).
const STOCK_TONE = {
  red: { text: "text-red-700", label: "Very low stock" },
  orange: { text: "text-orange-700", label: "Getting low" },
  green: { text: "text-emerald-700", label: "Ready to sell" },
} as const;

/** Total units in stock: 0–4 red, 5–10 orange, 11 and up green. */
function stockTone(units: number): keyof typeof STOCK_TONE {
  if (units <= 4) return "red";
  if (units <= 10) return "orange";
  return "green";
}

/** A stock status line in its status color. */
function StockLabel({
  tone,
  children,
}: {
  tone: keyof typeof STOCK_TONE;
  children: ReactNode;
}) {
  return (
    <span className={`font-medium ${STOCK_TONE[tone].text}`}>{children}</span>
  );
}

/** One number on the Overview row. With `to` or `onClick` the whole card is a shortcut. */
function StatCard({
  label,
  value,
  note,
  loading,
  highlight = false,
  to,
  onClick,
}: {
  label: string;
  value: number | string;
  note: ReactNode;
  loading: boolean;
  highlight?: boolean;
  to?: string;
  onClick?: () => void;
}) {
  const shown = typeof value === "number" ? value.toLocaleString() : value;
  const interactive = Boolean(to || onClick);
  const className = `block min-w-0 rounded-2xl border border-line bg-surface p-4 text-left md:p-5 ${
    interactive
      ? "transition hover:border-brand hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      : ""
  }`;
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      {loading ? (
        <>
          <Bone className="mt-2 h-8 w-20" />
          <Bone className="mt-2 h-3 w-4/5" />
        </>
      ) : (
        <>
          {/* Long amounts wrap instead of spilling out of the card. */}
          <p
            className={`mt-1 font-display text-2xl leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-3xl xl:text-4xl ${highlight ? "text-brand-ink" : ""}`}
          >
            {shown}
          </p>
          <p
            className={`mt-1 text-xs leading-snug ${interactive ? "text-brand-ink" : "text-muted"}`}
          >
            {note}
            {interactive && <span aria-hidden> →</span>}
          </p>
        </>
      )}
    </>
  );
  if (to)
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  return <div className={className}>{body}</div>;
}
