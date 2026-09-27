import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.ts';
import {
  BumdesProfil,
  Pengurus,
  AsetTetap,
  ModalKewajiban,
  MasterTransaksi,
  TransaksiKas,
  Karyawan,
  PayrollDistribution,
  ItemPersediaan,
  LogProduksi,
  StockOpnameEntry
} from '../types.ts';
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
} from '../data/initialData.ts';

export async function checkSupabaseTablesExist(): Promise<{ exists: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { exists: false, message: 'Kredensial Supabase belum terpasang di environment variable.' };
  }
  try {
    const { error } = await supabase.from('transaksi_kas').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache') || error.message.includes('not find the table')) {
        return {
          exists: false,
          message: 'Tabel Supabase belum dibuat. Harap jalankan skrip SQL di Supabase SQL Editor.'
        };
      }
      return { exists: false, message: error.message };
    }
    return { exists: true, message: 'Tabel Supabase terhubung dan siap digunakan!' };
  } catch (err: any) {
    return { exists: false, message: err.message || 'Gagal koneksi ke Supabase' };
  }
}

// PROFIL
export async function getProfilFromSupabase(): Promise<BumdesProfil> {
  if (!supabase) return initialProfil;
  const { data, error } = await supabase.from('profil_bumdes').select('*').limit(1);
  if (error || !data || data.length === 0) {
    return initialProfil;
  }
  const r = data[0];
  return {
    namaBumdes: r.nama_bumdes || initialProfil.namaBumdes,
    alamat: r.alamat || '',
    desa: r.desa || '',
    kecamatan: r.kecamatan || '',
    kabupaten: r.kabupaten || '',
    nomorSK: r.nomor_sk || '',
    tanggalPendirian: r.tanggal_pendirian || '',
    unitUsaha: r.unit_usaha || '',
    tahunBuku: r.tahun_buku || '2026',
    terakhirDiperbarui: r.terakhir_diperbarui || ''
  };
}

export async function saveProfilToSupabase(data: Partial<BumdesProfil>): Promise<BumdesProfil> {
  if (!supabase) return initialProfil;
  const current = await getProfilFromSupabase();
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

  const { data: existing } = await supabase.from('profil_bumdes').select('id').limit(1);
  if (!existing || existing.length === 0) {
    await supabase.from('profil_bumdes').insert({
      nama_bumdes: updated.namaBumdes,
      alamat: updated.alamat,
      desa: updated.desa,
      kecamatan: updated.kecamatan,
      kabupaten: updated.kabupaten,
      nomor_sk: updated.nomorSK,
      tanggal_pendirian: updated.tanggalPendirian,
      unit_usaha: updated.unitUsaha,
      tahun_buku: updated.tahunBuku,
      terakhir_diperbarui: updated.terakhirDiperbarui
    });
  } else {
    await supabase.from('profil_bumdes').update({
      nama_bumdes: updated.namaBumdes,
      alamat: updated.alamat,
      desa: updated.desa,
      kecamatan: updated.kecamatan,
      kabupaten: updated.kabupaten,
      nomor_sk: updated.nomorSK,
      tanggal_pendirian: updated.tanggalPendirian,
      unit_usaha: updated.unitUsaha,
      tahun_buku: updated.tahunBuku,
      terakhir_diperbarui: updated.terakhirDiperbarui,
      updated_at: new Date().toISOString()
    }).eq('id', existing[0].id);
  }
  return updated;
}

// PENGURUS
export async function getPengurusFromSupabase(): Promise<Pengurus[]> {
  if (!supabase) return initialPengurus;
  const { data, error } = await supabase.from('pengurus').select('*').order('created_at', { ascending: true });
  if (error || !data) return initialPengurus;
  return data.map((r: any) => ({
    id: r.id,
    nama: r.nama,
    jabatan: r.jabatan,
    periodeMulai: r.periode_mulai || '',
    periodeSelesai: r.periode_selesai || '',
    status: r.status || 'Aktif'
  }));
}

export async function replacePengurusInSupabase(items: Pengurus[]): Promise<Pengurus[]> {
  if (!supabase) return items;
  try {
    const { error: delError } = await supabase.from('pengurus').delete().neq('id', '');
    if (delError) {
      console.warn('Supabase delete pengurus error:', delError.message);
    }
    if (items.length > 0) {
      const { error: insError } = await supabase.from('pengurus').insert(
        items.map((i) => ({
          id: i.id,
          nama: i.nama,
          jabatan: i.jabatan,
          periode_mulai: i.periodeMulai || '',
          periode_selesai: i.periodeSelesai || '',
          status: i.status || 'Aktif'
        }))
      );
      if (insError) {
        console.error('Supabase insert pengurus error:', insError.message);
        throw new Error(`Gagal menyimpan pengurus ke Supabase: ${insError.message}`);
      }
    }
    return items;
  } catch (err: any) {
    console.error('replacePengurusInSupabase error:', err);
    throw err;
  }
}

// ASET TETAP
export async function getAsetFromSupabase(): Promise<AsetTetap[]> {
  if (!supabase) return initialAset;
  const { data, error } = await supabase.from('aset_tetap').select('*').order('created_at', { ascending: true });
  if (error || !data) return initialAset;
  return data.map((r: any) => ({
    id: r.id,
    nama: r.nama,
    kategori: r.kategori,
    kuantitas: r.kuantitas || 1,
    tanggalPerolehan: r.tanggal_perolehan,
    nilaiPerolehan: Number(r.nilai_perolehan) || 0,
    kondisi: r.kondisi || 'Baik',
    keterangan: r.keterangan || ''
  }));
}

export async function replaceAsetInSupabase(items: AsetTetap[]): Promise<AsetTetap[]> {
  if (!supabase) return items;
  await supabase.from('aset_tetap').delete().neq('id', '');
  if (items.length > 0) {
    await supabase.from('aset_tetap').insert(
      items.map((i) => ({
        id: i.id,
        nama: i.nama,
        kategori: i.kategori,
        kuantitas: i.kuantitas || 1,
        tanggal_perolehan: i.tanggalPerolehan,
        nilai_perolehan: Number(i.nilaiPerolehan) || 0,
        kondisi: i.kondisi || 'Baik',
        keterangan: i.keterangan || ''
      }))
    );
  }
  return items;
}

// MODAL & KEWAJIBAN
export async function getModalFromSupabase(): Promise<ModalKewajiban[]> {
  if (!supabase) return initialModalKewajiban;
  const { data, error } = await supabase.from('modal_kewajiban').select('*').order('created_at', { ascending: true });
  if (error || !data) return initialModalKewajiban;
  return data.map((r: any) => ({
    id: r.id,
    jenis: r.jenis || 'Modal',
    kategori: r.kategori,
    uraian: r.uraian,
    tanggal: r.tanggal,
    nilai: Number(r.nilai) || 0,
    status: r.status || 'Aktif'
  }));
}

export async function replaceModalInSupabase(items: ModalKewajiban[]): Promise<ModalKewajiban[]> {
  if (!supabase) return items;
  await supabase.from('modal_kewajiban').delete().neq('id', '');
  if (items.length > 0) {
    await supabase.from('modal_kewajiban').insert(
      items.map((i) => ({
        id: i.id,
        jenis: i.jenis,
        kategori: i.kategori,
        uraian: i.uraian,
        tanggal: i.tanggal,
        nilai: Number(i.nilai) || 0,
        status: i.status || 'Aktif'
      }))
    );
  }
  return items;
}

// MASTER TRANSAKSI
export async function getMasterTransaksiFromSupabase(): Promise<MasterTransaksi[]> {
  if (!supabase) return initialMasterTransaksi;
  const { data, error } = await supabase.from('master_transaksi').select('*').order('id', { ascending: true });
  if (error || !data) return initialMasterTransaksi;
  return data.map((r: any) => ({
    keterangan: r.keterangan,
    jenis: r.jenis || 'Pengeluaran',
    metode: (r.keterangan && r.keterangan.toLowerCase().includes('pakan') ? 'QtyHarga' : (r.metode || 'Nominal')),
    kelompok: r.kelompok,
    debitAccount: r.debit_account || '',
    kreditAccount: r.kredit_account || ''
  }));
}

export async function replaceMasterTransaksiInSupabase(items: MasterTransaksi[]): Promise<MasterTransaksi[]> {
  if (!supabase) return items;
  await supabase.from('master_transaksi').delete().neq('id', -1);
  if (items.length > 0) {
    await supabase.from('master_transaksi').insert(
      items.map((i) => ({
        keterangan: i.keterangan,
        jenis: i.jenis,
        metode: i.metode || 'Nominal',
        kelompok: i.kelompok,
        debit_account: i.debitAccount || '',
        kredit_account: i.kreditAccount || ''
      }))
    );
  }
  return items;
}

// TRANSAKSI KAS
export async function getTransaksiKasFromSupabase(): Promise<TransaksiKas[]> {
  if (!supabase) return initialTransaksiKas;
  const { data, error } = await supabase.from('transaksi_kas').select('*').order('row_number', { ascending: true });
  if (error || !data) return initialTransaksiKas;
  return data.map((r: any) => ({
    id: r.id,
    rowNumber: r.row_number ?? undefined,
    tanggal: r.tanggal,
    keterangan: r.keterangan,
    panenQty: r.panen_qty ?? undefined,
    jualQty: r.jual_qty ?? undefined,
    sisaTelur: r.sisa_telur ?? undefined,
    qty: r.qty ?? undefined,
    hargaSatuan: r.harga_satuan ?? undefined,
    totalPerhitungan: r.total_perhitungan ?? undefined,
    adaPenyesuaian: r.ada_penyesuaian ?? false,
    kasAktual: r.kas_aktual ?? undefined,
    penyesuaian: r.penyesuaian ?? undefined,
    nominalAktual: Number(r.nominal_aktual) || 0,
    debit: Number(r.debit) || 0,
    kredit: Number(r.kredit) || 0,
    saldoBerjalan: r.saldo_berjalan ?? undefined,
    jenis: r.jenis || 'Pemasukan',
    tambahanKeterangan: r.tambahan_keterangan || '',
    metode: r.metode || 'Nominal'
  }));
}

export async function replaceTransaksiKasInSupabase(items: TransaksiKas[]): Promise<TransaksiKas[]> {
  if (!supabase) return items;
  await supabase.from('transaksi_kas').delete().neq('id', '');
  if (items.length > 0) {
    await supabase.from('transaksi_kas').insert(
      items.map((i, idx) => ({
        id: i.id || String(Date.now() + idx),
        row_number: i.rowNumber ?? idx + 1,
        tanggal: i.tanggal,
        keterangan: i.keterangan,
        panen_qty: typeof i.panenQty === 'number' ? i.panenQty : null,
        jual_qty: typeof i.jualQty === 'number' ? i.jualQty : null,
        sisa_telur: typeof i.sisaTelur === 'number' ? i.sisaTelur : null,
        qty: typeof i.qty === 'number' ? i.qty : null,
        harga_satuan: typeof i.hargaSatuan === 'number' ? i.hargaSatuan : null,
        total_perhitungan: typeof i.totalPerhitungan === 'number' ? i.totalPerhitungan : null,
        ada_penyesuaian: Boolean(i.adaPenyesuaian),
        kas_aktual: typeof i.kasAktual === 'number' ? i.kasAktual : null,
        penyesuaian: typeof i.penyesuaian === 'number' ? i.penyesuaian : null,
        nominal_aktual: Number(i.nominalAktual) || 0,
        debit: Number(i.debit) || 0,
        kredit: Number(i.kredit) || 0,
        saldo_berjalan: typeof i.saldoBerjalan === 'number' ? i.saldoBerjalan : null,
        jenis: i.jenis,
        tambahan_keterangan: i.tambahanKeterangan || '',
        metode: i.metode || 'Nominal'
      }))
    );
  }
  return items;
}

// KARYAWAN
export async function getKaryawanFromSupabase(): Promise<Karyawan[]> {
  if (!supabase) return initialKaryawan;
  const { data, error } = await supabase.from('karyawan').select('*').order('created_at', { ascending: true });
  if (error || !data) return initialKaryawan;
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description || ''
  }));
}

export async function replaceKaryawanInSupabase(items: Karyawan[]): Promise<Karyawan[]> {
  if (!supabase) return items;
  await supabase.from('karyawan').delete().neq('id', '');
  if (items.length > 0) {
    await supabase.from('karyawan').insert(
      items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description || ''
      }))
    );
  }
  return items;
}

// PAYROLL
export async function getPayrollFromSupabase(): Promise<Record<number, PayrollDistribution[]>> {
  if (!supabase) return initialPayrollDistributions;
  const { data, error } = await supabase.from('payroll_distributions').select('*');
  if (error || !data) return initialPayrollDistributions;
  const result: Record<number, PayrollDistribution[]> = {};
  for (const r of data) {
    if (!result[r.queue_id]) result[r.queue_id] = [];
    result[r.queue_id].push({
      employeeId: r.employee_id,
      workday: Number(r.workday) || 0,
      total: Number(r.total) || 0,
      rate: r.rate ?? undefined
    });
  }
  return result;
}

export async function replacePayrollInSupabase(dist: Record<number, PayrollDistribution[]>): Promise<Record<number, PayrollDistribution[]>> {
  if (!supabase) return dist;
  await supabase.from('payroll_distributions').delete().neq('id', -1);
  const toInsert: any[] = [];
  for (const [qId, items] of Object.entries(dist)) {
    const queueId = Number(qId);
    if (Array.isArray(items)) {
      for (const item of items) {
        toInsert.push({
          queue_id: queueId,
          employee_id: item.employeeId,
          workday: Number(item.workday) || 0,
          total: Number(item.total) || 0,
          rate: typeof item.rate === 'number' ? item.rate : null
        });
      }
    }
  }
  if (toInsert.length > 0) {
    await supabase.from('payroll_distributions').insert(toInsert);
  }
  return dist;
}

// PERSEDIAAN
export async function getPersediaanFromSupabase(): Promise<ItemPersediaan[]> {
  if (!supabase) return initialItemPersediaan;
  const { data, error } = await supabase.from('item_persediaan').select('*').order('id', { ascending: true });
  if (error || !data) return initialItemPersediaan;
  return data.map((r: any) => ({
    namaItem: r.nama_item,
    satuan: r.satuan || 'Kg',
    hargaJualAcuan: Number(r.harga_jual_acuan) || 0,
    saldoQty: Number(r.saldo_qty) || 0
  }));
}

export async function replacePersediaanInSupabase(items: ItemPersediaan[]): Promise<ItemPersediaan[]> {
  if (!supabase) return items;
  await supabase.from('item_persediaan').delete().neq('id', -1);
  if (items.length > 0) {
    await supabase.from('item_persediaan').insert(
      items.map((i) => ({
        nama_item: i.namaItem,
        satuan: i.satuan || 'Kg',
        harga_jual_acuan: Number(i.hargaJualAcuan) || 0,
        saldo_qty: Number(i.saldoQty) || 0
      }))
    );
  }
  return items;
}

// PRODUKSI
export async function getProduksiFromSupabase(): Promise<LogProduksi[]> {
  if (!supabase) return initialLogProduksi;
  const { data, error } = await supabase.from('log_produksi').select('*').order('no_produksi', { ascending: false });
  if (error || !data) return initialLogProduksi;
  return data.map((r: any) => {
    let parsedOutputs = [];
    try {
      parsedOutputs = JSON.parse(r.outputs_json || '[]');
    } catch {
      parsedOutputs = [];
    }
    return {
      noProduksi: r.no_produksi,
      tanggal: r.tanggal,
      gabahDiproses: Number(r.gabah_diproses) || 0,
      outputs: parsedOutputs,
      susut: Number(r.susut) || 0,
      keterangan: r.keterangan || '',
      populasiAyam: r.populasi_ayam ?? undefined,
      pakanKonsumsi: r.pakan_konsumsi ?? undefined
    };
  });
}

export async function replaceProduksiInSupabase(items: LogProduksi[]): Promise<LogProduksi[]> {
  if (!supabase) return items;
  await supabase.from('log_produksi').delete().neq('id', -1);
  if (items.length > 0) {
    await supabase.from('log_produksi').insert(
      items.map((i) => ({
        no_produksi: i.noProduksi,
        tanggal: i.tanggal,
        gabah_diproses: Number(i.gabahDiproses) || 0,
        outputs_json: JSON.stringify(i.outputs || []),
        susut: Number(i.susut) || 0,
        keterangan: i.keterangan || '',
        populasi_ayam: typeof i.populasiAyam === 'number' ? i.populasiAyam : null,
        pakan_konsumsi: typeof i.pakanKonsumsi === 'number' ? i.pakanKonsumsi : null
      }))
    );
  }
  return items;
}

// STOCK OPNAME
export async function getStockOpnameFromSupabase(): Promise<StockOpnameEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('stock_opname').select('*').order('bulan', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    bulan: r.bulan,
    namaItem: r.nama_item,
    saldoAwalQty: Number(r.saldo_awal_qty) || 0,
    saldoAwalNilai: Number(r.saldo_awal_nilai) || 0,
    masukQty: Number(r.masuk_qty) || 0,
    masukNilai: Number(r.masuk_nilai) || 0,
    keluarQty: Number(r.keluar_qty) || 0,
    saldoAkhirSistemQty: Number(r.saldo_akhir_sistem_qty) || 0,
    saldoAkhirFisikQty: Number(r.saldo_akhir_fisik_qty) || 0,
    selisihQty: Number(r.selisih_qty) || 0,
    hppPerUnit: Number(r.hpp_per_unit) || 0,
    saldoAkhirNilai: Number(r.saldo_akhir_nilai) || 0
  }));
}

export async function replaceStockOpnameInSupabase(items: StockOpnameEntry[]): Promise<StockOpnameEntry[]> {
  if (!supabase) return items;
  await supabase.from('stock_opname').delete().neq('id', -1);
  if (items.length > 0) {
    await supabase.from('stock_opname').insert(
      items.map((i) => ({
        bulan: i.bulan,
        nama_item: i.namaItem,
        saldo_awal_qty: Number(i.saldoAwalQty) || 0,
        saldo_awal_nilai: Number(i.saldoAwalNilai) || 0,
        masuk_qty: Number(i.masukQty) || 0,
        masuk_nilai: Number(i.masukNilai) || 0,
        keluar_qty: Number(i.keluarQty) || 0,
        saldo_akhir_sistem_qty: Number(i.saldoAkhirSistemQty) || 0,
        saldo_akhir_fisik_qty: Number(i.saldoAkhirFisikQty) || 0,
        selisih_qty: Number(i.selisihQty) || 0,
        hpp_per_unit: Number(i.hppPerUnit) || 0,
        saldo_akhir_nilai: Number(i.saldoAkhirNilai) || 0
      }))
    );
  }
  return items;
}

// APP SETTINGS
export async function getAppSettingsFromSupabase(): Promise<{
  saldoAwalDone: boolean;
  sertakanAsetTetap: boolean;
  saldoAwalDate: string;
}> {
  const defaultSettings = {
    saldoAwalDone: true,
    sertakanAsetTetap: true,
    saldoAwalDate: '2026-08-08'
  };
  if (!supabase) return defaultSettings;
  try {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error || !data || data.length === 0) return defaultSettings;
    const map = new Map<string, string>();
    for (const r of data) {
      map.set(r.key, r.value);
    }
    return {
      saldoAwalDone: map.has('bumdes_saldo_awal_done_v2') ? map.get('bumdes_saldo_awal_done_v2') === 'true' : true,
      sertakanAsetTetap: map.has('bumdes_sertakan_aset_tetap_v2') ? map.get('bumdes_sertakan_aset_tetap_v2') === 'true' : true,
      saldoAwalDate: map.get('bumdes_saldo_awal_date_v2') || '2026-08-08'
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveAppSettingToSupabase(key: string, value: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('app_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('saveAppSettingToSupabase error:', e);
  }
}

// SEED INITIAL DATA TO SUPABASE
export async function seedInitialDataToSupabase(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data } = await supabase.from('transaksi_kas').select('id').limit(1);
    if (data && data.length > 0) {
      // Check if profil is missing
      const { data: prof } = await supabase.from('profil_bumdes').select('id').limit(1);
      if (!prof || prof.length === 0) {
        await saveProfilToSupabase(initialProfil);
      }
      return false; // Already seeded
    }

    await saveProfilToSupabase(initialProfil);
    await replacePengurusInSupabase(initialPengurus);
    await replaceAsetInSupabase(initialAset);
    await replaceModalInSupabase(initialModalKewajiban);
    await replaceMasterTransaksiInSupabase(initialMasterTransaksi);
    await replaceKaryawanInSupabase(initialKaryawan);
    await replacePersediaanInSupabase(initialItemPersediaan);
    await replaceProduksiInSupabase(initialLogProduksi);
    await replaceTransaksiKasInSupabase(initialTransaksiKas);
    await replacePayrollInSupabase(initialPayrollDistributions);
    return true;
  } catch (err) {
    console.error('seedInitialDataToSupabase error:', err);
    return false;
  }
}

// FULL GET ALL
export async function getAllFromSupabase() {
  const [
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
  ] = await Promise.all([
    getProfilFromSupabase(),
    getPengurusFromSupabase(),
    getAsetFromSupabase(),
    getModalFromSupabase(),
    getMasterTransaksiFromSupabase(),
    getTransaksiKasFromSupabase(),
    getKaryawanFromSupabase(),
    getPayrollFromSupabase(),
    getPersediaanFromSupabase(),
    getProduksiFromSupabase(),
    getStockOpnameFromSupabase(),
    getAppSettingsFromSupabase()
  ]);

  return {
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
  };
}
