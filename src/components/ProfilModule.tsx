import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Users,
  Building,
  Coins,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Info,
  Calendar,
  Layers,
  Save,
  X,
  RotateCcw
} from 'lucide-react';
import {
  BumdesProfil,
  Pengurus,
  AsetTetap,
  ModalKewajiban,
  ItemPersediaan
} from '../types';
import {
  getStoredProfil,
  saveStoredProfil,
  getStoredPengurus,
  saveStoredPengurus,
  deleteStoredPengurus,
  getStoredAset,
  saveStoredAset,
  deleteStoredAset,
  getStoredModalKewajiban,
  saveStoredModalKewajiban,
  deleteStoredModalKewajiban,
  isSaldoAwalProcessed,
  processSaldoAwal,
  resetSaldoAwal,
  getStoredPersediaan
} from '../lib/storage';
import { setSyncPaused, triggerAutoSyncToSheets } from '../lib/googleSheetsService';
import { formatRupiah, formatTanggalLengkap, formatThousandDisplay, parseRupiah } from '../lib/formatters';

type SubTab = 'info' | 'pengurus' | 'aset' | 'modal' | 'saldoAwal';

interface ProfilModuleProps {
  onProfilUpdated: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const ProfilModule: React.FC<ProfilModuleProps> = ({
  onProfilUpdated,
  showMessage
}) => {
  const [subTab, setSubTab] = useState<SubTab>('info');

  // Profil Form State
  const [profil, setProfil] = useState<BumdesProfil>(getStoredProfil());

  // Lists
  const [pengurusList, setPengurusList] = useState<Pengurus[]>([]);
  const [asetList, setAsetList] = useState<AsetTetap[]>([]);
  const [modalList, setModalList] = useState<ModalKewajiban[]>([]);

  // Modals
  const [pengurusModalOpen, setPengurusModalOpen] = useState(false);
  const [editingPengurus, setEditingPengurus] = useState<Pengurus | null>(null);

  const [asetModalOpen, setAsetModalOpen] = useState(false);
  const [editingAset, setEditingAset] = useState<AsetTetap | null>(null);
  const [asetKategori, setAsetKategori] = useState<string>('Peralatan');

  const [modalModalOpen, setModalModalOpen] = useState(false);
  const [editingModal, setEditingModal] = useState<ModalKewajiban | null>(null);

  // Saldo Awal State
  const [saldoAwalDone, setSaldoAwalDone] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [saldoAwalTanggal, setSaldoAwalTanggal] = useState('2026-07-31');
  const [saldoAwalKas, setSaldoAwalKas] = useState<number>(0);
  const [sertakanAsetTetap, setSertakanAsetTetap] = useState(true);
  const [itemsPersediaan, setItemsPersediaan] = useState<ItemPersediaan[]>([]);
  const [persediaanVal, setPersediaanVal] = useState<Record<string, { qty: number; nilai: number }>>({});

  useEffect(() => {
    if (subTab === 'saldoAwal') {
      setSyncPaused(true);
    } else {
      setSyncPaused(false);
    }
    return () => {
      setSyncPaused(false);
    };
  }, [subTab]);

  useEffect(() => {
    refreshAllData();

    const handleDataUpdated = () => {
      refreshAllData();
    };

    window.addEventListener('bumdes_data_updated', handleDataUpdated);
    return () => {
      window.removeEventListener('bumdes_data_updated', handleDataUpdated);
    };
  }, []);

  const refreshAllData = (isExplicitReset = false) => {
    setProfil(getStoredProfil());
    setPengurusList(getStoredPengurus());
    setAsetList(getStoredAset());
    setModalList(getStoredModalKewajiban());
    setSaldoAwalDone(isSaldoAwalProcessed());

    const items = getStoredPersediaan();
    setItemsPersediaan(items);

    if (isExplicitReset || subTab !== 'saldoAwal' || Object.keys(persediaanVal).length === 0) {
      const initMap: Record<string, { qty: number; nilai: number }> = {};
      items.forEach((i) => {
        initMap[i.namaItem] = { qty: i.saldoQty, nilai: i.saldoQty * i.hargaJualAcuan };
      });
      setPersediaanVal(initMap);
    }
  };

  const handleSaveProfil = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveStoredProfil(profil);
    setProfil(updated);
    onProfilUpdated();
    fetch('/api/bumdes/profil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    })
      .then((res) => {
        if (res.ok) {
          showMessage('Profil BUMDes berhasil disimpan & disinkronkan ke Supabase.', 'success');
        } else {
          showMessage('Profil BUMDes berhasil disimpan.', 'success');
        }
      })
      .catch(() => {
        showMessage('Profil BUMDes berhasil disimpan.', 'success');
      });
  };

  // PENGURUS HANDLERS
  const handleSavePengurus = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const nama = (formData.get('nama') as string).trim();
    const jabatan = (formData.get('jabatan') as string).trim();
    if (!nama || !jabatan) {
      showMessage('Nama dan Jabatan wajib diisi.', 'error');
      return;
    }

    const updatedList = saveStoredPengurus({
      id: editingPengurus?.id,
      nama,
      jabatan,
      periodeMulai: (formData.get('periodeMulai') as string).trim(),
      periodeSelesai: (formData.get('periodeSelesai') as string).trim(),
      status: (formData.get('status') as 'Aktif' | 'Tidak Aktif') || 'Aktif'
    });

    setPengurusModalOpen(false);
    setEditingPengurus(null);
    refreshAllData();

    // Direct instant sync to Supabase
    fetch('/api/bumdes/pengurus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList)
    })
      .then((res) => {
        if (res.ok) {
          showMessage('Data pengurus berhasil disimpan & disinkronkan ke Supabase.', 'success');
        } else {
          showMessage('Data pengurus berhasil disimpan.', 'success');
        }
      })
      .catch(() => {
        showMessage('Data pengurus berhasil disimpan.', 'success');
      });
  };

  const handleDeletePengurus = (id: string, nama: string) => {
    const updatedList = deleteStoredPengurus(id);
    refreshAllData();

    // Direct instant sync to Supabase
    fetch('/api/bumdes/pengurus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList)
    })
      .then((res) => {
        if (res.ok) {
          showMessage(`Pengurus "${nama}" berhasil dihapus dari Supabase.`, 'success');
        } else {
          showMessage(`Pengurus "${nama}" berhasil dihapus.`, 'success');
        }
      })
      .catch(() => {
        showMessage(`Pengurus "${nama}" berhasil dihapus.`, 'success');
      });
  };

  // ASET HANDLERS
  const handleSaveAset = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const nama = (formData.get('nama') as string).trim();
    const kategori = (formData.get('kategori') as string).trim();
    const nilaiStr = formData.get('nilaiPerolehan') as string;
    const nilaiPerolehan = Number(nilaiStr.replace(/[^0-9]/g, '')) || 0;

    let kuantitas: number | undefined = undefined;
    if (kategori === 'Aset Biologis') {
      const kuantitasStr = formData.get('kuantitas') as string;
      kuantitas = Number(kuantitasStr.replace(/[^0-9]/g, '')) || 0;
    }

    if (!nama || !kategori || nilaiPerolehan <= 0) {
      showMessage('Nama, Kategori, dan Nilai Perolehan valid wajib diisi.', 'error');
      return;
    }

    if (kategori === 'Aset Biologis' && (!kuantitas || kuantitas <= 0)) {
      showMessage('Khusus Aset Biologis, kuantitas/jumlah wajib diisi lebih dari 0.', 'error');
      return;
    }

    saveStoredAset({
      id: editingAset?.id,
      nama,
      kategori,
      kuantitas,
      tanggalPerolehan: formData.get('tanggalPerolehan') as string,
      nilaiPerolehan,
      kondisi: formData.get('kondisi') as string,
      keterangan: (formData.get('keterangan') as string).trim()
    });

    setAsetModalOpen(false);
    setEditingAset(null);
    refreshAllData();
    showMessage('Data aset berhasil disimpan.', 'success');
  };

  const handleDeleteAset = (id: string, nama: string) => {
    deleteStoredAset(id);
    refreshAllData();
    showMessage(`Aset "${nama}" berhasil dihapus.`, 'success');
  };

  // MODAL & KEWAJIBAN HANDLERS
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const uraian = (formData.get('uraian') as string).trim();
    const nilaiStr = formData.get('nilai') as string;
    const nilai = Number(nilaiStr.replace(/[^0-9]/g, '')) || 0;

    if (!uraian || nilai <= 0) {
      showMessage('Uraian dan Nilai valid wajib diisi.', 'error');
      return;
    }

    saveStoredModalKewajiban({
      id: editingModal?.id,
      jenis: formData.get('jenis') as 'Modal' | 'Kewajiban',
      kategori: formData.get('kategori') as string,
      uraian,
      tanggal: formData.get('tanggal') as string,
      nilai,
      status: formData.get('status') as string
    });

    setModalModalOpen(false);
    setEditingModal(null);
    refreshAllData();
    showMessage('Data berhasil disimpan.', 'success');
  };

  const handleDeleteModal = (id: string, uraian: string) => {
    if (id.startsWith('MK-PANJAR-')) {
      alert('Data utang panjar ini disinkronkan secara otomatis dari transaksi Buku Kas Harian. Untuk mengedit atau menghapusnya, silakan ubah atau hapus transaksi Panjar/Jaminan di Buku Kas Harian.');
      return;
    }
    deleteStoredModalKewajiban(id);
    refreshAllData();
    showMessage(`Data "${uraian}" berhasil dihapus.`, 'success');
  };

  // SALDO AWAL HANDLER
  const handleProcessSaldoAwal = () => {
    if (!saldoAwalTanggal) {
      showMessage('Tanggal saldo awal wajib diisi.', 'error');
      return;
    }

    const persediaanList = Object.keys(persediaanVal).map((namaItem) => ({
      namaItem,
      qty: persediaanVal[namaItem].qty,
      nilai: persediaanVal[namaItem].nilai
    }));

    const res = processSaldoAwal({
      tanggal: saldoAwalTanggal,
      kasAwal: saldoAwalKas,
      sertakanAsetTetap,
      persediaan: persediaanList
    });

    if (res.success) {
      setSyncPaused(false);
      refreshAllData(true);
      showMessage(res.message, 'success');
      setTimeout(() => {
        triggerAutoSyncToSheets(true).catch(() => {});
      }, 200);
    } else {
      showMessage(res.message, 'error');
    }
  };

  // Totals
  const totalNilaiAset = asetList.reduce((sum, a) => sum + a.nilaiPerolehan, 0);
  const totalModal = modalList.filter((m) => m.jenis === 'Modal').reduce((sum, m) => sum + m.nilai, 0);
  const totalKewajiban = modalList.filter((m) => m.jenis === 'Kewajiban' && m.status === 'Aktif').reduce((sum, m) => sum + m.nilai, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Profil BUMDes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola data profil, pengurus, aset tetap, modal & kewajiban, dan saldo awal migrasi.
          </p>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-1 no-scrollbar">
        {[
          { id: 'info', label: 'Profil Info', icon: UserCheck },
          { id: 'pengurus', label: 'Pengurus', icon: Users },
          { id: 'aset', label: 'Aset Tetap', icon: Building },
          { id: 'modal', label: 'Modal & Kewajiban', icon: Coins },
          { id: 'saldoAwal', label: 'Saldo Awal Migrasi', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB TAB: PROFIL INFO */}
      {subTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
          {profil.terakhirDiperbarui && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Terakhir diperbarui: {profil.terakhirDiperbarui}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfil} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama BUMDes</label>
                <input
                  type="text"
                  value={profil.namaBumdes}
                  onChange={(e) => setProfil({ ...profil, namaBumdes: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Unit Usaha</label>
                <input
                  type="text"
                  value={profil.unitUsaha}
                  onChange={(e) => setProfil({ ...profil, unitUsaha: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                  placeholder="Contoh: Peternakan Ayam Petelur & Penjualan Telur"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat</label>
              <input
                type="text"
                value={profil.alamat}
                onChange={(e) => setProfil({ ...profil, alamat: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Desa</label>
                <input
                  type="text"
                  value={profil.desa}
                  onChange={(e) => setProfil({ ...profil, desa: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={profil.kecamatan}
                  onChange={(e) => setProfil({ ...profil, kecamatan: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kabupaten</label>
                <input
                  type="text"
                  value={profil.kabupaten}
                  onChange={(e) => setProfil({ ...profil, kabupaten: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor SK Pendirian</label>
                <input
                  type="text"
                  value={profil.nomorSK}
                  onChange={(e) => setProfil({ ...profil, nomorSK: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Pendirian</label>
                <input
                  type="date"
                  value={profil.tanggalPendirian}
                  onChange={(e) => setProfil({ ...profil, tanggalPendirian: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun Buku Berjalan</label>
                <input
                  type="text"
                  value={profil.tahunBuku}
                  onChange={(e) => setProfil({ ...profil, tahunBuku: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB TAB: PENGURUS */}
      {subTab === 'pengurus' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Daftar Pengurus BUMDes</h3>
            <button
              onClick={() => {
                setEditingPengurus(null);
                setPengurusModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengurus</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            {pengurusList.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Belum ada data pengurus.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Nama</th>
                      <th className="py-3 px-4">Jabatan</th>
                      <th className="py-3 px-4">Periode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pengurusList.map((p, idx) => (
                      <tr key={`pgr-${p.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{p.nama}</td>
                        <td className="py-3 px-4 text-gray-700">{p.jabatan}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {p.periodeMulai} - {p.periodeSelesai}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              p.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingPengurus(p);
                              setPengurusModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePengurus(p.id, p.nama)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB: ASET TETAP */}
      {subTab === 'aset' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Daftar Aset Tetap</h3>
            <button
              onClick={() => {
                setEditingAset(null);
                setAsetKategori('Peralatan');
                setAsetModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            {asetList.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Belum ada data aset tetap.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Nama Aset</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-center">Kuantitas</th>
                      <th className="py-3 px-4">Tgl Perolehan</th>
                      <th className="py-3 px-4 text-right">Nilai Perolehan</th>
                      <th className="py-3 px-4">Kondisi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {asetList.map((a, idx) => (
                      <tr key={`ast-${a.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-semibold text-gray-900">{a.nama}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {a.kategori === 'Aset Biologis' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
                              {a.kategori}
                            </span>
                          ) : (
                            a.kategori
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-gray-800">
                          {a.kategori === 'Aset Biologis' || a.kuantitas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                              {a.kuantitas ? a.kuantitas.toLocaleString('id-ID') : 0} Ekor/Unit
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatTanggalLengkap(a.tanggalPerolehan)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatRupiah(a.nilaiPerolehan)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                            {a.kondisi}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingAset(a);
                              setAsetKategori(a.kategori || 'Peralatan');
                              setAsetModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAset(a.id, a.nama)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex justify-between items-center text-emerald-900 text-sm font-semibold">
              <span>Total Nilai Aset Tetap:</span>
              <span className="text-base font-bold">{formatRupiah(totalNilaiAset)}</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: MODAL & KEWAJIBAN */}
      {subTab === 'modal' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Daftar Modal & Kewajiban</h3>
            <button
              onClick={() => {
                setEditingModal(null);
                setModalModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Modal / Kewajiban</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            {modalList.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Belum ada data modal/kewajiban.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Jenis</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Uraian</th>
                      <th className="py-3 px-4 text-right">Nilai</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {modalList.map((m, idx) => (
                      <tr key={`mdl-${m.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              m.jenis === 'Modal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.jenis}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{m.kategori}</td>
                        <td className="py-3 px-4 font-semibold text-gray-900">{m.uraian}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatRupiah(m.nilai)}</td>
                        <td className="py-3 px-4 text-gray-600">{m.status}</td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => {
                              if (m.id.startsWith('MK-PANJAR-')) {
                                alert('Data utang panjar ini disinkronkan secara otomatis dari transaksi Buku Kas Harian. Untuk mengedit nominal, silakan ubah transaksi Panjar/Jaminan di Buku Kas Harian.');
                                return;
                              }
                              setEditingModal(m);
                              setModalModalOpen(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteModal(m.id, m.uraian)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-semibold">
              <div className="flex justify-between items-center text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span>Total Modal:</span>
                <span className="text-base font-bold">{formatRupiah(totalModal)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-100">
                <span>Total Kewajiban Aktif:</span>
                <span className="text-base font-bold">{formatRupiah(totalKewajiban)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB: SALDO AWAL MIGRATION */}
      {subTab === 'saldoAwal' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
          {saldoAwalDone ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Saldo awal sudah pernah diproses.</strong>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Proses migrasi saldo awal posisi keuangan BUMDes sudah tercatat di sistem. Anda dapat mereset di bawah ini jika ingin mengubah atau mengatur ulang nilainya.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset / Atur Ulang Migrasi</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm leading-relaxed flex justify-between items-center">
              <div>
                <strong>Form Migrasi Saldo Awal</strong>
                <p className="mt-1 text-emerald-800">
                  Isi posisi kas, persediaan, dan aset BUMDes per tanggal awal migrasi. Nilai ini otomatis menyusun saldo awal Penyertaan Modal Desa di Neraca & Jurnal Umum.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Saldo Awal</label>
                <input
                  type="date"
                  value={saldoAwalTanggal}
                  onChange={(e) => setSaldoAwalTanggal(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                  disabled={saldoAwalDone}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kas Awal (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                  <input
                    type="text"
                    value={saldoAwalKas ? formatThousandDisplay(saldoAwalKas) : ''}
                    onChange={(e) => setSaldoAwalKas(parseRupiah(e.target.value))}
                    placeholder="0"
                    className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-emerald-600 focus:outline-none"
                    disabled={saldoAwalDone}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="sertakanAset"
                checked={sertakanAsetTetap}
                onChange={(e) => setSertakanAsetTetap(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                disabled={saldoAwalDone}
              />
              <label htmlFor="sertakanAset" className="text-xs sm:text-sm font-medium text-gray-800 cursor-pointer">
                Sertakan Aset Tetap ({formatRupiah(totalNilaiAset)})
              </label>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Nilai Persediaan Awal per Item
              </h4>
              <div className="space-y-3">
                {itemsPersediaan.map((item, idx) => (
                  <div key={`prs-${item.namaItem}-${idx}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-xs font-semibold text-gray-900">{item.namaItem} ({item.satuan})</span>
                    <input
                      type="number"
                      placeholder="Qty Awal"
                      value={persediaanVal[item.namaItem]?.qty || ''}
                      onChange={(e) =>
                        setPersediaanVal({
                          ...persediaanVal,
                          [item.namaItem]: {
                            ...persediaanVal[item.namaItem],
                            qty: Number(e.target.value) || 0
                          }
                        })
                      }
                      className="h-9 px-3 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none"
                      disabled={saldoAwalDone}
                    />
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                      <input
                        type="text"
                        placeholder="Total Nilai"
                        value={persediaanVal[item.namaItem]?.nilai ? formatThousandDisplay(persediaanVal[item.namaItem]?.nilai) : ''}
                        onChange={(e) =>
                          setPersediaanVal({
                            ...persediaanVal,
                            [item.namaItem]: {
                              ...persediaanVal[item.namaItem],
                              nilai: parseRupiah(e.target.value)
                            }
                          })
                        }
                        className="h-9 pl-8 pr-2.5 w-full rounded-lg border border-gray-300 text-xs font-semibold bg-white focus:outline-none"
                        disabled={saldoAwalDone}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!saldoAwalDone && (
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleProcessSaldoAwal}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
                >
                  Proses Saldo Awal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FORM PENGURUS */}
      {pengurusModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900">
                {editingPengurus ? 'Edit Pengurus' : 'Tambah Pengurus'}
              </h3>
              <button onClick={() => setPengurusModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSavePengurus} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama</label>
                <input
                  name="nama"
                  defaultValue={editingPengurus?.nama || ''}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan</label>
                <input
                  name="jabatan"
                  defaultValue={editingPengurus?.jabatan || ''}
                  placeholder="Contoh: Ketua, Bendahara, Sekretaris"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Periode Mulai</label>
                  <input
                    name="periodeMulai"
                    defaultValue={editingPengurus?.periodeMulai || '2024'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Periode Selesai</label>
                  <input
                    name="periodeSelesai"
                    defaultValue={editingPengurus?.periodeSelesai || '2027'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editingPengurus?.status || 'Aktif'}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPengurusModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM ASET */}
      {asetModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900">{editingAset ? 'Edit Aset' : 'Tambah Aset'}</h3>
              <button onClick={() => setAsetModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveAset} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Aset</label>
                <input
                  name="nama"
                  defaultValue={editingAset?.nama || ''}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
                <select
                  name="kategori"
                  value={asetKategori}
                  onChange={(e) => setAsetKategori(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Tanah">Tanah</option>
                  <option value="Bangunan">Bangunan</option>
                  <option value="Kendaraan">Kendaraan</option>
                  <option value="Peralatan">Peralatan</option>
                  <option value="Aset Biologis">Aset Biologis (Ternak / Tanaman)</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {asetKategori === 'Aset Biologis' && (
                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 space-y-1">
                  <label className="block text-xs font-bold text-emerald-900">
                    Kuantitas / Jumlah (Ekor / Unit / Batang) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    name="kuantitas"
                    min="1"
                    defaultValue={editingAset?.kuantitas ?? 100}
                    placeholder="Masukkan jumlah ekor/unit, contoh: 500"
                    className="w-full h-10 px-3 bg-white rounded-lg border border-emerald-300 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required={asetKategori === 'Aset Biologis'}
                  />
                  <p className="text-[11px] text-emerald-700">Khusus Aset Biologis, tentukan populasi atau jumlah fisik ternak/tanaman.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tgl Perolehan</label>
                  <input
                    type="date"
                    name="tanggalPerolehan"
                    defaultValue={editingAset?.tanggalPerolehan || '2022-01-01'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nilai (Rp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                    <input
                      name="nilaiPerolehan"
                      defaultValue={editingAset?.nilaiPerolehan ? formatThousandDisplay(editingAset.nilaiPerolehan) : ''}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.value = formatThousandDisplay(target.value);
                      }}
                      placeholder="0"
                      className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kondisi</label>
                <select
                  name="kondisi"
                  defaultValue={editingAset?.kondisi || 'Baik'}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                >
                  <option value="Baik">Baik</option>
                  <option value="Cukup Baik">Cukup Baik</option>
                  <option value="Rusak Ringan">Rusak Ringan</option>
                  <option value="Rusak Berat">Rusak Berat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan</label>
                <input
                  name="keterangan"
                  defaultValue={editingAset?.keterangan || ''}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAsetModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM MODAL & KEWAJIBAN */}
      {modalModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900">{editingModal ? 'Edit Data' : 'Tambah Modal / Kewajiban'}</h3>
              <button onClick={() => setModalModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveModal} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis</label>
                  <select
                    name="jenis"
                    defaultValue={editingModal?.jenis || 'Modal'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  >
                    <option value="Modal">Modal</option>
                    <option value="Kewajiban">Kewajiban</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
                  <input
                    name="kategori"
                    defaultValue={editingModal?.kategori || 'Modal Awal'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Uraian</label>
                <input
                  name="uraian"
                  defaultValue={editingModal?.uraian || ''}
                  placeholder="Contoh: Penyertaan Modal Desa 2021"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    name="tanggal"
                    defaultValue={editingModal?.tanggal || '2023-01-01'}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nilai (Rp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                    <input
                      name="nilai"
                      defaultValue={editingModal?.nilai ? formatThousandDisplay(editingModal.nilai) : ''}
                      onInput={(e) => {
                        const target = e.currentTarget;
                        target.value = formatThousandDisplay(target.value);
                      }}
                      placeholder="0"
                      className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-sm font-semibold focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editingModal?.status || 'Aktif'}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Lunas">Lunas</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700"
                >
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reset Migrasi Saldo Awal?</h3>
                <p className="text-xs text-gray-500 font-medium">Konfirmasi Pengaturan Ulang</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
              Apakah Anda yakin ingin mereset/mengatur ulang migrasi saldo awal? Form Kas Awal & Persediaan Awal akan dibuka kembali agar nilainya bisa disesuaikan ulang.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSaldoAwal();
                  setSyncPaused(true);
                  refreshAllData(true);
                  setShowResetConfirmModal(false);
                  showMessage('Migrasi saldo awal berhasil direset. Silakan sesuaikan nilai lalu klik "Proses Saldo Awal".', 'success');
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Ya, Reset Saldo Awal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
