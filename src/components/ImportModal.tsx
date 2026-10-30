import React, { useState } from 'react';
import { Book, BookPage } from '../types/library';
import {
  parseAnyTextOrJsonToPages,
  extractTocFromPages,
} from '../utils/parser';
import {
  SAMPLE_CONTENTS_FULL_JSON,
  SAMPLE_SAHIFA_TXT,
} from '../data/initialData';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  Download,
} from 'lucide-react';

interface ImportModalProps {
  books: Book[];
  defaultBookId?: number;
  onClose: () => void;
  onImportSuccess: (bookId: number, pages: BookPage[], title?: string) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  books,
  defaultBookId = 5586,
  onClose,
  onImportSuccess,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<number>(defaultBookId);
  const [isNewBook, setIsNewBook] = useState<boolean>(false);
  const [newBookTitle, setNewBookTitle] = useState<string>('');
  const [newBookAuthor, setNewBookAuthor] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isFetchingRemote, setIsFetchingRemote] = useState<boolean>(false);
  const [remoteLogs, setRemoteLogs] = useState<string[] | null>(null);

  // Direct remote fetch via Connect-RPC
  const handleRemoteFetchClick = async () => {
    setIsFetchingRemote(true);
    setRemoteLogs(null);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/books/${selectedBookId}/fetch-remote`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.status === 'ok' && Array.isArray(data.pages) && data.pages.length > 0) {
        const curBook = books.find((b) => b.id === selectedBookId);
        onImportSuccess(selectedBookId, data.pages, isNewBook ? newBookTitle : curBook?.title);
      } else {
        setRemoteLogs(data.tried || ['تعذر العثور على محتوى الكتاب عن بعد']);
        setErrorMsg('تعذر الجلب التلقائي عن بعد، يمكنك رفع الملف يدوياً أدناه.');
      }
    } catch (e: any) {
      setErrorMsg(`خطأ في الاتصال: ${e.message}`);
    } finally {
      setIsFetchingRemote(false);
    }
  };

  // Live parsed result preview
  const parseResult = React.useMemo(() => {
    if (!rawText.trim()) return null;
    try {
      const res = parseAnyTextOrJsonToPages(rawText);
      const toc = extractTocFromPages(res.pages);
      return {
        pages: res.pages,
        format: res.detectedFormat,
        tocCount: toc.length,
        firstPage: res.pages[0],
      };
    } catch (err: any) {
      return { error: err.message || 'خطأ في معالجة النص' };
    }
  }, [rawText]);

  // Handle file input
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawText(content);
    };
    reader.onerror = () => {
      setErrorMsg('تعذر قراءة الملف المحدد.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (!parseResult || !parseResult.pages || parseResult.pages.length === 0) {
      setErrorMsg('الرجاء إدخال أو رفع ملف يحتوي على صفحات صالحة أولاً.');
      return;
    }

    const targetId = isNewBook
      ? Math.max(...books.map((b) => b.id), 9000) + 1
      : selectedBookId;

    const customTitle = isNewBook ? newBookTitle || 'كتاب مستورد جديد' : undefined;

    onImportSuccess(targetId, parseResult.pages, customTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0d1516] border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#162224]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00898F]/20 flex items-center justify-center text-[#00b4bc]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['Noto_Naskh_Arabic']">
                استيراد وتحويل كتاب محلي
              </h2>
              <p className="text-xs text-slate-400">
                دعم أصيل لملفات contents_full.json و sahifa_5586.txt والنصوص المجزأة
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Target Book Selection */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white">الوجهة المستهدفة لحفظ الصفحات:</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bookDest"
                    checked={!isNewBook}
                    onChange={() => setIsNewBook(false)}
                    className="accent-[#00898F]"
                  />
                  <span>كتاب موجود في الفهرس</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="bookDest"
                    checked={isNewBook}
                    onChange={() => setIsNewBook(true)}
                    className="accent-[#00898F]"
                  />
                  <span>إنشاء كتاب جديد</span>
                </label>
              </div>
            </div>

            {!isNewBook ? (
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(parseInt(e.target.value, 10))}
                className="w-full bg-[#162224] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00898F]"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.id} — {b.title} {b.volume_label ? `(ج ${b.volume_label})` : ''} —{' '}
                    {b.author_name || 'بدون مؤلف'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="عنوان الكتاب الجديد..."
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                  className="bg-[#162224] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00898F]"
                />
                <input
                  type="text"
                  placeholder="اسم المؤلف أو المحقق..."
                  value={newBookAuthor}
                  onChange={(e) => setNewBookAuthor(e.target.value)}
                  className="bg-[#162224] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00898F]"
                />
              </div>
            )}

            {!isNewBook && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] text-slate-400">
                  هل تفضل الجلب الآلي المباشر من خادم المكتبة؟
                </span>
                <button
                  type="button"
                  onClick={handleRemoteFetchClick}
                  disabled={isFetchingRemote}
                  className="px-3 py-1.5 rounded-lg bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {isFetchingRemote
                      ? 'جاري الاتصال والتحميل...'
                      : `تحميل هذا الكتاب (#${selectedBookId}) عن بعد تلقائياً`}
                  </span>
                </button>
              </div>
            )}

            {remoteLogs && (
              <div className="mt-2 p-3 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="font-bold text-amber-300">سجل تشخيص المحاولة (Diagnostic Log):</div>
                {remoteLogs.map((log, lIdx) => (
                  <div key={lIdx} className="opacity-80 truncate">{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Sample Loaders (for 1-click test of prompt requirements) */}
          <div className="flex items-center justify-between flex-wrap gap-2 py-1">
            <span className="text-slate-400">نماذج تجريبية جاهزة للاختبار الفوري:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setRawText(SAMPLE_CONTENTS_FULL_JSON);
                  setFileName('contents_full.json');
                  setSelectedBookId(5586);
                  setIsNewBook(false);
                }}
                className="px-2.5 py-1 rounded bg-[#00898F]/20 hover:bg-[#00898F]/30 text-[#00b4bc] border border-[#00898F]/30 flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>نموذج contents_full.json (abx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRawText(SAMPLE_SAHIFA_TXT);
                  setFileName('sahifa_5586.txt');
                  setSelectedBookId(5586);
                  setIsNewBook(false);
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>نموذج sahifa_5586.txt</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
              isDragging
                ? 'border-[#00898F] bg-[#00898F]/10'
                : 'border-white/15 bg-white/5 hover:border-white/30'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto text-[#00b4bc] mb-2 opacity-80" />
            <p className="font-medium text-white mb-1">
              اسحب وأفلت ملف <code className="text-[#00b4bc]">contents_full.json</code> أو{' '}
              <code className="text-amber-300">sahifa_5586.txt</code> هنا
            </p>
            <p className="text-[11px] text-slate-400 mb-3">
              يدعم ملفات JSON, TXT, ABX, DOCX مع استخراج تلقائي للفهارس والأبواب
            </p>
            <label className="inline-block px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium cursor-pointer transition-colors">
              <span>تصفح ملفات جهازك</span>
              <input
                type="file"
                accept=".json,.txt,.abx,.docx,.sqlite,.db"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
            {fileName && (
              <div className="mt-2 text-[11px] text-[#34d399] font-mono">
                الملف المحدد حالياً: {fileName}
              </div>
            )}
          </div>

          {/* Text Area Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-white">أو الصق محتوى النص / JSON مباشرة هنا:</label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setFileName('');
                  }}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  إفراغ النص
                </button>
              )}
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="الصق نص ملف contents_full.json أو نص يحتوي على فواصل ===== صفحة X — Y ===== هنا..."
              className="w-full bg-[#162224] border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none focus:border-[#00898F]"
            />
          </div>

          {/* Parser Live Preview Card */}
          {parseResult && !('error' in parseResult) && parseResult.pages && (
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#34d399]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم التعرف على بنية الملف بنجاح!</span>
                </div>
                <span className="font-mono">{parseResult.format}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300 text-[11px] pt-1">
                <div>
                  <span className="opacity-60 block">عدد الصفحات المستخرجة:</span>
                  <span className="font-bold text-white text-sm font-mono tabular-nums">
                    {parseResult.pages.length} صفحة
                  </span>
                </div>
                <div>
                  <span className="opacity-60 block">عناوين الفهرس المكتشفة:</span>
                  <span className="font-bold text-amber-300 text-sm font-mono tabular-nums">
                    {parseResult.tocCount} عنوان
                  </span>
                </div>
                <div>
                  <span className="opacity-60 block">رقم الصفحة الأولى:</span>
                  <span className="font-mono text-white text-sm">
                    ص {parseResult.firstPage?.page_label || '1'}
                  </span>
                </div>
              </div>

              {parseResult.firstPage && (
                <div className="mt-2 pt-2 border-t border-[#10b981]/20">
                  <span className="text-[10px] opacity-70 block mb-1">
                    معاينة محتوى الصفحة الأولى المستخرجة:
                  </span>
                  <div className="p-2 rounded bg-black/30 text-xs space-y-1 font-['Noto_Naskh_Arabic']">
                    {parseResult.firstPage.heading && (
                      <div className="font-bold text-amber-300">
                        {parseResult.firstPage.heading}
                      </div>
                    )}
                    <p className="line-clamp-2 opacity-85 leading-relaxed">
                      {parseResult.firstPage.content}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-[#162224]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleExecuteImport}
            disabled={!parseResult || !parseResult.pages || parseResult.pages.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] text-white text-xs font-bold transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BookOpen className="w-4 h-4" />
            <span>
              حفظ الصفحات وفتح القارئ ({parseResult?.pages ? parseResult.pages.length : 0} ص)
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};
