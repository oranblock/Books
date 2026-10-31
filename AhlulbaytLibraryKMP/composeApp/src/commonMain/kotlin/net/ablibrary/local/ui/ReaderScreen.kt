package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.ablibrary.local.model.*
import net.ablibrary.local.utils.TextParser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReaderScreen(
    book: Book,
    initialPage: Int = 1,
    preferences: ReadingPreferences,
    onPreferencesChange: (ReadingPreferences) -> Unit,
    onBookmarkToggle: (PageBookmark) -> Unit,
    isBookmarked: Boolean,
    onClose: () -> Unit
) {
    var currentPageIndex by remember { mutableStateOf(initialPage.coerceIn(1, book.pages.size.coerceAtLeast(1)) - 1) }
    var showSettingsSheet by remember { mutableStateOf(false) }
    var showTocDrawer by remember { mutableStateOf(false) }

    val currentPage = book.pages.getOrNull(currentPageIndex)
        ?: BookPage(pageNumber = currentPageIndex + 1, content = "لا يوجد محتوى في هذه الصفحة.")

    val (bgColor, textColor, cardBg) = when (preferences.theme) {
        ReaderTheme.DARK -> Triple(Color(0xFF030707), Color(0xFFE2E8F0), Color(0xFF0D1516))
        ReaderTheme.SEPIA -> Triple(Color(0xFFF4EFEA), Color(0xFF292524), Color(0xFFFAF7F2))
        ReaderTheme.BLACK -> Triple(Color(0xFF000000), Color(0xFFCCCCCC), Color(0xFF111111))
        ReaderTheme.LIGHT -> Triple(Color(0xFFF8FAFC), Color(0xFF0F172A), Color(0xFFFFFFFF))
    }

    val displayContent = remember(currentPage.content, preferences.removeTashkeel) {
        if (preferences.removeTashkeel) TextParser.stripTashkeel(currentPage.content) else currentPage.content
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(book.title, maxLines = 1, color = textColor, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "ص ${currentPage.pageLabel.ifBlank { currentPage.pageNumber.toString() }} من ${book.pages.size.coerceAtLeast(1)} · ${book.authorName ?: ""}",
                            color = textColor.copy(alpha = 0.7f),
                            fontSize = 10.sp
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "رجوع", tint = textColor)
                    }
                },
                actions = {
                    IconButton(onClick = { showTocDrawer = true }) {
                        Icon(Icons.Default.List, contentDescription = "الفهرس", tint = textColor)
                    }
                    IconButton(onClick = {
                        onBookmarkToggle(
                            PageBookmark(
                                bookId = book.id,
                                bookTitle = book.title,
                                pageNumber = currentPage.pageNumber,
                                pageLabel = currentPage.pageLabel,
                                heading = currentPage.heading
                            )
                        )
                    }) {
                        Icon(
                            if (isBookmarked) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                            contentDescription = "إشارة",
                            tint = if (isBookmarked) LibraryColors.AmberAccent else textColor
                        )
                    }
                    IconButton(onClick = { showSettingsSheet = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "إعدادات", tint = textColor)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = cardBg)
            )
        },
        bottomBar = {
            BottomAppBar(containerColor = cardBg) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = { if (currentPageIndex > 0) currentPageIndex-- },
                        enabled = currentPageIndex > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary)
                    ) {
                        Text("السابقة")
                    }

                    Text(
                        text = "صفحة ${currentPageIndex + 1} / ${book.pages.size.coerceAtLeast(1)}",
                        color = textColor,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Button(
                        onClick = { if (currentPageIndex < book.pages.lastIndex) currentPageIndex++ },
                        enabled = currentPageIndex < book.pages.lastIndex,
                        colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary)
                    ) {
                        Text("التالية")
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(bgColor)
                .padding(horizontal = 20.dp, vertical = 16.dp)
        ) {
            val scrollState = rememberScrollState()
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
            ) {
                if (currentPage.heading.isNotBlank()) {
                    Text(
                        text = currentPage.heading,
                        color = if (preferences.theme == ReaderTheme.SEPIA) Color(0xFF854D0E) else LibraryColors.AmberAccent,
                        fontSize = (preferences.fontSize + 4).sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 16.dp)
                    )
                }

                Text(
                    text = displayContent,
                    color = textColor,
                    fontSize = preferences.fontSize.sp,
                    lineHeight = (preferences.fontSize * preferences.lineHeight).sp,
                    fontFamily = when (preferences.fontFamily) {
                        ReaderFont.AMIRI -> FontFamily.Serif
                        ReaderFont.NASKH -> FontFamily.Default
                        ReaderFont.SANS -> FontFamily.SansSerif
                    },
                    textAlign = TextAlign.Justify,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }

    if (showTocDrawer) {
        ModalBottomSheet(onDismissRequest = { showTocDrawer = false }) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("فهرس أبواب وموضوعات الكتاب", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(12.dp))
                LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    val toc = book.pages.filter { it.heading.isNotBlank() }
                    if (toc.isEmpty()) {
                        item { Text("لا توجد عناوين مفهرسة لهذا الكتاب.", color = Color.Gray, fontSize = 12.sp) }
                    } else {
                        items(toc) { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable {
                                        currentPageIndex = item.pageNumber - 1
                                        showTocDrawer = false
                                    }
                                    .padding(vertical = 8.dp, horizontal = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(item.heading, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                Text("ص ${item.pageLabel.ifBlank { item.pageNumber.toString() }}", color = LibraryColors.AmberAccent, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }

    if (showSettingsSheet) {
        ModalBottomSheet(onDismissRequest = { showSettingsSheet = false }) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("خيارات القراءة والمظهر", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))

                Text("حجم الخط العربي: ${preferences.fontSize}sp")
                Slider(
                    value = preferences.fontSize.toFloat(),
                    onValueChange = { onPreferencesChange(preferences.copy(fontSize = it.toInt())) },
                    valueRange = 13f..36f
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text("نمط المظهر")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                    listOf(
                        ReaderTheme.DARK to "مخطوطة داكنة",
                        ReaderTheme.SEPIA to "ورق مصحف",
                        ReaderTheme.BLACK to "أسود OLED",
                        ReaderTheme.LIGHT to "نهاري"
                    ).forEach { (t, label) ->
                        FilterChip(
                            selected = preferences.theme == t,
                            onClick = { onPreferencesChange(preferences.copy(theme = t)) },
                            label = { Text(label, fontSize = 11.sp) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("إخفاء حركات التشكيل", fontSize = 13.sp)
                    Switch(
                        checked = preferences.removeTashkeel,
                        onCheckedChange = { onPreferencesChange(preferences.copy(removeTashkeel = it)) }
                    )
                }
            }
        }
    }
}
