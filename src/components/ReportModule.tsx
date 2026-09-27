import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Download,
  TrendingUp,
  Scale,
  PieChart,
  Wallet,
  Building2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  X,
  Send,
  MessageSquare,
  Copy,
  Phone,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { TransaksiKas, Karyawan, PayrollDistribution, BumdesProfil, AsetTetap, ModalKewajiban, ItemPersediaan } from '../types';
import {
  getStoredProfil,
  getStoredTransaksiKas,
  getStoredKaryawan,
  getStoredPayrollDistributions,
  getStoredAset,
  getStoredModalKewajiban,
  getStoredPersediaan,
  getStoredPengurus,
  getStoredLogProduksi,
  calculateHppBreakdownBulanan,
  getJurnalUmumEntries,
  isSalaryTransaction,
  resetSaldoAwal,
  isSaldoAwalProcessed,
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

interface ReportModuleProps {
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const ReportModule: React.FC<ReportModuleProps> = ({ showMessage }) => {
  const [, setDataVersion] = useState(0);

  useEffect(() => {
    const handleDataUpdated = () => setDataVersion((v) => v + 1);
    window.addEventListener('bumdes_data_updated', handleDataUpdated);
    return () => window.removeEventListener('bumdes_data_updated', handleDataUpdated);
  }, []);

  const [selectedReports, setSelectedReports] = useState<string[]>(['kas', 'labarugi', 'neraca']);
  const [filterMode, setFilterMode] = useState<'bulanan' | 'tahunan' | 'semua'>('bulanan');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => new Date().getFullYear().toString());
  const [isJurnalExpanded, setIsJurnalExpanded] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWAModal, setShowWAModal] = useState(false);
  const [showResetSaldoAwalModal, setShowResetSaldoAwalModal] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waCustomNote, setWaCustomNote] = useState('');

  // WhatsApp Message Generator
  const generateWAMessage = () => {
    let msg = `*LAPORAN KEUANGAN BUMDES*\n`;
    msg += `🏢 *${profil.namaBumdes}*\n`;
    msg += `📅 *Periode:* ${periodeLabel}\n`;
    msg += `-----------------------------------\n\n`;

    if (selectedReports.includes('kas')) {
      msg += `💵 *BUKU KAS HARIAN*\n`;
      msg += `• Total Kas Masuk: ${formatRupiah(totalMasuk)}\n`;
      msg += `• Total Kas Keluar: ${formatRupiah(totalKeluar)}\n`;
      msg += `• Saldo Kas Akhir: *${formatRupiah(saldoKasAkhir)}*\n\n`;
    }

    if (selectedReports.includes('labarugi')) {
      msg += `📈 *LAPORAN LABA RUGI OPERASIONAL*\n`;
      msg += `• Total Pendapatan: ${formatRupiah(totalPendapatan)}\n`;
      msg += `• Total HPP: ${formatRupiah(totalHpp)}\n`;
      msg += `• Laba Kotor: ${formatRupiah(labaKotor)}\n`;
      msg += `• Total Beban Lain: ${formatRupiah(totalBebanLain)}\n`;
      msg += `• *LABA/RUGI BERSIH:* *${formatRupiah(labaRugiBersih)}*\n\n`;
    }

    if (selectedReports.includes('neraca')) {
      msg += `⚖️ *LAPORAN NERACA*\n`;
      msg += `• Total Aktiva (Aset): ${formatRupiah(totalAktiva)}\n`;
      msg += `• Total Pasiva: ${formatRupiah(totalPasiva)}\n`;
      msg += `• Status Balance: ${isNeracaBalanced ? '✅ SEIMBANG (BALANCED)' : '⚠️ BELUM SEIMBANG'}\n\n`;
    }

    if (selectedReports.includes('jurnal')) {
      const journals = getJurnalUmumEntries(periodeFilter);
      msg += `📖 *JURNAL UMUM*\n`;
      msg += `• Total Ayat Jurnal: ${journals.length} Transaksi\n\n`;
    }

    if (waCustomNote.trim()) {
      msg += `📝 *Catatan Tambahan:*\n${waCustomNote.trim()}\n\n`;
    }

    msg += `_Dikirim via Sistem Laporan Keuangan BUMDes._`;
    return msg;
  };

  const handleSendWA = () => {
    const text = generateWAMessage();
    let cleanPhone = waPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('08')) {
      cleanPhone = '628' + cleanPhone.substring(2);
    }

    let url = '';
    if (cleanPhone) {
      url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
    window.open(url, '_blank');
  };

  const handleCopyWAMessage = () => {
    const text = generateWAMessage();
    navigator.clipboard.writeText(text);
    showMessage('Teks ringkasan laporan berhasil disalin ke clipboard!', 'success');
  };

  const profil = getStoredProfil();
  const kasList = getStoredTransaksiKas();
  const karyawanList = getStoredKaryawan();
  const payrollDistributions = getStoredPayrollDistributions();
  const asetList = getStoredAset();
  const modalKewajibanList = getStoredModalKewajiban();
  const persediaanList = getStoredPersediaan();
  const pengurusList = getStoredPengurus();
  const logProduksiList = getStoredLogProduksi();

  // Extract all distinct years from cash transactions + current year
  const availableYears = Array.from(
    new Set(
      kasList.map((k) => String(k.tanggal || '').substring(0, 4)).concat([new Date().getFullYear().toString()])
    )
  ).sort((a, b) => b.localeCompare(a));

  // Determine active period filter string and human readable label
  const periodeFilter = filterMode === 'bulanan' ? selectedMonth : filterMode === 'tahunan' ? selectedYear : '';

  const formatBulanIndo = (yyyyMm: string) => {
    if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
    const [year, month] = yyyyMm.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const periodeLabel =
    filterMode === 'bulanan'
      ? `Bulan ${formatBulanIndo(selectedMonth)}`
      : filterMode === 'tahunan'
      ? `Tahun ${selectedYear}`
      : 'Semua Periode Transaksi';

  // Dynamic Signatures from Pengurus Sheet
  const direktur =
    pengurusList.find(
      (p) => p.jabatan.toLowerCase().includes('direktur') || p.jabatan.toLowerCase().includes('ketua')
    )?.nama || 'Bambang Sutrisno';
  const bendahara =
    pengurusList.find((p) => p.jabatan.toLowerCase().includes('bendahara'))?.nama || 'Sri Handayani';

  const toggleReportType = (id: string) => {
    if (selectedReports.includes(id)) {
      if (selectedReports.length === 1) {
        showMessage('Pilih minimal 1 jenis laporan.', 'error');
        return;
      }
      setSelectedReports(selectedReports.filter((r) => r !== id));
    } else {
      setSelectedReports([...selectedReports, id]);
    }
  };

  const selectAllReports = () => {
    setSelectedReports(['kas', 'jurnal', 'labarugi', 'neraca', 'gaji']);
  };

  // Filter transactions by period
  const filteredKas = kasList.filter((k) => !periodeFilter || String(k.tanggal || '').startsWith(periodeFilter));

  // Helper for cumulative neraca filter
  const isDateUpToPeriod = (tanggal: string) => {
    const tglStr = String(tanggal || '');
    if (filterMode === 'semua' || !periodeFilter) return true;
    if (filterMode === 'tahunan') {
      return tglStr.substring(0, 4) <= selectedYear;
    }
    return tglStr.substring(0, 7) <= selectedMonth;
  };

  // --- BUKU KAS TOTALS ---
  const totalMasuk = filteredKas.reduce((sum, k) => sum + k.debit, 0);
  const totalKeluar = filteredKas.reduce((sum, k) => sum + k.kredit, 0);
  const saldoKasAkhir = totalMasuk - totalKeluar;

  // --- LABA RUGI CALCULATIONS (3 SECTIONS) ---
  const cutOffDate = getSaldoAwalCutOffDate();
  const pendapatanMap: Record<string, number> = {};
  const hppMap: Record<string, number> = {};
  const bebanLainMap: Record<string, number> = {};

  filteredKas.forEach((k) => {
    // If cut-off date is set and transaction is before cut-off date, exclude from operational laba rugi
    if (cutOffDate && formatDateToYYYYMMDD(k.tanggal) < cutOffDate) {
      return;
    }
    const ket = k.keterangan ? k.keterangan.trim() : 'Lain-lain';
    const lowerKet = ket.toLowerCase();

    if (k.jenis === 'Pemasukan') {
      pendapatanMap[ket] = (pendapatanMap[ket] || 0) + k.debit;
    } else {
      // Exclude Beli pakan from immediate HPP expense because buying feed increases inventory (Persediaan pakan)
      if (lowerKet.includes('pakan')) {
        return;
      }

      // Exclude Pembelian Ayam from immediate operating expense (capital asset purchase)
      if (
        lowerKet.includes('pembelian ayam') ||
        lowerKet.includes('beli ayam') ||
        lowerKet.includes('pembelian pullet') ||
        lowerKet.includes('pembelian bibit')
      ) {
        return;
      }

      // Handle chicken mortality non-cash expense
      if (
        lowerKet.includes('ayam mati') ||
        lowerKet.includes('kematian') ||
        lowerKet.includes('dipotong')
      ) {
        const nominalMati = Number(k.totalPerhitungan) || Number(k.nominalAktual) || 0;
        if (nominalMati > 0) {
          bebanLainMap['Beban Kematian Aset Biologis'] =
            (bebanLainMap['Beban Kematian Aset Biologis'] || 0) + nominalMati;
        }
        return;
      }

      // Pengeluaran: Check if it's direct HPP / Biaya produksi or Other Expenses
      const isHpp =
        lowerKet.includes('telur') ||
        lowerKet.includes('vitamin') ||
        lowerKet.includes('plastik') ||
        lowerKet.includes('tray') ||
        lowerKet.includes('gaji') ||
        lowerKet.includes('upah') ||
        lowerKet.includes('listrik') ||
        lowerKet.includes('pulsa') ||
        lowerKet.includes('perawatan') ||
        lowerKet.includes('kandang') ||
        lowerKet.includes('sewa');

      if (isHpp) {
        hppMap[ket] = (hppMap[ket] || 0) + k.kredit;
      } else {
        bebanLainMap[ket] = (bebanLainMap[ket] || 0) + k.kredit;
      }
    }
  });

  // Include feed consumption from production logs for the period in HPP
  const filteredLogsForReport = logProduksiList.filter(
    (l) => !periodeFilter || String(l.tanggal || '').startsWith(periodeFilter)
  );

  filteredLogsForReport.forEach((log) => {
    if (log.pakanKonsumsi && log.pakanKonsumsi > 0) {
      const itemPakan = persediaanList.find((i) => i.namaItem.toLowerCase().includes('pakan'));
      const unitHargaPakan = itemPakan && itemPakan.hargaJualAcuan ? itemPakan.hargaJualAcuan : 8500;
      const nilaiPemakaian = Math.round(log.pakanKonsumsi * unitHargaPakan);
      const label = 'Biaya Pemakaian Pakan Ayam';
      hppMap[label] = (hppMap[label] || 0) + nilaiPemakaian;
    }
  });

  const totalPendapatan = Object.values(pendapatanMap).reduce((a, b) => a + b, 0);
  const totalHpp = Object.values(hppMap).reduce((a, b) => a + b, 0);
  const labaKotor = totalPendapatan - totalHpp;
  const totalBebanLain = Object.values(bebanLainMap).reduce((a, b) => a + b, 0);
  const labaRugiBersih = labaKotor - totalBebanLain;

  // --- NERACA CALCULATIONS ---
  // Cumulative Kas & Bank up to selected period taken from Jurnal Umum (including Saldo Awal Kas)
  const jurnalUmumKumulatif = getJurnalUmumEntries().filter((e) => isDateUpToPeriod(e.tanggal));

  const totalDebitKas = jurnalUmumKumulatif
    .filter((e) => e.akunDebit === 'Kas')
    .reduce((sum, e) => sum + e.nominal, 0);

  const totalKreditKas = jurnalUmumKumulatif
    .filter((e) => e.akunKredit === 'Kas')
    .reduce((sum, e) => sum + e.nominal, 0);

  const saldoKasKumulatif = totalDebitKas - totalKreditKas;

  // Persediaan Valuation using HPP (Floor quantity at 0 to avoid negative balance distortion)
  const currentBreakdown = calculateHppBreakdownBulanan(periodeFilter || getTodayYYYYMMDD().substring(0, 7));
  const totalNilaiPersediaan = persediaanList.reduce((sum, item) => {
    const validQty = Math.max(0, item.saldoQty);
    let itemHpp = item.hargaJualAcuan * 0.75;
    const alloc = currentBreakdown.allocations.find((a) => a.namaItem === item.namaItem);
    if (alloc && alloc.hppPerKg > 0) {
      itemHpp = alloc.hppPerKg;
    }
    return sum + validQty * itemHpp;
  }, 0);

  // Aset Lancar
  const totalAsetLancar = saldoKasKumulatif + totalNilaiPersediaan;

  // Aset Tetap
  const totalAsetTetap = asetList.reduce((sum, a) => sum + a.nilaiPerolehan, 0);

  // Total Aktiva
  const totalAktiva = totalAsetLancar + totalAsetTetap;

  // Liabilities & Equity
  const kewajibanList = modalKewajibanList.filter((m) => m.jenis === 'Kewajiban' && m.status === 'Aktif');
  const modalList = modalKewajibanList.filter((m) => m.jenis === 'Modal' && m.status === 'Aktif');

  const totalKewajiban = kewajibanList.reduce((sum, m) => sum + m.nilai, 0);
  const totalModalDisetor = modalList.reduce((sum, m) => sum + m.nilai, 0);

  // Cumulative Laba/Rugi Operasional (excluding pre-cutoff records, capital transactions, and deferred feed inventory purchases)
  const cumulativeKas = kasList.filter((k) => {
    if (!isDateUpToPeriod(k.tanggal)) return false;
    if (cutOffDate && formatDateToYYYYMMDD(k.tanggal) < cutOffDate) return false;
    return true;
  });
  const cumulativeLogs = logProduksiList.filter((l) => {
    if (!isDateUpToPeriod(l.tanggal)) return false;
    if (cutOffDate && formatDateToYYYYMMDD(l.tanggal) < cutOffDate) return false;
    return true;
  });
  let kumulatifPendapatan = 0;
  let kumulatifBeban = 0;

  cumulativeKas.forEach((k) => {
    const lowerKet = (k.keterangan || '').toLowerCase();

    if (k.jenis === 'Pemasukan') {
      kumulatifPendapatan += k.debit;
    } else {
      if (
        lowerKet.includes('pembelian ayam') ||
        lowerKet.includes('beli ayam') ||
        lowerKet.includes('pembelian pullet') ||
        lowerKet.includes('pembelian bibit')
      ) {
        return;
      }
      if (
        lowerKet.includes('ayam mati') ||
        lowerKet.includes('kematian') ||
        lowerKet.includes('dipotong')
      ) {
        kumulatifBeban += Number(k.totalPerhitungan) || Number(k.nominalAktual) || 0;
        return;
      }
      if (!lowerKet.includes('pakan')) {
        kumulatifBeban += k.kredit;
      }
    }
  });

  // Add cumulative feed consumption to cumulative expenses
  cumulativeLogs.forEach((log) => {
    if (log.pakanKonsumsi && log.pakanKonsumsi > 0) {
      const itemPakan = persediaanList.find((i) => i.namaItem.toLowerCase().includes('pakan'));
      const unitHargaPakan = itemPakan && itemPakan.hargaJualAcuan ? itemPakan.hargaJualAcuan : 8500;
      kumulatifBeban += Math.round(log.pakanKonsumsi * unitHargaPakan);
    }
  });

  const totalLabaKumulatif = kumulatifPendapatan - kumulatifBeban;

  const totalEkuitas = totalModalDisetor + totalLabaKumulatif;
  const totalPasiva = totalKewajiban + totalEkuitas;

  const isNeracaBalanced = Math.abs(totalAktiva - totalPasiva) < 1;

  // PDF Print
  const handleExportPDF = () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      setShowPrintModal(true);
    } else {
      try {
        window.print();
      } catch (err) {
        console.warn('Window print error:', err);
        setShowPrintModal(true);
      }
    }
  };

  // Real Excel (.xlsx) Export
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. BUKU KAS HARIAN
      if (selectedReports.includes('kas')) {
        const kasRows: (string | number)[][] = [
          ['BUKU KAS HARIAN BUMDES'],
          [`BUMDes: ${profil.namaBumdes}`],
          [`Periode: ${periodeLabel}`],
          [],
          ['No Bukti', 'Tanggal', 'Keterangan Transaksi', 'Catatan', 'Debit (Masuk)', 'Kredit (Keluar)']
        ];

        filteredKas.forEach((k) => {
          kasRows.push([
            k.rowNumber ? `KAS-${k.rowNumber}` : k.id ? `KAS-${k.id}` : '',
            formatTanggalDisplay(k.tanggal),
            k.keterangan,
            k.tambahanKeterangan || '',
            k.debit,
            k.kredit
          ]);
        });

        kasRows.push(['', '', 'TOTAL', '', totalMasuk, totalKeluar]);
        kasRows.push(['', '', 'SALDO KAS AKHIR', '', saldoKasAkhir, '']);

        const wsKas = XLSX.utils.aoa_to_sheet(kasRows);
        wsKas['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 18 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsKas, 'Kas Harian');
      }

      // 2. JURNAL UMUM
      if (selectedReports.includes('jurnal')) {
        const journals = getJurnalUmumEntries(periodeFilter);
        const jurnalRows: (string | number)[][] = [
          ['JURNAL UMUM (ENGINE OTOMATIS)'],
          [`BUMDes: ${profil.namaBumdes}`],
          [`Periode: ${periodeLabel}`],
          [],
          ['No Bukti', 'Tanggal', 'Keterangan Transaksi', 'Akun Debit', 'Akun Kredit', 'Nominal (Rp)']
        ];

        journals.forEach((j) => {
          jurnalRows.push([
            j.noBukti,
            formatTanggalDisplay(j.tanggal),
            j.keteranganKas,
            j.akunDebit,
            j.akunKredit,
            j.nominal
          ]);
        });

        const wsJurnal = XLSX.utils.aoa_to_sheet(jurnalRows);
        wsJurnal['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsJurnal, 'Jurnal Umum');
      }

      // 3. LABA RUGI
      if (selectedReports.includes('labarugi')) {
        const labaRugiRows: (string | number)[][] = [
          ['LAPORAN LABA RUGI OPERASIONAL BUMDES'],
          [`BUMDes: ${profil.namaBumdes}`],
          [`Periode: ${periodeLabel}`],
          [],
          ['Kategori / Rincian', 'Jenis', 'Nominal (Rp)'],
          ['1. PENDAPATAN OPERASIONAL & PENJUALAN']
        ];

        Object.entries(pendapatanMap).forEach(([cat, val]) => {
          labaRugiRows.push([` - ${cat}`, 'Pendapatan', val]);
        });
        labaRugiRows.push(['TOTAL PENDAPATAN OPERASIONAL (1)', '', totalPendapatan]);
        labaRugiRows.push([]);

        labaRugiRows.push(['2. HARGA POKOK PENJUALAN (HPP)']);
        Object.entries(hppMap).forEach(([cat, val]) => {
          labaRugiRows.push([` - ${cat}`, 'HPP', val]);
        });
        labaRugiRows.push(['TOTAL HARGA POKOK PENJUALAN (2)', '', totalHpp]);
        labaRugiRows.push(['LABA KOTOR OPERASIONAL (1 - 2)', '', labaKotor]);
        labaRugiRows.push([]);

        labaRugiRows.push(['3. BEBAN LAIN-LAIN / OPERASIONAL']);
        Object.entries(bebanLainMap).forEach(([cat, val]) => {
          labaRugiRows.push([` - ${cat}`, 'Beban Lain', val]);
        });
        labaRugiRows.push(['TOTAL BEBAN LAIN-LAIN (3)', '', totalBebanLain]);
        labaRugiRows.push([]);
        labaRugiRows.push(['LABA / (RUGI) BERSIH OPERASIONAL', '', labaRugiBersih]);

        const wsLabaRugi = XLSX.utils.aoa_to_sheet(labaRugiRows);
        wsLabaRugi['!cols'] = [{ wch: 45 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsLabaRugi, 'Laba Rugi');
      }

      // 4. NERACA
      if (selectedReports.includes('neraca')) {
        const neracaRows: (string | number)[][] = [
          ['LAPORAN NERACA BUMDES'],
          [`BUMDes: ${profil.namaBumdes}`],
          [`Periode: ${periodeLabel}`],
          [],
          ['AKTIVA (ASET)', 'Nilai (Rp)', 'PASIVA (KEWAJIBAN & EKUITAS)', 'Nilai (Rp)'],
          ['Kas & Bank', saldoKasKumulatif, 'Utang & Kewajiban Jangka Pendek', totalKewajiban],
          ['Persediaan Barang / Produk', totalNilaiPersediaan, 'Penyertaan Modal Desa', totalModalDisetor],
          ['Aset Tetap (Investasi)', totalAsetTetap, 'Laba Berjalan / Retained Earnings', totalLabaKumulatif],
          ['TOTAL AKTIVA', totalAktiva, 'TOTAL PASIVA', totalPasiva]
        ];

        const wsNeraca = XLSX.utils.aoa_to_sheet(neracaRows);
        wsNeraca['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 38 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsNeraca, 'Neraca');
      }

      // 5. LAMPIRAN GAJI
      if (selectedReports.includes('gaji')) {
        const gajiRows: (string | number)[][] = [
          ['LAMPIRAN PAYROLL GAJI KARYAWAN BUMDES'],
          [`BUMDes: ${profil.namaBumdes}`],
          [`Periode: ${periodeLabel}`],
          [],
          ['ID Ref Kas', 'Tanggal', 'Nama Karyawan', 'Posisi / Keterangan', 'Hari Kerja (Hari)', 'Total Diterima (Rp)']
        ];

        const salaryKasList = filteredKas.filter(isSalaryTransaction);
        salaryKasList.forEach((salaryTrans) => {
          const rowId = salaryTrans.rowNumber || Number(salaryTrans.id) || 0;
          const dists = payrollDistributions[rowId] || (salaryTrans.id ? (payrollDistributions as any)[salaryTrans.id] : []) || [];
          dists.forEach((d) => {
            const emp = karyawanList.find((k) => k.id === d.employeeId);
            gajiRows.push([
              `KAS-${salaryTrans.rowNumber || salaryTrans.id || ''}`,
              formatTanggalDisplay(salaryTrans.tanggal),
              emp?.name || d.employeeId,
              emp?.description || '-',
              d.workday,
              d.total
            ]);
          });
        });

        const wsGaji = XLSX.utils.aoa_to_sheet(gajiRows);
        wsGaji['!cols'] = [{ wch: 15 }, { wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsGaji, 'Lampiran Gaji');
      }

      const fileName = `Laporan_Keuangan_BUMDes_${periodeFilter || 'Semua'}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showMessage(`Laporan Excel (.xlsx) berhasil diunduh: ${fileName}`, 'success');
    } catch (err) {
      console.error('Failed to export Excel:', err);
      showMessage('Gagal mengunduh file Excel (.xlsx).', 'error');
    }
  };

  const reportTypes = [
    { id: 'kas', label: 'Buku Kas Harian', icon: Wallet },
    { id: 'jurnal', label: 'Jurnal Umum (Engine)', icon: BookOpen },
    { id: 'labarugi', label: 'Laporan Laba Rugi', icon: TrendingUp },
    { id: 'neraca', label: 'Laporan Neraca', icon: Scale },
    { id: 'gaji', label: 'Lampiran Gaji Karyawan', icon: FileText }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:m-0">
      {/* Page Title (Hidden when printing) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-xs print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cetak Laporan Keuangan BUMDes</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Pilih jenis laporan (Laba Rugi, Neraca, Kas, Jurnal, Gaji) dan periode (Bulanan / Tahunan / Semua) untuk pratinjau, ekspor Excel, atau cetak PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWAModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
            title="Kirim Ringkasan Laporan Langsung ke Nomor WhatsApp"
          >
            <Send className="w-4 h-4 text-emerald-700" />
            <span>Kirim WA</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Controls (Hidden when printing) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-700">Tipe & Periode Laporan</label>
            
            {/* Mode selector tab */}
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-700">
              <button
                type="button"
                onClick={() => setFilterMode('bulanan')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'bulanan' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-gray-900'
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('tahunan')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'tahunan' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-gray-900'
                }`}
              >
                Tahunan
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('semua')}
                className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  filterMode === 'semua' ? 'bg-white text-emerald-900 shadow-xs' : 'hover:text-gray-900'
                }`}
              >
                Semua
              </button>
            </div>

            {/* Input field depending on mode */}
            {filterMode === 'bulanan' && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none bg-white font-medium"
              />
            )}

            {filterMode === 'tahunan' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none bg-white font-semibold text-gray-900"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            )}

            {filterMode === 'semua' && (
              <div className="h-10 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-center">
                Menampilkan Seluruh Rekapitulasi Data
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-gray-700">Pilih Modul Laporan Ditampilkan</label>
              <button
                onClick={selectAllReports}
                className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((rep) => {
                const isSelected = selectedReports.includes(rep.id);
                const Icon = rep.icon;
                return (
                  <button
                    key={rep.id}
                    onClick={() => toggleReportType(rep.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{rep.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT PREVIEW CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-8 shadow-xs space-y-6 sm:space-y-8 print:border-none print:p-0 print:shadow-none overflow-hidden">
        {/* Official Header */}
        <div className="text-center border-b-2 border-emerald-800 pb-4 space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-emerald-950 uppercase tracking-wide">
            {profil.namaBumdes}
          </h1>
          <p className="text-xs text-gray-600 font-medium">
            {profil.alamat}, Desa {profil.desa}, Kec. {profil.kecamatan}, Kab. {profil.kabupaten}
          </p>
          <p className="text-[11px] text-gray-500 font-semibold">
            SK Pendirian: {profil.nomorSK} • Unit Usaha: {profil.unitUsaha}
          </p>
          <div className="pt-2 text-xs sm:text-sm font-bold text-gray-900 underline uppercase tracking-wider">
            LAPORAN KEUANGAN BUMDES PERIODE {periodeLabel.toUpperCase()}
          </div>
        </div>

        {/* SECTION 1: LAPORAN LABA RUGI */}
        {selectedReports.includes('labarugi') && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>I. LAPORAN LABA RUGI OPERASIONAL</span>
              </h3>
              <span className="text-[11px] sm:text-xs text-gray-500 font-medium">Periode {periodeLabel}</span>
            </div>

            <div className="border border-gray-300 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[300px]">
                <thead className="bg-emerald-800 text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4">URAIAN AKUN / KATEGORI</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">JUMLAH (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* SECTION 1: PENDAPATAN OPERASIONAL DAN PENJUALAN */}
                  <tr className="bg-emerald-50/80 font-bold text-emerald-950">
                    <td colSpan={2} className="py-2 px-3 sm:px-4 uppercase tracking-wider text-[11px] sm:text-xs">
                      1. PENDAPATAN OPERASIONAL DAN PENJUALAN
                    </td>
                  </tr>
                  {Object.keys(pendapatanMap).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-2 px-4 sm:px-6 text-gray-400 italic text-[11px] sm:text-xs">
                        Belum ada pendapatan dicatat pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(pendapatanMap).map(([cat, amount], idx) => (
                      <tr key={`pend-${cat}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-4 sm:px-6 text-gray-800 text-xs sm:text-sm">{cat}</td>
                        <td className="py-2 px-3 sm:px-4 text-right font-semibold text-emerald-800 whitespace-nowrap text-xs sm:text-sm">
                          {formatRupiah(amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-emerald-100/60 font-bold border-t border-b border-gray-300 text-xs sm:text-sm">
                    <td className="py-2.5 px-3 sm:px-4 text-emerald-950">TOTAL PENDAPATAN OPERASIONAL & PENJUALAN (1)</td>
                    <td className="py-2.5 px-3 sm:px-4 text-right text-emerald-900 font-extrabold whitespace-nowrap">{formatRupiah(totalPendapatan)}</td>
                  </tr>

                  {/* SECTION 2: HARGA POKOK PENJUALAN (HPP) */}
                  <tr className="bg-amber-50/80 font-bold text-amber-950">
                    <td colSpan={2} className="py-2 px-3 sm:px-4 uppercase tracking-wider text-[11px] sm:text-xs">
                      2. HARGA POKOK PENJUALAN (HPP) / BIAYA PRODUKSI LANGSUNG
                    </td>
                  </tr>
                  {Object.keys(hppMap).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-2 px-4 sm:px-6 text-gray-400 italic text-[11px] sm:text-xs">
                        Belum ada biaya HPP dicatat pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(hppMap).map(([cat, amount], idx) => (
                      <tr key={`hpp-${cat}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-4 sm:px-6 text-gray-800 text-xs sm:text-sm">{cat}</td>
                        <td className="py-2 px-3 sm:px-4 text-right font-semibold text-amber-900 whitespace-nowrap text-xs sm:text-sm">
                          {formatRupiah(amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-amber-100/60 font-bold border-t border-b border-gray-300 text-xs sm:text-sm">
                    <td className="py-2.5 px-3 sm:px-4 text-amber-950">TOTAL HARGA POKOK PENJUALAN / HPP (2)</td>
                    <td className="py-2.5 px-3 sm:px-4 text-right text-amber-950 font-extrabold whitespace-nowrap">{formatRupiah(totalHpp)}</td>
                  </tr>

                  {/* SUB-TOTAL: LABA KOTOR OPERASIONAL */}
                  <tr className="bg-emerald-50 font-black border-t-2 border-b-2 border-emerald-300 text-emerald-950 text-xs sm:text-sm">
                    <td className="py-2.5 px-3 sm:px-4">LABA KOTOR OPERASIONAL (1 - 2)</td>
                    <td className="py-2.5 px-3 sm:px-4 text-right text-sm sm:text-base whitespace-nowrap">{formatSignedRupiah(labaKotor)}</td>
                  </tr>

                  {/* SECTION 3: BEBAN LAIN-LAIN */}
                  <tr className="bg-rose-50/80 font-bold text-rose-950">
                    <td colSpan={2} className="py-2 px-3 sm:px-4 uppercase tracking-wider text-[11px] sm:text-xs">
                      3. BEBAN LAIN-LAIN / OPERASIONAL NON-PRODUKSI
                    </td>
                  </tr>
                  {Object.keys(bebanLainMap).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-2 px-4 sm:px-6 text-gray-400 italic text-[11px] sm:text-xs">
                        Belum ada beban lain-lain dicatat pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(bebanLainMap).map(([cat, amount], idx) => (
                      <tr key={`beban-${cat}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-4 sm:px-6 text-gray-800 text-xs sm:text-sm">{cat}</td>
                        <td className="py-2 px-3 sm:px-4 text-right font-semibold text-rose-800 whitespace-nowrap text-xs sm:text-sm">
                          {formatRupiah(amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-rose-100/60 font-bold border-t border-b border-gray-300 text-xs sm:text-sm">
                    <td className="py-2.5 px-3 sm:px-4 text-rose-950">TOTAL BEBAN LAIN-LAIN (3)</td>
                    <td className="py-2.5 px-3 sm:px-4 text-right text-rose-950 font-extrabold whitespace-nowrap">{formatRupiah(totalBebanLain)}</td>
                  </tr>
                </tbody>

                <tfoot className="border-t-2 border-gray-400">
                  <tr
                    className={`font-black text-xs sm:text-base ${
                      labaRugiBersih >= 0
                        ? 'bg-emerald-100 text-emerald-950'
                        : 'bg-rose-100 text-rose-950'
                    }`}
                  >
                    <td className="py-3 px-3 sm:px-4">LABA / (RUGI) BERSIH OPERASIONAL (1 - 2 - 3)</td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">{formatSignedRupiah(labaRugiBersih)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: LAPORAN NERACA */}
        {selectedReports.includes('neraca') && (
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>II. LAPORAN NERACA (POSISI KEUANGAN)</span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                {isNeracaBalanced ? '✓ Neraca Seimbang' : '⚠ Perlu Penyesuaian'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SISI AKTIVA (ASET) */}
              <div className="border border-gray-300 rounded-xl overflow-hidden space-y-0">
                <div className="bg-emerald-900 text-white p-2.5 font-bold text-xs uppercase tracking-wider text-center">
                  AKTIVA (ASET BUMDES)
                </div>

                <div className="p-4 space-y-4 text-xs sm:text-sm">
                  {/* ASET LANCAR */}
                  <div>
                    <h5 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                      1. Aset Lancar
                    </h5>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Kas & Rekening Bank</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(saldoKasKumulatif)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Persediaan Barang Dagangan</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(totalNilaiPersediaan)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-emerald-900">
                        <span>Total Aset Lancar</span>
                        <span>{formatRupiah(totalAsetLancar)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ASET TETAP */}
                  <div>
                    <h5 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                      2. Aset Tetap / Peralatan
                    </h5>
                    <div className="space-y-1 pl-2">
                      {asetList.length === 0 ? (
                        <p className="text-gray-400 italic">Belum ada aset tetap.</p>
                      ) : (
                        asetList.map((a, idx) => (
                          <div key={`ast-${a.id}-${idx}`} className="flex justify-between text-[11px] sm:text-xs">
                            <span className="text-gray-600">{a.nama}</span>
                            <span className="font-medium text-gray-800">{formatRupiah(a.nilaiPerolehan)}</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-emerald-900">
                        <span>Total Aset Tetap</span>
                        <span>{formatRupiah(totalAsetTetap)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-100 text-emerald-950 p-3 font-bold text-xs sm:text-sm flex justify-between border-t border-emerald-300">
                  <span>TOTAL AKTIVA (ASET)</span>
                  <span className="text-sm sm:text-base">{formatRupiah(totalAktiva)}</span>
                </div>
              </div>

              {/* SISI PASIVA (KEWAJIBAN & EKUITAS) */}
              <div className="border border-gray-300 rounded-xl overflow-hidden space-y-0">
                <div className="bg-emerald-900 text-white p-2.5 font-bold text-xs uppercase tracking-wider text-center">
                  PASIVA (KEWAJIBAN & EKUITAS)
                </div>

                <div className="p-4 space-y-4 text-xs sm:text-sm">
                  {/* KEWAJIBAN */}
                  <div>
                    <h5 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                      1. Kewajiban / Utang
                    </h5>
                    <div className="space-y-1.5 pl-2">
                      {kewajibanList.length === 0 ? (
                        <p className="text-gray-400 italic text-[11px]">Tidak ada kewajiban / utang aktif.</p>
                      ) : (
                        kewajibanList.map((k, idx) => (
                          <div key={`kwj-${k.id}-${idx}`} className="flex justify-between text-[11px] sm:text-xs">
                            <span className="text-gray-600">{k.uraian}</span>
                            <span className="font-medium text-rose-800">{formatRupiah(k.nilai)}</span>
                          </div>
                        ))
                      )}
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-rose-900">
                        <span>Total Kewajiban</span>
                        <span>{formatRupiah(totalKewajiban)}</span>
                      </div>
                    </div>
                  </div>

                  {/* EKUITAS / MODAL */}
                  <div>
                    <h5 className="font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                      2. Ekuitas & Modal
                    </h5>
                    <div className="space-y-1.5 pl-2">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Penyertaan Modal Desa</span>
                        <span className="font-semibold text-gray-900">{formatRupiah(totalModalDisetor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Laba Berjalan / Retained Earnings</span>
                        <span className="font-semibold text-emerald-800">{formatSignedRupiah(totalLabaKumulatif)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200 font-bold text-emerald-900">
                        <span>Total Ekuitas</span>
                        <span>{formatRupiah(totalEkuitas)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-100 text-emerald-950 p-3 font-bold text-xs sm:text-sm flex justify-between border-t border-emerald-300">
                  <span>TOTAL PASIVA (KEWAJIBAN & EKUITAS)</span>
                  <span className="text-sm sm:text-base">{formatRupiah(totalPasiva)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: BUKU KAS HARIAN */}
        {selectedReports.includes('kas') && (
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              <span>III. BUKU KAS HARIAN OPERASIONAL</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border border-gray-300">
                <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-gray-300">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-gray-300">Tanggal</th>
                    <th className="py-2.5 px-3 border-r border-gray-300">Keterangan</th>
                    <th className="py-2.5 px-3 border-r border-gray-300 text-right">Debit (Kas Masuk)</th>
                    <th className="py-2.5 px-3 text-right">Kredit (Kas Keluar)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredKas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">
                        Tidak ada transaksi kas pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredKas.map((item, idx) => (
                      <tr key={`rkas-${item.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border-r border-gray-200 text-gray-700">
                          {formatTanggalDisplay(item.tanggal)}
                        </td>
                        <td className="py-2 px-3 border-r border-gray-200">
                          <strong className="block text-gray-900">{item.keterangan}</strong>
                          {item.tambahanKeterangan && (
                            <span className="text-[11px] text-gray-500">{item.tambahanKeterangan}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right font-semibold text-emerald-800">
                          {item.debit > 0 ? formatRupiah(item.debit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-rose-800">
                          {item.kredit > 0 ? formatRupiah(item.kredit) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-gray-100 font-bold border-t border-gray-300">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right border-r border-gray-300">
                      TOTAL PERIODE INI:
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-gray-300 text-emerald-900">
                      {formatRupiah(totalMasuk)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-900">
                      {formatRupiah(totalKeluar)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-100 text-emerald-950 font-black">
                    <td colSpan={2} className="py-2.5 px-3 text-right border-r border-gray-300">
                      SALDO BERSIH KAS PERIODE INI:
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-right text-base">
                      {formatSignedRupiah(saldoKasAkhir)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3B: JURNAL UMUM (ENGINE OTOMATIS) */}
        {selectedReports.includes('jurnal') && (() => {
          const jurnalEntries = getJurnalUmumEntries(periodeFilter);
          return (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>JURNAL UMUM (ENGINE JURNAL OTOMATIS)</span>
                </h3>
                
                <button
                  type="button"
                  onClick={() => setIsJurnalExpanded(!isJurnalExpanded)}
                  className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <span>{isJurnalExpanded ? 'Sembunyikan Detail Jurnal' : 'Buka Detail Jurnal'}</span>
                  {isJurnalExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isJurnalExpanded && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900">
                      Tersedia {jurnalEntries.length} ayat jurnal otomatis pada periode ini.
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Sistem membukukan transaksi kas secara ganda (Debit/Kredit). Klik tombol untuk meninjau rincian pasangan akun debit & kredit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsJurnalExpanded(true)}
                    className="shrink-0 px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-emerald-800 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    Tampilkan Rincian Jurnal
                  </button>
                </div>
              )}

              <div className={`overflow-x-auto ${!isJurnalExpanded ? 'hidden print:block' : 'block'}`}>
                <table className="w-full text-left text-xs sm:text-sm border border-gray-300">
                  <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-gray-300">
                    <tr>
                      <th className="py-2.5 px-3 border-r border-gray-300">No Bukti</th>
                      <th className="py-2.5 px-3 border-r border-gray-300">Tanggal</th>
                      <th className="py-2.5 px-3 border-r border-gray-300">Keterangan Transaksi</th>
                      <th className="py-2.5 px-3 border-r border-gray-300 bg-emerald-100/70 text-emerald-950">Akun Debit</th>
                      <th className="py-2.5 px-3 border-r border-gray-300 bg-rose-100/70 text-rose-950">Akun Kredit</th>
                      <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {jurnalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-gray-500">
                          Tidak ada ayat jurnal umum pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      jurnalEntries.map((j, idx) => (
                        <tr key={`jrn-${j.id}-${idx}`} className="hover:bg-gray-50">
                          <td className="py-2 px-3 border-r border-gray-200 text-gray-600 font-mono text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{j.noBukti}</span>
                              {j.noBukti === 'MEM-SALDO-AWAL' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Saldo Awal
                                </span>
                              )}
                              {j.noBukti === 'MEM-SALDO-AWAL' && (
                                <button
                                  type="button"
                                  onClick={() => setShowResetSaldoAwalModal(true)}
                                  className="print:hidden inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
                                  title="Reset / Hapus Saldo Awal Migrasi"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 text-gray-700">
                            {formatTanggalDisplay(j.tanggal)}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 font-medium text-gray-900">
                            {j.keteranganKas}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 font-semibold text-emerald-900 bg-emerald-50/40">
                            {j.akunDebit}
                          </td>
                          <td className="py-2 px-3 border-r border-gray-200 font-semibold text-rose-900 bg-rose-50/40">
                            {j.akunKredit}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">
                            {formatRupiah(j.nominal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* SECTION 4: LAMPIRAN GAJI KARYAWAN */}
        {selectedReports.includes('gaji') && (
          <div className="space-y-4 pt-2">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>IV. LAMPIRAN PEMBAGIAN GAJI KARYAWAN</span>
            </h3>

            <div className="space-y-6">
              {filteredKas
                .filter(isSalaryTransaction)
                .map((salaryTrans, sIdx) => {
                  const rowId = salaryTrans.rowNumber || Number(salaryTrans.id) || 0;
                  const dists = payrollDistributions[rowId] || (salaryTrans.id ? (payrollDistributions as any)[salaryTrans.id] : []) || [];
                  return (
                    <div key={`st-${salaryTrans.id}-${sIdx}`} className="border border-gray-300 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs sm:text-sm font-bold bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                        <span>
                          Gaji Periode {formatTanggalLengkap(salaryTrans.tanggal)} (Reff #{salaryTrans.id})
                        </span>
                        <span className="text-emerald-800">Total: {formatRupiah(salaryTrans.nominalAktual)}</span>
                      </div>

                      <table className="w-full text-left text-xs border border-gray-200">
                        <thead className="bg-gray-100 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="py-2 px-3">Nama Karyawan</th>
                            <th className="py-2 px-3">Posisi / Keterangan</th>
                            <th className="py-2 px-3 text-center">Hari Kerja</th>
                            <th className="py-2 px-3 text-right">Total Diterima</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {dists.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-3 text-center text-gray-400">
                                Rincian pembagian belum diisi di modul Gaji Karyawan.
                              </td>
                            </tr>
                          ) : (
                            dists.map((d, dIdx) => {
                              const emp = karyawanList.find((k) => k.id === d.employeeId);
                              return (
                                <tr key={`dist-${d.employeeId}-${dIdx}`}>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{emp?.name || d.employeeId}</td>
                                  <td className="py-2 px-3 text-gray-600">{emp?.description || '-'}</td>
                                  <td className="py-2 px-3 text-center">{d.workday} hr</td>
                                  <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                    {formatRupiah(d.total)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Official Signatures */}
        <div className="pt-12 grid grid-cols-2 text-center text-xs gap-8 font-medium">
          <div>
            <p className="text-gray-500 mb-16">Mengetahui,<br /><strong>Direktur BUMDes</strong></p>
            <p className="font-bold text-gray-900 underline">{direktur}</p>
          </div>

          <div>
            <p className="text-gray-500 mb-16">Dibuat Oleh,<br /><strong>Bendahara BUMDes</strong></p>
            <p className="font-bold text-gray-900 underline">{bendahara}</p>
          </div>
        </div>
      </div>

      {/* Print PDF Guidance Modal for Sandboxed Iframe */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Petunjuk Cetak PDF / Printer</h3>
                  <p className="text-emerald-200 text-xs mt-0.5">Solusi cetak laporan di pratinjau AI Studio</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Akses Dialog Cetak Dibatasi Browser (Pratinjau iFrame)</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Karena aplikasi sedang dibuka di dalam bingkai pratinjau (iframe), browser melarang pemanggilan langsung dialog printer (<code className="bg-amber-100 px-1 rounded">window.print</code>) demi keamanan sandbox.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">Silakan Pilih Solusi Cetak:</p>

                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    window.open(window.location.href, '_blank');
                  }}
                  className="w-full p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <ExternalLink className="w-4 h-4 text-emerald-200 shrink-0" />
                    <div>
                      <div>1. Buka Aplikasi di Tab Baru</div>
                      <div className="text-[10px] text-emerald-200 font-normal">Membuka layar penuh agar tombol Cetak PDF / Ctrl+P bekerja normal</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-emerald-900/60 px-2.5 py-1 rounded-lg shrink-0">Buka Tab</span>
                </button>

                <button
                  onClick={() => {
                    setShowPrintModal(false);
                    handleExportExcel();
                  }}
                  className="w-full p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div>2. Unduh Format Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Dapat dibuka & dicetak langsung dari Microsoft Excel / Google Sheets</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold bg-white border border-slate-300 px-2.5 py-1 rounded-lg shrink-0">Unduh .xlsx</span>
                </button>

                <button
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      // ignore
                    }
                  }}
                  className="w-full p-2.5 text-xs text-gray-500 hover:text-gray-800 font-medium text-center hover:underline cursor-pointer"
                >
                  Paksa Coba Dialog Cetak Browser
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWAModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:hidden animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="bg-emerald-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-emerald-100 flex items-center justify-center font-bold shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Kirim Laporan via WhatsApp</h3>
                  <p className="text-emerald-200 text-xs mt-0.5">Kirim ringkasan laporan keuangan ke WhatsApp pengurus / Kades</p>
                </div>
              </div>
              <button
                onClick={() => setShowWAModal(false)}
                className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Nomor WhatsApp Tujuan (Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                />
                <p className="text-[11px] text-gray-500">
                  Kosongkan jika ingin memilih penerima atau grup secara manual di aplikasi WhatsApp.
                </p>
              </div>

              {/* Custom Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Catatan Pesan Tambahan (Opsional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Yth. Bapak Kepala Desa / Pengurus, berikut ringkasan laporan keuangan BUMDes periode ini."
                  value={waCustomNote}
                  onChange={(e) => setWaCustomNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                />
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800">
                    Pratinjau Teks Laporan WhatsApp
                  </label>
                  <button
                    onClick={handleCopyWAMessage}
                    className="text-xs text-emerald-800 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </button>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl font-mono text-[11px] text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {generateWAMessage()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowWAModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSendWA}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-emerald-200" />
                <span>Buka WhatsApp & Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SALDO AWAL CONFIRMATION MODAL FROM JURNAL UMUM */}
      {showResetSaldoAwalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reset Migrasi Saldo Awal?</h3>
                <p className="text-xs text-gray-500 font-medium">Sinkronisasi Jurnal, Kas, & Profil</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
              Menghapus ayat jurnal saldo awal ini akan mereset form migrasi saldo awal di menu Profil BUMDes dan menghapus penyertaan modal awal di Buku Kas Harian agar seluruh modul tetap sinkron dan seimbang.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetSaldoAwalModal(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetSaldoAwal();
                  setShowResetSaldoAwalModal(false);
                  showMessage('Saldo awal berhasil direset. Form migrasi saldo awal di Profil BUMDes telah dibuka kembali.', 'success');
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Reset Saldo Awal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

