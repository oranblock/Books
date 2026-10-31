import React from 'react';
import {
  Cpu,
  Database,
  Layers,
  Zap,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCode,
  Smartphone,
  BookOpen,
} from 'lucide-react';

interface RagArchitectureModalProps {
  onClose: () => void;
}

export const RagArchitectureModal: React.FC<RagArchitectureModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0d1516] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[92dvh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between bg-[#162224]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00898F]/20 flex items-center justify-center text-[#00b4bc] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-['Noto_Naskh_Arabic']">
                مخطط المعمارية التقنية: Cactus + RAG + SQLite
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                مقارنة تفصيلية بين الاسترجاع المحلي الفوري (FTS5) وتشغيل النماذج على الجهاز
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

        {/* Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs leading-relaxed">
          {/* Architecture Visual Diagram */}
          <div className="rounded-xl border border-white/10 bg-[#070b0c] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00b4bc]" />
                <span>مخطط تدفق الاسترجاع والإجابة (On-Device RAG Pipeline):</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                100% يعمل محلياً دون اتصال
              </span>
            </div>

            {/* Step-by-Step Flow Chart */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
              {/* Step 1 */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-between">
                <div>
                  <span className="w-6 h-6 rounded-full bg-[#00898F] text-white flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                    1
                  </span>
                  <div className="font-bold text-white text-xs mb-1">سؤال المستخدم / الطفل</div>
                  <div className="text-[11px] text-slate-400">
                    &quot;ماذا يقول الإمام عن الصبر؟&quot; أو &quot;أشعر بالخوف&quot;
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-[#00b4bc] font-mono">
                  Input Prompt
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3.5 rounded-xl border border-[#00898F]/40 bg-[#00898F]/10 flex flex-col justify-between">
                <div>
                  <span className="w-6 h-6 rounded-full bg-[#00898F] text-white flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                    2
                  </span>
                  <div className="font-bold text-white text-xs mb-1">محرك الاسترجاع FTS5 / Cactus</div>
                  <div className="text-[11px] text-slate-300">
                    تجريد التشكيل + تطابق الكلمات + ترتيب حسب الـ Rank والـ Snippets
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-emerald-400 font-mono">
                  &lt; 2 ms latency
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex flex-col justify-between">
                <div>
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                    3
                  </span>
                  <div className="font-bold text-white text-xs mb-1">بناء سياق RAG المحلي</div>
                  <div className="text-[11px] text-slate-300">
                    حقن الشاهد النصي المباشر + رقم الصفحة + الفكرة التربوية
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-amber-300 font-mono">
                  Prompt Augmentation
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 flex flex-col justify-between">
                <div>
                  <span className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                    4
                  </span>
                  <div className="font-bold text-white text-xs mb-1">النموذج المحلي / المصوغ التربوي</div>
                  <div className="text-[11px] text-slate-400">
                    صياغة إجابة دافئة ومبسطة للطفل مع إمكانية النطق الصوتي الآلي
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-purple-300 font-mono">
                  Child-Friendly Answer
                </div>
              </div>
            </div>
          </div>

          {/* Technical Comparison Matrix */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00b4bc]" />
              <span>مقارنة الخيارات البرمجية لتطبيق APK والأجهزة الذكية:</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-bold">
                    <th className="p-3">المعيار</th>
                    <th className="p-3 text-emerald-400">الخيار 1: SQLite FTS5 (المطبق هنا)</th>
                    <th className="p-3 text-amber-400">الخيار 2: Cactus on-device (Qwen/Gemma)</th>
                    <th className="p-3 text-[#00b4bc]">الخيار 3: المعمارية الهجينة (Hybrid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">حجم الحزمة (APK Size)</td>
                    <td className="p-3 text-emerald-300 font-mono">صغير جداً (~2 MB إلى 15 MB)</td>
                    <td className="p-3 text-amber-300 font-mono">كبير (~600 MB إلى 1.5 GB نموذج)</td>
                    <td className="p-3 font-mono">~15 MB + تحميل النموذج اختيارياً</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">سرعة الاستجابة</td>
                    <td className="p-3 text-emerald-300">فورية (أقل من 2 ميلي ثانية)</td>
                    <td className="p-3 text-amber-300">1 إلى 4 ثوانٍ حسب قوة المعالج</td>
                    <td className="p-3">فورية للشاهد النصي + توليد سريع</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">استهلاك الذاكرة والبطارية</td>
                    <td className="p-3 text-emerald-300">شبه منعدم (&lt; 20 MB RAM)</td>
                    <td className="p-3 text-amber-300">مرتفع (يتطلب 1.5GB إلى 2GB RAM حرة)</td>
                    <td className="p-3">منخفض في البحث، متوسط عند التوليد</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">دقة النصوص المقدسة</td>
                    <td className="p-3 text-emerald-300">100% نص أصلي منقول دون أي تحريف</td>
                    <td className="p-3 text-amber-300">قد يعيد صياغة العبارات بالخطأ (الهلوسة)</td>
                    <td className="p-3 text-emerald-300">النص الأصلي معزول ومحصّن تماماً</td>
                  </tr>
                  <tr className="hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">سهولة النشر في Android</td>
                    <td className="p-3 text-emerald-300">سهل جداً (WebView / Capacitor / Flutter)</td>
                    <td className="p-3 text-amber-300">معقد (يحتاج NDK و libcactus.so و arm64)</td>
                    <td className="p-3">متدرج: يعمل فوراً ويتطور تدريجياً</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Practical Path Recommendation */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>خلاصة التوصية الهندسية لبناء تطبيق للأطفال والعائلة:</span>
            </div>
            <p className="text-slate-300">
              أفضل استراتيجية هي <strong>البدء بما بنيناه في هذا التطبيق</strong>: فهرس الكلمات FTS5
              مع واجهة الأسئلة المبسطة للطفل. هذا يضمن:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 mr-2">
              <li>أن التطبيق يعمل على 100% من الهواتف (حتى القديمة والضعيفة) دون أي تعليق.</li>
              <li>النص المعروض للطفل هو كلام الإمام السجاد (ع) الحرفي الموثق دون تحريف أو هلوسة نماذج.</li>
              <li>حجم التطبيق يبقى بضعة ميغابايت فقط ويثبت في ثوانٍ.</li>
              <li>
                إذا أردت لاحقاً إضافة Cactus، يمكنك استخدام FTS5 كمرحلة أولى (Fast Retriever)
                لتمرير الشاهد للنموذج المحلي فقط!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-white/10 flex justify-end bg-[#162224]/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#00898F] text-white text-xs font-semibold hover:bg-[#00b4bc] hover:text-[#030707] transition-all"
          >
            فهمت، العودة للتطبيق
          </button>
        </footer>
      </div>
    </div>
  );
};
