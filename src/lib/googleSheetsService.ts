import {
  getStoredProfil,
  saveStoredProfil,
  getStoredTransaksiKas,
  overwriteStoredKas,
  getStoredMasterTransaksi,
  overwriteStoredMasterTransaksi,
  addMasterTransaksiBulk,
  getStoredPengurus,
  overwriteStoredPengurus,
  getStoredKaryawan,
  overwriteStoredKaryawan,
  getStoredPersediaan,
  overwriteStoredPersediaan,
  getStoredAset,
  overwriteStoredAset,
  getStoredModalKewajiban,
  overwriteStoredModalKewajiban,
  getStoredPayrollDistributions,
  overwriteStoredPayrollDistributions,
  getStoredLogProduksi,
  overwriteStoredLogProduksi,
  getAccountsForTransaction,
  getJurnalUmumEntries,
  getLastLocalMutationTime
} from './storage';
import { PayrollDistribution, LogProduksi, MasterTransaksi } from '../types';
import { getCachedAccessToken } from './googleAuth';
import { getTodayYYYYMMDD, formatDateToYYYYMMDD } from './formatters';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: string[];
}

const STORAGE_SPREADSHEET_KEY = 'bumdes_linked_spreadsheet_info_v1';
const STORAGE_APPS_SCRIPT_URL_KEY = 'bumdes_apps_script_url_v1';

export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbydB2AxBeKw3BVGH1bWfEInfDHNg8yvVUbsMvPiJlFo8bfgMCcP_1o8A1BWxIV-eZ-J/exec';

export function getStoredAppsScriptUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_APPS_SCRIPT_URL_KEY);
    if (saved && (saved.includes('AKfycbz3vgpbhcp2UohTBwrMeZ7V3uGEDiqmkPmc7ezShJQqFEaOvUk3YeUQ9CQyYDN8VXDl_w') || saved.trim() === '')) {
      localStorage.setItem(STORAGE_APPS_SCRIPT_URL_KEY, DEFAULT_APPS_SCRIPT_URL);
      return DEFAULT_APPS_SCRIPT_URL;
    }
    return saved || DEFAULT_APPS_SCRIPT_URL;
  } catch {
    return DEFAULT_APPS_SCRIPT_URL;
  }
}

export function hasCustomAppsScriptUrl(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_APPS_SCRIPT_URL_KEY);
    return Boolean(saved && saved.trim() !== '' && saved.trim() !== DEFAULT_APPS_SCRIPT_URL);
  } catch {
    return false;
  }
}

export function saveAppsScriptUrl(url: string) {
  try {
    if (!url.trim()) {
      localStorage.removeItem(STORAGE_APPS_SCRIPT_URL_KEY);
    } else {
      localStorage.setItem(STORAGE_APPS_SCRIPT_URL_KEY, url.trim());
    }
  } catch {}
}

export const DEFAULT_SPREADSHEET_ID = '1Z6KoH_WhzerJFGiAWqdmJ5zoM-3N2097PO3HT2ewIaM';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit?gid=0#gid=0`;

export function getDefaultSpreadsheetInfo(): SpreadsheetInfo {
  return {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    title: 'BUMDes Peternakan Telur & Olahan (Official Sheet)',
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    sheets: [
      'Buku Kas Harian',
      'Jurnal Umum',
      'Master Akun Kas',
      'Profil BUMDes',
      'Daftar Pengurus',
      'Daftar Karyawan',
      'Stok Persediaan',
      'Riwayat Produksi',
      'Aset Tetap',
      'Modal & Kewajiban',
      'Distribusi Gaji'
    ]
  };
}

export function getLinkedSpreadsheetInfo(): SpreadsheetInfo {
  try {
    const saved = localStorage.getItem(STORAGE_SPREADSHEET_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.spreadsheetId) {
        if (parsed.spreadsheetId === '18-49ciQiCvrvVEBqjQS6rCjbmhTgxPcJRX477r6GzsI') {
          const newInfo = getDefaultSpreadsheetInfo();
          saveLinkedSpreadsheetInfo(newInfo);
          return newInfo;
        }
        return parsed;
      }
    }
  } catch {}
  return getDefaultSpreadsheetInfo();
}

export function saveLinkedSpreadsheetInfo(info: SpreadsheetInfo | null) {
  if (!info) {
    localStorage.setItem(STORAGE_SPREADSHEET_KEY, JSON.stringify(getDefaultSpreadsheetInfo()));
  } else {
    localStorage.setItem(STORAGE_SPREADSHEET_KEY, JSON.stringify(info));
  }
}

let autoSyncDebounceTimer: any = null;
let isSyncingInBackground = false;
let isPullingData = false;
let pendingSyncRequested = false;
let syncPaused = false;

export function setSyncPaused(paused: boolean): void {
  syncPaused = paused;
}

export function isSyncPaused(): boolean {
  return syncPaused;
}

export function getIsPullingData(): boolean {
  return isPullingData;
}

/**
 * Automatically syncs local changes to Google Sheets in background with debouncing and queuing
 */
export async function triggerAutoSyncToSheets(immediate: boolean = false): Promise<void> {
  if (isPullingData || syncPaused) return;

  // Debounce multiple calls: 300ms for explicit mutation/delete, 1.5s for general typing
  const delay = immediate ? 300 : 1500;

  if (autoSyncDebounceTimer) {
    clearTimeout(autoSyncDebounceTimer);
  }

  autoSyncDebounceTimer = setTimeout(() => {
    autoSyncDebounceTimer = null;
    executeAutoSync();
  }, delay);
}

async function executeAutoSync(retryCount = 0): Promise<void> {
  if (isSyncingInBackground) {
    pendingSyncRequested = true;
    return;
  }

  const scriptUrl = getStoredAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL;
  const token = getCachedAccessToken();
  const info = getLinkedSpreadsheetInfo();

  try {
    isSyncingInBackground = true;

    // RULE 3: If user is LOGGED IN via Google OAuth, use Direct Google API sync
    if (token && info?.spreadsheetId) {
      await syncAllDataToGoogleSheets(token, info.spreadsheetId);
    } else if (scriptUrl) {
      await pushDataViaAppsScript(scriptUrl);
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn('Auto-sync background update to Google Sheets failed:', errMsg);

    // If quota exceeded (429) or rate limited, retry after delay
    if ((errMsg.includes('Quota') || errMsg.includes('429')) && retryCount < 2) {
      console.log(`Auto-sync rate limited. Retrying in 6 seconds (attempt ${retryCount + 1})...`);
      setTimeout(() => {
        executeAutoSync(retryCount + 1);
      }, 6000);
    }
  } finally {
    isSyncingInBackground = false;
    if (pendingSyncRequested) {
      pendingSyncRequested = false;
      triggerAutoSyncToSheets();
    }
  }
}

/**
 * Creates a brand new Google Spreadsheet with structured worksheets for BUMDes
 */
export async function createBumdesSpreadsheet(accessToken: string, title?: string): Promise<SpreadsheetInfo> {
  const profil = getStoredProfil();
  const sheetTitle = title || `BUMDes Digital - ${profil.namaBumdes || 'Pembukuan Official'}`;

  const requestBody = {
    properties: {
      title: sheetTitle
    },
    sheets: [
      { properties: { title: 'Buku Kas Harian' } },
      { properties: { title: 'Jurnal Umum' } },
      { properties: { title: 'Master Akun Kas' } },
      { properties: { title: 'Profil BUMDes' } },
      { properties: { title: 'Daftar Pengurus' } },
      { properties: { title: 'Daftar Karyawan' } },
      { properties: { title: 'Stok Persediaan' } },
      { properties: { title: 'Riwayat Produksi' } },
      { properties: { title: 'Aset Tetap' } },
      { properties: { title: 'Modal & Kewajiban' } },
      { properties: { title: 'Distribusi Gaji' } }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const data = await response.json();
  const info: SpreadsheetInfo = {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: data.sheets.map((s: any) => s.properties.title)
  };

  saveLinkedSpreadsheetInfo(info);
  return info;
}

/**
 * Fetch spreadsheet metadata to verify connection
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SpreadsheetInfo> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,spreadsheetUrl,sheets.properties.title`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error(`Akses Google Sheet ditolak (403). Mohon pastikan Spreadsheet Utama (${spreadsheetId || DEFAULT_SPREADSHEET_ID}) diatur izinnya ke "Siapa saja yang memiliki link dapat mengedit" pada Google Sheets.`);
    }
    throw new Error(err.error?.message || 'Gagal terhubung ke Google Spreadsheet ini.');
  }

  const data = await response.json();
  const info: SpreadsheetInfo = {
    spreadsheetId: data.spreadsheetId,
    title: data.properties.title,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => s.properties.title)
  };

  saveLinkedSpreadsheetInfo(info);
  return info;
}

/**
 * Sync all current BUMDes app data directly to Google Sheets
 */
export async function syncAllDataToGoogleSheets(accessToken: string, spreadsheetId: string): Promise<{ success: boolean; message: string }> {
  const kas = getStoredTransaksiKas();
  const masterKas = getStoredMasterTransaksi();
  const profil = getStoredProfil();
  const pengurus = getStoredPengurus();
  const karyawan = getStoredKaryawan();
  const persediaan = getStoredPersediaan();
  const logProduksi = getStoredLogProduksi();
  const aset = getStoredAset();
  const modal = getStoredModalKewajiban();
  const payrollMap = getStoredPayrollDistributions();

  // 1. Buku Kas Harian
  const kasRows: any[][] = [
    ['ID / No', 'Tanggal', 'Keterangan Transaksi', 'Jenis', 'Metode', 'Qty', 'Harga Satuan', 'Nominal (Rp)', 'Debit (Masuk)', 'Kredit (Keluar)', 'Catatan']
  ];
  kas.forEach((t) => {
    const debit = t.jenis === 'Pemasukan' ? t.nominalAktual : 0;
    const kredit = t.jenis === 'Pengeluaran' ? t.nominalAktual : 0;
    kasRows.push([
      t.id || t.rowNumber || '',
      t.tanggal,
      t.keterangan,
      t.jenis,
      t.metode || 'Nominal',
      t.qty || '',
      t.hargaSatuan || '',
      t.nominalAktual,
      debit,
      kredit,
      t.tambahanKeterangan || ''
    ]);
  });

  // 2. Jurnal Umum (Automated Journal Engine)
  const journalRows: any[][] = [
    ['No Bukti / ID', 'Tanggal', 'Keterangan Kas', 'Akun Debit', 'Akun Kredit', 'Nominal (Rp)', 'Jenis']
  ];
  const journalEntries = getJurnalUmumEntries();
  journalEntries.forEach((j) => {
    journalRows.push([
      j.noBukti,
      j.tanggal,
      j.keteranganKas,
      j.akunDebit,
      j.akunKredit,
      j.nominal,
      j.catatan || ''
    ]);
  });

  // 3. Master Akun Kas
  const masterKasRows: any[][] = [
    ['Keterangan Transaksi', 'Jenis', 'Metode Input', 'Kelompok Akun', 'Akun Debit', 'Akun Kredit']
  ];
  masterKas.forEach((m) => {
    const acc = getAccountsForTransaction(m.keterangan, m.jenis);
    masterKasRows.push([
      m.keterangan,
      m.jenis,
      m.metode,
      m.kelompok,
      m.debitAccount || acc.debitAccount,
      m.kreditAccount || acc.kreditAccount
    ]);
  });

  // 3. Profil BUMDes
  const profilRows: any[][] = [
    ['Parameter', 'Nilai'],
    ['Nama BUMDes', profil.namaBumdes],
    ['Desa', profil.desa],
    ['Kecamatan', profil.kecamatan],
    ['Kabupaten', profil.kabupaten],
    ['Unit Usaha Utama', profil.unitUsaha],
    ['Nomor SK Pendirian', profil.nomorSK],
    ['Terakhir Diperbarui', profil.terakhirDiperbarui || new Date().toLocaleString('id-ID')]
  ];

  // 4. Daftar Pengurus
  const pengurusRows: any[][] = [
    ['ID Pengurus', 'Nama Lengkap', 'Jabatan', 'Periode Mulai', 'Periode Selesai', 'Status']
  ];
  pengurus.forEach((p) => {
    pengurusRows.push([p.id, p.nama, p.jabatan, p.periodeMulai, p.periodeSelesai, p.status]);
  });

  // 5. Daftar Karyawan
  const karyawanRows: any[][] = [
    ['ID Karyawan', 'Nama Karyawan', 'Jabatan / Keterangan']
  ];
  karyawan.forEach((k) => {
    karyawanRows.push([k.id, k.name, k.description]);
  });

  // 6. Stok Persediaan
  const persediaanRows: any[][] = [
    ['Nama Barang / Produk', 'Satuan', 'Harga Jual Acuan (Rp)', 'Saldo Qty Stok']
  ];
  persediaan.forEach((p) => {
    persediaanRows.push([p.namaItem, p.satuan, p.hargaJualAcuan, p.saldoQty]);
  });

  // 7. Riwayat Produksi
  const produksiRows: any[][] = [
    ['No Produksi', 'Tanggal', 'Bahan/Pakan Dipakai (kg)', 'Rincian Output Hasil', 'Susut/Retak (kg)', 'Efisiensi (%)', 'Keterangan']
  ];
  logProduksi.forEach((l) => {
    const outputStr = l.outputs.map((o) => `${o.namaItem}: ${o.qty} kg`).join(', ');
    const rendemen = l.gabahDiproses > 0 ? (((l.gabahDiproses - l.susut) / l.gabahDiproses) * 100).toFixed(1) : '100';
    produksiRows.push([
      l.noProduksi,
      l.tanggal,
      l.gabahDiproses,
      outputStr,
      l.susut,
      `${rendemen}%`,
      l.keterangan
    ]);
  });

  // 8. Aset Tetap
  const asetRows: any[][] = [
    ['ID Aset', 'Nama Aset', 'Kategori', 'Kuantitas', 'Tanggal Perolehan', 'Nilai Perolehan (Rp)', 'Kondisi']
  ];
  aset.forEach((a) => {
    asetRows.push([a.id, a.nama, a.kategori, a.kuantitas || '-', a.tanggalPerolehan, a.nilaiPerolehan, a.kondisi]);
  });

  // 9. Modal & Kewajiban
  const modalRows: any[][] = [
    ['ID', 'Jenis', 'Kategori', 'Uraian Sumber', 'Tanggal', 'Nilai (Rp)', 'Status']
  ];
  modal.forEach((m) => {
    modalRows.push([m.id, m.jenis, m.kategori, m.uraian, m.tanggal, m.nilai, m.status]);
  });

  // 10. Distribusi Gaji
  const payrollRows: any[][] = [
    ['Row ID Transaksi', 'ID Karyawan', 'Hari Kerja', 'Tarif Harian (Rp)', 'Total Diterima (Rp)']
  ];
  Object.entries(payrollMap).forEach(([rowId, distList]) => {
    if (Array.isArray(distList)) {
      distList.forEach((d) => {
        payrollRows.push([rowId, d.employeeId, d.workday, d.rate || 0, d.total]);
      });
    }
  });

  const sheetsToSync = [
    { name: 'Buku Kas Harian', rows: kasRows },
    { name: 'Jurnal Umum', rows: journalRows },
    { name: 'Master Akun Kas', rows: masterKasRows },
    { name: 'Profil BUMDes', rows: profilRows },
    { name: 'Daftar Pengurus', rows: pengurusRows },
    { name: 'Daftar Karyawan', rows: karyawanRows },
    { name: 'Stok Persediaan', rows: persediaanRows },
    { name: 'Riwayat Produksi', rows: produksiRows },
    { name: 'Aset Tetap', rows: asetRows },
    { name: 'Modal & Kewajiban', rows: modalRows },
    { name: 'Distribusi Gaji', rows: payrollRows },
  ];

  await batchSyncToGoogleSheets(accessToken, spreadsheetId, sheetsToSync);

  return {
    success: true,
    message: 'Seluruh data master, akun, pengurus, produksi & transaksi berhasil disinkronkan ke Google Sheets!'
  };
}

/**
 * Batched clear and update to sync all worksheets in 2 HTTP API calls instead of 22
 */
async function batchSyncToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  sheetsToSync: { name: string; rows: any[][] }[]
) {
  // 1. Single Batch Clear API call
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  const clearRes = await fetch(clearUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ranges: sheetsToSync.map((s) => `${s.name}!A1:Z2000`)
    })
  });

  if (!clearRes.ok) {
    const err = await clearRes.json().catch(() => ({}));
    const message = err?.error?.message || clearRes.statusText;
    if (clearRes.status === 429) {
      throw new Error(`Quota write per minute terlampaui (429): ${message}`);
    }
    if (clearRes.status === 403) {
      throw new Error(`Akses Google Sheets ditolak (403): ${message}`);
    }
    console.warn('Batch clear warning:', err);
  }

  // 2. Single Batch Update API call
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: sheetsToSync.map((s) => ({
        range: `${s.name}!A1`,
        values: s.rows
      }))
    })
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    const message = err?.error?.message || updateRes.statusText;
    if (updateRes.status === 429) {
      throw new Error(`Quota write per minute terlampaui (429): ${message}`);
    }
    if (updateRes.status === 403) {
      throw new Error(`Akses Google Sheets ditolak (403): ${message}`);
    }
    throw new Error(`Gagal memperbarui Google Sheets: ${message}`);
  }
}

/**
 * Clears values in a range before overwriting
 */
async function clearSheetRange(accessToken: string, spreadsheetId: string, range: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
  } catch (e) {
    console.warn(`Gagal membersihkan range ${range}:`, e);
  }
}

/**
 * Clears trailing rows and writes 2D array matrix to a Google Sheet range
 */
async function clearAndWriteRangeToSheet(accessToken: string, spreadsheetId: string, sheetName: string, values: any[][]) {
  await clearSheetRange(accessToken, spreadsheetId, `${sheetName}!A1:Z2000`);
  await writeRangeToSheet(accessToken, spreadsheetId, `${sheetName}!A1`, values);
}

/**
 * Writes 2D array matrix to a Google Sheet range
 */
async function writeRangeToSheet(accessToken: string, spreadsheetId: string, range: string, values: any[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new Error('Akses Google Sheet ditolak (403). Pastikan file Spreadsheet Utama diatur izinnya ke "Siapa saja yang memiliki link dapat mengedit" di Google Sheets.');
    }
    throw new Error(err.error?.message || `Gagal menulis data ke sheet ${range}`);
  }
}

/**
 * Read transactions from Google Sheets
 */
export async function readKasDataFromSheets(accessToken: string, spreadsheetId: string): Promise<any[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Buku Kas Harian!A1:K1000')}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new Error('Akses Google Sheet ditolak (403). Pastikan file Spreadsheet Utama diatur izinnya ke "Siapa saja yang memiliki link dapat mengedit" di Google Sheets.');
    }
    throw new Error(err.error?.message || 'Gagal membaca data dari Google Sheets.');
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Pull and parse ALL master data and transactions from Google Sheets directly into local application state
 */
export function normalizeTanggal(val: any): string {
  return formatDateToYYYYMMDD(val);
}

let lastPullTime = 0;

export async function pullAllDataFromGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  const pullStartTime = Date.now();

  if (!force && syncPaused) {
    console.log('Skipping auto-pull because Google Sheets sync is paused.');
    return { success: true, message: 'Sync is paused, skipping pull.' };
  }

  if (!force && isSyncingInBackground) {
    console.log('Skipping auto-pull because background sync is uploading local changes.');
    return { success: true, message: 'Sync in progress, skipping pull.' };
  }

  const timeSinceMutation = Date.now() - getLastLocalMutationTime();
  if (!force && timeSinceMutation < 8000) {
    console.log('Skipping auto-pull because local data was recently mutated.');
    return { success: true, message: 'Recent local mutation, skipping pull.' };
  }

  const now = Date.now();
  if (!force && now - lastPullTime < 15000) {
    return { success: true, message: 'Data baru saja ditarik (throttled).' };
  }

  const ranges = [
    'Buku Kas Harian!A1:K1000',
    'Master Akun Kas!A1:D200',
    'Profil BUMDes!A1:B10',
    'Daftar Pengurus!A1:F100',
    'Daftar Karyawan!A1:C100',
    'Stok Persediaan!A1:D100',
    'Riwayat Produksi!A1:G200',
    'Aset Tetap!A1:F100',
    'Modal & Kewajiban!A1:G100',
    'Distribusi Gaji!A1:E200'
  ];

  try {
    const queryParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Google Sheets API Quota exceeded (429). Throttling automated sync.');
        return { success: false, message: 'Batas kuota Google Sheets API terlampaui. Polling disesuaikan.' };
      }
      if (res.status === 403) {
        throw new Error('Akses Google Sheet ditolak (403). Pastikan file Spreadsheet Utama diatur izinnya ke "Siapa saja yang memiliki link dapat mengedit" di Google Sheets.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal mengambil data dari Google Sheets (HTTP ${res.status})`);
    }

    const data = await res.json();
    const valueRanges = data.valueRanges || [];

    lastPullTime = Date.now();

    const kasRows = valueRanges[0]?.values || [];
    const masterRows = valueRanges[1]?.values || [];
    const profilRows = valueRanges[2]?.values || [];
    const pgrRows = valueRanges[3]?.values || [];
    const kRows = valueRanges[4]?.values || [];
    const pRows = valueRanges[5]?.values || [];
    const prdRows = valueRanges[6]?.values || [];
    const aRows = valueRanges[7]?.values || [];
    const mkRows = valueRanges[8]?.values || [];
    const payRows = valueRanges[9]?.values || [];

    // 1. Buku Kas Harian
    if (kasRows.length <= 1) {
      overwriteStoredKas([], true);
    } else {
      const parsedKas = kasRows.slice(1).map((row: any[], index: number) => {
        const id = String(row[0] || (index + 2));
        const tanggal = normalizeTanggal(row[1]);
        const keterangan = row[2] || '';
        const jenis = (row[3] === 'Pengeluaran' || String(row[3]).toLowerCase().includes('keluar')) ? 'Pengeluaran' : 'Pemasukan';
        const metode = (row[4] === 'QtyHarga' || String(row[4]).toLowerCase().includes('qty')) ? 'QtyHarga' : 'Nominal';
        const qty = Number(row[5]) || 0;
        const hargaSatuan = Number(row[6]) || 0;
        const nominalAktual = Number(row[7]) || Number(row[8]) || Number(row[9]) || (qty * hargaSatuan) || 0;
        const tambahanKeterangan = row[10] || '';
        const debit = jenis === 'Pemasukan' ? nominalAktual : 0;
        const kredit = jenis === 'Pengeluaran' ? nominalAktual : 0;

        return {
          id,
          rowNumber: index + 2,
          tanggal,
          keterangan,
          jenis: jenis as 'Pemasukan' | 'Pengeluaran',
          metode: metode as 'QtyHarga' | 'Nominal',
          qty,
          hargaSatuan,
          nominalAktual,
          debit,
          kredit,
          tambahanKeterangan
        };
      }).filter((k: any) => String(k.keterangan || '').trim() !== '');

      overwriteStoredKas(parsedKas, true);

      const newMasterItems: MasterTransaksi[] = [];
      parsedKas.forEach((k: any) => {
        if (k.keterangan) {
          newMasterItems.push({
            keterangan: k.keterangan,
            jenis: k.jenis,
            metode: k.metode,
            kelompok: k.jenis === 'Pemasukan' ? 'Pendapatan' : 'Biaya'
          });
        }
      });
      if (newMasterItems.length > 0) {
        addMasterTransaksiBulk(newMasterItems);
      }
    }

    // 2. Master Akun Kas
    if (masterRows.length <= 1) {
      overwriteStoredMasterTransaksi([], true);
    } else {
      const parsedMaster = masterRows.slice(1).map((r: any[]) => ({
        keterangan: String(r[0] || ''),
        jenis: (r[1] === 'Pengeluaran' || String(r[1]).toLowerCase().includes('keluar')) ? 'Pengeluaran' : 'Pemasukan',
        metode: (r[2] === 'QtyHarga' || String(r[2]).toLowerCase().includes('qty')) ? 'QtyHarga' : 'Nominal',
        kelompok: String(r[3] || (r[1] === 'Pengeluaran' ? 'Biaya' : 'Pendapatan'))
      })).filter(m => String(m.keterangan || '').trim() !== '');
      overwriteStoredMasterTransaksi(parsedMaster as any, true);
    }

    // 3. Profil BUMDes
    if (profilRows.length > 0) {
      const profilObj: any = {};
      profilRows.forEach((r: any[]) => {
        if (!r || r.length < 2) return;
        if (r[0] === 'Nama BUMDes') profilObj.namaBumdes = r[1];
        if (r[0] === 'Desa') profilObj.desa = r[1];
        if (r[0] === 'Kecamatan') profilObj.kecamatan = r[1];
        if (r[0] === 'Kabupaten') profilObj.kabupaten = r[1];
        if (r[0] === 'Unit Usaha Utama') profilObj.unitUsaha = r[1];
        if (r[0] === 'Nomor SK Pendirian') profilObj.nomorSK = r[1];
      });
      if (Object.keys(profilObj).length > 0) {
        saveStoredProfil(profilObj);
      }
    }

    // 4. Daftar Pengurus
    if (pgrRows.length <= 1) {
      overwriteStoredPengurus([], true);
    } else {
      const parsedPgr = pgrRows.slice(1).map((r: any[], idx: number) => ({
        id: r[0] || `PGR-${String(idx + 1).padStart(3, '0')}`,
        nama: r[1] || 'Pengurus',
        jabatan: r[2] || 'Pengurus BUMDes',
        periodeMulai: r[3] || '2024',
        periodeSelesai: r[4] || '2029',
        status: (r[5] || 'Aktif') as any
      })).filter(p => p.nama.trim() !== '');
      overwriteStoredPengurus(parsedPgr, true);
    }

    // 5. Daftar Karyawan
    if (kRows.length <= 1) {
      overwriteStoredKaryawan([], true);
    } else {
      const parsedK = kRows.slice(1).map((r: any[], idx: number) => ({
        id: r[0] || `EMP-${String(idx + 1).padStart(3, '0')}`,
        name: r[1] || 'Karyawan',
        description: r[2] || ''
      })).filter(k => k.name.trim() !== '');
      overwriteStoredKaryawan(parsedK, true);
    }

    // 6. Stok Persediaan
    if (pRows.length <= 1) {
      overwriteStoredPersediaan([], true);
    } else {
      const parsedP = pRows.slice(1).map((r: any[]) => ({
        namaItem: r[0] || 'Barang',
        satuan: r[1] || 'kg',
        hargaJualAcuan: Number(r[2]) || 0,
        saldoQty: Number(r[3]) || 0
      })).filter(p => p.namaItem.trim() !== '');
      overwriteStoredPersediaan(parsedP, true);
    }

    // 7. Riwayat Produksi
    if (prdRows.length <= 1) {
      overwriteStoredLogProduksi([], true);
    } else {
      const parsedLogs: LogProduksi[] = prdRows.slice(1).map((r: any[], idx: number) => {
        const noProduksi = Number(r[0]) || (idx + 1);
        const tanggal = normalizeTanggal(r[1]);
        const gabahDiproses = Number(r[2]) || 0;
        const outputStr = r[3] || '';
        const susut = Number(r[4]) || 0;
        const keterangan = r[6] || r[5] || 'Panen Telur';

        const outputs: { namaItem: string; qty: number }[] = [];
        if (outputStr) {
          const parts = outputStr.split(',');
          parts.forEach((p: string) => {
            const [n, qStr] = p.split(':');
            if (n && qStr) {
              const qtyNum = parseFloat(qStr.replace(/[^\d.]/g, '')) || 0;
              outputs.push({ namaItem: n.trim(), qty: qtyNum });
            }
          });
        }
        if (outputs.length === 0) {
          outputs.push({ namaItem: 'Telur Ayam', qty: Math.max(0, gabahDiproses - susut) });
        }

        return {
          noProduksi,
          tanggal,
          gabahDiproses,
          outputs,
          susut,
          keterangan
        };
      });
      overwriteStoredLogProduksi(parsedLogs, true);
    }

    // 8. Aset Tetap
    if (aRows.length <= 1) {
      overwriteStoredAset([], true);
    } else {
      const parsedA = aRows.slice(1).map((r: any[], idx: number) => {
        const hasKuantitasCol = r.length >= 7;
        let kuantitasVal = hasKuantitasCol ? Number(r[3]) : undefined;
        if (isNaN(kuantitasVal as any)) kuantitasVal = undefined;

        const tglIdx = hasKuantitasCol ? 4 : 3;
        const nilaiIdx = hasKuantitasCol ? 5 : 4;
        const kondisiIdx = hasKuantitasCol ? 6 : 5;

        return {
          id: String(r[0] || `AST-${String(idx + 1).padStart(3, '0')}`),
          nama: String(r[1] || 'Aset'),
          kategori: String(r[2] || 'Peralatan'),
          kuantitas: kuantitasVal,
          tanggalPerolehan: normalizeTanggal(r[tglIdx]),
          nilaiPerolehan: Number(r[nilaiIdx]) || 0,
          kondisi: (r[kondisiIdx] || 'Baik') as any
        };
      }).filter(a => a.nama.trim() !== '');
      overwriteStoredAset(parsedA, true);
    }

    // 9. Modal & Kewajiban
    if (mkRows.length <= 1) {
      overwriteStoredModalKewajiban([], true);
    } else {
      const parsedM = mkRows.slice(1).map((r: any[], idx: number) => ({
        id: r[0] || `MK-${String(idx + 1).padStart(3, '0')}`,
        jenis: (r[1] === 'Kewajiban' || String(r[1]).toLowerCase().includes('utang')) ? 'Kewajiban' : 'Modal',
        kategori: r[2] || 'Modal Disetor',
        uraian: r[3] || 'Penyertaan Modal',
        tanggal: normalizeTanggal(r[4]),
        nilai: Number(r[5]) || 0,
        status: r[6] || 'Aktif'
      })).filter(m => m.uraian.trim() !== '');
      overwriteStoredModalKewajiban(parsedM as any, true);
    }

    // 10. Distribusi Gaji
    if (payRows.length <= 1) {
      overwriteStoredPayrollDistributions({}, true);
    } else {
      const distMap: Record<number, PayrollDistribution[]> = {};
      payRows.slice(1).forEach((r: any[]) => {
        const rowId = Number(r[0]);
        if (!rowId) return;
        if (!distMap[rowId]) distMap[rowId] = [];
        distMap[rowId].push({
          employeeId: r[1] || 'EMP-001',
          workday: Number(r[2]) || 0,
          rate: Number(r[3]) || 0,
          total: Number(r[4]) || 0
        });
      });
      overwriteStoredPayrollDistributions(distMap, true);
    }

    return {
      success: true,
      message: 'Seluruh data master, akun, pengurus & transaksi berhasil ditarik dan diperbarui langsung dari Google Sheets!'
    };
  } catch (err: any) {
    console.warn('Gagal menarik data dari Google Sheets:', err);
    return {
      success: false,
      message: err.message || 'Gagal menarik data dari Google Sheets'
    };
  }
}

/**
 * Pulls all data from Google Sheets via Google Apps Script Web App (No Google Auth required!)
 */
export async function pullDataViaAppsScript(webAppUrl: string, force: boolean = false) {
  const url = webAppUrl.trim();
  if (!url) throw new Error('URL Apps Script Web App tidak boleh kosong');

  const pullStartTime = Date.now();

  if (!force && syncPaused) {
    console.log('Skipping Apps Script auto-pull because Google Sheets sync is paused.');
    return { success: true, message: 'Sync is paused, skipping pull.' };
  }

  if (!force && isSyncingInBackground) {
    console.log('Skipping Apps Script auto-pull because background sync is uploading local changes.');
    return { success: true, message: 'Sync in progress, skipping pull.' };
  }

  const timeSinceMutation = Date.now() - getLastLocalMutationTime();
  if (!force && timeSinceMutation < 8000) {
    console.log('Skipping Apps Script auto-pull because local data was recently mutated.');
    return { success: true, message: 'Recent local mutation, skipping pull.' };
  }

  const now = Date.now();
  if (!force && now - lastPullTime < 15000) {
    return { success: true, message: 'Data baru saja ditarik.' };
  }

  try {
    isPullingData = true;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Gagal menghubungi Web App (HTTP ${res.status}). Pastikan "Who has access" diatur ke "Anyone".`);
    }

    const allSheets = await res.json();
    if (!allSheets || typeof allSheets !== 'object') {
      throw new Error('Format data dari Web App tidak valid.');
    }

    // 1. Buku Kas Harian
    if (Array.isArray(allSheets['Buku Kas Harian'])) {
      const rows = allSheets['Buku Kas Harian'];
      if (rows.length > 1) {
        const headerRow = (rows[0] || []).map((c: any) => String(c || '').toLowerCase().trim());
        const hasIdCol = headerRow[0]?.includes('id') || headerRow[0]?.includes('no');

        let tglIdx = hasIdCol ? 1 : 0;
        let jenisIdx = hasIdCol ? 3 : 1;
        let ketIdx = hasIdCol ? 2 : 2;
        let qtyIdx = hasIdCol ? 5 : 3;
        let hargaIdx = hasIdCol ? 6 : 4;
        let nomIdx = hasIdCol ? 7 : 5;
        let debitIdx = hasIdCol ? 8 : 6;
        let kreditIdx = hasIdCol ? 9 : 7;
        let catIdx = hasIdCol ? 10 : 8;

        headerRow.forEach((h: string, idx: number) => {
          if (h.includes('tanggal')) tglIdx = idx;
          else if (h.includes('keterangan')) ketIdx = idx;
          else if (h.includes('jenis')) jenisIdx = idx;
          else if (h === 'qty' || h.includes('jumlah')) qtyIdx = idx;
          else if (h.includes('harga')) hargaIdx = idx;
          else if (h.includes('nominal')) nomIdx = idx;
          else if (h.includes('debit') || h.includes('masuk')) debitIdx = idx;
          else if (h.includes('kredit') || h.includes('keluar')) kreditIdx = idx;
          else if (h.includes('catatan') || h.includes('bukti')) catIdx = idx;
        });

        const parsedKas = rows.slice(1).map((r: any[], idx: number) => {
          const rawTgl = r[tglIdx];
          const tanggalStr = normalizeTanggal(rawTgl);
          const rawJenis = String(r[jenisIdx] || '');
          const jenis = (rawJenis === 'Pemasukan' || rawJenis.toLowerCase().includes('masuk')) ? 'Pemasukan' : 'Pengeluaran';
          const rawKet = String(r[ketIdx] || '');
          const qty = Number(r[qtyIdx]) || undefined;
          const hargaSatuan = Number(r[hargaIdx]) || undefined;
          const nominalAktual = Number(r[nomIdx]) || (qty && hargaSatuan ? qty * hargaSatuan : 0);
          const debit = Number(r[debitIdx]) || (jenis === 'Pemasukan' ? nominalAktual : 0);
          const kredit = Number(r[kreditIdx]) || (jenis === 'Pengeluaran' ? nominalAktual : 0);
          const tambahanKeterangan = String(r[catIdx] || '');

          let metode: 'QtyHarga' | 'Nominal' = 'Nominal';
          if (qty && qty > 0) {
            metode = 'QtyHarga';
          } else if (rawKet.toLowerCase().includes('jual') || rawKet.toLowerCase().includes('panen')) {
            metode = 'QtyHarga';
          }

          return {
            id: hasIdCol && r[0] ? String(r[0]) : String(idx + 1),
            rowNumber: idx + 2,
            tanggal: tanggalStr,
            jenis: jenis as any,
            keterangan: rawKet,
            metode,
            qty,
            hargaSatuan,
            nominalAktual,
            debit,
            kredit,
            tambahanKeterangan
          };
        }).filter(k => String(k.keterangan || '').trim() !== '');

        overwriteStoredKas(parsedKas, true);
      } else {
        overwriteStoredKas([], true);
      }
    }

    // 2. Master Akun Kas
    if (Array.isArray(allSheets['Master Akun Kas'])) {
      const rows = allSheets['Master Akun Kas'];
      if (rows.length > 1) {
        const parsedMaster = rows.slice(1).map((r: any[]) => ({
          keterangan: String(r[0] || ''),
          jenis: (r[1] === 'Pengeluaran' || String(r[1]).toLowerCase().includes('keluar')) ? 'Pengeluaran' : 'Pemasukan',
          metode: (r[2] === 'QtyHarga' || String(r[2]).toLowerCase().includes('qty')) ? 'QtyHarga' : 'Nominal',
          kelompok: String(r[3] || (r[1] === 'Pengeluaran' ? 'Biaya' : 'Pendapatan'))
        })).filter(m => String(m.keterangan || '').trim() !== '');
        overwriteStoredMasterTransaksi(parsedMaster as any, true);
      } else {
        overwriteStoredMasterTransaksi([], true);
      }
    }

    // 3. Profil BUMDes
    if (Array.isArray(allSheets['Profil BUMDes'])) {
      const rows = allSheets['Profil BUMDes'];
      const profilObj: any = {};
      rows.forEach((r: any[]) => {
        if (!r || r.length < 2) return;
        if (r[0] === 'Nama BUMDes') profilObj.namaBumdes = String(r[1] || '');
        if (r[0] === 'Desa') profilObj.desa = String(r[1] || '');
        if (r[0] === 'Kecamatan') profilObj.kecamatan = String(r[1] || '');
        if (r[0] === 'Kabupaten') profilObj.kabupaten = String(r[1] || '');
        if (r[0] === 'Unit Usaha Utama') profilObj.unitUsaha = String(r[1] || '');
        if (r[0] === 'Nomor SK Pendirian') profilObj.nomorSK = String(r[1] || '');
      });
      if (Object.keys(profilObj).length > 0) {
        saveStoredProfil(profilObj);
      }
    }

    // 4. Daftar Pengurus
    if (Array.isArray(allSheets['Daftar Pengurus'])) {
      const rows = allSheets['Daftar Pengurus'];
      if (rows.length > 1) {
        const parsedPgr = rows.slice(1).map((r: any[], idx: number) => ({
          id: String(r[0] || `PGR-${String(idx + 1).padStart(3, '0')}`),
          nama: String(r[1] || 'Pengurus'),
          jabatan: String(r[2] || 'Pengurus BUMDes'),
          periodeMulai: String(r[3] || '2024'),
          periodeSelesai: String(r[4] || '2029'),
          status: (r[5] || 'Aktif') as any
        })).filter(p => String(p.nama || '').trim() !== '');
        overwriteStoredPengurus(parsedPgr, true);
      }
    }

    // 5. Daftar Karyawan
    if (Array.isArray(allSheets['Daftar Karyawan'])) {
      const rows = allSheets['Daftar Karyawan'];
      if (rows.length > 1) {
        const parsedK = rows.slice(1).map((r: any[], idx: number) => ({
          id: String(r[0] || `EMP-${String(idx + 1).padStart(3, '0')}`),
          name: String(r[1] || 'Karyawan'),
          description: String(r[2] || '')
        })).filter(k => String(k.name || '').trim() !== '');
        overwriteStoredKaryawan(parsedK, true);
      }
    }

    // 6. Stok Persediaan
    if (Array.isArray(allSheets['Stok Persediaan'])) {
      const rows = allSheets['Stok Persediaan'];
      if (rows.length > 1) {
        const parsedP = rows.slice(1).map((r: any[]) => ({
          namaItem: String(r[0] || 'Barang'),
          satuan: String(r[1] || 'kg'),
          hargaJualAcuan: Number(r[2]) || 0,
          saldoQty: Number(r[3]) || 0
        })).filter(p => String(p.namaItem || '').trim() !== '');
        overwriteStoredPersediaan(parsedP, true);
      }
    }

    // 7. Riwayat Produksi
    if (Array.isArray(allSheets['Riwayat Produksi'])) {
      const rows = allSheets['Riwayat Produksi'];
      if (rows.length > 1) {
        const parsedLogs: LogProduksi[] = rows.slice(1).map((r: any[], idx: number) => {
          const noProduksi = Number(r[0]) || (idx + 1);
          const tanggal = normalizeTanggal(r[1]);
          const gabahDiproses = Number(r[2]) || 0;
          const outputStr = String(r[3] || '');
          const susut = Number(r[4]) || 0;
          const keterangan = String(r[6] || r[5] || 'Panen Telur');

          const outputs: { namaItem: string; qty: number }[] = [];
          if (outputStr) {
            const parts = outputStr.split(',');
            parts.forEach((p: string) => {
              const [n, qStr] = p.split(':');
              if (n && qStr) {
                const qtyNum = parseFloat(qStr.replace(/[^\d.]/g, '')) || 0;
                outputs.push({ namaItem: String(n).trim(), qty: qtyNum });
              }
            });
          }
          if (outputs.length === 0) {
            outputs.push({ namaItem: 'Telur Ayam', qty: Math.max(0, gabahDiproses - susut) });
          }

          return {
            noProduksi,
            tanggal,
            gabahDiproses,
            outputs,
            susut,
            keterangan
          };
        });
        overwriteStoredLogProduksi(parsedLogs, true);
      } else {
        overwriteStoredLogProduksi([], true);
      }
    }

    // 8. Aset Tetap
    if (Array.isArray(allSheets['Aset Tetap'])) {
      const rows = allSheets['Aset Tetap'];
      if (rows.length > 1) {
        const parsedA = rows.slice(1).map((r: any[], idx: number) => {
          const hasKuantitasCol = r.length >= 7;
          let kuantitasVal = hasKuantitasCol ? Number(r[3]) : undefined;
          if (isNaN(kuantitasVal as any)) kuantitasVal = undefined;

          const tglIdx = hasKuantitasCol ? 4 : 3;
          const nilaiIdx = hasKuantitasCol ? 5 : 4;
          const kondisiIdx = hasKuantitasCol ? 6 : 5;

          return {
            id: String(r[0] || `AST-${String(idx + 1).padStart(3, '0')}`),
            nama: String(r[1] || 'Aset'),
            kategori: String(r[2] || 'Peralatan'),
            kuantitas: kuantitasVal,
            tanggalPerolehan: normalizeTanggal(r[tglIdx]),
            nilaiPerolehan: Number(r[nilaiIdx]) || 0,
            kondisi: (r[kondisiIdx] || 'Baik') as any
          };
        }).filter(a => String(a.nama || '').trim() !== '');
        overwriteStoredAset(parsedA, true);
      } else {
        overwriteStoredAset([], true);
      }
    }

    // 9. Modal & Kewajiban
    if (Array.isArray(allSheets['Modal & Kewajiban'])) {
      const rows = allSheets['Modal & Kewajiban'];
      if (rows.length > 1) {
        const parsedM = rows.slice(1).map((r: any[], idx: number) => ({
          id: String(r[0] || `MK-${String(idx + 1).padStart(3, '0')}`),
          jenis: (r[1] === 'Kewajiban' || String(r[1]).toLowerCase().includes('utang')) ? 'Kewajiban' : 'Modal',
          kategori: String(r[2] || 'Modal Disetor'),
          uraian: String(r[3] || 'Penyertaan Modal'),
          tanggal: normalizeTanggal(r[4]),
          nilai: Number(r[5]) || 0,
          status: String(r[6] || 'Aktif')
        })).filter(m => String(m.uraian || '').trim() !== '');
        overwriteStoredModalKewajiban(parsedM as any, true);
      } else {
        overwriteStoredModalKewajiban([], true);
      }
    }

    // 10. Distribusi Gaji
    if (Array.isArray(allSheets['Distribusi Gaji'])) {
      const rows = allSheets['Distribusi Gaji'];
      if (rows.length > 1) {
        const distMap: Record<number, PayrollDistribution[]> = {};
        rows.slice(1).forEach((r: any[]) => {
          const rowId = Number(r[0]);
          if (!rowId) return;
          if (!distMap[rowId]) distMap[rowId] = [];
          distMap[rowId].push({
            employeeId: String(r[1] || 'EMP-001'),
            workday: Number(r[2]) || 0,
            rate: Number(r[3]) || 0,
            total: Number(r[4]) || 0
          });
        });
        overwriteStoredPayrollDistributions(distMap, true);
      }
    }

    saveAppsScriptUrl(url);

    return {
      success: true,
      message: 'Data berhasil ditarik langsung dari Google Sheets via Apps Script Web App (Bebas Login)!'
    };
  } finally {
    isPullingData = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bumdes_data_updated'));
    }
  }
}

/**
 * Pushes all local app data to Google Sheets via Google Apps Script Web App
 */
export async function pushDataViaAppsScript(webAppUrl: string) {
  const url = webAppUrl.trim();
  if (!url) throw new Error('URL Apps Script Web App tidak boleh kosong');

  const kas = getStoredTransaksiKas();
  const masterKas = getStoredMasterTransaksi();
  const profil = getStoredProfil();
  const pengurus = getStoredPengurus();
  const karyawan = getStoredKaryawan();
  const persediaan = getStoredPersediaan();
  const aset = getStoredAset();
  const modal = getStoredModalKewajiban();
  const payrollMap = getStoredPayrollDistributions();
  const logProduksi = getStoredLogProduksi();

  const kasRows: any[][] = [
    ['ID / No', 'Tanggal', 'Keterangan Transaksi', 'Jenis', 'Metode', 'Qty', 'Harga Satuan', 'Nominal (Rp)', 'Debit (Masuk)', 'Kredit (Keluar)', 'Catatan']
  ];
  kas.forEach((t) => {
    const debit = t.jenis === 'Pemasukan' ? t.nominalAktual : 0;
    const kredit = t.jenis === 'Pengeluaran' ? t.nominalAktual : 0;
    kasRows.push([
      t.id || t.rowNumber || '',
      normalizeTanggal(t.tanggal),
      t.keterangan,
      t.jenis,
      t.metode || 'Nominal',
      t.qty || '',
      t.hargaSatuan || '',
      t.nominalAktual,
      debit,
      kredit,
      t.tambahanKeterangan || ''
    ]);
  });

  const journalRows: any[][] = [
    ['No Bukti / ID', 'Tanggal', 'Keterangan Kas', 'Akun Debit', 'Akun Kredit', 'Nominal (Rp)', 'Jenis']
  ];
  const journalEntries = getJurnalUmumEntries();
  journalEntries.forEach((j) => {
    journalRows.push([j.noBukti, normalizeTanggal(j.tanggal), j.keteranganKas, j.akunDebit, j.akunKredit, j.nominal, j.catatan || '']);
  });

  const masterKasRows: any[][] = [
    ['Keterangan Transaksi', 'Jenis', 'Metode Input', 'Kelompok Akun', 'Akun Debit', 'Akun Kredit']
  ];
  masterKas.forEach((m) => {
    const acc = getAccountsForTransaction(m.keterangan, m.jenis);
    masterKasRows.push([m.keterangan, m.jenis, m.metode, m.kelompok, m.debitAccount || acc.debitAccount, m.kreditAccount || acc.kreditAccount]);
  });

  const profilRows: any[][] = [
    ['Parameter', 'Nilai'],
    ['Nama BUMDes', profil.namaBumdes],
    ['Desa', profil.desa],
    ['Kecamatan', profil.kecamatan],
    ['Kabupaten', profil.kabupaten],
    ['Unit Usaha Utama', profil.unitUsaha],
    ['Nomor SK Pendirian', profil.nomorSK],
    ['Terakhir Diperbarui', profil.terakhirDiperbarui || new Date().toLocaleString('id-ID')]
  ];

  const pengurusRows: any[][] = [
    ['ID Pengurus', 'Nama Lengkap', 'Jabatan', 'Periode Mulai', 'Periode Selesai', 'Status']
  ];
  pengurus.forEach((p) => {
    pengurusRows.push([p.id, p.nama, p.jabatan, p.periodeMulai, p.periodeSelesai, p.status]);
  });

  const karyawanRows: any[][] = [
    ['ID Karyawan', 'Nama Karyawan', 'Jabatan / Keterangan']
  ];
  karyawan.forEach((k) => {
    karyawanRows.push([k.id, k.name, k.description]);
  });

  const persediaanRows: any[][] = [
    ['Nama Barang / Produk', 'Satuan', 'Harga Jual Acuan (Rp)', 'Saldo Qty Stok']
  ];
  persediaan.forEach((p) => {
    persediaanRows.push([p.namaItem, p.satuan, p.hargaJualAcuan, p.saldoQty]);
  });

  const produksiRows: any[][] = [
    ['No Produksi', 'Tanggal', 'Bahan/Pakan Dipakai (kg)', 'Rincian Output Hasil', 'Susut/Retak (kg)', 'Efisiensi (%)', 'Keterangan']
  ];
  logProduksi.forEach((l) => {
    const outputStr = l.outputs.map((o) => `${o.namaItem}: ${o.qty} kg`).join(', ');
    const rendemen = l.gabahDiproses > 0 ? (((l.gabahDiproses - l.susut) / l.gabahDiproses) * 100).toFixed(1) : '100';
    produksiRows.push([l.noProduksi, normalizeTanggal(l.tanggal), l.gabahDiproses, outputStr, l.susut, `${rendemen}%`, l.keterangan]);
  });

  const asetRows: any[][] = [
    ['ID Aset', 'Nama Aset', 'Kategori', 'Kuantitas', 'Tanggal Perolehan', 'Nilai Perolehan (Rp)', 'Kondisi']
  ];
  aset.forEach((a) => {
    asetRows.push([a.id, a.nama, a.kategori, a.kuantitas || '-', normalizeTanggal(a.tanggalPerolehan), a.nilaiPerolehan, a.kondisi]);
  });

  const modalRows: any[][] = [
    ['ID', 'Jenis', 'Kategori', 'Uraian Sumber', 'Tanggal', 'Nilai (Rp)', 'Status']
  ];
  modal.forEach((m) => {
    modalRows.push([m.id, m.jenis, m.kategori, m.uraian, normalizeTanggal(m.tanggal), m.nilai, m.status]);
  });

  const payrollRows: any[][] = [
    ['Row ID Transaksi', 'ID Karyawan', 'Hari Kerja', 'Tarif Harian (Rp)', 'Total Diterima (Rp)']
  ];
  Object.entries(payrollMap).forEach(([rowId, distList]) => {
    if (Array.isArray(distList)) {
      distList.forEach((d) => {
        payrollRows.push([rowId, d.employeeId, d.workday, d.rate || 0, d.total]);
      });
    }
  });

  const payload = {
    'Buku Kas Harian': kasRows,
    'Jurnal Umum': journalRows,
    'Master Akun Kas': masterKasRows,
    'Profil BUMDes': profilRows,
    'Daftar Pengurus': pengurusRows,
    'Daftar Karyawan': karyawanRows,
    'Stok Persediaan': persediaanRows,
    'Riwayat Produksi': produksiRows,
    'Aset Tetap': asetRows,
    'Modal & Kewajiban': modalRows,
    'Distribusi Gaji': payrollRows
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Gagal mengirim data ke Web App (HTTP ${res.status}).`);
  }

  saveAppsScriptUrl(url);

  return {
    success: true,
    message: '✓ BERHASIL! Data & 11 sheet pembukuan (Buku Kas, Master Akun, Stok Persediaan, Profil, Karyawan, Aset, Modal, dll) telah dibuat & terisi otomatis di Google Sheet Anda!'
  };
}
