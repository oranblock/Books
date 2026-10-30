import { BookPage } from '../types/library';
import { stripTashkeel } from './parser';

export interface SearchHit {
  pageNumber: number;
  pageLabel: string;
  heading: string;
  snippet: string;
  rank: number;
  matchedTokens: string[];
  fullText: string;
  kidSummary?: string;
  keyLesson?: string;
}

export interface DatabaseStats {
  pageCount: number;
  totalTokens: number;
  uniqueWords: number;
  estimatedSizeKb: number;
  dbName: string;
}

/**
 * Normalizes Arabic text for FTS5 (matches unicode61 remove_diacritics 2).
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';
  return stripTashkeel(text.toLowerCase())
    .replace(/[«»"'\(\)\[\]،؛:!?؟\.\-\—\_\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes Arabic string into searchable word tokens.
 */
export function tokenizeArabic(text: string): string[] {
  const normalized = normalizeForSearch(text);
  if (!normalized) return [];
  return normalized.split(' ').filter((t) => t.length > 1);
}

/**
 * Pre-defined kid-friendly lessons for key themes in Sahifah al-Sajjadiyyah
 */
const THEMATIC_KID_INSIGHTS: Record<
  string,
  { summary: string; lesson: string; questionExample: string }
> = {
  صبر: {
    summary: 'يعلّمنا الإمام أن الصبر ليس مجرد انتظار، بل هو ثقة وطمأنينة بأن الله تعالى يرى تعبنا وسيبدل الشدة يسراً وفرجاً.',
    lesson: 'عندما تواجه صعوبة في دراستك أو تصبر على أذى، تذكر أن الصبر مفتاح الفرج ومحبوب عند الله.',
    questionExample: 'ماذا يقول الإمام عن الصبر عند المصيبة؟',
  },
  والدين: {
    summary: 'يصف الإمام الوالدين بأنهما أعظم نعمة؛ فقد تعبا وسهرا لنكبر، والدعاء لهما واجب في كل صلاة.',
    lesson: 'برّ الوالدين بالابتسامة، والحديث اللطيف، والدعاء لهما بالمغفرة وطول العمر مع العافية.',
    questionExample: 'كيف علّمنا الإمام الدعاء للوالدين؟',
  },
  رحمة: {
    summary: 'رحمة الله وسعت كل شيء، والإمام يدعو دائماً باسم الله الرحيم ليعلمنا أن نرحم الصغير والضعيف والحيوان.',
    lesson: 'من لا يرحم لا يُرحم؛ كن رحيماً بأصدقائك وإخوتك ليفيض الله عليك برحمته.',
    questionExample: 'ماذا علّمنا الإمام عن سعة رحمة الله؟',
  },
  توبة: {
    summary: 'باب الله مفتوح دائماً؛ مهما أخطأ الإنسان، فإن الله يفرح بعودة عبده المعتذر ولا يغلق بابه أبداً.',
    lesson: 'إذا أخطأت، اعترف بشجاعة واعتذر واطلب المغفرة، فالاعتذار قوة وفضيلة.',
    questionExample: 'ماذا نفعل عندما نخطئ ونريد التوبة؟',
  },
  اخلاق: {
    summary: 'دعاء مكارم الأخلاق هو دستور التعامل النبيل: أن نصل من قطعنا، ونعفو عمن ظلمنا، ونحسن لمن أساء إلينا.',
    lesson: 'الخلق الحسن هو أجمل ما يتزين به الإنسان، وهو أثقل شيء في ميزان الأعمال يوم القيامة.',
    questionExample: 'كيف أرتقي بأخلاقي وسلوكي مع الناس؟',
  },
  هم: {
    summary: 'عندما يشعر الإنسان بالضيق أو الحزن، يدعونا الإمام إلى التوجه لله باسم "يا من تحل به عقد المكاره".',
    lesson: 'لا تقلق من الغد ولا تخف، فكل همّ سينجلي بالدعاء والعمل الصالح.',
    questionExample: 'ماذا أقول عندما أشعر بالحزن أو الهم؟',
  },
  عافية: {
    summary: 'العافية في الجسد والعقل والدين هي أعظم كنز؛ والإمام يعلمنا شكر العافية وطلب دوامها.',
    lesson: 'اشكر الله على صحتك وسلامة حواسك كل صباح ومساء بمساعدة الآخرين.',
    questionExample: 'كيف نشكر نعمة العافية والصحة؟',
  },
  رزق: {
    summary: 'الرزق ليس مالاً فقط، بل هو العلم النافع، والأصدقاء الصالحون، وصحة الجسد، وراحة البال.',
    lesson: 'اسعَ واجتهد في دراستك وتوكل على الرزاق الكريم دون حسد لأحد.',
    questionExample: 'كيف نسأل الله الرزق الحلال والبركة؟',
  },
  علم: {
    summary: 'طريق العلم هو طريق الجنة، والإمام يستعيذ بالله من علم لا ينفع، ويدعو للتفقه والبصيرة.',
    lesson: 'احرص على القراءة والتعلم وسؤال أهل العلم لتنير عقلك وقلبك.',
    questionExample: 'ما هو فضل العلم في كلام أهل البيت؟',
  },
  صباح: {
    summary: 'الإمام يستقبل كل يوم جديد بالتسبيح وطلب التوفيق لعمل الخير واجتناب الشر حتى المساء.',
    lesson: 'ابدأ يومك بذكر الله والابتسامة ونية مساعدة كل من يحتاج إليك.',
    questionExample: 'ماذا ندعو عند استيقاظنا في الصباح؟',
  },
};

/**
 * Builds an in-memory inverted FTS index over book pages
 */
export class SahifaSearchEngine {
  private pages: BookPage[] = [];
  // word -> map of pageNumber -> array of word positions
  private index: Map<string, Map<number, number[]>> = new Map();
  // word -> number of occurrences
  private docFrequencies: Map<string, number> = new Map();

  constructor(pages: BookPage[]) {
    this.buildIndex(pages);
  }

  public buildIndex(pages: BookPage[]) {
    this.pages = pages;
    this.index.clear();
    this.docFrequencies.clear();

    pages.forEach((page) => {
      const fullText = `${page.heading || ''} ${page.content || ''}`;
      const tokens = tokenizeArabic(fullText);

      tokens.forEach((token, pos) => {
        if (!this.index.has(token)) {
          this.index.set(token, new Map());
        }
        const pagePositions = this.index.get(token)!;
        if (!pagePositions.has(page.page_number)) {
          pagePositions.set(page.page_number, []);
        }
        pagePositions.get(page.page_number)!.push(pos);
      });
    });

    // Compute doc frequencies
    for (const [word, postingMap] of this.index.entries()) {
      this.docFrequencies.set(word, postingMap.size);
    }
  }

  /**
   * Generates a context snippet around search hits (matching SQLite FTS5 snippet).
   */
  private generateSnippet(
    content: string,
    matchedTokens: string[],
    snippetWordCount: number = 28
  ): string {
    const rawWords = content.split(/\s+/);
    if (rawWords.length <= snippetWordCount) {
      return content;
    }

    const normalizedWords = rawWords.map((w) => normalizeForSearch(w));
    let bestStart = 0;
    let maxMatches = -1;

    // Sliding window of snippetWordCount
    for (let i = 0; i <= rawWords.length - snippetWordCount; i++) {
      let currentMatches = 0;
      for (let j = 0; j < snippetWordCount; j++) {
        const word = normalizedWords[i + j];
        if (matchedTokens.some((t) => word.includes(t) || t.includes(word))) {
          currentMatches += 1;
        }
      }
      if (currentMatches > maxMatches) {
        maxMatches = currentMatches;
        bestStart = i;
      }
    }

    const snippetSlice = rawWords.slice(bestStart, bestStart + snippetWordCount);
    let prefix = bestStart > 0 ? '… ' : '';
    let suffix = bestStart + snippetWordCount < rawWords.length ? ' …' : '';

    return prefix + snippetSlice.join(' ') + suffix;
  }

  /**
   * Queries the database matching SQLite FTS5 rank ordering.
   */
  public search(query: string, limit: number = 6): SearchHit[] {
    const cleanQ = normalizeForSearch(query);
    if (!cleanQ) return [];

    const queryTokens = tokenizeArabic(cleanQ);
    if (queryTokens.length === 0) return [];

    const pageScores: Map<
      number,
      { score: number; matchedWords: Set<string>; headingBonus: number }
    > = new Map();

    const N = Math.max(1, this.pages.length);

    queryTokens.forEach((qToken) => {
      // Find exact or stem matches in index
      for (const [indexedWord, postingMap] of this.index.entries()) {
        const isExact = indexedWord === qToken;
        const isPrefix = indexedWord.startsWith(qToken) || qToken.startsWith(indexedWord);

        if (isExact || isPrefix) {
          const docFreq = this.docFrequencies.get(indexedWord) || 1;
          const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
          const weight = isExact ? 1.0 : 0.6;

          for (const [pageNum, positions] of postingMap.entries()) {
            const tf = positions.length;
            const scoreDelta = idf * tf * weight;

            if (!pageScores.has(pageNum)) {
              pageScores.set(pageNum, {
                score: 0,
                matchedWords: new Set(),
                headingBonus: 0,
              });
            }

            const record = pageScores.get(pageNum)!;
            record.score += scoreDelta;
            record.matchedWords.add(qToken);
          }
        }
      }
    });

    // Check heading boosts
    this.pages.forEach((p) => {
      const headingNorm = normalizeForSearch(p.heading || '');
      queryTokens.forEach((qt) => {
        if (headingNorm.includes(qt)) {
          if (!pageScores.has(p.page_number)) {
            pageScores.set(p.page_number, {
              score: 0,
              matchedWords: new Set([qt]),
              headingBonus: 5.0,
            });
          } else {
            pageScores.get(p.page_number)!.headingBonus += 5.0;
          }
        }
      });
    });

    const results: SearchHit[] = [];

    // Sort by final score descending
    const sorted = Array.from(pageScores.entries())
      .map(([pageNum, data]) => ({
        pageNum,
        finalScore: data.score + data.headingBonus + data.matchedWords.size * 3.0,
        matchedWords: Array.from(data.matchedWords),
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, limit);

    sorted.forEach(({ pageNum, finalScore, matchedWords }) => {
      const page = this.pages.find((p) => p.page_number === pageNum);
      if (!page) return;

      const snippet = this.generateSnippet(
        page.content,
        matchedWords,
        28
      );

      // Find if we have a kid summary for any matched word
      let kidInsight: { summary: string; lesson: string } | undefined;
      for (const [themeKey, info] of Object.entries(THEMATIC_KID_INSIGHTS)) {
        if (
          cleanQ.includes(themeKey) ||
          matchedWords.some((w) => w.includes(themeKey)) ||
          normalizeForSearch(page.heading || '').includes(themeKey)
        ) {
          kidInsight = info;
          break;
        }
      }

      results.push({
        pageNumber: page.page_number,
        pageLabel: page.page_label,
        heading: page.heading,
        snippet,
        rank: parseFloat(finalScore.toFixed(2)),
        matchedTokens: matchedWords,
        fullText: page.content,
        kidSummary: kidInsight?.summary,
        keyLesson: kidInsight?.lesson,
      });
    });

    return results;
  }

  /**
   * Returns metadata and stats matching SQLite DB metrics.
   */
  public getStats(): DatabaseStats {
    let totalTokens = 0;
    this.pages.forEach((p) => {
      totalTokens += tokenizeArabic(p.content).length;
    });

    const uniqueWords = this.index.size;
    // Approximately 550 bytes per page + index entries
    const estimatedSizeKb = Math.round((totalTokens * 7 + uniqueWords * 15) / 1024);

    return {
      pageCount: this.pages.length,
      totalTokens,
      uniqueWords,
      estimatedSizeKb,
      dbName: 'sahifa.db (FTS5 Unicode61 Index)',
    };
  }
}

export const POPULAR_QUESTIONS = [
  { text: 'ماذا يقول الإمام عن الصبر؟', keyword: 'الصبر' },
  { text: 'دعاء بر الوالدين والإحسان إليهما', keyword: 'الوالدين' },
  { text: 'ماذا أفعل عندما أشعر بالخوف أو الهم؟', keyword: 'الهموم' },
  { text: 'كيف طلب الإمام التوبة والمغفرة؟', keyword: 'التوبة' },
  { text: 'ماذا ندعو عند الصباح والمساء؟', keyword: 'الصباح' },
  { text: 'الاستعاذة من الأخلاق السيئة والحسد', keyword: 'الأخلاق' },
  { text: 'دعاء طلب العافية وشكر الصحة', keyword: 'العافية' },
  { text: 'طلب سعة الرزق وقضاء الدين', keyword: 'الرزق' },
];
