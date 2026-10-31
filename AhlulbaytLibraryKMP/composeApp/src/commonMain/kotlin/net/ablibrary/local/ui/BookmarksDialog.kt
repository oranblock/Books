package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import net.ablibrary.local.model.PageBookmark

@Composable
fun BookmarksDialog(
    bookmarks: List<PageBookmark>,
    onSelectBookmark: (Long, Int) -> Unit,
    onDeleteBookmark: (Long, Int) -> Unit,
    onUpdateNote: (Long, Int, String) -> Unit = { _, _, _ -> },
    onDismiss: () -> Unit
) {
    var editingBookmark by remember { mutableStateOf<PageBookmark?>(null) }
    var noteText by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.8f)
                .clip(RoundedCornerShape(16.dp)),
            color = LibraryColors.SurfaceDark
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Bookmark, contentDescription = null, tint = LibraryColors.AmberAccent)
                        Text("الإشارات المرجعية والملاحظات", color = LibraryColors.TextWhite, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onDismiss) { Text("إغلاق", color = LibraryColors.TealGlow) }
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (editingBookmark != null) {
                    // Editing note screen
                    val bm = editingBookmark!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(vertical = 8.dp)
                    ) {
                        Text("ملاحظة دراسية على: ${bm.bookTitle} (ص ${bm.pageLabel})", color = LibraryColors.TextWhite, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = noteText,
                            onValueChange = { noteText = it },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(140.dp),
                            placeholder = { Text("اكتب ملاحظتك، تأملاتك أو تفسيرك هنا...", color = LibraryColors.TextMuted, fontSize = 12.sp) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = LibraryColors.SurfaceCard,
                                unfocusedContainerColor = LibraryColors.SurfaceCard,
                                focusedTextColor = LibraryColors.TextWhite,
                                unfocusedTextColor = LibraryColors.TextWhite
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            Button(
                                onClick = {
                                    onUpdateNote(bm.bookId, bm.pageNumber, noteText)
                                    editingBookmark = null
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("حفظ الملاحظة")
                            }
                            OutlinedButton(
                                onClick = { editingBookmark = null },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("إلغاء", color = LibraryColors.TextMuted)
                            }
                        }
                    }
                } else if (bookmarks.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("لم تحفظ أي إشارات مرجعية بعد.\nاضغط على أيقونة الإشارة في القارئ لحفظ أي صفحة.", color = LibraryColors.TextMuted, fontSize = 13.sp, lineHeight = 20.sp)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(bookmarks) { bm ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(LibraryColors.SurfaceCard)
                                    .clickable { onSelectBookmark(bm.bookId, bm.pageNumber) }
                                    .padding(12.dp)
                            ) {
                                Column {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(bm.bookTitle, color = LibraryColors.TextWhite, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                            Text("صفحة ${bm.pageLabel.ifBlank { bm.pageNumber.toString() }}", color = LibraryColors.AmberAccent, fontSize = 12.sp)
                                            bm.heading?.let {
                                                if (it.isNotBlank()) {
                                                    Text(it, color = LibraryColors.TealGlow, fontSize = 11.sp, maxLines = 1)
                                                }
                                            }
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            IconButton(
                                                onClick = {
                                                    editingBookmark = bm
                                                    noteText = bm.note ?: ""
                                                }
                                            ) {
                                                Icon(
                                                    Icons.Default.EditNote,
                                                    contentDescription = "ملاحظة",
                                                    tint = if (!bm.note.isNullOrBlank()) LibraryColors.AmberAccent else LibraryColors.TextMuted
                                                )
                                            }

                                            IconButton(onClick = { onDeleteBookmark(bm.bookId, bm.pageNumber) }) {
                                                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                            }
                                        }
                                    }

                                    bm.note?.let { note ->
                                        if (note.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .background(LibraryColors.SurfaceDark)
                                                    .padding(8.dp)
                                            ) {
                                                Text(
                                                    text = "ملاحظة: $note",
                                                    color = LibraryColors.TextWhite,
                                                    fontSize = 11.sp,
                                                    lineHeight = 16.sp
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
