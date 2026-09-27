import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  ArrowLeft,
  X,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Calendar,
  Plus,
  AlertCircle,
  Boxes,
  Table,
  Printer,
  FileSpreadsheet,
  Egg,
  Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TransaksiKas, MasterTransaksi, ItemPersediaan } from '../types';
import {
  getStoredMasterTransaksi,
  getStoredDraftKas,
  setStoredDraftKas,
  saveTransaksiKasBulk,
  getStoredTransaksiKas,
  deleteStoredTransaksiKas,
  updateStoredTransaksiKas,
  getStoredPersediaan,
  getStoredAset,
  isSalaryTransaction,
  getSaldoAwalCutOffDate
} from '../lib/storage';
import {
  formatRupiah,
  formatSignedRupiah,
  formatAngka,
  formatTanggalDisplay,
  formatTanggalLengkap,
  formatDateToYYYYMMDD,
  getTodayYYYYMMDD
} from '../lib/formatters';

export const isBeliPakan = (ket?: string | null): boolean => {
  const l = (ket || '').trim().toLowerCase();
  return l.includes('beli pakan') || l.includes('pembelian pakan') || (l.includes('pakan') && !l.includes('konsumsi') && !l.includes('pemakaian'));
};

interface BukuKasModuleProps {
  onDraftCountChange: (count: number) => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const BukuKasModule: React.FC<BukuKasModuleProps> = ({
  onDraftCountChange,
  showMessage
}) => {
  // Master categories
  const [masterList, setMasterList] = useState<MasterTransaksi[]>([]);

  // View state: 'form' | 'histori'
  const [view, setView] = useState<'form' | 'histori'>('form');

  // Histori view style: 'table' (Manual BUMDes Telur layout) | 'cards'
  const [historiViewStyle, setHistoriViewStyle] = useState<'table' | 'cards'>('table');

  // Form State
  const [tanggal, setTanggal] = useState<string>(() => getTodayYYYYMMDD());
  const [keterangan, setKeterangan] = useState<string>('');
  const [tambahanKeterangan, setTambahanKeterangan] = useState<string>('');
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Dynamic Transaction Types
  const [selectedJenis, setSelectedJenis] = useState<'Pemasukan' | 'Pengeluaran' | ''>('');
  const [selectedMetode, setSelectedMetode] = useState<'QtyHarga' | 'Nominal' | ''>('');
  const [isNewKeterangan, setIsNewKeterangan] = useState(false);

  // Qty x Price State
  const [qty, setQty] = useState<string>('');
  const [harga, setHarga] = useState<string>('');
  const [adaPenyesuaian, setAdaPenyesuaian] = useState(false);
  const [kasAktual, setKasAktual] = useState<string>('');

  // Nominal State
  const [nominal, setNominal] = useState<string>('');

  const formatThousandDisplay = (val: string) => {
    if (!val) return '';
    const digits = val.replace(/[^0-9]/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toLocaleString('id-ID');
  };

  const handleThousandChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const digits = e.target.value.replace(/[^0-9]/g, '');
    setter(digits);
  };

  // Draft List (Cart)
  const [drafts, setDrafts] = useState<TransaksiKas[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // History State
  const [historiList, setHistoriList] = useState<TransaksiKas[]>([]);
  const [persediaanList, setPersediaanList] = useState<ItemPersediaan[]>([]);
  const [historiBulan, setHistoriBulan] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [historiJenis, setHistoriJenis] = useState<string>('Semua');
  const [historiSearch, setHistoriSearch] = useState<string>('');
  const [selectedHistoriDetail, setSelectedHistoriDetail] = useState<TransaksiKas | null>(null);

  // Edit Histori State
  const [editingHistoriItem, setEditingHistoriItem] = useState<TransaksiKas | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editJenis, setEditJenis] = useState<'Pemasukan' | 'Pengeluaran'>('Pemasukan');
  const [editMetode, setEditMetode] = useState<'QtyHarga' | 'Nominal'>('Nominal');
  const [editQty, setEditQty] = useState('');
  const [editHarga, setEditHarga] = useState('');
  const [editNominal, setEditNominal] = useState('');
  const [editAdaPenyesuaian, setEditAdaPenyesuaian] = useState(false);
  const [editKasAktual, setEditKasAktual] = useState('');
  const [editTambahanKeterangan, setEditTambahanKeterangan] = useState('');

  const refreshComponentData = () => {
    const masters = getStoredMasterTransaksi();
    setMasterList(masters);

    const savedDrafts = getStoredDraftKas();
    setDrafts(savedDrafts);
    onDraftCountChange(savedDrafts.length);

    const savedKas = getStoredTransaksiKas();
    setHistoriList(savedKas);

    setPersediaanList(getStoredPersediaan());
  };

  useEffect(() => {
    refreshComponentData();

    const handleDataUpdated = () => {
      refreshComponentData();
    };

    window.addEventListener('bumdes_data_updated', handleDataUpdated);
    return () => {
      window.removeEventListener('bumdes_data_updated', handleDataUpdated);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeteranganChange = (val: string) => {
    setKeterangan(val);
    setIsAutocompleteOpen(true);

    if (!val.trim()) {
      setSelectedJenis('');
      setSelectedMetode('');
      setIsNewKeterangan(false);
      return;
    }

    const found = masterList.find(
      (m) => m.keterangan.toLowerCase().trim() === val.toLowerCase().trim()
    );

    if (found) {
      setSelectedJenis(found.jenis);
      setSelectedMetode(isBeliPakan(found.keterangan) ? 'QtyHarga' : found.metode);
      setIsNewKeterangan(false);
    } else {
      setIsNewKeterangan(true);
      const lower = val.toLowerCase();
      if (!selectedJenis) {
        if (
          lower.includes('jual') ||
          lower.includes('terima') ||
          lower.includes('pendapatan') ||
          lower.includes('pemasukan') ||
          lower.includes('panen')
        ) {
          setSelectedJenis('Pemasukan');
        } else {
          setSelectedJenis('Pengeluaran');
        }
      }
      if (!selectedMetode) {
        if (
          lower.includes('kg') ||
          lower.includes('jual') ||
          lower.includes('panen') ||
          lower.includes('ayam') ||
          lower.includes('mati') ||
          lower.includes('dipotong') ||
          lower.includes('pakan')
        ) {
          setSelectedMetode('QtyHarga');
        } else {
          setSelectedMetode('Nominal');
        }
      }

      if (isBeliPakan(val)) {
        setSelectedJenis('Pengeluaran');
        setSelectedMetode('QtyHarga');
      } else if (lower.includes('ayam mati') || lower.includes('kematian') || lower.includes('dipotong')) {
        setSelectedJenis('Pengeluaran');
        setSelectedMetode('QtyHarga');
        const asetList = getStoredAset();
        const bioAset = asetList.find(
          (a) =>
            a.kategori === 'Aset Biologis' ||
            a.nama.toLowerCase().includes('populasi ayam') ||
            a.nama.toLowerCase().includes('aset biologis')
        );
        const unitCost =
          bioAset && Number(bioAset.kuantitas) > 0
            ? Math.round(Number(bioAset.nilaiPerolehan) / Number(bioAset.kuantitas))
            : 0;
        if (!harga && unitCost > 0) {
          setHarga(String(unitCost));
        }
      } else if (lower.includes('pembelian ayam') || lower.includes('beli ayam') || lower.includes('pembelian pullet')) {
        setSelectedJenis('Pengeluaran');
        setSelectedMetode('QtyHarga');
      }
    }
  };

  const handleSelectAutocomplete = (item: MasterTransaksi) => {
    setKeterangan(item.keterangan);
    setSelectedJenis(item.jenis);
    setSelectedMetode(isBeliPakan(item.keterangan) ? 'QtyHarga' : item.metode);
    setIsNewKeterangan(false);
    setIsAutocompleteOpen(false);

    const lower = item.keterangan.toLowerCase();
    if (lower.includes('ayam mati') || lower.includes('kematian') || lower.includes('dipotong')) {
      const asetList = getStoredAset();
      const bioAset = asetList.find(
        (a) =>
          a.kategori === 'Aset Biologis' ||
          a.nama.toLowerCase().includes('populasi ayam') ||
          a.nama.toLowerCase().includes('aset biologis')
      );
      const unitCost =
        bioAset && Number(bioAset.kuantitas) > 0
          ? Math.round(Number(bioAset.nilaiPerolehan) / Number(bioAset.kuantitas))
          : 0;
      if (unitCost > 0) {
        setHarga(String(unitCost));
      }
    }
  };

  const handleClearKeterangan = () => {
    setKeterangan('');
    setSelectedJenis('');
    setSelectedMetode('');
    setIsNewKeterangan(false);
    setQty('');
    setHarga('');
    setNominal('');
    setAdaPenyesuaian(false);
    setKasAktual('');
  };

  // Calculation helpers
  const numQty = parseFloat(qty) || 0;
  const numHarga = parseFloat(harga) || 0;
  const totalPerhitungan = numQty * numHarga;

  const numKasAktual = parseFloat(kasAktual) || totalPerhitungan;
  const selisihPenyesuaian = numKasAktual - totalPerhitungan;

  const numNominal = parseFloat(nominal) || 0;

  // Helper to build a transaction item from form inputs
  const buildTransactionFromForm = (): TransaksiKas | null => {
    if (!tanggal) {
      showMessage('Tanggal transaksi wajib diisi.', 'error');
      return null;
    }
    if (!keterangan.trim()) {
      showMessage('Keterangan transaksi wajib diisi.', 'error');
      return null;
    }

    const cutOff = getSaldoAwalCutOffDate();
    const isSaldoAwalEntry =
      keterangan.toLowerCase().includes('saldo awal') ||
      tambahanKeterangan.toLowerCase().includes('migrasi saldo awal');

    if (cutOff && !isSaldoAwalEntry && formatDateToYYYYMMDD(tanggal) < cutOff) {
      showMessage(
        `Perhatian Cut-Off Migrasi: Tanggal transaksi (${formatTanggalDisplay(tanggal)}) berada sebelum tanggal cut-off saldo awal (${formatTanggalDisplay(cutOff)}). Transaksi tidak boleh mendahului titik awal migrasi.`,
        'error'
      );
      return null;
    }

    let effectiveJenis = selectedJenis;
    let effectiveMetode = selectedMetode;

    if (!effectiveJenis) {
      const lower = keterangan.toLowerCase();
      if (
        lower.includes('jual') ||
        lower.includes('terima') ||
        lower.includes('pendapatan') ||
        lower.includes('pemasukan') ||
        lower.includes('panen')
      ) {
        effectiveJenis = 'Pemasukan';
      } else {
        effectiveJenis = 'Pengeluaran';
      }
    }

    if (!effectiveMetode) {
      effectiveMetode = numQty > 0 || numHarga > 0 ? 'QtyHarga' : 'Nominal';
    }

    let itemQty: number | '' = '';
    let itemHarga: number | '' = '';
    let itemTotal: number | '' = '';
    let itemKasAktual = 0;
    let itemNominal = 0;

    let panenKg: number = 0;
    let jualKg: number = 0;

    const lowerKet = keterangan.trim().toLowerCase();
    const isBeliAyam =
      lowerKet.includes('pembelian ayam') ||
      lowerKet.includes('beli ayam') ||
      lowerKet.includes('pembelian pullet') ||
      lowerKet.includes('pembelian bibit');
    const isAyamMati =
      lowerKet.includes('ayam mati') ||
      lowerKet.includes('pencatatan ayam mati') ||
      lowerKet.includes('kematian ayam') ||
      lowerKet.includes('ayam dipotong');

    if (lowerKet.includes('panen')) {
      if (numQty <= 0) {
        showMessage('Jumlah Kg telur yang dipanen harus lebih dari 0.', 'error');
        return null;
      }
      panenKg = numQty;
      itemQty = numQty;
      itemHarga = 0;
      itemTotal = 0;
      itemKasAktual = 0;
      itemNominal = 0;
    } else if (lowerKet.includes('jual')) {
      if (numQty <= 0) {
        showMessage('Jumlah Kg telur yang dijual harus lebih dari 0.', 'error');
        return null;
      }
      const totalJual = numNominal > 0 ? numNominal : (numQty * numHarga);
      if (totalJual <= 0) {
        showMessage('Total uang yang didapat dari penjualan telur harus lebih dari 0.', 'error');
        return null;
      }
      jualKg = numQty;
      itemQty = numQty;
      itemHarga = numQty > 0 ? Math.round(totalJual / numQty) : 0;
      itemTotal = totalJual;
      itemKasAktual = totalJual;
      itemNominal = totalJual;
      effectiveJenis = 'Pemasukan';
      effectiveMetode = 'QtyHarga';
    } else if (isBeliPakan(keterangan)) {
      if (numQty <= 0) {
        showMessage('Jumlah Kg pakan yang dibeli harus lebih dari 0.', 'error');
        return null;
      }
      const totalBeli = numNominal > 0 ? numNominal : (numQty * numHarga);
      if (totalBeli <= 0) {
        showMessage('Total uang yang dikeluarkan untuk pembelian pakan harus lebih dari 0.', 'error');
        return null;
      }
      itemQty = numQty;
      itemHarga = numQty > 0 ? Math.round(totalBeli / numQty) : 0;
      itemTotal = totalBeli;
      itemKasAktual = totalBeli;
      itemNominal = totalBeli;
      effectiveJenis = 'Pengeluaran';
      effectiveMetode = 'QtyHarga';
    } else if (isAyamMati) {
      if (numQty <= 0) {
        showMessage('Jumlah ekor ayam mati / dipotong harus lebih dari 0.', 'error');
        return null;
      }
      const asetList = getStoredAset();
      const bioAset = asetList.find(
        (a) =>
          a.kategori === 'Aset Biologis' ||
          a.nama.toLowerCase().includes('populasi ayam') ||
          a.nama.toLowerCase().includes('aset biologis')
      );
      const unitCost =
        bioAset && Number(bioAset.kuantitas) > 0
          ? Math.round(Number(bioAset.nilaiPerolehan) / Number(bioAset.kuantitas))
          : 0;
      const effectiveHarga = numHarga > 0 ? numHarga : unitCost;
      const totalBebanMati = numQty * effectiveHarga;

      itemQty = numQty;
      itemHarga = effectiveHarga;
      itemTotal = totalBebanMati;
      itemKasAktual = 0; // Non-cash loss
      itemNominal = totalBebanMati; // Nominal recorded for journal
      effectiveJenis = 'Pengeluaran';
      effectiveMetode = 'QtyHarga';
    } else if (isBeliAyam) {
      if (numQty <= 0) {
        showMessage('Jumlah ekor ayam yang dibeli harus lebih dari 0.', 'error');
        return null;
      }
      itemQty = numQty;
      itemHarga = numHarga;
      itemTotal = totalPerhitungan;
      itemKasAktual = adaPenyesuaian ? numKasAktual : totalPerhitungan;
      itemNominal = itemKasAktual;
      effectiveJenis = 'Pengeluaran';
      effectiveMetode = 'QtyHarga';
    } else if (effectiveMetode === 'QtyHarga') {
      if (numQty <= 0) {
        showMessage('Qty (kuantitas) harus lebih dari 0.', 'error');
        return null;
      }
      itemQty = numQty;
      itemHarga = numHarga;
      itemTotal = totalPerhitungan;
      itemKasAktual = adaPenyesuaian ? numKasAktual : totalPerhitungan;
      itemNominal = itemKasAktual;
    } else {
      if (numNominal <= 0) {
        showMessage('Jumlah nominal transaksi harus lebih dari 0.', 'error');
        return null;
      }
      itemKasAktual = numNominal;
      itemNominal = numNominal;
    }

    return {
      tanggal,
      keterangan: keterangan.trim(),
      tambahanKeterangan: tambahanKeterangan.trim(),
      panenQty: panenKg > 0 ? panenKg : '',
      jualQty: jualKg > 0 ? jualKg : '',
      jenis: effectiveJenis as 'Pemasukan' | 'Pengeluaran',
      metode: effectiveMetode as 'QtyHarga' | 'Nominal',
      isNewKeterangan,
      qty: itemQty,
      hargaSatuan: itemHarga,
      totalPerhitungan: itemTotal,
      adaPenyesuaian,
      kasAktual: itemKasAktual,
      penyesuaian: adaPenyesuaian ? selisihPenyesuaian : 0,
      nominalAktual: itemNominal,
      debit: effectiveJenis === 'Pemasukan' ? itemNominal : 0,
      kredit: effectiveJenis === 'Pengeluaran' ? (isAyamMati ? 0 : itemNominal) : 0
    };
  };

  // Direct 1-Click Save to Buku Kas
  const handleDirectSave = () => {
    const tx = buildTransactionFromForm();
    if (!tx) return;

    const res = saveTransaksiKasBulk([tx]);
    if (res.success) {
      setHistoriList(getStoredTransaksiKas());
      setMasterList(getStoredMasterTransaksi());
      showMessage(`✓ Transaksi "${tx.keterangan}" BERHASIL DISIMPAN ke Buku Kas Harian!`, 'success');
      handleClearKeterangan();
      setTambahanKeterangan('');
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleAddOrUpdateDraft = () => {
    const newDraft = buildTransactionFromForm();
    if (!newDraft) return;

    let updatedDrafts: TransaksiKas[];
    if (editingIndex !== null) {
      updatedDrafts = drafts.map((d, i) => (i === editingIndex ? newDraft : d));
      setEditingIndex(null);
      showMessage('Transaksi diperbarui di daftar sementara.', 'success');
    } else {
      updatedDrafts = [...drafts, newDraft];
      showMessage('Transaksi ditambahkan ke daftar sementara (keranjang).', 'success');
    }

    setDrafts(updatedDrafts);
    setStoredDraftKas(updatedDrafts);
    onDraftCountChange(updatedDrafts.length);

    handleClearKeterangan();
    setTambahanKeterangan('');
  };

  const handleEditDraft = (index: number) => {
    const item = drafts[index];
    if (!item) return;

    setEditingIndex(index);
    setTanggal(item.tanggal);
    setKeterangan(item.keterangan);
    setTambahanKeterangan(item.tambahanKeterangan || '');
    setSelectedJenis(item.jenis);
    setSelectedMetode(item.metode);
    setIsNewKeterangan(!!item.isNewKeterangan);

    if (item.keterangan.toLowerCase().includes('jual') || isBeliPakan(item.keterangan)) {
      setQty(String(item.jualQty || item.qty || ''));
      setNominal(String(item.nominalAktual || item.kasAktual || ''));
      setHarga(String(item.hargaSatuan || ''));
    } else if (item.keterangan.toLowerCase().includes('panen')) {
      setQty(String(item.panenQty || item.qty || ''));
    } else if (item.metode === 'QtyHarga') {
      setQty(String(item.qty || ''));
      setHarga(String(item.hargaSatuan || ''));
      setAdaPenyesuaian(!!item.adaPenyesuaian);
      setKasAktual(String(item.kasAktual || ''));
    } else {
      setNominal(String(item.nominalAktual || ''));
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = (index: number) => {
    const itemToDelete = drafts[index];
    if (!itemToDelete) return;

    const updated = drafts.filter((_, i) => i !== index);
    setDrafts(updated);
    setStoredDraftKas(updated);
    onDraftCountChange(updated.length);
    if (editingIndex === index) {
      setEditingIndex(null);
      handleClearKeterangan();
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
    showMessage(`Transaksi "${itemToDelete.keterangan}" telah dihapus dari keranjang.`, 'success');
  };

  const handleClearAllDrafts = () => {
    if (drafts.length === 0) return;
    setDrafts([]);
    setStoredDraftKas([]);
    onDraftCountChange(0);
    setEditingIndex(null);
    handleClearKeterangan();
    showMessage('Daftar transaksi sementara berhasil dikosongkan.', 'success');
  };

  const handleSaveAllDrafts = () => {
    if (drafts.length === 0) return;
    const count = drafts.length;
    const res = saveTransaksiKasBulk(drafts);
    if (res.success) {
      setDrafts([]);
      setStoredDraftKas([]);
      onDraftCountChange(0);
      setMasterList(getStoredMasterTransaksi());
      setHistoriList(getStoredTransaksiKas());
      setPersediaanList(getStoredPersediaan());
      setEditingIndex(null);
      handleClearKeterangan();
      showMessage(`✓ BERHASIL! ${count} transaksi telah disimpan ke Buku Kas Harian.`, 'success');
    } else {
      showMessage(res.message, 'error');
    }
  };

  // Histori Edit & Delete Handlers
  const handleStartEditHistori = (item: TransaksiKas) => {
    setEditingHistoriItem(item);
    setEditTanggal(item.tanggal);
    setEditKeterangan(item.keterangan);
    setEditJenis(isBeliPakan(item.keterangan) ? 'Pengeluaran' : item.jenis);
    setEditMetode(isBeliPakan(item.keterangan) ? 'QtyHarga' : item.metode);
    setEditQty(item.qty !== undefined && item.qty !== null ? String(item.qty) : '');
    setEditHarga(item.hargaSatuan !== undefined && item.hargaSatuan !== null ? String(item.hargaSatuan) : '');
    setEditNominal(String(item.nominalAktual || item.kredit || item.debit || 0));
    setEditAdaPenyesuaian(!!item.adaPenyesuaian);
    setEditKasAktual(item.nominalAktual !== undefined && item.nominalAktual !== null ? String(item.nominalAktual) : '');
    setEditTambahanKeterangan(item.tambahanKeterangan || '');
  };

  const handleSaveEditHistori = () => {
    if (!editingHistoriItem) return;
    if (!editTanggal) {
      showMessage('Tanggal transaksi wajib diisi.', 'error');
      return;
    }
    if (!editKeterangan.trim()) {
      showMessage('Keterangan transaksi wajib diisi.', 'error');
      return;
    }

    let finalNominal = 0;
    let qNum: number | undefined = undefined;
    let hNum: number | undefined = undefined;

    const lowerEditKet = editKeterangan.toLowerCase();
    const isEditBeliPakan = isBeliPakan(editKeterangan);

    if (lowerEditKet.includes('jual') || isEditBeliPakan) {
      qNum = parseFloat(editQty) || 0;
      finalNominal = parseFloat(editNominal) || parseFloat(editKasAktual) || ((qNum) * (parseFloat(editHarga) || 0));
      hNum = qNum > 0 ? Math.round(finalNominal / qNum) : (parseFloat(editHarga) || 0);
    } else if (editMetode === 'QtyHarga') {
      qNum = parseFloat(editQty) || 0;
      hNum = parseFloat(editHarga) || 0;
      const totalCalc = qNum * hNum;
      finalNominal = editAdaPenyesuaian ? (parseFloat(editKasAktual) || totalCalc) : totalCalc;
    } else {
      finalNominal = parseFloat(editNominal) || 0;
    }

    const effectiveJenis = isEditBeliPakan ? 'Pengeluaran' : editJenis;
    const effectiveMetode = isEditBeliPakan ? 'QtyHarga' : editMetode;

    const updated: TransaksiKas = {
      ...editingHistoriItem,
      tanggal: editTanggal,
      keterangan: editKeterangan,
      jenis: effectiveJenis,
      metode: effectiveMetode,
      qty: qNum,
      hargaSatuan: hNum,
      adaPenyesuaian: editAdaPenyesuaian,
      nominalAktual: finalNominal,
      debit: effectiveJenis === 'Pemasukan' ? finalNominal : 0,
      kredit: effectiveJenis === 'Pengeluaran' ? finalNominal : 0,
      tambahanKeterangan: editTambahanKeterangan
    };

    const res = updateStoredTransaksiKas(updated);
    if (res.success) {
      showMessage(res.message, 'success');
      setEditingHistoriItem(null);
      setSelectedHistoriDetail(null);
      refreshComponentData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  const handleDeleteHistori = (item: TransaksiKas) => {
    if (!item) return;
    const targetId = item.id || String(item.rowNumber);
    const res = deleteStoredTransaksiKas(targetId);
    if (res.success) {
      showMessage(res.message, 'success');
      setSelectedHistoriDetail(null);
      setEditingHistoriItem(null);
      refreshComponentData();
    } else {
      showMessage(res.message, 'error');
    }
  };

  // Draft Totals
  const draftTotalMasuk = drafts.reduce((sum, d) => sum + (d.jenis === 'Pemasukan' ? d.nominalAktual : 0), 0);
  const draftTotalKeluar = drafts.reduce((sum, d) => sum + (d.jenis === 'Pengeluaran' ? d.nominalAktual : 0), 0);
  const draftSelisih = draftTotalMasuk - draftTotalKeluar;

  // History Filtered Items
  const filteredHistori = historiList.filter((item) => {
    const itemTgl = String(item.tanggal || '');
    const monthMatch = !historiBulan || itemTgl.startsWith(historiBulan);
    const jenisMatch = historiJenis === 'Semua' || item.jenis === historiJenis;
    const searchMatch =
      !historiSearch.trim() ||
      item.keterangan.toLowerCase().includes(historiSearch.toLowerCase().trim()) ||
      (item.tambahanKeterangan && item.tambahanKeterangan.toLowerCase().includes(historiSearch.toLowerCase().trim()));
    return monthMatch && jenisMatch && searchMatch;
  });

  // Calculate Running Balances for Manual Table view (Sisa Telur & Saldo Berjalan)
  // Sort ALL transactions chronologically (ascending by date, then ID/rowNumber)
  const sortedChronologicalAll = [...historiList].sort((a, b) => {
    const dComp = String(a.tanggal || '').localeCompare(String(b.tanggal || ''));
    if (dComp !== 0) return dComp;
    return (a.rowNumber || 0) - (b.rowNumber || 0);
  });

  // Map chronological items with running Sisa Telur (Kg) and Saldo Berjalan (Rp)
  let runningEggStockKg = 0;
  let runningCashBalanceRp = 0;

  const chronologicalWithRunning = sortedChronologicalAll.map((item) => {
    const isPanen = item.keterangan.toLowerCase().includes('panen');
    const isJual = item.keterangan.toLowerCase().includes('jual');

    const panenVal = item.panenQty !== undefined && item.panenQty !== ''
      ? Number(item.panenQty)
      : isPanen ? Number(item.qty || 0) : 0;

    const jualVal = item.jualQty !== undefined && item.jualQty !== ''
      ? Number(item.jualQty)
      : isJual ? Number(item.qty || 0) : 0;

    runningEggStockKg = runningEggStockKg + panenVal - jualVal;
    if (runningEggStockKg < 0) runningEggStockKg = 0;

    const masukRp = item.debit || (item.jenis === 'Pemasukan' ? item.nominalAktual : 0);
    const keluarRp = item.kredit || (item.jenis === 'Pengeluaran' ? item.nominalAktual : 0);

    runningCashBalanceRp = runningCashBalanceRp + masukRp - keluarRp;

    return {
      ...item,
      panenQtyCalculated: panenVal,
      jualQtyCalculated: jualVal,
      sisaTelurCalculated: runningEggStockKg,
      saldoBerjalanCalculated: runningCashBalanceRp
    };
  });

  // Filter the calculated chronological list for current view
  const chronologicalFiltered = chronologicalWithRunning.filter((item) => {
    const itemTgl = String(item.tanggal || '');
    const monthMatch = !historiBulan || itemTgl.startsWith(historiBulan);
    const jenisMatch = historiJenis === 'Semua' || item.jenis === historiJenis;
    const searchMatch =
      !historiSearch.trim() ||
      item.keterangan.toLowerCase().includes(historiSearch.toLowerCase().trim()) ||
      (item.tambahanKeterangan && item.tambahanKeterangan.toLowerCase().includes(historiSearch.toLowerCase().trim()));
    return monthMatch && jenisMatch && searchMatch;
  });

  const historiTotalMasuk = filteredHistori.reduce((sum, h) => sum + h.debit, 0);
  const historiTotalKeluar = filteredHistori.reduce((sum, h) => sum + h.kredit, 0);
  const historiSelisih = historiTotalMasuk - historiTotalKeluar;

  // Group history by date
  const groupedHistori = filteredHistori.reduce((acc, item) => {
    const tglKey = String(item.tanggal || 'Unspecified');
    acc[tglKey] = acc[tglKey] || [];
    acc[tglKey].push(item);
    return acc;
  }, {} as Record<string, TransaksiKas[]>);

  const sortedDates = Object.keys(groupedHistori).sort().reverse();

  const filteredMasterOptions = masterList.filter(
    (m) => !keterangan.trim() || m.keterangan.toLowerCase().includes(keterangan.toLowerCase().trim())
  );

  const exportManualTableExcel = () => {
    const excelRows = chronologicalFiltered.map((row, i) => ({
      'No': i + 1,
      'TGL': formatTanggalDisplay(row.tanggal),
      'JUMLAH Telur yang dipanen (Kg)': row.panenQtyCalculated > 0 ? row.panenQtyCalculated : '',
      'Jual Telur (Kg)': row.jualQtyCalculated > 0 ? row.jualQtyCalculated : '',
      'Sisa Telur Setelah Penjualan (Kg)': row.sisaTelurCalculated,
      'Total Uang yang Didapat (Rp)': row.debit > 0 ? row.debit : '',
      'Saldo Berjalan (Rp)': row.saldoBerjalanCalculated,
      'Pengeluaran (Rp)': row.kredit > 0 ? row.kredit : '',
      'Keterangan': row.tambahanKeterangan ? `${row.keterangan} (${row.tambahanKeterangan})` : row.keterangan
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Harian Telur');
    XLSX.writeFile(wb, `Buku_Kas_Harian_Telur_${historiBulan || 'Semua'}.xlsx`);
    showMessage('Export Buku Kas Harian Telur ke Excel berhasil!', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* View Switcher Header */}
      {view === 'form' ? (
        <div className="space-y-6">
          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Egg className="w-6 h-6 text-amber-600 shrink-0" />
                  <h2 className="text-xl font-bold text-gray-900">Buku Kas Harian BUMDes - Peternakan Telur</h2>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Catat transaksi panen telur, penjualan telur, pembelian pakan, dan biaya operasional.
                </p>
              </div>

              <button
                onClick={() => setView('histori')}
                className="w-11 h-11 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Lihat Tabel Buku Kas Harian"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>

            {editingIndex !== null && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm text-blue-900 font-semibold flex items-center justify-between">
                <span>Anda sedang mengedit transaksi #{editingIndex + 1}</span>
                <button
                  onClick={() => {
                    setEditingIndex(null);
                    handleClearKeterangan();
                  }}
                  className="text-xs text-blue-700 underline cursor-pointer"
                >
                  Batal Edit
                </button>
              </div>
            )}

            <div className="space-y-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Transaksi (TGL)</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Keterangan Autocomplete */}
              <div className="relative" ref={autocompleteRef}>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Keterangan Transaksi</label>
                  <span className="text-[11px] text-gray-500">Pilih rekomendasi transaksi atau ketik sendiri</span>
                </div>

                {/* Quick preset chips based on user instructions */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {masterList.map((chip, idx) => (
                    <button
                      key={`${chip.keterangan}-${idx}`}
                      type="button"
                      onClick={() => handleKeteranganChange(chip.keterangan)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        keterangan === chip.keterangan
                          ? 'bg-emerald-700 text-white border-emerald-800'
                          : 'bg-gray-100 hover:bg-emerald-100 text-gray-800 border-gray-200'
                      }`}
                    >
                      + {chip.keterangan}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={keterangan}
                    onChange={(e) => handleKeteranganChange(e.target.value)}
                    onFocus={() => setIsAutocompleteOpen(true)}
                    placeholder="Contoh: Jual Telur, Panen Telur, Beli pakan, Biaya operasional..."
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                  {keterangan && (
                    <button
                      type="button"
                      onClick={handleClearKeterangan}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isAutocompleteOpen && filteredMasterOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-40 divide-y divide-gray-100">
                    {filteredMasterOptions.map((item, idx) => (
                      <button
                        key={`${item.keterangan}-${idx}`}
                        type="button"
                        onClick={() => handleSelectAutocomplete(item)}
                        className="w-full text-left p-3 hover:bg-emerald-50/60 transition-colors flex justify-between items-center cursor-pointer"
                      >
                        <div>
                          <span className="block text-xs font-bold text-gray-900">{item.keterangan}</span>
                          <span className="text-[11px] text-gray-500">
                            {item.jenis} • Debit: {item.debitAccount || '-'} • Kredit: {item.kreditAccount || '-'}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                          {item.kelompok}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Notice Banner for Telur */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                  <div className="flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Informasi Stok Persediaan Telur & Pakan Saat Ini</span>
                  </div>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    Realtime BUMDes
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {persediaanList.map((item, idx) => (
                    <div key={`${item.namaItem}-${idx}`} className="bg-white p-2.5 rounded-xl border border-amber-100 shadow-2xs">
                      <span className="block text-[11px] font-bold text-gray-800 truncate">{item.namaItem}</span>
                      <span className="block text-sm font-extrabold text-amber-900 mt-0.5">
                        {formatAngka(item.saldoQty)} <span className="text-[10px] font-semibold text-gray-500">{item.satuan}</span>
                      </span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        Acuan: {formatRupiah(item.hargaJualAcuan)}/{item.satuan}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tambahan Keterangan / Nama Pembeli */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan / Nama Pembeli / Rincian <span className="text-gray-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={tambahanKeterangan}
                  onChange={(e) => setTambahanKeterangan(e.target.value)}
                  placeholder='Contoh: "Bu Lurah", "Kandang Baterai A", "Beli 2 Karung Pakan", dll.'
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Dynamic Input based on Selected Keterangan */}
              {keterangan.trim().toLowerCase().includes('panen') ? (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                    <Egg className="w-4 h-4 text-emerald-700" />
                    <span>Pencatatan Panen Telur Harian (Kg)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Telur yang Dipanen (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="Contoh: 50"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm bg-white font-bold focus:border-emerald-600 focus:outline-none"
                    />
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Pencatatan panen telur akan menambah stok persediaan telur tanpa merubah saldo kas.
                    </p>
                  </div>
                </div>
              ) : keterangan.trim().toLowerCase().includes('ayam mati') ||
                keterangan.trim().toLowerCase().includes('kematian') ||
                keterangan.trim().toLowerCase().includes('dipotong') ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Jumlah Ayam Mati / Dipotong (Ekor)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Contoh: 5"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-bold focus:border-emerald-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Harga Satuan Otomatis Aset Biologis (Rp/Ekor)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(harga)}
                          onChange={(e) => handleThousandChange(e, setHarga)}
                          placeholder="Auto dari Aset Tetap"
                          className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-emerald-600 focus:outline-none bg-amber-50/60"
                        />
                      </div>
                      <p className="text-[11px] text-amber-900 mt-1">
                        Dihitung dari (Nilai Perolehan / Kuantitas) Aset Biologis di subtab Modal & Aset Tetap.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      Total Beban Kematian Aset Biologis (Rp)
                    </span>
                    <span className="text-xl font-bold text-amber-950">
                      {formatRupiah((parseFloat(qty) || 0) * (parseFloat(harga) || 0))}
                    </span>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Penjurnalan otomatis — Debit: <strong>Beban Kematian Aset Biologis</strong> | Kredit: <strong>Aset Biologis</strong>. Mengurangi populasi & nilai perolehan di subtab Modal & Aset Tetap tanpa memotong saldo kas.
                    </p>
                  </div>
                </div>
              ) : keterangan.trim().toLowerCase().includes('pembelian ayam') ||
                keterangan.trim().toLowerCase().includes('beli ayam') ||
                keterangan.trim().toLowerCase().includes('pembelian pullet') ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Qty Ayam yang Dibeli (Ekor)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Contoh: 100"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-bold focus:border-emerald-600 focus:outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Harga Satuan per Ekor (Rp)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(harga)}
                          onChange={(e) => handleThousandChange(e, setHarga)}
                          placeholder="70.000"
                          className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-emerald-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Total Biaya Pembelian Ayam (Rp)
                      </span>
                      <span className="text-xl font-bold text-emerald-950">{formatRupiah(totalPerhitungan)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1 font-medium">
                    Otomatis menambah kuantitas dan nilai perolehan Aset Biologis di subtab Modal & Aset Tetap.
                  </p>
                </div>
              ) : keterangan.trim().toLowerCase().includes('jual') ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Jumlah Telur Dijual (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Contoh: 10"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-bold focus:border-emerald-600 focus:outline-none bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Total Uang yang Didapat / Pemasukan (Rp)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(nominal)}
                          onChange={(e) => handleThousandChange(e, setNominal)}
                          placeholder="Contoh: 250.000"
                          className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-bold text-emerald-950 focus:border-emerald-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {numQty > 0 && (parseFloat(nominal) || 0) > 0 && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs font-medium text-emerald-900">
                      <span>Rata-rata Harga Satuan Hasil Kalkulasi:</span>
                      <span className="font-extrabold text-emerald-950 text-sm">
                        {formatRupiah(Math.round((parseFloat(nominal) || 0) / numQty))} / Kg
                      </span>
                    </div>
                  )}
                </div>
              ) : isBeliPakan(keterangan) ? (
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <Boxes className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Pencatatan Pembelian Pakan Ayam</span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Menambah Stok Pakan
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Jumlah Pakan yang Dibeli (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Contoh: 50"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm font-bold focus:border-emerald-600 focus:outline-none bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Total Uang yang Dikeluarkan (Rp)
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(nominal)}
                          onChange={(e) => handleThousandChange(e, setNominal)}
                          placeholder="Contoh: 350.000"
                          className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-bold text-rose-950 focus:border-emerald-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {numQty > 0 && (parseFloat(nominal) || 0) > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center text-xs font-medium text-amber-900">
                      <span>Rata-rata Harga Beli Satuan Hasil Kalkulasi:</span>
                      <span className="font-extrabold text-amber-950 text-sm">
                        {formatRupiah(Math.round((parseFloat(nominal) || 0) / numQty))} / Kg
                      </span>
                    </div>
                  )}
                </div>
              ) : selectedMetode === 'QtyHarga' ? (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Qty (Kuantitas)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Contoh: 8"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-300 text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Satuan (Rp)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(harga)}
                          onChange={(e) => handleThousandChange(e, setHarga)}
                          placeholder="22.500"
                          className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-emerald-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                        Total Perhitungan (Rp)
                      </span>
                      <span className="text-xl font-bold text-emerald-950">{formatRupiah(totalPerhitungan)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdaPenyesuaian(!adaPenyesuaian)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      {adaPenyesuaian ? 'Batalkan Penyesuaian' : 'Sesuaikan Kas Aktual'}
                    </button>
                  </div>

                  {adaPenyesuaian && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                      <label className="block text-xs font-semibold text-gray-700">Jumlah Kas Aktual Diterima (Rp)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(kasAktual)}
                          onChange={(e) => handleThousandChange(e, setKasAktual)}
                          placeholder="0"
                          className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 text-sm font-semibold bg-white focus:outline-none"
                        />
                      </div>
                      <div className="text-xs font-semibold text-gray-600">
                        Selisih: <span className="text-emerald-700 font-bold">{formatSignedRupiah(selisihPenyesuaian)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {selectedJenis === 'Pemasukan'
                      ? 'Total Uang yang Didapat / Pemasukan (Rp)'
                      : 'Jumlah Pengeluaran (Rp)'}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                    <input
                      type="text"
                      value={formatThousandDisplay(nominal)}
                      onChange={(e) => handleThousandChange(e, setNominal)}
                      placeholder="0"
                      className="w-full h-11 pl-9 pr-3.5 rounded-xl border border-gray-300 text-sm font-semibold focus:border-emerald-600 focus:outline-none bg-white"
                    />
                  </div>
                  {isSalaryTransaction({ keterangan, jenis: selectedJenis }) && (
                    <div className="mt-3 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-900 text-xs font-medium">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Transaksi <strong>gaji / upah tenaga</strong> ini akan otomatis masuk ke antrean di <strong>Modul Gaji Karyawan</strong> untuk dibagi ke masing-masing pekerja.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleDirectSave}
                  className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Langsung ke Buku Kas</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddOrUpdateDraft}
                  className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{editingIndex !== null ? 'Perbarui di Draft' : 'Tambah ke Keranjang/Draft'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Draft Card (Cart) */}
          {drafts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">Transaksi Sementara</h3>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                    {drafts.length} transaksi
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllDrafts}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Kosongkan Keranjang
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-gray-100">
                {drafts.map((item, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-3">
                    <div className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <strong className="block text-sm text-gray-900">{item.keterangan}</strong>
                        <span className="block text-xs text-gray-500">
                          {formatTanggalDisplay(item.tanggal)}
                          {item.panenQty ? ` • Panen: ${item.panenQty} Kg` : ''}
                          {item.jualQty ? ` • Jual: ${item.jualQty} Kg` : ''}
                          {isBeliPakan(item.keterangan) && item.qty ? ` • Beli: ${item.qty} Kg` : ''}
                          {item.tambahanKeterangan && ` • Catatan: ${item.tambahanKeterangan}`}
                        </span>
                        <span
                          className={`inline-block mt-1 text-xs font-bold ${
                            item.jenis === 'Pemasukan' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {item.jenis === 'Pemasukan' ? 'Pemasukan: ' : 'Pengeluaran: '}
                          {formatRupiah(item.nominalAktual)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDraft(idx);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Edit transaksi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDraft(idx);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pemasukan:</span>
                  <strong className="text-emerald-700">{formatRupiah(draftTotalMasuk)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Pengeluaran:</span>
                  <strong className="text-rose-700">{formatRupiah(draftTotalKeluar)}</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                  <span>Selisih Kas:</span>
                  <span>{formatSignedRupiah(draftSelisih)}</span>
                </div>
              </div>

              <button
                onClick={handleSaveAllDrafts}
                className="w-full py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl font-bold text-sm transition-colors shadow-xs cursor-pointer"
              >
                Simpan Semua Transaksi ({drafts.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        /* HISTORI VIEW - MANUAL BUMDES TELUR TABLE FORMAT */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('form')}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Buku Kas Harian Manual BUMDes - Telur</h2>
                <p className="text-xs text-gray-500">
                  Format tabel pembukuan harian persediaan telur & kas BUMDes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setHistoriViewStyle('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  historiViewStyle === 'table'
                    ? 'bg-emerald-800 text-white border-emerald-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Tabel Manual</span>
              </button>
              <button
                onClick={() => setHistoriViewStyle('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                  historiViewStyle === 'cards'
                    ? 'bg-emerald-800 text-white border-emerald-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>Kartu Transaksi</span>
              </button>

              <button
                onClick={exportManualTableExcel}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

          {/* History Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historiSearch}
                onChange={(e) => setHistoriSearch(e.target.value)}
                placeholder="Cari transaksi atau nama pembeli..."
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={historiJenis}
                onChange={(e) => setHistoriJenis(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
              >
                <option value="Semua">Semua Jenis Transaksi</option>
                <option value="Pemasukan">Pemasukan / Kas Masuk</option>
                <option value="Pengeluaran">Pengeluaran / Kas Keluar</option>
              </select>

              <input
                type="month"
                value={historiBulan}
                onChange={(e) => setHistoriBulan(e.target.value)}
                className="h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* RENDER TABLE MANUAL MODE */}
          {historiViewStyle === 'table' ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tabel Buku Kas Harian Peternakan Telur ({chronologicalFiltered.length} Transaksi)
                </span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Saldo Kas Akhir: {formatRupiah(chronologicalWithRunning.length > 0 ? chronologicalWithRunning[chronologicalWithRunning.length - 1].saldoBerjalanCalculated : 0)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-900 text-white font-bold divide-x divide-emerald-800">
                      <th className="p-3 text-center whitespace-nowrap">TGL</th>
                      <th className="p-3 text-center whitespace-nowrap bg-emerald-800">JUMLAH Telur yang dipanen (Kg)</th>
                      <th className="p-3 text-center whitespace-nowrap bg-emerald-800">Jual Telur (Kg)</th>
                      <th className="p-3 text-center whitespace-nowrap bg-amber-700">Sisa telur setelah penjualan (Kg)</th>
                      <th className="p-3 text-right whitespace-nowrap bg-emerald-800">Total uang yang didapat (Rp)</th>
                      <th className="p-3 text-right whitespace-nowrap bg-emerald-950">Saldo berjalan (Rp)</th>
                      <th className="p-3 text-right whitespace-nowrap bg-rose-900">Pengeluaran (Rp)</th>
                      <th className="p-3 min-w-[160px]">Keterangan</th>
                      <th className="p-3 text-center w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chronologicalFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">
                          Tidak ada transaksi yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      chronologicalFiltered.map((row, idx) => (
                        <tr key={`tbl-${row.id}-${idx}`} className="hover:bg-amber-50/40 divide-x divide-gray-100 transition-colors">
                          <td className="p-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                            {formatTanggalDisplay(row.tanggal)}
                          </td>
                          <td className="p-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                            {row.panenQtyCalculated > 0 ? `${formatAngka(row.panenQtyCalculated)} Kg` : '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-sky-700 bg-sky-50/30">
                            {row.jualQtyCalculated > 0 ? `${formatAngka(row.jualQtyCalculated)} Kg` : '-'}
                          </td>
                          <td className="p-3 text-center font-extrabold text-amber-950 bg-amber-100/50">
                            {formatAngka(row.sisaTelurCalculated)} Kg
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {row.debit > 0 ? formatRupiah(row.debit) : '-'}
                          </td>
                          <td className="p-3 text-right font-black text-gray-950 bg-gray-50 whitespace-nowrap">
                            {formatRupiah(row.saldoBerjalanCalculated)}
                          </td>
                          <td className="p-3 text-right font-bold text-rose-700 whitespace-nowrap">
                            {row.kredit > 0 ? formatRupiah(row.kredit) : '-'}
                          </td>
                          <td className="p-3 text-gray-900 font-medium">
                            <span className="block font-bold">{row.keterangan}</span>
                            {isBeliPakan(row.keterangan) && row.qty ? (
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                Beli: {formatAngka(row.qty)} Kg ({formatRupiah(row.hargaSatuan || Math.round((row.nominalAktual || row.kredit || 0) / (row.qty || 1)))}/Kg)
                              </span>
                            ) : null}
                            {row.tambahanKeterangan && (
                              <span className="block text-[11px] text-gray-500">"{row.tambahanKeterangan}"</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditHistori(row)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHistori(row)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* RENDER CARDS MODE */
            <div className="space-y-4">
              {sortedDates.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
                  Tidak ada transaksi kas yang sesuai filter.
                </div>
              ) : (
                sortedDates.map((dateStr) => (
                  <div key={dateStr} className="space-y-2">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                      {formatTanggalLengkap(dateStr)}
                    </div>
                    <div className="space-y-2">
                      {groupedHistori[dateStr].map((item, idx) => (
                        <div
                          key={`hist-${item.id}-${idx}`}
                          onClick={() => setSelectedHistoriDetail(item)}
                          className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer flex justify-between items-center gap-3"
                        >
                          <div>
                            <strong className="block text-sm text-gray-900">{item.keterangan}</strong>
                            <span className="text-xs text-gray-500">
                              {item.panenQty ? `Panen: ${item.panenQty} Kg` : ''}
                              {item.jualQty ? `Jual: ${item.jualQty} Kg` : ''}
                              {isBeliPakan(item.keterangan) && item.qty ? `Beli: ${formatAngka(item.qty)} Kg` : ''}
                              {item.tambahanKeterangan && ` • ${item.tambahanKeterangan}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <strong
                                className={`block text-sm font-bold ${
                                  item.jenis === 'Pemasukan' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {formatRupiah(item.nominalAktual)}
                              </strong>
                              <span className="text-[10px] text-gray-400">{item.jenis}</span>
                            </div>
                            <div className="flex items-center gap-1 pl-2 border-l border-gray-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditHistori(item);
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Edit Transaksi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteHistori(item);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL TRANSAKSI HISTORI */}
      {selectedHistoriDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-gray-900">Detail Transaksi</h3>
                <p className="text-xs text-gray-500">Informasi pencatatan Buku Kas Telur</p>
              </div>
              <button onClick={() => setSelectedHistoriDetail(null)} className="p-1 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2 text-xs sm:text-sm divide-y divide-gray-100">
              <div className="pt-2 flex justify-between">
                <span className="text-gray-500">Tanggal:</span>
                <strong className="text-gray-900">{formatTanggalLengkap(selectedHistoriDetail.tanggal)}</strong>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-gray-500">Keterangan:</span>
                <strong className="text-gray-900">{selectedHistoriDetail.keterangan}</strong>
              </div>
              {selectedHistoriDetail.tambahanKeterangan && (
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500">Keterangan Tambahan:</span>
                  <strong className="text-gray-900">{selectedHistoriDetail.tambahanKeterangan}</strong>
                </div>
              )}
              {selectedHistoriDetail.panenQty ? (
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500">Jumlah Panen:</span>
                  <strong className="text-emerald-700 font-bold">{selectedHistoriDetail.panenQty} Kg</strong>
                </div>
              ) : null}
              {selectedHistoriDetail.jualQty ? (
                <div className="pt-2 flex justify-between">
                  <span className="text-gray-500">Jumlah Dijual:</span>
                  <strong className="text-sky-700 font-bold">{selectedHistoriDetail.jualQty} Kg</strong>
                </div>
              ) : null}
              {isBeliPakan(selectedHistoriDetail.keterangan) && selectedHistoriDetail.qty ? (
                <>
                  <div className="pt-2 flex justify-between">
                    <span className="text-gray-500">Jumlah Pakan Dibeli:</span>
                    <strong className="text-amber-800 font-bold">{formatAngka(selectedHistoriDetail.qty)} Kg</strong>
                  </div>
                  {selectedHistoriDetail.hargaSatuan ? (
                    <div className="pt-2 flex justify-between">
                      <span className="text-gray-500">Harga Beli Satuan:</span>
                      <strong className="text-gray-900">{formatRupiah(selectedHistoriDetail.hargaSatuan)} / Kg</strong>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="pt-2 flex justify-between text-base font-bold text-emerald-900">
                <span>Jumlah Uang:</span>
                <span>{formatRupiah(selectedHistoriDetail.nominalAktual)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  const target = selectedHistoriDetail;
                  setSelectedHistoriDetail(null);
                  handleStartEditHistori(target);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Transaksi</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteHistori(selectedHistoriDetail)}
                className="px-3 py-2.5 border border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedHistoriDetail(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT TRANSAKSI HISTORI */}
      {editingHistoriItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Edit Transaksi Buku Kas</h3>
                <p className="text-xs text-gray-500">Perubahan akan langsung mensinkronkan data Buku Kas & Persediaan</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingHistoriItem(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan Transaksi</label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                  placeholder="Keterangan transaksi"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Transaksi</label>
                  <select
                    value={editJenis}
                    onChange={(e) => setEditJenis(e.target.value as 'Pemasukan' | 'Pengeluaran')}
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                  >
                    <option value="Pemasukan">Pemasukan / Kas Masuk</option>
                    <option value="Pengeluaran">Pengeluaran / Kas Keluar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cara Pencatatan</label>
                  <select
                    value={editMetode}
                    onChange={(e) => setEditMetode(e.target.value as 'QtyHarga' | 'Nominal')}
                    className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                  >
                    <option value="QtyHarga">Qty × Harga Satuan</option>
                    <option value="Nominal">Nominal Langsung</option>
                  </select>
                </div>
              </div>

              {editKeterangan.toLowerCase().includes('jual') ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Telur Dijual (Kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-bold bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Uang (Rp)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(editNominal)}
                          onChange={(e) => handleThousandChange(e, setEditNominal)}
                          placeholder="0"
                          className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-bold text-emerald-950 bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {(parseFloat(editQty) || 0) > 0 && (parseFloat(editNominal) || 0) > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs">
                      <span className="text-gray-600">Rata-rata Harga Satuan:</span>
                      <span className="font-bold text-emerald-800">
                        {formatRupiah(Math.round((parseFloat(editNominal) || 0) / (parseFloat(editQty) || 1)))} / Kg
                      </span>
                    </div>
                  )}
                </div>
              ) : isBeliPakan(editKeterangan) ? (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Pakan Dibeli (Kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-bold bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Uang Dikeluarkan (Rp)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(editNominal)}
                          onChange={(e) => handleThousandChange(e, setEditNominal)}
                          placeholder="0"
                          className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-bold text-rose-950 bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {(parseFloat(editQty) || 0) > 0 && (parseFloat(editNominal) || 0) > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-xs">
                      <span className="text-gray-600">Rata-rata Harga Beli Satuan:</span>
                      <span className="font-bold text-amber-900">
                        {formatRupiah(Math.round((parseFloat(editNominal) || 0) / (parseFloat(editQty) || 1)))} / Kg
                      </span>
                    </div>
                  )}
                </div>
              ) : editMetode === 'QtyHarga' ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Qty (Kg / Satuan)</label>
                      <input
                        type="number"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-xs sm:text-sm bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Harga Satuan (Rp)</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                        <input
                          type="text"
                          value={formatThousandDisplay(editHarga)}
                          onChange={(e) => handleThousandChange(e, setEditHarga)}
                          placeholder="0"
                          className="w-full h-10 pl-8 pr-3 rounded-lg border border-gray-300 text-xs sm:text-sm font-semibold bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-xs">
                    <span className="text-gray-600">Total Hitungan:</span>
                    <span className="font-bold text-gray-900">
                      {formatRupiah((parseFloat(editQty) || 0) * (parseFloat(editHarga) || 0))}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nominal Transaksi (Rp)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-gray-500 pointer-events-none">Rp</span>
                    <input
                      type="text"
                      value={formatThousandDisplay(editNominal)}
                      onChange={(e) => handleThousandChange(e, setEditNominal)}
                      placeholder="0"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 text-xs sm:text-sm font-semibold bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan Tambahan / Nama Pembeli</label>
                <input
                  type="text"
                  value={editTambahanKeterangan}
                  onChange={(e) => setEditTambahanKeterangan(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setEditingHistoriItem(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditHistori}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
