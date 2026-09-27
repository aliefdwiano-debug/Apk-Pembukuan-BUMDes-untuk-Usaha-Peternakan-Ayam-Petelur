import { pgTable, serial, text, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';

// Users table for Firebase Auth UID synchronization
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Profil BUMDes
export const profilBumdes = pgTable('profil_bumdes', {
  id: serial('id').primaryKey(),
  namaBumdes: text('nama_bumdes').notNull(),
  alamat: text('alamat').default(''),
  desa: text('desa').default(''),
  kecamatan: text('kecamatan').default(''),
  kabupaten: text('kabupaten').default(''),
  nomorSk: text('nomor_sk').default(''),
  tanggalPendirian: text('tanggal_pendirian').default(''),
  unitUsaha: text('unit_usaha').default(''),
  tahunBuku: text('tahun_buku').default(''),
  terakhirDiperbarui: text('terakhir_diperbarui').default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Pengurus BUMDes
export const pengurus = pgTable('pengurus', {
  id: text('id').primaryKey(),
  nama: text('nama').notNull(),
  jabatan: text('jabatan').notNull(),
  periodeMulai: text('periode_mulai').default(''),
  periodeSelesai: text('periode_selesai').default(''),
  status: text('status').notNull().default('Aktif'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Aset Tetap
export const asetTetap = pgTable('aset_tetap', {
  id: text('id').primaryKey(),
  nama: text('nama').notNull(),
  kategori: text('kategori').notNull(),
  kuantitas: integer('kuantitas').default(1),
  tanggalPerolehan: text('tanggal_perolehan').notNull(),
  nilaiPerolehan: doublePrecision('nilai_perolehan').notNull().default(0),
  kondisi: text('kondisi').notNull().default('Baik'),
  keterangan: text('keterangan').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Modal & Kewajiban
export const modalKewajiban = pgTable('modal_kewajiban', {
  id: text('id').primaryKey(),
  jenis: text('jenis').notNull(), // 'Modal' | 'Kewajiban'
  kategori: text('kategori').notNull(),
  uraian: text('uraian').notNull(),
  tanggal: text('tanggal').notNull(),
  nilai: doublePrecision('nilai').notNull().default(0),
  status: text('status').notNull().default('Aktif'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Master Transaksi (Kategori / Jenis)
export const masterTransaksi = pgTable('master_transaksi', {
  id: serial('id').primaryKey(),
  keterangan: text('keterangan').notNull().unique(),
  jenis: text('jenis').notNull(), // 'Pemasukan' | 'Pengeluaran'
  metode: text('metode').notNull().default('Nominal'), // 'QtyHarga' | 'Nominal'
  kelompok: text('kelompok').notNull(),
  debitAccount: text('debit_account').default(''),
  kreditAccount: text('kredit_account').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transaksi Kas (Buku Kas Umum)
export const transaksiKas = pgTable('transaksi_kas', {
  id: text('id').primaryKey(),
  rowNumber: integer('row_number'),
  tanggal: text('tanggal').notNull(),
  keterangan: text('keterangan').notNull(),
  panenQty: doublePrecision('panen_qty'),
  jualQty: doublePrecision('jual_qty'),
  sisaTelur: doublePrecision('sisa_telur'),
  qty: doublePrecision('qty'),
  hargaSatuan: doublePrecision('harga_satuan'),
  totalPerhitungan: doublePrecision('total_perhitungan'),
  adaPenyesuaian: boolean('ada_penyesuaian').default(false),
  kasAktual: doublePrecision('kas_aktual'),
  penyesuaian: doublePrecision('penyesuaian'),
  nominalAktual: doublePrecision('nominal_aktual').notNull().default(0),
  debit: doublePrecision('debit').notNull().default(0),
  kredit: doublePrecision('kredit').notNull().default(0),
  saldoBerjalan: doublePrecision('saldo_berjalan'),
  jenis: text('jenis').notNull(), // 'Pemasukan' | 'Pengeluaran'
  tambahanKeterangan: text('tambahan_keterangan').default(''),
  metode: text('metode').notNull().default('Nominal'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Karyawan
export const karyawan = pgTable('karyawan', {
  id: text('id').primaryKey(), // EMP-001
  name: text('name').notNull(),
  description: text('description').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Payroll Distributions (pembagian gaji per baris kas)
export const payrollDistributions = pgTable('payroll_distributions', {
  id: serial('id').primaryKey(),
  queueId: integer('queue_id').notNull(),
  employeeId: text('employee_id').notNull(),
  workday: doublePrecision('workday').notNull().default(0),
  total: doublePrecision('total').notNull().default(0),
  rate: doublePrecision('rate'),
});

// Item Persediaan (Inventory)
export const itemPersediaan = pgTable('item_persediaan', {
  id: serial('id').primaryKey(),
  namaItem: text('nama_item').notNull().unique(),
  satuan: text('satuan').notNull().default('Kg'),
  hargaJualAcuan: doublePrecision('harga_jual_acuan').notNull().default(0),
  saldoQty: doublePrecision('saldo_qty').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Log Produksi
export const logProduksi = pgTable('log_produksi', {
  id: serial('id').primaryKey(),
  noProduksi: integer('no_produksi').notNull(),
  tanggal: text('tanggal').notNull(),
  gabahDiproses: doublePrecision('gabah_diproses').notNull().default(0),
  outputsJson: text('outputs_json').notNull().default('[]'),
  susut: doublePrecision('susut').notNull().default(0),
  keterangan: text('keterangan').default(''),
  populasiAyam: doublePrecision('populasi_ayam'),
  pakanKonsumsi: doublePrecision('pakan_konsumsi'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Stock Opname
export const stockOpname = pgTable('stock_opname', {
  id: serial('id').primaryKey(),
  bulan: text('bulan').notNull(),
  namaItem: text('nama_item').notNull(),
  saldoAwalQty: doublePrecision('saldo_awal_qty').default(0),
  saldoAwalNilai: doublePrecision('saldo_awal_nilai').default(0),
  masukQty: doublePrecision('masuk_qty').default(0),
  masukNilai: doublePrecision('masuk_nilai').default(0),
  keluarQty: doublePrecision('keluar_qty').default(0),
  saldoAkhirSistemQty: doublePrecision('saldo_akhir_sistem_qty').default(0),
  saldoAkhirFisikQty: doublePrecision('saldo_akhir_fisik_qty').default(0),
  selisihQty: doublePrecision('selisih_qty').default(0),
  hppPerUnit: doublePrecision('hpp_per_unit').default(0),
  saldoAkhirNilai: doublePrecision('saldo_akhir_nilai').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// App Settings (Key-value store for app configuration, sync timestamps, flags)
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
