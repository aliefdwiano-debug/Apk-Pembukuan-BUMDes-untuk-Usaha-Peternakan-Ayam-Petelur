import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuthListener, getCachedAccessToken } from '../lib/googleAuth';
import {
  getLinkedSpreadsheetInfo,
  syncAllDataToGoogleSheets,
  pullAllDataFromGoogleSheets,
  SpreadsheetInfo
} from '../lib/googleSheetsService';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Settings,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';

interface Props {
  onOpenSyncModal: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export const GoogleSheetsSyncBar: React.FC<Props> = ({
  onOpenSyncModal,
  showMessage
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getCachedAccessToken());
  const [sheet, setSheet] = useState<SpreadsheetInfo | null>(getLinkedSpreadsheetInfo());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = initAuthListener(
      (u, t) => {
        setUser(u);
        setToken(t);
        setSheet(getLinkedSpreadsheetInfo());
      },
      () => {
        setUser(null);
        setToken(null);
        setSheet(getLinkedSpreadsheetInfo());
      }
    );

    // Also check periodic storage sync
    const interval = setInterval(() => {
      setSheet(getLinkedSpreadsheetInfo());
    }, 2000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleQuickPull = async () => {
    const activeToken = token || getCachedAccessToken();
    if (!activeToken || !user) {
      onOpenSyncModal();
      return;
    }
    if (!sheet) {
      onOpenSyncModal();
      return;
    }

    setSyncing(true);
    try {
      const res = await pullAllDataFromGoogleSheets(activeToken, sheet.spreadsheetId);
      showMessage(res.message, 'success');
      window.location.reload(); // Reload to refresh all tabs state
    } catch (err: any) {
      showMessage(err.message || 'Gagal menarik data dari Google Sheets', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickSync = async () => {
    const activeToken = token || getCachedAccessToken();
    if (!activeToken || !user) {
      onOpenSyncModal();
      return;
    }
    if (!sheet) {
      onOpenSyncModal();
      return;
    }

    setSyncing(true);
    try {
      const res = await syncAllDataToGoogleSheets(activeToken, sheet.spreadsheetId);
      showMessage(res.message, 'success');
    } catch (err: any) {
      showMessage(err.message || 'Gagal sinkronisasi ke Google Sheets', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full bg-emerald-900 text-white border-b border-emerald-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {sheet ? (
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-200">Terhubung ke Google Sheets:</span>
            <span className="font-bold text-white truncate max-w-xs sm:max-w-md">
              {sheet.title}
            </span>
            <a
              href={sheet.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 hover:bg-emerald-800 rounded-md text-emerald-300 hover:text-white transition-colors"
              title="Buka Spreadsheet di Tab Baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-medium text-emerald-100">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Integrasikan data pembukuan ini langsung ke Google Sheets (Google Drive Anda)</span>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {sheet ? (
            <>
              <button
                onClick={handleQuickPull}
                disabled={syncing}
                className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 hover:text-white font-bold rounded-lg border border-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                title="Tarik & perbarui data dari Google Sheets jika Anda mengeditnya langsung di Google Sheets"
              >
                <Download className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                <span>{syncing ? 'Memuat...' : 'Tarik dari Sheets'}</span>
              </button>

              <button
                onClick={handleQuickSync}
                disabled={syncing}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                title="Kirim perubahan transaksi terbaru dari aplikasi ke Google Sheets"
              >
                <Upload className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
                <span>{syncing ? 'Mengirim...' : 'Kirim ke Sheets'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenSyncModal}
              className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 hover:text-white font-bold rounded-lg border border-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Hubungkan Google Sheets</span>
            </button>
          )}

          <button
            onClick={onOpenSyncModal}
            className="p-1 hover:bg-emerald-800 text-emerald-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Pengaturan Integrasi Google Sheets"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
