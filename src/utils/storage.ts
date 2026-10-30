import { INITIAL_BOOKS } from '../data/initialData';
import { Book, BookPage, PageBookmark, ReadingPreferences } from '../types/library';
import { extractTocFromPages } from './parser';
import {
  getAllBooksFromIDB,
  saveBooksToIDB,
  saveBookToIDB,
  getAllBookmarksFromIDB,
  saveBookmarksToIDB,
  getPreferencesFromIDB,
  savePreferencesToIDB,
  clearAllIDB,
} from './db';

const STORAGE_KEY_BOOKS = 'ahlulbayt_library_books_v1';
const STORAGE_KEY_BOOKMARKS = 'ahlulbayt_library_bookmarks_v1';
const STORAGE_KEY_PREFS = 'ahlulbayt_library_reader_prefs_v1';

export const DEFAULT_PREFERENCES: ReadingPreferences = {
  fontSize: 19,
  fontFamily: 'amiri',
  theme: 'dark',
  lineHeight: 2.1,
  removeTashkeel: false,
};

// In-memory cache for synchronous React render cycles
let cachedBooks: Book[] = INITIAL_BOOKS;
let cachedBookmarks: PageBookmark[] = [];
let cachedPreferences: ReadingPreferences = DEFAULT_PREFERENCES;
let hasLoadedFromStorage = false;

/**
 * Initializes cache from localStorage and seamlessly migrates/loads from IndexedDB.
 */
function initMemoryFromLocalStorage(): void {
  if (hasLoadedFromStorage || typeof window === 'undefined') return;

  try {
    const rawPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
    if (rawPrefs) {
      cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(rawPrefs) };
    }

    const rawBookmarks = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (rawBookmarks) {
      cachedBookmarks = JSON.parse(rawBookmarks);
    }

    const rawBooks = localStorage.getItem(STORAGE_KEY_BOOKS);
    if (rawBooks) {
      const parsed: Book[] = JSON.parse(rawBooks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedBooks = parsed;
      }
    }
  } catch (err) {
    console.warn('Initial localStorage read fallback:', err);
  }

  hasLoadedFromStorage = true;
}

// Initial sync from localStorage
initMemoryFromLocalStorage();

/**
 * Asynchronously loads books and bookmarks from IndexedDB.
 * Call this on app startup to guarantee unbounded storage without 5MB limits.
 */
export async function initializePersistentStorage(onBooksLoaded?: (books: Book[]) => void): Promise<{
  books: Book[];
  bookmarks: PageBookmark[];
  preferences: ReadingPreferences;
}> {
  try {
    const [idbBooks, idbBookmarks, idbPrefs] = await Promise.all([
      getAllBooksFromIDB(),
      getAllBookmarksFromIDB(),
      getPreferencesFromIDB(),
    ]);

    if (idbBooks && idbBooks.length > 0) {
      cachedBooks = idbBooks;
      if (onBooksLoaded) onBooksLoaded(idbBooks);
    } else {
      // Migrate initial or localStorage books into IndexedDB
      await saveBooksToIDB(cachedBooks);
    }

    if (idbBookmarks && idbBookmarks.length > 0) {
      cachedBookmarks = idbBookmarks;
    } else if (cachedBookmarks.length > 0) {
      await saveBookmarksToIDB(cachedBookmarks);
    }

    if (idbPrefs) {
      cachedPreferences = idbPrefs;
    } else {
      await savePreferencesToIDB(cachedPreferences);
    }
  } catch (err) {
    console.warn('initializePersistentStorage IndexedDB fallback:', err);
  }

  return {
    books: cachedBooks,
    bookmarks: cachedBookmarks,
    preferences: cachedPreferences,
  };
}

/**
 * Synchronous accessor for books (used across React components).
 */
export function loadStoredBooks(): Book[] {
  initMemoryFromLocalStorage();
  return cachedBooks;
}

/**
 * Persists books to in-memory cache, asynchronously to IndexedDB (unlimited quota),
 * and safely tries small metadata backup in localStorage without throwing QuotaExceededError.
 */
export function saveStoredBooks(books: Book[]): void {
  cachedBooks = books;

  // 1. Asynchronously persist to IndexedDB (handles large multi-volume books)
  saveBooksToIDB(books).catch((err) => {
    console.warn('Error persisting books to IndexedDB:', err);
  });

  // 2. Safe localStorage write (catches QuotaExceededError)
  try {
    // Only store metadata without full page text in localStorage to avoid QuotaExceeded
    const lightBooks = books.map((b) => ({
      ...b,
      pages: (b.pages || []).slice(0, 5), // Keep at most first 5 sample pages in localStorage
    }));
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(lightBooks));
  } catch {
    // Gracefully ignore QuotaExceededError since IndexedDB holds the full books
  }
}

export function getBookById(id: number): Book | undefined {
  return cachedBooks.find((b) => b.id === id);
}

/**
 * Merges imported pages into a book, updating memory, IndexedDB, and server.
 */
export function importPagesIntoBook(
  bookId: number,
  newPages: BookPage[],
  options?: { customTitle?: string; authorName?: string; categoryId?: number }
): Book {
  const books = [...cachedBooks];
  const bookIndex = books.findIndex((b) => b.id === bookId);

  let targetBook: Book;

  if (bookIndex >= 0) {
    targetBook = { ...books[bookIndex] };
    const existingPages = targetBook.pages || [];
    const mergedPagesMap = new Map<number, BookPage>();

    // Existing pages
    existingPages.forEach((p) => mergedPagesMap.set(p.page_number, p));
    // Overwrite or append new pages
    newPages.forEach((p) => mergedPagesMap.set(p.page_number, p));

    const finalPages = Array.from(mergedPagesMap.values()).sort(
      (a, b) => a.page_number - b.page_number
    );

    targetBook.pages = finalPages;
    targetBook.page_count = Math.max(targetBook.page_count || 0, finalPages.length);
    targetBook.is_downloaded = true;
    targetBook.toc = extractTocFromPages(finalPages);

    if (options?.customTitle?.trim()) targetBook.title = options.customTitle.trim();
    if (options?.authorName?.trim()) targetBook.author_name = options.authorName.trim();
    if (options?.categoryId) targetBook.category_id = options.categoryId;

    books[bookIndex] = targetBook;
  } else {
    // Create new book entry
    const finalPages = [...newPages].sort((a, b) => a.page_number - b.page_number);
    targetBook = {
      id: bookId,
      title: options?.customTitle || `كتاب #${bookId}`,
      volume_label: '1',
      page_count: finalPages.length,
      category_name: 'أدب وتراث محلي',
      category_id: options?.categoryId || 1,
      author_name: options?.authorName || 'مؤلف محلي',
      is_downloaded: true,
      pages: finalPages,
      toc: extractTocFromPages(finalPages),
      contributors: [
        {
          name: options?.authorName || 'مؤلف غير محدد',
          role: 'مؤلف',
        },
      ],
    };
    books.unshift(targetBook);
  }

  // Update memory & IndexedDB
  saveStoredBooks(books);
  saveBookToIDB(targetBook).catch(console.warn);

  // Sync to server disk/db in background
  try {
    fetch(`/api/books/${bookId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: targetBook.title,
        author: targetBook.author_name,
        pages: targetBook.pages,
      }),
    }).catch(() => {});
  } catch {}

  return targetBook;
}

/**
 * Resets library to default factory state.
 */
export function resetLibraryToInitial(): Book[] {
  try {
    localStorage.removeItem(STORAGE_KEY_BOOKS);
    localStorage.removeItem(STORAGE_KEY_BOOKMARKS);
    localStorage.removeItem(STORAGE_KEY_PREFS);
    clearAllIDB().catch(console.warn);
  } catch {}

  cachedBooks = INITIAL_BOOKS;
  cachedBookmarks = [];
  cachedPreferences = DEFAULT_PREFERENCES;
  saveStoredBooks(INITIAL_BOOKS);
  return INITIAL_BOOKS;
}

export function loadReadingPreferences(): ReadingPreferences {
  initMemoryFromLocalStorage();
  return cachedPreferences;
}

export function saveReadingPreferences(prefs: ReadingPreferences): void {
  cachedPreferences = prefs;
  savePreferencesToIDB(prefs).catch(console.warn);

  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch {}
}

export function loadBookmarks(): PageBookmark[] {
  initMemoryFromLocalStorage();
  return cachedBookmarks;
}

export function toggleBookmark(bookmark: PageBookmark): PageBookmark[] {
  const list = [...cachedBookmarks];
  const existingIdx = list.findIndex(
    (b) => b.bookId === bookmark.bookId && b.pageNumber === bookmark.pageNumber
  );

  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  } else {
    list.unshift(bookmark);
  }

  cachedBookmarks = list;
  saveBookmarksToIDB(list).catch(console.warn);

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(list));
  } catch {}

  return list;
}

export function updateBookmarkNote(
  bookId: number,
  pageNumber: number,
  note: string
): PageBookmark[] {
  const list = [...cachedBookmarks];
  const existingIdx = list.findIndex(
    (b) => b.bookId === bookId && b.pageNumber === pageNumber
  );

  if (existingIdx >= 0) {
    list[existingIdx] = {
      ...list[existingIdx],
      note,
    };
  } else {
    list.unshift({
      bookId,
      pageNumber,
      pageLabel: String(pageNumber),
      bookTitle: `كتاب #${bookId}`,
      createdAt: new Date().toISOString(),
      note,
    });
  }

  cachedBookmarks = list;
  saveBookmarksToIDB(list).catch(console.warn);

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(list));
  } catch {}

  return list;
}
