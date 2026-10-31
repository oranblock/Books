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
    <header className="sticky top-0 z-40 bg-[#0d1516]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className="flex items-center gap-2 sm:gap-2.5 text-right group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#00898F]/20 border border-[#00898F]/30 flex items-center justify-center text-[#00b4bc] group-hover:bg-[#00898F]/30 transition-colors shrink-0">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-white whitespace-nowrap group-hover:text-[#00b4bc] transition-colors font-['Noto_Naskh_Arabic'] block">
                مكتبة أهل البيت (ع)
              </span>
              <span className="hidden sm:inline-block text-[10px] sm:text-[11px] text-slate-400 font-normal">
                النسخة المحلية المستقلة
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 text-xs lg:text-sm font-medium">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`whitespace-nowrap shrink-0 py-1.5 px-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-white bg-white/10 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            المكتبة الشاملة
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`whitespace-nowrap shrink-0 py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'offline'
                ? 'text-[#34d399] bg-[#10b981]/15 font-semibold'
                : 'text-slate-400 hover:text-[#34d399] hover:bg-white/5'
            }`}
          >
            <span>المحمّلة محلياً</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">({offlineCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`whitespace-nowrap shrink-0 py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'text-amber-300 bg-amber-500/15 font-semibold'
                : 'text-slate-400 hover:text-amber-300 hover:bg-white/5'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>الإشارات والملاحظات</span>
            {bookmarkCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums opacity-80 bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full">
                {bookmarkCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenAbout}
            className="text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 py-1.5 px-2.5 flex items-center gap-1 text-xs rounded-lg hover:bg-white/5 cursor-pointer"
            title="حول محرك المكتبة وخصائص الاستيراد"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>حول المحرك</span>
          </button>
        </nav>

        {/* Zone 3: Actions (Responsive for Mobile and Desktop) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Quick Bookmarks Button */}
          <button
            onClick={() => setActiveTab('bookmarks')}
            className="md:hidden relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="الإشارات والملاحظات"
            aria-label="الإشارات والملاحظات"
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            {bookmarkCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {bookmarkCount}
              </span>
            )}
          </button>

          {/* Mobile Quick About Button */}
          <button
            onClick={onOpenAbout}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="حول المحرك"
            aria-label="حول المحرك"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Primary Action: Import Book */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">استيراد كتاب</span>
            <span className="sm:hidden text-xs">استيراد</span>
          </button>
        </div>
      </div>
    </header>
  );
};
