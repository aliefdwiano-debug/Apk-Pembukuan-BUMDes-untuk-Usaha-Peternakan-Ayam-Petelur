import { createClient } from '@supabase/supabase-js';

// Frontend hanya boleh menggunakan URL & anon/publishable key Supabase.
// JANGAN PERNAH menaruh SUPABASE_SERVICE_ROLE_KEY di sini atau di kode frontend manapun.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diatur. ' +
      'Aplikasi akan berjalan dengan data awal (initial data) tanpa koneksi database.'
  );
}
