import {
  BumdesProfil,
  Pengurus,
  AsetTetap,
  ModalKewajiban,
  MasterTransaksi,
  TransaksiKas,
  Karyawan,
  ItemPersediaan,
  LogProduksi,
  PayrollDistribution
} from '../types';

export const initialProfil: BumdesProfil = {
  namaBumdes: 'BUMDes Karya Mandiri',
  alamat: 'Jl. Pemuda No. 05 Desa Makmur',
  desa: 'Makmur Jaya',
  kecamatan: 'Cawas',
  kabupaten: 'Klaten',
  nomorSK: 'SK-DESA/2022/012',
  tanggalPendirian: '2022-05-10',
  unitUsaha: 'Peternakan Ayam Petelur',
  tahunBuku: '2026',
  terakhirDiperbarui: '08/08/2026 10:00'
};

export const initialPengurus: Pengurus[] = [
  {
    id: 'PGR-001',
    nama: 'Bambang Sutrisno',
    jabatan: 'Direktur BUMDes',
    periodeMulai: '2024',
    periodeSelesai: '2027',
    status: 'Aktif'
  },
  {
    id: 'PGR-002',
    nama: 'Sri Handayani',
    jabatan: 'Bendahara',
    periodeMulai: '2024',
    periodeSelesai: '2027',
    status: 'Aktif'
  },
  {
    id: 'PGR-003',
    nama: 'Eko Prasetyo',
    jabatan: 'Sekretaris',
    periodeMulai: '2024',
    periodeSelesai: '2027',
    status: 'Aktif'
  },
  {
    id: 'PGR-004',
    nama: 'Agus Wijaya',
    jabatan: 'Kepala Unit Peternakan Telur',
    periodeMulai: '2024',
    periodeSelesai: '2027',
    status: 'Aktif'
  }
];

export const initialAset: AsetTetap[] = [
  {
    id: 'AST-001',
    nama: 'Kandang Ayam Petelur Kategori Baterai (Kapasitas 1000 Ekor)',
    kategori: 'Bangunan',
    tanggalPerolehan: '2022-06-15',
    nilaiPerolehan: 120000000,
    kondisi: 'Baik',
    keterangan: 'Lokasi Blok A Kandang Desa'
  },
  {
    id: 'AST-002',
    nama: 'Populasi Ayam Petelur Produktif',
    kategori: 'Aset Biologis',
    kuantitas: 950,
    tanggalPerolehan: '2023-01-10',
    nilaiPerolehan: 66500000,
    kondisi: 'Baik',
    keterangan: 'Umur produktif bertelur'
  },
  {
    id: 'AST-003',
    nama: 'Timbangan Digital Duduk & Tray Egg Crate',
    kategori: 'Peralatan',
    tanggalPerolehan: '2023-02-01',
    nilaiPerolehan: 3800000,
    kondisi: 'Baik',
    keterangan: 'Kapasitas timbang 50kg'
  },
  {
    id: 'AST-004',
    nama: 'Motor Tiga Roda Viar Cargo Angkut Telur',
    kategori: 'Kendaraan',
    tanggalPerolehan: '2023-05-20',
    nilaiPerolehan: 28500000,
    kondisi: 'Baik',
    keterangan: 'Armada distribusi telur'
  }
];

export const initialModalKewajiban: ModalKewajiban[] = [
  {
    id: 'MK-001',
    jenis: 'Modal',
    kategori: 'Modal Awal',
    uraian: 'Penyertaan Modal Desa Unit Peternakan Ayam Petelur',
    tanggal: '2022-05-15',
    nilai: 180000000,
    status: 'Aktif'
  },
  {
    id: 'MK-002',
    jenis: 'Modal',
    kategori: 'Modal Tambahan',
    uraian: 'Pengembangan Populasi Ayam & Pakan 2024',
    tanggal: '2024-02-10',
    nilai: 40000000,
    status: 'Aktif'
  }
];

export const initialMasterTransaksi: MasterTransaksi[] = [
  { keterangan: 'Jual Telur', jenis: 'Pemasukan', metode: 'QtyHarga', kelompok: 'Penjualan', debitAccount: 'Kas', kreditAccount: 'Penjualan telur' },
  { keterangan: 'Beli pakan', jenis: 'Pengeluaran', metode: 'QtyHarga', kelompok: 'Persediaan', debitAccount: 'Persediaan pakan', kreditAccount: 'Kas' },
  { keterangan: 'Beli pulsa listrik', jenis: 'Pengeluaran', metode: 'Nominal', kelompok: 'Biaya', debitAccount: 'Biaya produksi', kreditAccount: 'Kas' },
  { keterangan: 'Beli vitamin', jenis: 'Pengeluaran', metode: 'Nominal', kelompok: 'Biaya', debitAccount: 'Biaya produksi', kreditAccount: 'Kas' },
  { keterangan: 'Beli plastik', jenis: 'Pengeluaran', metode: 'Nominal', kelompok: 'Biaya', debitAccount: 'Biaya produksi', kreditAccount: 'Kas' },
  { keterangan: 'Upah Tenaga/ Gaji Karyawan', jenis: 'Pengeluaran', metode: 'Nominal', kelompok: 'Biaya', debitAccount: 'Biaya produksi', kreditAccount: 'Kas' },
  { keterangan: 'Pembelian lain/ biaya lainnya', jenis: 'Pengeluaran', metode: 'Nominal', kelompok: 'Biaya', debitAccount: 'Biaya produksi', kreditAccount: 'Kas' },
  { keterangan: 'Panen Telur', jenis: 'Pemasukan', metode: 'QtyHarga', kelompok: 'Produksi', debitAccount: 'Kas', kreditAccount: 'Penjualan telur' },
  { keterangan: 'Pembelian Ayam', jenis: 'Pengeluaran', metode: 'QtyHarga', kelompok: 'Aset', debitAccount: 'Aset Biologis', kreditAccount: 'Kas' },
  { keterangan: 'Pencatatan Ayam Mati / Dipotong', jenis: 'Pengeluaran', metode: 'QtyHarga', kelompok: 'Biaya', debitAccount: 'Beban Kematian Aset Biologis', kreditAccount: 'Aset Biologis' }
];

export const initialKaryawan: Karyawan[] = [
  { id: 'EMP-001', name: 'Suhardi', description: 'Pengelola Kandang & Pakan' },
  { id: 'EMP-002', name: 'Joko Widodo', description: 'Pemanen & Pembersih Telur' },
  { id: 'EMP-003', name: 'Siti Rochmah', description: 'Penimbangan, Packing & Penjualan' }
];

export const initialItemPersediaan: ItemPersediaan[] = [
  { namaItem: 'Telur Ayam', satuan: 'kg', hargaJualAcuan: 22500, saldoQty: 42.5 },
  { namaItem: 'Pakan Konsentrat Ayam', satuan: 'kg', hargaJualAcuan: 8500, saldoQty: 300 }
];

export const initialTransaksiKas: TransaksiKas[] = [
  {
    id: '101',
    rowNumber: 2,
    tanggal: '2026-08-08',
    keterangan: 'Panen Telur',
    panenQty: 50,
    jualQty: 0,
    sisaTelur: 50,
    qty: 50,
    hargaSatuan: 0,
    totalPerhitungan: 0,
    adaPenyesuaian: false,
    kasAktual: 0,
    penyesuaian: 0,
    nominalAktual: 0,
    debit: 0,
    kredit: 0,
    saldoBerjalan: 750000,
    jenis: 'Pemasukan',
    metode: 'QtyHarga',
    tambahanKeterangan: 'Panen Pagi 50 Kg'
  },
  {
    id: '102',
    rowNumber: 3,
    tanggal: '2026-08-08',
    keterangan: 'Jual Telur',
    panenQty: 0,
    jualQty: 8,
    sisaTelur: 42.5,
    qty: 8,
    hargaSatuan: 22500,
    totalPerhitungan: 180000,
    adaPenyesuaian: false,
    kasAktual: 180000,
    penyesuaian: 0,
    nominalAktual: 180000,
    debit: 180000,
    kredit: 0,
    saldoBerjalan: 930000,
    jenis: 'Pemasukan',
    metode: 'QtyHarga',
    tambahanKeterangan: 'Bu Lurah'
  },
  {
    id: '103',
    rowNumber: 4,
    tanggal: '2026-08-09',
    keterangan: 'Beli pakan',
    panenQty: 0,
    jualQty: 0,
    sisaTelur: 42.5,
    qty: 50,
    hargaSatuan: 7000,
    totalPerhitungan: 350000,
    adaPenyesuaian: false,
    nominalAktual: 350000,
    debit: 0,
    kredit: 350000,
    saldoBerjalan: 580000,
    jenis: 'Pengeluaran',
    metode: 'QtyHarga',
    tambahanKeterangan: 'Pakan Konsentrat 1 Karung (50 Kg)'
  },
  {
    id: '104',
    rowNumber: 5,
    tanggal: '2026-08-09',
    keterangan: 'Upah Tenaga/ Gaji Karyawan',
    panenQty: 0,
    jualQty: 0,
    sisaTelur: 42.5,
    nominalAktual: 200000,
    debit: 0,
    kredit: 200000,
    saldoBerjalan: 380000,
    jenis: 'Pengeluaran',
    metode: 'Nominal',
    tambahanKeterangan: 'Gaji Harian 2 Karyawan Kandang'
  }
];

export const initialLogProduksi: LogProduksi[] = [
  {
    noProduksi: 1,
    tanggal: '2026-08-08',
    gabahDiproses: 0,
    outputs: [{ namaItem: 'Telur Ayam', qty: 50 }],
    susut: 0,
    keterangan: 'Panen harian 1.000 ekor ayam'
  }
];

export const initialPayrollDistributions: Record<number, PayrollDistribution[]> = {
  104: [
    { employeeId: 'EMP-001', workday: 1, total: 100000, rate: 100000 },
    { employeeId: 'EMP-002', workday: 1, total: 100000, rate: 100000 }
  ]
};
