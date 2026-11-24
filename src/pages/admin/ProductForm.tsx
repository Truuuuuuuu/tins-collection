import { useEffect, useRef, useState } from 'react'
import type { FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage } from '../../lib/format'
import { deleteImages, imageUrl, uploadImage } from '../../lib/images'
import { createProduct, fetchProduct, fetchProducts, updateProduct } from '../../lib/products'
import type { CategoryOption } from '../../lib/categories'
import { categoryOptions, matchCategory } from '../../lib/categories'
import BackButton from '../../components/BackButton'
import ColorSwatch from '../../components/ColorSwatch'
import CountStepper from '../../components/CountStepper'
import { ProductFormSkeleton } from '../../components/Skeletons'
import { PRESET_COLORS, presetColor } from '../../lib/colors'
import { AUDIENCE_LABEL, AUDIENCES, CONDITION_LABEL, hasSizes, NO_SIZE } from '../../lib/types'
import type { Audience, Condition, VariantInput } from '../../lib/types'

const MAX_IMAGES = 5

// A photo is either already in storage (path) or picked but not uploaded yet (file).
// `colorKey` tags it with one of the item's colors, so shoppers see it when they pick that color.
type Photo = ({ kind: 'stored'; path: string } | { kind: 'new'; file: File; preview: string }) & { colorKey?: string }

// `key` identifies a row while editing (stock per color is stored against it).
// `fixed` rows came from a size chip: their label isn't editable, only the stock.
// `priceText` is the size's own price as typed (only used with "Different price per size").
type SizeRow = VariantInput & { key: string; fixed?: boolean; priceText?: string }

// A color while editing. `custom` colors were typed in, so their name and swatch can be changed.
type ColorRow = { key: string; id?: string; name: string; hex: string | null; custom?: boolean }

// The stock of one size in one color. `id` is the saved stock row, when there is one.
type Cell = { id?: string; stock: number }

let keySeq = 0
const newKey = () => `k${++keySeq}`

/** Accessories have no size rows; their per-color stock is stored under this size key. */
const PLAIN = 'plain'
const cellKey = (colorKey: string, sizeKey: string) => `${colorKey}|${sizeKey}`
/** New sizes and colors start at 1 of each, like a new size does without colors. */
const DEFAULT_CELL: Cell = { stock: 1 }

const emptyVariant = (): SizeRow => ({ key: newKey(), size: '', stock: 1 })

// Common sizes the admin can tap instead of typing. Order here is the order shoppers see.
const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free size']
const presetIndex = (size: string) =>
  PRESET_SIZES.findIndex((p) => p.toLowerCase() === size.trim().toLowerCase())

/** Preset sizes in their natural order (XS → XXL), custom sizes after them as entered. */
const orderSizes = (vs: SizeRow[]) =>
  vs
    .map((v, i) => ({ v, i, p: presetIndex(v.size) }))
    .sort((a, b) => (a.p === -1 ? 99 : a.p) - (b.p === -1 ? 99 : b.p) || a.i - b.i)
    .map((x) => x.v)

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  // Categories already in use, so typing "pants" reuses the existing "Pants".
  const [knownCategories, setKnownCategories] = useState<CategoryOption[]>([])
  // Men, women and/or kids; pick several for unisex items.
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [condition, setCondition] = useState<Condition>('new')
  const [soldOut, setSoldOut] = useState(false)
  const [variants, setVariants] = useState<SizeRow[]>([])
  // Items without sizes (accessories) keep a single stock count instead of size rows.
  const [sized, setSized] = useState(true)
  // Off: every size costs the item price. On: each size row gets its own price box.
  const [sizePricing, setSizePricing] = useState(false)
  const [plainStock, setPlainStock] = useState(1)
  const [plainMeasurements, setPlainMeasurements] = useState('')
  const [plainId, setPlainId] = useState<string | undefined>(undefined)
  // Colors are optional. With colors, every size (or the single accessory stock) is counted per color.
  const [colors, setColors] = useState<ColorRow[]>([])
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [customColor, setCustomColor] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [originalPaths, setOriginalPaths] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  // What the save button says while working, and how far along it is (0–1).
  const [step, setStep] = useState<{ label: string; progress: number }>({ label: '', progress: 0 })
  // Brief "Saved!" moment before heading back to the item list.
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Loaded once; saving waits for it so a quick save still reuses the existing spelling.
  const categoriesLoad = useRef<Promise<CategoryOption[]> | null>(null)
  useEffect(() => {
    categoriesLoad.current = fetchProducts()
      .then((ps) => categoryOptions(ps.map((p) => p.category)))
      .catch(() => [])
    categoriesLoad.current.then(setKnownCategories)
  }, [])

  useEffect(() => {
    if (!id) return
    fetchProduct(id).then((p) => {
      if (!p) return navigate('/admin', { replace: true })
      setName(p.name)
      setDescription(p.description)
      setPrice(String(p.price))
      setCategory(p.category)
      setAudiences(p.audiences)
      setCondition(p.condition)
      setSoldOut(p.is_sold_out)
      setColors(p.product_colors.map((c) => ({ key: c.id, id: c.id, name: c.name, hex: c.hex, custom: !presetColor(c.name) })))
      const loaded: Record<string, Cell> = {}
      if (p.product_variants.length && !hasSizes(p.product_variants)) {
        setSized(false)
        setPlainMeasurements(p.product_variants[0].measurements)
        for (const v of p.product_variants) {
          if (v.color_id) loaded[cellKey(v.color_id, PLAIN)] = { id: v.id, stock: v.stock }
          else {
            setPlainStock(v.stock)
            setPlainId(v.id)
          }
        }
        for (const c of p.product_colors) loaded[cellKey(c.id, PLAIN)] ??= { stock: 0 }
      } else {
        // With colors there's a stock row per color and size; the size list is each size once.
        const rows: SizeRow[] = []
        for (const v of p.product_variants) {
          let row = rows.find((r) => r.size === v.size)
          if (!row) {
            row = {
              key: newKey(),
              size: v.size,
              stock: 1,
              measurements: v.measurements,
              priceText: String(v.price ?? p.price),
              fixed: presetIndex(v.size) !== -1,
            }
            rows.push(row)
          }
          if (v.color_id) loaded[cellKey(v.color_id, row.key)] = { id: v.id, stock: v.stock }
          else Object.assign(row, { id: v.id, stock: v.stock })
        }
        // A size missing from a color counts as none of that color.
        for (const c of p.product_colors) for (const r of rows) loaded[cellKey(c.id, r.key)] ??= { stock: 0 }
        setVariants(rows)
        // Turn the switch on when any size already has its own price.
        setSizePricing(p.product_variants.some((v) => v.price !== null && v.price !== p.price))
      }
      setCells(loaded)
      setPhotos(
        p.image_paths.map((path) => ({
          kind: 'stored',
          path,
          colorKey: p.product_colors.find((c) => c.image_paths.includes(path))?.id,
        })),
      )
      setOriginalPaths(p.image_paths)
      setLoading(false)
    })
  }, [id, navigate])

  // The page behind the saving overlay stays put.
  useEffect(() => {
    if (!saving) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [saving])

  // Free preview blob URLs when leaving the page.
  useEffect(
    () => () => photos.forEach((p) => p.kind === 'new' && URL.revokeObjectURL(p.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const room = MAX_IMAGES - photos.length
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
    setPhotos((ps) => [...ps, ...picked.map((file) => ({ kind: 'new' as const, file, preview: URL.createObjectURL(file) }))])
  }

  const removePhoto = (i: number) =>
    setPhotos((ps) => {
      const p = ps[i]
      if (p.kind === 'new') URL.revokeObjectURL(p.preview)
      return ps.filter((_, j) => j !== i)
    })

  const makeCover = (i: number) => setPhotos((ps) => [ps[i], ...ps.filter((_, j) => j !== i)])

  // ---- Reorder photos by dragging the handle (mouse or finger), or with the arrow keys ----
  const [dragging, setDragging] = useState<number | null>(null)
  const movePhoto = (from: number, to: number) =>
    setPhotos((ps) => {
      if (to < 0 || to >= ps.length || from === to) return ps
      const next = [...ps]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  const onHandleDown = (e: ReactPointerEvent, i: number) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Capture can fail for synthetic pointers; dragging still works while over the handle.
    }
    setDragging(i)
  }
  const onHandleMove = (e: ReactPointerEvent) => {
    if (dragging === null) return
    // Which photo tile is under the pointer right now?
    const tile = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-photo-index]')
    const over = tile ? Number(tile.dataset.photoIndex) : dragging
    if (over !== dragging) {
      movePhoto(dragging, over)
      setDragging(over)
    }
  }
  const onHandleUp = () => setDragging(null)

  const hasSize = (size: string) => variants.some((v) => presetIndex(v.size) === presetIndex(size))

  const togglePreset = (size: string) =>
    setVariants((vs) =>
      vs.some((v) => presetIndex(v.size) === presetIndex(size))
        ? vs.filter((v) => presetIndex(v.size) !== presetIndex(size))
        : orderSizes([...vs, { key: newKey(), size, stock: 1, fixed: true, priceText: price }]),
    )

  // ---- Colors ----
  const cellOf = (colorKey: string, sizeKey: string): Cell => cells[cellKey(colorKey, sizeKey)] ?? DEFAULT_CELL
  const setCellStock = (colorKey: string, sizeKey: string, stock: number) =>
    setCells((cs) => ({ ...cs, [cellKey(colorKey, sizeKey)]: { ...(cs[cellKey(colorKey, sizeKey)] ?? DEFAULT_CELL), stock } }))
  const hasColor = (name: string) => colors.some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase())

  const addColor = (name: string, hex: string | null, custom = false) => {
    const key = newKey()
    if (colors.length === 0) {
      // The first color takes over the stock counted so far (and its saved rows).
      const carried: Record<string, Cell> = { [cellKey(key, PLAIN)]: { id: plainId, stock: plainStock } }
      for (const v of variants) carried[cellKey(key, v.key)] = { id: v.id, stock: v.stock }
      setCells((cs) => ({ ...cs, ...carried }))
      setVariants((vs) => vs.map((v) => ({ ...v, id: undefined })))
      setPlainId(undefined)
    }
    setColors((cs) => [...cs, { key, name, hex, custom }])
  }

  const removeColor = (key: string) => {
    if (colors.length === 1) {
      // Back to no colors: keep the last color's counts as the item's stock.
      setVariants((vs) => vs.map((v) => ({ ...v, stock: cellOf(key, v.key).stock })))
      setPlainStock(cellOf(key, PLAIN).stock)
    }
    setColors((cs) => cs.filter((c) => c.key !== key))
    setPhotos((ps) => ps.map((p) => (p.colorKey === key ? { ...p, colorKey: undefined } : p)))
  }

  const togglePresetColor = (preset: { name: string; hex: string }) => {
    const existing = colors.find((c) => c.name.trim().toLowerCase() === preset.name.toLowerCase())
    if (existing) removeColor(existing.key)
    else addColor(preset.name, preset.hex)
  }

  const addCustomColor = () => {
    const name = customColor.trim()
    if (!name) return
    if (hasColor(name)) return setError(`"${name}" is already added`)
    const preset = presetColor(name)
    addColor(preset?.name ?? name, preset?.hex ?? null, !preset)
    setCustomColor('')
    setError(null)
  }

  const updateColor = (key: string, patch: Partial<ColorRow>) =>
    setColors((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)))

  const updateVariant = (i: number, patch: Partial<VariantInput>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)))

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required'
    const n = Number(price)
    if (!price || Number.isNaN(n) || n < 0) return 'Enter a valid price'
    const colorNames = colors.map((c) => c.name.trim().toLowerCase())
    if (colorNames.some((c) => !c)) return 'Every color needs a name'
    if (colorNames.some((c) => c.length > 40)) return 'Color names can be up to 40 characters'
    if (new Set(colorNames).size !== colorNames.length) return 'Colors must be unique'
    if (!sized) return plainStock >= 0 && Number.isInteger(plainStock) ? null : 'Stock must be 0 or more'
    if (variants.length === 0) return 'Add at least one size, or choose "Accessories"'
    if (variants.some((v) => v.size.trim().toLowerCase() === NO_SIZE.toLowerCase()))
      return `"${NO_SIZE}" is reserved. Choose "Accessories" instead.`
    const sizes = variants.map((v) => v.size.trim().toLowerCase())
    if (sizes.some((s) => !s)) return 'Every size row needs a name (e.g. S, M, Free size)'
    if (new Set(sizes).size !== sizes.length) return 'Sizes must be unique'
    if (variants.some((v) => !Number.isInteger(v.stock) || v.stock < 0)) return 'Stock must be 0 or more'
    if (sizePricing) {
      const bad = variants.find((v) => {
        const t = (v.priceText ?? '').trim()
        return t !== '' && (Number.isNaN(Number(t)) || Number(t) < 0)
      })
      if (bad) return `Enter a valid price for size ${bad.size || '(unnamed)'}`
    }
    return null
  }

  /**
   * The price to save for a size: null means "same as the item", so a later change to the item
   * price carries over. Only sizes with a different price store their own.
   */
  const savedSizePrice = (v: SizeRow): number | null => {
    if (!sizePricing) return null
    const t = (v.priceText ?? '').trim()
    if (t === '' || Number(t) === Number(price)) return null
    return Number(t)
  }

  const toggleSizePricing = (on: boolean) => {
    setSizePricing(on)
    // Start every empty price box at the item price, ready to adjust.
    if (on) setVariants((vs) => vs.map((v) => ((v.priceText ?? '').trim() ? v : { ...v, priceText: price })))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError(null)
    setSaving(true)
    setSaved(false)
    const newPhotos = photos.filter((p) => p.kind === 'new').length
    // Photos take most of the time, so they get most of the bar; the rest is saving the item.
    const photoShare = newPhotos ? 0.75 : 0
    setStep({ label: newPhotos ? `Uploading photo 1 of ${newPhotos}…` : 'Saving item…', progress: 0.08 })
    const known = (await categoriesLoad.current) ?? knownCategories

    const uploaded: string[] = []
    try {
      // Upload only on save, so cancelled edits never leave orphan files in storage.
      const paths: string[] = []
      for (const p of photos) {
        if (p.kind === 'stored') paths.push(p.path)
        else {
          const path = await uploadImage(p.file)
          uploaded.push(path)
          paths.push(path)
          const done = uploaded.length
          setStep({
            label: done < newPhotos ? `Uploading photo ${done + 1} of ${newPhotos}…` : 'Saving item…',
            progress: 0.08 + photoShare * (done / newPhotos),
          })
        }
      }
      // Which saved photo paths show each color.
      const colorPhotos = (key: string) => paths.filter((_, i) => photos[i].colorKey === key)
      const sizeRows: SizeRow[] = sized
        ? variants
        : [{ key: PLAIN, id: plainId, size: NO_SIZE, stock: plainStock, measurements: plainMeasurements }]
      const sizePriceOf = (v: SizeRow) => (sized ? savedSizePrice(v) : null)
      const input = {
        name,
        description,
        price: Number(price),
        category: matchCategory(category, known),
        audiences,
        condition,
        is_sold_out: soldOut,
        image_paths: paths,
        colors: colors.map((c) => ({ id: c.id, name: c.name.trim(), hex: c.hex, image_paths: colorPhotos(c.key) })),
        // Without colors: one stock row per size. With colors: one per size within each color.
        variants:
          colors.length === 0
            ? sizeRows.map((v) => ({ id: v.id, colorIndex: null, size: v.size, stock: Number(v.stock), measurements: v.measurements, price: sizePriceOf(v) }))
            : colors.flatMap((c, ci) =>
                sizeRows.map((v) => {
                  const cell = cellOf(c.key, v.key)
                  return { id: cell.id, colorIndex: ci, size: v.size, stock: Number(cell.stock), measurements: v.measurements, price: sizePriceOf(v) }
                }),
              ),
      }
      if (!newPhotos) setStep({ label: 'Saving item…', progress: 0.5 })
      const savedId = id ?? (await createProduct(input))
      if (id) await updateProduct(id, input)

      // Photos removed in this edit are deleted from storage now that the save succeeded.
      const removed = originalPaths.filter((p) => !paths.includes(p))
      await deleteImages(removed).catch(() => undefined)
      setStep({ label: 'Saved', progress: 1 })
      setSaved(true)
      // Let the checkmark play, then go back; the list highlights the item that was just saved.
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.setTimeout(
        () => navigate('/admin', { state: { saved: { id: savedId, name: name.trim(), isNew: !isEdit } } }),
        reduceMotion ? 300 : 900,
      )
    } catch (err) {
      await deleteImages(uploaded).catch(() => undefined)
      setError(errorMessage(err, 'Could not save'))
      setSaving(false)
      setStep({ label: '', progress: 0 })
    }
  }

  if (loading) return <ProductFormSkeleton />

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-8">
      <div>
        {/* Same back button as the shop pages; falls back to the item list when opened directly. */}
        <BackButton to="/admin" historyBack />
        <h1 className="mt-4 font-display text-3xl">{isEdit ? 'Edit item' : 'Add item'}</h1>
      </div>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">{sizePricing && sized ? 'Default price (₱)' : 'Price (₱)'}</label>
            <input id="price" type="number" min={0} step="0.01" inputMode="decimal" className="input" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" className="input" placeholder="e.g. Dresses" list="category-options" autoComplete="off" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="category-options">
              {knownCategories.map((c) => <option key={c.key} value={c.label} />)}
            </datalist>
            {category.trim() && matchCategory(category, knownCategories) !== category.trim() && (
              <p className="mt-1.5 text-xs text-muted">
                Will be saved as <span className="font-medium text-ink">“{matchCategory(category, knownCategories)}”</span> to match your existing category.
              </p>
            )}
          </div>
        </div>
        <fieldset>
          <legend className="label">Shop for</legend>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCES.map((a) => {
              const on = audiences.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAudiences((xs) => (on ? xs.filter((x) => x !== a) : [...xs, a]))}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition active:scale-95 ${
                    on ? 'border-brand bg-brand text-white shadow-sm shadow-brand/20' : 'border-line bg-surface text-muted hover:border-brand hover:text-ink'
                  }`}
                >
                  {on && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                  {AUDIENCE_LABEL[a]}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Pick more than one for unisex items. Leave empty if it doesn't apply.</p>
        </fieldset>
        <fieldset>
          <legend className="label">Condition</legend>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-subtle p-1">
            {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
              <label
                key={c}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
                  condition === c ? 'bg-brand text-white shadow-sm shadow-brand/20' : 'text-muted hover:text-ink'
                }`}
              >
                <input type="radio" name="condition" value={c} className="sr-only" checked={condition === c} onChange={() => setCondition(c)} />
                {CONDITION_LABEL[c]}
              </label>
            ))}
          </div>
          {condition === 'preloved' && (
            <p className="mt-2 text-xs text-muted">Tip: mention any wear or flaws in the description so buyers know what to expect.</p>
          )}
        </fieldset>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" rows={4} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-brand" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} />
          Mark as sold out (hides Add to cart, even if there's stock)
        </label>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{sized ? 'Sizes & stock' : 'Stock'}</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-subtle p-1" role="group" aria-label="Item type">
          {[
            { value: true, label: 'Clothing' },
            { value: false, label: 'Accessories' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={sized === o.value}
              onClick={() => setSized(o.value)}
              className={`min-h-11 rounded-lg text-sm font-medium transition ${
                sized === o.value ? 'bg-brand text-white shadow-sm shadow-brand/20' : 'text-muted hover:text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {!sized ? (
          <div className="mt-4">
            <p className="text-sm text-muted">Bags, jewelry and other items without sizes. Shoppers won't see a size picker.</p>
            {colors.length === 0 ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-sm font-medium">How many do you have?</span>
                <CountStepper value={plainStock} onChange={setPlainStock} label="stock" />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">Stock is set per color below.</p>
            )}
            <label className="label mt-4" htmlFor="plain-measurements">Measurements (optional)</label>
            <input id="plain-measurements" className="input" placeholder="e.g. 25 × 18 × 8 cm, strap 120 cm" value={plainMeasurements} maxLength={200} onChange={(e) => setPlainMeasurements(e.target.value)} />
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">
              {colors.length === 0 ? 'Tap the sizes you have, then set how many of each.' : 'Tap the sizes you have. Stock is set per color below.'}
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-subtle px-3 py-2.5">
              <span>
                <span className="block text-sm font-medium">Different price per size</span>
                <span className="block text-xs text-muted">
                  {sizePricing ? 'Each size has its own price box below.' : 'Off: every size costs the price above.'}
                </span>
              </span>
              {/* Switch */}
              <span className="relative inline-flex shrink-0">
                <input type="checkbox" role="switch" className="peer sr-only" checked={sizePricing} onChange={(e) => toggleSizePricing(e.target.checked)} />
                <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Common sizes">
              {PRESET_SIZES.map((size) => {
                const on = hasSize(size)
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePreset(size)}
                    className={`flex min-h-10 min-w-12 items-center justify-center gap-1 rounded-full border px-4 text-sm font-medium transition active:scale-95 ${
                      on ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand-ink'
                    }`}
                  >
                    {on && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                    {size}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setVariants((vs) => [...vs, { ...emptyVariant(), priceText: price }])}
                className="flex min-h-10 items-center justify-center rounded-full border border-dashed border-line px-4 text-sm text-muted transition hover:border-brand hover:text-brand-ink"
              >
                + Other size
              </button>
            </div>
            {variants.length > 0 && (
              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs font-medium uppercase tracking-wide text-muted">
                <span className="flex-1">Size</span>
                {colors.length === 0 && <span className="w-[7.75rem] text-center">Stock</span>}
                <span className="w-9" />
              </div>
            )}
            <div className="mt-2 space-y-3">
              {variants.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {v.fixed ? (
                      <span className="flex-1 px-3 py-2 text-sm font-medium">{v.size}</span>
                    ) : (
                      <input className="input flex-1" placeholder="e.g. 28, 7.5, 2–3 yrs" aria-label="Size" value={v.size} maxLength={30} autoFocus={!v.id && !v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                    )}
                    {colors.length === 0 && (
                      <CountStepper value={v.stock} onChange={(stock) => updateVariant(i, { stock })} label={v.size ? `size ${v.size}` : 'this size'} />
                    )}
                    <button type="button" className="h-9 w-9 shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label={`Remove size ${v.size}`} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>✕</button>
                  </div>
                  <div className="flex gap-2">
                    {sizePricing && (
                      <label className="relative w-28 shrink-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">₱</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          className="input h-9 pl-6 text-xs"
                          placeholder={price || 'Price'}
                          aria-label={`Price for size ${v.size || 'this size'}`}
                          value={v.priceText ?? ''}
                          onChange={(e) => setVariants((vs) => vs.map((x, j) => (j === i ? { ...x, priceText: e.target.value } : x)))}
                        />
                      </label>
                    )}
                    <input
                      className="input h-9 min-w-0 flex-1 text-xs"
                      placeholder={sizePricing ? 'Measurements (optional)' : 'Measurements (optional), e.g. Chest 36in, Length 26in'}
                      aria-label={`Measurements for size ${v.size || 'this size'}`}
                      value={v.measurements ?? ''}
                      maxLength={200}
                      onChange={(e) => updateVariant(i, { measurements: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Colors <span className="text-sm font-normal text-muted">(optional)</span></h2>
        <p className="mt-1 text-sm text-muted">
          {colors.length === 0
            ? 'Add the colors this item comes in. Each color keeps its own stock.'
            : sized
              ? 'Set how many of each size you have in each color. 0 means that size is sold out in that color.'
              : 'Set how many you have in each color.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Common colors">
          {PRESET_COLORS.map((c) => {
            const on = hasColor(c.name)
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={on}
                onClick={() => togglePresetColor(c)}
                className={`flex min-h-10 items-center gap-2 rounded-full border py-1 pl-1.5 pr-3.5 text-sm font-medium transition active:scale-95 ${
                  on ? 'border-brand bg-brand text-white' : 'border-line bg-surface hover:border-brand hover:text-brand-ink'
                }`}
              >
                <ColorSwatch hex={c.hex} size={22} className={on ? 'ring-white/60' : ''} />
                {c.name}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="input h-10 flex-1"
            placeholder="Other color, e.g. Dusty rose"
            aria-label="Other color name"
            value={customColor}
            maxLength={40}
            onChange={(e) => setCustomColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustomColor()
              }
            }}
          />
          <button type="button" className="btn-ghost h-10 shrink-0 px-4" onClick={addCustomColor} disabled={!customColor.trim()}>
            Add color
          </button>
        </div>

        {colors.length > 0 && (
          <div className="mt-5 space-y-3">
            {colors.map((c) => {
              const sizeRows = sized ? variants : [{ key: PLAIN, size: NO_SIZE }]
              const total = sizeRows.reduce((n, v) => n + cellOf(c.key, v.key).stock, 0)
              return (
                <div key={c.key} className="rounded-xl border border-line bg-subtle p-3">
                  <div className="flex items-center gap-2">
                    {c.custom ? (
                      // Custom colors: tap the dot to pick a swatch.
                      <label className="relative cursor-pointer" title="Pick a swatch color">
                        <ColorSwatch hex={c.hex} size={26} />
                        <input
                          type="color"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label={`Swatch color for ${c.name || 'this color'}`}
                          value={c.hex ?? '#cccccc'}
                          onChange={(e) => updateColor(c.key, { hex: e.target.value })}
                        />
                      </label>
                    ) : (
                      <ColorSwatch hex={c.hex} size={26} />
                    )}
                    {c.custom ? (
                      <input
                        className="input h-9 min-w-0 flex-1 text-sm font-medium"
                        aria-label="Color name"
                        value={c.name}
                        maxLength={40}
                        onChange={(e) => updateColor(c.key, { name: e.target.value })}
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                    )}
                    <span className={`shrink-0 text-xs ${total === 0 ? 'font-medium text-red-700' : 'text-muted'}`}>
                      {total === 0 ? 'Sold out' : `${total} in stock`}
                    </span>
                    <button
                      type="button"
                      className="h-9 w-9 shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove color ${c.name}`}
                      onClick={() => removeColor(c.key)}
                    >
                      ✕
                    </button>
                  </div>
                  {sized && variants.length === 0 ? (
                    <p className="mt-2 text-xs text-muted">Add sizes above to set stock for this color.</p>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {sizeRows.map((v) => (
                        <div key={v.key} className="flex items-center justify-between gap-3 rounded-lg bg-surface py-1.5 pl-3 pr-1.5">
                          <span className="text-sm">{sized ? v.size || <span className="text-muted">(unnamed size)</span> : 'How many?'}</span>
                          <CountStepper
                            value={cellOf(c.key, v.key).stock}
                            onChange={(n) => setCellStock(c.key, v.key, n)}
                            label={sized ? `${c.name} size ${v.size}` : `${c.name} stock`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Photos <span className="text-sm font-normal text-muted">({photos.length}/{MAX_IMAGES}, first is the cover)</span></h2>
        </div>
        {photos.length > 1 && <p className="mt-1 text-xs text-muted">Drag the ⠿ handle to change the order.</p>}
        {colors.length > 0 && photos.length > 0 && (
          <p className="mt-1 text-xs text-muted">Pick a color under a photo so shoppers see it when they choose that color.</p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.kind === 'stored' ? p.path : p.preview} data-photo-index={i}>
            <div
              className={`group relative aspect-[4/5] overflow-hidden rounded-lg bg-subtle transition ${dragging === i ? 'z-10 scale-105 shadow-lg ring-2 ring-brand' : ''}`}
            >
              <img src={p.kind === 'stored' ? imageUrl(p.path) : p.preview} alt="" className="pointer-events-none h-full w-full select-none object-cover" draggable={false} />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
              {photos.length > 1 && (
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-md bg-white/90 text-ink shadow-sm active:cursor-grabbing"
                  aria-label={`Move photo ${i + 1}. Use the left and right arrow keys.`}
                  onPointerDown={(e) => onHandleDown(e, i)}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                      e.preventDefault()
                      movePhoto(i, i + (e.key === 'ArrowLeft' ? -1 : 1))
                    }
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                  </svg>
                </button>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                {i !== 0 ? <button type="button" className="text-[11px] text-white" onClick={() => makeCover(i)}>Cover</button> : <span />}
                <button type="button" className="text-[11px] text-white" onClick={() => removePhoto(i)} aria-label="Remove photo">Remove</button>
              </div>
            </div>
            {colors.length > 0 && (
              <select
                className="mt-1.5 h-8 w-full rounded-md border border-line bg-surface px-1.5 text-[11px]"
                aria-label={`Color shown in photo ${i + 1}`}
                value={p.colorKey && colors.some((c) => c.key === p.colorKey) ? p.colorKey : ''}
                onChange={(e) => setPhotos((ps) => ps.map((x, j) => (j === i ? { ...x, colorKey: e.target.value || undefined } : x)))}
              >
                <option value="">All colors</option>
                {colors.map((c) => (
                  <option key={c.key} value={c.key}>{c.name || '(unnamed)'}</option>
                ))}
              </select>
            )}
            </div>
          ))}
          {photos.length < MAX_IMAGES && (
            <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-brand">
              <span className="text-2xl">+</span>
              Add
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
            </label>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">Photos are resized to about 1200px before uploading, to save free storage space.</p>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        <button className="btn-primary flex-1 py-3" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}</button>
        <Link to="/admin" className="btn-ghost py-3">Cancel</Link>
      </div>
      {saving && (
        // Covers the page while saving: the form behind is muted and can't be changed mid-save.
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          role="status"
          aria-live="polite"
        >
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] motion-safe:animate-[sheet-fade_.25s_ease-out_both]" aria-hidden />
          <div className="relative w-full max-w-xs rounded-3xl bg-surface px-6 pb-6 pt-7 text-center shadow-2xl motion-safe:animate-[modal-in_.3s_cubic-bezier(.16,1,.3,1)_both]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center">
              {saved ? (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 motion-safe:animate-[check-pop_.45s_cubic-bezier(.16,1,.3,1)_both]">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12l5 5L20 7" strokeDasharray="24" strokeDashoffset="24" className="motion-safe:animate-[check-draw_.35s_.2s_ease-out_forwards] motion-reduce:[stroke-dashoffset:0]" />
                  </svg>
                </span>
              ) : (
                <svg className="h-14 w-14 animate-spin text-brand motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity=".15" strokeWidth="2.5" />
                  <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <p key={saved ? 'done' : 'saving'} className="mt-4 font-display text-xl motion-safe:animate-[tab-in_.3s_ease-out_both]">
              {saved ? (isEdit ? 'Changes saved!' : 'Item added!') : isEdit ? 'Saving changes' : 'Adding item'}
            </p>
            <p key={step.label} className="mt-1 h-5 text-sm text-muted motion-safe:animate-[tab-in_.25s_ease-out_both]">
              {saved ? 'Taking you back to your items…' : step.label}
            </p>
            {/* Progress, with a soft shimmer so it never looks stuck. */}
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
              <div
                className={`relative h-full overflow-hidden rounded-full transition-[width,background-color] duration-500 ease-out ${saved ? 'bg-emerald-600' : 'bg-brand'}`}
                style={{ width: `${step.progress * 100}%` }}
              >
                {!saved && (
                  <span className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[save-shimmer_1.1s_linear_infinite]" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
