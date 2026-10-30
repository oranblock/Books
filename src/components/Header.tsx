import React from 'react';
import { BookOpen, Upload, Bookmark, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'offline' | 'bookmarks';
  setActiveTab: (tab: 'catalog' | 'offline' | 'bookmarks') => void;
  onOpenImport: () => void;
  onOpenAbout: () => void;
  offlineCount: number;
  bookmarkCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onOpenAbout,
  offlineCount,
  bookmarkCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d1516] border-b border-white/10 px-4 md:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2.5 text-right group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#00898F]/20 border border-[#00898F]/30 flex items-center justify-center text-[#00b4bc] group-hover:bg-[#00898F]/30 transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap group-hover:text-[#00b4bc] transition-colors font-['Noto_Naskh_Arabic']">
                مكتبة أهل البيت (ع)
              </span>
              <span className="hidden sm:inline-block text-[11px] text-slate-400 mr-2 font-normal">
                النسخة المحلية المستقلة
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav className="flex items-center gap-2 md:gap-6 text-xs md:text-sm font-medium">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`whitespace-nowrap shrink-0 py-1 px-2.5 rounded-md transition-colors ${
              activeTab === 'catalog'
                ? 'text-white bg-white/10 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المكتبة الشاملة
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`whitespace-nowrap shrink-0 py-1 px-2.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'offline'
                ? 'text-[#34d399] bg-[#10b981]/15 font-semibold'
                : 'text-slate-400 hover:text-[#34d399]'
            }`}
          >
            <span>المحمّلة بدون اتصال</span>
            <span className="text-[11px] font-mono tabular-nums opacity-75">({offlineCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`whitespace-nowrap shrink-0 py-1 px-2.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookmarks'
                ? 'text-amber-300 bg-amber-500/15 font-semibold'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">الإشارات والملاحظات</span>
            <span className="sm:hidden">الإشارات</span>
            {bookmarkCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums opacity-75">({bookmarkCount})</span>
            )}
          </button>

          <button
            onClick={onOpenAbout}
            className="text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 py-1 px-2 flex items-center gap-1 text-xs"
            title="حول محرك المكتبة وخصائص الاستيراد"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">حول المحرك</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs md:text-sm font-semibold text-white bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden xs:inline">استيراد كتاب (JSON / TXT)</span>
            <span className="xs:hidden">استيراد</span>
          </button>
        </div>
      </div>
    </header>
  );
};
