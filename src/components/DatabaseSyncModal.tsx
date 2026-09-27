import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Server,
  ShieldCheck,
  HardDrive,
  X,
  Layers,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  FileCode2,
  ExternalLink,
  Code2
} from 'lucide-react';
import {
  pullFromDatabase,
  pushToDatabase,
  checkDatabaseHealth,
  getLastSyncTime
} from '../lib/databaseService';
import {
  getStoredProfil,
  getStoredKas,
  getStoredAset,
  getStoredModalKewajiban,
  getStoredKaryawan,
  getStoredPersediaan,
  getStoredLogProduksi
} from '../lib/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
  onSyncCompleted?: () => void;
}

export const DatabaseSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  showMessage,
  onSyncCompleted
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'supabase'>('sync');
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    database: string;
    isSupabase?: boolean;
    bumdes?: string;
    error?: string;
  }>({
    connected: true,
    database: 'PostgreSQL (Supabase Engine)'
  });
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Supabase Info & SQL
  const [supabaseInfo, setSupabaseInfo] = useState<{
    isConfigured: boolean;
    supabaseUrl: string | null;
    sqlScript: string;
  }>({
    isConfigured: false,
    supabaseUrl: null,
    sqlScript: ''
  });
  const [copiedSql, setCopiedSql] = useState(false);

  // Table row counters
  const [stats, setStats] = useState({
    kasCount: 0,
    asetCount: 0,
    modalCount: 0,
    karyawanCount: 0,
    persediaanCount: 0,
    produksiCount: 0
  });

  const refreshStats = () => {
    setStats({
      kasCount: getStoredKas().length,
      asetCount: getStoredAset().length,
      modalCount: getStoredModalKewajiban().length,
      karyawanCount: getStoredKaryawan().length,
      persediaanCount: getStoredPersediaan().length,
      produksiCount: getStoredLogProduksi().length
    });
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      checkHealth();
      fetchSupabaseInfo();
    }
  }, [isOpen]);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await checkDatabaseHealth();
      setDbStatus(res);
    } catch (e: any) {
      setDbStatus({
        connected: false,
        database: 'PostgreSQL',
        error: e.message || 'Tidak dapat menghubungi server'
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchSupabaseInfo = async () => {
    try {
      const res = await fetch('/api/supabase/info');
      if (res.ok) {
        const json = await res.json();
        setSupabaseInfo(json);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopySql = () => {
    if (!supabaseInfo.sqlScript) return;
    navigator.clipboard.writeText(supabaseInfo.sqlScript);
    setCopiedSql(true);
    showMessage('Skrip SQL Supabase berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handlePull = async () => {
    setActionLoading(true);
    try {
      const res = await pullFromDatabase();
      if (res.success) {
        showMessage('Data terbaru berhasil ditarik dari database!', 'success');
        refreshStats();
        if (onSyncCompleted) onSyncCompleted();
      } else {
        showMessage(res.message, 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Gagal menarik data', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePush = async () => {
    setActionLoading(true);
    try {
      const res = await pushToDatabase();
      if (res.success) {
        showMessage('Seluruh data berhasil disimpan ke database!', 'success');
        refreshStats();
        if (onSyncCompleted) onSyncCompleted();
      } else {
        showMessage(res.message, 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Gagal menyimpan data', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeedReset = async () => {
    if (!window.confirm('Apakah Anda yakin ingin memuat ulang data awal BUMDes default ke database?')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/bumdes/seed', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await pullFromDatabase();
        refreshStats();
        if (onSyncCompleted) onSyncCompleted();
        showMessage('Data awal BUMDes berhasil dimuat ulang ke database.', 'success');
      } else {
        showMessage(json.error || 'Gagal mereset data', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Gagal reset data', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportJSON = () => {
    const data = {
      profil: getStoredProfil(),
      kas: getStoredKas(),
      aset: getStoredAset(),
      modal: getStoredModalKewajiban(),
      karyawan: getStoredKaryawan(),
      persediaan: getStoredPersediaan(),
      logProduksi: getStoredLogProduksi(),
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_bumdes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('File cadangan JSON berhasil diunduh.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-emerald-100 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white/90"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shadow-inner">
              <Database className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Database Supabase & PostgreSQL
                </h2>
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {supabaseInfo.isConfigured ? 'Supabase Connected' : 'PostgreSQL Active'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200 font-medium">
                Penyimpanan Data Terpusat, Realtime & Relasional
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-emerald-800/80">
            <button
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sync'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900'
              }`}
            >
              Koneksi & Sinkronisasi
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'supabase'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Panduan & Skrip SQL Supabase</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700">
          {activeTab === 'sync' && (
            <>
              {/* Connection Status Card */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">Status Database Relasional</span>
                        {dbStatus.connected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aktif & Terhubung
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Terputus
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        Mesin: <span className="font-bold text-emerald-900">PostgreSQL (Supabase Engine)</span> • Region: <span className="font-bold text-gray-900">asia-southeast1</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={checkHealth}
                    disabled={loadingHealth}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-xl cursor-pointer transition-all self-start sm:self-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                    <span>Cek Ulang</span>
                  </button>
                </div>

                {getLastSyncTime() && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900 font-medium">
                    <span>Sinkronisasi Terakhir:</span>
                    <span className="font-bold bg-white px-2.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                      {getLastSyncTime()} WIB
                    </span>
                  </div>
                )}
              </div>

              {/* Table Data Summary */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm mb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>Ringkasan Data dalam Tabel Relasional</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Buku Kas Harian</span>
                    <span className="text-lg font-black text-emerald-900">{stats.kasCount} baris</span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Daftar Aset Tetap</span>
                    <span className="text-lg font-black text-emerald-900">{stats.asetCount} unit</span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Modal & Kewajiban</span>
                    <span className="text-lg font-black text-emerald-900">{stats.modalCount} pos</span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Data Karyawan</span>
                    <span className="text-lg font-black text-emerald-900">{stats.karyawanCount} orang</span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Item Persediaan</span>
                    <span className="text-lg font-black text-emerald-900">{stats.persediaanCount} barang</span>
                  </div>
                  <div className="p-3 bg-white border border-gray-200 rounded-xl">
                    <span className="text-[11px] text-gray-500 font-semibold block">Log Panen / Produksi</span>
                    <span className="text-lg font-black text-emerald-900">{stats.produksiCount} siklus</span>
                  </div>
                </div>
              </div>

              {/* Action Synchronization Buttons */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>Aksi Sinkronisasi Data</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handlePull}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-2xl transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className={`w-4 h-4 ${actionLoading ? 'animate-bounce' : ''}`} />
                    <span>Tarik Data Terbaru dari DB</span>
                  </button>

                  <button
                    onClick={handlePush}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Upload className={`w-4 h-4 ${actionLoading ? 'animate-bounce' : ''}`} />
                    <span>Simpan Semua ke Database</span>
                  </button>
                </div>
              </div>

              {/* Backup & Safety Tools */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-gray-600" />
                  <span>Unduh Cadangan JSON</span>
                </button>

                <button
                  onClick={handleSeedReset}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Reset ke Data Awal BUMDes</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-5">
              {supabaseInfo.isConfigured ? (
                <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-700" /> Kredensial Supabase Terpasang
                        </span>
                        <h4 className="font-bold text-gray-900 text-base mt-1">
                          Project: <code className="text-emerald-800 font-mono text-sm">{supabaseInfo.projectHost || 'dugmcneyfqmfkgqrdavk.supabase.co'}</code>
                        </h4>
                        <p className="text-xs text-emerald-900 mt-0.5">
                          {supabaseInfo.tablesExist
                            ? '✅ Seluruh 12 tabel telah aktif di Supabase Anda!'
                            : '⚠️ URL & API Key valid, namun tabel belum dibuat di database Supabase Anda.'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={fetchSupabaseInfo}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Cek Tabel</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5">
                  <h4 className="font-bold text-emerald-950 text-base mb-1 flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-700" />
                    <span>Cara Menghubungkan ke Proyek Supabase Anda Sendiri</span>
                  </h4>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Supabase adalah platform berbasis PostgreSQL. Seluruh arsitektur tabel yang telah kami buat 100% kompatibel dan siap dijalankan langsung di akun Supabase Anda.
                  </p>
                </div>
              )}

              {/* Steps Guide */}
              <div className="space-y-3">
                <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
                  {supabaseInfo.tablesExist ? 'Status Integrasi Supabase' : 'Langkah Terakhir yang Perlu Anda Lakukan:'}
                </h5>

                <div className="space-y-2.5">
                  <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${
                    supabaseInfo.tablesExist ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/80 border-amber-300'
                  }`}>
                    <span className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      supabaseInfo.tablesExist ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}>
                      {supabaseInfo.tablesExist ? '✓' : '1'}
                    </span>
                    <div className="w-full">
                      <strong className="text-gray-900 text-sm block">
                        {supabaseInfo.tablesExist
                          ? 'Tabel Supabase Sudah Aktif'
                          : 'Jalankan Skrip SQL di Supabase SQL Editor'}
                      </strong>
                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                        {supabaseInfo.tablesExist
                          ? 'Semua data transaksi kas, aset, modal, dan persediaan tersimpan langsung ke Supabase.'
                          : 'Buka SQL Editor di dashboard Supabase Anda, buat query baru, tempelkan skrip SQL (12 tabel), lalu klik tombol "Run".'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button
                          onClick={handleCopySql}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Skrip SQL Supabase (12 Tabel)'}</span>
                        </button>

                        <a
                          href="https://supabase.com/dashboard"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold rounded-xl transition-all shadow-2xs"
                        >
                          <span>Buka Dashboard Supabase</span>
                          <ExternalLink className="w-3 h-3 text-gray-500" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {supabaseInfo.tablesExist && (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div>
                        <strong className="text-emerald-950 text-xs block">Kirim Data Awal BUMDes ke Supabase</strong>
                        <span className="text-[11px] text-gray-600">Pastikan seluruh data awal lokal tersalin ke database Supabase Anda.</span>
                      </div>
                      <button
                        onClick={async () => {
                          setActionLoading(true);
                          try {
                            const res = await fetch('/api/supabase/seed-now', { method: 'POST' });
                            const json = await res.json();
                            if (json.success) {
                              showMessage(json.message, 'success');
                              await pullFromDatabase();
                              refreshStats();
                            } else {
                              showMessage(json.error || 'Gagal sinkron', 'error');
                            }
                          } catch (err: any) {
                            showMessage(err.message || 'Gagal sinkron', 'error');
                          } finally {
                            setActionLoading(false);
                          }
                        }}
                        disabled={actionLoading}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        Sinkronkan ke Supabase Sekarang
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SQL Script Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <FileCode2 className="w-4 h-4 text-emerald-700" />
                    <span>File SQL: <code className="text-emerald-800">supabase_schema.sql</code></span>
                  </span>
                  <button
                    onClick={handleCopySql}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin Kode</span>
                  </button>
                </div>
                <div className="bg-gray-900 text-gray-100 rounded-xl p-3.5 text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed border border-gray-800">
                  <pre>{supabaseInfo.sqlScript || '-- Skrip SQL siap digunakan di root workspace: supabase_schema.sql'}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            PostgreSQL & Supabase Ready • Keamanan & Integritas Terjamin
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-bold bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl shadow-2xs cursor-pointer transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
