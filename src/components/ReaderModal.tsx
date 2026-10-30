import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Book,
  BookPage,
  ReaderTheme,
  ReaderFont,
  ReadingPreferences,
  PageBookmark,
} from '../types/library';
import {
  X,
  Search,
  BookOpen,
  List,
  Copy,
  Check,
  Bookmark,
  Download,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Settings,
  Info,
  Sparkles,
  Bot,
  Loader2,
} from 'lucide-react';
import {
  exportBookAsTxt,
  exportBookAsJson,
  stripTashkeel,
} from '../utils/parser';

interface ReaderModalProps {
  book: Book;
  onClose: () => void;
  preferences: ReadingPreferences;
  onUpdatePreferences: (prefs: ReadingPreferences) => void;
  bookmarks: PageBookmark[];
  onToggleBookmark: (bookmark: PageBookmark) => void;
  onUpdateBookmarkNote: (bookId: number, pageNumber: number, note: string) => void;
}

export const ReaderModal: React.FC<ReaderModalProps> = ({
  book,
  onClose,
  preferences,
  onUpdatePreferences,
  bookmarks,
  onToggleBookmark,
  onUpdateBookmarkNote,
}) => {
  const pages: BookPage[] = book.pages || [];
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showToc, setShowToc] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('scroll');
  const [copiedPage, setCopiedPage] = useState<number | null>(null);
  const [noteEditingPage, setNoteEditingPage] = useState<number | null>(null);
  const [noteText, setNoteText] = useState<string>('');

  // AI Page Explanation state
  const [aiExplainingPage, setAiExplainingPage] = useState<number | null>(null);
  const [aiExplanationText, setAiExplanationText] = useState<string | null>(null);
  const [isAiExplaining, setIsAiExplaining] = useState<boolean>(false);

  // Audio Speech Synthesis state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioRate, setAudioRate] = useState<number>(1.0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter pages by in-book search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const cleanQ = stripTashkeel(searchQuery.trim().toLowerCase());
    return pages.filter((p) => {
      const cleanContent = stripTashkeel(p.content.toLowerCase());
      const cleanHeading = stripTashkeel((p.heading || '').toLowerCase());
      return cleanContent.includes(cleanQ) || cleanHeading.includes(cleanQ);
    });
  }, [pages, searchQuery]);

  // Table of Contents from headings
  const tocItems = useMemo(() => {
    return pages.filter((p) => Boolean(p.heading && p.heading.trim()));
  }, [pages]);

  // Jump to specific page
  const jumpToPage = (pageNum: number) => {
    const idx = pages.findIndex((p) => p.page_number === pageNum);
    if (idx >= 0) {
      setActivePageIndex(idx);
      if (viewMode === 'scroll') {
        const el = document.getElementById(`page-${pageNum}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      setShowToc(false);
    }
  };

  const handleCopyPage = (p: BookPage) => {
    const textToCopy = `${p.heading ? p.heading + '\n\n' : ''}${p.content}\n\n[${book.title} - ص ${p.page_label}]`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPage(p.page_number);
    setTimeout(() => setCopiedPage(null), 2000);
  };

  const handleDownloadTxt = () => {
    const txt = exportBookAsTxt(book, pages);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahifa_${book.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = exportBookAsJson(book, pages);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contents_full_${book.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // AI Page Explanation with Gemini 3.8 Flash
  const handleExplainPageWithAi = async (p: BookPage) => {
    if (aiExplainingPage === p.page_number && aiExplanationText) {
      setAiExplainingPage(null);
      return;
    }

    setAiExplainingPage(p.page_number);
    setIsAiExplaining(true);
    setAiExplanationText(null);

    try {
      const res = await fetch('/api/ai/explain-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: p.page_number,
          heading: p.heading,
          content: p.content,
        }),
      });

      const data = await res.json();
      if (data.success && data.explanation) {
        setAiExplanationText(data.explanation);
      } else {
        setAiExplanationText(data.error || 'تعذر جلب الشرح من الذكاء الاصطناعي.');
      }
    } catch {
      setAiExplanationText('تعذر الاتصال بخدمة الذكاء الاصطناعي.');
    } finally {
      setIsAiExplaining(false);
    }
  };

  // Text-to-speech for Arabic recitation
  const toggleAudio = (textToRead?: string) => {
    if (!('speechSynthesis' in window)) {
      alert('ميزة القراءة الصوتية غير مدعومة في متصفحك.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const currentPage = pages[activePageIndex];
    const text = textToRead || `${currentPage?.heading ? currentPage.heading + '. ' : ''}${currentPage?.content || ''}`;

    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = audioRate;

    // Pick Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((v) => v.lang.startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onend = () => {
      setIsPlayingAudio(false);
    };
    utterance.onerror = () => {
      setIsPlayingAudio(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Theme configuration
  const themeClasses: Record<ReaderTheme, { bg: string; text: string; cardBg: string; border: string; heading: string }> = {
    dark: {
      bg: 'bg-[#030707]',
      text: 'text-[#e2e8f0]',
      cardBg: 'bg-[#0d1516]',
      border: 'border-white/10',
      heading: 'text-amber-400',
    },
    sepia: {
      bg: 'bg-[#F4EFEA]',
      text: 'text-[#292524]',
      cardBg: 'bg-[#FAF7F2]',
      border: 'border-[#E7DEC8]',
      heading: 'text-[#854D0E]',
    },
    black: {
      bg: 'bg-black',
      text: 'text-neutral-300',
      cardBg: 'bg-[#111111]',
      border: 'border-neutral-800',
      heading: 'text-amber-300',
    },
    light: {
      bg: 'bg-[#F8FAFC]',
      text: 'text-[#0F172A]',
      cardBg: 'bg-white',
      border: 'border-slate-200',
      heading: 'text-teal-800',
    },
  };

  const currentTheme = themeClasses[preferences.theme] || themeClasses.dark;

  // Font family class
  const fontClass =
    preferences.fontFamily === 'amiri'
      ? "font-['Amiri']"
      : preferences.fontFamily === 'naskh'
      ? "font-['Noto_Naskh_Arabic']"
      : 'font-sans';

  // Highlight search matches
  const renderContentWithHighlights = (content: string) => {
    let displayText = preferences.removeTashkeel ? stripTashkeel(content) : content;

    if (!searchQuery.trim()) {
      return displayText;
    }

    const query = searchQuery.trim();
    // Split for highlighting
    const parts = displayText.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-black px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${currentTheme.bg} ${currentTheme.text} transition-colors select-text`}>
      {/* Top Reader Ribbon */}
      <header className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 ${currentTheme.cardBg} ${currentTheme.border} shrink-0`}>
        {/* Left: Back / Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:opacity-80 transition-all cursor-pointer shrink-0"
            style={{ borderColor: 'inherit' }}
            title="الرجوع إلى قائمة الكتب"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">رجوع</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold truncate font-['Noto_Naskh_Arabic']">
              {book.title}
              {book.volume_label && (
                <span className="text-xs font-normal opacity-80 mr-2">
                  (ج {book.volume_label})
                </span>
              )}
            </h2>
            <div className="text-[11px] opacity-75 truncate flex items-center gap-1.5">
              <span>{book.author_name || 'مؤلف غير محدد'}</span>
              {book.death_display && <span>({book.death_display})</span>}
              <span>· #{book.id}</span>
            </div>
          </div>
        </div>

        {/* Center: Search & Page navigation */}
        <div className="hidden lg:flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في صفحات الكتاب..."
              className="w-full text-xs py-1.5 pr-8 pl-3 rounded-lg border bg-transparent focus:outline-none focus:ring-1 focus:ring-[#00898F]"
              style={{ borderColor: 'inherit' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <span className="text-xs font-mono tabular-nums opacity-75 whitespace-nowrap">
              {filteredPages.length} نتيجة
            </span>
          )}
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {/* Audio Recite Button */}
          <button
            onClick={() => toggleAudio()}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPlayingAudio ? 'bg-amber-500 text-black border-amber-600' : 'hover:bg-white/5'
            }`}
            style={{ borderColor: isPlayingAudio ? undefined : 'inherit' }}
            title={isPlayingAudio ? 'إيقاف القراءة الصوتية' : 'استماع للصفحة الحالية (قراءة آلية)'}
          >
            {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isPlayingAudio ? 'إيقاف' : 'استماع'}</span>
          </button>

          {/* Table of Contents */}
          <button
            onClick={() => setShowToc(!showToc)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showToc ? 'bg-[#00898F] text-white border-transparent' : 'hover:bg-white/5'
            }`}
            style={{ borderColor: showToc ? undefined : 'inherit' }}
            title="فهرس الموضوعات والأبواب"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">الفهرس</span>
            {tocItems.length > 0 && (
              <span className="text-[10px] font-mono tabular-nums opacity-75">
                ({tocItems.length})
              </span>
            )}
          </button>

          {/* Settings Menu */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showSettings ? 'bg-[#00898F] text-white border-transparent' : 'hover:bg-white/5'
            }`}
            style={{ borderColor: showSettings ? undefined : 'inherit' }}
            title="إعدادات الخط والمظهر"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Book Info */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showInfo ? 'bg-white/20' : 'hover:bg-white/5'
            }`}
            style={{ borderColor: 'inherit' }}
            title="بيانات وهوية الكتاب"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
            style={{ borderColor: 'inherit' }}
            title="إغلاق القارئ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Reading Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Table of Contents Drawer */}
        {showToc && (
          <aside
            className={`w-80 border-l ${currentTheme.cardBg} ${currentTheme.border} p-4 flex flex-col shrink-0 z-30 transition-all`}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'inherit' }}>
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-[#00b4bc]" />
                <h3 className="text-sm font-bold font-['Noto_Naskh_Arabic']">
                  فهرس الموضوعات ({tocItems.length})
                </h3>
              </div>
              <button
                onClick={() => setShowToc(false)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {tocItems.length === 0 ? (
                <div className="text-xs opacity-60 text-center py-8">
                  لا يحتوي هذا الكتاب على عناوين رئيسية مفهرسة.
                </div>
              ) : (
                tocItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => jumpToPage(item.page_number)}
                    className="w-full text-right p-2 rounded-lg text-xs hover:bg-white/10 transition-colors flex items-start justify-between gap-2 group cursor-pointer"
                  >
                    <span className="font-medium group-hover:text-[#00b4bc] transition-colors leading-relaxed">
                      {item.heading}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums opacity-60 shrink-0 mt-0.5">
                      ص {item.page_label}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Settings Dropdown/Drawer */}
        {showSettings && (
          <div
            className={`absolute top-2 left-4 z-40 w-72 rounded-xl p-4 border shadow-2xl ${currentTheme.cardBg} ${currentTheme.border} space-y-4`}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'inherit' }}>
              <span className="text-xs font-bold">خيارات القراءة والخط</span>
              <button onClick={() => setShowSettings(false)} className="text-xs opacity-60 hover:opacity-100">
                ✕
              </button>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span>حجم الخط:</span>
                <span className="font-mono tabular-nums">{preferences.fontSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdatePreferences({
                      ...preferences,
                      fontSize: Math.max(13, preferences.fontSize - 2),
                    })
                  }
                  className="px-2.5 py-1 text-xs rounded border hover:bg-white/10"
                  style={{ borderColor: 'inherit' }}
                >
                  A-
                </button>
                <input
                  type="range"
                  min="13"
                  max="36"
                  value={preferences.fontSize}
                  onChange={(e) =>
                    onUpdatePreferences({
                      ...preferences,
                      fontSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="flex-1 accent-[#00898F]"
                />
                <button
                  onClick={() =>
                    onUpdatePreferences({
                      ...preferences,
                      fontSize: Math.min(36, preferences.fontSize + 2),
                    })
                  }
                  className="px-2.5 py-1 text-xs rounded border hover:bg-white/10"
                  style={{ borderColor: 'inherit' }}
                >
                  A+
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <div className="text-xs mb-1.5">نوع الخط العربي:</div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, fontFamily: 'amiri' })}
                  className={`p-1.5 rounded border text-center transition-colors font-['Amiri'] ${
                    preferences.fontFamily === 'amiri' ? 'bg-[#00898F] text-white border-transparent' : ''
                  }`}
                  style={{ borderColor: preferences.fontFamily === 'amiri' ? undefined : 'inherit' }}
                >
                  خط أميري
                </button>
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, fontFamily: 'naskh' })}
                  className={`p-1.5 rounded border text-center transition-colors font-['Noto_Naskh_Arabic'] ${
                    preferences.fontFamily === 'naskh' ? 'bg-[#00898F] text-white border-transparent' : ''
                  }`}
                  style={{ borderColor: preferences.fontFamily === 'naskh' ? undefined : 'inherit' }}
                >
                  خط النسخ
                </button>
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, fontFamily: 'sans' })}
                  className={`p-1.5 rounded border text-center transition-colors font-sans ${
                    preferences.fontFamily === 'sans' ? 'bg-[#00898F] text-white border-transparent' : ''
                  }`}
                  style={{ borderColor: preferences.fontFamily === 'sans' ? undefined : 'inherit' }}
                >
                  نظامي
                </button>
              </div>
            </div>

            {/* Themes */}
            <div>
              <div className="text-xs mb-1.5">نمط القراءة والمظهر:</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, theme: 'dark' })}
                  className={`p-2 rounded border flex items-center gap-2 ${
                    preferences.theme === 'dark' ? 'ring-2 ring-[#00898F]' : ''
                  } bg-[#0d1516] text-white`}
                  style={{ borderColor: 'inherit' }}
                >
                  <span className="w-3 h-3 rounded-full bg-[#00898F]"></span>
                  <span>مخطوطة داكنة</span>
                </button>
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, theme: 'sepia' })}
                  className={`p-2 rounded border flex items-center gap-2 ${
                    preferences.theme === 'sepia' ? 'ring-2 ring-amber-600' : ''
                  } bg-[#FAF7F2] text-[#292524]`}
                  style={{ borderColor: 'inherit' }}
                >
                  <span className="w-3 h-3 rounded-full bg-[#854D0E]"></span>
                  <span>ورق مصحف</span>
                </button>
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, theme: 'black' })}
                  className={`p-2 rounded border flex items-center gap-2 ${
                    preferences.theme === 'black' ? 'ring-2 ring-white' : ''
                  } bg-black text-neutral-300`}
                  style={{ borderColor: 'inherit' }}
                >
                  <span className="w-3 h-3 rounded-full bg-neutral-600"></span>
                  <span>أسود OLED</span>
                </button>
                <button
                  onClick={() => onUpdatePreferences({ ...preferences, theme: 'light' })}
                  className={`p-2 rounded border flex items-center gap-2 ${
                    preferences.theme === 'light' ? 'ring-2 ring-teal-600' : ''
                  } bg-white text-slate-900`}
                  style={{ borderColor: 'inherit' }}
                >
                  <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                  <span>نهاري ناصع</span>
                </button>
              </div>
            </div>

            {/* Tashkeel Toggle */}
            <div className="flex items-center justify-between text-xs pt-2 border-t" style={{ borderColor: 'inherit' }}>
              <span>إخفاء التشكيل (الحركات):</span>
              <button
                onClick={() =>
                  onUpdatePreferences({
                    ...preferences,
                    removeTashkeel: !preferences.removeTashkeel,
                  })
                }
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  preferences.removeTashkeel ? 'bg-[#00898F]' : 'bg-white/20'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    preferences.removeTashkeel ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Export Actions */}
            <div className="pt-2 border-t space-y-1.5" style={{ borderColor: 'inherit' }}>
              <div className="text-[11px] opacity-75 mb-1">تصدير صفحات الكتاب:</div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadTxt}
                  className="flex-1 py-1.5 px-2 rounded text-xs border hover:bg-white/10 flex items-center justify-center gap-1"
                  style={{ borderColor: 'inherit' }}
                  title="تصدير بنسق sahifa_5586.txt مع فواصل الصفحات"
                >
                  <Download className="w-3 h-3" />
                  <span>ملف TXT</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex-1 py-1.5 px-2 rounded text-xs border hover:bg-white/10 flex items-center justify-center gap-1"
                  style={{ borderColor: 'inherit' }}
                  title="تصدير بنسق contents_full.json"
                >
                  <Download className="w-3 h-3" />
                  <span>ملف JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Book Info Drawer */}
        {showInfo && (
          <aside
            className={`w-80 border-l ${currentTheme.cardBg} ${currentTheme.border} p-5 flex flex-col shrink-0 z-30 overflow-y-auto space-y-4`}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'inherit' }}>
              <h3 className="text-sm font-bold font-['Noto_Naskh_Arabic']">بطاقة وهوية الكتاب</h3>
              <button onClick={() => setShowInfo(false)} className="text-xs opacity-60 hover:opacity-100">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="opacity-60 block">عنوان الكتاب:</span>
                <span className="font-bold text-sm">{book.title}</span>
              </div>

              <div>
                <span className="opacity-60 block">المؤلف:</span>
                <span className="font-medium">
                  {book.author_name} {book.death_display && `(${book.death_display})`}
                </span>
              </div>

              {book.category_name && (
                <div>
                  <span className="opacity-60 block">التصنيف الموضوعي:</span>
                  <span>{book.category_name}</span>
                </div>
              )}

              {book.publisher_name && (
                <div>
                  <span className="opacity-60 block">الناشر والمطبعة:</span>
                  <span>
                    {book.publisher_name} {book.printery && `(${book.printery})`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'inherit' }}>
                <div>
                  <span className="opacity-60 block">سنة الطبع:</span>
                  <span className="font-mono tabular-nums">{book.print_year || '—'} هـ</span>
                </div>
                <div>
                  <span className="opacity-60 block">عدد الصفحات:</span>
                  <span className="font-mono tabular-nums">{pages.length} صفحة</span>
                </div>
              </div>

              {book.abstract && (
                <div className="pt-2 border-t" style={{ borderColor: 'inherit' }}>
                  <span className="opacity-60 block mb-1">نبذة عن الكتاب:</span>
                  <p className="leading-relaxed opacity-90">{book.abstract}</p>
                </div>
              )}

              {/* Attachments / Hash details */}
              {book.attachments && book.attachments.length > 0 && (
                <div className="pt-2 border-t" style={{ borderColor: 'inherit' }}>
                  <span className="opacity-60 block mb-1.5">المرفقات والملفات المرتبطة:</span>
                  <div className="space-y-2">
                    {book.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="p-2 rounded border bg-black/10 text-[11px] font-mono space-y-0.5"
                        style={{ borderColor: 'inherit' }}
                      >
                        <div className="font-bold text-[#00b4bc]">[{att.context}] {att.filename}</div>
                        <div className="opacity-70">الحجم: {(att.size / 1024).toFixed(1)} KB</div>
                        <div className="opacity-50 truncate">hash: {att.hash}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Content Viewer Canvas */}
        <main
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-16 lg:px-24 py-8 space-y-8"
        >
          {filteredPages.length === 0 ? (
            <div className="text-center py-20 opacity-70">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">لم يتم العثور على صفحات تطابق بحثك: &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-3 text-xs text-[#00898F] underline cursor-pointer"
              >
                مسح البحث
              </button>
            </div>
          ) : (
            filteredPages.map((page, idx) => {
              const isBookmarked = bookmarks.some(
                (b) => b.bookId === book.id && b.pageNumber === page.page_number
              );
              const currentBookmark = bookmarks.find(
                (b) => b.bookId === book.id && b.pageNumber === page.page_number
              );

              return (
                <article
                  key={page.page_number}
                  id={`page-${page.page_number}`}
                  className={`max-w-3xl mx-auto rounded-2xl border p-6 sm:p-8 transition-shadow ${currentTheme.cardBg} ${currentTheme.border} shadow-sm relative group`}
                >
                  {/* Page Header */}
                  <header
                    className="flex items-center justify-between pb-4 mb-5 border-b text-xs"
                    style={{ borderColor: 'inherit' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-[#00b4bc] tabular-nums">
                        صفحة {page.page_label || page.page_number}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="opacity-60 text-[11px]">كتاب #{book.id}</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* Copy Page */}
                      <button
                        onClick={() => handleCopyPage(page)}
                        className="p-1.5 rounded-lg border hover:bg-white/10 text-xs flex items-center gap-1 transition-colors"
                        style={{ borderColor: 'inherit' }}
                        title="نسخ نص هذه الصفحة"
                      >
                        {copiedPage === page.page_number ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">نسخ</span>
                          </>
                        )}
                      </button>

                      {/* AI Explain Page */}
                      <button
                        onClick={() => handleExplainPageWithAi(page)}
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                          aiExplainingPage === page.page_number
                            ? 'bg-[#00898F] text-white border-transparent'
                            : 'hover:bg-white/10 text-[#00b4bc]'
                        }`}
                        style={{ borderColor: aiExplainingPage === page.page_number ? undefined : 'inherit' }}
                        title="شرح تربوي وبلاغي لهذه الصفحة بالذكاء الاصطناعي"
                      >
                        {isAiExplaining && aiExplainingPage === page.page_number ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span className="hidden sm:inline text-[11px]">شرح بالذكاء الاصطناعي</span>
                      </button>

                      {/* Bookmark Button */}
                      <button
                        onClick={() =>
                          onToggleBookmark({
                            bookId: book.id,
                            bookTitle: book.title,
                            pageNumber: page.page_number,
                            pageLabel: page.page_label,
                            heading: page.heading,
                            createdAt: new Date().toLocaleDateString('ar-EG'),
                          })
                        }
                        className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                          isBookmarked
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'hover:bg-white/10'
                        }`}
                        style={{ borderColor: isBookmarked ? undefined : 'inherit' }}
                        title={isBookmarked ? 'إزالة الإشارة المرجعية' : 'إضافة إشارة مرجعية'}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">
                          {isBookmarked ? 'مشار إليها' : 'إشارة'}
                        </span>
                      </button>
                    </div>
                  </header>

                  {/* Heading */}
                  {page.heading && (
                    <h3
                      className={`text-xl md:text-2xl font-bold mb-5 ${currentTheme.heading} font-['Noto_Naskh_Arabic'] text-center leading-relaxed`}
                    >
                      {page.heading}
                    </h3>
                  )}

                  {/* Content Body */}
                  <div
                    className={`${fontClass} leading-loose tracking-wide whitespace-pre-line text-justify`}
                    style={{
                      fontSize: `${preferences.fontSize}px`,
                      lineHeight: preferences.lineHeight,
                    }}
                  >
                    {renderContentWithHighlights(page.content)}
                  </div>

                  {/* AI Explanation Box if active */}
                  {aiExplainingPage === page.page_number && (
                    <div className="mt-6 p-4 rounded-xl border border-teal-500/30 bg-[#0d1617] text-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[#00b4bc] font-bold">
                        <div className="flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-amber-400" />
                          <span>شرح المعلم القرآني بالذكاء الاصطناعي (Gemini 3.8 Flash):</span>
                        </div>
                        <button
                          onClick={() => setAiExplainingPage(null)}
                          className="text-[11px] text-slate-400 hover:text-white"
                        >
                          ✕ إغلاق الشرح
                        </button>
                      </div>

                      {isAiExplaining ? (
                        <div className="py-4 flex items-center justify-center gap-2 text-slate-300">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00b4bc]" />
                          <span>جاري صياغة الشرح والفوائد التربوية...</span>
                        </div>
                      ) : (
                        <div className="text-slate-200 leading-relaxed whitespace-pre-line font-['Noto_Naskh_Arabic']">
                          {aiExplanationText}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Study Note Box if bookmarked */}
                  {isBookmarked && (
                    <div
                      className="mt-6 pt-4 border-t text-xs space-y-2 bg-amber-500/5 -mx-4 -mb-4 p-4 rounded-b-2xl border-amber-500/20"
                    >
                      <div className="flex items-center justify-between text-amber-300 font-medium">
                        <span>ملاحظة دراسية على هذه الصفحة:</span>
                        {noteEditingPage !== page.page_number && (
                          <button
                            onClick={() => {
                              setNoteEditingPage(page.page_number);
                              setNoteText(currentBookmark?.note || '');
                            }}
                            className="text-[11px] underline opacity-80 hover:opacity-100"
                          >
                            {currentBookmark?.note ? 'تعديل الملاحظة' : '+ كتابة ملاحظة'}
                          </button>
                        )}
                      </div>

                      {noteEditingPage === page.page_number ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="اكتب ملاحظاتك، شرح الكلمات، أو الاستنتاجات العلمية..."
                            className="w-full p-2.5 rounded-lg border bg-black/20 text-xs focus:outline-none"
                            style={{ borderColor: 'inherit' }}
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setNoteEditingPage(null)}
                              className="px-2.5 py-1 text-xs opacity-70 hover:opacity-100"
                            >
                              إلغاء
                            </button>
                            <button
                              onClick={() => {
                                onUpdateBookmarkNote(book.id, page.page_number, noteText);
                                setNoteEditingPage(null);
                              }}
                              className="px-3 py-1 bg-[#00898F] text-white rounded text-xs font-semibold"
                            >
                              حفظ الملاحظة
                            </button>
                          </div>
                        </div>
                      ) : (
                        currentBookmark?.note && (
                          <p className="text-amber-200/90 italic leading-relaxed">
                            {currentBookmark.note}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </main>
      </div>

      {/* Footer Navigation Bar */}
      <footer
        className={`px-4 py-2 border-t flex items-center justify-between text-xs ${currentTheme.cardBg} ${currentTheme.border} shrink-0`}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-60">إجمالي الصفحات:</span>
          <span className="font-mono tabular-nums font-semibold">{pages.length}</span>
        </div>

        {/* Quick jump to page */}
        <div className="flex items-center gap-1.5">
          <span className="opacity-70 text-[11px]">انتقال إلى صفحة:</span>
          <input
            type="number"
            min="1"
            max={pages.length}
            placeholder="رقم"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt((e.target as HTMLInputElement).value, 10);
                if (val >= 1 && val <= pages.length) {
                  jumpToPage(val);
                }
              }
            }}
            className="w-16 px-2 py-1 rounded border text-xs text-center font-mono bg-transparent focus:outline-none"
            style={{ borderColor: 'inherit' }}
          />
        </div>

        <div className="text-[11px] opacity-60 font-mono hidden sm:block">
          مكتبة أهل البيت (ع) - القارئ المحلي
        </div>
      </footer>
    </div>
  );
};
