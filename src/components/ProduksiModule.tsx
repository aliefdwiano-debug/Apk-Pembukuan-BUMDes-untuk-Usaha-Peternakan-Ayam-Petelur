import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Egg,
  Plus,
  Trash2,
  CheckCircle2,
  History,
  Calendar,
  Save,
  Edit3,
  X,
  Calculator,
  PieChart,
  Info,
  TrendingUp,
  Feather,
  Lock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import {
  ItemPersediaan,
  LogProduksi,
  StockOpnameEntry
} from '../types';
import {
  getStoredPersediaan,
  getStoredLogProduksi,
  deleteStoredLogProduksi,
  saveProduksi,
  getStoredStockOpname,
  processTutupBukuBulanan,
  updateHargaAcuanItem,
  updateStoredItemStock,
  getStoredTransaksiKas,
  updatePanenLogDetail,
  getDefaultPopulasiAyam,
  getUnsavedPanenDates,
  syncAllUnsavedPanenLogs,
  UnsavedPanenDate,
  getStockAnomaliesReport,
  StockAnomalyReport
} from '../lib/storage';
import { formatRupiah, formatAngka, formatTanggalLengkap, formatTanggalDisplay, parseRupiah, formatThousandDisplay, getTodayYYYYMMDD } from '../lib/formatters';

interface ProduksiModuleProps {
  onInventoryUpdated: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const ProduksiModule: React.FC<ProduksiModuleProps> = ({
  onInventoryUpdated,
  showMessage
}) => {
  const [items, setItems] = useState<ItemPersediaan[]>([]);
  const [logs, setLogs] = useState<LogProduksi[]>([]);
  const [, setOpnameHistory] = useState<StockOpnameEntry[]>([]);
  const [unsavedDates, setUnsavedDates] = useState<UnsavedPanenDate[]>([]);
  const [anomalies, setAnomalies] = useState<StockAnomalyReport[]>([]);

  // Form Panen Telur
  const [tanggal, setTanggal] = useState<string>(() => getTodayYYYYMMDD());
  const [populasiAyam, setPopulasiAyam] = useState<string>(() => String(getDefaultPopulasiAyam()));
  const [pakanKg, setPakanKg] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('Panen Telur Harian Kandang BUMDes');

  // Editing Ref Harga Acuan state
  const [editingItemName, setEditingItemName] = useState<string | null>(null);
  const [editingHarga, setEditingHarga] = useState<string>('');

  // Edit Log State
  const [editingLog, setEditingLog] = useState<LogProduksi | null>(null);
  const [editTanggal, setEditTanggal] = useState<string>('');
  const [editPopulasi, setEditPopulasi] = useState<string>('950');
  const [editPakan, setEditPakan] = useState<string>('');
  const [editCatatan, setEditCatatan] = useState<string>('');

  // Tutup Buku Form
  const [tutupBulan, setTutupBulan] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [opnameFisik, setOpnameFisik] = useState<Record<string, number>>({});

  // Helper to fetch panen quantity from Buku Kas Harian for selected date
  const getPanenKgFromKas = (tgl: string) => {
    const kasList = getStoredTransaksiKas();
    const panenTx = kasList.filter(
      (k) => k.tanggal === tgl && (k.keterangan || '').toLowerCase().includes('panen')
    );
    return panenTx.reduce((sum, k) => sum + (Number(k.qty) || 0), 0);
  };

  const panenFromKas = getPanenKgFromKas(tanggal);

  useEffect(() => {
    refreshData();

    const handleDataUpdated = () => {
      refreshData();
    };

    window.addEventListener('bumdes_data_updated', handleDataUpdated);
    return () => {
      window.removeEventListener('bumdes_data_updated', handleDataUpdated);
    };
  }, []);

  const refreshData = () => {
    const pers = getStoredPersediaan();
    setItems(pers);
    setLogs(getStoredLogProduksi());
    setOpnameHistory(getStoredStockOpname());
    setUnsavedDates(getUnsavedPanenDates());
    setAnomalies(getStockAnomaliesReport());

    const defaultPop = getDefaultPopulasiAyam();
    setPopulasiAyam(String(defaultPop));

    const initOp: Record<string, number> = {};
    pers.forEach((p) => {
      initOp[p.namaItem] = p.saldoQty;
    });
    setOpnameFisik(initOp);
    onInventoryUpdated();
  };

  const handleBatchSyncPanen = () => {
    const res = syncAllUnsavedPanenLogs();
    if (res.success) {
      showMessage(res.message, 'success');
      refreshData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  const numPanenKg = panenFromKas;
  const numPakanKg = parseFloat(pakanKg) || 0;
  const numPopulasi = parseFloat(populasiAyam) || 1;

  // Hen-Day Production Rate (%) Estimation (~16.2 butir/kg telur)
  const estButir = Math.round(numPanenKg * 16.2);
  const hdpRate = Math.min(100, Math.round((estButir / numPopulasi) * 100 * 10) / 10);

  const handleStartEditHarga = (item: ItemPersediaan) => {
    setEditingItemName(item.namaItem);
    setEditingHarga(String(item.hargaJualAcuan));
  };

  const handleSaveHarga = (namaItem: string) => {
    const val = parseRupiah(editingHarga);
    if (isNaN(val) || val <= 0) {
      showMessage('Harga acuan harus berupa angka valid.', 'error');
      return;
    }
    const res = updateHargaAcuanItem(namaItem, val);
    if (res.success) {
      showMessage(res.message, 'success');
      setEditingItemName(null);
      refreshData();
    }
  };

  const handleOpenEditLog = (log: LogProduksi) => {
    setEditingLog(log);
    setEditTanggal(log.tanggal);
    setEditPopulasi(String(log.populasiAyam || 950));
    setEditPakan(String(log.pakanKonsumsi || 0));

    let baseCatatan = log.keterangan.split('(')[0].trim();
    if (!baseCatatan) baseCatatan = 'Panen Telur Harian Kandang BUMDes';
    setEditCatatan(baseCatatan);
  };

  const handleSaveEditLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    const numPop = parseFloat(editPopulasi) || 1;
    const numPak = parseFloat(editPakan) || 0;

    const res = updatePanenLogDetail(editingLog.noProduksi, {
      tanggal: editTanggal,
      populasiAyam: numPop,
      pakanKonsumsi: numPak,
      catatan: editCatatan
    });

    if (res.success) {
      showMessage(res.message, 'success');
      setEditingLog(null);
      refreshData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleSavePanen = (e: React.FormEvent) => {
    e.preventDefault();
    if (panenFromKas <= 0) {
      showMessage(`Belum ada catatan "Panen Telur" di Buku Kas Harian pada tanggal ${formatTanggalDisplay(tanggal)}. Silakan catat transaksi Panen Telur di Buku Kas Harian terlebih dahulu.`, 'error');
      return;
    }

    const res = saveProduksi({
      tanggal,
      qtyGabah: 0,
      outputs: [
        { namaItem: 'Telur Ayam', qty: panenFromKas }
      ],
      keterangan: `${keterangan.trim()} (${populasiAyam} Ekor Ayam • Est HDP: ${hdpRate}%)`,
      skipStockUpdate: true, // Stock was already added via Buku Kas Harian entry
      populasiAyam: numPopulasi,
      pakanKonsumsi: numPakanKg
    });

    if (res.success) {
      // If feed consumed was specified, adjust feed stock
      if (numPakanKg > 0) {
        updateStoredItemStock('Pakan Konsentrat Ayam', -numPakanKg);
      }

      showMessage(`✓ Catatan Panen Telur (${panenFromKas} Kg) & Konsumsi Pakan (${numPakanKg} Kg) berhasil disimpan!`, 'success');
      setPakanKg('');
      refreshData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleDeleteLog = (noProduksi: number) => {
    const res = deleteStoredLogProduksi(noProduksi);
    if (res.success) {
      showMessage(res.message, 'success');
      refreshData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleTutupBuku = () => {
    const res = processTutupBukuBulanan(tutupBulan, opnameFisik);
    if (res.success) {
      showMessage(res.message, 'success');
      refreshData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-6 rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Egg className="w-7 h-7 text-amber-300" />
            <h2 className="text-xl font-bold">Produksi & Stok Persediaan Telur Ayam</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-amber-700/60 rounded-full border border-amber-500/30">
            Peternakan Ayam Petelur BUMDes
          </span>
        </div>
        <p className="text-xs text-amber-100/90 leading-relaxed max-w-3xl">
          Pencatatan hasil panen telur harian, pemantauan Hen-Day Production (HDP), penggunaan pakan konsentrat, serta penyesuaian stok opname telur dan pakan.
        </p>
      </div>

      {/* Grid: Form Panen & Ringkasan Stok Persediaan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panen Telur (7 col) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <span>Input Panen Telur Harian</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
              Otomatis Tambah Stok Telur
            </span>
          </div>

          {/* Alert: Tanggal Panen di Buku Kas yang Belum Disimpan ke Log Produksi */}
          {unsavedDates.length > 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-2">
                      <span>Ada {unsavedDates.length} Tanggal Panen Belum Disimpan ke Log Produksi</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                        Perhatian HPP
                      </span>
                    </h4>
                    <p className="text-[11px] sm:text-xs text-amber-800 leading-relaxed mt-0.5">
                      Transaksi panen sudah tercatat di Buku Kas Harian tetapi belum diklik <strong>"Simpan Catatan Panen Telur"</strong>. Simpan segera agar perhitungan HPP, HDP, dan stok persediaan akurat.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBatchSyncPanen}
                  className="shrink-0 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  title="Simpan semua tanggal panen otomatis ke log produksi"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span className="hidden sm:inline">Simpan Semua</span>
                </button>
              </div>

              {/* Tanggal-tanggal yang belum disimpan */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-200/60">
                <span className="text-[11px] font-semibold text-amber-900">Pilih Tanggal:</span>
                {unsavedDates.slice(0, 5).map((item) => (
                  <button
                    key={item.tanggal}
                    type="button"
                    onClick={() => setTanggal(item.tanggal)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      tanggal === item.tanggal
                        ? 'bg-amber-800 text-white border-amber-900 shadow-2xs ring-2 ring-amber-400'
                        : 'bg-white hover:bg-amber-100/80 text-amber-900 border-amber-300'
                    }`}
                  >
                    <span>📅 {formatTanggalDisplay(item.tanggal)}</span>
                    <span className="text-[10px] opacity-80">({item.qtyPanen} Kg)</span>
                  </button>
                ))}
                {unsavedDates.length > 5 && (
                  <span className="text-[11px] text-amber-800 font-medium">
                    +{unsavedDates.length - 5} tanggal lainnya
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Semua tanggal transaksi panen di Buku Kas sudah tercatat di Log Produksi.</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                HPP Sinkron
              </span>
            </div>
          )}

          <form onSubmit={handleSavePanen} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Panen</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:border-amber-600 focus:outline-none bg-white"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Populasi Ayam Bertelur (Ekor)</label>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Aset Biologis
                  </span>
                </div>
                <input
                  type="number"
                  value={populasiAyam}
                  onChange={(e) => setPopulasiAyam(e.target.value)}
                  placeholder="950"
                  className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:border-amber-600 focus:outline-none bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Jumlah Telur Dipanen (Kg)</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                    panenFromKas > 0
                      ? 'text-emerald-800 bg-emerald-100 border-emerald-300/60'
                      : 'text-amber-800 bg-amber-100 border-amber-300/60'
                  }`}>
                    <Lock className="w-3 h-3" />
                    {panenFromKas > 0 ? `Dari Kas (${panenFromKas} Kg)` : 'Read-Only (Buku Kas)'}
                  </span>
                </div>
                <input
                  type="text"
                  value={panenFromKas > 0 ? `${panenFromKas} Kg` : '0 Kg (Belum ada di Kas)'}
                  readOnly={true}
                  className={`w-full h-11 px-3.5 rounded-xl border text-sm font-bold focus:outline-none transition-colors select-none ${
                    panenFromKas > 0
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 cursor-not-allowed'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900 cursor-not-allowed'
                  }`}
                />
                {panenFromKas > 0 ? (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                    ✓ Otomatis diambil dari transaksi Panen Telur di Buku Kas Harian.
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                    ⚠️ Belum ada transaksi "Panen Telur" di Buku Kas Harian pada tanggal ini.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Konsumsi Pakan (Kg) <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={pakanKg}
                  onChange={(e) => setPakanKg(e.target.value)}
                  placeholder="Contoh: 45"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-amber-600 focus:outline-none bg-white"
                />
              </div>
            </div>

            {numPanenKg > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center text-amber-950 font-bold">
                  <span>Estimasi Hen-Day Production (HDP):</span>
                  <span className="text-sm font-black text-amber-900">{hdpRate}%</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimasi Butir Telur:</span>
                  <span>~{estButir} Butir</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan / Keterangan Panen</label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan kondisi kandang, cuaca, atau grade telur"
                className="w-full h-10 px-3.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:border-amber-600 focus:outline-none bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Catatan Panen Telur</span>
            </button>
          </form>
        </div>

        {/* Ringkasan Stok Persediaan (5 col) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-700" />
              <span>Stok Persediaan Telur & Pakan</span>
            </h3>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const anomaly = anomalies.find((a) => a.namaItem.toLowerCase().trim() === item.namaItem.toLowerCase().trim());
              const isNegative = item.saldoQty < 0;
              const isZero = item.saldoQty === 0;

              return (
                <div
                  key={`${item.namaItem}-${idx}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isNegative
                      ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-300'
                      : isZero
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900">{item.namaItem}</span>
                        {isNegative && (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-rose-600 text-white rounded-full">
                            Defisit {formatAngka(Math.abs(item.saldoQty))} {item.satuan}
                          </span>
                        )}
                      </div>
                      <span className="block text-[11px] text-gray-500">
                        Harga Acuan: {formatRupiah(item.hargaJualAcuan)} / {item.satuan}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`block font-black text-sm ${isNegative ? 'text-rose-700' : 'text-amber-950'}`}>
                        {formatAngka(item.saldoQty)} <span className="text-xs font-medium text-gray-600">{item.satuan}</span>
                      </span>

                      {editingItemName === item.namaItem ? (
                        <div className="mt-1 flex items-center gap-1 justify-end">
                          <input
                            type="text"
                            value={formatThousandDisplay(editingHarga)}
                            onChange={(e) => setEditingHarga(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-24 h-7 px-1.5 text-xs font-semibold border border-amber-300 rounded text-right bg-white"
                            placeholder="0"
                          />
                          <button
                            onClick={() => handleSaveHarga(item.namaItem)}
                            className="p-1 bg-amber-700 text-white rounded hover:bg-amber-800 text-[10px] cursor-pointer"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditHarga(item)}
                          className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5 ml-auto mt-0.5 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Ubah Harga</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isNegative && (
                    <div className="mt-2 pt-2 border-t border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Perhatian:</strong> Penjualan/pengeluaran melebihi stok tercatat. Nilai HPP di Neraca diproteksi dari nilai negatif. Silakan input catatan panen/pembelian stok atau lakukan penyesuaian stok opname.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Riwayat Panen Telur */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
          <History className="w-5 h-5 text-amber-700" />
          <span>Riwayat Pencatatan Panen Telur</span>
        </h3>

        {logs.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">Belum ada catatan panen telur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-amber-900 text-white font-bold divide-x divide-amber-800">
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3 text-center whitespace-nowrap">Tanggal</th>
                  <th className="p-3 text-center whitespace-nowrap">Hasil Panen Telur (Kg)</th>
                  <th className="p-3">Keterangan / Rincian</th>
                  <th className="p-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log, idx) => (
                  <tr key={`log-${log.noProduksi}-${idx}`} className="hover:bg-amber-50/50 divide-x divide-gray-100">
                    <td className="p-3 text-center font-bold text-gray-700">{idx + 1}</td>
                    <td className="p-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                      {formatTanggalLengkap(log.tanggal)}
                    </td>
                    <td className="p-3 text-center font-extrabold text-amber-950 bg-amber-50">
                      {log.outputs.map((o) => `${formatAngka(o.qty)} Kg`).join(', ')}
                    </td>
                    <td className="p-3 text-gray-700">{log.keterangan}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditLog(log)}
                          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-100/70 rounded-lg cursor-pointer transition-colors"
                          title="Edit Catatan Panen (Populasi / Pakan / Tanggal)"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.noProduksi)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Hapus Catatan Panen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tutup Buku Bulanan & Stock Opname */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-800" />
              <span>Stock Opname & Tutup Buku Bulanan Telur/Pakan</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Sinkronkan jumlah stok fisik hasil perhitungan akhir bulan dengan catatan sistem
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={tutupBulan}
              onChange={(e) => setTutupBulan(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-300 text-xs bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item.namaItem} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
              <span className="block text-xs font-bold text-gray-800 truncate">{item.namaItem}</span>
              <div className="text-[11px] text-gray-500 flex justify-between">
                <span>Stok Sistem:</span>
                <span className="font-semibold text-gray-900">{formatAngka(item.saldoQty)} {item.satuan}</span>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Stok Fisik Gudang ({item.satuan}):</label>
                <input
                  type="number"
                  step="0.1"
                  value={opnameFisik[item.namaItem] !== undefined ? opnameFisik[item.namaItem] : item.saldoQty}
                  onChange={(e) => setOpnameFisik({ ...opnameFisik, [item.namaItem]: parseFloat(e.target.value) || 0 })}
                  className="w-full h-8 px-2 border border-gray-300 rounded text-xs text-right font-bold bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleTutupBuku}
          className="w-full py-3 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>Proses Tutup Buku & Update Saldo Stok Akhir Bulan</span>
        </button>
      </div>

      {/* Modal Edit Catatan Panen */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-amber-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-700" />
                <span>Edit Catatan Panen Telur</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLog} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Panen</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-semibold text-gray-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Populasi Ayam Bertelur (Ekor)</label>
                <input
                  type="number"
                  value={editPopulasi}
                  onChange={(e) => setEditPopulasi(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-amber-950 bg-white"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Konsumsi Pakan (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editPakan}
                  onChange={(e) => setEditPakan(e.target.value)}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-amber-950 bg-white"
                />
                <p className="text-[11px] text-gray-500 mt-1">Perubahan konsumsi pakan akan otomatis menyesuaikan stok Pakan Konsentrat Ayam.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs text-gray-900 bg-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
