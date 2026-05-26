import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createLocalSupabaseClient, type LocalSupabaseClient } from '@/lib/local-supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function isLocalSupabaseMode() {
  return (
    process.env.NEXT_PUBLIC_LOCAL_MODE === 'true' ||
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === 'https://example.supabase.co' ||
    supabaseAnonKey === 'dev-anon-key'
  )
}

// Browser client (for client components)
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!)
}

// Server client (for server components and API routes)
export function createSupabaseServerClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
}

// Singleton for client-side
type BrowserClient = ReturnType<typeof createSupabaseBrowserClient> | LocalSupabaseClient
let browserClient: BrowserClient | null = null
export function getSupabase() {
  if (!browserClient) {
    browserClient = isLocalSupabaseMode()
      ? createLocalSupabaseClient()
      : createSupabaseBrowserClient()
  }
  return browserClient
}
