import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageSkeleton } from './Skeletons'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const auth = useAuth()
  if (auth.status === 'loading') return <PageSkeleton />
  if (auth.status === 'signed-out') return <Navigate to="/admin/login" replace />
  if (!auth.isAdmin) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">This account ({auth.session.user.email}) isn't an admin.</p>
        <button className="btn-ghost mt-4" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    )
  }
  return <>{children}</>
}
