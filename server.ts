import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getAllBumdesData,
  getProfil,
  saveProfil,
  getPengurusList,
  replacePengurusList,
  getAsetList,
  replaceAsetList,
  getModalList,
  replaceModalList,
  getMasterTransaksiList,
  replaceMasterTransaksiList,
  getTransaksiKasList,
  replaceTransaksiKasList,
  getKaryawanList,
  replaceKaryawanList,
  getPayrollDistributions,
  replacePayrollDistributions,
  getItemPersediaanList,
  replaceItemPersediaanList,
  getLogProduksiList,
  replaceLogProduksiList,
  getStockOpnameList,
  replaceStockOpnameList,
  seedInitialDataIfEmpty,
  setAppSetting
} from './src/db/bumdes.ts';
import {
  checkSupabaseTablesExist,
  getAllFromSupabase,
  getProfilFromSupabase,
  saveProfilToSupabase,
  getPengurusFromSupabase,
  replacePengurusInSupabase,
  replaceAsetInSupabase,
  replaceModalInSupabase,
  replaceMasterTransaksiInSupabase,
  replaceTransaksiKasInSupabase,
  replaceKaryawanInSupabase,
  replacePayrollInSupabase,
  replacePersediaanInSupabase,
  replaceProduksiInSupabase,
  replaceStockOpnameInSupabase,
  saveAppSettingToSupabase,
  seedInitialDataToSupabase
} from './src/db/supabaseRepo.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { isSupabaseConfigured } from './src/lib/supabaseClient.ts';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health & Database Info endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const supabaseCheck = await checkSupabaseTablesExist();
    let bumdesNama = 'BUMDes Karya Mandiri';
    if (isSupabaseConfigured && supabaseCheck.exists) {
      const p = await getProfilFromSupabase();
      bumdesNama = p.namaBumdes;
    } else {
      const data = await getProfil();
      bumdesNama = data.namaBumdes;
    }
    res.json({
      status: 'ok',
      database: isSupabaseConfigured
        ? supabaseCheck.exists
          ? 'Supabase (Aktif & Terhubung)'
          : 'Supabase (Tabel Belum Dibuat di SQL Editor)'
        : 'PostgreSQL (Cloud SQL / Supabase Engine)',
      isSupabase: isSupabaseConfigured,
      supabaseReady: supabaseCheck.exists,
      supabaseMessage: supabaseCheck.message,
      connected: true,
      bumdes: bumdesNama
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: isSupabaseConfigured ? 'Supabase' : 'PostgreSQL',
      isSupabase: isSupabaseConfigured,
      connected: false,
      message: err.message || 'Database unavailable'
    });
  }
});

// Supabase information and SQL schema helper
app.get('/api/supabase/info', async (_req, res) => {
  try {
    const sqlPath = path.resolve(__dirname, 'supabase_schema.sql');
    let sqlContent = '';
    if (fs.existsSync(sqlPath)) {
      sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    }
    const check = await checkSupabaseTablesExist();
    res.json({
      isConfigured: isSupabaseConfigured,
      supabaseUrl: process.env.SUPABASE_URL || null,
      projectHost: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.replace(/https?:\/\//, '') : null,
      tablesExist: check.exists,
      message: check.message,
      sqlScript: sqlContent
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Manual migration / push current data to Supabase
app.post('/api/supabase/seed-now', optionalAuth, async (_req, res) => {
  try {
    const check = await checkSupabaseTablesExist();
    if (!check.exists) {
      return res.status(400).json({
        success: false,
        error: check.message
      });
    }

    // Push current data from local/PostgreSQL to Supabase
    const localData = await getAllBumdesData();
    if (localData.profil) await saveProfilToSupabase(localData.profil);
    if (localData.pengurus) await replacePengurusInSupabase(localData.pengurus);
    if (localData.aset) await replaceAsetInSupabase(localData.aset);
    if (localData.modal) await replaceModalInSupabase(localData.modal);
    if (localData.masterTransaksi) await replaceMasterTransaksiInSupabase(localData.masterTransaksi);
    if (localData.transaksiKas) await replaceTransaksiKasInSupabase(localData.transaksiKas);
    if (localData.karyawan) await replaceKaryawanInSupabase(localData.karyawan);
    if (localData.payrollDistributions) await replacePayrollInSupabase(localData.payrollDistributions);
    if (localData.itemPersediaan) await replacePersediaanInSupabase(localData.itemPersediaan);
    if (localData.logProduksi) await replaceProduksiInSupabase(localData.logProduksi);
    if (localData.stockOpname) await replaceStockOpnameInSupabase(localData.stockOpname);

    res.json({
      success: true,
      message: 'Seluruh data berhasil disinkronkan ke Supabase Anda!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// User sync (Firebase UID to PostgreSQL)
app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || 'user@bumdes.local';
    if (!uid) {
      return res.status(400).json({ error: 'Missing UID' });
    }
    const userRecord = await getOrCreateUser(uid, email);
    res.json({ success: true, user: userRecord });
  } catch (error: any) {
    console.error('sync-user error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// Full state load
app.get('/api/bumdes/all', optionalAuth, async (_req, res) => {
  try {
    // If Supabase is configured and tables exist, prioritize Supabase
    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        // Seed if empty in Supabase
        await seedInitialDataToSupabase();
        const data = await getAllFromSupabase();
        return res.json({ success: true, data, source: 'supabase' });
      }
    }

    // Otherwise use PostgreSQL
    await seedInitialDataIfEmpty();
    const data = await getAllBumdesData();
    res.json({ success: true, data, source: 'postgresql' });
  } catch (error: any) {
    console.error('getAllBumdesData error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch data' });
  }
});

// Full state bulk sync
app.post('/api/bumdes/sync-all', optionalAuth, async (req, res) => {
  try {
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
    } = req.body;

    // 1. If Supabase is configured and tables exist, SAVE DIRECTLY TO SUPABASE FIRST
    if (isSupabaseConfigured) {
      try {
        const check = await checkSupabaseTablesExist();
        if (check.exists) {
          if (profil) await saveProfilToSupabase(profil);
          if (pengurus) await replacePengurusInSupabase(pengurus);
          if (aset) await replaceAsetInSupabase(aset);
          if (modal) await replaceModalInSupabase(modal);
          if (masterTransaksi) await replaceMasterTransaksiInSupabase(masterTransaksi);
          if (transaksiKas) await replaceTransaksiKasInSupabase(transaksiKas);
          if (karyawan) await replaceKaryawanInSupabase(karyawan);
          if (payrollDistributions) await replacePayrollInSupabase(payrollDistributions);
          if (itemPersediaan) await replacePersediaanInSupabase(itemPersediaan);
          if (logProduksi) await replaceProduksiInSupabase(logProduksi);
          if (stockOpname) await replaceStockOpnameInSupabase(stockOpname);
          if (settings) {
            if (typeof settings.saldoAwalDone === 'boolean') {
              await saveAppSettingToSupabase('bumdes_saldo_awal_done_v2', String(settings.saldoAwalDone));
            }
            if (typeof settings.sertakanAsetTetap === 'boolean') {
              await saveAppSettingToSupabase('bumdes_sertakan_aset_tetap_v2', String(settings.sertakanAsetTetap));
            }
            if (settings.saldoAwalDate) {
              await saveAppSettingToSupabase('bumdes_saldo_awal_date_v2', String(settings.saldoAwalDate));
            }
          }
        }
      } catch (err) {
        console.error('Direct save to Supabase error:', err);
      }
    }

    // 2. Also save to Cloud SQL in background without blocking Supabase response
    (async () => {
      try {
        if (profil) await saveProfil(profil);
        if (pengurus) await replacePengurusList(pengurus);
        if (aset) await replaceAsetList(aset);
        if (modal) await replaceModalList(modal);
        if (masterTransaksi) await replaceMasterTransaksiList(masterTransaksi);
        if (transaksiKas) await replaceTransaksiKasList(transaksiKas);
        if (karyawan) await replaceKaryawanList(karyawan);
        if (payrollDistributions) await replacePayrollDistributions(payrollDistributions);
        if (itemPersediaan) await replaceItemPersediaanList(itemPersediaan);
        if (logProduksi) await replaceLogProduksiList(logProduksi);
        if (stockOpname) await replaceStockOpnameList(stockOpname);

        if (settings) {
          if (typeof settings.saldoAwalDone === 'boolean') {
            await setAppSetting('bumdes_saldo_awal_done_v2', String(settings.saldoAwalDone));
          }
          if (typeof settings.sertakanAsetTetap === 'boolean') {
            await setAppSetting('bumdes_sertakan_aset_tetap_v2', String(settings.sertakanAsetTetap));
          }
          if (settings.saldoAwalDate) {
            await setAppSetting('bumdes_saldo_awal_date_v2', String(settings.saldoAwalDate));
          }
        }
      } catch (pgErr: any) {
        console.warn('Cloud SQL background sync notice:', pgErr.message);
      }
    })().catch(() => {});

    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        const latest = await getAllFromSupabase();
        return res.json({ success: true, data: latest });
      }
    }

    const latest = await getAllBumdesData();
    res.json({ success: true, data: latest });
  } catch (error: any) {
    console.error('sync-all error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to sync data' });
  }
});

// Profil routes
app.get('/api/bumdes/profil', optionalAuth, async (_req, res) => {
  try {
    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        const data = await getProfilFromSupabase();
        return res.json({ success: true, data });
      }
    }
    const data = await getProfil();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bumdes/profil', optionalAuth, async (req, res) => {
  try {
    let updated = req.body;
    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        updated = await saveProfilToSupabase(req.body);
      }
    }
    saveProfil(req.body).catch((e) => console.warn('Cloud SQL profil notice:', e.message));
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pengurus routes (Direct & Instant Supabase Sync)
app.get('/api/bumdes/pengurus', optionalAuth, async (_req, res) => {
  try {
    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        const data = await getPengurusFromSupabase();
        return res.json({ success: true, data });
      }
    }
    const data = await getPengurusList();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bumdes/pengurus', optionalAuth, async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Body must be an array of pengurus' });
    }
    if (isSupabaseConfigured) {
      const check = await checkSupabaseTablesExist();
      if (check.exists) {
        await replacePengurusInSupabase(items);
      }
    }
    replacePengurusList(items).catch((e) => console.warn('Cloud SQL pengurus notice:', e.message));
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('POST /api/bumdes/pengurus error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initial seed trigger
app.post('/api/bumdes/seed', optionalAuth, async (_req, res) => {
  try {
    const seeded = await seedInitialDataIfEmpty();
    if (isSupabaseConfigured) {
      seedInitialDataToSupabase().catch(() => {});
    }
    res.json({ success: true, seeded });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mount Vite or serve static frontend
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Pre-seed database if empty
  seedInitialDataIfEmpty().catch((e) => console.warn('Background initial seed notice:', e.message));

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
