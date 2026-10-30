import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  parseJsonContentsToPages,
  parseAnyTextOrJsonToPages,
  formatDeathYear,
} from './src/utils/parser';
import { INITIAL_BOOKS, INITIAL_CATEGORIES } from './src/data/initialData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Directories for local offline database and book storage
const BACKEND_DIR = path.resolve(__dirname, 'backend');
const DB_DIR = path.resolve(BACKEND_DIR, 'db');
const BOOKS_DIR = path.resolve(BACKEND_DIR, 'books');
const BOOK_JSON_DIR = path.resolve(BOOKS_DIR, 'book');
const ABX_DIR = path.resolve(BOOKS_DIR, 'abx');
const APP_DB_PATH = path.resolve(DB_DIR, 'app.db');

// Ensure local directories exist
fs.mkdirSync(DB_DIR, { recursive: true });
fs.mkdirSync(BOOK_JSON_DIR, { recursive: true });
fs.mkdirSync(ABX_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// SQLite Database (node:sqlite DatabaseSync) - Local Catalog & Search Engine
// ---------------------------------------------------------------------------
let db: DatabaseSync;
let isNormalizedDb = false;

try {
  db = new DatabaseSync(APP_DB_PATH);
  initDatabase(db);
  console.log(`[SQLite] Database successfully loaded at ${APP_DB_PATH} (normalized schema: ${isNormalizedDb})`);
} catch (err) {
  console.error('[SQLite] Error opening database, using in-memory SQLite:', err);
  db = new DatabaseSync(':memory:');
  initDatabase(db);
}

function initDatabase(sqliteDb: DatabaseSync) {
  // Always ensure 'pages' and 'local_pages' tables exist for local downloaded pages
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      book_id INTEGER,
      page_number INTEGER,
      page_label TEXT,
      heading TEXT,
      content TEXT,
      PRIMARY KEY (book_id, page_number)
    );

    CREATE TABLE IF NOT EXISTS local_pages (
      book_id INTEGER,
      page_number INTEGER,
      page_label TEXT,
      heading TEXT,
      content TEXT,
      PRIMARY KEY (book_id, page_number)
    );

    CREATE INDEX IF NOT EXISTS idx_pages_book ON pages(book_id);
    CREATE INDEX IF NOT EXISTS idx_local_pages_book ON local_pages(book_id);
  `);

  // Detect whether book_translations exists (the real 30 MB 19,049-book schema)
  const checkTable = sqliteDb
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='book_translations'")
    .get();

  if (checkTable) {
    isNormalizedDb = true;
    console.log('[SQLite] Detected normalized ABLibrary database schema with book_translations');
    return;
  }

  // Fallback to standalone flat schema
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      book_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      author_name TEXT,
      category_id INTEGER,
      category_name TEXT,
      page_count INTEGER DEFAULT 0,
      volume_label TEXT,
      volume_number INTEGER DEFAULT 1,
      print_year INTEGER,
      died_at_micros TEXT,
      death_display TEXT,
      publisher_name TEXT,
      printery TEXT,
      abstract TEXT,
      is_downloaded INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_books_cat ON books(category_id);
  `);

  // Seed initial categories if empty
  const catCountRow = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM categories').get() as any;
  if (!catCountRow || catCountRow.cnt === 0) {
    const insertCat = sqliteDb.prepare(
      'INSERT INTO categories (id, name, book_count) VALUES (?, ?, ?)'
    );
    for (const cat of INITIAL_CATEGORIES) {
      insertCat.run(cat.id, cat.name, cat.book_count || 0);
    }
  }

  // Seed initial books if empty
  const bookCountRow = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM books').get() as any;
  if (!bookCountRow || bookCountRow.cnt === 0) {
    const insertBook = sqliteDb.prepare(`
      INSERT INTO books (
        id, title, author_name, category_id, category_name, page_count,
        volume_label, volume_number, print_year, died_at_micros, death_display,
        publisher_name, printery, abstract, is_downloaded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPage = sqliteDb.prepare(`
      INSERT OR REPLACE INTO pages (book_id, page_number, page_label, heading, content)
      VALUES (?, ?, ?, ?, ?)
    `);

    sqliteDb.exec('BEGIN TRANSACTION');
    try {
      for (const b of INITIAL_BOOKS) {
        insertBook.run(
          b.id,
          b.title,
          b.author_name || null,
          b.category_id || 1,
          b.category_name || 'عام',
          b.page_count || (b.pages ? b.pages.length : 0),
          b.volume_label || '1',
          b.volume_number || 1,
          b.print_year || null,
          b.author_died ? String(b.author_died) : null,
          b.death_display || formatDeathYear(b.author_died, b.author_era),
          b.publisher_name || null,
          b.printery || null,
          b.abstract || null,
          b.is_downloaded ? 1 : 0
        );

        // Seed pages if present
        if (b.pages && b.pages.length > 0) {
          for (const p of b.pages) {
            insertPage.run(b.id, p.page_number, p.page_label, p.heading || null, p.content);
          }
          // Also save to disk
          try {
            fs.writeFileSync(
              path.join(BOOK_JSON_DIR, `${b.id}.json`),
              JSON.stringify(b.pages, null, 2),
              'utf-8'
            );
          } catch {}
        }
      }
      sqliteDb.exec('COMMIT');
    } catch (err) {
      sqliteDb.exec('ROLLBACK');
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Gemini AI Initialization
// ---------------------------------------------------------------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// AI Health & Status check
app.get('/api/ai/status', (_req, res) => {
  res.json({
    available: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

/**
 * Resilient Gemini API call with retries and fallback to gemini-3.1-flash-lite
 */
async function callGeminiWithRetry<T>(
  action: (modelName: string) => Promise<T>,
  primaryModel: string = 'gemini-3.8-flash',
  fallbackModel: string = 'gemini-3.1-flash-lite',
  maxRetries: number = 2
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await action(primaryModel);
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      const isTransient =
        errMsg.includes('fetch failed') ||
        errMsg.includes('SocketError') ||
        errMsg.includes('other side closed') ||
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('ECONNRESET') ||
        errMsg.includes('ETIMEDOUT') ||
        errMsg.includes('UND_ERR_SOCKET');

      console.warn(`[Gemini API Attempt ${attempt}/${maxRetries} with ${primaryModel}]: ${errMsg}`);

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        continue;
      }
      break;
    }
  }

  console.warn(`[Gemini API Fallback -> ${fallbackModel}] due to: ${lastError?.message || lastError}`);
  try {
    return await action(fallbackModel);
  } catch (fallbackErr: any) {
    console.error(`[Gemini Fallback ${fallbackModel} failed]:`, fallbackErr?.message || fallbackErr);
    throw lastError || fallbackErr;
  }
}

// ---------------------------------------------------------------------------
// Catalog & SQLite API Endpoints
// ---------------------------------------------------------------------------

// GET /api/categories - list all categories
app.get('/api/categories', (_req, res) => {
  try {
    if (isNormalizedDb) {
      const rows = db
        .prepare(`
          SELECT 
            c.id,
            COALESCE(ct.name, 'قسم ' || c.id) AS name,
            COALESCE(counts.cnt, 0) AS book_count
          FROM categories c
          LEFT JOIN category_translations ct ON ct.category_id = c.id AND (ct.language_id = 1 OR ct.language_id = '1')
          LEFT JOIN (
            SELECT category_id, COUNT(*) AS cnt FROM book_categories GROUP BY category_id
          ) counts ON counts.category_id = c.id
          ORDER BY c.id ASC
        `)
        .all();
      res.json(rows);
    } else {
      const rows = db.prepare('SELECT * FROM categories ORDER BY id ASC').all();
      res.json(rows);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message, fallback: INITIAL_CATEGORIES });
  }
});

// GET /api/books - list books with pagination, search, category filter, and offline status
app.get('/api/books', (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const categoryId = req.query.category_id ? parseInt(String(req.query.category_id), 10) : 0;
    const offlineOnly = req.query.offline_only === 'true' || req.query.offline_only === '1';
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));
    const offset = (page - 1) * limit;

    if (isNormalizedDb) {
      let whereClause = ' WHERE 1=1';
      const params: any[] = [];

      if (q) {
        whereClause += ' AND (bt.title LIKE ? OR auth.author_name LIKE ? OR bt.abstract LIKE ? OR CAST(b.id AS TEXT) = ?)';
        const like = `%${q}%`;
        params.push(like, like, like, q);
      }

      if (categoryId > 0) {
        whereClause += ' AND bc.category_id = ?';
        params.push(categoryId);
      }

      if (offlineOnly) {
        whereClause += ' AND (EXISTS (SELECT 1 FROM pages p WHERE p.book_id = b.id) OR EXISTS (SELECT 1 FROM local_pages lp WHERE lp.book_id = b.id))';
      }

      // Count query
      const countSql = `
        SELECT COUNT(DISTINCT b.id) AS count
        FROM books b
        LEFT JOIN book_translations bt ON bt.book_id = b.id AND (bt.language_id = 1 OR bt.language_id = '1')
        LEFT JOIN (
          SELECT bcon.book_id, ct.name AS author_name
          FROM book_contributors bcon
          JOIN contributor_translations ct ON ct.contributor_id = bcon.contributor_id AND (ct.language_id = 1 OR ct.language_id = '1')
          GROUP BY bcon.book_id
        ) auth ON auth.book_id = b.id
        LEFT JOIN book_categories bc ON bc.book_id = b.id
        ${whereClause}
      `;
      const countRow = db.prepare(countSql).get(...params) as any;
      const total = countRow ? countRow.count : 0;

      // Select items
      const selectSql = `
        SELECT 
          b.id,
          COALESCE(bt.title, 'كتاب #' || b.id) AS title,
          COALESCE(auth.author_name, '') AS author_name,
          auth.author_era,
          auth.author_died,
          bc.category_id,
          COALESCE(catt.name, 'عام') AS category_name,
          COALESCE(b.page_count, 0) AS page_count,
          b.volume_label,
          b.volume_number,
          b.print_year,
          bt.abstract,
          CASE 
            WHEN EXISTS (SELECT 1 FROM pages p WHERE p.book_id = b.id) THEN 1
            WHEN EXISTS (SELECT 1 FROM local_pages lp WHERE lp.book_id = b.id) THEN 1
            ELSE 0 
          END AS is_downloaded
        FROM books b
        LEFT JOIN book_translations bt ON bt.book_id = b.id AND (bt.language_id = 1 OR bt.language_id = '1')
        LEFT JOIN (
          SELECT 
            bcon.book_id, 
            ct.name AS author_name,
            ct.era AS author_era,
            ct.died_at AS author_died
          FROM book_contributors bcon
          JOIN contributor_translations ct ON ct.contributor_id = bcon.contributor_id AND (ct.language_id = 1 OR ct.language_id = '1')
          GROUP BY bcon.book_id
        ) auth ON auth.book_id = b.id
        LEFT JOIN book_categories bc ON bc.book_id = b.id
        LEFT JOIN category_translations catt ON catt.category_id = bc.category_id AND (catt.language_id = 1 OR catt.language_id = '1')
        ${whereClause}
        ORDER BY is_downloaded DESC, b.id ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const rows = db.prepare(selectSql).all(...params) as any[];

      const mapped = rows.map((b) => ({
        ...b,
        is_downloaded: Boolean(b.is_downloaded),
        death_display: formatDeathYear(b.author_died, b.author_era),
      }));

      res.json({
        books: mapped,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
      return;
    }

    // Flat standalone schema query
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params: any[] = [];

    if (q) {
      sql += ' AND (title LIKE ? OR author_name LIKE ? OR abstract LIKE ? OR CAST(id AS TEXT) = ?)';
      const like = `%${q}%`;
      params.push(like, like, like, q);
    }

    if (categoryId > 0) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }

    if (offlineOnly) {
      sql += ' AND is_downloaded = 1';
    }

    // Count query
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countRow = db.prepare(countSql).get(...params) as any;
    const total = countRow ? countRow.count : 0;

    sql += ' ORDER BY is_downloaded DESC, id ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const books = db.prepare(sql).all(...params) as any[];

    // Map boolean is_downloaded
    const mapped = books.map((b) => ({
      ...b,
      is_downloaded: Boolean(b.is_downloaded),
      death_display: b.death_display || formatDeathYear(b.died_at_micros, b.author_era),
    }));

    res.json({
      books: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:bookId - get single book with its pages
app.get('/api/books/:bookId', (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    let book: any = null;

    if (isNormalizedDb) {
      const selectSql = `
        SELECT 
          b.id,
          COALESCE(bt.title, 'كتاب #' || b.id) AS title,
          COALESCE(auth.author_name, '') AS author_name,
          auth.author_era,
          auth.author_died,
          bc.category_id,
          COALESCE(catt.name, 'عام') AS category_name,
          COALESCE(b.page_count, 0) AS page_count,
          b.volume_label,
          b.volume_number,
          b.print_year,
          bt.abstract
        FROM books b
        LEFT JOIN book_translations bt ON bt.book_id = b.id AND (bt.language_id = 1 OR bt.language_id = '1')
        LEFT JOIN (
          SELECT 
            bcon.book_id, 
            ct.name AS author_name,
            ct.era AS author_era,
            ct.died_at AS author_died
          FROM book_contributors bcon
          JOIN contributor_translations ct ON ct.contributor_id = bcon.contributor_id AND (ct.language_id = 1 OR ct.language_id = '1')
          GROUP BY bcon.book_id
        ) auth ON auth.book_id = b.id
        LEFT JOIN book_categories bc ON bc.book_id = b.id
        LEFT JOIN category_translations catt ON catt.category_id = bc.category_id AND (catt.language_id = 1 OR catt.language_id = '1')
        WHERE b.id = ?
      `;
      book = db.prepare(selectSql).get(bookId) as any;
      if (book) {
        book.death_display = formatDeathYear(book.author_died, book.author_era);
      }
    } else {
      book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as any;
      if (book) {
        book.death_display = book.death_display || formatDeathYear(book.died_at_micros, book.author_era);
      }
    }

    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    // Query pages from database or disk
    let pages = db
      .prepare('SELECT page_number, page_label, heading, content FROM pages WHERE book_id = ? ORDER BY page_number ASC')
      .all(bookId) as any[];

    if (pages.length === 0) {
      try {
        pages = db
          .prepare('SELECT page_number, page_label, heading, content FROM local_pages WHERE book_id = ? ORDER BY page_number ASC')
          .all(bookId) as any[];
      } catch {}
    }

    if (pages.length === 0) {
      // Check disk cache
      const diskPath = path.join(BOOK_JSON_DIR, `${bookId}.json`);
      if (fs.existsSync(diskPath)) {
        try {
          const raw = fs.readFileSync(diskPath, 'utf-8');
          pages = JSON.parse(raw);
        } catch {}
      }
    }

    res.json({
      ...book,
      is_downloaded: pages.length > 0 || Boolean(book.is_downloaded),
      pages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:bookId/pages - retrieve pages only
app.get('/api/books/:bookId/pages', (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    let pages = db
      .prepare('SELECT page_number, page_label, heading, content FROM pages WHERE book_id = ? ORDER BY page_number ASC')
      .all(bookId) as any[];

    if (pages.length > 0) {
      res.json({ bookId, count: pages.length, pages });
      return;
    }

    try {
      pages = db
        .prepare('SELECT page_number, page_label, heading, content FROM local_pages WHERE book_id = ? ORDER BY page_number ASC')
        .all(bookId) as any[];
      if (pages.length > 0) {
        res.json({ bookId, count: pages.length, pages });
        return;
      }
    } catch {}

    const diskPath = path.join(BOOK_JSON_DIR, `${bookId}.json`);
    if (fs.existsSync(diskPath)) {
      const raw = fs.readFileSync(diskPath, 'utf-8');
      const diskPages = JSON.parse(raw);
      res.json({ bookId, count: diskPages.length, pages: diskPages });
      return;
    }

    res.status(404).json({ error: 'Pages not found for this book' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/books/:bookId/pages - save pages to SQLite and disk
app.post('/api/books/:bookId/pages', (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    const { pages, title, author } = req.body;

    if (!Array.isArray(pages) || pages.length === 0) {
      res.status(400).json({ error: 'Pages array is required' });
      return;
    }

    // Save to disk file
    const diskPath = path.join(BOOK_JSON_DIR, `${bookId}.json`);
    fs.writeFileSync(diskPath, JSON.stringify(pages, null, 2), 'utf-8');

    // Save to SQLite with a high-performance transaction
    const insertPage = db.prepare(`
      INSERT OR REPLACE INTO pages (book_id, page_number, page_label, heading, content)
      VALUES (?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      for (const p of pages) {
        insertPage.run(
          bookId,
          p.page_number,
          String(p.page_label || p.page_number),
          p.heading || null,
          p.content || ''
        );
      }
      db.exec('COMMIT');
    } catch (insertErr) {
      db.exec('ROLLBACK');
      throw insertErr;
    }

    // Also update local_pages table in a transaction if it exists
    try {
      const insertLocal = db.prepare(`
        INSERT OR REPLACE INTO local_pages (book_id, page_number, page_label, heading, content)
        VALUES (?, ?, ?, ?, ?)
      `);
      db.exec('BEGIN TRANSACTION');
      try {
        for (const p of pages) {
          insertLocal.run(
            bookId,
            p.page_number,
            String(p.page_label || p.page_number),
            p.heading || null,
            p.content || ''
          );
        }
        db.exec('COMMIT');
      } catch (localTxErr) {
        db.exec('ROLLBACK');
      }
    } catch {}

    // Update or insert book record
    if (!isNormalizedDb) {
      const exists = db.prepare('SELECT id FROM books WHERE id = ?').get(bookId);
      if (exists) {
        db.prepare(`
          UPDATE books SET
            page_count = ?,
            is_downloaded = 1
          WHERE id = ?
        `).run(pages.length, bookId);
      } else {
        db.prepare(`
          INSERT INTO books (id, title, author_name, category_id, category_name, page_count, is_downloaded)
          VALUES (?, ?, ?, 1, 'كتب محلية ومستوردة', ?, 1)
        `).run(bookId, title || `كتاب #${bookId}`, author || 'مؤلف غير محدد', pages.length);
      }
    } else {
      try {
        db.prepare('UPDATE books SET page_count = ? WHERE id = ?').run(pages.length, bookId);
      } catch {}
    }

    res.json({ success: true, bookId, savedCount: pages.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI RAG Assistant Endpoint
// ---------------------------------------------------------------------------
app.post('/api/ai/ask', async (req, res) => {
  const { question, contextPages, targetAudience = 'kids' } = req.body;

  if (!question || typeof question !== 'string') {
    res.status(400).json({ error: 'السؤال مطلوب' });
    return;
  }

  const contextText = Array.isArray(contextPages) && contextPages.length > 0
    ? contextPages
        .slice(0, 4)
        .map(
          (p: any) =>
            `--- [صفحة ${p.pageNumber || p.page_number} - ${p.heading || 'دعاء'}] ---\n${String(p.content || p.text || '').slice(0, 1500)}`
        )
        .join('\n\n')
    : 'نصوص الصحيفة السجادية وأدعية أهل البيت عليهم السلام.';

  const isKidMode = targetAudience === 'kids';

  const systemInstruction = isKidMode
    ? `أنت "المعلم القرآني والسجادي اللطيف للأطفال والناشئة" (Child-friendly Ahlulbayt Spiritual Guide).
مهمتك:
1. الإجابة عن سؤال الطفل أو الناشئة بأسلوب دافئ، مشوق، ومبسط يزرع في قلبه المحبة والسكينة والرحمة.
2. الاستناد المباشر إلى نصوص الصحيفة السجادية المرفقة في السياق (دعاء الإمام علي بن الحسين زين العابدين ع).
3. استخراج اقتباس حرفي دقيق من كلام الإمام بين قوسين «...».
4. تبسيط معاني الكلمات الصعبة باللغة العربية الفصحى الجميلة.
5. تقديم تطبيق عملي وسلوكي في حياة الطفل اليومية (في المدرسة، مع الوالدين، مع الإخوة).
6. تجنب أي ألفاظ معقدة أو فلسفية جافة.`
    : `أنت باحث ومحقق متخصص في تراث أهل البيت عليهم السلام وعلوم الصحيفة السجادية.
أجب عن السؤال بدقة استناداً إلى النصوص المرفقة، وبيّن المضامين التوحيدية والأخلاقية، واذكر أرقام الصفحات والشواهد النصية.`;

  const userPrompt = `السؤال المطروح:
"${question}"

السياق المسترجع من الصحيفة السجادية (#5586) وأمهات المصادر:
${contextText}

المطلوب: قدّم الإجابة المنظمة والموثقة بصيغة JSON طبقاً للـ Schema المحددة.`;

  try {
    const response = await callGeminiWithRetry(async (model) => {
      return await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            required: ['title', 'summary', 'directQuote', 'practicalLesson'],
            properties: {
              title: {
                type: Type.STRING,
                description: 'عنوان جذاب ومناسب للإجابة',
              },
              summary: {
                type: Type.STRING,
                description: 'شرح مبسط ودافئ يجيب عن السؤال مباشرة للأطفال والناشئة',
              },
              directQuote: {
                type: Type.STRING,
                description: 'اقتباس حرفي مباشر من كلام الإمام زين العابدين (ع) في الصحيفة السجادية مع ذكر رقم الصفحة إن أمكن',
              },
              practicalLesson: {
                type: Type.STRING,
                description: 'تطبيق عملي أو تدريب سلوكي يومي للطفل في المدرسة أو مع العائلة',
              },
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                  },
                },
                description: 'معاني الكلمات البلاغية الصعبة إن وجدت في الاقتباس',
              },
              followUpQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'سؤالان إضافيان لاستكشاف جوانب أخرى من أدعية الإمام',
              },
            },
          },
        },
      });
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء معالجة السؤال بواسطة الذكاء الاصطناعي',
      fallbackNotice: 'يمكنك مواصلة استخدام الفهرس المحلي FTS5 المستقل تماماً دون الحاجة لاتصال خارجي.',
    });
  }
});

// Explain page endpoint
app.post('/api/ai/explain-page', async (req, res) => {
  const { pageNumber, heading, content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'محتوى الصفحة مطلوب' });
    return;
  }

  const cleanContent = String(content).slice(0, 3000);

  const prompt = `اشرح هذه الصفحة من الصحيفة السجادية للأطفال والعائلة:
العنوان: ${heading || 'دعاء'}
رقم الصفحة: ${pageNumber}
النص:
${cleanContent}

المطلوب:
1. ما الفكرة الجوهرية والروحية لهذا الدعاء؟ (فقرتان واضحتان بلغة رقيقة ومؤثرة)
2. درس عملي للطفل في حياته اليومية.
3. ثلاثة مفردات لغوية بلاغية مع شرحها الميسر.`;

  try {
    const response = await callGeminiWithRetry(async (model) => {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'أنت معلم تربوي ومرشد روحي يشرح أدعية الصحيفة السجادية بأسلوب تربوي لطيف وملهم للأطفال والعائلات.',
        },
      });
    });

    res.json({
      success: true,
      explanation: response.text || 'تم استخراج الشرح بنجاح.',
    });
  } catch (error: any) {
    console.error('Gemini Explain Error:', error);
    res.json({
      success: true,
      fallbackUsed: true,
      explanation: `📖 **تأملات في هذا الدعاء المبارك (صفحة ${pageNumber})**:
• **المعنى العام**: يتناول هذا الدعاء الجليل موضوع «${heading || 'التضرع والافتقار إلى الله تعالى'}»، ليعلمنا أن اللجوء إلى الله بالدعاء هو سر الطمأنينة وراحة النفس في كل الأوقات.
• **درس للطفل**: عندما تشعر بأي ضيق أو ترغب في التوفيق في دراستك وحياتك، ارفع يديك إلى الله واطلب منه العون بيقين ومحبة.
• **توجيه عملي**: داوم على قراءة مقطع من هذا الدعاء المبارك، واشكر الله كل يوم على نعمه الكثيرة.`,
    });
  }
});

// ---------------------------------------------------------------------------
// Single-Book On-Demand Remote Fetch Endpoint (Connect-RPC JSON + Details attachment)
// ---------------------------------------------------------------------------
app.post('/api/books/:bookId/fetch-remote', async (req, res) => {
  const bookId = req.params.bookId;
  const rpcHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/156.0.0.0 Mobile Safari/537.36',
    Origin: 'https://ablibrary.net',
    Referer: 'https://ablibrary.net/',
    'Content-Type': 'application/json',
    'Connect-Protocol-Version': '1',
  };

  const triedLog: string[] = [];

  // Helper to save downloaded pages to disk & SQLite
  const saveFetchedPages = (pages: any[]) => {
    try {
      const bId = parseInt(bookId, 10);
      if (!isNaN(bId) && pages.length > 0) {
        fs.writeFileSync(
          path.join(BOOK_JSON_DIR, `${bId}.json`),
          JSON.stringify(pages, null, 2),
          'utf-8'
        );
        const insertPage = db.prepare(`
          INSERT OR REPLACE INTO pages (book_id, page_number, page_label, heading, content)
          VALUES (?, ?, ?, ?, ?)
        `);
        db.exec('BEGIN TRANSACTION');
        try {
          for (const p of pages) {
            insertPage.run(
              bId,
              p.page_number,
              String(p.page_label || p.page_number),
              p.heading || null,
              p.content || ''
            );
          }
          db.exec('COMMIT');
        } catch (txErr) {
          db.exec('ROLLBACK');
          throw txErr;
        }

        try {
          const insertLocal = db.prepare(`
            INSERT OR REPLACE INTO local_pages (book_id, page_number, page_label, heading, content)
            VALUES (?, ?, ?, ?, ?)
          `);
          db.exec('BEGIN TRANSACTION');
          try {
            for (const p of pages) {
              insertLocal.run(
                bId,
                p.page_number,
                String(p.page_label || p.page_number),
                p.heading || null,
                p.content || ''
              );
            }
            db.exec('COMMIT');
          } catch (localTxErr) {
            db.exec('ROLLBACK');
          }
        } catch {}

        if (!isNormalizedDb) {
          db.prepare('UPDATE books SET page_count = ?, is_downloaded = 1 WHERE id = ?').run(
            pages.length,
            bId
          );
        } else {
          try {
            db.prepare('UPDATE books SET page_count = ? WHERE id = ?').run(pages.length, bId);
          } catch {}
        }
      }
    } catch (saveErr) {
      console.warn('Failed to cache fetched pages:', saveErr);
    }
  };

  // Step 1: Call BookService/Contents with string and int id
  const contentsUrl =
    'https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Contents';

  for (const payload of [{ bookId: String(bookId) }, { id: String(bookId) }]) {
    try {
      const response = await fetch(contentsUrl, {
        method: 'POST',
        headers: rpcHeaders,
        body: JSON.stringify(payload),
      });

      triedLog.push(`POST BookService/Contents ${JSON.stringify(payload)} -> ${response.status}`);
      if (response.ok) {
        const data: any = await response.json();
        const pages = parseJsonContentsToPages(data);
        if (pages.length > 0) {
          saveFetchedPages(pages);
          res.json({
            status: 'ok',
            method: 'BookService/Contents',
            pages_saved: pages.length,
            pages,
          });
          return;
        }
      } else {
        const errText = await response.text();
        triedLog.push(`Response: ${errText.slice(0, 160)}`);
      }
    } catch (e: any) {
      triedLog.push(`ERR BookService/Contents: ${e.message}`);
    }
  }

  // Step 2: Query BookService/Details with {"id": "<book_id>"} to find attachments
  const detailsUrl =
    'https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Details';
  try {
    const detailsResp = await fetch(detailsUrl, {
      method: 'POST',
      headers: rpcHeaders,
      body: JSON.stringify({ id: String(bookId) }),
    });

    triedLog.push(`POST BookService/Details -> ${detailsResp.status}`);
    if (detailsResp.ok) {
      const details: any = await detailsResp.json();
      const atts = details?.book?.attachments || [];

      // Sort attachments to prioritize text and JSON formats over binary archives
      const sortedAtts = [...atts].sort((a, b) => {
        const urlA = (a?.file?.url || '').toLowerCase();
        const urlB = (b?.file?.url || '').toLowerCase();
        const isJsonA = urlA.includes('.json') || urlA.includes('.abx');
        const isJsonB = urlB.includes('.json') || urlB.includes('.abx');
        if (isJsonA && !isJsonB) return -1;
        if (!isJsonA && isJsonB) return 1;
        return 0;
      });

      for (const att of sortedAtts) {
        const fileInfo = att?.file || {};
        const fileUrl: string = fileInfo.url || '';
        if (!fileUrl) continue;

        // Skip binary .zstd files (Bug #3 fix)
        const isZstd =
          fileUrl.endsWith('.zstd') ||
          fileUrl.includes('.zst') ||
          (fileInfo.mime_type && fileInfo.mime_type.includes('zstd'));

        if (isZstd) {
          triedLog.push(`Skipping binary compressed .zstd archive: ${fileUrl}`);
          continue;
        }

        // Only parse text-based formats (.abx, .json, .txt, .xml, or text MIME)
        const isTextCandidate =
          fileUrl.endsWith('.json') ||
          fileUrl.endsWith('.txt') ||
          fileUrl.endsWith('.abx') ||
          fileUrl.endsWith('.xml') ||
          att.context === 'BOOK_ATTACHMENT_CONTEXT_ABX' ||
          att.context === 'BOOK_ATTACHMENT_CONTEXT_TEXT' ||
          (fileInfo.mime_type && (fileInfo.mime_type.includes('json') || fileInfo.mime_type.includes('text')));

        if (!isTextCandidate && !fileUrl.includes('contents')) {
          triedLog.push(`Skipping non-text attachment candidate: ${fileUrl}`);
          continue;
        }

        try {
          const dlResp = await fetch(fileUrl, {
            headers: { 'User-Agent': rpcHeaders['User-Agent'] },
          });
          triedLog.push(`GET ${fileUrl} -> ${dlResp.status}`);

          if (dlResp.ok) {
            const textContent = await dlResp.text();
            if (textContent.length > 50) {
              const parsedResult = parseAnyTextOrJsonToPages(textContent);
              if (parsedResult.pages.length > 0) {
                saveFetchedPages(parsedResult.pages);
                res.json({
                  status: 'ok',
                  method: fileUrl,
                  format: parsedResult.detectedFormat,
                  pages_saved: parsedResult.pages.length,
                  pages: parsedResult.pages,
                });
                return;
              }
            }
          }
        } catch (dlErr: any) {
          triedLog.push(`Download error for ${fileUrl}: ${dlErr.message}`);
        }
      }
    }
  } catch (detailsErr: any) {
    triedLog.push(`ERR BookService/Details: ${detailsErr.message}`);
  }

  res.json({
    status: 'diagnostic',
    tried: triedLog,
  });
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Ahlulbayt Library Server running on http://localhost:${PORT}`);
  });
}

startServer();
