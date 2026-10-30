import { INITIAL_BOOKS } from '../data/initialData';
import { Book, BookPage, PageBookmark, ReadingPreferences } from '../types/library';
import { extractTocFromPages } from './parser';

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

export function loadStoredBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKS);
    if (!raw) {
      saveStoredBooks(INITIAL_BOOKS);
      return INITIAL_BOOKS;
    }
    const parsed: Book[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredBooks(INITIAL_BOOKS);
      return INITIAL_BOOKS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load books from localStorage:', e);
    return INITIAL_BOOKS;
  }
}

export function saveStoredBooks(books: Book[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
  } catch (e) {
    console.error('Failed to persist books:', e);
  }
}

export function getBookById(id: number): Book | undefined {
  const books = loadStoredBooks();
  return books.find((b) => b.id === id);
}

export function importPagesIntoBook(
  bookId: number,
  newPages: BookPage[],
  options?: { customTitle?: string; authorName?: string; categoryId?: number }
): Book {
  const books = loadStoredBooks();
  let bookIndex = books.findIndex((b) => b.id === bookId);

  let targetBook: Book;

  if (bookIndex >= 0) {
    targetBook = { ...books[bookIndex] };
    const existingPages = targetBook.pages || [];
    const mergedPagesMap = new Map<number, BookPage>();

    // Put existing
    existingPages.forEach((p) => mergedPagesMap.set(p.page_number, p));
    // Overwrite/add new
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

  saveStoredBooks(books);
  return targetBook;
}

export function resetLibraryToInitial(): Book[] {
  try {
    localStorage.removeItem(STORAGE_KEY_BOOKS);
    saveStoredBooks(INITIAL_BOOKS);
    return INITIAL_BOOKS;
  } catch {
    return INITIAL_BOOKS;
  }
}

export function loadReadingPreferences(): ReadingPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFS);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveReadingPreferences(prefs: ReadingPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences:', e);
  }
}

export function loadBookmarks(): PageBookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKMARKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function toggleBookmark(bookmark: PageBookmark): PageBookmark[] {
  const list = loadBookmarks();
  const existingIdx = list.findIndex(
    (b) => b.bookId === bookmark.bookId && b.pageNumber === bookmark.pageNumber
  );

  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  } else {
    list.unshift(bookmark);
  }

  try {
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save bookmarks:', e);
  }
  return list;
}

export function updateBookmarkNote(
  bookId: number,
  pageNumber: number,
  note: string
): PageBookmark[] {
  const list = loadBookmarks();
  const target = list.find((b) => b.bookId === bookId && b.pageNumber === pageNumber);
  if (target) {
    target.note = note;
    localStorage.setItem(STORAGE_KEY_BOOKMARKS, JSON.stringify(list));
  }
  return list;
}
