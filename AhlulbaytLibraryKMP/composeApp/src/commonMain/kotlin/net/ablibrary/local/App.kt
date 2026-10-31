package net.ablibrary.local

import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import kotlinx.serialization.json.Json
import net.ablibrary.local.data.DefaultBooks
import net.ablibrary.local.model.*
import net.ablibrary.local.ui.*

@Composable
fun App() {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        val storage = remember { LibraryStorage() }
        var preferences by remember { mutableStateOf(storage.getPreferences()) }
        var bookmarks by remember { mutableStateOf(storage.getBookmarks()) }
        var books by remember { mutableStateOf(storage.getBooks()) }

        var activeTab by remember { mutableStateOf("catalog") }
        var selectedBook by remember { mutableStateOf<Book?>(null) }
        var selectedPage by remember { mutableStateOf(1) }
        var showBookmarksDialog by remember { mutableStateOf(false) }
        var showImportDialog by remember { mutableStateOf(false) }

        // Initial seeding if storage is empty
        LaunchedEffect(Unit) {
            if (books.isEmpty()) {
                try {
                    val json = Json { ignoreUnknownKeys = true; isLenient = true }
                    val loadedBooks = json.decodeFromString<List<Book>>(DefaultBooks.RAW_JSON)
                    if (loadedBooks.isNotEmpty()) {
                        storage.saveBooks(loadedBooks)
                        books = storage.getBooks()
                    }
                } catch (_: Exception) {}
            }
        }

        if (selectedBook != null) {
            val book = selectedBook!!
            val currentBookmark = bookmarks.find { it.bookId == book.id && it.pageNumber == selectedPage }
            val isBm = currentBookmark != null

            ReaderScreen(
                book = book,
                initialPage = selectedPage,
                preferences = preferences,
                onPreferencesChange = {
                    preferences = it
                    storage.savePreferences(it)
                },
                onBookmarkToggle = { bm ->
                    if (isBm) {
                        storage.removeBookmark(bm.bookId, bm.pageNumber)
                    } else {
                        storage.addBookmark(bm)
                    }
                    bookmarks = storage.getBookmarks()
                },
                onSaveNote = { bId, pNum, note ->
                    storage.updateBookmarkNote(bId, pNum, note)
                    bookmarks = storage.getBookmarks()
                },
                currentBookmark = currentBookmark,
                isBookmarked = isBm,
                onClose = { selectedBook = null }
            )
        } else {
            HomeScreen(
                books = books,
                bookmarkCount = bookmarks.size,
                activeTab = activeTab,
                onTabChange = { activeTab = it },
                onBookClick = { book ->
                    val full = storage.getFullBook(book.id) ?: book
                    selectedBook = full
                    selectedPage = 1
                },
                onOpenBookmarks = { showBookmarksDialog = true },
                onOpenImport = { showImportDialog = true },
                onOpenKidConsolePage = { pageNum ->
                    val sahifa = books.find { it.id == 5586L } ?: books.firstOrNull()
                    if (sahifa != null) {
                        val full = storage.getFullBook(sahifa.id) ?: sahifa
                        selectedBook = full
                        selectedPage = pageNum
                    }
                }
            )

            // Bookmarks & Notes Dialog
            if (showBookmarksDialog) {
                BookmarksDialog(
                    bookmarks = bookmarks,
                    onSelectBookmark = { bId, pNum ->
                        val b = books.find { it.id == bId }
                        if (b != null) {
                            showBookmarksDialog = false
                            val full = storage.getFullBook(b.id) ?: b
                            selectedBook = full
                            selectedPage = pNum
                        }
                    },
                    onDeleteBookmark = { bId, pNum ->
                        storage.removeBookmark(bId, pNum)
                        bookmarks = storage.getBookmarks()
                    },
                    onUpdateNote = { bId, pNum, note ->
                        storage.updateBookmarkNote(bId, pNum, note)
                        bookmarks = storage.getBookmarks()
                    },
                    onDismiss = { showBookmarksDialog = false }
                )
            }

            // Import Book Dialog
            if (showImportDialog) {
                ImportDialog(
                    books = books,
                    defaultBookId = 5586L,
                    onImportSuccess = { bookId, importedPages, title ->
                        val updated = storage.importPagesIntoBook(
                            bookId = bookId,
                            newPages = importedPages,
                            customTitle = title
                        )
                        books = storage.getBooks()
                        selectedBook = updated
                        selectedPage = 1
                    },
                    onDismiss = { showImportDialog = false }
                )
            }
        }
    }
}
