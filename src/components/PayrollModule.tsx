import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
  X,
  Save,
  ChevronRight
} from 'lucide-react';
import {
  Karyawan,
  PayrollQueueItem,
  PayrollDistribution
} from '../types';
import {
  getStoredKaryawan,
  saveStoredKaryawan,
  deleteStoredKaryawan,
  getPayrollQueueList,
  getStoredPayrollDistributions,
  savePayrollDistribution
} from '../lib/storage';
import { formatRupiah, formatTanggalLengkap, formatInputRupiah, parseRupiah } from '../lib/formatters';

interface PayrollModuleProps {
  onPayrollUpdated: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

type FilterStatus = 'semua' | 'pending' | 'success';

export const PayrollModule: React.FC<PayrollModuleProps> = ({
  onPayrollUpdated,
  showMessage
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('semua');
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [queueList, setQueueList] = useState<PayrollQueueItem[]>([]);

  // Employee Modal
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Karyawan | null>(null);

  // Distribution Sheet / Modal
  const [activeQueueItem, setActiveQueueItem] = useState<PayrollQueueItem | null>(null);
  const [distState, setDistState] = useState<Record<string, { workday: number; total: number }>>({});

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
    const emp = getStoredKaryawan();
    setKaryawanList(emp);
    const queue = getPayrollQueueList();
    setQueueList(queue);
    onPayrollUpdated();
  };

  // EMPLOYEE HANDLERS
  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const nama = (formData.get('nama') as string).trim();
    const keterangan = (formData.get('keterangan') as string).trim();

    const res = saveStoredKaryawan({
      id: editingEmp?.id,
      nama,
      keterangan
    });

    if (res.success) {
      setEmployeeModalOpen(false);
      setEditingEmp(null);
      refreshData();
      showMessage(res.message, 'success');
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleDeleteEmp = (id: string, nama: string) => {
    const res = deleteStoredKaryawan(id);
    refreshData();
    showMessage(res.message, 'success');
  };

  // DISTRIBUTION HANDLERS
  const handleOpenDistribution = (item: PayrollQueueItem) => {
    setActiveQueueItem(item);

    const savedDists = getStoredPayrollDistributions();
    const existing = savedDists[item.id] || (savedDists as any)[String(item.id)] || [];

    const initMap: Record<string, { workday: number; total: number }> = {};
    karyawanList.forEach((emp) => {
      const found = existing.find((d) => d.employeeId === emp.id);
      initMap[emp.id] = {
        workday: found ? found.workday : 6,
        total: found ? found.total : 0
      };
    });

    setDistState(initMap);
  };

  const handleUpdateDistWorkday = (empId: string, delta: number) => {
    setDistState((prev) => {
      const current = prev[empId] || { workday: 0, total: 0 };
      const newWorkday = Math.max(0, current.workday + delta);
      return {
        ...prev,
        [empId]: {
          ...current,
          workday: newWorkday
        }
      };
    });
  };

  const handleUpdateDistTotal = (empId: string, val: number) => {
    setDistState((prev) => {
      const current = prev[empId] || { workday: 0, total: 0 };
      return {
        ...prev,
        [empId]: {
          ...current,
          total: Math.max(0, val)
        }
      };
    });
  };

  const handleSaveDistributionSubmit = () => {
    if (!activeQueueItem) return;

    const distributions: PayrollDistribution[] = [];
    let totalAssigned = 0;

    Object.keys(distState).forEach((empId) => {
      const item = distState[empId];
      if (item.total > 0 || item.workday > 0) {
        const rate = item.workday > 0 ? item.total / item.workday : item.total;
        distributions.push({
          employeeId: empId,
          workday: item.workday,
          total: item.total,
          rate
        });
        totalAssigned += item.total;
      }
    });

    if (distributions.length === 0) {
      showMessage('Isi nominal gaji minimal untuk 1 karyawan.', 'error');
      return;
    }

    const res = savePayrollDistribution(activeQueueItem.id, distributions);
    if (res.success) {
      setActiveQueueItem(null);
      refreshData();
      showMessage(res.message, 'success');
    }
  };

  const totalAssignedInModal: number = (Object.values(distState) as { workday: number; total: number }[]).reduce((sum, d) => sum + (d?.total || 0), 0);
  const nominalAnggaran = activeQueueItem?.nominal || 0;
  const selisihNominalModal = nominalAnggaran - totalAssignedInModal;

  const filteredQueue = queueList.filter((q) => {
    if (filterStatus === 'pending') return q.status === 'empty';
    if (filterStatus === 'success') return q.status === 'success';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title & Employee Manager Button */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pembagian Gaji Karyawan</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Bagi anggaran gaji dari transaksi Buku Kas Harian ke masing-masing karyawan BUMDes.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingEmp(null);
            setEmployeeModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Kelola Master Karyawan</span>
        </button>
      </div>

      {/* Queue Filters */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'semua', label: 'Semua Antrean' },
          { id: 'pending', label: 'Belum Dibagi' },
          { id: 'success', label: 'Sudah Dibagi' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id as FilterStatus)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              filterStatus === f.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {filteredQueue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 text-sm">
            Tidak ada transaksi gaji/upah dalam antrean. Catat transaksi pengeluaran dengan keterangan <strong>"Upah Tenaga/ Gaji Karyawan"</strong> atau kata kunci gaji/upah di Buku Kas Harian terlebih dahulu.
          </div>
        ) : (
          filteredQueue.map((item, idx) => (
            <div
              key={`q-${item.id}-${idx}`}
              onClick={() => handleOpenDistribution(item)}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">#{item.id}</span>
                  <span className="text-xs font-semibold text-gray-500">{formatTanggalLengkap(item.tanggal)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'success' ? 'Sudah Dibagi' : 'Belum Dibagi'}
                  </span>
                </div>
                <h4 className="font-bold text-gray-900 text-base">{item.keterangan}</h4>
                <p className="text-xs text-gray-500">Anggaran Kas: <strong className="text-emerald-700">{formatRupiah(item.nominal)}</strong></p>
              </div>

              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs sm:text-sm">
                <span>Atur Pembagian</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* MASTER KARYAWAN MODAL */}
      {employeeModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900">Kelola Master Karyawan</h3>
              <button onClick={() => setEmployeeModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Employee Form */}
            <form onSubmit={handleSaveEmp} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase">
                {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Karyawan</label>
                <input
                  name="nama"
                  defaultValue={editingEmp?.name || ''}
                  placeholder="Nama Lengkap"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan / Posisi</label>
                <input
                  name="keterangan"
                  defaultValue={editingEmp?.description || ''}
                  placeholder="Contoh: Operator Mesin Giling"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingEmp && (
                  <button
                    type="button"
                    onClick={() => setEditingEmp(null)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700"
                  >
                    Batal
                  </button>
                )}
                <button type="submit" className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold">
                  {editingEmp ? 'Perbarui' : 'Tambah'}
                </button>
              </div>
            </form>

            {/* Employee List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase">Daftar Karyawan ({karyawanList.length})</h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {karyawanList.map((emp, idx) => (
                  <div key={`emp1-${emp.id}-${idx}`} className="p-3 bg-white flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <strong className="block text-xs sm:text-sm text-gray-900">{emp.name}</strong>
                      <span className="text-[11px] text-gray-500">{emp.id} • {emp.description}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingEmp(emp)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmp(emp.id, emp.name)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISTRIBUTION MODAL / BOTTOM SHEET */}
      {activeQueueItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Pembagian Gaji Karyawan</h3>
                <p className="text-xs text-gray-500">
                  #{activeQueueItem.id} • {formatTanggalLengkap(activeQueueItem.tanggal)}
                </p>
              </div>
              <button onClick={() => setActiveQueueItem(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Budget Status Widget */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Anggaran Kas Harian:</span>
                <strong className="text-emerald-950 font-bold">{formatRupiah(nominalAnggaran)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Dibagikan:</span>
                <strong className="text-emerald-800 font-bold">{formatRupiah(totalAssignedInModal)}</strong>
              </div>

              <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold">
                <span>Status Selisih:</span>
                <span
                  className={
                    selisihNominalModal === 0
                      ? 'text-emerald-700'
                      : selisihNominalModal > 0
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }
                >
                  {selisihNominalModal === 0
                    ? 'Pas (Sesuai Anggaran)'
                    : selisihNominalModal > 0
                    ? `Sisa Anggaran: ${formatRupiah(selisihNominalModal)}`
                    : `Melebihi Anggaran: ${formatRupiah(Math.abs(selisihNominalModal))}`}
                </span>
              </div>
            </div>

            {/* Karyawan Distribution Inputs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Input Hari Kerja & Total Gaji</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {karyawanList.map((emp, idx) => {
                  const state = distState[emp.id] || { workday: 0, total: 0 };
                  return (
                    <div
                      key={`emp2-${emp.id}-${idx}`}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <strong className="block text-xs sm:text-sm text-gray-900">{emp.name}</strong>
                        <span className="text-[11px] text-gray-500">{emp.description}</span>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        {/* Workday Spinner */}
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateDistWorkday(emp.id, -1)}
                            className="px-2.5 py-1 text-xs font-bold hover:bg-gray-100 cursor-pointer text-gray-700"
                            title="Kurangi Hari Kerja"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-semibold text-gray-800 min-w-[48px] text-center">
                            {state.workday} Hari
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateDistWorkday(emp.id, 1)}
                            className="px-2.5 py-1 text-xs font-bold hover:bg-gray-100 cursor-pointer text-gray-700"
                            title="Tambah Hari Kerja"
                          >
                            +
                          </button>
                        </div>

                        {/* Total Nominal Input */}
                        <input
                          type="text"
                          value={state.total ? formatInputRupiah(state.total) : ''}
                          onChange={(e) => handleUpdateDistTotal(emp.id, parseRupiah(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Rp 0"
                          className="w-32 sm:w-36 h-9 px-2.5 rounded-lg border border-gray-300 text-xs font-bold text-right bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveDistributionSubmit}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-colors shadow-xs cursor-pointer"
              >
                Simpan Pembagian Gaji
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
