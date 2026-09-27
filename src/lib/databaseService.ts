import {
  getStoredProfil,
  getStoredPengurus,
  getStoredAset,
  getStoredModalKewajiban,
  getMasterTransaksi,
  getStoredKas,
  getStoredKaryawan,
  getPayrollDistributions,
  getStoredPersediaan,
  getStoredLogProduksi,
  getStockOpnameEntries,
  isSaldoAwalDone,
  isSertakanAsetTetapEnabled,
  getStoredSaldoAwalDate,
  overwriteStoredProfilDirect,
  overwriteStoredPengurus,
  overwriteStoredAset,
  overwriteStoredModalKewajiban,
  overwriteMasterTransaksi,
  overwriteStoredKas,
  overwriteStoredKaryawan,
  overwritePayrollDistributions,
  overwriteStoredPersediaan,
  overwriteStoredLogProduksi,
  overwriteStockOpname,
  setSaldoAwalDone,
  setSertakanAsetTetapEnabled,
  setStoredSaldoAwalDate
} from './storage.ts';
import { isSupabaseConfigured } from './supabase.ts';
import {
  checkSupabaseTablesExist,
  getAllFromSupabase,
  syncAllToSupabase,
  seedInitialDataToSupabase,
  getProfilFromSupabase
} from './services/bumdesService.ts';

let isSyncing = false;
let isPulling = false;
let lastSyncTimestamp: string | null = null;
let lastSyncError: string | null = null;
let syncDebounceTimer: any = null;

export function getIsSyncing(): boolean {
  return isSyncing;
}

export function getIsPulling(): boolean {
  return isPulling;
}

export function getLastSyncTime(): string | null {
  return lastSyncTimestamp;
}

export function getLastSyncError(): string | null {
  return lastSyncError;
}

export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  database: string;
  bumdes?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      database: 'Supabase (belum dikonfigurasi)',
      error: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diatur'
    };
  }
  try {
    const check = await checkSupabaseTablesExist();
    const profil = await getProfilFromSupabase();
    return {
      connected: check.exists,
      database: check.exists ? 'Supabase (Aktif & Terhubung)' : 'Supabase (Tabel Belum Dibuat di SQL Editor)',
      bumdes: profil.namaBumdes
    };
  } catch (err: any) {
    return {
      connected: false,
      database: 'Supabase',
      error: err.message || 'Database unavailable'
    };
  }
}

export async function pullFromDatabase(): Promise<{ success: boolean; message: string }> {
  if (isPulling) {
    return { success: false, message: 'Sync sedang berjalan...' };
  }
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase belum dikonfigurasi (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).' };
  }

  isPulling = true;
  try {
    const check = await checkSupabaseTablesExist();
    if (!check.exists) {
      throw new Error(check.message);
    }

    const data = await getAllFromSupabase();
    const {
      profil,
      pengurus,
      aset,
      modal,
      masterTransaksi,
      transaksiKas,
      karyawan,
      payrollDistributions,
      itemPersediaan,
      logProduksi,
      stockOpname,
      settings
    } = data;

    // Update local state without triggering an immediate push cycle
    if (profil && profil.namaBumdes) {
      overwriteStoredProfilDirect(profil);
    }
    if (Array.isArray(pengurus) && pengurus.length > 0) {
      overwriteStoredPengurus(pengurus, true);
    }
    if (Array.isArray(aset) && aset.length > 0) {
      overwriteStoredAset(aset, true);
    }
    if (Array.isArray(modal) && modal.length > 0) {
      overwriteStoredModalKewajiban(modal, true);
    }
    if (Array.isArray(masterTransaksi) && masterTransaksi.length > 0) {
      overwriteMasterTransaksi(masterTransaksi, true);
    }
    if (Array.isArray(transaksiKas) && transaksiKas.length > 0) {
      overwriteStoredKas(transaksiKas, true);
    }
    if (Array.isArray(karyawan) && karyawan.length > 0) {
      overwriteStoredKaryawan(karyawan, true);
    }
    if (payrollDistributions && typeof payrollDistributions === 'object') {
      overwritePayrollDistributions(payrollDistributions, true);
    }
    if (Array.isArray(itemPersediaan) && itemPersediaan.length > 0) {
      overwriteStoredPersediaan(itemPersediaan, true);
    }
    if (Array.isArray(logProduksi) && logProduksi.length > 0) {
      overwriteStoredLogProduksi(logProduksi, true);
    }
    if (Array.isArray(stockOpname)) {
      overwriteStockOpname(stockOpname, true);
    }
    if (settings) {
      if (typeof settings.saldoAwalDone === 'boolean') {
        setSaldoAwalDone(settings.saldoAwalDone, true);
      }
      if (typeof settings.sertakanAsetTetap === 'boolean') {
        setSertakanAsetTetapEnabled(settings.sertakanAsetTetap, true);
      }
      if (settings.saldoAwalDate) {
        setStoredSaldoAwalDate(settings.saldoAwalDate, true);
      }
    }

    lastSyncTimestamp = new Date().toLocaleTimeString('id-ID');
    lastSyncError = null;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bumdes_data_updated'));
    }

    return { success: true, message: 'Data berhasil disinkronkan dari Supabase.' };
  } catch (err: any) {
    lastSyncError = err.message || 'Gagal sinkronisasi';
    console.error('pullFromDatabase error:', err);
    return { success: false, message: lastSyncError || 'Gagal memuat dari database.' };
  } finally {
    isPulling = false;
  }
}

export async function pushToDatabase(): Promise<{ success: boolean; message: string }> {
  if (isSyncing) {
    return { success: false, message: 'Proses penyimpanan sedang berlangsung...' };
  }
  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase belum dikonfigurasi (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).' };
  }

  isSyncing = true;
  try {
    const payload = {
      profil: getStoredProfil(),
      pengurus: getStoredPengurus(),
      aset: getStoredAset(),
      modal: getStoredModalKewajiban(),
      masterTransaksi: getMasterTransaksi(),
      transaksiKas: getStoredKas(),
      karyawan: getStoredKaryawan(),
      payrollDistributions: getPayrollDistributions(),
      itemPersediaan: getStoredPersediaan(),
      logProduksi: getStoredLogProduksi(),
      stockOpname: getStockOpnameEntries(),
      settings: {
        saldoAwalDone: isSaldoAwalDone(),
        sertakanAsetTetap: isSertakanAsetTetapEnabled(),
        saldoAwalDate: getStoredSaldoAwalDate()
      }
    };

    const check = await checkSupabaseTablesExist();
    if (!check.exists) {
      throw new Error(check.message);
    }

    await syncAllToSupabase(payload);

    lastSyncTimestamp = new Date().toLocaleTimeString('id-ID');
    lastSyncError = null;
    return { success: true, message: 'Semua data tersimpan otomatis ke Supabase.' };
  } catch (err: any) {
    lastSyncError = err.message || 'Penyimpanan gagal';
    console.error('pushToDatabase error:', err);
    return { success: false, message: lastSyncError || 'Penyimpanan gagal' };
  } finally {
    isSyncing = false;
  }
}

export async function seedDatabase(): Promise<{ success: boolean; seeded: boolean; message?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, seeded: false, message: 'Supabase belum dikonfigurasi.' };
  }
  try {
    const seeded = await seedInitialDataToSupabase();
    return { success: true, seeded };
  } catch (err: any) {
    return { success: false, seeded: false, message: err.message || 'Gagal seed data' };
  }
}

export function triggerAutoSyncToDatabase(): Promise<any> {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  return new Promise((resolve) => {
    syncDebounceTimer = setTimeout(async () => {
      const res = await pushToDatabase();
      resolve(res);
    }, 400);
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('bumdes_auto_sync_request', () => {
    if (!isPulling) {
      triggerAutoSyncToDatabase().catch(() => {});
    }
  });
}
