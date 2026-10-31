package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
    onOpenReader: (Book) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(LibraryColors.SurfaceDark)
            .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(14.dp))
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
                Text(
                    text = "#${book.id}",
                    color = LibraryColors.TextMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

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
                    fontSize = 12.sp
                )
                book.deathDisplay?.let { death ->
                    Text("($death)", color = LibraryColors.AmberAccent, fontSize = 11.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = LibraryColors.BorderSubtle, thickness = 1.dp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${book.pages.size.takeIf { it > 0 } ?: book.pageCount ?: 0} صفحة مفهرسة",
                    color = LibraryColors.TextMuted,
                    fontSize = 11.sp
                )

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
            }
        }
    }
}
