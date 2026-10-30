import React, { useState, useMemo, useEffect } from 'react';
import {
  Book,
  Category,
  ReadingPreferences,
  PageBookmark,
  BookPage,
} from './types/library';
import {
  loadStoredBooks,
  saveStoredBooks,
  loadReadingPreferences,
  saveReadingPreferences,
  loadBookmarks,
  toggleBookmark,
  updateBookmarkNote,
  importPagesIntoBook,
  resetLibraryToInitial,
} from './utils/storage';
import { INITIAL_CATEGORIES } from './data/initialData';
import { Header } from './components/Header';
import { BookCard } from './components/BookCard';
import { ReaderModal } from './components/ReaderModal';
import { ImportModal } from './components/ImportModal';
import { BookmarksModal } from './components/BookmarksModal';
import { AboutModal } from './components/AboutModal';
import { RagArchitectureModal } from './components/RagArchitectureModal';
import { KidAskConsole } from './components/KidAskConsole';
import {
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  Sparkles,
  DownloadCloud,
  Layers,
  HelpCircle,
  Bookmark,
  Smile,
} from 'lucide-react';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'offline' | 'bookmarks' | 'ask_imam'>('catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [onlyOffline, setOnlyOffline] = useState<boolean>(false);

  // Modals & Panels
  const [activeBookForReader, setActiveBookForReader] = useState<Book | null>(null);
  const [readerInitialPage, setReaderInitialPage] = useState<number | undefined>(undefined);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTargetBook, setImportTargetBook] = useState<Book | null>(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);

  // Reading preferences & Bookmarks
  const [preferences, setPreferences] = useState<ReadingPreferences>(loadReadingPreferences());
  const [bookmarks, setBookmarks] = useState<PageBookmark[]>(loadBookmarks());

  // Toast notice
  const [toastMessage, setToastMessage] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Initial load
  useEffect(() => {
    const loaded = loadStoredBooks();
    setBooks(loaded);
  }, []);

  // Update preferences helper
  const handleUpdatePreferences = (newPrefs: ReadingPreferences) => {
    setPreferences(newPrefs);
    saveReadingPreferences(newPrefs);
  };

  // Toggle bookmark helper
  const handleToggleBookmark = (bm: PageBookmark) => {
    const updated = toggleBookmark(bm);
    setBookmarks(updated);
    showToast('تم تحديث الإشارة المرجعية بنجاح');
  };

  // Update bookmark note helper
  const handleUpdateBookmarkNote = (bookId: number, pageNum: number, note: string) => {
    const updated = updateBookmarkNote(bookId, pageNum, note);
    setBookmarks(updated);
    showToast('تم حفظ الملاحظة الدراسية');
  };

  // Import success helper
  const handleImportSuccess = (bookId: number, newPages: BookPage[], title?: string) => {
    const updatedBook = importPagesIntoBook(bookId, newPages, { customTitle: title });
    const refreshed = loadStoredBooks();
    setBooks(refreshed);
    setShowImportModal(false);
    setImportTargetBook(null);
    showToast(`تم بنجاح حفظ ${newPages.length} صفحة في كتاب #${bookId}!`);
    // Open reader immediately
    setActiveBookForReader(updatedBook);
  };

  // Reset to factory
  const handleResetFactory = () => {
    const res = resetLibraryToInitial();
    setBooks(res);
    showToast('تمت استعادة البيانات الافتراضية للمكتبة');
  };

  // Sahifa book reference (#5586)
  const sahifaBook = useMemo(() => {
    return books.find((b) => b.id === 5586) || books[0];
  }, [books]);

  // Categories with computed book count
  const categories = useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => {
      const count = books.filter((b) => b.category_id === cat.id).length;
      return {
        ...cat,
        book_count: cat.book_count + count,
      };
    });
  }, [books]);

  // Offline count
  const offlineCount = useMemo(() => {
    return books.filter((b) => b.is_downloaded && b.pages && b.pages.length > 0).length;
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      // Offline filter
      if (activeTab === 'offline' || onlyOffline) {
        if (!b.is_downloaded || !b.pages || b.pages.length === 0) return false;
      }

      // Category filter
      if (selectedCategory > 0 && b.category_id !== selectedCategory) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inTitle = (b.title || '').toLowerCase().includes(q);
        const inAuthor = (b.author_name || '').toLowerCase().includes(q);
        const inAbstract = (b.abstract || '').toLowerCase().includes(q);
        const inId = String(b.id) === q;
        if (!inTitle && !inAuthor && !inAbstract && !inId) return false;
      }

      return true;
    });
  }, [books, activeTab, onlyOffline, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#030707] text-[#e2e8f0] flex flex-col font-sans selection:bg-[#00898F]/40 selection:text-white">
      {/* Top Bar (3-zone Top Bar Contract) */}
      <Header
        activeTab={activeTab === 'ask_imam' ? 'catalog' : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'bookmarks') setShowBookmarksModal(true);
        }}
        onOpenImport={() => {
          setImportTargetBook(null);
          setShowImportModal(true);
        }}
        onOpenAbout={() => setShowAboutModal(true)}
        offlineCount={offlineCount}
        bookmarkCount={bookmarks.length}
      />

      {/* Operational Utility / Mode Switcher Ribbon */}
      <div className="bg-[#0a1012] border-b border-white/10 px-4 md:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Segmented Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'bg-[#00898F] text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>فهرس الكتب</span>
            </button>

            <button
              onClick={() => setActiveTab('ask_imam')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ask_imam'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>اسأل عن الصبر والهم والوالدين (للأطفال والناشئة)</span>
            </button>

            <button
              onClick={() => setActiveTab('offline')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'offline'
                  ? 'bg-[#10b981] text-black shadow-sm'
                  : 'text-slate-300 hover:text-[#34d399] hover:bg-white/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>المتاحة بدون اتصال ({offlineCount})</span>
            </button>
          </div>

          {/* Quick Technical Architecture Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchitectureModal(true)}
              className="text-xs text-[#00b4bc] hover:text-white px-3 py-1.5 rounded-lg border border-[#00898F]/30 hover:bg-[#00898F]/20 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>مخطط Cactus + RAG + SQLite</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* TAB 1: ASK THE IMAM (Child & Family FTS Search Console) */}
        {activeTab === 'ask_imam' ? (
          sahifaBook ? (
            <KidAskConsole
              sahifaBook={sahifaBook}
              onOpenReaderAtPage={(pageNum) => {
                setReaderInitialPage(pageNum);
                setActiveBookForReader(sahifaBook);
              }}
            />
          ) : (
            <div className="text-center py-20">جاري تحميل بيانات الصحيفة السجادية...</div>
          )
        ) : (
          /* TAB 2 & 3: CATALOG & OFFLINE BOOKS VIEW */
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-[#0d1516] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-3 shadow-md">
              {/* Search input */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالعنوان، المؤلف، أو رقم الكتاب (مثل: 5586 للصحيفة السجادية)..."
                  className="w-full text-xs sm:text-sm py-2.5 pr-10 pl-4 rounded-xl border border-white/10 bg-[#162224] text-white placeholder-slate-400 focus:outline-none focus:border-[#00898F]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category dropdown */}
              <div className="w-full md:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(parseInt(e.target.value, 10))}
                  className="w-full bg-[#162224] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#00898F]"
                >
                  <option value={0}>كافة الأبواب والموضوعات</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.book_count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Offline only toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 whitespace-nowrap shrink-0 px-2 select-none">
                <input
                  type="checkbox"
                  checked={onlyOffline || activeTab === 'offline'}
                  onChange={(e) => {
                    setOnlyOffline(e.target.checked);
                    if (activeTab === 'offline' && !e.target.checked) {
                      setActiveTab('catalog');
                    }
                  }}
                  className="accent-[#10b981] w-4 h-4 rounded cursor-pointer"
                />
                <span>المحمّلة محلياً فقط</span>
              </label>
            </div>

            {/* Results Counter & Fast Stats Strip */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2">
                <span>المعروض حالياً:</span>
                <strong className="text-white font-mono tabular-nums">{filteredBooks.length}</strong>
                <span>كتاب</span>
                {selectedCategory > 0 && (
                  <span className="text-[#00b4bc]">
                    في {categories.find((c) => c.id === selectedCategory)?.name}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setImportTargetBook(sahifaBook);
                    setShowImportModal(true);
                  }}
                  className="text-xs text-[#00b4bc] hover:underline flex items-center gap-1"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>استيراد contents_full.json في كتاب #5586</span>
                </button>
              </div>
            </div>

            {/* Books Grid */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#0d1516]/50">
                <BookOpen className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                <h3 className="text-base font-bold text-white mb-1">
                  لا توجد كتب تطابق معايير البحث الحالية
                </h3>
                <p className="text-xs text-slate-400">
                  جرّب إزالة الفلترة أو مسح عبارة البحث.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(0);
                    setOnlyOffline(false);
                    setActiveTab('catalog');
                  }}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-white/10 text-xs text-white hover:bg-white/20"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onOpenReader={(b) => {
                      setReaderInitialPage(undefined);
                      setActiveBookForReader(b);
                    }}
                    onOpenImportForBook={(b) => {
                      setImportTargetBook(b);
                      setShowImportModal(true);
                    }}
                    onBookDownloaded={(bookId, pages) => {
                      handleImportSuccess(bookId, pages);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Reader Modal */}
      {activeBookForReader && (
        <ReaderModal
          book={activeBookForReader}
          onClose={() => {
            setActiveBookForReader(null);
            setReaderInitialPage(undefined);
          }}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          bookmarks={bookmarks}
          onToggleBookmark={handleToggleBookmark}
          onUpdateBookmarkNote={handleUpdateBookmarkNote}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          books={books}
          defaultBookId={importTargetBook?.id || 5586}
          onClose={() => {
            setShowImportModal(false);
            setImportTargetBook(null);
          }}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {/* Bookmarks Modal */}
      {showBookmarksModal && (
        <BookmarksModal
          bookmarks={bookmarks}
          books={books}
          onClose={() => setShowBookmarksModal(false)}
          onOpenBookAtPage={(bookId, pageNumber) => {
            const b = books.find((x) => x.id === bookId);
            if (b) {
              setShowBookmarksModal(false);
              setReaderInitialPage(pageNumber);
              setActiveBookForReader(b);
            }
          }}
          onRemoveBookmark={(bm) => {
            handleToggleBookmark(bm);
          }}
        />
      )}

      {/* About Modal */}
      {showAboutModal && (
        <AboutModal
          onClose={() => setShowAboutModal(false)}
          onOpenArchitecture={() => setShowArchitectureModal(true)}
          onResetFactory={handleResetFactory}
        />
      )}

      {/* RAG Architecture Modal */}
      {showArchitectureModal && (
        <RagArchitectureModal onClose={() => setShowArchitectureModal(false)} />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#00898F] text-white px-5 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
