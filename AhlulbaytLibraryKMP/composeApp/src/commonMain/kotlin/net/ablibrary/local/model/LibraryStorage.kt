package net.ablibrary.local.model

import app.cash.sqldelight.db.SqlDriver
import com.russhwolf.settings.Settings
import com.russhwolf.settings.set
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import net.ablibrary.local.db.DatabaseDriverFactory
import net.ablibrary.local.db.SqlDelightStorage
import net.ablibrary.local.utils.TextParser

class LibraryStorage(driver: SqlDriver? = null) {
    val sqlStorage: SqlDelightStorage? = try {
        val actualDriver = driver ?: DatabaseDriverFactory().createDriver()
        SqlDelightStorage(actualDriver)
    } catch (_: Exception) {
        null
    }

    private val settings: Settings = Settings()
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        prettyPrint = false
    }

    companion object {
        private const val KEY_PREFS = "ahlulbayt_library_reader_prefs_v1"
        private const val KEY_BOOKMARKS = "ahlulbayt_library_bookmarks_v1"
        private const val KEY_BOOKS = "ahlulbayt_library_books_v1"
        private const val KEY_BOOK_PAGES_PREFIX = "ahlulbayt_book_pages_"
    }

    // --- Preferences ---
    fun getPreferences(): ReadingPreferences {
        sqlStorage?.let { return it.getPreferences() }
        val raw = settings.getStringOrNull(KEY_PREFS) ?: return ReadingPreferences()
        return try {
            json.decodeFromString(raw)
        } catch (_: Exception) {
            ReadingPreferences()
        }
    }

    fun savePreferences(prefs: ReadingPreferences) {
        sqlStorage?.savePreferences(prefs)
        settings[KEY_PREFS] = json.encodeToString(prefs)
    }

    // --- Bookmarks ---
    fun getBookmarks(): List<PageBookmark> {
        sqlStorage?.let { return it.getBookmarks() }
        val raw = settings.getStringOrNull(KEY_BOOKMARKS) ?: return emptyList()
        return try {
            json.decodeFromString(raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun saveBookmarks(bookmarks: List<PageBookmark>) {
        if (sqlStorage != null) {
            bookmarks.forEach { sqlStorage.addBookmark(it) }
        }
        settings[KEY_BOOKMARKS] = json.encodeToString(bookmarks)
    }

    fun addBookmark(bm: PageBookmark) {
        sqlStorage?.addBookmark(bm)
        val list = getBookmarks().filterNot { it.bookId == bm.bookId && it.pageNumber == bm.pageNumber }
        settings[KEY_BOOKMARKS] = json.encodeToString(list + bm)
    }

    fun removeBookmark(bookId: Long, pageNumber: Int) {
        sqlStorage?.removeBookmark(bookId, pageNumber)
        val list = getBookmarks().filterNot { it.bookId == bookId && it.pageNumber == pageNumber }
        settings[KEY_BOOKMARKS] = json.encodeToString(list)
    }

    fun updateBookmarkNote(bookId: Long, pageNumber: Int, note: String) {
        sqlStorage?.updateBookmarkNote(bookId, pageNumber, note)
        val list = getBookmarks().map {
            if (it.bookId == bookId && it.pageNumber == pageNumber) it.copy(note = note) else it
        }
        settings[KEY_BOOKMARKS] = json.encodeToString(list)
    }

    // --- Books & Pages ---
    fun getBooks(): List<Book> {
        sqlStorage?.let {
            val list = it.getBooks()
            if (list.isNotEmpty()) return list
        }
        val raw = settings.getStringOrNull(KEY_BOOKS) ?: return emptyList()
        val books: List<Book> = try {
            json.decodeFromString(raw)
        } catch (_: Exception) {
            emptyList()
        }
        return books.map { book ->
            if (book.pages.isEmpty()) {
                val pagesKey = KEY_BOOK_PAGES_PREFIX + book.id
                val rawPages = settings.getStringOrNull(pagesKey)
                if (rawPages != null) {
                    val p: List<BookPage> = try { json.decodeFromString(rawPages) } catch (_: Exception) { emptyList() }
                    book.copy(pages = p, isDownloaded = p.isNotEmpty())
                } else book
            } else book
        }
    }

    fun saveBooks(books: List<Book>) {
        sqlStorage?.saveBooks(books)

        val lightBooks = books.map { b ->
            if (b.pages.isNotEmpty()) {
                val pagesKey = KEY_BOOK_PAGES_PREFIX + b.id
                try {
                    settings[pagesKey] = json.encodeToString(b.pages)
                } catch (_: Exception) {}
            }
            b.copy(
                pages = b.pages.take(3),
                pageCount = b.pages.size.takeIf { it > 0 } ?: b.pageCount,
                isDownloaded = b.pages.isNotEmpty() || b.isDownloaded
            )
        }
        settings[KEY_BOOKS] = json.encodeToString(lightBooks)
    }

    fun importPagesIntoBook(
        bookId: Long,
        newPages: List<BookPage>,
        customTitle: String? = null,
        author: String? = null,
        categoryId: Long? = null
    ): Book {
        sqlStorage?.let {
            return it.importPagesIntoBook(bookId, newPages, customTitle, author, categoryId)
        }

        val allBooks = getBooks().toMutableList()
        val existingIndex = allBooks.indexOfFirst { it.id == bookId }
        val sortedPages = newPages.sortedBy { it.pageNumber }
        val generatedToc = TextParser.extractToc(sortedPages)

        val targetBook: Book = if (existingIndex != -1) {
            val ex = allBooks[existingIndex]
            ex.copy(
                title = customTitle?.trim()?.ifBlank { ex.title } ?: ex.title,
                authorName = author?.trim()?.ifBlank { ex.authorName } ?: ex.authorName,
                categoryId = categoryId ?: ex.categoryId,
                pages = sortedPages,
                pageCount = sortedPages.size,
                toc = if (generatedToc.isNotEmpty()) generatedToc else ex.toc,
                isDownloaded = true
            )
        } else {
            Book(
                id = bookId,
                title = customTitle?.trim()?.ifBlank { "كتاب #$bookId" } ?: "كتاب #$bookId",
                authorName = author?.trim()?.ifBlank { "مؤلف محلي" } ?: "مؤلف محلي",
                volumeLabel = "1",
                pageCount = sortedPages.size,
                categoryName = "أدب وتراث محلي",
                categoryId = categoryId ?: 1L,
                isDownloaded = true,
                pages = sortedPages,
                toc = generatedToc
            )
        }

        if (existingIndex != -1) {
            allBooks[existingIndex] = targetBook
        } else {
            allBooks.add(0, targetBook)
        }

        val pagesKey = KEY_BOOK_PAGES_PREFIX + bookId
        try {
            settings[pagesKey] = json.encodeToString(sortedPages)
        } catch (_: Exception) {}

        saveBooks(allBooks)
        return targetBook
    }

    fun getFullBook(bookId: Long): Book? {
        sqlStorage?.let {
            val b = it.getFullBook(bookId)
            if (b != null) return b
        }

        val b = getBooks().find { it.id == bookId } ?: return null
        if (b.pages.size >= (b.pageCount ?: 0) && b.pages.isNotEmpty()) return b

        val pagesKey = KEY_BOOK_PAGES_PREFIX + bookId
        val rawPages = settings.getStringOrNull(pagesKey) ?: return b
        val p: List<BookPage> = try { json.decodeFromString(rawPages) } catch (_: Exception) { b.pages }
        return b.copy(pages = p, pageCount = p.size)
    }

    fun searchPagesInBook(bookId: Long, query: String): List<BookPage> {
        sqlStorage?.let {
            return it.searchPagesInBook(bookId, query)
        }
        val book = getFullBook(bookId) ?: return emptyList()
        val normQ = TextParser.normalizeForSearch(query)
        return book.pages.filter {
            TextParser.normalizeForSearch(it.content).contains(normQ) ||
                    TextParser.normalizeForSearch(it.heading).contains(normQ)
        }
    }

    fun clearAll() {
        sqlStorage?.clearAll()
        val books = getBooks()
        books.forEach { b ->
            settings.remove(KEY_BOOK_PAGES_PREFIX + b.id)
        }
        settings.remove(KEY_BOOKS)
        settings.remove(KEY_BOOKMARKS)
        settings.remove(KEY_PREFS)
    }
}
