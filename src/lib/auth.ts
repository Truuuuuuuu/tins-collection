import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type AuthState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; session: Session; isAdmin: boolean }

async function checkAdmin(session: Session): Promise<boolean> {
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
  return Boolean(data)
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    const apply = async (session: Session | null) => {
      if (!session) return active && setState({ status: 'signed-out' })
      const isAdmin = await checkAdmin(session)
      if (active) setState({ status: 'signed-in', session, isAdmin })
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: Supabase warns against awaiting other calls inside this callback.
      setTimeout(() => apply(session), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}
