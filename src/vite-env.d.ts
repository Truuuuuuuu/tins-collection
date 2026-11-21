/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_FB_PAGE_USERNAME: string
  readonly VITE_FB_PAGE_URL?: string
  readonly VITE_STORE_ADDRESS?: string
  readonly VITE_STORE_COORDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
