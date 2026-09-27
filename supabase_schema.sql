-- =========================================================================
-- SKRIP SQL LENGKAP UNTUK SUPABASE
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Tabel Profil BUMDes
CREATE TABLE IF NOT EXISTS public.profil_bumdes (
  id SERIAL PRIMARY KEY,
  nama_bumdes TEXT NOT NULL DEFAULT 'BUMDes Karya Mandiri',
  alamat TEXT DEFAULT '',
  desa TEXT DEFAULT '',
  kecamatan TEXT DEFAULT '',
  kabupaten TEXT DEFAULT '',
  nomor_sk TEXT DEFAULT '',
  tanggal_pendirian TEXT DEFAULT '',
  unit_usaha TEXT DEFAULT '',
  tahun_buku TEXT DEFAULT '2026',
  terakhir_diperbarui TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Pengurus
CREATE TABLE IF NOT EXISTS public.pengurus (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  periode_mulai TEXT DEFAULT '',
  periode_selesai TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aktif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel Aset Tetap
CREATE TABLE IF NOT EXISTS public.aset_tetap (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kategori TEXT NOT NULL,
  kuantitas INTEGER DEFAULT 1,
  tanggal_perolehan TEXT NOT NULL,
  nilai_perolehan DOUBLE PRECISION DEFAULT 0 NOT NULL,
  kondisi TEXT NOT NULL DEFAULT 'Baik',
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Modal & Kewajiban
CREATE TABLE IF NOT EXISTS public.modal_kewajiban (
  id TEXT PRIMARY KEY,
  jenis TEXT NOT NULL, -- 'Modal' | 'Kewajiban'
  kategori TEXT NOT NULL,
  uraian TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  nilai DOUBLE PRECISION DEFAULT 0 NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aktif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Master Transaksi Kas
CREATE TABLE IF NOT EXISTS public.master_transaksi (
  id SERIAL PRIMARY KEY,
  keterangan TEXT NOT NULL UNIQUE,
  jenis TEXT NOT NULL, -- 'Pemasukan' | 'Pengeluaran'
  metode TEXT NOT NULL DEFAULT 'Nominal',
  kelompok TEXT NOT NULL,
  debit_account TEXT DEFAULT '',
  kredit_account TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel Transaksi Kas (Buku Kas Umum)
CREATE TABLE IF NOT EXISTS public.transaksi_kas (
  id TEXT PRIMARY KEY,
  row_number INTEGER,
  tanggal TEXT NOT NULL,
  keterangan TEXT NOT NULL,
  panen_qty DOUBLE PRECISION,
  jual_qty DOUBLE PRECISION,
  sisa_telur DOUBLE PRECISION,
  qty DOUBLE PRECISION,
  harga_satuan DOUBLE PRECISION,
  total_perhitungan DOUBLE PRECISION,
  ada_penyesuaian BOOLEAN DEFAULT FALSE,
  kas_aktual DOUBLE PRECISION,
  penyesuaian DOUBLE PRECISION,
  nominal_aktual DOUBLE PRECISION NOT NULL DEFAULT 0,
  debit DOUBLE PRECISION NOT NULL DEFAULT 0,
  kredit DOUBLE PRECISION NOT NULL DEFAULT 0,
  saldo_berjalan DOUBLE PRECISION,
  jenis TEXT NOT NULL, -- 'Pemasukan' | 'Pengeluaran'
  tambahan_keterangan TEXT DEFAULT '',
  metode TEXT NOT NULL DEFAULT 'Nominal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel Karyawan
CREATE TABLE IF NOT EXISTS public.karyawan (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabel Payroll Distributions
CREATE TABLE IF NOT EXISTS public.payroll_distributions (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER NOT NULL,
  employee_id TEXT NOT NULL,
  workday DOUBLE PRECISION NOT NULL DEFAULT 0,
  total DOUBLE PRECISION NOT NULL DEFAULT 0,
  rate DOUBLE PRECISION
);

-- 9. Tabel Item Persediaan
CREATE TABLE IF NOT EXISTS public.item_persediaan (
  id SERIAL PRIMARY KEY,
  nama_item TEXT NOT NULL UNIQUE,
  satuan TEXT NOT NULL DEFAULT 'Kg',
  harga_jual_acuan DOUBLE PRECISION NOT NULL DEFAULT 0,
  saldo_qty DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabel Log Produksi / Panen
CREATE TABLE IF NOT EXISTS public.log_produksi (
  id SERIAL PRIMARY KEY,
  no_produksi INTEGER NOT NULL,
  tanggal TEXT NOT NULL,
  gabah_diproses DOUBLE PRECISION NOT NULL DEFAULT 0,
  outputs_json TEXT NOT NULL DEFAULT '[]',
  susut DOUBLE PRECISION NOT NULL DEFAULT 0,
  keterangan TEXT DEFAULT '',
  populasi_ayam DOUBLE PRECISION,
  pakan_konsumsi DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Tabel Stock Opname (Tutup Buku)
CREATE TABLE IF NOT EXISTS public.stock_opname (
  id SERIAL PRIMARY KEY,
  bulan TEXT NOT NULL,
  nama_item TEXT NOT NULL,
  saldo_awal_qty DOUBLE PRECISION DEFAULT 0,
  saldo_awal_nilai DOUBLE PRECISION DEFAULT 0,
  masuk_qty DOUBLE PRECISION DEFAULT 0,
  masuk_nilai DOUBLE PRECISION DEFAULT 0,
  keluar_qty DOUBLE PRECISION DEFAULT 0,
  saldo_akhir_sistem_qty DOUBLE PRECISION DEFAULT 0,
  saldo_akhir_fisik_qty DOUBLE PRECISION DEFAULT 0,
  selisih_qty DOUBLE PRECISION DEFAULT 0,
  hpp_per_unit DOUBLE PRECISION DEFAULT 0,
  saldo_akhir_nilai DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tabel Pengaturan Aplikasi (App Settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS) & POLICY
-- =========================================================================
ALTER TABLE public.profil_bumdes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengurus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aset_tetap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modal_kewajiban ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_kas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_persediaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_produksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Buat policy akses publik (read & write)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'profil_bumdes', 'pengurus', 'aset_tetap', 'modal_kewajiban',
      'master_transaksi', 'transaksi_kas', 'karyawan', 'payroll_distributions',
      'item_persediaan', 'log_produksi', 'stock_opname', 'app_settings'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Public access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;
