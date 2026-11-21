export default function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-sm leading-relaxed">
      <h1 className="font-display text-2xl">Almost ready</h1>
      <p className="mt-3 text-muted">
        Connect Supabase to load products by setting <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
        <li>
          <strong className="text-ink">On your computer:</strong> copy <code>.env.example</code> to <code>.env</code>, fill
          them in, then restart the dev server.
        </li>
        <li>
          <strong className="text-ink">On Vercel or Netlify:</strong> add them under Environment Variables, then redeploy.
          The site only picks them up on a new deploy.
        </li>
      </ul>
      <p className="mt-3 text-muted">See the README for the full setup.</p>
    </div>
  )
}
