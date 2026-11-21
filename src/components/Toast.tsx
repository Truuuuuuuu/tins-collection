import { useEffect } from 'react'

export default function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [message, onDone])
  if (!message) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="rounded-full bg-ink px-5 py-3 text-sm text-white shadow-lg">{message}</div>
    </div>
  )
}
