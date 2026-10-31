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
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import kotlinx.coroutines.launch
import net.ablibrary.local.ai.GeminiAiAssistant
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
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
    onSaveNote: (Long, Int, String) -> Unit = { _, _, _ -> },
    currentBookmark: PageBookmark? = null,
    isBookmarked: Boolean,
    onClose: () -> Unit
) {
    val totalPages = book.pages.size.coerceAtLeast(1)
    var currentPageIndex by remember {
        mutableStateOf((initialPage.coerceIn(1, totalPages)) - 1)
    }

    LaunchedEffect(initialPage) {
        currentPageIndex = (initialPage.coerceIn(1, totalPages)) - 1
    }

    var showSettingsSheet by remember { mutableStateOf(false) }
    var showTocDrawer by remember { mutableStateOf(false) }
    var showJumpDialog by remember { mutableStateOf(false) }
    var showNoteDialog by remember { mutableStateOf(false) }
    var showInPageSearch by remember { mutableStateOf(false) }
    var inPageQuery by remember { mutableStateOf("") }
    var noteInput by remember { mutableStateOf("") }
    var showAiExplainDialog by remember { mutableStateOf(false) }
    var aiExplanation by remember { mutableStateOf("") }
    var isAiExplaining by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current
    val scrollState = rememberScrollState()

    // Reset scroll when page changes
    LaunchedEffect(currentPageIndex) {
        scrollState.scrollTo(0)
    }

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
                    Column(
                        modifier = Modifier.clickable { showJumpDialog = true }
                    ) {
                        Text(
                            text = book.title,
                            maxLines = 1,
                            color = textColor,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "ص ${currentPage.pageLabel.ifBlank { (currentPageIndex + 1).toString() }} من $totalPages · ${book.authorName ?: ""} (انقر للتنقل)",
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
                    IconButton(onClick = {
                        isAiExplaining = true
                        showAiExplainDialog = true
                        coroutineScope.launch {
                            aiExplanation = GeminiAiAssistant.explainPage(
                                pageNumber = currentPage.pageNumber,
                                heading = currentPage.heading,
                                content = currentPage.content
                            )
                            isAiExplaining = false
                        }
                    }) {
                        Icon(Icons.Default.AutoAwesome, contentDescription = "شرح الصفحة بالذكاء الاصطناعي", tint = LibraryColors.TealGlow)
                    }
                    IconButton(onClick = { showInPageSearch = !showInPageSearch }) {
                        Icon(Icons.Default.Search, contentDescription = "بحث في الكتاب", tint = textColor)
                    }
                    IconButton(onClick = { showTocDrawer = true }) {
                        Icon(Icons.Default.List, contentDescription = "الفهرس", tint = textColor)
                    }
                    IconButton(onClick = {
                        noteInput = currentBookmark?.note ?: ""
                        showNoteDialog = true
                    }) {
                        Icon(
                            Icons.Default.EditNote,
                            contentDescription = "ملاحظة",
                            tint = if (!currentBookmark?.note.isNullOrBlank()) LibraryColors.AmberAccent else textColor
                        )
                    }
                    IconButton(onClick = {
                        onBookmarkToggle(
                            PageBookmark(
                                bookId = book.id,
                                bookTitle = book.title,
                                pageNumber = currentPage.pageNumber,
                                pageLabel = currentPage.pageLabel,
                                heading = currentPage.heading,
                                note = currentBookmark?.note
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
                        .padding(horizontal = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = { if (currentPageIndex > 0) currentPageIndex-- },
                        enabled = currentPageIndex > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text("السابقة")
                    }

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.clickable { showJumpDialog = true }
                    ) {
                        Text(
                            text = "صفحة ${currentPageIndex + 1} / $totalPages",
                            color = textColor,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "انقر لتغيير الصفحة",
                            color = textColor.copy(alpha = 0.6f),
                            fontSize = 9.sp
                        )
                    }

                    Button(
                        onClick = { if (currentPageIndex < totalPages - 1) currentPageIndex++ },
                        enabled = currentPageIndex < totalPages - 1,
                        colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text("التالية")
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(bgColor)
        ) {
            // In-page search bar
            if (showInPageSearch) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cardBg)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    OutlinedTextField(
                        value = inPageQuery,
                        onValueChange = { inPageQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("ابحث عن كلمة في صفحات هذا الكتاب...", fontSize = 11.sp) },
                        singleLine = true,
                        trailingIcon = {
                            if (inPageQuery.isNotBlank()) {
                                val match = book.pages.indexOfFirst {
                                    it.content.contains(inPageQuery, ignoreCase = true) || it.heading.contains(inPageQuery, ignoreCase = true)
                                }
                                if (match != -1) {
                                    TextButton(onClick = { currentPageIndex = match }) {
                                        Text("انتقل (ص ${match + 1})", fontSize = 11.sp, color = LibraryColors.TealGlow)
                                    }
                                }
                            }
                        }
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                ) {
                    // Heading
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

                    // Content
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

                    Spacer(modifier = Modifier.height(24.dp))

                    // Copy action button
                    OutlinedButton(
                        onClick = {
                            val textToCopy = if (currentPage.heading.isNotBlank()) {
                                "${currentPage.heading}\n\n$displayContent"
                            } else displayContent
                            clipboardManager.setText(AnnotatedString(textToCopy))
                        },
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Text("نسخ نص الصفحة", fontSize = 11.sp, color = textColor)
                    }

                    Spacer(modifier = Modifier.height(40.dp))
                }
            }
        }
    }

    // Quick Jump Dialog
    if (showJumpDialog) {
        var jumpInput by remember { mutableStateOf((currentPageIndex + 1).toString()) }
        Dialog(onDismissRequest = { showJumpDialog = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = LibraryColors.SurfaceDark,
                modifier = Modifier.padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("انتقال سريع إلى صفحة", color = LibraryColors.TextWhite, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("أدخل رقم الصفحة بين 1 و $totalPages:", color = LibraryColors.TextMuted, fontSize = 12.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = jumpInput,
                        onValueChange = { jumpInput = it },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = LibraryColors.SurfaceCard,
                            unfocusedContainerColor = LibraryColors.SurfaceCard,
                            focusedTextColor = LibraryColors.TextWhite,
                            unfocusedTextColor = LibraryColors.TextWhite
                        )
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                val target = jumpInput.toIntOrNull()
                                if (target != null && target in 1..totalPages) {
                                    currentPageIndex = target - 1
                                    showJumpDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary)
                        ) {
                            Text("انتقال")
                        }
                        OutlinedButton(onClick = { showJumpDialog = false }) {
                            Text("إلغاء", color = LibraryColors.TextMuted)
                        }
                    }
                }
            }
        }
    }

    // Study Note Dialog
    if (showNoteDialog) {
        Dialog(onDismissRequest = { showNoteDialog = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = LibraryColors.SurfaceDark,
                modifier = Modifier.padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text("ملاحظة دراسية على الصفحة ${currentPage.pageLabel.ifBlank { (currentPageIndex + 1).toString() }}", color = LibraryColors.TextWhite, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = noteInput,
                        onValueChange = { noteInput = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp),
                        placeholder = { Text("اكتب فوائدك أو ملاحظاتك على نص الصفحة...", color = LibraryColors.TextMuted, fontSize = 12.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = LibraryColors.SurfaceCard,
                            unfocusedContainerColor = LibraryColors.SurfaceCard,
                            focusedTextColor = LibraryColors.TextWhite,
                            unfocusedTextColor = LibraryColors.TextWhite
                        )
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                onSaveNote(book.id, currentPage.pageNumber, noteInput)
                                showNoteDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("حفظ الملاحظة")
                        }
                        OutlinedButton(onClick = { showNoteDialog = false }, modifier = Modifier.weight(1f)) {
                            Text("إلغاء", color = LibraryColors.TextMuted)
                        }
                    }
                }
            }
        }
    }

    // TOC Sheet
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
                                        currentPageIndex = (item.pageNumber.coerceIn(1, totalPages)) - 1
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

    // Settings Sheet
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
                        ReaderTheme.DARK to "داكن",
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

    // AI Page Explanation Dialog
    if (showAiExplainDialog) {
        AlertDialog(
            onDismissRequest = { showAiExplainDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = LibraryColors.TealGlow)
                    Text("شرح الصفحة بالذكاء الاصطناعي", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                if (isAiExplaining) {
                    Box(modifier = Modifier.fillMaxWidth().height(140.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CircularProgressIndicator(color = LibraryColors.TealGlow, modifier = Modifier.size(28.dp))
                            Text("جاري استخراج التأملات والشرح التربوي...", fontSize = 12.sp, color = LibraryColors.TextWhite)
                        }
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = aiExplanation,
                            color = LibraryColors.TextWhite,
                            fontSize = 13.sp,
                            lineHeight = 22.sp
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showAiExplainDialog = false },
                    colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary)
                ) {
                    Text("إغلاق")
                }
            },
            containerColor = LibraryColors.SurfaceDark
        )
    }
}
