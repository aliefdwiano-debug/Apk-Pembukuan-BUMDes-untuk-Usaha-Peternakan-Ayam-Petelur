export interface BumdesProfil {
  namaBumdes: string;
  alamat: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  nomorSK: string;
  tanggalPendirian: string;
  unitUsaha: string;
  tahunBuku: string;
  gasUrl?: string;
  terakhirDiperbarui?: string;
}

export interface Pengurus {
  id: string;
  nama: string;
  jabatan: string;
  periodeMulai: string;
  periodeSelesai: string;
  status: 'Aktif' | 'Tidak Aktif';
}

export interface AsetTetap {
  id: string;
  nama: string;
  kategori: 'Tanah' | 'Bangunan' | 'Kendaraan' | 'Peralatan' | 'Aset Biologis' | 'Lainnya' | string;
  kuantitas?: number;
  tanggalPerolehan: string;
  nilaiPerolehan: number;
  kondisi: 'Baik' | 'Cukup Baik' | 'Rusak Ringan' | 'Rusak Berat' | string;
  keterangan?: string;
}

export interface ModalKewajiban {
  id: string;
  jenis: 'Modal' | 'Kewajiban';
  kategori: string;
  uraian: string;
  tanggal: string;
  nilai: number;
  status: 'Aktif' | 'Lunas' | 'Tidak Aktif' | string;
}

export interface MasterTransaksi {
  keterangan: string;
  jenis: 'Pemasukan' | 'Pengeluaran';
  metode: 'QtyHarga' | 'Nominal';
  kelompok: string;
  debitAccount?: string;
  kreditAccount?: string;
}

export interface JurnalUmumEntry {
  id: string;
  tanggal: string;
  noBukti: string;
  keteranganKas: string;
  akunDebit: string;
  akunKredit: string;
  nominal: number;
  catatan?: string;
}

export interface TransaksiKas {
  id?: string;
  rowNumber?: number;
  tanggal: string; // yyyy-MM-dd
  keterangan: string;
  panenQty?: number | ''; // JUMLAH Telur yang dipanen (Kg)
  jualQty?: number | ''; // Jual Telur (Kg)
  sisaTelur?: number; // sisa telur setelah penjualan (Kg)
  qty?: number | '';
  hargaSatuan?: number | '';
  totalPerhitungan?: number | '';
  adaPenyesuaian?: boolean;
  kasAktual?: number;
  penyesuaian?: number | '';
  nominalAktual: number;
  debit: number;
  kredit: number;
  saldoBerjalan?: number;
  jenis: 'Pemasukan' | 'Pengeluaran';
  tambahanKeterangan?: string;
  metode: 'QtyHarga' | 'Nominal';
  isNewKeterangan?: boolean;
}

export interface Karyawan {
  id: string; // e.g. EMP-001
  name: string;
  description: string;
}

export interface PayrollDistribution {
  employeeId: string;
  workday: number;
  total: number;
  rate?: number;
}

export interface PayrollQueueItem {
  id: number; // Row ID in Buku Kas
  tanggal: string;
  keterangan: string;
  nominal: number;
  status: 'empty' | 'warning' | 'error' | 'success';
}

export interface ItemPersediaan {
  namaItem: string;
  satuan: string;
  hargaJualAcuan: number;
  saldoQty: number;
}

export interface OutputProduksi {
  namaItem: string;
  qty: number;
}

export interface LogProduksi {
  noProduksi: number;
  tanggal: string;
  gabahDiproses: number;
  outputs: OutputProduksi[];
  susut: number;
  keterangan: string;
  populasiAyam?: number;
  pakanKonsumsi?: number;
}

export interface StockOpnameEntry {
  bulan: string; // yyyy-MM
  namaItem: string;
  saldoAwalQty: number;
  saldoAwalNilai: number;
  masukQty: number;
  masukNilai: number;
  keluarQty: number;
  saldoAkhirSistemQty: number;
  saldoAkhirFisikQty: number;
  selisihQty: number;
  hppPerUnit: number;
  saldoAkhirNilai: number;
}

export interface ProductHppAllocation {
  namaItem: string;
  qtyDiproduksi: number;
  hargaJualAcuan: number;
  nilaiPasar: number;
  persentaseAlokasi: number; // e.g. 0.758 (75.8%)
  alokasiBiayaBersama: number; // Rp
  hppPerKg: number; // Rp / kg
}

export interface HppBreakdownBulanan {
  bulan: string;
  // Gabah Weighted Average
  gabahAwalQty: number;
  gabahAwalHpp: number;
  gabahAwalNilai: number;
  gabahBeliQty: number;
  gabahBeliNilai: number;
  gabahTotalTersediaQty: number;
  gabahTotalTersediaNilai: number;
  hppGabahWeightedAvg: number;

  // Joint Production
  gabahDiprosesQty: number;
  biayaBahanBakuGabah: number;
  biayaOperasionalGiling: number;
  totalJointCost: number;

  // Output Products Allocation
  totalNilaiPasarOutputs: number;
  allocations: ProductHppAllocation[];
}

export interface RincianSewaGapoktanItem {
  bulan: string;
  label: string;
  qty: number;
  subtotal: number;
}
