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
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.75f)
                .clip(RoundedCornerShape(16.dp)),
            color = LibraryColors.SurfaceDark
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
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

                if (bookmarks.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("لم تحفظ أي إشارات مرجعية بعد.", color = LibraryColors.TextMuted, fontSize = 13.sp)
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
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(bm.bookTitle, color = LibraryColors.TextWhite, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                        Text("صفحة ${bm.pageLabel.ifBlank { bm.pageNumber.toString() }}", color = LibraryColors.AmberAccent, fontSize = 12.sp)
                                        bm.heading?.let {
                                            Text(it, color = LibraryColors.TextMuted, fontSize = 11.sp, maxLines = 1)
                                        }
                                    }
                                    IconButton(onClick = { onDeleteBookmark(bm.bookId, bm.pageNumber) }) {
                                        Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
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
