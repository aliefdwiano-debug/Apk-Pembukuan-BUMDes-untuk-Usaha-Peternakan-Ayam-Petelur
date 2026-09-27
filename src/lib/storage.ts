import {
  BumdesProfil,
  Pengurus,
  AsetTetap,
  ModalKewajiban,
  MasterTransaksi,
  TransaksiKas,
  Karyawan,
  PayrollDistribution,
  PayrollQueueItem,
  ItemPersediaan,
  LogProduksi,
  StockOpnameEntry,
  ProductHppAllocation,
  HppBreakdownBulanan,
  JurnalUmumEntry,
  RincianSewaGapoktanItem
} from '../types';

import {
  initialProfil,
  initialPengurus,
  initialAset,
  initialModalKewajiban,
  initialMasterTransaksi,
  initialKaryawan,
  initialItemPersediaan,
  initialTransaksiKas,
  initialLogProduksi,
  initialPayrollDistributions
} from '../data/initialData';

import { getTodayYYYYMMDD, formatDateToYYYYMMDD, formatTanggalDisplay } from './formatters';

const KEYS = {
  PROFIL: 'bumdes_profil_v2',
  PENGURUS: 'bumdes_pengurus_v2',
  ASET: 'bumdes_aset_v2',
  MODAL: 'bumdes_modal_v2',
  MASTER_TRANSAKSI: 'bumdes_master_transaksi_v2',
  TRANSAKSI_KAS: 'bumdes_transaksi_kas_v2',
  DRAFT_KAS: 'bumdes_buku_kas_draft_v1',
  KARYAWAN: 'bumdes_karyawan_v2',
  PAYROLL_DISTRIBUTIONS: 'bumdes_payroll_distributions_v2',
  PERSEDIAAN: 'bumdes_persediaan_v2',
  LOG_PRODUKSI: 'bumdes_log_produksi_v2',
  STOCK_OPNAME: 'bumdes_stock_opname_v2',
  SALDO_AWAL_DONE: 'bumdes_saldo_awal_done_v2',
  SERTAKAN_ASET_TETAP: 'bumdes_sertakan_aset_tetap_v2',
  SALDO_AWAL_DATE: 'bumdes_saldo_awal_date_v2',
  GAS_URL: 'bumdes_gas_url_v1'
};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    return JSON.parse(saved) as T;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

let lastLocalMutationTime = 0;

export function setLastLocalMutationTime(): void {
  lastLocalMutationTime = Date.now();
}

export function getLastLocalMutationTime(): number {
  return lastLocalMutationTime;
}

export function notifyDataChanged(skipAutoSync = false): void {
  if (!skipAutoSync) {
    lastLocalMutationTime = Date.now();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bumdes_data_updated'));
    if (!skipAutoSync) {
      window.dispatchEvent(new Event('bumdes_auto_sync_request'));
    }
  }
}

export function overwriteStoredProfilDirect(profil: BumdesProfil): void {
  setItem(KEYS.PROFIL, profil);
}

export function overwriteStoredStockOpname(entries: StockOpnameEntry[], skipAutoSync = false): void {
  setItem(KEYS.STOCK_OPNAME, entries);
  notifyDataChanged(skipAutoSync);
}

export function getStoredSaldoAwalDate(): string {
  return getItem<string>(KEYS.SALDO_AWAL_DATE, '2026-08-08');
}

export function setStoredSaldoAwalDate(date: string, skipSync = false): void {
  setItem(KEYS.SALDO_AWAL_DATE, date);
  notifyDataChanged(skipSync);
}

export function setSaldoAwalDone(done: boolean, skipSync = false): void {
  setItem(KEYS.SALDO_AWAL_DONE, done);
  notifyDataChanged(skipSync);
}

export function setSertakanAsetTetapEnabled(val: boolean, skipSync = false): void {
  setItem(KEYS.SERTAKAN_ASET_TETAP, val);
  notifyDataChanged(skipSync);
}

export const getStoredKas = getStoredTransaksiKas;
export const getMasterTransaksi = getStoredMasterTransaksi;
export const overwriteMasterTransaksi = overwriteStoredMasterTransaksi;
export const overwritePayrollDistributions = overwriteStoredPayrollDistributions;
export const getPayrollDistributions = getStoredPayrollDistributions;
export const getStockOpnameEntries = getStoredStockOpname;
export const overwriteStockOpname = overwriteStoredStockOpname;
export const isSaldoAwalDone = isSaldoAwalProcessed;
export const isSertakanAsetTetapEnabled = getStoredSertakanAsetTetap;

// PROFIL BUMDES
export function getStoredProfil(): BumdesProfil {
  return getItem<BumdesProfil>(KEYS.PROFIL, initialProfil);
}

export function saveStoredProfil(data: Partial<BumdesProfil>): BumdesProfil {
  const current = getStoredProfil();
  const updated: BumdesProfil = {
    ...current,
    ...data,
    terakhirDiperbarui: new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  setItem(KEYS.PROFIL, updated);
  notifyDataChanged();
  return updated;
}

export function overwriteStoredKas(kasList: TransaksiKas[], skipAutoSync = false): void {
  setItem(KEYS.TRANSAKSI_KAS, kasList);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredKaryawan(karyawanList: Karyawan[], skipAutoSync = false): void {
  setItem(KEYS.KARYAWAN, karyawanList);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredPersediaan(persediaanList: ItemPersediaan[], skipAutoSync = false): void {
  setItem(KEYS.PERSEDIAAN, persediaanList);
  notifyDataChanged(skipAutoSync);
}

export function updateHargaAcuanItem(namaItem: string, hargaJualAcuan: number): { success: boolean; message: string } {
  const current = getStoredPersediaan();
  const updated = current.map((i) => (i.namaItem === namaItem ? { ...i, hargaJualAcuan } : i));
  setItem(KEYS.PERSEDIAAN, updated);
  notifyDataChanged();
  return { success: true, message: `Harga acuan ${namaItem} berhasil diperbarui.` };
}

export function overwriteStoredAset(asetList: AsetTetap[], skipAutoSync = false): void {
  setItem(KEYS.ASET, asetList);
  syncSaldoAwalAndModalWithAset();
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredPengurus(pengurusList: Pengurus[], skipAutoSync = false): void {
  setItem(KEYS.PENGURUS, pengurusList);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredMasterTransaksi(masterList: MasterTransaksi[], skipAutoSync = false): void {
  setItem(KEYS.MASTER_TRANSAKSI, masterList);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredModalKewajiban(modalList: ModalKewajiban[], skipAutoSync = false): void {
  setItem(KEYS.MODAL, modalList);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredPayrollDistributions(payrollMap: Record<number, PayrollDistribution[]>, skipAutoSync = false): void {
  setItem(KEYS.PAYROLL_DISTRIBUTIONS, payrollMap);
  notifyDataChanged(skipAutoSync);
}

export function overwriteStoredLogProduksi(logs: LogProduksi[], skipAutoSync = false): void {
  setItem(KEYS.LOG_PRODUKSI, logs);
  notifyDataChanged(skipAutoSync);
}

// PENGURUS
export function getStoredPengurus(): Pengurus[] {
  return getItem<Pengurus[]>(KEYS.PENGURUS, initialPengurus);
}

export function saveStoredPengurus(item: Omit<Pengurus, 'id'> & { id?: string }): Pengurus[] {
  const current = getStoredPengurus();
  let updated: Pengurus[];
  if (item.id) {
    updated = current.map(p => (p.id === item.id ? (item as Pengurus) : p));
  } else {
    const newId = `PGR-${String(current.length + 1).padStart(3, '0')}`;
    updated = [...current, { ...item, id: newId }];
  }
  setItem(KEYS.PENGURUS, updated);
  notifyDataChanged();
  return updated;
}

export function deleteStoredPengurus(id: string): Pengurus[] {
  const current = getStoredPengurus();
  const updated = current.filter(p => p.id !== id);
  setItem(KEYS.PENGURUS, updated);
  notifyDataChanged();
  return updated;
}

// ASET TETAP
export function getStoredAset(): AsetTetap[] {
  return getItem<AsetTetap[]>(KEYS.ASET, initialAset);
}

export function syncSaldoAwalAndModalWithAset(): void {
  if (!isSaldoAwalProcessed()) return;
  const sertakanAset = getStoredSertakanAsetTetap();
  if (!sertakanAset) return;

  const currentAset = getStoredAset();
  const totalNilaiAset = currentAset.reduce((sum, a) => sum + (Number(a.nilaiPerolehan) || 0), 0);

  const items = getStoredPersediaan();
  const totalNilaiPersediaanAwal = items.reduce((sum, item) => {
    const isGabah = item.namaItem.toLowerCase().includes('gabah');
    const hpp = isGabah ? 6800 : item.hargaJualAcuan * 0.75;
    return sum + item.saldoQty * hpp;
  }, 0);

  const allKas = getStoredTransaksiKas();
  const kasAwalEntry = allKas.find(
    (k) =>
      k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
      k.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
      k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
  );
  const kasAwalNominal = kasAwalEntry ? kasAwalEntry.nominalAktual : 0;
  const totalModalAwalExpected = kasAwalNominal + totalNilaiPersediaanAwal + totalNilaiAset;
  const currentYear = new Date().getFullYear().toString();

  const currentModal = getItem<ModalKewajiban[]>(KEYS.MODAL, initialModalKewajiban);
  let found = false;
  const updatedModal = currentModal.map((m) => {
    if (
      m.id === 'MK-SALDO-AWAL-AUTO' ||
      m.uraian.toLowerCase().includes('saldo awal kas & persediaan') ||
      m.uraian.toLowerCase().includes('saldo awal kas, persediaan')
    ) {
      found = true;
      return {
        ...m,
        uraian: `Penyertaan Modal Desa ${currentYear} (Saldo Awal Kas, Persediaan & Aset Tetap)`,
        nilai: Math.round(totalModalAwalExpected)
      };
    }
    return m;
  });

  if (!found) {
    updatedModal.push({
      id: 'MK-SALDO-AWAL-AUTO',
      jenis: 'Modal',
      kategori: 'Modal Awal',
      uraian: `Penyertaan Modal Desa ${currentYear} (Saldo Awal Kas, Persediaan & Aset Tetap)`,
      tanggal: `${currentYear}-01-01`,
      nilai: Math.round(totalModalAwalExpected),
      status: 'Aktif'
    });
  }

  setItem(KEYS.MODAL, updatedModal);
}

export function saveStoredAset(item: Omit<AsetTetap, 'id'> & { id?: string }): AsetTetap[] {
  const current = getStoredAset();
  let updated: AsetTetap[];
  if (item.id) {
    updated = current.map(a => (a.id === item.id ? (item as AsetTetap) : a));
  } else {
    const newId = `AST-${String(current.length + 1).padStart(3, '0')}`;
    updated = [...current, { ...item, id: newId }];
  }
  setItem(KEYS.ASET, updated);
  syncSaldoAwalAndModalWithAset();
  notifyDataChanged();
  return updated;
}

export function deleteStoredAset(id: string): AsetTetap[] {
  const current = getStoredAset();
  const updated = current.filter(a => a.id !== id);
  setItem(KEYS.ASET, updated);
  syncSaldoAwalAndModalWithAset();
  notifyDataChanged();
  return updated;
}

export function getDefaultPopulasiAyam(): number {
  const asetList = getStoredAset();
  const bioAset = asetList.filter(
    (a) =>
      a.kategori === 'Aset Biologis' ||
      a.nama.toLowerCase().includes('populasi ayam') ||
      a.nama.toLowerCase().includes('aset biologis')
  );
  const totalQty = bioAset.reduce((sum, a) => sum + (Number(a.kuantitas) || 0), 0);
  return totalQty > 0 ? totalQty : 950;
}

// MODAL & KEWAJIBAN
export function getStoredModalKewajiban(): ModalKewajiban[] {
  const current = getItem<ModalKewajiban[]>(KEYS.MODAL, initialModalKewajiban);

  // Filter out any previously auto-generated panjar entries from current
  let filtered = current.filter((m) => !m.id.startsWith('MK-PANJAR-'));

  const isDone = isSaldoAwalProcessed();

  if (!isDone) {
    filtered = filtered.filter(
      (m) =>
        m.id !== 'MK-SALDO-AWAL-AUTO' &&
        !m.uraian.toLowerCase().includes('saldo awal kas & persediaan') &&
        !m.uraian.toLowerCase().includes('saldo awal kas, persediaan')
    );
  } else {
    // Auto-calculate initial assets valuation for Modal Desa offset
    const items = getStoredPersediaan();
    const totalNilaiPersediaanAwal = items.reduce((sum, item) => {
      const isGabah = item.namaItem.toLowerCase().includes('gabah');
      const hpp = isGabah ? 6800 : item.hargaJualAcuan * 0.75;
      return sum + item.saldoQty * hpp;
    }, 0);

    const allKas = getStoredTransaksiKas();
    const kasAwalEntry = allKas.find(
      (k) =>
        k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
        k.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
        k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
    );
    const kasAwalNominal = kasAwalEntry ? kasAwalEntry.nominalAktual : 0;
    const sertakanAset = getStoredSertakanAsetTetap();
    const asetList = getStoredAset();
    const totalNilaiAset = sertakanAset ? asetList.reduce((sum, a) => sum + (Number(a.nilaiPerolehan) || 0), 0) : 0;
    const totalModalAwalExpected = kasAwalNominal + totalNilaiPersediaanAwal + totalNilaiAset;
    const currentYear = new Date().getFullYear().toString();

    let foundModalAwal = false;

    filtered = filtered.map((m) => {
      if (
        m.id === 'MK-SALDO-AWAL-AUTO' ||
        m.uraian.toLowerCase().includes('saldo awal kas & persediaan') ||
        m.uraian.toLowerCase().includes('saldo awal kas, persediaan')
      ) {
        foundModalAwal = true;
        const expectedUraian = `Penyertaan Modal Desa ${currentYear} (Saldo Awal Kas, Persediaan${sertakanAset ? ' & Aset Tetap' : ''})`;
        const expectedNilai = Math.round(totalModalAwalExpected);
        return {
          ...m,
          uraian: expectedUraian,
          nilai: expectedNilai
        };
      }
      return m;
    });

    if (!foundModalAwal) {
      filtered.push({
        id: 'MK-SALDO-AWAL-AUTO',
        jenis: 'Modal',
        kategori: 'Modal Awal',
        uraian: `Penyertaan Modal Desa ${currentYear} (Saldo Awal Kas, Persediaan${sertakanAset ? ' & Aset Tetap' : ''})`,
        tanggal: `${currentYear}-01-01`,
        nilai: Math.round(totalModalAwalExpected),
        status: 'Aktif'
      });
    }
  }

  // Auto-sync Panjar / Jaminan (Uang Muka) liabilities from Buku Kas Harian
  const allKasForPanjar = getStoredTransaksiKas();
  const panjarTxMap: Record<
    string,
    {
      displayName: string;
      latestDate: string;
      totalPemasukan: number;
      totalPengeluaran: number;
    }
  > = {};

  for (const k of allKasForPanjar) {
    const lowerKet = (k.keterangan || '').toLowerCase().trim();
    const isPanjar =
      lowerKet.includes('panjar') ||
      lowerKet.includes('jaminan') ||
      (lowerKet.includes('uang muka') && !lowerKet.includes('piutang')) ||
      lowerKet.includes('titipan');

    if (isPanjar) {
      const rawName = (k.tambahanKeterangan && k.tambahanKeterangan.trim())
        ? k.tambahanKeterangan.trim()
        : 'Pelanggan';
      const key = rawName.toLowerCase();

      if (!panjarTxMap[key]) {
        panjarTxMap[key] = {
          displayName: rawName,
          latestDate: k.tanggal,
          totalPemasukan: 0,
          totalPengeluaran: 0
        };
      }

      if (k.tanggal > panjarTxMap[key].latestDate) {
        panjarTxMap[key].latestDate = k.tanggal;
      }

      if (k.jenis === 'Pemasukan') {
        panjarTxMap[key].totalPemasukan += Number(k.nominalAktual) || 0;
      } else if (k.jenis === 'Pengeluaran') {
        panjarTxMap[key].totalPengeluaran += Number(k.nominalAktual) || 0;
      }
    }
  }

  const panjarEntries: ModalKewajiban[] = [];
  Object.keys(panjarTxMap).forEach((key) => {
    const item = panjarTxMap[key];
    const netPanjar = item.totalPemasukan - item.totalPengeluaran;
    if (netPanjar > 0) {
      const cleanSlug = key.replace(/[^a-z0-9]/g, '-');
      panjarEntries.push({
        id: `MK-PANJAR-${cleanSlug}`,
        jenis: 'Kewajiban',
        kategori: 'Utang Panjar / Uang Muka',
        uraian: `Panjar/Jaminan Uang Muka (${item.displayName})`,
        tanggal: item.latestDate,
        nilai: netPanjar,
        status: 'Aktif'
      });
    }
  });

  return [...filtered, ...panjarEntries];
}

export function saveStoredModalKewajiban(item: Omit<ModalKewajiban, 'id'> & { id?: string }): ModalKewajiban[] {
  const current = getStoredModalKewajiban();
  let updated: ModalKewajiban[];
  if (item.id) {
    updated = current.map(m => (m.id === item.id ? (item as ModalKewajiban) : m));
  } else {
    const newId = `MK-${String(current.length + 1).padStart(3, '0')}`;
    updated = [...current, { ...item, id: newId }];
  }
  setItem(KEYS.MODAL, updated);
  notifyDataChanged();
  return updated;
}

export function deleteStoredModalKewajiban(id: string): ModalKewajiban[] {
  const current = getStoredModalKewajiban();
  const target = current.find(m => m.id === id);
  const isModalAwal = target && (
    target.id === 'MK-SALDO-AWAL-AUTO' ||
    target.kategori === 'Modal Awal' ||
    target.uraian.toLowerCase().includes('saldo awal') ||
    target.uraian.toLowerCase().includes('penyertaan modal desa')
  );

  const updated = current.filter(m => m.id !== id);
  setItem(KEYS.MODAL, updated);

  if (isModalAwal) {
    // Reset migration flag so form in "Saldo Awal Migrasi" resets and unlocks
    setItem(KEYS.SALDO_AWAL_DONE, false);
    try {
      localStorage.removeItem(KEYS.SERTAKAN_ASET_TETAP);
      localStorage.removeItem(KEYS.SALDO_AWAL_DATE);
    } catch {}

    // Also remove the corresponding cash entry from Buku Kas Harian if present
    const currentKas = getItem<TransaksiKas[]>(KEYS.TRANSAKSI_KAS, initialTransaksiKas);
    const filteredKas = currentKas.filter(
      (k) =>
        !(
          k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
          k.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
          (k.keterangan.toLowerCase().includes('penyertaan modal') && k.keterangan.toLowerCase().includes('saldo awal')) ||
          k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
        )
    );
    if (filteredKas.length !== currentKas.length) {
      filteredKas.forEach((item, index) => {
        item.rowNumber = index + 2;
      });
      setItem(KEYS.TRANSAKSI_KAS, filteredKas);
    }
  }

  notifyDataChanged();
  return updated;
}

// MASTER TRANSAKSI
export function getStoredMasterTransaksi(): MasterTransaksi[] {
  const items = getItem<MasterTransaksi[]>(KEYS.MASTER_TRANSAKSI, initialMasterTransaksi);
  if (!Array.isArray(items)) return initialMasterTransaksi;

  // Filter out legacy rice/gabah items stored in localStorage
  const cleanItems = items.filter(
    (i) =>
      !/beras|gabah|katul|bekatul|sekam|selep|giling|pecah kulit|tleser|solar|oli|gapoktan|makelar/i.test(
        i.keterangan || ''
      )
  );

  let isModified = cleanItems.length !== items.length;

  const normalizedItems = cleanItems.map((item) => {
    let updatedItem = { ...item };
    const lowerKet = (item.keterangan || '').toLowerCase().trim();

    if (lowerKet.includes('pakan') || lowerKet.includes('konsentrat')) {
      if (updatedItem.debitAccount !== 'Persediaan pakan' || updatedItem.kelompok !== 'Persediaan' || updatedItem.metode !== 'QtyHarga') {
        updatedItem.debitAccount = 'Persediaan pakan';
        updatedItem.kelompok = 'Persediaan';
        updatedItem.metode = 'QtyHarga';
        isModified = true;
      }
    }

    if (updatedItem.debitAccount === 'Beban Produksi' || updatedItem.debitAccount === 'Beban produksi') {
      updatedItem.debitAccount = 'Biaya produksi';
      isModified = true;
    }

    if (updatedItem.kreditAccount === 'Beban Produksi' || updatedItem.kreditAccount === 'Beban produksi') {
      updatedItem.kreditAccount = 'Biaya produksi';
      isModified = true;
    }

    return updatedItem;
  });

  const existingSet = new Set(normalizedItems.map((i) => i.keterangan.toLowerCase().trim()));
  const merged = [...normalizedItems];

  for (const initItem of initialMasterTransaksi) {
    const key = initItem.keterangan.toLowerCase().trim();
    if (!existingSet.has(key)) {
      merged.push(initItem);
      existingSet.add(key);
      isModified = true;
    }
  }

  if (isModified) {
    setItem(KEYS.MASTER_TRANSAKSI, merged);
  }

  return merged;
}

export function addMasterTransaksiBulk(newItems: MasterTransaksi[]): MasterTransaksi[] {
  const current = getStoredMasterTransaksi();
  const currentSet = new Set(current.map(m => m.keterangan.toLowerCase().trim()));
  const toAdd: MasterTransaksi[] = [];

  for (const item of newItems) {
    const key = item.keterangan.toLowerCase().trim();
    if (key && !currentSet.has(key)) {
      toAdd.push(item);
      currentSet.add(key);
    }
  }

  const updated = [...current, ...toAdd];
  setItem(KEYS.MASTER_TRANSAKSI, updated);
  return updated;
}

// TRANSAKSI KAS
export function getStoredTransaksiKas(): TransaksiKas[] {
  const saved = localStorage.getItem(KEYS.TRANSAKSI_KAS);
  let items: TransaksiKas[];
  if (saved === null) {
    items = initialTransaksiKas;
  } else {
    try {
      const parsed = JSON.parse(saved);
      items = Array.isArray(parsed) ? parsed : initialTransaksiKas;
    } catch {
      items = initialTransaksiKas;
    }
  }

  const cleanItems = items.filter(
    (i) =>
      !/beras|gabah|selep|giling|pecah kulit|tleser|gapoktan/i.test(
        i.keterangan || ''
      )
  );

  if (cleanItems.length !== items.length) {
    setItem(KEYS.TRANSAKSI_KAS, cleanItems);
  }

  return cleanItems.map((item) => ({
    ...item,
    id: String(item.id || ''),
    tanggal: String(item.tanggal || getTodayYYYYMMDD()),
    keterangan: String(item.keterangan || ''),
    jenis: (item.jenis === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran') as any,
    metode: (item.metode === 'QtyHarga' ? 'QtyHarga' : 'Nominal') as any,
    tambahanKeterangan: String(item.tambahanKeterangan || ''),
    nominalAktual: Number(item.nominalAktual) || 0,
    debit: Number(item.debit) || 0,
    kredit: Number(item.kredit) || 0,
  }));
}

export function getStoredDraftKas(): TransaksiKas[] {
  const items = getItem<TransaksiKas[]>(KEYS.DRAFT_KAS, []);
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    id: String(item.id || ''),
    tanggal: String(item.tanggal || getTodayYYYYMMDD()),
    keterangan: String(item.keterangan || ''),
    jenis: (item.jenis === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran') as any,
    metode: (item.metode === 'QtyHarga' ? 'QtyHarga' : 'Nominal') as any,
    tambahanKeterangan: String(item.tambahanKeterangan || ''),
    nominalAktual: Number(item.nominalAktual) || 0,
    debit: Number(item.debit) || 0,
    kredit: Number(item.kredit) || 0,
  }));
}

export function setStoredDraftKas(drafts: TransaksiKas[]): void {
  setItem(KEYS.DRAFT_KAS, drafts);
  notifyDataChanged();
}

export function saveTransaksiKasBulk(drafts: TransaksiKas[]): {
  success: boolean;
  message: string;
  totalDebit: number;
  totalKredit: number;
  count: number;
} {
  if (!drafts || drafts.length === 0) {
    return { success: false, message: 'Tidak ada transaksi untuk disimpan.', totalDebit: 0, totalKredit: 0, count: 0 };
  }

  const currentKas = getStoredTransaksiKas();
  let nextRow = currentKas.length > 0 ? Math.max(...currentKas.map(c => c.rowNumber || 2)) + 1 : 2;

  const newMaster: MasterTransaksi[] = [];
  let totalDebit = 0;
  let totalKredit = 0;

  const processedList: TransaksiKas[] = [];

  for (const draft of drafts) {
    const rowNum = nextRow++;
    const debit = draft.jenis === 'Pemasukan' ? draft.nominalAktual : 0;
    const kredit = draft.jenis === 'Pengeluaran' ? draft.nominalAktual : 0;

    totalDebit += debit;
    totalKredit += kredit;

    processedList.push({
      ...draft,
      id: String(rowNum),
      rowNumber: rowNum,
      debit,
      kredit
    });

    if (draft.isNewKeterangan) {
      newMaster.push({
        keterangan: draft.keterangan,
        jenis: draft.jenis,
        metode: draft.metode,
        kelompok: draft.jenis === 'Pemasukan' ? 'Pendapatan' : 'Biaya'
      });
    }

    // Automatically update stock if it's purchase/sale
    updateStockFromCashTransaction(draft.keterangan, draft.jenis, Number(draft.qty) || 0);
    // Automatically update Aset Biologis in Aset Tetap if purchase/death
    updateAsetFromCashTransaction(draft);
  }

  const updatedKas = [...currentKas, ...processedList];
  setItem(KEYS.TRANSAKSI_KAS, updatedKas);
  setItem(KEYS.DRAFT_KAS, []);

  if (newMaster.length > 0) {
    addMasterTransaksiBulk(newMaster);
  }

  // Sync panen logs for affected dates
  const affectedPanenDates = new Set<string>();
  drafts.forEach((d) => {
    if ((d.keterangan || '').toLowerCase().includes('panen')) {
      affectedPanenDates.add(formatDateToYYYYMMDD(d.tanggal));
    }
  });
  affectedPanenDates.forEach((tgl) => {
    syncPanenLogForDate(tgl);
  });

  notifyDataChanged();

  return {
    success: true,
    message: `${drafts.length} transaksi berhasil disimpan ke Buku Kas Harian.`,
    totalDebit,
    totalKredit,
    count: drafts.length
  };
}

// STOCK ENGINE HELPERS
export function findTargetInventoryItem(keterangan: string, items: ItemPersediaan[]): ItemPersediaan | undefined {
  const lower = (keterangan || '').toLowerCase().trim();
  if (!lower) return undefined;

  const sortedItems = [...items].sort((a, b) => b.namaItem.length - a.namaItem.length);
  const direct = sortedItems.find((i) => lower.includes(i.namaItem.toLowerCase().trim()));
  if (direct) return direct;

  if (/plastik|tray|vitamin|kemasan|obat|vaksin|supplemen/i.test(lower)) {
    return undefined;
  }

  if (lower.includes('telur')) {
    return items.find((i) => i.namaItem.toLowerCase().includes('telur'));
  }
  if (lower.includes('pakan') || lower.includes('konsentrat')) {
    return items.find((i) => i.namaItem.toLowerCase().includes('pakan') || i.namaItem.toLowerCase().includes('konsentrat'));
  }

  return undefined;
}

function getTxQty(keterangan: string, qtyProp?: number | ''): number {
  const num = Number(qtyProp);
  if (!isNaN(num) && num > 0) return num;

  const match = (keterangan || '').match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }
  return 0;
}

function updateStockFromCashTransaction(keterangan: string, jenis: 'Pemasukan' | 'Pengeluaran', qtyProp?: number | '') {
  const qty = getTxQty(keterangan, qtyProp);
  if (qty <= 0) return;
  const lower = (keterangan || '').toLowerCase().trim();
  const items = getStoredPersediaan();

  let targetItem = findTargetInventoryItem(keterangan, items);
  if (!targetItem) return;

  let delta = 0;
  const isJual = lower.includes('jual') || lower.includes('penjualan');
  const isBeli = lower.includes('beli') || lower.includes('pembelian');
  const isPanen = lower.includes('panen');

  if (isPanen) {
    delta = qty;
  } else if (isJual || (jenis === 'Pemasukan' && !isBeli)) {
    delta = -qty;
  } else if (isBeli || (jenis === 'Pengeluaran' && !isJual)) {
    delta = qty;
  }

  if (delta !== 0) {
    updateStoredItemStock(targetItem.namaItem, delta);
  }
}

function revertStockFromCashTransaction(keterangan: string, jenis: 'Pemasukan' | 'Pengeluaran', qtyProp?: number | '') {
  const qty = getTxQty(keterangan, qtyProp);
  if (qty <= 0) return;
  const lower = (keterangan || '').toLowerCase().trim();
  const items = getStoredPersediaan();

  let targetItem = findTargetInventoryItem(keterangan, items);
  if (!targetItem) return;

  let delta = 0;
  const isJual = lower.includes('jual') || lower.includes('penjualan');
  const isBeli = lower.includes('beli') || lower.includes('pembelian');
  const isPanen = lower.includes('panen');

  if (isPanen) {
    delta = -qty;
  } else if (isJual || (jenis === 'Pemasukan' && !isBeli)) {
    delta = qty;
  } else if (isBeli || (jenis === 'Pengeluaran' && !isJual)) {
    delta = -qty;
  }

  if (delta !== 0) {
    updateStoredItemStock(targetItem.namaItem, delta);
  }
}

// ASET BIOLOGIS AUTOMATIC UPDATES FROM CASH TRANSACTIONS
export function updateAsetFromCashTransaction(draft: TransaksiKas): void {
  const lowerKet = (draft.keterangan || '').toLowerCase().trim();
  const qty = Number(draft.qty) || 0;

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

  if (!isBeliAyam && !isAyamMati) return;

  const asetList = getStoredAset();
  let bioAset = asetList.find(
    (a) =>
      a.kategori === 'Aset Biologis' ||
      a.nama.toLowerCase().includes('populasi ayam') ||
      a.nama.toLowerCase().includes('aset biologis')
  );

  if (isBeliAyam) {
    if (qty <= 0) return;
    const nominal = Number(draft.kasAktual) || Number(draft.nominalAktual) || Number(draft.totalPerhitungan) || 0;
    if (bioAset) {
      const newQty = (Number(bioAset.kuantitas) || 0) + qty;
      const newNilai = (Number(bioAset.nilaiPerolehan) || 0) + nominal;
      saveStoredAset({
        ...bioAset,
        kuantitas: newQty,
        nilaiPerolehan: newNilai
      });
    } else {
      saveStoredAset({
        nama: 'Populasi Ayam Petelur Produktif',
        kategori: 'Aset Biologis',
        kuantitas: qty,
        tanggalPerolehan: draft.tanggal || getTodayYYYYMMDD(),
        nilaiPerolehan: nominal,
        kondisi: 'Baik',
        keterangan: 'Pembelian Ayam Petelur'
      });
    }
  } else if (isAyamMati) {
    if (qty <= 0) return;
    if (bioAset) {
      const currentQty = Number(bioAset.kuantitas) || 0;
      const currentNilai = Number(bioAset.nilaiPerolehan) || 0;
      const unitCost = currentQty > 0 ? currentNilai / currentQty : 0;
      const deadNominal = Number(draft.totalPerhitungan) || qty * unitCost;

      const newQty = Math.max(0, currentQty - qty);
      const newNilai = Math.max(0, currentNilai - deadNominal);

      saveStoredAset({
        ...bioAset,
        kuantitas: newQty,
        nilaiPerolehan: newNilai
      });
    }
  }
}

export function revertAsetFromCashTransaction(draft: TransaksiKas): void {
  const lowerKet = (draft.keterangan || '').toLowerCase().trim();
  const qty = Number(draft.qty) || 0;

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

  if (!isBeliAyam && !isAyamMati) return;

  const asetList = getStoredAset();
  let bioAset = asetList.find(
    (a) =>
      a.kategori === 'Aset Biologis' ||
      a.nama.toLowerCase().includes('populasi ayam') ||
      a.nama.toLowerCase().includes('aset biologis')
  );

  if (!bioAset) return;

  if (isBeliAyam) {
    if (qty <= 0) return;
    const nominal = Number(draft.kasAktual) || Number(draft.nominalAktual) || Number(draft.totalPerhitungan) || 0;
    const newQty = Math.max(0, (Number(bioAset.kuantitas) || 0) - qty);
    const newNilai = Math.max(0, (Number(bioAset.nilaiPerolehan) || 0) - nominal);
    saveStoredAset({
      ...bioAset,
      kuantitas: newQty,
      nilaiPerolehan: newNilai
    });
  } else if (isAyamMati) {
    if (qty <= 0) return;
    const currentQty = Number(bioAset.kuantitas) || 0;
    const currentNilai = Number(bioAset.nilaiPerolehan) || 0;
    const unitCost = currentQty > 0 ? currentNilai / currentQty : 0;
    const deadNominal = Number(draft.totalPerhitungan) || qty * unitCost;

    saveStoredAset({
      ...bioAset,
      kuantitas: currentQty + qty,
      nilaiPerolehan: currentNilai + deadNominal
    });
  }
}

// KARYAWAN
export function getStoredKaryawan(): Karyawan[] {
  return getItem<Karyawan[]>(KEYS.KARYAWAN, initialKaryawan);
}

export function deleteStoredTransaksiKas(id: string): { success: boolean; message: string } {
  const current = getStoredTransaksiKas();
  const targetId = String(id);
  const target = current.find(k => String(k.id) === targetId || (k.rowNumber && String(k.rowNumber) === targetId));

  if (target) {
    revertStockFromCashTransaction(target.keterangan, target.jenis, Number(target.qty) || 0);
    revertAsetFromCashTransaction(target);
  }

  const isSaldoAwalKas = target && (
    target.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
    target.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
    (target.keterangan.toLowerCase().includes('penyertaan modal') && target.keterangan.toLowerCase().includes('saldo awal')) ||
    target.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
  );

  const updated = current.filter(k => k !== target && String(k.id) !== targetId && (k.rowNumber === undefined || String(k.rowNumber) !== targetId));
  
  // Re-index row numbers sequentially
  updated.forEach((item, index) => {
    item.rowNumber = index + 2;
  });

  setItem(KEYS.TRANSAKSI_KAS, updated);

  if (isSaldoAwalKas) {
    // Reset migration flag so form in "Saldo Awal Migrasi" resets and unlocks
    setItem(KEYS.SALDO_AWAL_DONE, false);
    try {
      localStorage.removeItem(KEYS.SERTAKAN_ASET_TETAP);
      localStorage.removeItem(KEYS.SALDO_AWAL_DATE);
    } catch {}

    // Also remove auto modal entry in Modal & Kewajiban
    const currentModal = getItem<ModalKewajiban[]>(KEYS.MODAL, initialModalKewajiban);
    const filteredModal = currentModal.filter(
      (m) =>
        m.id !== 'MK-SALDO-AWAL-AUTO' &&
        !m.uraian.toLowerCase().includes('saldo awal kas & persediaan') &&
        !m.uraian.toLowerCase().includes('saldo awal kas, persediaan') &&
        !m.uraian.toLowerCase().includes('penyertaan modal desa')
    );
    setItem(KEYS.MODAL, filteredModal);
  }

  if (target && (target.keterangan || '').toLowerCase().includes('panen')) {
    syncPanenLogForDate(target.tanggal);
  }

  notifyDataChanged(false);
  return { 
    success: true, 
    message: isSaldoAwalKas
      ? 'Transaksi Penyertaan Modal Awal berhasil dihapus & Form Migrasi Saldo Awal direset agar sinkron.'
      : 'Transaksi berhasil dihapus & persediaan/aset disinkronkan kembali.' 
  };
}

export function updateStoredTransaksiKas(updatedTx: TransaksiKas): { success: boolean; message: string } {
  const current = getStoredTransaksiKas();
  const idx = current.findIndex(k => String(k.id) === String(updatedTx.id) || String(k.rowNumber) === String(updatedTx.id));
  if (idx === -1) {
    return { success: false, message: 'Transaksi tidak ditemukan.' };
  }

  const oldTx = current[idx];

  // 1. Revert old stock and asset impact
  revertStockFromCashTransaction(oldTx.keterangan, oldTx.jenis, Number(oldTx.qty) || 0);
  revertAsetFromCashTransaction(oldTx);

  // 2. Prepare new nominal & debit/kredit
  let nominalAktual = updatedTx.nominalAktual;
  if (updatedTx.metode === 'QtyHarga') {
    const q = Number(updatedTx.qty) || 0;
    const h = Number(updatedTx.hargaSatuan) || 0;
    const calc = q * h;
    nominalAktual = updatedTx.adaPenyesuaian ? Number(updatedTx.nominalAktual) || calc : calc;
  }

  const debit = updatedTx.jenis === 'Pemasukan' ? nominalAktual : 0;
  const kredit = updatedTx.jenis === 'Pengeluaran' ? nominalAktual : 0;

  const finalTx: TransaksiKas = {
    ...updatedTx,
    nominalAktual,
    debit,
    kredit
  };

  // 3. Apply new stock and asset impact
  updateStockFromCashTransaction(finalTx.keterangan, finalTx.jenis, Number(finalTx.qty) || 0);
  updateAsetFromCashTransaction(finalTx);

  current[idx] = finalTx;
  setItem(KEYS.TRANSAKSI_KAS, current);

  // 4. Synchronize LogProduksi and recalculate HDP if this is a Panen Telur transaction
  const isOldPanen = oldTx.keterangan.toLowerCase().includes('panen');
  const isNewPanen = finalTx.keterangan.toLowerCase().includes('panen');

  if (isOldPanen || isNewPanen) {
    syncPanenLogForDate(oldTx.tanggal);
    if (finalTx.tanggal !== oldTx.tanggal) {
      syncPanenLogForDate(finalTx.tanggal);
    }
  }

  notifyDataChanged();

  return { success: true, message: 'Transaksi berhasil diperbarui & persediaan disinkronkan.' };
}

export function saveStoredKaryawan(item: { id?: string; nama: string; keterangan: string }): { success: boolean; message: string } {
  const current = getStoredKaryawan();
  const nameTrim = item.nama.trim();
  if (!nameTrim) return { success: false, message: 'Nama karyawan wajib diisi.' };

  // Check duplicate
  const exists = current.some(k => k.name.toLowerCase() === nameTrim.toLowerCase() && k.id !== item.id);
  if (exists) return { success: false, message: 'Nama karyawan sudah digunakan.' };

  if (item.id) {
    const updated = current.map(k => (k.id === item.id ? { id: item.id, name: nameTrim, description: item.keterangan.trim() } : k));
    setItem(KEYS.KARYAWAN, updated);
  } else {
    const maxNum = current.reduce((max, k) => {
      const num = parseInt(k.id.replace('EMP-', ''), 10) || 0;
      return num > max ? num : max;
    }, 0);
    const newId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
    const updated = [...current, { id: newId, name: nameTrim, description: item.keterangan.trim() }];
    setItem(KEYS.KARYAWAN, updated);
  }

  notifyDataChanged();
  return { success: true, message: 'Data karyawan berhasil disimpan.' };
}

export function deleteStoredKaryawan(id: string): { success: boolean; message: string } {
  const current = getStoredKaryawan();
  const updated = current.filter(k => k.id !== id);
  setItem(KEYS.KARYAWAN, updated);
  notifyDataChanged();
  return { success: true, message: 'Karyawan berhasil dihapus.' };
}

// PAYROLL DISTRIBUTIONS
export function isSalaryTransaction(t: { keterangan?: string; kelompok?: string; jenis?: string; debit?: number; kredit?: number }): boolean {
  if (!t) return false;
  if (t.jenis === 'Pemasukan' && (t.debit || 0) > 0 && (!t.kredit || t.kredit === 0)) {
    return false;
  }
  const ket = (t.keterangan || '').toLowerCase().trim();
  const kel = (t.kelompok || '').toLowerCase().trim();
  const regex = /(gaji|upah|honor|insentif|payroll|tenaga)/i;
  return regex.test(ket) || regex.test(kel);
}

export function getStoredPayrollDistributions(): Record<number, PayrollDistribution[]> {
  return getItem<Record<number, PayrollDistribution[]>>(KEYS.PAYROLL_DISTRIBUTIONS, initialPayrollDistributions);
}

export function getPayrollQueueList(): PayrollQueueItem[] {
  const kas = getStoredTransaksiKas();
  const distributions = getStoredPayrollDistributions();

  const salaryTrans = kas.filter(isSalaryTransaction);

  return salaryTrans.map(t => {
    const rowId = t.rowNumber || Number(t.id) || 0;
    const dist = distributions[rowId] || (t.id ? (distributions as any)[t.id] : undefined);
    const isSuccess = Array.isArray(dist) && dist.length > 0;

    return {
      id: rowId,
      tanggal: t.tanggal,
      keterangan: t.keterangan,
      nominal: t.nominalAktual || t.kredit || 0,
      status: isSuccess ? 'success' : 'empty'
    };
  });
}

export function savePayrollDistribution(rowId: number | string, distributions: PayrollDistribution[]): { success: boolean; message: string } {
  const current = getStoredPayrollDistributions();
  current[rowId as any] = distributions;
  setItem(KEYS.PAYROLL_DISTRIBUTIONS, current);
  notifyDataChanged();
  return { success: true, message: 'Pembagian gaji berhasil disimpan.' };
}

export function getSaldoAwalCutOffDate(): string {
  if (!isSaldoAwalProcessed()) return '';
  const savedDate = getItem<string>(KEYS.SALDO_AWAL_DATE, '');
  if (savedDate) return formatDateToYYYYMMDD(savedDate);
  const allKas = getStoredTransaksiKas();
  const kasAwalEntry = allKas.find(
    (k) =>
      k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
      k.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
      k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
  );
  return kasAwalEntry ? formatDateToYYYYMMDD(kasAwalEntry.tanggal) : '';
}

export interface StockAnomalyReport {
  namaItem: string;
  satuan: string;
  saldoQty: number;
  hasNegativeStock: boolean;
  totalMasuk: number;
  totalKeluar: number;
  estimasiDefisit: number;
  statusPeringatan: 'Normal' | 'Peringatan Stok Rendah' | 'Anomali Stok Negatif';
}

export function getStockAnomaliesReport(): StockAnomalyReport[] {
  const items = getStoredPersediaan();
  const allKas = getStoredTransaksiKas();
  const allLogs = getStoredLogProduksi();
  const cutOffDate = getSaldoAwalCutOffDate();

  return items.map((item) => {
    const isTelur = item.namaItem.toLowerCase().includes('telur');
    const isPakan = item.namaItem.toLowerCase().includes('pakan') || item.namaItem.toLowerCase().includes('konsentrat');

    let totalMasuk = 0;
    let totalKeluar = 0;

    allKas.forEach((k) => {
      if (cutOffDate && formatDateToYYYYMMDD(k.tanggal) < cutOffDate) return;
      const lower = (k.keterangan || '').toLowerCase();
      const qty = Number(k.qty) || 0;

      if (isTelur) {
        if (lower.includes('panen') && qty > 0) totalMasuk += qty;
        if (lower.includes('jual') && qty > 0) totalKeluar += qty;
      } else if (isPakan) {
        if (lower.includes('beli') && qty > 0) totalMasuk += qty;
      }
    });

    if (isPakan) {
      allLogs.forEach((l) => {
        if (cutOffDate && formatDateToYYYYMMDD(l.tanggal) < cutOffDate) return;
        if (l.pakanKonsumsi && l.pakanKonsumsi > 0) {
          totalKeluar += l.pakanKonsumsi;
        }
      });
    }

    const hasNegativeStock = item.saldoQty < 0;
    let statusPeringatan: 'Normal' | 'Peringatan Stok Rendah' | 'Anomali Stok Negatif' = 'Normal';
    if (item.saldoQty < 0) {
      statusPeringatan = 'Anomali Stok Negatif';
    } else if (item.saldoQty === 0) {
      statusPeringatan = 'Peringatan Stok Rendah';
    }

    return {
      namaItem: item.namaItem,
      satuan: item.satuan,
      saldoQty: item.saldoQty,
      hasNegativeStock,
      totalMasuk,
      totalKeluar,
      estimasiDefisit: hasNegativeStock ? Math.abs(item.saldoQty) : 0,
      statusPeringatan
    };
  });
}

// PERSEDIAAN
export function getStoredPersediaan(): ItemPersediaan[] {
  const items = getItem<ItemPersediaan[]>(KEYS.PERSEDIAAN, initialItemPersediaan);
  if (!Array.isArray(items)) return initialItemPersediaan;

  const cleanItems = items.filter((i) => {
    const lower = (i.namaItem || '').toLowerCase();
    if (/plastik|tray|vitamin|kemasan|obat|vaksin|supplemen/i.test(lower)) {
      return false;
    }
    return lower.includes('telur') || lower.includes('pakan') || lower.includes('konsentrat');
  });

  const finalItems = cleanItems.length > 0 ? cleanItems : initialItemPersediaan;
  if (cleanItems.length !== items.length) {
    setItem(KEYS.PERSEDIAAN, finalItems);
  }

  return finalItems;
}

export function updateStoredItemStock(namaItem: string, deltaQty: number): number {
  const current = getStoredPersediaan();
  let found = false;
  let newStock = 0;

  const updated = current.map(item => {
    if (item.namaItem.toLowerCase().trim() === namaItem.toLowerCase().trim()) {
      found = true;
      newStock = Math.max(0, item.saldoQty + deltaQty);
      return { ...item, saldoQty: newStock };
    }
    return item;
  });

  if (!found && deltaQty > 0) {
    newStock = deltaQty;
    updated.push({
      namaItem,
      satuan: 'kg',
      hargaJualAcuan: 5000,
      saldoQty: deltaQty
    });
  }

  setItem(KEYS.PERSEDIAAN, updated);
  notifyDataChanged();
  return newStock;
}

export function adjustStoredItemStock(data: {
  namaItem: string;
  tanggal: string;
  qtyPenyusutan: number;
  alasan: string;
}): { success: boolean; message: string } {
  const items = getStoredPersediaan();
  const target = items.find((i) => i.namaItem.toLowerCase().trim() === data.namaItem.toLowerCase().trim());

  if (!target) {
    return { success: false, message: `Item persediaan ${data.namaItem} tidak ditemukan.` };
  }

  if (data.qtyPenyusutan <= 0) {
    return { success: false, message: 'Jumlah penyusutan harus lebih besar dari 0 kg.' };
  }

  if (data.qtyPenyusutan > target.saldoQty) {
    return {
      success: false,
      message: `Jumlah penyusutan (${data.qtyPenyusutan} kg) melebihi stok persediaan saat ini (${target.saldoQty} kg).`
    };
  }

  updateStoredItemStock(target.namaItem, -data.qtyPenyusutan);
  notifyDataChanged();

  return {
    success: true,
    message: `Penyesuaian stok berhasil disimpan. Stok ${target.namaItem} berkurang ${data.qtyPenyusutan} kg (${data.alasan}).`
  };
}

// LOG PRODUKSI
export function getStoredLogProduksi(): LogProduksi[] {
  const items = getItem<LogProduksi[]>(KEYS.LOG_PRODUKSI, initialLogProduksi);
  if (!Array.isArray(items)) return initialLogProduksi;
  return items.map((item) => ({
    ...item,
    tanggal: String(item.tanggal || getTodayYYYYMMDD()),
    keterangan: String(item.keterangan || '')
  }));
}

export function deleteStoredLogProduksi(noProduksi: number): { success: boolean; message: string } {
  const logs = getStoredLogProduksi();
  const target = logs.find((l) => l.noProduksi === noProduksi);
  if (target) {
    if (target.gabahDiproses > 0) {
      updateStoredItemStock('Gabah', target.gabahDiproses);
    }
    if (Array.isArray(target.outputs)) {
      target.outputs.forEach((o) => {
        if (o.qty > 0) {
          updateStoredItemStock(o.namaItem, -o.qty);
        }
      });
    }

    // Also remove corresponding Panen Telur transactions from Buku Kas Harian (TRANSAKSI_KAS)
    const isPanenLog = target.outputs?.some((o) => o.namaItem === 'Telur Ayam') || (target.keterangan || '').toLowerCase().includes('panen');
    if (isPanenLog) {
      const targetTgl = formatDateToYYYYMMDD(target.tanggal);
      const kasList = getStoredTransaksiKas();
      const updatedKas = kasList.filter(
        (k) => !(formatDateToYYYYMMDD(k.tanggal) === targetTgl && (k.keterangan || '').toLowerCase().includes('panen'))
      );
      if (updatedKas.length !== kasList.length) {
        updatedKas.forEach((item, index) => {
          item.rowNumber = index + 2;
        });
        setItem(KEYS.TRANSAKSI_KAS, updatedKas);
      }
    }
  }

  const updated = logs.filter((l) => l.noProduksi !== noProduksi);
  setItem(KEYS.LOG_PRODUKSI, updated);
  notifyDataChanged(false);
  return { success: true, message: `Riwayat produksi #${noProduksi} berhasil dihapus, stok & Buku Kas disesuaikan.` };
}

export function updateStoredLogProduksi(
  noProduksi: number,
  data: {
    tanggal: string;
    qtyGabah: number;
    outputs: { namaItem: string; qty: number }[];
    keterangan: string;
  }
): { success: boolean; message: string; susut?: number } {
  const logs = getStoredLogProduksi();
  const idx = logs.findIndex((l) => l.noProduksi === noProduksi);
  if (idx === -1) {
    return { success: false, message: 'Riwayat produksi tidak ditemukan.' };
  }

  const oldLog = logs[idx];

  // 1. Revert old stock impact
  if (oldLog.gabahDiproses > 0) {
    updateStoredItemStock('Gabah', oldLog.gabahDiproses);
  }
  if (Array.isArray(oldLog.outputs)) {
    oldLog.outputs.forEach((o) => {
      if (o.qty > 0) {
        updateStoredItemStock(o.namaItem, -o.qty);
      }
    });
  }

  // 2. Calculate new susut & apply new stock impact
  const totalOutput = data.outputs.reduce((sum, o) => sum + o.qty, 0);
  const susut = Math.max(0, data.qtyGabah - totalOutput);

  updateStoredItemStock('Gabah', -data.qtyGabah);
  data.outputs.forEach((o) => {
    if (o.qty > 0) {
      updateStoredItemStock(o.namaItem, o.qty);
    }
  });

  const updatedLog: LogProduksi = {
    noProduksi,
    tanggal: data.tanggal,
    gabahDiproses: data.qtyGabah,
    outputs: data.outputs,
    susut,
    keterangan: data.keterangan
  };

  logs[idx] = updatedLog;
  setItem(KEYS.LOG_PRODUKSI, logs);
  notifyDataChanged();

  return {
    success: true,
    message: `Riwayat produksi #${noProduksi} berhasil diperbarui & stok persediaan disesuaikan.`,
    susut
  };
}

export function syncPanenLogForDate(tanggal: string): void {
  if (!tanggal) return;
  const normDate = formatDateToYYYYMMDD(tanggal);
  const kasList = getStoredTransaksiKas();

  // Find all panen transactions on this date
  const panenTxList = kasList.filter(
    (k) => k.tanggal === normDate && (k.keterangan || '').toLowerCase().includes('panen')
  );

  const totalPanenQty = panenTxList.reduce(
    (sum, k) => sum + (Number(k.qty) || Number(k.nominalAktual) || 0),
    0
  );

  const logs = getStoredLogProduksi();
  const logIdx = logs.findIndex(
    (l) => l.tanggal === normDate && l.outputs?.some((o) => o.namaItem === 'Telur Ayam')
  );

  if (totalPanenQty <= 0) {
    if (logIdx !== -1) {
      logs.splice(logIdx, 1);
      setItem(KEYS.LOG_PRODUKSI, logs);
    }
    return;
  }

  const populasi = getDefaultPopulasiAyam();
  const estButir = Math.round(totalPanenQty * 16.2);
  const hdpRate = Math.min(100, Math.round((estButir / populasi) * 100 * 10) / 10);

  if (logIdx !== -1) {
    const existingLog = logs[logIdx];
    const pop = existingLog.populasiAyam || populasi;
    const est = Math.round(totalPanenQty * 16.2);
    const hdp = Math.min(100, Math.round((est / pop) * 100 * 10) / 10);

    let baseKet = (existingLog.keterangan || '').split('(')[0].trim();
    if (!baseKet) baseKet = 'Panen Telur Harian Kandang BUMDes';
    const updatedKet = `${baseKet} (${pop} Ekor Ayam • Est HDP: ${hdp}%)`;

    logs[logIdx] = {
      ...existingLog,
      tanggal: normDate,
      populasiAyam: pop,
      outputs: [{ namaItem: 'Telur Ayam', qty: totalPanenQty }],
      keterangan: updatedKet
    };
    setItem(KEYS.LOG_PRODUKSI, logs);
  } else {
    const nextNo = logs.length > 0 ? Math.max(...logs.map((l) => l.noProduksi)) + 1 : 1;
    const newLog: LogProduksi = {
      noProduksi: nextNo,
      tanggal: normDate,
      gabahDiproses: 0,
      outputs: [{ namaItem: 'Telur Ayam', qty: totalPanenQty }],
      susut: 0,
      keterangan: `Panen Telur Harian Kandang BUMDes (${populasi} Ekor Ayam • Est HDP: ${hdpRate}%)`,
      populasiAyam: populasi,
      pakanKonsumsi: 0
    };
    setItem(KEYS.LOG_PRODUKSI, [newLog, ...logs]);
  }
}

export interface UnsavedPanenDate {
  tanggal: string;
  qtyPanen: number;
  count: number;
}

export function getUnsavedPanenDates(): UnsavedPanenDate[] {
  const kasList = getStoredTransaksiKas();
  const logs = getStoredLogProduksi();
  const loggedDates = new Set(
    logs
      .filter((l) => l.outputs?.some((o) => o.namaItem === 'Telur Ayam'))
      .map((l) => formatDateToYYYYMMDD(l.tanggal))
  );

  const mapByDate: Record<string, { qty: number; count: number }> = {};
  kasList.forEach((k) => {
    const isPanen = (k.keterangan || '').toLowerCase().includes('panen');
    const qty = Number(k.qty) || 0;
    if (isPanen && qty > 0) {
      const d = formatDateToYYYYMMDD(k.tanggal);
      if (!mapByDate[d]) {
        mapByDate[d] = { qty: 0, count: 0 };
      }
      mapByDate[d].qty += qty;
      mapByDate[d].count += 1;
    }
  });

  const unsaved: UnsavedPanenDate[] = [];
  Object.keys(mapByDate)
    .sort((a, b) => b.localeCompare(a))
    .forEach((d) => {
      if (!loggedDates.has(d)) {
        unsaved.push({
          tanggal: d,
          qtyPanen: mapByDate[d].qty,
          count: mapByDate[d].count
        });
      }
    });

  return unsaved;
}

export function syncAllUnsavedPanenLogs(): { success: boolean; count: number; message: string } {
  const unsaved = getUnsavedPanenDates();
  if (unsaved.length === 0) {
    return { success: true, count: 0, message: 'Semua tanggal panen dari Buku Kas sudah tercatat di Log Produksi.' };
  }

  unsaved.forEach((item) => {
    syncPanenLogForDate(item.tanggal);
  });

  notifyDataChanged();
  return {
    success: true,
    count: unsaved.length,
    message: `Berhasil mencatat ${unsaved.length} tanggal panen telur ke Log Produksi secara otomatis!`
  };
}

export function saveProduksi(data: {
  tanggal: string;
  qtyGabah: number;
  outputs: { namaItem: string; qty: number }[];
  keterangan: string;
  skipStockUpdate?: boolean;
  populasiAyam?: number;
  pakanKonsumsi?: number;
}): { success: boolean; message: string; noProduksi?: number; susut?: number } {
  const normDate = formatDateToYYYYMMDD(data.tanggal);
  const logs = getStoredLogProduksi();

  const totalOutput = data.outputs.reduce((sum, o) => sum + o.qty, 0);
  const susut = Math.max(0, data.qtyGabah - totalOutput);

  if (!data.skipStockUpdate) {
    // Deduct Gabah stock
    if (data.qtyGabah > 0) {
      updateStoredItemStock('Gabah', -data.qtyGabah);
    }

    // Add Output product stock
    data.outputs.forEach(o => {
      updateStoredItemStock(o.namaItem, o.qty);
    });
  }

  // Check if an existing log for this date exists (for egg harvest update)
  const existingIdx = logs.findIndex(
    (l) => l.tanggal === normDate && l.outputs?.some((o) => o.namaItem === 'Telur Ayam')
  );

  if (existingIdx !== -1 && data.skipStockUpdate) {
    const existingLog = logs[existingIdx];
    const oldFeed = existingLog.pakanKonsumsi || 0;
    const newFeed = data.pakanKonsumsi || 0;
    const deltaFeed = newFeed - oldFeed;

    if (deltaFeed !== 0) {
      updateStoredItemStock('Pakan Konsentrat Ayam', -deltaFeed);
    }

    logs[existingIdx] = {
      ...existingLog,
      tanggal: normDate,
      outputs: data.outputs,
      keterangan: data.keterangan,
      populasiAyam: data.populasiAyam || existingLog.populasiAyam,
      pakanKonsumsi: newFeed
    };

    setItem(KEYS.LOG_PRODUKSI, logs);
    notifyDataChanged();

    return {
      success: true,
      message: `Catatan panen telur tanggal ${formatTanggalDisplay(normDate)} berhasil diperbarui.`,
      noProduksi: existingLog.noProduksi,
      susut
    };
  }

  // Deduct Feed stock if feed consumption is specified
  if (data.pakanKonsumsi && data.pakanKonsumsi > 0) {
    updateStoredItemStock('Pakan Konsentrat Ayam', -data.pakanKonsumsi);
  }

  const nextNo = logs.length > 0 ? Math.max(...logs.map(l => l.noProduksi)) + 1 : 1;
  const newLog: LogProduksi = {
    noProduksi: nextNo,
    tanggal: normDate,
    gabahDiproses: data.qtyGabah,
    outputs: data.outputs,
    susut,
    keterangan: data.keterangan,
    populasiAyam: data.populasiAyam,
    pakanKonsumsi: data.pakanKonsumsi
  };

  setItem(KEYS.LOG_PRODUKSI, [newLog, ...logs]);
  notifyDataChanged();

  return {
    success: true,
    message: `Produksi #${nextNo} berhasil dicatat. Susut: ${susut} kg.`,
    noProduksi: nextNo,
    susut
  };
}

export function updatePanenLogDetail(
  noProduksi: number,
  data: {
    tanggal: string;
    populasiAyam: number;
    pakanKonsumsi: number;
    catatan: string;
  }
): { success: boolean; message: string } {
  const normDate = formatDateToYYYYMMDD(data.tanggal);
  const logs = getStoredLogProduksi();
  const idx = logs.findIndex((l) => l.noProduksi === noProduksi);
  if (idx === -1) {
    return { success: false, message: 'Catatan panen tidak ditemukan.' };
  }

  const oldLog = logs[idx];

  // 1. Fetch total Panen Qty from Buku Kas or existing log output
  const kasList = getStoredTransaksiKas();
  const panenTxList = kasList.filter(
    (k) => k.tanggal === oldLog.tanggal && k.keterangan.toLowerCase().includes('panen')
  );
  const totalPanenFromKas = panenTxList.reduce(
    (sum, k) => sum + (Number(k.qty) || Number(k.nominalAktual) || 0),
    0
  );
  const panenQty = totalPanenFromKas > 0 ? totalPanenFromKas : (oldLog.outputs?.[0]?.qty || 0);

  // 2. Feed inventory stock adjustment delta
  const oldPakan = oldLog.pakanKonsumsi || 0;
  const newPakan = Number(data.pakanKonsumsi) || 0;
  const deltaPakan = newPakan - oldPakan;

  if (deltaPakan !== 0) {
    updateStoredItemStock('Pakan Konsentrat Ayam', -deltaPakan);
  }

  // 3. Recalculate HDP
  const numPopulasi = Number(data.populasiAyam) || 1;
  const estButir = Math.round(panenQty * 16.2);
  const hdpRate = Math.min(100, Math.round((estButir / numPopulasi) * 100 * 10) / 10);

  const cleanCatatan = data.catatan.trim() || 'Panen Telur Harian Kandang BUMDes';
  const newKeterangan = `${cleanCatatan} (${numPopulasi} Ekor Ayam • Est HDP: ${hdpRate}%)`;

  // 4. Update Log
  logs[idx] = {
    ...oldLog,
    tanggal: normDate,
    populasiAyam: numPopulasi,
    pakanKonsumsi: newPakan,
    outputs: [{ namaItem: 'Telur Ayam', qty: panenQty }],
    keterangan: newKeterangan
  };

  // 5. If date changed, synchronize all Kas transaction dates as well
  if (normDate !== oldLog.tanggal) {
    let modifiedKas = false;
    kasList.forEach((k) => {
      if (k.tanggal === oldLog.tanggal && k.keterangan.toLowerCase().includes('panen')) {
        k.tanggal = normDate;
        modifiedKas = true;
      }
    });
    if (modifiedKas) {
      setItem(KEYS.TRANSAKSI_KAS, kasList);
    }
  }

  setItem(KEYS.LOG_PRODUKSI, logs);
  notifyDataChanged();

  return { success: true, message: 'Catatan panen telur berhasil diperbarui & seluruh modul disinkronkan.' };
}

// JOURNAL ENGINE & ACCOUNT MAPPING
export function getAccountsForTransaction(
  keterangan: string,
  jenis: 'Pemasukan' | 'Pengeluaran'
): { debitAccount: string; kreditAccount: string } {
  const master = getStoredMasterTransaksi();
  const lowerKet = (keterangan || '').toLowerCase().trim();

  // 0. Priority: Chicken Purchase / Chicken Mortality
  if (
    lowerKet.includes('ayam mati') ||
    lowerKet.includes('kematian') ||
    lowerKet.includes('dipotong')
  ) {
    return { debitAccount: 'Beban Kematian Aset Biologis', kreditAccount: 'Aset Biologis' };
  }
  if (
    lowerKet.includes('pembelian ayam') ||
    lowerKet.includes('beli ayam') ||
    lowerKet.includes('pembelian pullet') ||
    lowerKet.includes('pembelian bibit')
  ) {
    return { debitAccount: 'Aset Biologis', kreditAccount: 'Kas' };
  }

  // 1. Priority: Panjar / Jaminan / Uang Muka / Titipan (if not piutang)
  if (
    lowerKet.includes('panjar') ||
    lowerKet.includes('jaminan') ||
    (lowerKet.includes('uang muka') && !lowerKet.includes('piutang')) ||
    lowerKet.includes('titipan')
  ) {
    if (jenis === 'Pemasukan') {
      return { debitAccount: 'Kas', kreditAccount: 'Utang Panjar / Jaminan' };
    } else {
      return { debitAccount: 'Utang Panjar / Jaminan', kreditAccount: 'Kas' };
    }
  }

  // 2. Exact or partial match in master list
  const found = master.find(
    (m) =>
      m.keterangan.toLowerCase().trim() === lowerKet ||
      lowerKet.includes(m.keterangan.toLowerCase().trim())
  );

  if (found && found.debitAccount && found.kreditAccount) {
    let debit = found.debitAccount;
    let kredit = found.kreditAccount;
    if (debit === 'Beban Produksi' || debit === 'Beban produksi') debit = 'Biaya produksi';
    if (kredit === 'Beban Produksi' || kredit === 'Beban produksi') kredit = 'Biaya produksi';
    return { debitAccount: debit, kreditAccount: kredit };
  }

  // 2. Intelligent keyword mapping matching Master Akun Kas table
  if (lowerKet.includes('telur')) {
    return jenis === 'Pemasukan'
      ? { debitAccount: 'Kas', kreditAccount: 'Penjualan telur' }
      : { debitAccount: 'Biaya produksi', kreditAccount: 'Kas' };
  }
  if (lowerKet.includes('pakan') || lowerKet.includes('konsentrat')) {
    return { debitAccount: 'Persediaan pakan', kreditAccount: 'Kas' };
  }
  if (lowerKet.includes('vitamin') || lowerKet.includes('obat') || lowerKet.includes('vaksin')) {
    return { debitAccount: 'Biaya produksi', kreditAccount: 'Kas' };
  }
  if (lowerKet.includes('tray') || lowerKet.includes('plastik') || lowerKet.includes('kemasan')) {
    return { debitAccount: 'Biaya produksi', kreditAccount: 'Kas' };
  }
  if (lowerKet.includes('ayam') || lowerKet.includes('pullet') || lowerKet.includes('bibit')) {
    return jenis === 'Pengeluaran'
      ? { debitAccount: 'Biaya produksi', kreditAccount: 'Kas' }
      : { debitAccount: 'Kas', kreditAccount: 'Penjualan telur' };
  }
  if (lowerKet.includes('piutang') || lowerKet.includes('uang muka')) {
    return jenis === 'Pengeluaran'
      ? { debitAccount: 'Piutang uang muka', kreditAccount: 'Kas' }
      : { debitAccount: 'Kas', kreditAccount: 'Piutang uang muka' };
  }
  if (
    lowerKet.includes('beban') ||
    lowerKet.includes('biaya') ||
    lowerKet.includes('gaji') ||
    lowerKet.includes('upah') ||
    lowerKet.includes('solar') ||
    lowerKet.includes('listrik') ||
    lowerKet.includes('pulsa') ||
    lowerKet.includes('sewa') ||
    lowerKet.includes('mesin') ||
    lowerKet.includes('perawatan')
  ) {
    return jenis === 'Pengeluaran'
      ? { debitAccount: 'Biaya produksi', kreditAccount: 'Kas' }
      : { debitAccount: 'Kas', kreditAccount: 'Biaya produksi' };
  }

  // Fallback defaults
  return jenis === 'Pemasukan'
    ? { debitAccount: 'Kas', kreditAccount: 'Pendapatan Lain-lain' }
    : { debitAccount: 'Biaya lain-lain', kreditAccount: 'Kas' };
}

export function getStoredSertakanAsetTetap(): boolean {
  return getItem<boolean>(KEYS.SERTAKAN_ASET_TETAP, true);
}

export function setStoredSertakanAsetTetap(val: boolean): void {
  setItem(KEYS.SERTAKAN_ASET_TETAP, val);
}

export function getJurnalUmumEntries(bulan?: string): JurnalUmumEntry[] {
  const allKas = getStoredTransaksiKas();
  const allLogs = getStoredLogProduksi();
  const itemsPersediaan = getStoredPersediaan();

  const filteredKas = bulan ? allKas.filter((k) => k.tanggal.startsWith(bulan)) : allKas;
  const filteredLogs = bulan ? allLogs.filter((l) => l.tanggal.startsWith(bulan)) : allLogs;

  const entries: JurnalUmumEntry[] = [];

  // 0. Saldo Awal Kas, Aset Tetap & Persediaan Memorial Journals (Lawan Transaksi: Penyertaan Modal Desa {tahunSekarang})
  if (isSaldoAwalProcessed()) {
    const savedDate = getItem<string>(KEYS.SALDO_AWAL_DATE, '');
    const kasAwalEntry = allKas.find(
      (k) =>
        k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
        k.keterangan.toLowerCase().includes('penyertaan modal (saldo awal)') ||
        k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
    );
    const saldoAwalDate = savedDate || kasAwalEntry?.tanggal || (allKas.length > 0 ? allKas[0].tanggal : `${new Date().getFullYear()}-01-01`);
    const tahunSekarang = saldoAwalDate.substring(0, 4) || new Date().getFullYear().toString();
    const modalAccountName = `Penyertaan Modal Desa ${tahunSekarang}`;

    const saldoAwalMonth = saldoAwalDate.substring(0, 7);

    if (!bulan || saldoAwalMonth.startsWith(bulan) || bulan >= saldoAwalMonth) {
      // a. Saldo Awal Kas
      if (kasAwalEntry && kasAwalEntry.nominalAktual > 0) {
        entries.push({
          id: 'JRN-SALDO-AWAL-KAS',
          tanggal: saldoAwalDate,
          noBukti: 'MEM-SALDO-AWAL',
          keteranganKas: 'Saldo Awal Kas & Rekening Bank',
          akunDebit: 'Kas',
          akunKredit: modalAccountName,
          nominal: kasAwalEntry.nominalAktual,
          catatan: 'Saldo Awal'
        });
      }

      // b. Saldo Awal Aset Tetap (rincian item per item sesuai subtab Aset Tetap)
      const sertakanAset = getStoredSertakanAsetTetap();
      if (sertakanAset) {
        const asetList = getStoredAset();
        asetList.forEach((a) => {
          if (a.nilaiPerolehan > 0) {
            entries.push({
              id: `JRN-SALDO-AWAL-AST-${a.id}`,
              tanggal: saldoAwalDate,
              noBukti: 'MEM-SALDO-AWAL',
              keteranganKas: `Saldo Awal Aset Tetap: ${a.nama}`,
              akunDebit: `Aset Tetap - ${a.nama}`,
              akunKredit: modalAccountName,
              nominal: Math.round(a.nilaiPerolehan),
              catatan: 'Saldo Awal'
            });
          }
        });
      }

      // c. Saldo Awal Persediaan per Item
      itemsPersediaan.forEach((item) => {
        if (item.saldoQty > 0) {
          const isGabah = item.namaItem.toLowerCase().includes('gabah');
          const hppUnit = isGabah ? 6800 : item.hargaJualAcuan * 0.75;
          const nilaiAwal = item.saldoQty * hppUnit;

          entries.push({
            id: `JRN-SALDO-AWAL-INV-${item.namaItem}`,
            tanggal: saldoAwalDate,
            noBukti: 'MEM-SALDO-AWAL',
            keteranganKas: `Saldo Awal Persediaan: ${item.namaItem} (${item.saldoQty} ${item.satuan})`,
            akunDebit: `Persediaan ${item.namaItem}`,
            akunKredit: modalAccountName,
            nominal: Math.round(nilaiAwal),
            catatan: 'Saldo Awal'
          });
        }
      });
    }
  }

  // 1. Transactions from Buku Kas Harian
  filteredKas.forEach((k) => {
    const acc = getAccountsForTransaction(k.keterangan, k.jenis);
    const lowerKet = (k.keterangan || '').toLowerCase();
    const isAyamMati =
      lowerKet.includes('ayam mati') ||
      lowerKet.includes('kematian') ||
      lowerKet.includes('dipotong');
    const nominalJurnal = isAyamMati
      ? Number(k.totalPerhitungan) || Number(k.nominalAktual) || 0
      : Number(k.nominalAktual) || 0;

    if (nominalJurnal > 0) {
      entries.push({
        id: k.id || `JRN-${Math.random().toString(36).substring(2, 7)}`,
        tanggal: k.tanggal,
        noBukti: k.id ? `BKK-${k.id}` : 'BKK-AUTO',
        keteranganKas: k.keterangan + (k.tambahanKeterangan ? ` (${k.tambahanKeterangan})` : ''),
        akunDebit: acc.debitAccount,
        akunKredit: acc.kreditAccount,
        nominal: nominalJurnal,
        catatan: k.jenis
      });
    }
  });

  // 2. Production Processing Memorial Journals (Pemrosesan Gabah menjadi Produk Jadi)
  filteredLogs.forEach((log, idx) => {
    const logMonth = log.tanggal.substring(0, 7);
    const breakdown = calculateHppBreakdownBulanan(logMonth);
    const hppGabah = breakdown.hppGabahWeightedAvg || 6800;
    const gabahQty = Number(log.gabahDiproses) || 0;
    const biayaGabah = gabahQty * hppGabah;
    const prodId = log.noProduksi || idx + 1;

    // a. Pemakaian Bahan Baku Gabah
    if (gabahQty > 0) {
      entries.push({
        id: `JRN-PROD-RAW-${prodId}-${log.tanggal}`,
        tanggal: log.tanggal,
        noBukti: `MEM-PROD-${prodId}`,
        keteranganKas: `Pemakaian Bahan Baku Gabah untuk Selep/Giling (${gabahQty} kg)`,
        akunDebit: 'Barang Dalam Proses - Bahan Baku',
        akunKredit: 'Persediaan Gabah',
        nominal: biayaGabah,
        catatan: 'Jurnal Pemrosesan'
      });
    }

    // b. Transfer Produk Jadi Hasil Giling
    if (log.outputs && log.outputs.length > 0) {
      log.outputs.forEach((out) => {
        const qty = Number(out.qty) || 0;
        if (qty > 0) {
          const alloc = breakdown.allocations.find((a) => a.namaItem === out.namaItem);
          const hppPerKg = alloc && alloc.hppPerKg > 0 ? alloc.hppPerKg : 0;
          const nilaiHasil = qty * hppPerKg;

          entries.push({
            id: `JRN-PROD-FG-${prodId}-${out.namaItem}`,
            tanggal: log.tanggal,
            noBukti: `MEM-PROD-${prodId}`,
            keteranganKas: `Hasil Giling Produk Jadi: ${out.namaItem} (${qty} kg)`,
            akunDebit: `Persediaan ${out.namaItem}`,
            akunKredit: 'Barang Dalam Proses - Hasil Giling',
            nominal: nilaiHasil,
            catatan: 'Jurnal Pemrosesan'
          });
        }
      });
    }

    // c. Pemakaian/Konsumsi Pakan Ayam (Beban Pemakaian Pakan)
    if (log.pakanKonsumsi && log.pakanKonsumsi > 0) {
      const itemPakan = itemsPersediaan.find((i) => i.namaItem.toLowerCase().includes('pakan'));
      const unitHargaPakan = itemPakan && itemPakan.hargaJualAcuan ? itemPakan.hargaJualAcuan : 8500;
      const nilaiPemakaianPakan = Math.round(log.pakanKonsumsi * unitHargaPakan);

      entries.push({
        id: `JRN-PAKAN-CONS-${prodId}-${log.tanggal}`,
        tanggal: log.tanggal,
        noBukti: `MEM-PAKAN-${prodId}`,
        keteranganKas: `Pemakaian/Konsumsi Pakan Ayam (${log.pakanKonsumsi} Kg)`,
        akunDebit: 'Biaya produksi',
        akunKredit: 'Persediaan pakan',
        nominal: nilaiPemakaianPakan,
        catatan: 'Beban Pemakaian Pakan'
      });
    }
  });

  // Sort chronologically by date ascending
  return entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

// STOCK OPNAME / TUTUP BUKU BULANAN
export function getStoredStockOpname(): StockOpnameEntry[] {
  return getItem<StockOpnameEntry[]>(KEYS.STOCK_OPNAME, []);
}

// HPP CALCULATION ENGINE (Periodic Weighted Average & Relative Market Value Method)
export function calculateHppBreakdownBulanan(bulan: string): HppBreakdownBulanan {
  const items = getStoredPersediaan();
  const allKas = getStoredTransaksiKas();
  const allLogs = getStoredLogProduksi();
  const allOpnames = getStoredStockOpname();

  // Month filters (YYYY-MM)
  const monthKas = allKas.filter((k) => k.tanggal.startsWith(bulan));
  const monthLogs = allLogs.filter((l) => l.tanggal.startsWith(bulan));

  // Previous Opname Entries
  const prevOpnames = allOpnames
    .filter((o) => o.bulan < bulan)
    .sort((a, b) => b.bulan.localeCompare(a.bulan));

  // 1. GABAH WEIGHTED AVERAGE (Rata-Rata Tertimbang)
  const gabahItem = items.find((i) => i.namaItem.toLowerCase().includes('gabah'));
  const prevGabahOpname = prevOpnames.find((o) => o.namaItem.toLowerCase().includes('gabah'));

  const gabahAwalQty = prevGabahOpname
    ? prevGabahOpname.saldoAkhirFisikQty
    : gabahItem
    ? gabahItem.saldoQty
    : 0;

  const gabahAwalHpp = prevGabahOpname
    ? prevGabahOpname.hppPerUnit
    : gabahItem
    ? gabahItem.hargaJualAcuan
    : 6800;

  const gabahAwalNilai = gabahAwalQty * gabahAwalHpp;

  // Purchases of Gabah in current month
  const gabahPurchases = monthKas.filter(
    (k) =>
      k.jenis === 'Pengeluaran' &&
      (k.keterangan.toLowerCase().includes('gabah') || k.keterangan.toLowerCase().includes('beli'))
  );

  const gabahBeliQty = gabahPurchases.reduce((sum, k) => sum + (Number(k.qty) || 0), 0);
  const gabahBeliNilai = gabahPurchases.reduce((sum, k) => sum + (Number(k.nominalAktual) || 0), 0);

  const gabahTotalTersediaQty = gabahAwalQty + gabahBeliQty;
  const gabahTotalTersediaNilai = gabahAwalNilai + gabahBeliNilai;

  const hppGabahWeightedAvg =
    gabahTotalTersediaQty > 0 ? gabahTotalTersediaNilai / gabahTotalTersediaQty : gabahAwalHpp;

  // 2. JOINT PRODUCTION COST (Biaya Produksi Bersama Giling)
  const gabahDiprosesQty = monthLogs.reduce((sum, l) => sum + (Number(l.gabahDiproses) || 0), 0);
  const biayaBahanBakuGabah = gabahDiprosesQty * hppGabahWeightedAvg;

  // Direct operating costs for milling: taken from transactions with Beban Produksi in Debit (+) and Kredit (-)
  let biayaOperasionalGiling = 0;
  monthKas.forEach((k) => {
    const acc = getAccountsForTransaction(k.keterangan, k.jenis);
    const nom = Number(k.nominalAktual) || 0;
    const isDebitBeban =
      acc.debitAccount.toLowerCase().includes('beban produksi') ||
      acc.debitAccount.toLowerCase().includes('biaya produksi');
    const isKreditBeban =
      acc.kreditAccount.toLowerCase().includes('beban produksi') ||
      acc.kreditAccount.toLowerCase().includes('biaya produksi');

    if (isDebitBeban) {
      biayaOperasionalGiling += nom;
    }
    if (isKreditBeban) {
      biayaOperasionalGiling -= nom;
    }
  });

  const totalJointCost = biayaBahanBakuGabah + biayaOperasionalGiling;

  // 3. RELATIVE MARKET VALUE ALLOCATION (Metode Alokasi Nilai Pasar Relatif)
  const nonGabahItems = items.filter((i) => !i.namaItem.toLowerCase().includes('gabah'));

  const initialAllocations = nonGabahItems.map((item) => {
    // Total production of this item in this month
    const qtyDiproduksi = monthLogs.reduce((sum, log) => {
      const output = log.outputs.find((o) => o.namaItem === item.namaItem);
      return sum + (output ? Number(output.qty) || 0 : 0);
    }, 0);

    const hargaJualAcuan = item.hargaJualAcuan;
    const nilaiPasar = qtyDiproduksi * hargaJualAcuan;

    return {
      namaItem: item.namaItem,
      qtyDiproduksi,
      hargaJualAcuan,
      nilaiPasar
    };
  });

  const totalNilaiPasarOutputs = initialAllocations.reduce((sum, a) => sum + a.nilaiPasar, 0);

  const allocations: ProductHppAllocation[] = initialAllocations.map((a) => {
    const persentaseAlokasi = totalNilaiPasarOutputs > 0 ? a.nilaiPasar / totalNilaiPasarOutputs : 0;
    const alokasiBiayaBersama = totalJointCost * persentaseAlokasi;
    const hppPerKg =
      a.qtyDiproduksi > 0
        ? alokasiBiayaBersama / a.qtyDiproduksi
        : a.hargaJualAcuan * 0.75; // Fallback estimate if no production

    return {
      namaItem: a.namaItem,
      qtyDiproduksi: a.qtyDiproduksi,
      hargaJualAcuan: a.hargaJualAcuan,
      nilaiPasar: a.nilaiPasar,
      persentaseAlokasi,
      alokasiBiayaBersama,
      hppPerKg
    };
  });

  return {
    bulan,
    gabahAwalQty,
    gabahAwalHpp,
    gabahAwalNilai,
    gabahBeliQty,
    gabahBeliNilai,
    gabahTotalTersediaQty,
    gabahTotalTersediaNilai,
    hppGabahWeightedAvg,
    gabahDiprosesQty,
    biayaBahanBakuGabah,
    biayaOperasionalGiling,
    totalJointCost,
    totalNilaiPasarOutputs,
    allocations
  };
}

export function processTutupBukuBulanan(
  bulan: string,
  opnameFisik: Record<string, number>
): { success: boolean; message: string; breakdown?: HppBreakdownBulanan } {
  const currentOpname = getStoredStockOpname();

  // Check if month already closed
  if (currentOpname.some((o) => o.bulan === bulan)) {
    return {
      success: false,
      message: `Bulan ${bulan} sudah pernah ditutup. Silakan pilih bulan lain.`
    };
  }

  const items = getStoredPersediaan();
  const allKas = getStoredTransaksiKas();
  const monthKas = allKas.filter((k) => k.tanggal.startsWith(bulan));
  const breakdown = calculateHppBreakdownBulanan(bulan);

  const prevOpnames = currentOpname
    .filter((o) => o.bulan < bulan)
    .sort((a, b) => b.bulan.localeCompare(a.bulan));

  const newOpnameEntries: StockOpnameEntry[] = [];

  for (const item of items) {
    const isGabah = item.namaItem.toLowerCase().includes('gabah');
    const prevOpname = prevOpnames.find((o) => o.namaItem === item.namaItem);

    if (isGabah) {
      const saldoAwalQty = breakdown.gabahAwalQty;
      const saldoAwalNilai = breakdown.gabahAwalNilai;
      const masukQty = breakdown.gabahBeliQty;
      const masukNilai = breakdown.gabahBeliNilai;
      const keluarQty = breakdown.gabahDiprosesQty;
      const saldoAkhirSistemQty = breakdown.gabahTotalTersediaQty - breakdown.gabahDiprosesQty;
      const saldoAkhirFisikQty = opnameFisik[item.namaItem] ?? saldoAkhirSistemQty;
      const selisihQty = saldoAkhirSistemQty - saldoAkhirFisikQty;
      const hppPerUnit = breakdown.hppGabahWeightedAvg;
      const saldoAkhirNilai = saldoAkhirFisikQty * hppPerUnit;

      newOpnameEntries.push({
        bulan,
        namaItem: item.namaItem,
        saldoAwalQty,
        saldoAwalNilai,
        masukQty,
        masukNilai,
        keluarQty,
        saldoAkhirSistemQty,
        saldoAkhirFisikQty,
        selisihQty,
        hppPerUnit,
        saldoAkhirNilai
      });

      // Update physical count as new balance in stock
      updateStoredItemStock(item.namaItem, saldoAkhirFisikQty - item.saldoQty);
    } else {
      const alloc = breakdown.allocations.find((a) => a.namaItem === item.namaItem);
      const saldoAwalQty = prevOpname ? prevOpname.saldoAkhirFisikQty : item.saldoQty;
      const saldoAwalHpp = prevOpname ? prevOpname.hppPerUnit : item.hargaJualAcuan * 0.75;
      const saldoAwalNilai = saldoAwalQty * saldoAwalHpp;

      const masukQty = alloc ? alloc.qtyDiproduksi : 0;
      const masukNilai = alloc ? alloc.alokasiBiayaBersama : 0;

      // Sales of this product from cash ledger
      const itemSales = monthKas.filter(
        (k) => k.jenis === 'Pemasukan' && k.keterangan.toLowerCase().includes(item.namaItem.toLowerCase())
      );
      const keluarQty = itemSales.reduce((sum, k) => sum + (Number(k.qty) || 0), 0);

      const saldoAkhirSistemQty = saldoAwalQty + masukQty - keluarQty;
      const saldoAkhirFisikQty = opnameFisik[item.namaItem] ?? saldoAkhirSistemQty;
      const selisihQty = saldoAkhirSistemQty - saldoAkhirFisikQty;
      const hppPerUnit = alloc ? alloc.hppPerKg : item.hargaJualAcuan * 0.75;
      const saldoAkhirNilai = saldoAkhirFisikQty * hppPerUnit;

      newOpnameEntries.push({
        bulan,
        namaItem: item.namaItem,
        saldoAwalQty,
        saldoAwalNilai,
        masukQty,
        masukNilai,
        keluarQty,
        saldoAkhirSistemQty,
        saldoAkhirFisikQty,
        selisihQty,
        hppPerUnit,
        saldoAkhirNilai
      });

      // Update physical count as new balance in stock
      updateStoredItemStock(item.namaItem, saldoAkhirFisikQty - item.saldoQty);
    }
  }

  setItem(KEYS.STOCK_OPNAME, [...currentOpname, ...newOpnameEntries]);

  return {
    success: true,
    message: `Tutup buku bulan ${bulan} berhasil diproses. Seluruh HPP (Metode Rata-Rata Tertimbang & Alokasi Nilai Pasar Relatif) dan penyesuaian stok fisik telah diposting.`,
    breakdown
  };
}

// GAPOKTAN RENT CALCULATOR
export function calculateSewaGapoktan(tanggalMulai: string, tanggalSelesai: string): {
  success: boolean;
  message?: string;
  tarif: number;
  totalQty: number;
  totalBiaya: number;
  rincianPerBulan: RincianSewaGapoktanItem[];
} {
  const kas = getStoredTransaksiKas();
  const TARIF = 50;

  const normStart = formatDateToYYYYMMDD(tanggalMulai);
  const normEnd = formatDateToYYYYMMDD(tanggalSelesai);

  if (!normStart || !normEnd || normStart > normEnd) {
    return { success: false, message: 'Rentang tanggal tidak valid.', tarif: TARIF, totalQty: 0, totalBiaya: 0, rincianPerBulan: [] };
  }

  const monthlyMap: Record<string, number> = {};
  let totalQty = 0;

  kas.forEach(t => {
    if (t.keterangan.trim().toLowerCase() === 'jasa selep/ ongkos giling') {
      const normTgl = formatDateToYYYYMMDD(t.tanggal);
      if (normTgl >= normStart && normTgl <= normEnd) {
        const qty = Number(t.qty) || 0;
        const monthKey = normTgl.substring(0, 7);
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + qty;
        totalQty += qty;
      }
    }
  });

  const rincianPerBulan: RincianSewaGapoktanItem[] = Object.keys(monthlyMap)
    .sort()
    .map(key => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const qty = monthlyMap[key];
      return {
        bulan: key,
        label,
        qty,
        subtotal: qty * TARIF
      };
    });

  return {
    success: true,
    tarif: TARIF,
    totalQty,
    totalBiaya: totalQty * TARIF,
    rincianPerBulan
  };
}

// SALDO AWAL MIGRATION TOOL
export function isSaldoAwalProcessed(): boolean {
  return getItem<boolean>(KEYS.SALDO_AWAL_DONE, false);
}

export function resetSaldoAwal(): void {
  setItem(KEYS.SALDO_AWAL_DONE, false);
  try {
    localStorage.removeItem(KEYS.SERTAKAN_ASET_TETAP);
    localStorage.removeItem(KEYS.SALDO_AWAL_DATE);
  } catch {}

  // Clear auto modal entry from Modal & Kewajiban
  const currentModal = getItem<ModalKewajiban[]>(KEYS.MODAL, initialModalKewajiban);
  const filteredModal = currentModal.filter(
    (m) =>
      m.id !== 'MK-SALDO-AWAL-AUTO' &&
      !m.uraian.toLowerCase().includes('saldo awal kas & persediaan') &&
      !m.uraian.toLowerCase().includes('penyertaan modal desa')
  );
  setItem(KEYS.MODAL, filteredModal);

  // Clear auto initial kas entry from Buku Kas Harian
  const currentKas = getItem<TransaksiKas[]>(KEYS.TRANSAKSI_KAS, initialTransaksiKas);
  const filteredKas = currentKas.filter(
    (k) =>
      !(
        k.keterangan.toLowerCase().includes('penyertaan modal desa (saldo awal)') ||
        k.tambahanKeterangan?.toLowerCase().includes('migrasi saldo awal kas')
      )
  );
  setItem(KEYS.TRANSAKSI_KAS, filteredKas);

  notifyDataChanged();
}

export function processSaldoAwal(data: {
  tanggal: string;
  kasAwal: number;
  sertakanAsetTetap: boolean;
  persediaan: { namaItem: string; qty: number; nilai: number }[];
}): { success: boolean; message: string } {
  if (isSaldoAwalProcessed()) {
    return {
      success: false,
      message: 'Saldo awal sudah pernah diproses. Silakan klik tombol "Reset / Atur Ulang" terlebih dahulu jika ingin mengubah nilai.'
    };
  }

  // Record initial cash transaction if kasAwal > 0
  if (data.kasAwal > 0) {
    saveTransaksiKasBulk([
      {
        tanggal: data.tanggal,
        keterangan: 'Penyertaan Modal Desa (Saldo Awal)',
        nominalAktual: data.kasAwal,
        debit: data.kasAwal,
        kredit: 0,
        jenis: 'Pemasukan',
        metode: 'Nominal',
        tambahanKeterangan: 'Migrasi Saldo Awal Kas'
      }
    ]);
  }

  // Update initial inventories
  const persediaanItems = getStoredPersediaan();
  const updatedPersediaan = persediaanItems.map((item) => {
    const found = data.persediaan.find((p) => p.namaItem === item.namaItem);
    if (found && found.qty >= 0) {
      return { ...item, saldoQty: found.qty };
    }
    return item;
  });
  overwriteStoredPersediaan(updatedPersediaan);

  setItem(KEYS.SALDO_AWAL_DONE, true);
  setItem(KEYS.SERTAKAN_ASET_TETAP, data.sertakanAsetTetap);
  setItem(KEYS.SALDO_AWAL_DATE, data.tanggal);

  const totalNilaiPersediaan = data.persediaan.reduce((sum, p) => sum + p.nilai, 0);
  const asetList = getStoredAset();
  const totalNilaiAset = data.sertakanAsetTetap ? asetList.reduce((sum, a) => sum + a.nilaiPerolehan, 0) : 0;
  const totalModal = data.kasAwal + totalNilaiPersediaan + totalNilaiAset;
  const yearStr = data.tanggal ? data.tanggal.substring(0, 4) : new Date().getFullYear().toString();

  // Automatically save Modal Tambahan entry in Modal & Kewajiban tab
  saveStoredModalKewajiban({
    id: 'MK-SALDO-AWAL-AUTO',
    jenis: 'Modal',
    kategori: 'Modal Tambahan',
    uraian: `Penyertaan Modal Desa ${yearStr} (Saldo Awal Kas, Persediaan${data.sertakanAsetTetap ? ' & Aset Tetap' : ''})`,
    tanggal: data.tanggal,
    nilai: Math.round(totalModal),
    status: 'Aktif'
  });

  notifyDataChanged();

  return {
    success: true,
    message: `Saldo awal berhasil diposting. Total Penyertaan Modal Desa ${yearStr}: Rp ${totalModal.toLocaleString('id-ID')}`
  };
}

// GOOGLE APPS SCRIPT WEB APP URL SETTINGS
export function getGasWebAppUrl(): string {
  return getItem<string>(KEYS.GAS_URL, '');
}

export function saveGasWebAppUrl(url: string): string {
  const trimmed = url.trim();
  setItem(KEYS.GAS_URL, trimmed);
  return trimmed;
}
