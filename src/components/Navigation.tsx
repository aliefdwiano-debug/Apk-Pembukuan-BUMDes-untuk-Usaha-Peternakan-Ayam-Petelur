import React from 'react';
import {
  UserCheck,
  BookOpen,
  Users,
  Boxes,
  Printer
} from 'lucide-react';

export type ActiveTab = 'profil' | 'kas' | 'gaji' | 'produksi' | 'laporan';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  draftCount?: number;
  payrollPendingCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  draftCount = 0,
  payrollPendingCount = 0
}) => {
  const navRef = React.useRef<HTMLDivElement>(null);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'profil', label: 'Profil BUMDes', icon: UserCheck },
    { id: 'kas', label: 'Buku Kas Harian', icon: BookOpen, badge: draftCount },
    { id: 'gaji', label: 'Gaji Karyawan', icon: Users, badge: payrollPendingCount },
    { id: 'produksi', label: 'Persediaan & Produksi', icon: Boxes },
    { id: 'laporan', label: 'Cetak Laporan', icon: Printer }
  ];

  React.useEffect(() => {
    if (navRef.current) {
      const activeEl = navRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  return (
    <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div ref={navRef} className="flex overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-active={isActive ? "true" : "false"}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 min-w-[120px] sm:min-w-0 py-3.5 px-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
