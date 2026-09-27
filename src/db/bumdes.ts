import { db } from './index.ts';
import * as schema from './schema.ts';
import { eq, asc, desc } from 'drizzle-orm';
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

// PROFIL
export async function getProfil(): Promise<BumdesProfil> {
  try {
    const rows = await db.select().from(schema.profilBumdes).limit(1);
    if (!rows || rows.length === 0) {
      return initialProfil;
    }
    const r = rows[0];
    return {
      namaBumdes: r.namaBumdes || initialProfil.namaBumdes,
      alamat: r.alamat || '',
      desa: r.desa || '',
      kecamatan: r.kecamatan || '',
      kabupaten: r.kabupaten || '',
      nomorSK: r.nomorSk || '',
      tanggalPendirian: r.tanggalPendirian || '',
      unitUsaha: r.unitUsaha || '',
      tahunBuku: r.tahunBuku || '',
      terakhirDiperbarui: r.terakhirDiperbarui || ''
    };
  } catch (error) {
    console.error('getProfil error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function saveProfil(data: Partial<BumdesProfil>): Promise<BumdesProfil> {
  try {
    const current = await getProfil();
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

    const existing = await db.select().from(schema.profilBumdes).limit(1);
    if (existing.length === 0) {
      await db.insert(schema.profilBumdes).values({
        namaBumdes: updated.namaBumdes,
        alamat: updated.alamat,
        desa: updated.desa,
        kecamatan: updated.kecamatan,
        kabupaten: updated.kabupaten,
        nomorSk: updated.nomorSK,
        tanggalPendirian: updated.tanggalPendirian,
        unitUsaha: updated.unitUsaha,
        tahunBuku: updated.tahunBuku,
        terakhirDiperbarui: updated.terakhirDiperbarui
      });
    } else {
      await db.update(schema.profilBumdes)
        .set({
          namaBumdes: updated.namaBumdes,
          alamat: updated.alamat,
          desa: updated.desa,
          kecamatan: updated.kecamatan,
          kabupaten: updated.kabupaten,
          nomorSk: updated.nomorSK,
          tanggalPendirian: updated.tanggalPendirian,
          unitUsaha: updated.unitUsaha,
          tahunBuku: updated.tahunBuku,
          terakhirDiperbarui: updated.terakhirDiperbarui,
          updatedAt: new Date()
        })
        .where(eq(schema.profilBumdes.id, existing[0].id));
    }

    return updated;
  } catch (error) {
    console.error('saveProfil error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// PENGURUS
export async function getPengurusList(): Promise<Pengurus[]> {
  try {
    const rows = await db.select().from(schema.pengurus).orderBy(asc(schema.pengurus.createdAt));
    return rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      jabatan: r.jabatan,
      periodeMulai: r.periodeMulai || '',
      periodeSelesai: r.periodeSelesai || '',
      status: (r.status as 'Aktif' | 'Tidak Aktif') || 'Aktif'
    }));
  } catch (error) {
    console.error('getPengurusList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replacePengurusList(items: Pengurus[]): Promise<Pengurus[]> {
  try {
    await db.delete(schema.pengurus);
    if (items.length > 0) {
      await db.insert(schema.pengurus).values(
        items.map((i) => ({
          id: i.id,
          nama: i.nama,
          jabatan: i.jabatan,
          periodeMulai: i.periodeMulai || '',
          periodeSelesai: i.periodeSelesai || '',
          status: i.status || 'Aktif'
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replacePengurusList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ASET TETAP
export async function getAsetList(): Promise<AsetTetap[]> {
  try {
    const rows = await db.select().from(schema.asetTetap).orderBy(asc(schema.asetTetap.createdAt));
    return rows.map((r) => ({
      id: r.id,
      nama: r.nama,
      kategori: r.kategori,
      kuantitas: r.kuantitas || 1,
      tanggalPerolehan: r.tanggalPerolehan,
      nilaiPerolehan: Number(r.nilaiPerolehan) || 0,
      kondisi: r.kondisi || 'Baik',
      keterangan: r.keterangan || ''
    }));
  } catch (error) {
    console.error('getAsetList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceAsetList(items: AsetTetap[]): Promise<AsetTetap[]> {
  try {
    await db.delete(schema.asetTetap);
    if (items.length > 0) {
      await db.insert(schema.asetTetap).values(
        items.map((i) => ({
          id: i.id,
          nama: i.nama,
          kategori: i.kategori,
          kuantitas: i.kuantitas || 1,
          tanggalPerolehan: i.tanggalPerolehan,
          nilaiPerolehan: Number(i.nilaiPerolehan) || 0,
          kondisi: i.kondisi || 'Baik',
          keterangan: i.keterangan || ''
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceAsetList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// MODAL & KEWAJIBAN
export async function getModalList(): Promise<ModalKewajiban[]> {
  try {
    const rows = await db.select().from(schema.modalKewajiban).orderBy(asc(schema.modalKewajiban.createdAt));
    return rows.map((r) => ({
      id: r.id,
      jenis: (r.jenis as 'Modal' | 'Kewajiban') || 'Modal',
      kategori: r.kategori,
      uraian: r.uraian,
      tanggal: r.tanggal,
      nilai: Number(r.nilai) || 0,
      status: r.status || 'Aktif'
    }));
  } catch (error) {
    console.error('getModalList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceModalList(items: ModalKewajiban[]): Promise<ModalKewajiban[]> {
  try {
    await db.delete(schema.modalKewajiban);
    if (items.length > 0) {
      await db.insert(schema.modalKewajiban).values(
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
  } catch (error) {
    console.error('replaceModalList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// MASTER TRANSAKSI
export async function getMasterTransaksiList(): Promise<MasterTransaksi[]> {
  try {
    const rows = await db.select().from(schema.masterTransaksi).orderBy(asc(schema.masterTransaksi.id));
    return rows.map((r) => ({
      keterangan: r.keterangan,
      jenis: (r.jenis as 'Pemasukan' | 'Pengeluaran') || 'Pengeluaran',
      metode: (r.metode as 'QtyHarga' | 'Nominal') || 'Nominal',
      kelompok: r.kelompok,
      debitAccount: r.debitAccount || '',
      kreditAccount: r.kreditAccount || ''
    }));
  } catch (error) {
    console.error('getMasterTransaksiList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceMasterTransaksiList(items: MasterTransaksi[]): Promise<MasterTransaksi[]> {
  try {
    await db.delete(schema.masterTransaksi);
    if (items.length > 0) {
      await db.insert(schema.masterTransaksi).values(
        items.map((i) => ({
          keterangan: i.keterangan,
          jenis: i.jenis,
          metode: i.metode || 'Nominal',
          kelompok: i.kelompok,
          debitAccount: i.debitAccount || '',
          kreditAccount: i.kreditAccount || ''
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceMasterTransaksiList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// TRANSAKSI KAS
export async function getTransaksiKasList(): Promise<TransaksiKas[]> {
  try {
    const rows = await db.select().from(schema.transaksiKas).orderBy(asc(schema.transaksiKas.rowNumber), asc(schema.transaksiKas.createdAt));
    return rows.map((r) => ({
      id: r.id,
      rowNumber: r.rowNumber ?? undefined,
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      panenQty: r.panenQty ?? undefined,
      jualQty: r.jualQty ?? undefined,
      sisaTelur: r.sisaTelur ?? undefined,
      qty: r.qty ?? undefined,
      hargaSatuan: r.hargaSatuan ?? undefined,
      totalPerhitungan: r.totalPerhitungan ?? undefined,
      adaPenyesuaian: r.adaPenyesuaian ?? false,
      kasAktual: r.kasAktual ?? undefined,
      penyesuaian: r.penyesuaian ?? undefined,
      nominalAktual: Number(r.nominalAktual) || 0,
      debit: Number(r.debit) || 0,
      kredit: Number(r.kredit) || 0,
      saldoBerjalan: r.saldoBerjalan ?? undefined,
      jenis: (r.jenis as 'Pemasukan' | 'Pengeluaran') || 'Pemasukan',
      tambahanKeterangan: r.tambahanKeterangan || '',
      metode: (r.metode as 'QtyHarga' | 'Nominal') || 'Nominal'
    }));
  } catch (error) {
    console.error('getTransaksiKasList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceTransaksiKasList(items: TransaksiKas[]): Promise<TransaksiKas[]> {
  try {
    await db.delete(schema.transaksiKas);
    if (items.length > 0) {
      await db.insert(schema.transaksiKas).values(
        items.map((i, idx) => ({
          id: i.id || String(Date.now() + idx),
          rowNumber: i.rowNumber ?? idx + 1,
          tanggal: i.tanggal,
          keterangan: i.keterangan,
          panenQty: typeof i.panenQty === 'number' ? i.panenQty : null,
          jualQty: typeof i.jualQty === 'number' ? i.jualQty : null,
          sisaTelur: typeof i.sisaTelur === 'number' ? i.sisaTelur : null,
          qty: typeof i.qty === 'number' ? i.qty : null,
          hargaSatuan: typeof i.hargaSatuan === 'number' ? i.hargaSatuan : null,
          totalPerhitungan: typeof i.totalPerhitungan === 'number' ? i.totalPerhitungan : null,
          adaPenyesuaian: Boolean(i.adaPenyesuaian),
          kasAktual: typeof i.kasAktual === 'number' ? i.kasAktual : null,
          penyesuaian: typeof i.penyesuaian === 'number' ? i.penyesuaian : null,
          nominalAktual: Number(i.nominalAktual) || 0,
          debit: Number(i.debit) || 0,
          kredit: Number(i.kredit) || 0,
          saldoBerjalan: typeof i.saldoBerjalan === 'number' ? i.saldoBerjalan : null,
          jenis: i.jenis,
          tambahanKeterangan: i.tambahanKeterangan || '',
          metode: i.metode || 'Nominal'
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceTransaksiKasList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// KARYAWAN
export async function getKaryawanList(): Promise<Karyawan[]> {
  try {
    const rows = await db.select().from(schema.karyawan).orderBy(asc(schema.karyawan.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || ''
    }));
  } catch (error) {
    console.error('getKaryawanList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceKaryawanList(items: Karyawan[]): Promise<Karyawan[]> {
  try {
    await db.delete(schema.karyawan);
    if (items.length > 0) {
      await db.insert(schema.karyawan).values(
        items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description || ''
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceKaryawanList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// PAYROLL DISTRIBUTIONS
export async function getPayrollDistributions(): Promise<Record<number, PayrollDistribution[]>> {
  try {
    const rows = await db.select().from(schema.payrollDistributions);
    const result: Record<number, PayrollDistribution[]> = {};
    for (const r of rows) {
      if (!result[r.queueId]) {
        result[r.queueId] = [];
      }
      result[r.queueId].push({
        employeeId: r.employeeId,
        workday: Number(r.workday) || 0,
        total: Number(r.total) || 0,
        rate: r.rate ?? undefined
      });
    }
    return result;
  } catch (error) {
    console.error('getPayrollDistributions error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replacePayrollDistributions(dist: Record<number, PayrollDistribution[]>): Promise<Record<number, PayrollDistribution[]>> {
  try {
    await db.delete(schema.payrollDistributions);
    const valuesToInsert: Array<{ queueId: number; employeeId: string; workday: number; total: number; rate: number | null }> = [];
    for (const [queueIdStr, items] of Object.entries(dist)) {
      const queueId = Number(queueIdStr);
      if (Array.isArray(items)) {
        for (const item of items) {
          valuesToInsert.push({
            queueId,
            employeeId: item.employeeId,
            workday: Number(item.workday) || 0,
            total: Number(item.total) || 0,
            rate: typeof item.rate === 'number' ? item.rate : null
          });
        }
      }
    }
    if (valuesToInsert.length > 0) {
      await db.insert(schema.payrollDistributions).values(valuesToInsert);
    }
    return dist;
  } catch (error) {
    console.error('replacePayrollDistributions error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// ITEM PERSEDIAAN
export async function getItemPersediaanList(): Promise<ItemPersediaan[]> {
  try {
    const rows = await db.select().from(schema.itemPersediaan).orderBy(asc(schema.itemPersediaan.id));
    return rows.map((r) => ({
      namaItem: r.namaItem,
      satuan: r.satuan,
      hargaJualAcuan: Number(r.hargaJualAcuan) || 0,
      saldoQty: Number(r.saldoQty) || 0
    }));
  } catch (error) {
    console.error('getItemPersediaanList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceItemPersediaanList(items: ItemPersediaan[]): Promise<ItemPersediaan[]> {
  try {
    await db.delete(schema.itemPersediaan);
    if (items.length > 0) {
      await db.insert(schema.itemPersediaan).values(
        items.map((i) => ({
          namaItem: i.namaItem,
          satuan: i.satuan || 'Kg',
          hargaJualAcuan: Number(i.hargaJualAcuan) || 0,
          saldoQty: Number(i.saldoQty) || 0
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceItemPersediaanList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// LOG PRODUKSI
export async function getLogProduksiList(): Promise<LogProduksi[]> {
  try {
    const rows = await db.select().from(schema.logProduksi).orderBy(desc(schema.logProduksi.noProduksi));
    return rows.map((r) => {
      let parsedOutputs = [];
      try {
        parsedOutputs = JSON.parse(r.outputsJson || '[]');
      } catch {
        parsedOutputs = [];
      }
      return {
        noProduksi: r.noProduksi,
        tanggal: r.tanggal,
        gabahDiproses: Number(r.gabahDiproses) || 0,
        outputs: parsedOutputs,
        susut: Number(r.susut) || 0,
        keterangan: r.keterangan || '',
        populasiAyam: r.populasiAyam ?? undefined,
        pakanKonsumsi: r.pakanKonsumsi ?? undefined
      };
    });
  } catch (error) {
    console.error('getLogProduksiList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceLogProduksiList(items: LogProduksi[]): Promise<LogProduksi[]> {
  try {
    await db.delete(schema.logProduksi);
    if (items.length > 0) {
      await db.insert(schema.logProduksi).values(
        items.map((i) => ({
          noProduksi: i.noProduksi,
          tanggal: i.tanggal,
          gabahDiproses: Number(i.gabahDiproses) || 0,
          outputsJson: JSON.stringify(i.outputs || []),
          susut: Number(i.susut) || 0,
          keterangan: i.keterangan || '',
          populasiAyam: typeof i.populasiAyam === 'number' ? i.populasiAyam : null,
          pakanKonsumsi: typeof i.pakanKonsumsi === 'number' ? i.pakanKonsumsi : null
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceLogProduksiList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// STOCK OPNAME
export async function getStockOpnameList(): Promise<StockOpnameEntry[]> {
  try {
    const rows = await db.select().from(schema.stockOpname).orderBy(desc(schema.stockOpname.bulan), asc(schema.stockOpname.namaItem));
    return rows.map((r) => ({
      bulan: r.bulan,
      namaItem: r.namaItem,
      saldoAwalQty: Number(r.saldoAwalQty) || 0,
      saldoAwalNilai: Number(r.saldoAwalNilai) || 0,
      masukQty: Number(r.masukQty) || 0,
      masukNilai: Number(r.masukNilai) || 0,
      keluarQty: Number(r.keluarQty) || 0,
      saldoAkhirSistemQty: Number(r.saldoAkhirSistemQty) || 0,
      saldoAkhirFisikQty: Number(r.saldoAkhirFisikQty) || 0,
      selisihQty: Number(r.selisihQty) || 0,
      hppPerUnit: Number(r.hppPerUnit) || 0,
      saldoAkhirNilai: Number(r.saldoAkhirNilai) || 0
    }));
  } catch (error) {
    console.error('getStockOpnameList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function replaceStockOpnameList(items: StockOpnameEntry[]): Promise<StockOpnameEntry[]> {
  try {
    await db.delete(schema.stockOpname);
    if (items.length > 0) {
      await db.insert(schema.stockOpname).values(
        items.map((i) => ({
          bulan: i.bulan,
          namaItem: i.namaItem,
          saldoAwalQty: Number(i.saldoAwalQty) || 0,
          saldoAwalNilai: Number(i.saldoAwalNilai) || 0,
          masukQty: Number(i.masukQty) || 0,
          masukNilai: Number(i.masukNilai) || 0,
          keluarQty: Number(i.keluarQty) || 0,
          saldoAkhirSistemQty: Number(i.saldoAkhirSistemQty) || 0,
          saldoAkhirFisikQty: Number(i.saldoAkhirFisikQty) || 0,
          selisihQty: Number(i.selisihQty) || 0,
          hppPerUnit: Number(i.hppPerUnit) || 0,
          saldoAkhirNilai: Number(i.saldoAkhirNilai) || 0
        }))
      );
    }
    return items;
  } catch (error) {
    console.error('replaceStockOpnameList error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// APP SETTINGS
export async function getAppSetting(key: string, defaultValue = ''): Promise<string> {
  try {
    const rows = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).limit(1);
    if (rows.length === 0) return defaultValue;
    return rows[0].value;
  } catch (error) {
    console.error('getAppSetting error:', error);
    return defaultValue;
  }
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  try {
    await db.insert(schema.appSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.appSettings.key,
        set: { value, updatedAt: new Date() }
      });
  } catch (error) {
    console.error('setAppSetting error:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

// FULL STATE SYNC & INITIAL SEEDING
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  try {
    const existingKas = await db.select().from(schema.transaksiKas).limit(1);
    if (existingKas.length > 0) {
      return false; // Already seeded
    }

    // Seed profil
    await saveProfil(initialProfil);
    // Seed pengurus
    await replacePengurusList(initialPengurus);
    // Seed aset
    await replaceAsetList(initialAset);
    // Seed modal
    await replaceModalList(initialModalKewajiban);
    // Seed master transaksi
    await replaceMasterTransaksiList(initialMasterTransaksi);
    // Seed karyawan
    await replaceKaryawanList(initialKaryawan);
    // Seed persediaan
    await replaceItemPersediaanList(initialItemPersediaan);
    // Seed log produksi
    await replaceLogProduksiList(initialLogProduksi);
    // Seed transaksi kas
    await replaceTransaksiKasList(initialTransaksiKas);
    // Seed payroll distributions
    await replacePayrollDistributions(initialPayrollDistributions);
    // Mark seeded
    await setAppSetting('bumdes_initial_seeded', 'true');
    await setAppSetting('bumdes_saldo_awal_done_v2', 'true');

    return true;
  } catch (error) {
    console.error('seedInitialDataIfEmpty error:', error);
    return false;
  }
}

export async function getAllBumdesData() {
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
    saldoAwalDone,
    sertakanAsetTetap,
    saldoAwalDate
  ] = await Promise.all([
    getProfil(),
    getPengurusList(),
    getAsetList(),
    getModalList(),
    getMasterTransaksiList(),
    getTransaksiKasList(),
    getKaryawanList(),
    getPayrollDistributions(),
    getItemPersediaanList(),
    getLogProduksiList(),
    getStockOpnameList(),
    getAppSetting('bumdes_saldo_awal_done_v2', 'true'),
    getAppSetting('bumdes_sertakan_aset_tetap_v2', 'true'),
    getAppSetting('bumdes_saldo_awal_date_v2', '2026-08-08')
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
    settings: {
      saldoAwalDone: saldoAwalDone === 'true',
      sertakanAsetTetap: sertakanAsetTetap === 'true',
      saldoAwalDate
    }
  };
}
