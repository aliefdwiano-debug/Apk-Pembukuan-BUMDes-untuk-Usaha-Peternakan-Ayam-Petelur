# Aplikasi Pembukuan BUMDes (Peternakan Ayam Petelur)

Aplikasi pembukuan digital BUMDes berbasis **React + Vite**, 100% static,
di-hosting di **GitHub Pages**, dan terhubung langsung ke **Supabase**
(PostgreSQL) dari browser menggunakan anon/publishable key.

```
GitHub Repository -> GitHub Actions -> Vite Build -> GitHub Pages
                                                          |
                                                          v
                                      React App --(anon key)--> Supabase PostgreSQL
```

Tidak ada backend/server terpisah (tidak ada Express, tidak ada Node.js
server, tidak ada PostgreSQL lokal).

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
npm run dev
```

## Setup Supabase

1. Buat project di [supabase.com](https://supabase.com/dashboard).
2. Buka **SQL Editor**, jalankan isi `supabase_schema.sql` (12 tabel + RLS
   policy publik).
3. (Opsional, jaring pengaman) Review lalu jalankan `supabase_rls_policies.sql`
   untuk memastikan role `anon` punya hak akses penuh ke seluruh tabel.
4. Ambil **Project URL** dan **anon/public key** dari
   *Project Settings -> API*, masukkan ke `.env` (lokal) atau ke GitHub
   Secrets (untuk deploy).

## Deploy ke GitHub Pages

1. Di repo GitHub: **Settings -> Pages -> Source -> GitHub Actions**.
2. Di repo GitHub: **Settings -> Secrets and variables -> Actions**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push ke branch `main` -> workflow `.github/workflows/deploy.yml` otomatis
   build & deploy.
4. Aplikasi akan tersedia di:
   `https://aliefdwiano-debug.github.io/Apk-Pembukuan-BUMDes-untuk-Usaha-Peternakan-Ayam-Petelur/`

## Build production

```bash
npm run build   # menghasilkan folder dist/
npm run preview # preview hasil build secara lokal
```

## Catatan keamanan

- Frontend hanya pernah menggunakan `VITE_SUPABASE_ANON_KEY`. Service Role
  Key **tidak pernah** disertakan di kode/bundle frontend.
- Akses ditegakkan lewat Row Level Security (RLS) di Supabase, bukan lewat
  backend/middleware.
