package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
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
import androidx.compose.ui.window.Dialog
import kotlinx.coroutines.launch
import net.ablibrary.local.model.Book
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.net.RemoteBookFetcher
import net.ablibrary.local.utils.TextParser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImportDialog(
    books: List<Book>,
    defaultBookId: Long = 5586L,
    onImport: (Long, List<BookPage>, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedBookId by remember { mutableStateOf(defaultBookId) }
    var isNewBook by remember { mutableStateOf(false) }
    var newBookTitle by remember { mutableStateOf("") }
    var newBookAuthor by remember { mutableStateOf("") }
    var rawText by remember { mutableStateOf("") }
    var isFetchingRemote by remember { mutableStateOf(false) }
    var remoteStatusMessage by remember { mutableStateOf<String?>(null) }

    val coroutineScope = rememberCoroutineScope()

    val parseResult = remember(rawText) {
        if (rawText.isBlank()) null
        else TextParser.parseAnyContent(rawText)
    }

    val pages = parseResult?.first ?: emptyList()
    val detectedFormat = parseResult?.second ?: ""

    fun handleRemoteFetch() {
        isFetchingRemote = true
        remoteStatusMessage = null
        coroutineScope.launch {
            val res = RemoteBookFetcher.fetchBookPages(selectedBookId)
            isFetchingRemote = false
            res.onSuccess { fetchedPages ->
                remoteStatusMessage = "تم جلب ${fetchedPages.size} صفحة بنجاح من خادم المكتبة!"
                val targetBook = books.find { it.id == selectedBookId }
                onImport(selectedBookId, fetchedPages, if (isNewBook) newBookTitle else targetBook?.title)
                onDismiss()
            }
            res.onFailure { err ->
                remoteStatusMessage = err.message ?: "تعذر الجلب التلقائي عن بعد"
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .clip(RoundedCornerShape(16.dp)),
            color = LibraryColors.SurfaceDark
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
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
                                Icons.Default.Upload,
                                contentDescription = null,
                                tint = LibraryColors.TealGlow,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                        Column {
                            Text(
                                "استيراد وتحميل كتاب",
                                color = LibraryColors.TextWhite,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "دعم الجلب عن بعد (Connect-RPC) وملفات JSON/TXT",
                                color = LibraryColors.TextMuted,
                                fontSize = 10.sp
                            )
                        }
                    }
                    TextButton(onClick = onDismiss) {
                        Text("إغلاق", color = LibraryColors.TextMuted)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Target selector
                    item {
                        Text("الهدف المراد التحميل أو الاستيراد إليه:", color = LibraryColors.TextWhite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            FilterChip(
                                selected = !isNewBook,
                                onClick = { isNewBook = false },
                                label = { Text("كتاب موجود في الفهرس", fontSize = 11.sp) }
                            )
                            FilterChip(
                                selected = isNewBook,
                                onClick = { isNewBook = true },
                                label = { Text("إنشاء كتاب جديد", fontSize = 11.sp) }
                            )
                        }

                        if (!isNewBook) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                books.take(8).forEach { b ->
                                    val isSel = selectedBookId == b.id
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (isSel) LibraryColors.TealPrimary.copy(alpha = 0.25f) else LibraryColors.SurfaceCard)
                                            .border(1.dp, if (isSel) LibraryColors.TealPrimary else LibraryColors.BorderSubtle, RoundedCornerShape(8.dp))
                                            .clickable { selectedBookId = b.id }
                                            .padding(horizontal = 12.dp, vertical = 8.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(b.title, color = if (isSel) LibraryColors.TealGlow else LibraryColors.TextWhite, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                            Text("#${b.id}", color = LibraryColors.TextMuted, fontSize = 11.sp)
                                        }
                                    }
                                }
                            }

                            // Remote fetch direct trigger
                            Spacer(modifier = Modifier.height(6.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(LibraryColors.TealPrimary.copy(alpha = 0.12f))
                                    .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                    .padding(12.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("الجلب الآلي عن بعد (Connect-RPC):", color = LibraryColors.TealGlow, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    Text("تحميل صفحات الكتاب #${selectedBookId} مباشرة من خادم شبكة أهل البيت وحفظها في SQLite محلياً.", color = LibraryColors.TextMuted, fontSize = 10.sp)

                                    Button(
                                        onClick = { handleRemoteFetch() },
                                        enabled = !isFetchingRemote,
                                        colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.fillMaxWidth().height(36.dp)
                                    ) {
                                        if (isFetchingRemote) {
                                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("جاري الاتصال والتحميل...", fontSize = 12.sp)
                                        } else {
                                            Icon(Icons.Default.CloudDownload, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("بدء التحميل عن بعد الآن", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }

                                    remoteStatusMessage?.let { msg ->
                                        Text(msg, color = if (msg.contains("نجاح")) LibraryColors.GreenOffline else LibraryColors.AmberAccent, fontSize = 11.sp)
                                    }
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = newBookTitle,
                                onValueChange = { newBookTitle = it },
                                label = { Text("عنوان الكتاب الجديد") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            OutlinedTextField(
                                value = newBookAuthor,
                                onValueChange = { newBookAuthor = it },
                                label = { Text("اسم المؤلف") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )
                        }
                    }

                    // Raw text area for manual import
                    item {
                        Text("أو ألصق محتوى الملف يدوياً (JSON / TXT / XML):", color = LibraryColors.TextWhite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        OutlinedTextField(
                            value = rawText,
                            onValueChange = { rawText = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp),
                            placeholder = {
                                Text(
                                    "ألصق نصوص contents_full.json أو sahifa_5586.txt مباشرة...",
                                    fontSize = 11.sp,
                                    color = LibraryColors.TextMuted
                                )
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = LibraryColors.SurfaceCard,
                                unfocusedContainerColor = LibraryColors.SurfaceCard,
                                focusedTextColor = LibraryColors.TextWhite,
                                unfocusedTextColor = LibraryColors.TextWhite
                            )
                        )
                    }

                    // Detection result
                    if (parseResult != null) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(LibraryColors.TealPrimary.copy(alpha = 0.15f))
                                    .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                    .padding(12.dp)
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = LibraryColors.GreenOffline, modifier = Modifier.size(16.dp))
                                        Text("تم التعرّف على الصيغة: $detectedFormat", color = LibraryColors.GreenOffline, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Text("عدد الصفحات المستخرجة: ${pages.size} صفحة", color = LibraryColors.TextWhite, fontSize = 12.sp)

                                    if (pages.isNotEmpty()) {
                                        val first = pages.first()
                                        Text(
                                            "عينة من ص 1: ${first.heading.ifBlank { first.content.take(60) }}",
                                            color = LibraryColors.TextMuted,
                                            fontSize = 11.sp,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Footer Actions
                Button(
                    onClick = {
                        val targetId = if (isNewBook) {
                            (books.maxOfOrNull { it.id } ?: 9000L) + 1
                        } else selectedBookId

                        val customTitle = if (isNewBook) newBookTitle.ifBlank { "كتاب مستورد جديد" } else null
                        onImport(targetId, pages, customTitle)
                        onDismiss()
                    },
                    enabled = pages.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LibraryColors.TealPrimary,
                        disabledContainerColor = LibraryColors.TealPrimary.copy(alpha = 0.3f)
                    ),
                    modifier = Modifier.fillMaxWidth().height(42.dp),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        if (pages.isEmpty()) "ألصق ملفاً صالحاً أولاً" else "حفظ واستيراد ${pages.size} صفحة إلى المكتبة",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
