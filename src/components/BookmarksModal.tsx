import React from 'react';
import { PageBookmark, Book } from '../types/library';
import { Bookmark, BookOpen, Trash2, X, FileEdit } from 'lucide-react';

interface BookmarksModalProps {
  bookmarks: PageBookmark[];
  books: Book[];
  onClose: () => void;
  onOpenBookAtPage: (bookId: number, pageNumber: number) => void;
  onRemoveBookmark: (bookmark: PageBookmark) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  bookmarks,
  books,
  onClose,
  onOpenBookAtPage,
  onRemoveBookmark,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1516] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#162224]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Noto_Naskh_Arabic']">
                الإشارات المرجعية والملاحظات الدراسية
              </h2>
              <p className="text-xs text-slate-400">
                {bookmarks.length} إشارة محفوظة في ذاكرة جهازك المحلية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-xs">
          {bookmarks.length === 0 ? (
            <div className="text-center py-16 opacity-60">
              <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لم تحفظ أي إشارات مرجعية بعد.</p>
              <p className="text-xs mt-1">
                أثناء قراءة أي كتاب، انقر على زر &quot;إشارة&quot; في رأس الصفحة لحفظها هنا مع تدوين الملاحظات.
              </p>
            </div>
          ) : (
            bookmarks.map((bm, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-[#00898F]/40 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm font-['Noto_Naskh_Arabic']">
                        {bm.bookTitle}
                      </span>
                      <span className="text-amber-400 font-mono font-semibold text-xs tabular-nums">
                        [ص {bm.pageLabel || bm.pageNumber}]
                      </span>
                    </div>
                    {bm.heading && (
                      <p className="text-xs text-[#00b4bc] font-medium leading-relaxed">
                        {bm.heading}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onOpenBookAtPage(bm.bookId, bm.pageNumber)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#00898F]/20 hover:bg-[#00898F] text-[#00b4bc] hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>قراءة</span>
                    </button>
                    <button
                      onClick={() => onRemoveBookmark(bm)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="حذف الإشارة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {bm.note && (
                  <div className="mt-1 p-2.5 rounded-lg bg-black/30 border border-white/5 text-amber-200/90 italic leading-relaxed text-xs">
                    <span className="font-semibold not-italic text-amber-300 block mb-0.5">
                      الملاحظة المدونة:
                    </span>
                    {bm.note}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1">
                  <span>تاريخ الإضافة: {bm.createdAt}</span>
                  <span className="font-mono">معرف الكتاب: #{bm.bookId}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3.5 border-t border-white/10 flex justify-end bg-[#162224]/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-white/10 text-xs hover:bg-white/5 transition-colors"
          >
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
};
