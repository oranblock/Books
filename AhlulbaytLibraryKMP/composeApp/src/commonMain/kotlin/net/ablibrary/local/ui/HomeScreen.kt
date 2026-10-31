package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.ablibrary.local.model.Book
import net.ablibrary.local.utils.TextParser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    books: List<Book>,
    bookmarkCount: Int,
    activeTab: String,
    onTabChange: (String) -> Unit,
    onBookClick: (Book) -> Unit,
    onOpenBookmarks: () -> Unit,
    onOpenImport: () -> Unit,
    onOpenKidConsolePage: (Int) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryId by remember { mutableStateOf(0) }
    var selectedBookForDetails by remember { mutableStateOf<Book?>(null) }

    val categories = remember {
        listOf(
            0 to "كافة الأبواب",
            1 to "الحديث والرواية",
            2 to "الأدعية والزيارات",
            3 to "الفقه وأحكام الشريعة",
            5 to "العقائد وعلم الكلام",
            6 to "علوم القرآن والتفسير",
            8 to "الأخلاق والعرفان",
            4 to "التاريخ والتراجم والسير",
            7 to "الأدب والتراث"
        )
    }

    val sahifaBook = remember(books) { books.find { it.id == 5586L } ?: books.firstOrNull() }
    val offlineCount = remember(books) { books.count { it.isDownloaded || it.pages.isNotEmpty() } }

    val filteredBooks = remember(books, searchQuery, selectedCategoryId, activeTab) {
        val rawQ = searchQuery.trim()
        val normQ = TextParser.normalizeForSearch(rawQ)

        books.filter { b ->
            if (activeTab == "offline" && !b.isDownloaded && b.pages.isEmpty()) return@filter false
            if (selectedCategoryId != 0 && b.categoryId != selectedCategoryId.toLong()) return@filter false
            if (rawQ.isNotBlank()) {
                val normTitle = TextParser.normalizeForSearch(b.title)
                val normAuthor = TextParser.normalizeForSearch(b.authorName ?: "")
                val normAbstract = TextParser.normalizeForSearch(b.abstract ?: "")
                val matchId = b.id.toString() == rawQ

                val match = normTitle.contains(normQ) ||
                        normAuthor.contains(normQ) ||
                        normAbstract.contains(normQ) ||
                        matchId

                if (!match) return@filter false
            }
            true
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(LibraryColors.TealPrimary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Book,
                                contentDescription = null,
                                tint = LibraryColors.TealGlow,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Column {
                            Text(
                                "مكتبة أهل البيت (ع)",
                                color = LibraryColors.TextWhite,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "النسخة المحلية المتنقلة (100% دون اتصال)",
                                color = LibraryColors.TextMuted,
                                fontSize = 10.sp
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onOpenImport) {
                        Icon(
                            Icons.Default.Upload,
                            contentDescription = "استيراد كتاب",
                            tint = LibraryColors.TealGlow
                        )
                    }
                    IconButton(onClick = onOpenBookmarks) {
                        BadgedBox(
                            badge = {
                                if (bookmarkCount > 0) {
                                    Badge(containerColor = LibraryColors.AmberAccent) {
                                        Text("$bookmarkCount", color = Color.Black, fontSize = 9.sp)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                Icons.Default.Bookmark,
                                contentDescription = "Bookmarks",
                                tint = LibraryColors.AmberAccent
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = LibraryColors.SurfaceDark)
            )
        },
        containerColor = LibraryColors.Background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Mode selector ribbon
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(LibraryColors.SurfaceDark)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = activeTab == "catalog",
                    onClick = { onTabChange("catalog") },
                    label = { Text("فهرس الكتب (${books.size})", fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = LibraryColors.TealPrimary,
                        selectedLabelColor = LibraryColors.TextWhite
                    )
                )

                FilterChip(
                    selected = activeTab == "ask_imam",
                    onClick = { onTabChange("ask_imam") },
                    label = { Text("اسأل عن الصبر والهم", fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = LibraryColors.AmberAccent,
                        selectedLabelColor = Color.Black
                    )
                )

                FilterChip(
                    selected = activeTab == "offline",
                    onClick = { onTabChange("offline") },
                    label = { Text("المتاحة محلياً ($offlineCount)", fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = LibraryColors.GreenOffline,
                        selectedLabelColor = Color.Black
                    )
                )
            }

            if (activeTab == "ask_imam") {
                if (sahifaBook != null) {
                    KidAskConsole(
                        sahifaBook = sahifaBook,
                        onOpenPage = onOpenKidConsolePage
                    )
                } else {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("الرجاء تحميل أو استيراد كتاب الصحيفة السجادية (#5586) أولاً.", color = LibraryColors.TextMuted)
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp)
                ) {
                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("ابحث بالعنوان، المؤلف، أو الرقم (مثل 5586 للصحيفة)...", fontSize = 12.sp, color = LibraryColors.TextMuted) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = LibraryColors.TealGlow) },
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = LibraryColors.TealPrimary,
                            unfocusedBorderColor = LibraryColors.BorderSubtle,
                            focusedContainerColor = LibraryColors.SurfaceCard,
                            unfocusedContainerColor = LibraryColors.SurfaceCard,
                            focusedTextColor = LibraryColors.TextWhite,
                            unfocusedTextColor = LibraryColors.TextWhite
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(categories) { (id, name) ->
                            val isSelected = selectedCategoryId == id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) LibraryColors.TealPrimary.copy(alpha = 0.25f) else LibraryColors.SurfaceDark)
                                    .border(1.dp, if (isSelected) LibraryColors.TealPrimary else LibraryColors.BorderSubtle, RoundedCornerShape(8.dp))
                                    .clickable { selectedCategoryId = id }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = name,
                                    color = if (isSelected) LibraryColors.TealGlow else LibraryColors.TextMuted,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (filteredBooks.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("لا توجد كتب مطابقة لبحثك.", color = LibraryColors.TextMuted, fontSize = 14.sp)
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedButton(onClick = {
                                    searchQuery = ""
                                    selectedCategoryId = 0
                                }) {
                                    Text("إعادة تعيين الفلاتر", color = LibraryColors.TealGlow)
                                }
                            }
                        }
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 280.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(filteredBooks) { book ->
                                BookCard(
                                    book = book,
                                    onOpenReader = onBookClick,
                                    onShowDetails = { selectedBookForDetails = it }
                                )
                            }
                        }
                    }
                }
            }
        }

        // Book details dialog
        selectedBookForDetails?.let { book ->
            BookDetailsDialog(
                book = book,
                onOpenReader = onBookClick,
                onDismiss = { selectedBookForDetails = null }
            )
        }
    }
}
