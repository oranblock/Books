import { Book, BookPage, TocItem } from '../types/library';

/**
 * Recursively extracts text and headings from an abx.pages JSON tree structure.
 * Matches the logic from the Python BookService/Details protobuf tree walk.
 */
export function walkAbxNode(node: any, outLines: string[], headings: string[], isParentHeading: boolean = false): void {
  if (!node) return;

  if (typeof node === 'object' && !Array.isArray(node)) {
    const hasHeadingProp = 'heading' in node && node.heading !== null && node.heading !== undefined;
    const isHeading = hasHeadingProp || isParentHeading;
    const t = node.text;

    if (t && typeof t === 'object' && typeof t.text === 'string') {
      const txtVal = t.text.trim();
      if (txtVal) {
        if (isHeading) {
          headings.push(txtVal);
        } else {
          outLines.push(t.text);
        }
      }
    } else if (typeof t === 'string' && t.trim()) {
      if (isHeading) {
        headings.push(t.trim());
      } else {
        outLines.push(t);
      }
    }

    // If heading is a sub-object containing children/text
    if (typeof node.heading === 'object' && node.heading !== null) {
      walkAbxNode(node.heading, outLines, headings, true);
    }

    if (Array.isArray(node.children)) {
      for (const ch of node.children) {
        walkAbxNode(ch, outLines, headings, isHeading);
      }
    }
    if (Array.isArray(node.contents)) {
      for (const ch of node.contents) {
        if (ch !== node) {
          walkAbxNode(ch, outLines, headings, false);
        }
      }
    }
  } else if (Array.isArray(node)) {
    for (const item of node) {
      walkAbxNode(item, outLines, headings, isParentHeading);
    }
  }
}

/**
 * Parses contents_full.json structure (data.abx.pages or data.pages).
 */
export function parseJsonContentsToPages(data: any): BookPage[] {
  if (!data) return [];
  const rawPages =
    data?.abx?.pages ||
    data?.abxPages?.pages ||
    data?.pages ||
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(rawPages)) return [];

  const pages: BookPage[] = [];

  for (let idx = 0; idx < rawPages.length; idx++) {
    const p = rawPages[idx];
    const num = Number(p?.number) || idx + 1;
    const label = String(p?.label ?? num);

    // If the page already has direct content string (e.g. standard json)
    if (typeof p?.content === 'string' && p.content.trim()) {
      pages.push({
        page_number: num,
        page_label: label,
        heading: String(p?.heading ?? p?.title ?? ''),
        content: p.content.trim(),
      });
      continue;
    }

    const outLines: string[] = [];
    const headings: string[] = [];
    walkAbxNode(p, outLines, headings);

    // Deduplicate consecutive identical lines while preserving order
    const deduped: string[] = [];
    let seenPrev: string | null = null;
    for (const line of outLines) {
      const cleaned = line.trimEnd();
      if (cleaned && cleaned !== seenPrev) {
        deduped.push(cleaned);
        seenPrev = cleaned;
      }
    }

    let headingStr = headings.length > 0 ? headings.join(' - ').trim() : '';
    if (!headingStr && deduped.length > 0) {
      for (const line of deduped.slice(0, 3)) {
        const tr = line.trim();
        if (
          tr.length >= 3 && tr.length <= 150 &&
          (tr.startsWith('#') || tr.startsWith('باب ') || tr.startsWith('فصل ') ||
           tr.startsWith('المقدمة') || tr.startsWith('الخاتمة') ||
           tr.includes('وكان من دعائه') || tr.includes('دعاؤه في') ||
           (tr.startsWith('*') && tr.endsWith('*')) ||
           (tr.includes('باب') && (tr.startsWith('(') || tr.startsWith('*'))))
        ) {
          headingStr = tr.replace(/^#\s*/, '').replace(/^[*—\-()\s:؛]+|[*—\-()\s:؛]+$/g, '').trim();
          break;
        }
      }
    }
    if (headingStr && deduped.length > 0 && deduped[0].trim() === headingStr) {
      deduped.shift();
    }

    pages.push({
      page_number: num,
      page_label: label,
      heading: headingStr,
      content: deduped.join('\n'),
    });
  }

  return pages;
}

/**
 * Auto-detects and parses contents_full.json, sahifa_5586.txt (===== صفحة ... =====), XML/ABX or plain text.
 */
export function parseAnyTextOrJsonToPages(rawText: string): { pages: BookPage[]; detectedFormat: string } {
  const stripped = rawText.trim();
  if (!stripped) return { pages: [], detectedFormat: 'empty' };

  // 1. JSON format (contents_full.json)
  if (stripped.startsWith('{') || stripped.startsWith('[')) {
    try {
      const data = JSON.parse(stripped);
      const pages = parseJsonContentsToPages(data);
      if (pages.length > 0) {
        return { pages, detectedFormat: 'contents_full.json (abx.pages)' };
      }
    } catch {
      // Not valid JSON, continue to next detectors
    }
  }

  // 2. sahifa_5586.txt format: ===== صفحة X — Y =====
  if (rawText.includes('===== صفحة')) {
    // Regex splits by: ===== صفحة <num> [—|- <label>] =====
    const pattern = /=====\s*صفحة\s*([^\s—\-]+)\s*(?:[—\-]\s*([^=]*?))?\s*=====/g;
    const pages: BookPage[] = [];

    const matches: { index: number; length: number; numStr: string; labelStr: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(rawText)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        numStr: (match[1] || '').trim(),
        labelStr: (match[2] || '').trim(),
      });
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startPos = current.index + current.length;
      const endPos = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
      const body = rawText.slice(startPos, endPos).trim();

      const numVal = parseInt(current.numStr, 10);
      const safeNum = Number.isFinite(numVal) ? numVal : i + 1;
      const safeLabel = current.labelStr || current.numStr || String(safeNum);

      // Check first line for an optional title/heading
      const lines = body.split('\n');
      let heading = '';
      let content = body;
      if (lines.length > 1 && (lines[0].startsWith('#') || lines[0].startsWith('•') || lines[0].startsWith('«'))) {
        heading = lines[0].replace(/^[#•\s]+/, '').trim();
        content = lines.slice(1).join('\n').trim();
      }

      pages.push({
        page_number: safeNum,
        page_label: safeLabel,
        heading,
        content,
      });
    }

    if (pages.length > 0) {
      return { pages, detectedFormat: 'sahifa_5586.txt (===== صفحة ... =====)' };
    }
  }

  // 3. XML / ABX tags: <page ...> ... </page> (from static/abx/<id>.abx)
  if (/<page/i.test(rawText)) {
    const pageRegex = /<page([^>]*)>([\s\S]*?)<\/page>/gi;
    const pages: BookPage[] = [];
    let match: RegExpExecArray | null;
    let fallbackIdx = 1;

    while ((match = pageRegex.exec(rawText)) !== null) {
      const attrs = match[1];
      const inner = match[2];

      const lblMatch = attrs.match(/label=["']([^"']*)["']/i);
      const numMatch = attrs.match(/(?:number|id)=["'](\d+)["']/i);

      const pNum = numMatch ? parseInt(numMatch[1], 10) : fallbackIdx;
      const pLbl = lblMatch ? lblMatch[1] : String(pNum);

      // Extract heading if present (<h1..6>)
      const hMatch = inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      const heading = hMatch ? hMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // Strip XML tags while keeping line breaks
      let cleanTxt = inner
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '');

      let lines = cleanTxt
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (heading && lines.length > 0 && lines[0] === heading) {
        lines = lines.slice(1);
      }

      pages.push({
        page_number: pNum,
        page_label: pLbl,
        heading,
        content: lines.join('\n'),
      });
      fallbackIdx++;
    }

    if (pages.length > 0) {
      return { pages, detectedFormat: 'XML/ABX (<page> tags)' };
    }
  }

  // 4. Plain text separated by '---' or chunked by paragraph/length
  let parts: string[] = [];
  if (rawText.includes('\n---')) {
    parts = rawText.split(/\n---\n?/).map((p) => p.trim()).filter(Boolean);
  } else {
    const lines = rawText.split(/\r?\n/);
    const buf: string[] = [];
    let length = 0;
    for (const line of lines) {
      buf.push(line);
      length += line.length;
      if (length >= 1600) {
        parts.push(buf.join('\n'));
        buf.length = 0;
        length = 0;
      }
    }
    if (buf.length > 0) {
      parts.push(buf.join('\n'));
    }
  }

  const pages: BookPage[] = parts.map((part, idx) => {
    const lines = part.split(/\r?\n/);
    let heading = '';
    let body = part;
    if (lines.length > 0 && lines[0].startsWith('#')) {
      heading = lines[0].replace(/^#+\s*/, '').trim();
      body = lines.slice(1).join('\n').trim();
    }
    return {
      page_number: idx + 1,
      page_label: String(idx + 1),
      heading,
      content: body,
    };
  });

  return { pages, detectedFormat: 'نص مجزأ (Plain Text)' };
}

/**
 * Extracts a Table of Contents from pages containing headings.
 */
export function extractTocFromPages(pages: BookPage[]): TocItem[] {
  const toc: TocItem[] = [];
  let lastHeading = '';
  for (const p of pages) {
    const h = (p.heading || '').trim();
    if (h && h !== lastHeading) {
      toc.push({
        title: h,
        page_number: p.page_number,
        page_label: p.page_label || String(p.page_number),
      });
      lastHeading = h;
    }
  }
  return toc;
}

/**
 * Converts microseconds death timestamp into formatted Hijri or CE era.
 * Matches format_death_year in offline_library.py.
 */
export function formatDeathYear(diedAtMicros?: number, eraText?: string): string {
  if (eraText && eraText.trim()) {
    const cleanEra = eraText.trim();
    return /^\d+$/.test(cleanEra) ? `${cleanEra} هـ` : cleanEra;
  }
  if (diedAtMicros === undefined || diedAtMicros === null) {
    return '';
  }
  try {
    const val = Number(diedAtMicros);
    const ceYear = 1970.0 + val / (1_000_000.0 * 86400.0 * 365.2425);
    if (ceYear <= 0) {
      return `${Math.round(Math.abs(ceYear))} ق م`;
    }
    if (ceYear < 622) {
      return `${Math.round(ceYear)} م`;
    }
    const hijriYear = Math.round((ceYear - 622.2) * (365.2422 / 354.367));
    if (hijriYear <= 0) {
      return `${Math.abs(hijriYear) + 1} ق هـ`;
    }
    return `${hijriYear} هـ`;
  } catch {
    return '';
  }
}

/**
 * Strips Arabic diacritics (tashkeel/harakat) for normalized search and clean reading.
 */
export function stripTashkeel(text: string): string {
  if (!text) return '';
  // Unicode range for Arabic tashkeel (064B - 065F) plus tatweel (0640)
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[يى]/g, 'ي');
}

/**
 * Exports book pages into the sahifa_5586.txt format: ===== صفحة X — Y =====
 */
export function exportBookAsTxt(book: Book, pages: BookPage[]): string {
  let header = `==========================================================\n`;
  header += `مكتبة أهل البيت (ع) - النسخة المحلية\n`;
  header += `كتاب: ${book.title}${book.volume_label ? ` (ج ${book.volume_label})` : ''}\n`;
  if (book.author_name) {
    header += `المؤلف: ${book.author_name} ${book.death_display ? `(${book.death_display})` : ''}\n`;
  }
  header += `معرف الكتاب: #${book.id}\n`;
  header += `إجمالي الصفحات: ${pages.length}\n`;
  header += `==========================================================\n\n`;

  const body = pages
    .map((p) => {
      const headingLine = p.heading ? `# ${p.heading}\n\n` : '';
      return `===== صفحة ${p.page_number} — ${p.page_label} =====\n${headingLine}${p.content}\n`;
    })
    .join('\n');

  return header + body;
}

/**
 * Exports book pages into contents_full.json format.
 */
export function exportBookAsJson(book: Book, pages: BookPage[]): string {
  const exportPayload = {
    book_id: book.id,
    title: book.title,
    volume_label: book.volume_label,
    author: book.author_name,
    exported_at: new Date().toISOString(),
    abx: {
      pages: pages.map((p) => ({
        number: p.page_number,
        label: p.page_label,
        heading: p.heading ? { text: { text: p.heading } } : null,
        contents: [
          {
            text: {
              text: p.content,
            },
          },
        ],
      })),
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Escapes regex special characters.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a diacritic-agnostic and safe Arabic RegExp for query highlighting.
 * Handles variations in alef (ا, أ, إ, آ), teh marbuta (ة, ه), and allows arbitrary Tashkeel between letters.
 */
export function buildArabicFuzzyRegex(query: string): RegExp | null {
  const cleanQ = query.trim();
  if (!cleanQ) return null;

  // Tashkeel / diacritics Unicode range to allow between any characters
  const diacritics = '[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED\\u0640]*';

  // Normalize query characters
  const chars = Array.from(cleanQ);
  const regexParts = chars.map((char) => {
    // If alef variant, match any alef form with optional diacritics
    if (/[اإأآ]/.test(char)) {
      return `[اإأآ]${diacritics}`;
    }
    // If teh marbuta / heh
    if (/[ةه]/.test(char)) {
      return `[ةه]${diacritics}`;
    }
    // If yeh / alef maqsura
    if (/[يىئ]/.test(char)) {
      return `[يىئ]${diacritics}`;
    }
    if (/\s+/.test(char)) {
      return `\\s+`;
    }
    return `${escapeRegex(char)}${diacritics}`;
  });

  try {
    return new RegExp(`(${regexParts.join('')})`, 'gi');
  } catch {
    return null;
  }
}
