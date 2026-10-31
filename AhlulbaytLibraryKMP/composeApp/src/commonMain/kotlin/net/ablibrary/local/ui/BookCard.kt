package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.ablibrary.local.model.Book

@Composable
fun BookCard(
    book: Book,
    onOpenReader: (Book) -> Unit,
    onShowDetails: (Book) -> Unit = {},
    isDownloading: Boolean = false,
    onDownloadBook: (Book) -> Unit = {}
) {
    val isDownloaded = book.isDownloaded || book.pages.isNotEmpty()

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (isDownloaded) LibraryColors.SurfaceDark else LibraryColors.SurfaceDark.copy(alpha = 0.6f))
            .border(1.dp, if (isDownloaded) LibraryColors.BorderSubtle else LibraryColors.BorderSubtle.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
            .clickable { onOpenReader(book) }
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = book.categoryName ?: "تراث عام",
                        color = LibraryColors.TextMuted,
                        fontSize = 11.sp
                    )
                    book.volumeLabel?.let { vol ->
                        Text(" · ج $vol", color = LibraryColors.TextMuted, fontSize = 11.sp)
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(
                        onClick = { onShowDetails(book) },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "تفاصيل",
                            tint = LibraryColors.TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text(
                        text = "#${book.id}",
                        color = LibraryColors.TextMuted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = book.title,
                color = LibraryColors.TextWhite,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.height(4.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = book.authorName ?: "مؤلف غير محدد",
                    color = LibraryColors.TealGlow,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                book.deathDisplay?.let { death ->
                    Text("($death)", color = LibraryColors.AmberAccent, fontSize = 11.sp)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = LibraryColors.BorderSubtle, thickness = 1.dp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val count = book.pages.size.takeIf { it > 0 } ?: book.pageCount ?: 0
                val tocCount = book.toc.size.takeIf { it > 0 } ?: book.pages.count { it.heading.isNotBlank() }
                Text(
                    text = if (tocCount > 0) "$count صفحة · $tocCount باب مفهرس" else "$count صفحة",
                    color = LibraryColors.TextMuted,
                    fontSize = 11.sp
                )

                if (isDownloaded) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = LibraryColors.GreenOffline,
                            modifier = Modifier.size(14.dp)
                        )
                        Text(
                            text = "متاح بدون اتصال",
                            color = LibraryColors.GreenOffline,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                } else {
                    Button(
                        onClick = { onDownloadBook(book) },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = LibraryColors.TealPrimary.copy(alpha = 0.25f),
                            contentColor = LibraryColors.TealGlow
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        enabled = !isDownloading,
                        modifier = Modifier.height(30.dp)
                    ) {
                        if (isDownloading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(14.dp),
                                strokeWidth = 2.dp,
                                color = LibraryColors.TealGlow
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("جاري الجلب...", fontSize = 11.sp)
                        } else {
                            Icon(
                                imageVector = Icons.Default.CloudDownload,
                                contentDescription = null,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("تحميل عن بعد", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
