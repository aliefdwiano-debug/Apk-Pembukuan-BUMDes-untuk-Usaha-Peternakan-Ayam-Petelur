import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  RefreshCw,
  Upload,
  Download,
  Server
} from 'lucide-react';
import {
  pullFromDatabase,
  pushToDatabase,
  checkDatabaseHealth,
  getIsSyncing,
  getIsPulling,
  getLastSyncTime
} from '../lib/databaseService';

interface Props {
  onOpenSyncModal: () => void;
  showMessage: (text: string, type: 'success' | 'error') => void;
  onDataRefreshed?: () => void;
}

export const DatabaseSyncBar: React.FC<Props> = ({
  onOpenSyncModal,
  showMessage,
  onDataRefreshed
}) => {
  const [connected, setConnected] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime());

  useEffect(() => {
    checkDatabaseHealth().then((res) => {
      setConnected(res.connected);
    });

    const interval = setInterval(() => {
      setLastSync(getLastSyncTime());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleQuickPull = async () => {
    setSyncing(true);
    try {
      const res = await pullFromDatabase();
      if (res.success) {
        showMessage('Data terbaru berhasil disinkronkan dari PostgreSQL!', 'success');
        if (onDataRefreshed) onDataRefreshed();
      } else {
        showMessage(res.message, 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Gagal menarik data', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickPush = async () => {
    setSyncing(true);
    try {
      const res = await pushToDatabase();
      if (res.success) {
        showMessage('Semua data berhasil disimpan ke PostgreSQL!', 'success');
        if (onDataRefreshed) onDataRefreshed();
      } else {
        showMessage(res.message, 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Gagal menyimpan data', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white px-4 py-2 text-xs font-medium shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-400/20">
            <span className="relative flex h-2 w-2">
              {connected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
              )}
            </span>
            <Database className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-bold text-white tracking-wide">
              PostgreSQL Relational DB
            </span>
          </div>

          <span className="hidden sm:inline text-emerald-200/80">
            • Auto-sync tersambung (asia-southeast1)
          </span>

          {lastSync && (
            <span className="hidden md:inline text-emerald-300/90 text-[11px] font-mono">
              [Update: {lastSync}]
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleQuickPull}
            disabled={syncing}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white transition-all cursor-pointer font-semibold shadow-2xs"
            title="Tarik data terbaru dari server PostgreSQL"
          >
            <Download className={`w-3 h-3 ${syncing ? 'animate-bounce' : ''}`} />
            <span>Tarik DB</span>
          </button>

          <button
            onClick={handleQuickPush}
            disabled={syncing}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-emerald-100 hover:text-white transition-all cursor-pointer font-semibold shadow-2xs"
            title="Kirim dan simpan data lokal ke server PostgreSQL"
          >
            <Upload className={`w-3 h-3 ${syncing ? 'animate-bounce' : ''}`} />
            <span>Simpan DB</span>
          </button>

          <button
            onClick={onOpenSyncModal}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-all cursor-pointer font-bold shadow-xs"
          >
            <Server className="w-3 h-3" />
            <span>Kelola Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
