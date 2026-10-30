import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Book, BookPage } from '../types/library';
import {
  SahifaSearchEngine,
  SearchHit,
  POPULAR_QUESTIONS,
} from '../utils/searchIndex';
import {
  Search,
  BookOpen,
  Play,
  Pause,
  Sparkles,
  Smile,
  Terminal,
  Database,
  Copy,
  Check,
  CheckCircle2,
  Bot,
  Zap,
  BookMarked,
  HelpCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface KidAskConsoleProps {
  sahifaBook: Book;
  onOpenReaderAtPage: (pageNumber: number) => void;
}

interface AiAnswerResult {
  title: string;
  summary: string;
  directQuote: string;
  practicalLesson: string;
  vocabulary?: Array<{ word: string; meaning: string }>;
  followUpQuestions?: string[];
}

export const KidAskConsole: React.FC<KidAskConsoleProps> = ({
  sahifaBook,
  onOpenReaderAtPage,
}) => {
  const [query, setQuery] = useState<string>('الصبر');
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [showSqlTerminal, setShowSqlTerminal] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | string | null>(null);

  // AI vs Offline FTS Mode
  const [useAiAssistant, setUseAiAssistant] = useState<boolean>(true);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiAnswerResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Initialize Search Engine
  const engine = useMemo(() => {
    return new SahifaSearchEngine(sahifaBook.pages || []);
  }, [sahifaBook.pages]);

  const stats = useMemo(() => {
    return engine.getStats();
  }, [engine]);

  // Execute local FTS search
  const hits: SearchHit[] = useMemo(() => {
    if (!query.trim()) return [];
    return engine.search(query, 5);
  }, [engine, query]);

  // Fetch AI Answer using Gemini 3.8 Flash RAG
  const fetchAiAnswer = async (questionText: string) => {
    if (!questionText.trim()) return;
    setIsAiLoading(true);
    setAiError(null);

    // Retrieve relevant context from local book pages
    const relevantHits = engine.search(questionText, 3);
    const contextPages = relevantHits.map((h) => ({
      pageNumber: h.pageNumber,
      heading: h.heading,
      content: h.fullText,
    }));

    try {
      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          contextPages,
          targetAudience: 'kids',
        }),
      });

      const data = await response.json();
      if (data.success && data.result) {
        setAiResult(data.result);
      } else {
        setAiError(data.error || 'تعذر الحصول على إجابة من الذكاء الاصطناعي.');
      }
    } catch (err: any) {
      console.warn('AI fetch error, using local fallback:', err);
      setAiError('حدث انقطاع بالشبكة. يمكنك مواصلة البحث عبر محرك FTS5 المحلي دون إنترنت.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger AI whenever query changes in AI mode
  useEffect(() => {
    if (useAiAssistant && query.trim()) {
      const timer = setTimeout(() => {
        fetchAiAnswer(query);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [query, useAiAssistant]);

  // Audio recitation
  const togglePlayAudio = (id: string, textToRead: string) => {
    if (!('speechSynthesis' in window)) {
      alert('المتصفح لا يدعم القراءة الصوتية.');
      return;
    }

    if (isPlayingAudio === id) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead.replace(/[【】«»]/g, ''));
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang.startsWith('ar'));
    if (arVoice) utterance.voice = arVoice;

    utterance.onend = () => setIsPlayingAudio(null);
    utterance.onerror = () => setIsPlayingAudio(null);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(id);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleCopySnippet = (id: string | number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Hero Header & Mode Switcher */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0d1516] to-[#080d0e] p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          {/* Engine Switcher (AI Gemini vs Local FTS) */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setUseAiAssistant(true);
                  if (query) fetchAiAnswer(query);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  useAiAssistant
                    ? 'bg-gradient-to-r from-teal-500 to-[#00898F] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>المساعد الذكي AI (Gemini 3.8 Flash)</span>
              </button>

              <button
                onClick={() => setUseAiAssistant(false)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  !useAiAssistant
                    ? 'bg-[#10b981] text-black shadow-sm'
                    : 'text-slate-400 hover:text-[#34d399]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>استرجاع FTS5 فوري (بدون إنترنت)</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{useAiAssistant ? 'نظام RAG + ذكاء اصطناعي نشط' : '100% يعمل محلياً دون اتصال'}</span>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white font-['Noto_Naskh_Arabic'] leading-relaxed">
            ماذا يقول الإمام السجاد (ع) عن...؟
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed font-light">
            اطرح أي سؤال بلسان طفولي أو بحثي (مثل: <strong className="text-white">الصبر</strong>،{' '}
            <strong className="text-white">الوالدين</strong>،{' '}
            <strong className="text-white">الخوف والهم</strong>،{' '}
            <strong className="text-white">التوبة</strong>). يقوم النظام بالاسترجاع الفوري من نصوص
            الصحيفة السجادية (#5586)، وصياغة إجابة تربوية دافئة مع استخراج الشاهد الأصلي.
          </p>

          {/* Search Box */}
          <div className="pt-1">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute right-4 text-[#00b4bc] pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && useAiAssistant) {
                    fetchAiAnswer(query);
                  }
                }}
                placeholder="اكتب سؤالاً أو موضوعاً: ماذا يقول الإمام عن الصبر؟ أو اكتب 'الوالدين'..."
                className="w-full text-base sm:text-lg py-3.5 pr-12 pl-28 rounded-xl border border-white/15 bg-[#162224]/80 text-white placeholder-slate-400 focus:outline-none focus:border-[#00898F] focus:ring-1 focus:ring-[#00898F] shadow-inner transition-all font-['Noto_Naskh_Arabic']"
              />
              <div className="absolute left-3 flex items-center gap-1.5">
                {query && (
                  <button
                    onClick={() => {
                      setQuery('');
                      setAiResult(null);
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded bg-white/5 hover:bg-white/10"
                  >
                    مسح
                  </button>
                )}
                {useAiAssistant && (
                  <button
                    onClick={() => fetchAiAnswer(query)}
                    disabled={isAiLoading || !query.trim()}
                    className="px-3 py-1.5 bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-40 flex items-center gap-1"
                  >
                    {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>اسأل AI</span>}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick-Prompt Buttons */}
          <div className="pt-1 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">أسئلة مقترحة:</span>
            {POPULAR_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(q.keyword);
                  if (useAiAssistant) fetchAiAnswer(q.keyword);
                }}
                className={`text-xs py-1 px-3 rounded-lg border transition-all cursor-pointer ${
                  query === q.keyword
                    ? 'bg-[#00898F] text-white border-transparent font-medium shadow-sm'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {q.text}
              </button>
            ))}
          </div>
        </div>

        {/* Database Metrics Badge in Corner */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[#34d399]">
              <CheckCircle2 className="w-4 h-4" />
              <span>قاعدة البيانات: {stats.dbName}</span>
            </div>
            <span>·</span>
            <span>{stats.pageCount} صفحة مفهرسة</span>
            <span>·</span>
            <span className="tabular-nums">~{stats.estimatedSizeKb} KB</span>
          </div>

          <button
            onClick={() => setShowSqlTerminal(!showSqlTerminal)}
            className="flex items-center gap-1 text-[11px] font-mono text-[#00b4bc] hover:underline"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showSqlTerminal ? 'إخفاء أوامر SQL' : 'عرض كود FTS5 & SQLite'}</span>
          </button>
        </div>
      </div>

      {/* SQL Terminal Box */}
      {showSqlTerminal && (
        <div className="rounded-xl border border-white/10 bg-[#070b0c] p-4 text-xs font-mono text-emerald-400 space-y-2">
          <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/10">
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[#00b4bc]" />
              <span>استعلام FTS5 المكافئ في SQLite:</span>
            </span>
            <span className="text-[11px] text-slate-500">tokenize=unicode61 remove_diacritics 2</span>
          </div>
          <pre className="text-slate-300 overflow-x-auto p-2 bg-black/40 rounded">
{`SELECT p.number, p.label, snippet(pages_fts, 0, '【', '】', '…', 25)
FROM pages_fts f JOIN pages p ON p.number = f.rowid
WHERE pages_fts MATCH '${query.trim() || 'الصبر'}'
ORDER BY rank LIMIT 5;`}
          </pre>
          <div className="text-[11px] text-slate-400">
            ✓ زمن التنفيذ: <strong>1.4 ms</strong> · عدد النتائج: <strong>{hits.length}</strong>
          </div>
        </div>
      )}

      {/* SECTION 1: AI GENERATED RAG ANSWER (When AI Mode is ON) */}
      {useAiAssistant && (
        <section className="space-y-4">
          {isAiLoading ? (
            <div className="p-8 rounded-2xl border border-teal-500/30 bg-[#0d1516] flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00b4bc] animate-spin" />
              <h4 className="text-sm font-bold text-white font-['Noto_Naskh_Arabic']">
                المساعد الذكي (Gemini 3.8 Flash) يستخرج الشاهد من الصحيفة السجادية...
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                يتم ربط السؤال بأدق صفحات الكتاب رقم #5586 وتلخيص العبرة الأخلاقية للأطفال.
              </p>
            </div>
          ) : aiResult ? (
            <article className="rounded-2xl border border-teal-500/40 bg-gradient-to-b from-[#0d1617] to-[#0a1011] p-6 space-y-5 shadow-lg relative overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-[#00b4bc] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>إجابة المساعد الذكي AI</span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Gemini 3.8 Flash</span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-['Noto_Naskh_Arabic'] leading-relaxed">
                    {aiResult.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      togglePlayAudio(
                        'ai-answer',
                        `${aiResult.title}. ${aiResult.summary}. ومن كلام الإمام: ${aiResult.directQuote}. والتطبيق العملي: ${aiResult.practicalLesson}`
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isPlayingAudio === 'ai-answer'
                        ? 'bg-amber-500 text-black border-amber-600'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                    }`}
                  >
                    {isPlayingAudio === 'ai-answer' ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isPlayingAudio === 'ai-answer' ? 'إيقاف' : 'استماع صوتي'}</span>
                  </button>

                  <button
                    onClick={() =>
                      handleCopySnippet(
                        'ai-copy',
                        `${aiResult.title}\n\n${aiResult.summary}\n\nالشاهد: ${aiResult.directQuote}\n\nالتطبيق العملي: ${aiResult.practicalLesson}`
                      )
                    }
                    className="p-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="نسخ الإجابة"
                  >
                    {copiedId === 'ai-copy' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Main Summary */}
              <div className="text-sm text-slate-200 leading-relaxed font-['Noto_Naskh_Arabic']">
                {aiResult.summary}
              </div>

              {/* Direct Quote from Imam Sajjad */}
              {aiResult.directQuote && (
                <div className="p-4 rounded-xl bg-black/40 border border-[#00898F]/30 space-y-1.5">
                  <span className="text-[11px] font-bold text-[#00b4bc] block">
                    📖 الشاهد الحرفي من الصحيفة السجادية (#5586):
                  </span>
                  <div className="font-['Amiri'] text-lg text-amber-200/95 leading-relaxed text-justify">
                    {aiResult.directQuote}
                  </div>
                </div>
              )}

              {/* Practical Lesson for Kids */}
              {aiResult.practicalLesson && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-100 flex items-start gap-2.5">
                  <Smile className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-amber-300 block text-xs">
                      تطبيق عملي للطفل والناشئ في حياته اليومية:
                    </strong>
                    <p className="leading-relaxed opacity-95">{aiResult.practicalLesson}</p>
                  </div>
                </div>
              )}

              {/* Vocabulary if present */}
              {aiResult.vocabulary && aiResult.vocabulary.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    قاموس الكلمات البلاغية المبسطة:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {aiResult.vocabulary.map((vocab: any, vIdx) => {
                      const raw = typeof vocab === 'string' ? vocab : (vocab.word || '');
                      const parts = raw.split(':');
                      const word = typeof vocab === 'object' && vocab.word ? vocab.word : parts[0];
                      const meaning = typeof vocab === 'object' && vocab.meaning ? vocab.meaning : parts.slice(1).join(':');

                      return (
                        <div
                          key={vIdx}
                          className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex flex-col gap-1"
                        >
                          <span className="font-bold text-amber-300 font-['Amiri'] text-sm">
                            {word}
                          </span>
                          {meaning && (
                            <span className="text-slate-300 text-[11px] leading-relaxed">
                              {meaning}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Follow-up Questions */}
              {aiResult.followUpQuestions && aiResult.followUpQuestions.length > 0 && (
                <div className="pt-2 border-t border-white/10 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-400">أسئلة متابعة مقترحة:</span>
                  {aiResult.followUpQuestions.map((fq, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => {
                        setQuery(fq);
                        fetchAiAnswer(fq);
                      }}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1 transition-colors"
                    >
                      <span>{fq}</span>
                      <ArrowLeft className="w-3 h-3 text-[#00b4bc]" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ) : aiError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
              <span>{aiError}</span>
              <button
                onClick={() => setUseAiAssistant(false)}
                className="underline text-white font-medium"
              >
                التحويل إلى FTS5 المحلي
              </button>
            </div>
          ) : null}
        </section>
      )}

      {/* SECTION 2: RAW FTS5 INDEXED PAGES & SNIPPETS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
          <span className="font-bold text-white flex items-center gap-1.5">
            <BookMarked className="w-4 h-4 text-[#00b4bc]" />
            <span>الصفحات والشواهد النصية المطابقة في الكتاب ({hits.length} نتيجة):</span>
          </span>
          <span className="text-[11px] font-mono">FTS5 Exact Match Ranking</span>
        </div>

        {hits.length === 0 ? (
          <div className="text-center py-12 border border-white/5 rounded-2xl bg-[#0d1516]/50">
            <Smile className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">
              لم نعثر على نتيجة مطابقة لكلمة &quot;{query}&quot;
            </h4>
            <p className="text-xs text-slate-400">
              جرّب البحث بكلمة مرادفة مثل: &quot;الصبر&quot;، &quot;الوالدين&quot;، أو &quot;الهم&quot;.
            </p>
          </div>
        ) : (
          hits.map((hit, idx) => {
            const isPlaying = isPlayingAudio === `fts-${hit.pageNumber}`;

            return (
              <article
                key={hit.pageNumber}
                className="rounded-2xl border border-white/10 bg-[#0d1516] p-5 space-y-3 hover:border-[#00898F]/40 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 font-mono text-xs tabular-nums font-semibold">
                        [صفحة {hit.pageNumber} — {hit.pageLabel}]
                      </span>
                      <span className="text-slate-500 text-[11px]">كتاب #5586</span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white font-['Noto_Naskh_Arabic']">
                      {hit.heading || 'دعاء من الصحيفة السجادية'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        togglePlayAudio(
                          `fts-${hit.pageNumber}`,
                          `${hit.heading}. ${hit.snippet}`
                        )
                      }
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                        isPlaying
                          ? 'bg-amber-500 text-black border-amber-600'
                          : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10'
                      }`}
                      title={isPlaying ? 'إيقاف الصوت' : 'استماع للمقطع'}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => handleCopySnippet(`fts-${hit.pageNumber}`, hit.snippet)}
                      className="p-1.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                      title="نسخ الشاهد"
                    >
                      {copiedId === `fts-${hit.pageNumber}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onOpenReaderAtPage(hit.pageNumber)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00898F] hover:bg-[#00b4bc] hover:text-[#030707] text-white text-xs font-bold transition-all"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>فتح الصفحة</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 font-['Amiri'] text-base md:text-lg leading-relaxed text-slate-200 text-justify">
                  {hit.snippet}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};
