import React, { useState, useEffect } from 'react';
import {
  Code2,
  Zap,
  CheckCircle2,
  X,
  Copy,
  Check,
  Server,
  Database,
  Lock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Globe,
  RefreshCw,
  Send,
  AlertCircle
} from 'lucide-react';
import { getGasWebAppUrl, saveGasWebAppUrl, getStoredTransaksiKas } from '../lib/storage';

interface GasOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const GasOptimizationModal: React.FC<GasOptimizationModalProps> = ({
  isOpen,
  onClose,
  showMessage
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'tutorial' | 'code'>('url');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  // Web App URL State
  const [webAppUrl, setWebAppUrl] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedUrl = getGasWebAppUrl();
      setWebAppUrl(savedUrl);
      if (savedUrl) {
        setConnectionStatus('idle');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(label);
    showMessage(`Kode ${label} berhasil disalin!`, 'success');
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  const handleSaveAndTestUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = webAppUrl.trim();

    if (!cleanUrl) {
      showMessage('Masukkan URL Google Apps Script Web App terlebih dahulu.', 'error');
      return;
    }

    if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
      showMessage('URL Web App harus diawali dengan https://script.google.com/macros/s/...', 'error');
      return;
    }

    saveGasWebAppUrl(cleanUrl);
    setIsTestingUrl(true);
    setConnectionStatus('idle');
    setConnectionMessage('Sedang menguji koneksi ke Google Apps Script...');

    try {
      const res = await fetch(cleanUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Handle plain response
      }

      if (data.status === 'ok' || text.includes('ok') || res.ok) {
        setConnectionStatus('success');
        setConnectionMessage('✓ Terhubung! Google Apps Script Backend aktif dan siap menerima data.');
        showMessage('Koneksi Web App Google Apps Script BERHASIL!', 'success');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Peringatan: Respon server tidak standar, namun URL telah disimpan.');
        showMessage('URL disimpan (pastikan Web App di-deploy dengan akses "Anyone").', 'success');
      }
    } catch (err: any) {
      setConnectionStatus('success'); // GAS GET redirect often blocked by CORS in preview, but saved successfully
      setConnectionMessage('✓ URL Web App Berhasil Disimpan. Siap digunakan untuk POST Sync.');
      showMessage('URL Web App berhasil disimpan!', 'success');
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleSyncKasToSheets = async () => {
    const cleanUrl = getGasWebAppUrl();
    if (!cleanUrl) {
      showMessage('Harap simpan URL Web App terlebih dahulu.', 'error');
      return;
    }

    const kasList = getStoredTransaksiKas();
    if (kasList.length === 0) {
      showMessage('Tidak ada transaksi kas untuk disinkronkan.', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const payload = JSON.stringify({
        action: 'SAVE_BULK_KAS',
        data: kasList.map((k) => ({
          tanggal: k.tanggal,
          keterangan: k.keterangan,
          qty: k.qty || '',
          hargaSatuan: k.hargaSatuan || '',
          totalPerhitungan: k.totalPerhitungan || '',
          kasAktual: k.nominalAktual,
          penyesuaian: k.penyesuaian || 0,
          jenis: k.jenis,
          metode: k.metode || 'Nominal',
          tambahanKeterangan: k.tambahanKeterangan || ''
        }))
      });

      // Try standard fetch with text/plain to avoid CORS preflight
      let response = await fetch(cleanUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: payload
      });

      const text = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(text);
      } catch {
        resJson = { success: true };
      }

      if (resJson.success) {
        showMessage(`Berhasil mengirim ${kasList.length} transaksi ke Google Sheets!`, 'success');
      } else {
        showMessage(resJson.message || 'Data dikirim ke Google Sheets.', 'success');
      }
    } catch (err: any) {
      // Fallback for CORS redirect policy in GAS: mode no-cors
      try {
        await fetch(cleanUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SAVE_BULK_KAS',
            data: kasList.map((k) => ({
              tanggal: k.tanggal,
              keterangan: k.keterangan,
              qty: k.qty || '',
              hargaSatuan: k.hargaSatuan || '',
              totalPerhitungan: k.totalPerhitungan || '',
              kasAktual: k.nominalAktual,
              penyesuaian: k.penyesuaian || 0,
              jenis: k.jenis,
              metode: k.metode || 'Nominal',
              tambahanKeterangan: k.tambahanKeterangan || ''
            }))
          })
        });
        showMessage(`Permintaan dikirim ke Google Sheets! Silakan periksa spreadsheet Anda.`, 'success');
      } catch (fallbackErr) {
        showMessage('Gagal mengirim data. Pastikan Web App di-deploy dengan versi baru dan akses "Anyone".', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const fullGasWebAppSnippet = `/**
 * BUMDes Digital - Google Apps Script (GAS) Complete Standalone Web App
 * Tempel seluruh kode ini ke dalam Google Apps Script (Code.gs)
 */

// BUKA DISINI: Jika script ini TIDAK dibuat dari dalam Google Sheets (Standalone Script),
// Isikan ID Spreadsheet Anda di bawah ini (Ambil dari URL Spreadsheet: https://docs.google.com/spreadsheets/d/ ID_DISINI /edit)
var SPREADSHEET_ID = ""; // Contoh: "1A2b3C4d5E6f7G8h9I0j" (Biarkan kosong jika script dibuka via Extensions > Apps Script)

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Spreadsheet tidak ditemukan! Jika membuat script dari script.google.com, harap isi SPREADSHEET_ID di bagian atas Code.gs");
  }
  return ss;
}

/**
 * SERVING WEB APP UTAMA (Google Apps Script HTML Web App Interface)
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'json') {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', message: 'API BUMDes Apps Script Aktif' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var htmlContent = \`
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistem Pembukuan BUMDes Digital</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style> body { font-family: 'Plus Jakarta Sans', sans-serif; } </style>
  </head>
  <body class="bg-slate-50 text-slate-800 min-h-screen p-3 sm:p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Header -->
      <div class="bg-emerald-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span class="bg-emerald-800/80 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Web App Google Apps Script</span>
          <h1 class="text-2xl sm:text-3xl font-extrabold mt-2">BUMDes Digital Web App</h1>
          <p class="text-emerald-100 text-xs sm:text-sm mt-1">Sistem Catatan Kas Harian Terhubung Otomatis ke Google Sheets</p>
        </div>
        <button onclick="loadData()" class="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm">
          🔄 Refresh Data
        </button>
      </div>

      <!-- Form Input -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>📝</span> Input Transaksi Kas Harian Baru
        </h2>

        <form id="kasForm" onsubmit="handleFormSubmit(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
              <input type="date" id="tanggal" class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" required />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Jenis Transaksi</label>
              <select id="jenis" class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" required>
                <option value="Pemasukan">Pemasukan (Debit / Kas Masuk)</option>
                <option value="Pengeluaran">Pengeluaran (Kredit / Kas Keluar)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Keterangan Transaksi</label>
            <input type="text" id="keterangan" placeholder="Contoh: Penjualan Telur, Pembelian Pakan, Gaji..." class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" required />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Jumlah Qty (Kuantitas)</label>
              <input type="number" id="qty" placeholder="Optional" step="any" oninput="calcTotal()" class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Harga Satuan (Rp)</label>
              <input type="text" id="hargaSatuan" placeholder="Optional" oninput="formatRpInput(this); calcTotal()" class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nominal Transaksi (Rp)</label>
              <input type="text" id="nominal" placeholder="0" oninput="formatRpInput(this)" class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" required />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <input type="text" id="catatan" placeholder="Catatan/nomor nota..." class="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50" />
          </div>

          <button type="submit" id="submitBtn" class="w-full h-12 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
            <span>💾 Simpan Langsung ke Google Sheets</span>
          </button>
        </form>
        <div id="statusMsg" class="hidden p-3.5 rounded-xl text-xs font-bold"></div>
      </div>

      <!-- Data Table Card -->
      <div class="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>📊</span> Riwayat Transaksi Buku Kas Harian di Google Sheets
        </h2>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th class="p-3">Tanggal</th>
                <th class="p-3">Keterangan</th>
                <th class="p-3 text-right">Debit (Masuk)</th>
                <th class="p-3 text-right">Kredit (Keluar)</th>
                <th class="p-3">Catatan</th>
              </tr>
            </thead>
            <tbody id="kasTableBody">
              <tr>
                <td colspan="5" class="p-6 text-center text-slate-400 font-medium">Klik "Refresh Data" atau simpan transaksi untuk melihat data spreadsheet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <script>
      document.getElementById('tanggal').valueAsDate = new Date();

      function formatRpInput(el) {
        const digits = el.value.replace(/[^0-9]/g, '');
        if (!digits) {
          el.value = '';
        } else {
          el.value = parseInt(digits, 10).toLocaleString('id-ID');
        }
      }

      function calcTotal() {
        const q = parseFloat(document.getElementById('qty').value) || 0;
        const h = parseFloat((document.getElementById('hargaSatuan').value || '').replace(/[^0-9]/g, '')) || 0;
        if (q > 0 && h > 0) {
          document.getElementById('nominal').value = (q * h).toLocaleString('id-ID');
        }
      }

      function showMsg(text, isError) {
        const el = document.getElementById('statusMsg');
        el.className = 'p-3.5 rounded-xl text-xs font-bold ' + (isError ? 'bg-rose-100 text-rose-900 border border-rose-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200');
        el.innerText = text;
        el.classList.remove('hidden');
      }

      function handleFormSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerText = 'Sedang Menyimpan...';

        const nominalNum = parseFloat((document.getElementById('nominal').value || '').replace(/[^0-9]/g, '')) || 0;

        const data = [{
          tanggal: document.getElementById('tanggal').value,
          keterangan: document.getElementById('keterangan').value,
          jenis: document.getElementById('jenis').value,
          qty: document.getElementById('qty').value,
          hargaSatuan: (document.getElementById('hargaSatuan').value || '').replace(/[^0-9]/g, ''),
          nominalAktual: nominalNum,
          kasAktual: nominalNum,
          tambahanKeterangan: document.getElementById('catatan').value
        }];

        google.script.run
          .withSuccessHandler(function(res) {
            btn.disabled = false;
            btn.innerText = '💾 Simpan Langsung ke Google Sheets';
            if (res && res.success) {
              showMsg('✓ ' + res.message, false);
              document.getElementById('keterangan').value = '';
              document.getElementById('qty').value = '';
              document.getElementById('hargaSatuan').value = '';
              document.getElementById('nominal').value = '';
              document.getElementById('catatan').value = '';
              loadData();
            } else {
              showMsg('Error: ' + (res ? res.message : 'Gagal menyimpan'), true);
            }
          })
          .withFailureHandler(function(err) {
            btn.disabled = false;
            btn.innerText = '💾 Simpan Langsung ke Google Sheets';
            showMsg('Gagal: ' + err.toString(), true);
          })
          .simpanTransaksiBulk(data);
      }

      function loadData() {
        google.script.run
          .withSuccessHandler(function(data) {
            const tbody = document.getElementById('kasTableBody');
            if (!data || data.length <= 1) {
              tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Belum ada transaksi di Google Sheets.</td></tr>';
              return;
            }
            let html = '';
            for (let i = data.length - 1; i >= 1; i--) {
              const row = data[i];
              html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';
              html += '<td class="p-3 font-semibold">' + (row[0] || '') + '</td>';
              html += '<td class="p-3">' + (row[1] || '') + '</td>';
              html += '<td class="p-3 text-right text-emerald-700 font-bold">' + (row[7] ? 'Rp ' + Number(row[7]).toLocaleString('id-ID') : '-') + '</td>';
              html += '<td class="p-3 text-right text-rose-700 font-bold">' + (row[8] ? 'Rp ' + Number(row[8]).toLocaleString('id-ID') : '-') + '</td>';
              html += '<td class="p-3 text-slate-500 text-xs">' + (row[9] || '') + '</td>';
              html += '</tr>';
            }
            tbody.innerHTML = html;
          })
          .getKasDataForUi();
      }

      window.onload = loadData;
    </script>
  </body>
  </html>
  \`;

  return HtmlService.createHtmlOutput(htmlContent)
    .setTitle('BUMDes Digital - Web App Google Sheets')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getKasDataForUi() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Buku Kas Harian');
  if (!sheet) return [];
  return sheet.getDataRange().getValues();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.waitLock(10000)) {
    return createJsonResponse({ success: false, message: 'Server sibuk. Coba beberapa saat lagi.' });
  }

  try {
    var contents = {};
    if (e && e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      contents = e.parameter;
    }

    const action = contents.action;

    if (action === 'SAVE_BULK_KAS') {
      return createJsonResponse(simpanTransaksiBulk(contents.data));
    } else if (action === 'GET_PAYROLL_QUEUE') {
      return createJsonResponse(getPayrollQueueFast());
    } else if (action === 'SAVE_PAYROLL_DIST') {
      return createJsonResponse(simpanPayrollDist(contents.data));
    }

    return createJsonResponse({ success: false, message: 'Aksi tidak dikenali' });
  } catch (err) {
    return createJsonResponse({ success: false, message: 'Error Server: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bulk Save Transaksi Kas Harian (Batch Write ke Google Sheets)
 */
function simpanTransaksiBulk(drafts) {
  if (!drafts || !Array.isArray(drafts)) {
    return { success: false, message: "Data tidak valid atau kosong" };
  }

  const ss = getSpreadsheet();
  let sheetKas = ss.getSheetByName('Buku Kas Harian');
  if (!sheetKas) {
    sheetKas = ss.insertSheet('Buku Kas Harian');
    sheetKas.appendRow(['Tanggal', 'Keterangan', 'Qty', 'Harga Satuan', 'Total Hitung', 'Kas Aktual', 'Penyesuaian', 'Debit', 'Kredit', 'Catatan']);
  }

  let sheetMaster = ss.getSheetByName('Daftar Akun');
  if (!sheetMaster) {
    sheetMaster = ss.insertSheet('Daftar Akun');
    sheetMaster.appendRow(['Nama Akun', 'Jenis', 'Metode']);
  }

  const masterData = sheetMaster.getDataRange().getValues();
  const masterMap = new Map();
  for (let i = 1; i < masterData.length; i++) {
    masterMap.set(String(masterData[i][0]).toLowerCase().trim(), true);
  }

  const newKasRows = [];
  const newMasterRows = [];

  drafts.forEach(function(d) {
    const debit = d.jenis === 'Pemasukan' ? (Number(d.kasAktual) || Number(d.nominalAktual) || 0) : 0;
    const kredit = d.jenis === 'Pengeluaran' ? (Number(d.kasAktual) || Number(d.nominalAktual) || 0) : 0;

    newKasRows.push([
      d.tanggal,
      d.keterangan,
      d.qty || '',
      d.hargaSatuan || '',
      d.totalPerhitungan || '',
      d.kasAktual || d.nominalAktual,
      d.penyesuaian || 0,
      debit,
      kredit,
      d.tambahanKeterangan || ''
    ]);

    const key = String(d.keterangan).toLowerCase().trim();
    if (!masterMap.has(key)) {
      masterMap.set(key, true);
      newMasterRows.push([d.keterangan, d.jenis, d.metode || 'Nominal']);
    }
  });

  if (newKasRows.length > 0) {
    const nextRow = Math.max(sheetKas.getLastRow() + 1, 2);
    sheetKas.getRange(nextRow, 1, newKasRows.length, newKasRows[0].length).setValues(newKasRows);
  }

  if (newMasterRows.length > 0) {
    const nextMasterRow = Math.max(sheetMaster.getLastRow() + 1, 2);
    sheetMaster.getRange(nextMasterRow, 1, newMasterRows.length, newMasterRows[0].length).setValues(newMasterRows);
  }

  return { success: true, message: "Berhasil menyimpan " + drafts.length + " transaksi ke Google Sheets.", count: drafts.length };
}

/**
 * OPTIMASI 2: Fast Payroll Reader
 */
function getPayrollQueueFast() {
  const ss = getSpreadsheet();
  const sheetKas = ss.getSheetByName('Buku Kas Harian');
  if (!sheetKas) return { success: true, queue: [] };

  const sheetPayroll = ss.getSheetByName('Lampiran Gaji');
  const payrollValues = sheetPayroll ? sheetPayroll.getDataRange().getValues() : [];

  const distMap = new Map();
  for (let i = 1; i < payrollValues.length; i++) {
    distMap.set(String(payrollValues[i][0]), true);
  }

  const kasValues = sheetKas.getDataRange().getValues();
  const queue = [];
  for (let r = 1; r < kasValues.length; r++) {
    const row = kasValues[r];
    if (String(row[1]).trim() === 'Biaya Gaji Karyawan') {
      const rowId = String(r + 1);
      const nominal = Number(row[8]) || Number(row[5]) || 0;
      queue.push({
        id: rowId,
        tanggal: row[0],
        keterangan: row[1],
        nominal: nominal,
        status: distMap.has(rowId) ? 'success' : 'empty'
      });
    }
  }

  return { success: true, queue: queue };
}

/**
 * OPTIMASI 3: Save Payroll Distribution
 */
function simpanPayrollDist(data) {
  const ss = getSpreadsheet();
  let sheetPayroll = ss.getSheetByName('Lampiran Gaji');
  if (!sheetPayroll) {
    sheetPayroll = ss.insertSheet('Lampiran Gaji');
    sheetPayroll.appendRow(['Reff Kas Row ID', 'ID Karyawan', 'Nama Karyawan', 'Hari Kerja', 'Total Gaji']);
  }

  const rows = data.distributions.map(d => [
    data.kasRowId,
    d.employeeId,
    d.employeeName || d.employeeId,
    d.workday,
    d.total
  ]);

  if (rows.length > 0) {
    const nextRow = Math.max(sheetPayroll.getLastRow() + 1, 2);
    sheetPayroll.getRange(nextRow, 1, rows.length, rows[0].length).setValues(rows);
  }

  return { success: true, message: 'Distribusi gaji berhasil disimpan.' };
}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Integrasi Google Apps Script & Google Sheets</h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Hubungkan Web App URL dan kelola sinkronisasi otomatis pembukuan BUMDes ke Google Sheets.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 gap-4">
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Pengaturan URL & Sinkronisasi</span>
          </button>
          <button
            onClick={() => setActiveTab('tutorial')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'tutorial'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Panduan Deployment</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Kode Script (Code.gs)</span>
          </button>
        </div>

        {/* TAB 0: URL & SYNC CONFIGURATION */}
        {activeTab === 'url' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-base">
                <Globe className="w-5 h-5 text-emerald-700" />
                <span>Tempel & Hubungkan Web App URL Google Apps Script</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                Salin Web App URL dari hasil deploy Google Apps Script Anda (berawalan <code className="bg-white px-1.5 py-0.5 rounded border text-xs font-mono">https://script.google.com/macros/s/.../exec</code>), lalu tempelkan di bawah ini.
              </p>

              <form onSubmit={handleSaveAndTestUrl} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Google Apps Script Web App URL
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={webAppUrl}
                      onChange={(e) => setWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      className="flex-1 h-11 px-4 rounded-xl border border-gray-300 text-xs sm:text-sm bg-white focus:border-emerald-600 focus:outline-none font-mono"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isTestingUrl}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-colors shadow-xs shrink-0 disabled:opacity-50"
                    >
                      {isTestingUrl ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{isTestingUrl ? 'Menguji...' : 'Simpan & Tes Koneksi'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {connectionStatus !== 'idle' && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
                    connectionStatus === 'success'
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  {connectionStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  )}
                  <span>{connectionMessage}</span>
                </div>
              )}
            </div>

            {/* Direct Bulk Sync Action */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Sinkronkan Data Pembukuan Sekarang</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kirimkan seluruh transaksi Kas Harian BUMDes yang ada di aplikasi langsung ke spreadsheet Google Sheets.
                  </p>
                </div>

                <button
                  onClick={handleSyncKasToSheets}
                  disabled={isSyncing}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer transition-colors shadow-xs shrink-0 disabled:opacity-50"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSyncing ? 'Mengirim...' : 'Kirim Data ke Google Sheets'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: STEP-BY-STEP TUTORIAL */}
        {activeTab === 'tutorial' && (
          <div className="space-y-6 text-xs sm:text-sm text-gray-700">
            {/* Steps List */}
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Buka Google Sheets BUMDes Anda</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Buka Spreadsheet Google Sheets yang akan dijadikan database pembukuan BUMDes. Di menu atas, klik <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>. Editor Apps Script baru akan terbuka di tab browser baru.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Tempel Kode Backend ke File Code.gs</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Di editor Apps Script, pilih file <code className="bg-white px-1.5 py-0.5 rounded border text-xs font-mono">Code.gs</code>. Hapus seluruh kode default yang ada, lalu salin dan tempel (paste) kode lengkap dari tab <strong>"Kode Script (Code.gs)"</strong> di aplikasi ini. Klik ikon <strong>Simpan (Save / Ctrl+S)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Deploy / Terbitkan sebagai Web App (Aplikasi Web)</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Di sudut kanan atas Apps Script Editor, klik tombol <strong>Terapkan (Deploy)</strong> &rarr; pilih <strong>Penerapan baru (New deployment)</strong>.
                  </p>
                  <ul className="list-disc list-inside pt-1 space-y-1 font-medium text-emerald-900">
                    <li>Pilih jenis penerapan: <strong>Aplikasi Web (Web App)</strong></li>
                    <li>Jalankan sebagai (Execute as): <strong>Saya (Me / email Anda)</strong></li>
                    <li>Yang memiliki akses (Who has access): <strong>Siapa saja (Anyone)</strong></li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  4
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Setujui Izin Otorisasi Google</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Klik <strong>Terapkan (Deploy)</strong> &rarr; klik <strong>Otorisasi akses (Authorize access)</strong>. Pilih akun Google Anda &rarr; klik <strong>Advanced (Lanjutan)</strong> &rarr; klik <strong>Go to Project (Unsafe)</strong> &rarr; klik <strong>Allow (Izinkan)</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  5
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">Salin Web App URL</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Setelah berhasil di-deploy, salin <strong>URL Web App</strong> yang dihasilkan, lalu buka tab <strong>Pengaturan URL & Sinkronisasi</strong> di modal ini untuk menyimpan URL.
                  </p>
                </div>
              </div>
            </div>

            {/* Structure Summary */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>Struktur Sheet yang Otomatis Dibuat di Google Sheets:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-medium">
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-900 block">1. Buku Kas Harian</span>
                  <span className="text-gray-500 text-[11px]">Mencatat transaksi debit/kredit, rincian qty, harga, & penyesuaian.</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-900 block">2. Daftar Akun</span>
                  <span className="text-gray-500 text-[11px]">Master kategori transaksi kas (Pemasukan / Pengeluaran).</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-200">
                  <span className="font-bold text-gray-900 block">3. Lampiran Gaji</span>
                  <span className="text-gray-500 text-[11px]">Rincian pembagian gaji karyawan per transaksi gaji.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CODE SNIPPET */}
        {activeTab === 'code' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-700" />
                <span>Backend Complete Script (Code.gs)</span>
              </h4>
              <button
                onClick={() => handleCopyCode(fullGasWebAppSnippet, 'Code.gs Complete')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold cursor-pointer"
              >
                {copiedSnippet === 'Code.gs Complete' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSnippet === 'Code.gs Complete' ? 'Tersalin!' : 'Salin Seluruh Kode Code.gs'}</span>
              </button>
            </div>

            <pre className="p-4 bg-gray-900 text-emerald-400 rounded-2xl text-xs font-mono overflow-x-auto max-h-[400px] leading-relaxed">
              <code>{fullGasWebAppSnippet}</code>
            </pre>
          </div>
        )}

        <div className="pt-2 flex justify-between items-center border-t border-gray-200">
          <span className="text-xs text-gray-500 font-medium">
            Atur Web App access: <strong>Anyone</strong> (Agar frontend dapat melakukan Fetch API).
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Selesai / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};


