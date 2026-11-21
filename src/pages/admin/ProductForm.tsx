import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage } from '../../lib/format'
import { deleteImages, imageUrl, uploadImage } from '../../lib/images'
import { createProduct, fetchProduct, updateProduct } from '../../lib/products'
import CountStepper from '../../components/CountStepper'
import { CONDITION_LABEL, hasSizes, NO_SIZE } from '../../lib/types'
import type { Condition, VariantInput } from '../../lib/types'

const MAX_IMAGES = 5

// A photo is either already in storage (path) or picked but not uploaded yet (file).
type Photo = { kind: 'stored'; path: string } | { kind: 'new'; file: File; preview: string }

// `fixed` rows came from a size chip: their label isn't editable, only the stock.
type SizeRow = VariantInput & { fixed?: boolean }

const emptyVariant = (): SizeRow => ({ size: '', stock: 1 })

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
  const [condition, setCondition] = useState<Condition>('new')
  const [soldOut, setSoldOut] = useState(false)
  const [variants, setVariants] = useState<SizeRow[]>([])
  // Items without sizes (accessories) keep a single stock count instead of size rows.
  const [sized, setSized] = useState(true)
  const [plainStock, setPlainStock] = useState(1)
  const [plainId, setPlainId] = useState<string | undefined>(undefined)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [originalPaths, setOriginalPaths] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchProduct(id).then((p) => {
      if (!p) return navigate('/admin', { replace: true })
      setName(p.name)
      setDescription(p.description)
      setPrice(String(p.price))
      setCategory(p.category)
      setCondition(p.condition)
      setSoldOut(p.is_sold_out)
      if (p.product_variants.length && !hasSizes(p.product_variants)) {
        setSized(false)
        setPlainStock(p.product_variants[0].stock)
        setPlainId(p.product_variants[0].id)
      } else {
        setVariants(p.product_variants.map((v) => ({ id: v.id, size: v.size, stock: v.stock, fixed: presetIndex(v.size) !== -1 })))
      }
      setPhotos(p.image_paths.map((path) => ({ kind: 'stored', path })))
      setOriginalPaths(p.image_paths)
      setLoading(false)
    })
  }, [id, navigate])

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

  const hasSize = (size: string) => variants.some((v) => presetIndex(v.size) === presetIndex(size))

  const togglePreset = (size: string) =>
    setVariants((vs) =>
      vs.some((v) => presetIndex(v.size) === presetIndex(size))
        ? vs.filter((v) => presetIndex(v.size) !== presetIndex(size))
        : orderSizes([...vs, { size, stock: 1, fixed: true }]),
    )

  const updateVariant = (i: number, patch: Partial<VariantInput>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)))

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required'
    const n = Number(price)
    if (!price || Number.isNaN(n) || n < 0) return 'Enter a valid price'
    if (!sized) return plainStock >= 0 && Number.isInteger(plainStock) ? null : 'Stock must be 0 or more'
    if (variants.length === 0) return 'Add at least one size, or choose "Accessories"'
    if (variants.some((v) => v.size.trim().toLowerCase() === NO_SIZE.toLowerCase()))
      return `"${NO_SIZE}" is reserved. Choose "Accessories" instead.`
    const sizes = variants.map((v) => v.size.trim().toLowerCase())
    if (sizes.some((s) => !s)) return 'Every size row needs a name (e.g. S, M, Free size)'
    if (new Set(sizes).size !== sizes.length) return 'Sizes must be unique'
    if (variants.some((v) => !Number.isInteger(v.stock) || v.stock < 0)) return 'Stock must be 0 or more'
    return null
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError(null)
    setSaving(true)

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
        }
      }
      const input = {
        name,
        description,
        price: Number(price),
        category,
        condition,
        is_sold_out: soldOut,
        image_paths: paths,
        variants: sized
          ? variants.map((v) => ({ ...v, stock: Number(v.stock) }))
          : [{ id: plainId, size: NO_SIZE, stock: plainStock }],
      }
      if (id) await updateProduct(id, input)
      else await createProduct(input)

      // Photos removed in this edit are deleted from storage now that the save succeeded.
      const removed = originalPaths.filter((p) => !paths.includes(p))
      await deleteImages(removed).catch(() => undefined)
      navigate('/admin')
    } catch (err) {
      await deleteImages(uploaded).catch(() => undefined)
      setError(errorMessage(err, 'Could not save'))
      setSaving(false)
    }
  }

  if (loading) return <p className="py-20 text-center text-muted">Loading…</p>

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link to="/admin" className="text-sm text-muted hover:text-brand-ink">← Items</Link>
        <h1 className="mt-2 font-display text-3xl">{isEdit ? 'Edit item' : 'Add item'}</h1>
      </div>

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="price">Price (₱)</label>
            <input id="price" type="number" min={0} step="0.01" inputMode="decimal" className="input" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <input id="category" className="input" placeholder="e.g. Dresses" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
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
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm font-medium">How many do you have?</span>
              <CountStepper value={plainStock} onChange={setPlainStock} label="stock" />
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted">Tap the sizes you have, then set how many of each.</p>
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
                onClick={() => setVariants((vs) => [...vs, emptyVariant()])}
                className="flex min-h-10 items-center justify-center rounded-full border border-dashed border-line px-4 text-sm text-muted transition hover:border-brand hover:text-brand-ink"
              >
                + Other size
              </button>
            </div>
            {variants.length > 0 && (
              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs font-medium uppercase tracking-wide text-muted">
                <span className="flex-1">Size</span>
                <span className="w-[7.75rem] text-center">Stock</span>
                <span className="w-9" />
              </div>
            )}
            <div className="mt-2 space-y-2">
              {variants.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className="flex items-center gap-2">
                  {v.fixed ? (
                    <span className="flex-1 px-3 py-2 text-sm font-medium">{v.size}</span>
                  ) : (
                    <input className="input flex-1" placeholder="e.g. 28, 7.5, 2–3 yrs" aria-label="Size" value={v.size} maxLength={30} autoFocus={!v.id && !v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} />
                  )}
                  <CountStepper value={v.stock} onChange={(stock) => updateVariant(i, { stock })} label={v.size ? `size ${v.size}` : 'this size'} />
                  <button type="button" className="h-9 w-9 shrink-0 rounded-lg text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-30" aria-label={`Remove size ${v.size}`} onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Photos <span className="text-sm font-normal text-muted">({photos.length}/{MAX_IMAGES}, first is the cover)</span></h2>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.kind === 'stored' ? p.path : p.preview} className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-subtle">
              <img src={p.kind === 'stored' ? imageUrl(p.path) : p.preview} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1">
                {i !== 0 ? <button type="button" className="text-[11px] text-white" onClick={() => makeCover(i)}>Cover</button> : <span />}
                <button type="button" className="text-[11px] text-white" onClick={() => removePhoto(i)} aria-label="Remove photo">Remove</button>
              </div>
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
    </form>
  )
}
