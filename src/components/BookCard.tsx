import React from 'react';
import { Book } from '../types/library';
import { BookOpen, DownloadCloud, FileText, CheckCircle2 } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onOpenReader: (book: Book) => void;
  onOpenImportForBook: (book: Book) => void;
  onBookDownloaded?: (bookId: number, pages: any[]) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onOpenReader,
  onOpenImportForBook,
  onBookDownloaded,
}) => {
  const isDownloaded = Boolean(book.is_downloaded && book.pages && book.pages.length > 0);
  const [isDownloading, setIsDownloading] = React.useState<boolean>(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);

  const handleRemoteFetch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const res = await fetch(`/api/books/${book.id}/fetch-remote`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.status === 'ok' && Array.isArray(data.pages) && data.pages.length > 0) {
        if (onBookDownloaded) {
          onBookDownloaded(book.id, data.pages);
        }
      } else {
        setDownloadError('يتطلب استيراداً يدوياً');
        onOpenImportForBook(book);
      }
    } catch {
      setDownloadError('تعذر الاتصال بالخادم البعيد');
      onOpenImportForBook(book);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <article
      onClick={() => (isDownloaded ? onOpenReader(book) : onOpenImportForBook(book))}
      className={`group relative rounded-xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isDownloaded
          ? 'bg-[#0d1516] hover:bg-[#162224] border-white/10 hover:border-[#00898F]/50 shadow-sm'
          : 'bg-[#080d0e]/60 hover:bg-[#0d1516] border-white/5 hover:border-white/20'
      }`}
    >
      <div>
        {/* Top line: Category and ID */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-1.5 truncate">
            <span>{book.category_name || 'تراث عام'}</span>
            {book.volume_label && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>ج {book.volume_label}</span>
              </>
            )}
          </div>
          <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
            #{book.id}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white group-hover:text-[#00b4bc] transition-colors line-clamp-2 font-['Noto_Naskh_Arabic'] leading-relaxed mb-1.5">
          {book.title}
        </h3>

        {/* Author & Death Date */}
        <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="font-medium">{book.author_name || 'مؤلف غير محدد'}</span>
          {book.death_display && (
            <span className="text-amber-400/90 text-[11px] font-mono tabular-nums">
              ({book.death_display})
            </span>
          )}
        </div>

        {/* Abstract snippet if available */}
        {book.abstract && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-normal mb-3 font-light">
            {book.abstract}
          </p>
        )}
      </div>

      {/* Footer metadata & Action strip */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span>{book.page_count || (book.pages ? book.pages.length : 0)} صفحة</span>
          {book.print_year && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="tabular-nums">{book.print_year} هـ</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDownloaded ? (
            <div className="flex items-center gap-1 text-[#34d399] font-medium text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>متاح بدون اتصال</span>
            </div>
          ) : (
            <button
              onClick={handleRemoteFetch}
              disabled={isDownloading}
              className="flex items-center gap-1 text-xs text-[#00b4bc] hover:text-white px-2.5 py-1 rounded bg-[#00898F]/20 hover:bg-[#00898F] transition-all disabled:opacity-50"
              title="تحميل نصوص وصفحات هذا الكتاب من خادم المكتبة عن بعد (Connect-RPC)"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'جاري التحميل...' : 'تحميل عن بعد'}</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isDownloaded) {
                onOpenReader(book);
              } else {
                onOpenImportForBook(book);
              }
            }}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#00898F] text-slate-300 hover:text-white transition-colors"
            title={isDownloaded ? 'قراءة الكتاب' : 'استيراد يدوي وإعداد الكتاب'}
          >
            {isDownloaded ? <BookOpen className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </article>
  );
};
