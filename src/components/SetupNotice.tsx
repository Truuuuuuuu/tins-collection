export default function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-sm leading-relaxed">
      <h1 className="font-display text-2xl">Almost ready</h1>
      <p className="mt-3 text-muted">
        Connect Supabase to load products. Copy <code>.env.example</code> to <code>.env</code>, fill in{' '}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server. See the
        README for the full setup.
      </p>
    </div>
  )
}
