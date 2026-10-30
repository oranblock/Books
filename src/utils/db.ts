import { Book, PageBookmark, ReadingPreferences } from '../types/library';

const DB_NAME = 'ahlulbayt_library_v2';
const DB_VERSION = 1;

const STORE_BOOKS = 'books';
const STORE_BOOKMARKS = 'bookmarks';
const STORE_PREFS = 'preferences';

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and returns the IndexedDB database instance.
 * Safe for SSR / environments where indexedDB is undefined.
 */
export function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Books store (keyed by book id)
        if (!db.objectStoreNames.contains(STORE_BOOKS)) {
          db.createObjectStore(STORE_BOOKS, { keyPath: 'id' });
        }

        // Bookmarks store (keyed by composite id `${bookId}_${pageNumber}`)
        if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
          const bookmarkStore = db.createObjectStore(STORE_BOOKMARKS, {
            keyPath: 'id',
          });
          bookmarkStore.createIndex('bookId', 'bookId', { unique: false });
        }

        // Preferences store (keyed by key)
        if (!db.objectStoreNames.contains(STORE_PREFS)) {
          db.createObjectStore(STORE_PREFS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (event: Event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });

  return dbInitPromise;
}

/**
 * Loads all books from IndexedDB.
 */
export async function getAllBooksFromIDB(): Promise<Book[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        console.warn('Failed to getAll from IndexedDB books store');
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('getAllBooksFromIDB error:', err);
    return [];
  }
}

/**
 * Gets a single book by ID from IndexedDB.
 */
export async function getBookFromIDB(id: number): Promise<Book | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKS);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve(req.result || undefined);
      };

      req.onerror = () => {
        resolve(undefined);
      };
    });
  } catch {
    return undefined;
  }
}

/**
 * Saves a single book into IndexedDB.
 */
export async function saveBookToIDB(book: Book): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readwrite');
      const store = tx.objectStore(STORE_BOOKS);
      store.put(book);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveBookToIDB error:', err);
  }
}

/**
 * Batch saves books into IndexedDB.
 */
export async function saveBooksToIDB(books: Book[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKS, 'readwrite');
      const store = tx.objectStore(STORE_BOOKS);

      for (const book of books) {
        store.put(book);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveBooksToIDB error:', err);
  }
}

/**
 * Loads all bookmarks from IndexedDB.
 */
export async function getAllBookmarksFromIDB(): Promise<PageBookmark[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readonly');
      const store = tx.objectStore(STORE_BOOKMARKS);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Saves all bookmarks into IndexedDB.
 */
export async function saveBookmarksToIDB(bookmarks: PageBookmark[]): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BOOKMARKS, 'readwrite');
      const store = tx.objectStore(STORE_BOOKMARKS);

      store.clear();
      for (const bm of bookmarks) {
        const id = `${bm.bookId}_${bm.pageNumber}`;
        store.put({ ...bm, id });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('saveBookmarksToIDB error:', err);
  }
}

/**
 * Loads preferences from IndexedDB.
 */
export async function getPreferencesFromIDB(): Promise<ReadingPreferences | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PREFS, 'readonly');
      const store = tx.objectStore(STORE_PREFS);
      const req = store.get('reading_preferences');

      req.onsuccess = () => {
        resolve(req.result?.value || null);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Saves preferences into IndexedDB.
 */
export async function savePreferencesToIDB(prefs: ReadingPreferences): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREFS, 'readwrite');
      const store = tx.objectStore(STORE_PREFS);
      store.put({ key: 'reading_preferences', value: prefs });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('savePreferencesToIDB error:', err);
  }
}

/**
 * Clears all IndexedDB stores (Factory Reset).
 */
export async function clearAllIDB(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_BOOKS, STORE_BOOKMARKS, STORE_PREFS], 'readwrite');
      tx.objectStore(STORE_BOOKS).clear();
      tx.objectStore(STORE_BOOKMARKS).clear();
      tx.objectStore(STORE_PREFS).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('clearAllIDB error:', err);
  }
}
