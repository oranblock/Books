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

        LaunchedEffect(Unit) {
            if (true) {
                try {
                    val json = Json { ignoreUnknownKeys = true; isLenient = true }
                    val loadedBooks = json.decodeFromString<List<Book>>(DefaultBooks.RAW_JSON)
                    if (loadedBooks.isNotEmpty()) {
                        storage.saveBooks(loadedBooks)
                        books = loadedBooks
                    }
                } catch (_: Exception) {}
            }
        }

        if (selectedBook != null) {
            val isBm = bookmarks.any { it.bookId == selectedBook!!.id && it.pageNumber == selectedPage }
            ReaderScreen(
                book = selectedBook!!,
                initialPage = selectedPage,
                preferences = preferences,
                onPreferencesChange = {
                    preferences = it
                    storage.savePreferences(it)
                },
                onBookmarkToggle = { bm ->
                    if (isBm) storage.removeBookmark(bm.bookId, bm.pageNumber) else storage.addBookmark(bm)
                    bookmarks = storage.getBookmarks()
                },
                isBookmarked = isBm,
                onClose = { selectedBook = null }
            )
        } else {
            HomeScreen(
                books = books,
                bookmarkCount = bookmarks.size,
                activeTab = activeTab,
                onTabChange = { activeTab = it },
                onBookClick = {
                    selectedBook = it
                    selectedPage = 1
                },
                onOpenBookmarks = { showBookmarksDialog = true },
                onOpenKidConsolePage = { pageNum ->
                    val sahifa = books.find { it.id == 5586L } ?: books.firstOrNull()
                    if (sahifa != null) {
                        selectedBook = sahifa
                        selectedPage = pageNum
                    }
                }
            )

            if (showBookmarksDialog) {
                BookmarksDialog(
                    bookmarks = bookmarks,
                    onSelectBookmark = { bId, pNum ->
                        val b = books.find { it.id == bId }
                        if (b != null) {
                            showBookmarksDialog = false
                            selectedBook = b
                            selectedPage = pNum
                        }
                    },
                    onDeleteBookmark = { bId, pNum ->
                        storage.removeBookmark(bId, pNum)
                        bookmarks = storage.getBookmarks()
                    },
                    onDismiss = { showBookmarksDialog = false }
                )
            }
        }
    }
}
