-- =========================================================================
-- SKRIP TAMBAHAN: PASTIKAN ROLE "anon" BISA MENGAKSES TABEL VIA RLS
-- =========================================================================
-- CATATAN:
-- Skrip supabase_schema.sql yang sudah ada SEBELUMNYA sudah membuat policy
-- "Public access policy" (USING (true) WITH CHECK (true)) di seluruh 12
-- tabel, sehingga secara RLS tabel-tabel tersebut memang mengizinkan akses
-- penuh untuk role apapun -- termasuk anon.
--
-- Yang RLS policy TIDAK atur adalah GRANT (hak akses SQL dasar) ke role
-- "anon" dan "authenticated". Supabase pada proyek baru biasanya sudah
-- meng-grant otomatis, tapi skrip ini disediakan sebagai jaring pengaman
-- agar migrasi ke akses langsung browser (anon key, tanpa service role key
-- lagi di backend) tetap berjalan.
--
-- Silakan review lalu jalankan sendiri di Supabase SQL Editor.
-- Skrip ini AMAN dijalankan berkali-kali (idempotent) dan TIDAK menghapus
-- data maupun tabel apapun.
-- =========================================================================

-- Izinkan role anon & authenticated menggunakan schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Izinkan CRUD (select/insert/update/delete) pada seluruh tabel yang sudah ada
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO anon, authenticated;

-- Izinkan penggunaan sequence (kolom SERIAL/BIGSERIAL, mis. id auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Pastikan tabel yang dibuat di masa depan (jika ada) otomatis mendapat hak
-- akses yang sama, tanpa perlu menjalankan GRANT manual lagi setiap kali.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- =========================================================================
-- Verifikasi cepat (opsional): jalankan query ini untuk memastikan RLS
-- aktif di seluruh 12 tabel BUMDes.
-- =========================================================================
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN (
--   'profil_bumdes', 'pengurus', 'aset_tetap', 'modal_kewajiban',
--   'master_transaksi', 'transaksi_kas', 'karyawan', 'payroll_distributions',
--   'item_persediaan', 'log_produksi', 'stock_opname', 'app_settings'
-- );
