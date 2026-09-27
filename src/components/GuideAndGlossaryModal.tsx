import React, { useState } from 'react';
import {
  X,
  BookOpen,
  BookMarked,
  Search,
  CheckCircle2,
  HelpCircle,
  Building2,
  Wallet,
  Users,
  Factory,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface GuideAndGlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'guide' | 'glossary';
  initialGuideTab?: 'profil' | 'kas' | 'gaji' | 'produksi' | 'laporan' | 'sheets';
}

interface GlossaryItem {
  term: string;
  category: 'Akuntansi' | 'Operasional' | 'Produksi' | 'Keuangan';
  definition: string;
  example: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'Kas (Uang Tunai)',
    category: 'Keuangan',
    definition: 'Uang fisik (uang kertas/logam) yang dipegang langsung oleh Bendahara BUMDes untuk transaksi harian.',
    example: 'Uang di laci kas BUMDes sebesar Rp 1.500.000 untuk beli bensin mesin giling dan bayar nota kecil.'
  },
  {
    term: 'Bank (Uang Rekening)',
    category: 'Keuangan',
    definition: 'Saldo uang BUMDes yang tersimpan aman di rekening bank resmi atas nama BUMDes.',
    example: 'Uang di rekening Bank BRI BUMDes sebesar Rp 25.000.000 dari hasil transfer pembeli telur.'
  },
  {
    term: 'Pendapatan Operasional',
    category: 'Akuntansi',
    definition: 'Seluruh uang atau tagihan yang masuk dari hasil penjualan utama BUMDes (misalnya penjualan telur ayam, pakan, atau produk olahan).',
    example: 'Penjualan 100 kg telur ayam seharga Rp 2.250.000 masuk sebagai Pendapatan Penjualan Telur.'
  },
  {
    term: 'HPP (Harga Pokok Penjualan)',
    category: 'Akuntansi',
    definition: 'Total modal biaya langsung yang dikeluarkan untuk menghasilkan produk yang dijual (seperti pembelian pakan konsentrat, tray/kemasan, dan upah tenaga kerja).',
    example: 'Untuk menjual telur senilai Rp 5.000.000, BUMDes memerlukan modal pakan dan kemasan sebesar Rp 3.500.000. Maka HPP-nya adalah Rp 3.500.000.'
  },
  {
    term: 'Beban Operasional / Biaya',
    category: 'Akuntansi',
    definition: 'Pengeluaran rutin untuk mendukung kelancaran usaha yang bukan modal barang langsung (seperti gaji pengurus, listrik kandang/kantor, bensin, atau vitamin).',
    example: 'Membayar tagihan listrik kandang Rp 350.000 dan gaji pengurus bulanan.'
  },
  {
    term: 'Laba Kotor',
    category: 'Akuntansi',
    definition: 'Keuntungan murni dari hasil penjualan barang sebelum dikurangi biaya operasional kantor/listrik/gaji pengurus. (Laba Kotor = Total Pendapatan − HPP).',
    example: 'Pendapatan telur Rp 5 Juta dikurangi HPP Pakan & Modal Rp 3,5 Juta = Laba Kotor Rp 1,5 Juta.'
  },
  {
    term: 'Laba Bersih Operasional',
    category: 'Akuntansi',
    definition: 'Sisa keuntungan akhir BUMDes setelah semua hasil penjualan dikurangi HPP dan seluruh biaya operasional. Ini adalah keuntungan bersih resmi BUMDes.',
    example: 'Laba Kotor Rp 1,5 Juta dikurangi Beban Listrik & Operasional Rp 500.000 = Laba Bersih Rp 1 Juta.'
  },
  {
    term: 'Stock Opname (Cek Fisik Stok)',
    category: 'Operasional',
    definition: 'Kegiatan menghitung dan menimbang langsung jumlah fisik barang (telur & pakan) di gudang/kandang pada akhir bulan untuk disesuaikan dengan catatan sistem.',
    example: 'Petugas kandang menimbang fisik persediaan telur di tray tanggal 30 bulan ini dan mencatat ada 42,5 kg.'
  },
  {
    term: 'Piutang (Tagihan Pembeli)',
    category: 'Keuangan',
    definition: 'Uang milik BUMDes yang belum dibayar oleh pembeli/pelanggan yang membeli barang secara tempo/kredit.',
    example: 'Toko Bu Siti mengambil telur Rp 1.000.000 dan berjanji bayar minggu depan. Ini dicatat sebagai Piutang Usaha.'
  },
  {
    term: 'Hutang Usaha',
    category: 'Keuangan',
    definition: 'Kewajiban uang BUMDes yang harus dibayarkan ke pihak luar (seperti sisa pembayaran pakan ke suplier yang belum lunas).',
    example: 'BUMDes membeli pakan konsentrat Rp 3.000.000 baru dibayar DP Rp 1.500.000. Sisa Rp 1.500.000 adalah Hutang Usaha BUMDes.'
  },
  {
    term: 'Alokasi HPP Gaji',
    category: 'Produksi',
    definition: 'Pembagian uang gaji buruh/tenaga kerja kandang ke dalam biaya modal barang jadi (telur) agar nilai HPP mencerminkan biaya modal sebenarnya.',
    example: 'Gaji pekerja kandang Rp 500.000 dimasukkan ke modal operasional produksi telur bulan ini.'
  },
  {
    term: 'Tutup Buku Bulanan',
    category: 'Operasional',
    definition: 'Proses mengunci pembukuan pada akhir bulan agar laporan keuangan bulan tersebut rapi, tidak berubah lagi, dan siap dilaporkan ke Musdes / Kepala Desa.',
    example: 'Setiap tanggal 31, Bendahara melakukan Tutup Buku dan mencetak Laporan Laba Rugi periode bulan tersebut.'
  }
];

export const GuideAndGlossaryModal: React.FC<GuideAndGlossaryModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'guide',
  initialGuideTab = 'kas'
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'guide' | 'glossary'>(defaultTab);
  const [activeGuideTab, setActiveGuideTab] = useState<'profil' | 'kas' | 'gaji' | 'produksi' | 'laporan' | 'sheets'>(initialGuideTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  if (!isOpen) return null;

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    const matchSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.example.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'Semua' || item.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-emerald-900 text-white p-4 sm:p-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700">
              {activeMainTab === 'guide' ? (
                <BookOpen className="w-5 h-5 text-emerald-300" />
              ) : (
                <BookMarked className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold tracking-tight text-white">
                Pusat Bantuan & Glosarium Istilah BUMDes
              </h2>
              <p className="text-xs text-emerald-200">
                Panduan praktis langkah demi langkah & penjelasan istilah akuntansi bahasa awam
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Tab Switcher */}
        <div className="bg-emerald-950/90 p-2 sm:px-6 flex gap-2 border-b border-emerald-800/60 shrink-0">
          <button
            onClick={() => setActiveMainTab('guide')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMainTab === 'guide'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-emerald-200 hover:bg-emerald-900/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 Petunjuk Langkah demi Langkah</span>
          </button>
          <button
            onClick={() => setActiveMainTab('glossary')}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeMainTab === 'glossary'
                ? 'bg-white text-emerald-950 shadow-sm'
                : 'text-emerald-200 hover:bg-emerald-900/60'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>📚 Glosarium Istilah Awam</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: PETUNJUK LANGKAH DEMI LANGKAH */}
          {activeMainTab === 'guide' && (
            <div className="space-y-6">
              {/* Sub-tab navigation per module */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin border-b border-gray-100">
                <button
                  onClick={() => setActiveGuideTab('kas')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'kas'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>1. Buku Kas</span>
                </button>
                <button
                  onClick={() => setActiveGuideTab('gaji')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'gaji'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2. Gaji Pekerja</span>
                </button>
                <button
                  onClick={() => setActiveGuideTab('produksi')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'produksi'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5" />
                  <span>3. Produksi & Stok</span>
                </button>
                <button
                  onClick={() => setActiveGuideTab('laporan')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'laporan'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>4. Laporan Keuangan</span>
                </button>
                <button
                  onClick={() => setActiveGuideTab('profil')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'profil'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>5. Profil & Master</span>
                </button>
                <button
                  onClick={() => setActiveGuideTab('sheets')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeGuideTab === 'sheets'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>6. Google Sheets</span>
                </button>
              </div>

              {/* GUIDE CONTENT PER TAB */}
              {activeGuideTab === 'kas' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Modul Buku Kas: Tempat Mencatat Semua Uang Masuk & Keluar
                      </p>
                      <p>
                        Gunakan modul ini setiap kali Bendahara BUMDes menerima uang (misal dari penjualan) atau mengeluarkan uang (misal beli bensin, bayar nota, atau bayar listrik).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                      Langkah Cara Mencatat Transaksi Kas:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">Langkah A: Masukkan Tanggal & Tipe</span>
                        <p className="text-gray-600">Pilih tanggal transaksi dan klik tombol hijau **Pemasukan** (uang masuk) atau merah **Pengeluaran** (uang keluar).</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">Langkah B: Isi Nominal (Otomatis Rp)</span>
                        <p className="text-gray-600">Ketik angka saja (misal `500000`). Sistem otomatis menampilkan format `Rp 500.000` tanpa perlu bingung mengetik titik/koma.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">Langkah C: Pilih Kategori Transaksi</span>
                        <p className="text-gray-600">Pilih kategori yang sesuai (Jual Telur, Beli pakan, Beban Listrik, Upah Tenaga/ Gaji Karyawan, dll) untuk mempermudah laporan otomatis.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">Langkah D: Simpan ke Draft atau Kas Utama</span>
                        <p className="text-gray-600">Jika ragu, klik **Simpan sebagai Draft**. Jika sudah pasti benar, klik **Simpan Transaksi** untuk langsung membukukan.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    💡 <strong>Tips Penting Bendahara:</strong> BUMDes memisahkan rekening antara **Kas Tunai** (laci uang) dan **Bank BRI/BCA** (rekening). Jangan lupa memilih lokasi kas yang tepat saat input transaksi!
                  </div>
                </div>
              )}

              {activeGuideTab === 'gaji' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Modul Gaji & Upah Pekerja: Penggajian Karyawan & Buruh Giling
                      </p>
                      <p>
                        Modul ini digunakan untuk menghitung & mencetak slip gaji pekerja BUMDes secara bulanan, sekaligus otomatis membukukan pengeluaran gaji ke Buku Kas BUMDes.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">1</span>
                      Langkah Pembayaran Gaji:
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">1. Pilih Bulan & Tahun Periode</span>
                        <p className="text-gray-600">Pilih periode gaji yang hendak diproses di bagian atas modul.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">2. Input Jumlah Hari Kerja (Default 6 Hari)</span>
                        <p className="text-gray-600">Sistem telah mengeset **6 Hari Kerja** sebagai nilai awal standar bulanan. Anda dapat menambah atau mengurangi hari kerja sesuai kehadiran fisik pekerja menggunakan tombol (+) atau (-).</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">3. Masukkan Nominal Total Gaji (Format Rp Otomatis)</span>
                        <p className="text-gray-600">Ketik nominal gaji (misal `1200000`). Sistem langsung memformatnya menjadi `Rp 1.200.000` dengan rapi.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-800">4. Klik "Simpan & Bukukan Pengeluaran Gaji"</span>
                        <p className="text-gray-600">Sistem akan menyimpan catatan gaji dan otomatis memotong saldo Kas BUMDes secara akurat.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeGuideTab === 'produksi' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Modul Persediaan &amp; Panen Ayam Petelur
                      </p>
                      <p>
                        Modul ini dirancang khusus untuk unit usaha peternakan ayam petelur BUMDes. Berfungsi mencatat panen harian telur, konsumsi pakan, stok telur/pakan, dan Stock Opname fisik akhir bulan.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5">
                      <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>1. Input Panen Telur Harian</span>
                      </h5>
                      <p className="text-gray-600">Saat memanen telur dari kandang, masukkan kilogram panen dan konsumsi pakan. Stok telur otomatis bertambah di sistem.</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5">
                      <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>2. Catat Penjualan &amp; Pembelian Pakan</span>
                      </h5>
                      <p className="text-gray-600">Pencatatan jual telur atau beli pakan di Buku Kas otomatis memotong atau menambah stok persediaan secara riil.</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5">
                      <h5 className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>3. Stock Opname Akhir Bulan</span>
                      </h5>
                      <p className="text-gray-600">Di akhir bulan, timbang semua persediaan di kandang. Masukkan angka timbangan fisik untuk menutup buku persediaan secara resmi.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeGuideTab === 'laporan' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Modul Cetak Laporan Keuangan Standar BUMDes
                      </p>
                      <p>
                        Menghasilkan Laporan Laba Rugi, Neraca Posisi Keuangan, dan Arus Kas secara otomatis tanpa perlu membuat rumus Excel sendiri. Siap dicetak untuk laporan Musdes.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                      <span className="font-bold text-emerald-900">1. Pilih Periode Laporan</span>
                      <p className="text-gray-600">Pilih bulan dan tahun laporan yang ingin ditampilkan (misal: Juli 2026).</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                      <span className="font-bold text-emerald-900">2. Pilih Jenis Laporan</span>
                      <p className="text-gray-600">Centang opsi **Laporan Laba Rugi Operasional**, **Posisi Keuangan**, atau **Arus Kas** sesuai kebutuhan rapat BUMDes.</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1">
                      <span className="font-bold text-emerald-900">3. Cetak PDF / Kirim ke WhatsApp/Google Drive</span>
                      <p className="text-gray-600">Klik tombol **Cetak Laporan** di pojok atas untuk langsung mencetak dokumen resmi lengkap dengan Kop BUMDes dan tanda tangan pengurus.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeGuideTab === 'profil' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Modul Profil & Master Data BUMDes
                      </p>
                      <p>
                        Digunakan untuk mengatur identitas resmi BUMDes (Nama, Desa, SK Pendirian), Rekening Bank, Daftar Karyawan, dan Harga Acuan Barang.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700">
                    <p>• <strong>Ubah Nama & SK BUMDes:</strong> Tampil otomatis di Kop Surat Laporan Keuangan.</p>
                    <p>• <strong>Daftar Karyawan:</strong> Tambahkan nama pengurus dan pekerja agar bisa langsung dipilih di Modul Gaji.</p>
                    <p>• <strong>Harga Acuan Barang:</strong> Masukkan estimasi harga jual telur/pakan per kg untuk acuan persediaan.</p>
                  </div>
                </div>
              )}

              {activeGuideTab === 'sheets' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 space-y-1">
                      <p className="font-bold text-sm text-emerald-950">
                        Integrasi Google Sheets Live Sync
                      </p>
                      <p>
                        Fitur keamanan data otomatis agar pembukuan BUMDes tersimpan aman di Google Drive milik BUMDes. Data tidak akan hilang meskipun komputer/HP berganti.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-700">
                    <p>1. Klik tombol hijau <strong>"Integrasi Langsung Google Sheets"</strong> di pojok kanan atas layar utama.</p>
                    <p>2. Hubungkan Google Account BUMDes dan pilih file Google Spreadsheet tujuan.</p>
                    <p>3. Setiap kali transaksi dicatat, data otomatis terkirim langsung ke file Google Sheets BUMDes.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GLOSARIUM ISTILAH AWAM */}
          {activeMainTab === 'glossary' && (
            <div className="space-y-5">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari istilah akuntansi (misal: HPP, Kas, Laba, Opname, Susut)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                  {['Semua', 'Keuangan', 'Akuntansi', 'Produksi', 'Operasional'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-emerald-800 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glossary List Cards */}
              {filteredGlossary.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <HelpCircle className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-bold text-gray-700">Istilah tidak ditemukan</p>
                  <p className="text-xs text-gray-500">
                    Coba ketik kata kunci lain seperti "HPP", "Kas", "Laba", atau "Opname".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGlossary.map((item) => (
                    <div
                      key={item.term}
                      className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.term}</span>
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              item.category === 'Keuangan'
                                ? 'bg-blue-100 text-blue-800'
                                : item.category === 'Akuntansi'
                                ? 'bg-purple-100 text-purple-800'
                                : item.category === 'Produksi'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {item.definition}
                        </p>
                      </div>

                      <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100/80 text-[11px] space-y-0.5">
                        <span className="font-bold text-emerald-900 block">💡 Contoh Nyata BUMDes:</span>
                        <p className="text-emerald-950 italic">{item.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-500 font-medium hidden sm:block">
            Sistem Pembukuan BUMDes • Panduan Ramah Pengguna Awam
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Tutup Bantuan
          </button>
        </div>
      </div>
    </div>
  );
};
