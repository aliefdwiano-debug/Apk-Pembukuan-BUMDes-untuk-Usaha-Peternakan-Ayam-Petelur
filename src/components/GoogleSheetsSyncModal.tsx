import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithGoogleRedirect,
  logoutGoogle,
  initAuthListener,
  getCachedAccessToken
} from '../lib/googleAuth';
import {
  getLinkedSpreadsheetInfo,
  saveLinkedSpreadsheetInfo,
  createBumdesSpreadsheet,
  getSpreadsheetDetails,
  syncAllDataToGoogleSheets,
  pullAllDataFromGoogleSheets,
  readKasDataFromSheets,
  getStoredAppsScriptUrl,
  saveAppsScriptUrl,
  pullDataViaAppsScript,
  pushDataViaAppsScript,
  SpreadsheetInfo,
  DEFAULT_APPS_SCRIPT_URL
} from '../lib/googleSheetsService';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Link,
  RefreshCw,
  LogOut,
  X,
  Sparkles,
  ShieldCheck,
  Database,
  Download,
  Upload
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
  onSyncCompleted?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<Props> = ({
  isOpen,
  onClose,
  showMessage,
  onSyncCompleted
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getCachedAccessToken());
  const [linkedSheet, setLinkedSheet] = useState<SpreadsheetInfo | null>(getLinkedSpreadsheetInfo());

  const [inputUrl, setInputUrl] = useState('');
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState(getStoredAppsScriptUrl());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = initAuthListener(
      async (u, t) => {
        setUser(u);
        setToken(t);

        const autoPulledKey = `bumdes_modal_autopull_${u.uid}_v1`;
        if (!sessionStorage.getItem(autoPulledKey)) {
          sessionStorage.setItem(autoPulledKey, 'true');
          setSyncing(true);
          try {
            const sheetInfo = getLinkedSpreadsheetInfo();
            await pullAllDataFromGoogleSheets(t, sheetInfo.spreadsheetId);
            showMessage('Data otomatis ditarik dari Google Sheet Utama BUMDes!', 'success');
            if (onSyncCompleted) onSyncCompleted();
          } catch (err) {
            console.warn('Auto pull on modal init failed:', err);
          } finally {
            setSyncing(false);
          }
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return trimmed;
  };

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogle();
      if (res && res.user) {
        setUser(res.user);
        setToken(res.accessToken);

        // Auto pull data from main Google Sheet on login
        setSyncing(true);
        try {
          const sheetInfo = getLinkedSpreadsheetInfo();
          await pullAllDataFromGoogleSheets(res.accessToken, sheetInfo.spreadsheetId);
          showMessage(`Berhasil Sign In! Data BUMDes otomatis ditarik dari Sheet Utama.`, 'success');
          if (onSyncCompleted) onSyncCompleted();
        } catch (pErr: any) {
          console.warn('Auto pull error after login:', pErr);
          showMessage(`Berhasil login sebagai ${res.user.email}`, 'success');
        } finally {
          setSyncing(false);
        }
      }
    } catch (err: any) {
      console.warn('Sign in popup error:', err);
      const msg = err?.message || '';
      if (msg.includes('closing') || msg.includes('hidden') || err?.code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up terhambat oleh browser HP. Mencoba login otomatis dengan Redirect...');
        try {
          await signInWithGoogleRedirect();
        } catch (rErr) {
          setErrorMsg('Gagal login via Redirect.');
        }
      } else {
        setErrorMsg(err.message || 'Gagal login Google.');
        showMessage('Gagal login dengan Google', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignInRedirect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogleRedirect();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal login via Redirect.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      showMessage('Anda telah keluar dari akun Google', 'success');
    } catch (err: any) {
      showMessage('Gagal logout', 'error');
    }
  };

  const handleCreateNewSheet = async () => {
    const activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      setErrorMsg('Silakan login dengan akun Google Anda terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const info = await createBumdesSpreadsheet(activeToken);
      setLinkedSheet(info);
      showMessage(`Google Sheet "${info.title}" berhasil dibuat!`, 'success');

      // Auto sync initial data
      setSyncing(true);
      await syncAllDataToGoogleSheets(activeToken, info.spreadsheetId);
      showMessage('Data BUMDes awal berhasil disinkronkan ke Google Sheets!', 'success');
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Sheet baru.');
      showMessage('Terjadi kesalahan saat membuat Google Sheet', 'error');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      setErrorMsg('Silakan login dengan akun Google Anda terlebih dahulu.');
      return;
    }

    const sheetId = extractSpreadsheetId(inputUrl);
    if (!sheetId) {
      setErrorMsg('Masukkan URL atau ID Google Spreadsheet yang valid.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const info = await getSpreadsheetDetails(activeToken, sheetId);
      setLinkedSheet(info);
      showMessage(`Terhubung ke Google Sheet: "${info.title}"`, 'success');
      setInputUrl('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal terhubung ke Spreadsheet. Pastikan ID valid dan spreadsheet dapat diakses akun Google Anda.');
      showMessage('Gagal terhubung ke Google Sheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    const activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      setErrorMsg('Silakan login dengan akun Google Anda.');
      return;
    }
    if (!linkedSheet) {
      setErrorMsg('Belum ada Google Sheet yang terhubung.');
      return;
    }

    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await syncAllDataToGoogleSheets(activeToken, linkedSheet.spreadsheetId);
      showMessage(res.message, 'success');
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyinkronkan data.');
      showMessage('Gagal sinkronisasi data ke Google Sheets', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handlePullNow = async () => {
    const activeToken = token || getCachedAccessToken();
    if (!activeToken) {
      setErrorMsg('Silakan login dengan akun Google Anda.');
      return;
    }
    if (!linkedSheet) {
      setErrorMsg('Belum ada Google Sheet yang terhubung.');
      return;
    }

    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await pullAllDataFromGoogleSheets(activeToken, linkedSheet.spreadsheetId);
      showMessage(res.message, 'success');
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menarik data dari Google Sheets.');
      showMessage('Gagal mengambil data dari Google Sheets', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handlePullAppsScript = async () => {
    if (!appsScriptUrlInput.trim()) {
      setErrorMsg('Masukkan URL Apps Script Web App terlebih dahulu.');
      return;
    }
    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await pullDataViaAppsScript(appsScriptUrlInput);
      showMessage(res.message, 'success');
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menarik data via Web App.');
      showMessage('Gagal menarik data via Web App', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handlePushAppsScript = async () => {
    if (!appsScriptUrlInput.trim()) {
      setErrorMsg('Masukkan URL Apps Script Web App terlebih dahulu.');
      return;
    }
    setSyncing(true);
    setErrorMsg(null);
    try {
      const res = await pushDataViaAppsScript(appsScriptUrlInput);
      showMessage(res.message, 'success');
      if (onSyncCompleted) onSyncCompleted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengirim data via Web App.');
      showMessage('Gagal mengirim data via Web App', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    saveLinkedSpreadsheetInfo(null);
    setLinkedSheet(null);
    showMessage('Google Spreadsheet telah dilepas dari aplikasi', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-6 overflow-hidden">
      <div className="bg-white w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-900 text-white p-4 sm:p-6 flex items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold tracking-tight leading-snug">
                Integrasi Langsung Google Sheets
              </h3>
              <p className="text-emerald-200 text-[11px] sm:text-xs mt-0.5 line-clamp-2 sm:line-clamp-none">
                Simpan & baca data pembukuan BUMDes secara real-time dari Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition-colors cursor-pointer shrink-0 -mr-1 -mt-1 sm:mr-0 sm:mt-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Main Sheet Auto-Link Info Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Spreadsheet Utama BUMDes Terhubung Otomatis</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              Sistem telah mengonfigurasi <strong>Google Sheet Utama BUMDes</strong> secara otomatis. Cukup <strong>Sign In with Google</strong> di HP atau perangkat manapun, dan seluruh data pembukuan akan <strong>otomatis ditarik &amp; disinkronkan</strong> tanpa perlu salin link atau tekan tombol manual.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Google Account Status */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 w-full sm:w-auto">
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">
                Akun Google
              </div>
              {user ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="font-bold text-slate-900 text-xs sm:text-base truncate break-all">
                    {user.email}
                  </span>
                </div>
              ) : (
                <div className="text-slate-600 text-xs sm:text-sm font-medium">
                  Belum terhubung ke Akun Google
                </div>
              )}
            </div>

            {user ? (
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-rose-700 bg-white border border-slate-300 hover:border-rose-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>Ganti / Logout</span>
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-800 shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{loading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
                </button>
                <button
                  onClick={handleSignInRedirect}
                  disabled={loading}
                  title="Gunakan ini jika browser HP memblokir pop-up"
                  className="w-full sm:w-auto px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>Login Redirect (Bagi HP)</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: Connected Spreadsheet Info */}
          {linkedSheet ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3.5">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-800 text-white uppercase tracking-wider mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Spreadsheet Aktif Terhubung
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug break-words">
                    {linkedSheet.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 break-all">
                    ID: <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono break-all">{linkedSheet.spreadsheetId}</code>
                  </p>
                </div>
                <a
                  href={linkedSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                >
                  <span>Buka di Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <div className="pt-3 border-t border-emerald-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handlePullNow}
                    disabled={syncing || loading}
                    className="w-full py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 shrink-0 ${syncing ? 'animate-bounce' : ''}`} />
                    <span className="text-center">{syncing ? 'Membaca Sheets...' : '1-Klik Tarik Data dari Google Sheets'}</span>
                  </button>

                  <button
                    onClick={handleSyncNow}
                    disabled={syncing || loading}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className={`w-4 h-4 shrink-0 ${syncing ? 'animate-bounce' : ''}`} />
                    <span className="text-center">{syncing ? 'Mengirim Data...' : 'Kirim Data Aplikasi ke Google Sheets'}</span>
                  </button>
                </div>

                {/* Share Link for team / new users */}
                <div className="p-3 bg-emerald-100/70 rounded-xl border border-emerald-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="text-xs text-emerald-950 min-w-0">
                    <span className="font-bold block">🔗 Ingin Bagikan Akses ke Pengurus / User Baru?</span>
                    <span className="text-[11px] text-emerald-800 block mt-0.5">
                      Bagikan Link Sheet ini ke user baru & berikan izin &quot;Editor&quot; di Google Sheets.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(linkedSheet.spreadsheetUrl);
                      showMessage('URL Google Sheet berhasil disalin! Kirimkan ke user baru.', 'success');
                    }}
                    className="w-full sm:w-auto px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Link className="w-3.5 h-3.5 shrink-0" />
                    <span>Salin Link Sheet</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-slate-600 font-medium leading-normal">
                    💡 <strong>Tips Edit Manual:</strong> Jika Anda mengubah angka/transaksi langsung di Google Sheets, klik <em>"1-Klik Tarik Data"</em> untuk memperbarui aplikasi.
                  </p>

                  <button
                    onClick={handleDisconnect}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline shrink-0 cursor-pointer self-end sm:self-auto"
                  >
                    Putuskan Spreadsheet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Option A: Create New Spreadsheet */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm mb-2">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Otomatis Buat Spreadsheet Baru
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Aplikasi akan otomatis membuat Google Spreadsheet baru lengkap dengan worksheet BUMDes di Google Drive Anda.
                    </p>
                  </div>

                  <button
                    onClick={handleCreateNewSheet}
                    disabled={loading || syncing}
                    className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{loading ? 'Membuat Spreadsheet...' : 'Buat Google Sheet Otomatis'}</span>
                  </button>
                </div>

                {/* Option B: Connect Existing Spreadsheet */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm mb-2">
                      <Link className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Hubungkan Spreadsheet Yang Ada
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Tempel URL atau Spreadsheet ID dari Google Sheets yang sudah Anda miliki di Google Drive.
                    </p>
                  </div>

                  <form onSubmit={handleConnectExisting} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Tempel URL Google Sheets di sini..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                    <button
                      type="submit"
                      disabled={loading || !inputUrl.trim()}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Menghubungkan...' : 'Hubungkan Spreadsheet'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Additional Features info */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Aman & Terintegrasi Langsung via Google OAuth</span>
            </div>
            <p className="text-blue-800 text-[11px] sm:text-xs leading-relaxed">
              Seluruh transaksi kas harian, data karyawan, persediaan barang, dan laporan keuangan yang Anda input di aplikasi ini dapat disinkronkan secara otomatis atau 1-klik langsung ke Google Spreadsheet milik akun Google Anda tanpa server perantara!
            </p>
          </div>

          {/* Apps Script Guide Accordion */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Alternatif Bebas Login: Google Apps Script (Web App)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold text-[10px]">
                Solusi Tanpa Login
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Jika Anda ingin aplikasi ini dapat digunakan oleh siapapun di HP tanpa perlu sign in akun Google sama sekali, pasang script otomatis di Google Sheets Anda:
            </p>

            <ol className="list-decimal list-inside text-xs space-y-1.5 text-amber-950 font-medium pl-1">
              <li>Buka <a href="https://docs.google.com/spreadsheets/d/1Z6KoH_WhzerJFGiAWqdmJ5zoM-3N2097PO3HT2ewIaM/edit?gid=0#gid=0" target="_blank" rel="noreferrer" className="underline font-bold text-amber-900">Google Sheet Utama Peternakan &amp; Olahan</a> di Laptop/PC.</li>
              <li>Klik menu <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>.</li>
              <li>Hapus semua kode di sana, lalu <strong>Copy &amp; Paste</strong> kode berikut:</li>
            </ol>

            <div className="relative bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  const code = `function doGet(e) {\n  var ss = SpreadsheetApp.getActiveSpreadsheet();\n  var result = {};\n  var sheets = ss.getSheets();\n  for (var i = 0; i < sheets.length; i++) {\n    result[sheets[i].getName()] = sheets[i].getDataRange().getValues();\n  }\n  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);\n}\n\nfunction doPost(e) {\n  var ss = SpreadsheetApp.getActiveSpreadsheet();\n  var data = JSON.parse(e.postData.contents);\n  for (var name in data) {\n    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);\n    sheet.clearContents();\n    if (data[name] && data[name].length > 0) {\n      sheet.getRange(1, 1, data[name].length, data[name][0].length).setValues(data[name]);\n    }\n  }\n  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);\n}`;
                  navigator.clipboard.writeText(code);
                  showMessage('Kode Google Apps Script berhasil disalin!', 'success');
                }}
                className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-sans text-[10px] font-bold cursor-pointer"
              >
                Copy Script
              </button>
              <pre className="pr-16 font-mono leading-relaxed">
{`function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    result[sheets[i].getName()] = sheets[i].getDataRange().getValues();
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  for (var name in data) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clearContents();
    if (data[name] && data[name].length > 0) {
      sheet.getRange(1, 1, data[name].length, data[name][0].length).setValues(data[name]);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}`}
              </pre>
            </div>

            <ol start={4} className="list-decimal list-inside text-xs space-y-1.5 text-amber-950 font-medium pl-1">
              <li>Klik <strong>Terapkan (Deploy)</strong> &rarr; <strong>Penerapan baru (New deployment)</strong>.</li>
              <li>Pilih jenis: <strong>Aplikasi Web (Web App)</strong>.</li>
              <li>Ubah <em>Who has access (Siapa yang memiliki akses)</em> menjadi: <strong>Anyone (Siapa Saja)</strong>.</li>
              <li>Klik <strong>Terapkan (Deploy)</strong>, lalu salin &amp; tempel <strong>URL Aplikasi Web (Web App URL)</strong> di bawah ini:</li>
            </ol>

            {/* Input Web App URL */}
            <div className="pt-2 space-y-2 border-t border-amber-200/80">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold text-amber-950">
                  🔗 URL Aplikasi Web (Apps Script Web App URL) Utama:
                </label>
                {appsScriptUrlInput.trim() && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Otomasi Aktif
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={appsScriptUrlInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAppsScriptUrlInput(val);
                    saveAppsScriptUrl(val);
                  }}
                  className="w-full px-3 py-2 border border-amber-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
                {appsScriptUrlInput !== DEFAULT_APPS_SCRIPT_URL && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppsScriptUrlInput(DEFAULT_APPS_SCRIPT_URL);
                      saveAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);
                    }}
                    className="text-[10px] text-amber-800 hover:text-amber-950 underline font-semibold cursor-pointer"
                  >
                    Reset ke URL Default Utama (Hardcoded)
                  </button>
                )}
              </div>
              <p className="text-[11px] text-amber-900 leading-snug">
                ⚡ <strong>Fitur Otomatisasi Terpasang:</strong> URL Web App default telah di-hardcode secara otomatis. Aplikasi akan <strong>otomatis menarik data dari Google Sheet Utama saat pertama dibuka</strong> dan <strong>otomatis mengirim data ke Google Sheet setiap kali ada perubahan/transaksi baru</strong>!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePushAppsScript}
                  disabled={syncing || !appsScriptUrlInput.trim()}
                  className="w-full py-3 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 shrink-0 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Memproses...' : '🚀 Kirim Data & Buat Semua Sheet Sekarang'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePullAppsScript}
                  disabled={syncing || !appsScriptUrlInput.trim()}
                  className="w-full py-3 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 shrink-0 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Memproses...' : 'Tarik Data dari Google Sheet'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
