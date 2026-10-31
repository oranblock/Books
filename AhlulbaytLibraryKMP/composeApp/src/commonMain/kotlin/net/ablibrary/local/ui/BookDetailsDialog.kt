package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import net.ablibrary.local.model.Book

@Composable
fun BookDetailsDialog(
    book: Book,
    onOpenReader: (Book) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.8f)
                .clip(RoundedCornerShape(16.dp)),
            color = LibraryColors.SurfaceDark
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.Book, contentDescription = null, tint = LibraryColors.TealGlow)
                        Text("بطاقة بيانات الكتاب", color = LibraryColors.TextWhite, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onDismiss) { Text("إغلاق", color = LibraryColors.TextMuted) }
                }

                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            text = book.title,
                            color = LibraryColors.TextWhite,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 26.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "${book.authorName ?: "مؤلف غير محدد"} ${book.deathDisplay?.let { "($it)" } ?: ""}",
                            color = LibraryColors.TealGlow,
                            fontSize = 13.sp
                        )
                    }

                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(LibraryColors.SurfaceCard)
                                .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(10.dp))
                                .padding(12.dp)
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                DetailRow("الرقم التعريفي:", "#${book.id}")
                                DetailRow("التصنيف:", book.categoryName ?: "عام")
                                book.volumeLabel?.let { DetailRow("رقم الجزء:", "جزء $it") }
                                DetailRow("الصفحات:", "${book.pages.size.takeIf { it > 0 } ?: book.pageCount ?: 0} صفحة")
                                val tocCount = book.toc.size.takeIf { it > 0 } ?: book.pages.count { it.heading.isNotBlank() }
                                DetailRow("فهرس الموضوعات:", if (tocCount > 0) "$tocCount باب وموضوع مفهرس" else "فهرسة صفحات")
                                book.publisherName?.let { DetailRow("الناشر:", it) }
                                book.printYear?.let { DetailRow("سنة الطبع:", "$it هـ") }
                                DetailRow("حالة التوفر:", if (book.isDownloaded) "محمّل بالكامل محلياً (100% دون اتصال)" else "فهرس تعريفي")
                            }
                        }
                    }

                    book.abstract?.let { abs ->
                        item {
                            Text("نبذة عن الكتاب:", color = LibraryColors.AmberAccent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(abs, color = LibraryColors.TextWhite, fontSize = 12.sp, lineHeight = 20.sp)
                        }
                    }

                    if (book.contributors.isNotEmpty()) {
                        item {
                            Text("المحققون والرواة المساهمون:", color = LibraryColors.AmberAccent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(6.dp))
                            book.contributors.forEach { c ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(c.name, color = LibraryColors.TextWhite, fontSize = 12.sp)
                                    Text("${c.role ?: ""} ${c.deathDisplay?.let { "($it)" } ?: ""}", color = LibraryColors.TextMuted, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Button(
                    onClick = {
                        onOpenReader(book)
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("فتح وقراءة صفحات الكتاب", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = LibraryColors.TextMuted, fontSize = 11.sp)
        Text(value, color = LibraryColors.TextWhite, fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}
