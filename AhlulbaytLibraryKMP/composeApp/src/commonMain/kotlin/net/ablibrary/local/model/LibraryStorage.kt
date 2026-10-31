package net.ablibrary.local.model

import com.russhwolf.settings.Settings
import com.russhwolf.settings.set
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class LibraryStorage(private val settings: Settings = Settings()) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }

    companion object {
        private const val KEY_PREFS = "ahlulbayt_library_reader_prefs_v1"
        private const val KEY_BOOKMARKS = "ahlulbayt_library_bookmarks_v1"
        private const val KEY_BOOKS = "ahlulbayt_library_books_v1"
    }

    fun getPreferences(): ReadingPreferences {
        val raw = settings.getStringOrNull(KEY_PREFS) ?: return ReadingPreferences()
        return try { json.decodeFromString(raw) } catch (_: Exception) { ReadingPreferences() }
    }

    fun savePreferences(prefs: ReadingPreferences) {
        settings[KEY_PREFS] = json.encodeToString(prefs)
    }

    fun getBookmarks(): List<PageBookmark> {
        val raw = settings.getStringOrNull(KEY_BOOKMARKS) ?: return emptyList()
        return try { json.decodeFromString(raw) } catch (_: Exception) { emptyList() }
    }

    fun saveBookmarks(bookmarks: List<PageBookmark>) {
        settings[KEY_BOOKMARKS] = json.encodeToString(bookmarks)
    }

    fun addBookmark(bm: PageBookmark) {
        val list = getBookmarks().filterNot { it.bookId == bm.bookId && it.pageNumber == bm.pageNumber }
        saveBookmarks(list + bm)
    }

    fun removeBookmark(bookId: Long, pageNumber: Int) {
        val list = getBookmarks().filterNot { it.bookId == bookId && it.pageNumber == pageNumber }
        saveBookmarks(list)
    }

    fun getBooks(): List<Book> {
        val raw = settings.getStringOrNull(KEY_BOOKS) ?: return emptyList()
        return try { json.decodeFromString(raw) } catch (_: Exception) { emptyList() }
    }

    fun saveBooks(books: List<Book>) {
        settings[KEY_BOOKS] = json.encodeToString(books)
    }
}
