import React from 'react';
import { Building2, Settings, Database } from 'lucide-react';

interface HeaderProps {
  namaBumdes: string;
  unitUsaha: string;
  onOpenDatabaseSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  namaBumdes,
  unitUsaha,
  onOpenDatabaseSync
}) => {
  return (
    <header className="w-full bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center md:text-left">
          <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0 relative">
            <Building2 className="w-6 h-6 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-950 border-2 border-white rounded-full p-1 shadow-2xs">
              <Settings className="w-3 h-3 text-emerald-300" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight">
              {namaBumdes || 'Sistem Pembukuan BUMDes'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Pencatatan Keuangan, Gaji & Persediaan Digital
              {unitUsaha && <span className="hidden sm:inline"> • {unitUsaha}</span>}
            </p>
          </div>
        </div>

        {/* Action Button Container */}
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-center md:justify-end">
          <button
            onClick={onOpenDatabaseSync}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            title="Kelola & Sinkronkan Data ke Database Supabase / PostgreSQL"
          >
            <Database className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Database Supabase</span>
          </button>
        </div>
      </div>
    </header>
  );
};
