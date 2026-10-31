import React from 'react';
import {
  HelpCircle,
  BookOpen,
  Database,
  Cpu,
  FileText,
  ShieldCheck,
  X,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
  onOpenArchitecture: () => void;
  onResetFactory: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  onClose,
  onOpenArchitecture,
  onResetFactory,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0d1516] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[92dvh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#162224]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00898F]/20 flex items-center justify-center text-[#00b4bc] shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-['Noto_Naskh_Arabic']">
                حول مكتبة أهل البيت (ع) - النسخة المحلية
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                محرك بحث وقراءة للمخطوطات والكتب التراثية يعمل 100% بدون إنترنت
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs leading-relaxed">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-['Noto_Naskh_Arabic']">
              <BookOpen className="w-4 h-4 text-[#00b4bc]" />
              <span>فلسفة التصميم والهدف</span>
            </h3>
            <p className="text-slate-300">
              صُممت هذه النسخة لتوفير تجربة قراءة وبحث فائقة السرعة، تحفظ التراث الإسلامي بدقة متناهية
              دون الحاجة إلى اتصال دائم بالإنترنت. تتيح للمستخدمين، الباحثين، والأطفال الاستفادة من
              كنوز الصحيفة السجادية وأمهات المصادر الروائية والفقهية.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-['Noto_Naskh_Arabic']">
              <Database className="w-4 h-4 text-amber-300" />
              <span>الميزات التقنية المدعومة</span>
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-[#00b4bc] font-bold">1.</span>
                <span>
                  <strong>تحليل ملفات contents_full.json:</strong> معالجة شجرة Protobuf (abx.pages)
                  واستخراج العناوين والنصوص مع تنظيف التكرارات المتتالية بدقة.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00b4bc] font-bold">2.</span>
                <span>
                  <strong>استيراد sahifa_5586.txt:</strong> التعرف على فواصل الصفحات ذات النمط{' '}
                  <code className="text-amber-300 font-mono">===== صفحة X — Y =====</code> وبناء قاعدة بيانات الكتاب.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00b4bc] font-bold">3.</span>
                <span>
                  <strong>محرك بحث FTS5 محلي:</strong> فهرسة معكوسة بالكلمات مع تجريد الحركات وتوحيد
                  الهمزات لتوفير استجابة بحث فورية في أجزاء من الميلي ثانية.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00b4bc] font-bold">4.</span>
                <span>
                  <strong>واجهة أسئلة للناشئة والطفل:</strong> إجابات سريعة، استماع صوتي آلي واضح،
                  ودروس تربوية مستخلصة من الأدعية الشريفة.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-white block">مشروع تطبيق الهواتف المحمولة (KMP Android & iOS):</span>
              <span className="text-slate-400 text-[11px]">
                مشروع Kotlin Multiplatform + Compose مكتمل لنظامي Android و iOS مع Xcode Project و Gradle.
              </span>
            </div>
            <a
              href="/assets/aistudio/AhlulbaytLibraryKMP-Complete.zip"
              download="AhlulbaytLibraryKMP-Complete.zip"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل مشروع KMP كاملاً (.zip)</span>
            </a>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-white block">مخطط المعمارية وتقنيات Cactus / APK:</span>
              <span className="text-slate-400 text-[11px]">
                اطّلع على مقارنة FTS5 مقابل النماذج المحلية (On-device LLMs).
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenArchitecture();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#00898F]/20 hover:bg-[#00898F] text-[#00b4bc] hover:text-white border border-[#00898F]/40 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>عرض مخطط المعمارية (Cactus + RAG)</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-slate-400">
            <div>
              <span>إعادة ضبط البيانات إلى الوضع الأولي:</span>
            </div>
            <button
              onClick={() => {
                if (confirm('هل تريد استعادة البيانات الأولية للكتب وإعادة تعيين التخزين المحلي؟')) {
                  onResetFactory();
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline"
            >
              إعادة ضبط المصنع
            </button>
          </div>
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
