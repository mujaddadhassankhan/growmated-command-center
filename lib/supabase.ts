import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // Intentionally not throwing at import-time in case you render static pages.
  // Pages that need Supabase will show a friendly error.
}

export const supabase = url && key ? createClient(url, key) : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  }
  return supabase
}
