import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DatabaseSyncBar } from './components/DatabaseSyncBar';
import { DatabaseSyncModal } from './components/DatabaseSyncModal';
import { Navigation, ActiveTab } from './components/Navigation';
import { ProfilModule } from './components/ProfilModule';
import { BukuKasModule } from './components/BukuKasModule';
import { PayrollModule } from './components/PayrollModule';
import { ProduksiModule } from './components/ProduksiModule';
import { ReportModule } from './components/ReportModule';
import {
  getStoredProfil,
  getStoredDraftKas,
  getPayrollQueueList
} from './lib/storage';
import { pullFromDatabase } from './lib/databaseService';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

const TAB_ORDER: ActiveTab[] = ['profil', 'kas', 'gaji', 'produksi', 'laporan'];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('kas');
  const [profil, setProfil] = useState(getStoredProfil());
  const [draftCount, setDraftCount] = useState(0);
  const [payrollPendingCount, setPayrollPendingCount] = useState(0);

  // Database Modal
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    refreshCounters();

    const handleDataUpdated = () => {
      refreshCounters();
    };
    window.addEventListener('bumdes_data_updated', handleDataUpdated);

    // 1. Initial pull from Database on application launch
    pullFromDatabase()
      .then((res) => {
        if (res.success) {
          refreshCounters();
        }
      })
      .catch((e) => console.warn('Auto pull on launch failed:', e));

    // 2. Periodic sync polling / health check (every 60s)
    const pollInterval = setInterval(() => {
      pullFromDatabase()
        .then(() => refreshCounters())
        .catch(() => {});
    }, 60000);

    // Auto-pull on tab focus / visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pullFromDatabase()
          .then(() => refreshCounters())
          .catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('bumdes_data_updated', handleDataUpdated);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, []);

  const refreshCounters = () => {
    setProfil(getStoredProfil());
    setDraftCount(getStoredDraftKas().length);

    const queue = getPayrollQueueList();
    const pending = queue.filter((q) => q.status === 'empty').length;
    setPayrollPendingCount(pending);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-800'
                : 'bg-rose-900 text-white border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:bg-white/10 rounded-full cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      )}

      {/* Database Realtime Sync Status Bar */}
      <DatabaseSyncBar
        onOpenSyncModal={() => setIsDbModalOpen(true)}
        showMessage={showMessage}
        onDataRefreshed={refreshCounters}
      />

      {/* Main App Header */}
      <Header
        namaBumdes={profil.namaBumdes}
        unitUsaha={profil.unitUsaha}
        onOpenDatabaseSync={() => setIsDbModalOpen(true)}
      />

      {/* Main App Tab Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        draftCount={draftCount}
        payrollPendingCount={payrollPendingCount}
      />

      {/* App Body Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'profil' && (
          <ProfilModule
            onProfilUpdated={refreshCounters}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'kas' && (
          <BukuKasModule
            onDraftCountChange={(c) => {
              setDraftCount(c);
              refreshCounters();
            }}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'gaji' && (
          <PayrollModule
            onPayrollUpdated={refreshCounters}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'produksi' && (
          <ProduksiModule
            onInventoryUpdated={refreshCounters}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'laporan' && (
          <ReportModule showMessage={showMessage} />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500 font-medium print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          Aplikasi Pembukuan Digital BUMDes • Terkoneksi ke Backend Supabase / PostgreSQL
        </div>
      </footer>

      {/* Database Management & Synchronization Modal */}
      <DatabaseSyncModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        showMessage={showMessage}
        onSyncCompleted={refreshCounters}
      />
    </div>
  );
}
