package net.ablibrary.local.db

import app.cash.sqldelight.db.SqlDriver
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import net.ablibrary.local.model.*
import net.ablibrary.local.utils.TextParser

class SqlDelightStorage(driver: SqlDriver) {
    private val database = AhlulbaytDatabase(driver)
    private val queries = database.ahlulbaytDatabaseQueries
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    companion object {
        private const val KEY_PREFS = "ahlulbayt_library_reader_prefs_v1"
    }

    // --- Preferences ---
    fun getPreferences(): ReadingPreferences {
        val row = queries.getPreference(KEY_PREFS).executeAsOneOrNull() ?: return ReadingPreferences()
        return try {
            json.decodeFromString(row)
        } catch (_: Exception) {
            ReadingPreferences()
        }
    }

    fun savePreferences(prefs: ReadingPreferences) {
        val raw = json.encodeToString(prefs)
        queries.setPreference(KEY_PREFS, raw)
    }

    // --- Bookmarks ---
    fun getBookmarks(): List<PageBookmark> {
        return queries.selectAllBookmarks().executeAsList().map { entity ->
            PageBookmark(
                bookId = entity.bookId,
                bookTitle = entity.bookTitle,
                pageNumber = entity.pageNumber.toInt(),
                pageLabel = entity.pageLabel,
                heading = entity.heading,
                note = entity.note,
                createdAt = entity.createdAt
            )
        }
    }

    fun addBookmark(bm: PageBookmark) {
        queries.insertBookmark(
            bookId = bm.bookId,
            bookTitle = bm.bookTitle,
            pageNumber = bm.pageNumber.toLong(),
            pageLabel = bm.pageLabel,
            heading = bm.heading,
            note = bm.note,
            createdAt = bm.createdAt.ifBlank { "now" }
        )
    }

    fun removeBookmark(bookId: Long, pageNumber: Int) {
        queries.deleteBookmark(bookId, pageNumber.toLong())
    }

    fun updateBookmarkNote(bookId: Long, pageNumber: Int, note: String) {
        queries.updateBookmarkNote(note, bookId, pageNumber.toLong())
    }

    // --- Books & Pages ---
    fun getBooks(): List<Book> {
        val bookEntities = queries.selectAllBooks().executeAsList()
        return bookEntities.map { entity ->
            val pageEntities = queries.selectPagesForBook(entity.id).executeAsList()
            val pages = pageEntities.map { p ->
                BookPage(
                    id = p.id,
                    pageNumber = p.pageNumber.toInt(),
                    pageLabel = p.pageLabel,
                    heading = p.heading,
                    content = p.content
                )
            }
            val toc = TextParser.extractToc(pages)

            Book(
                id = entity.id,
                title = entity.title,
                volumeLabel = entity.volumeLabel,
                volumeNumber = entity.volumeNumber?.toInt(),
                pageCount = entity.pageCount?.toInt() ?: pages.size,
                categoryName = entity.categoryName,
                categoryId = entity.categoryId,
                authorName = entity.authorName,
                authorEra = entity.authorEra,
                deathDisplay = entity.deathDisplay,
                publisherName = entity.publisherName,
                printery = entity.printery,
                printYear = entity.printYear?.toInt(),
                abstractText = entity.abstractText,
                isDownloaded = entity.isDownloaded == 1L || pages.isNotEmpty(),
                pages = pages,
                toc = toc
            )
        }
    }

    fun saveBooks(books: List<Book>) {
        database.transaction {
            for (b in books) {
                queries.insertOrReplaceBook(
                    id = b.id,
                    title = b.title,
                    volumeLabel = b.volumeLabel,
                    volumeNumber = b.volumeNumber?.toLong(),
                    pageCount = (b.pages.size.takeIf { it > 0 } ?: b.pageCount ?: 0).toLong(),
                    categoryName = b.categoryName,
                    categoryId = b.categoryId,
                    authorName = b.authorName,
                    authorEra = b.authorEra,
                    deathDisplay = b.deathDisplay,
                    publisherName = b.publisherName,
                    printery = b.printery,
                    printYear = b.printYear?.toLong(),
                    abstractText = b.abstractText,
                    isDownloaded = if (b.isDownloaded || b.pages.isNotEmpty()) 1L else 0L
                )

                if (b.pages.isNotEmpty()) {
                    queries.deletePagesForBook(b.id)
                    for (p in b.pages) {
                        queries.insertPage(
                            bookId = b.id,
                            pageNumber = p.pageNumber.toLong(),
                            pageLabel = p.pageLabel.ifBlank { p.pageNumber.toString() },
                            heading = p.heading,
                            content = p.content
                        )
                    }
                }
            }
        }
    }

    fun importPagesIntoBook(
        bookId: Long,
        newPages: List<BookPage>,
        customTitle: String? = null,
        author: String? = null,
        categoryId: Long? = null
    ): Book {
        val existing = queries.selectBookById(bookId).executeAsOneOrNull()
        val sortedPages = newPages.sortedBy { it.pageNumber }
        val generatedToc = TextParser.extractToc(sortedPages)

        val targetTitle = customTitle?.trim()?.ifBlank { existing?.title ?: "كتاب #$bookId" }
            ?: (existing?.title ?: "كتاب #$bookId")
        val targetAuthor = author?.trim()?.ifBlank { existing?.authorName ?: "مؤلف محلي" }
            ?: (existing?.authorName ?: "مؤلف محلي")
        val targetCategory = categoryId ?: (existing?.categoryId ?: 1L)

        database.transaction {
            queries.insertOrReplaceBook(
                id = bookId,
                title = targetTitle,
                volumeLabel = existing?.volumeLabel ?: "1",
                volumeNumber = existing?.volumeNumber ?: 1L,
                pageCount = sortedPages.size.toLong(),
                categoryName = existing?.categoryName ?: "أدب وتراث محلي",
                categoryId = targetCategory,
                authorName = targetAuthor,
                authorEra = existing?.authorEra,
                deathDisplay = existing?.deathDisplay,
                publisherName = existing?.publisherName,
                printery = existing?.printery,
                printYear = existing?.printYear,
                abstractText = existing?.abstractText,
                isDownloaded = 1L
            )

            queries.deletePagesForBook(bookId)
            for (p in sortedPages) {
                queries.insertPage(
                    bookId = bookId,
                    pageNumber = p.pageNumber.toLong(),
                    pageLabel = p.pageLabel.ifBlank { p.pageNumber.toString() },
                    heading = p.heading,
                    content = p.content
                )
            }
        }

        return Book(
            id = bookId,
            title = targetTitle,
            volumeLabel = existing?.volumeLabel ?: "1",
            volumeNumber = existing?.volumeNumber?.toInt() ?: 1,
            pageCount = sortedPages.size,
            categoryName = existing?.categoryName ?: "أدب وتراث محلي",
            categoryId = targetCategory,
            authorName = targetAuthor,
            authorEra = existing?.authorEra,
            deathDisplay = existing?.deathDisplay,
            isDownloaded = true,
            pages = sortedPages,
            toc = generatedToc
        )
    }

    fun getFullBook(bookId: Long): Book? {
        val entity = queries.selectBookById(bookId).executeAsOneOrNull() ?: return null
        val pageEntities = queries.selectPagesForBook(bookId).executeAsList()
        val pages = pageEntities.map { p ->
            BookPage(
                id = p.id,
                pageNumber = p.pageNumber.toInt(),
                pageLabel = p.pageLabel,
                heading = p.heading,
                content = p.content
            )
        }
        val toc = TextParser.extractToc(pages)

        return Book(
            id = entity.id,
            title = entity.title,
            volumeLabel = entity.volumeLabel,
            volumeNumber = entity.volumeNumber?.toInt(),
            pageCount = entity.pageCount?.toInt() ?: pages.size,
            categoryName = entity.categoryName,
            categoryId = entity.categoryId,
            authorName = entity.authorName,
            authorEra = entity.authorEra,
            deathDisplay = entity.deathDisplay,
            publisherName = entity.publisherName,
            printery = entity.printery,
            printYear = entity.printYear?.toInt(),
            abstractText = entity.abstractText,
            isDownloaded = entity.isDownloaded == 1L || pages.isNotEmpty(),
            pages = pages,
            toc = toc
        )
    }

    fun searchPagesInBook(bookId: Long, query: String): List<BookPage> {
        val results = queries.searchPagesInBook(bookId, query).executeAsList()
        return results.map { p ->
            BookPage(
                id = p.id,
                pageNumber = p.pageNumber.toInt(),
                pageLabel = p.pageLabel,
                heading = p.heading,
                content = p.content
            )
        }
    }

    fun clearAll() {
        queries.clearAllData()
    }
}
