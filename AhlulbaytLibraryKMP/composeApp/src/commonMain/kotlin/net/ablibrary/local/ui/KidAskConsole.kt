package net.ablibrary.local.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.ablibrary.local.model.Book

data class TopicPrompt(val keyword: String, val title: String, val lesson: String)

@Composable
fun KidAskConsole(
    sahifaBook: Book,
    onOpenPage: (Int) -> Unit
) {
    var query by remember { mutableStateOf("الصبر") }

    val popularTopics = remember {
        listOf(
            TopicPrompt("الصبر", "ماذا يقول الإمام عن الصبر؟", "يعلّمنا الإمام أن الصبر ثقة وطمأنينة بأن الله تعالى سيبدل الشدة يسراً وفرجاً."),
            TopicPrompt("الوالدين", "دعاء بر الوالدين والإحسان إليهما", "برّ الوالدين بالابتسامة، والحديث اللطيف، والدعاء لهما بالمغفرة والعافية."),
            TopicPrompt("الهموم", "ماذا أفعل عندما أشعر بالخوف أو الهم؟", "لا تقلق وتوجه إلى الله بالدعاء: يا من تحل به عقد المكاره."),
            TopicPrompt("التوبة", "كيف طلب الإمام التوبة والمغفرة؟", "باب الله مفتوح دائماً؛ إذا أخطأت فاعتذر واطلب المغفرة بشجاعة."),
            TopicPrompt("العافية", "دعاء طلب العافية وشكر الصحة", "اشكر الله على صحتك وسلامة حواسك كل صباح ومساء بمساعدة الآخرين."),
            TopicPrompt("الرزق", "طلب سعة الرزق وقضاء الدين", "الرزق ليس مالاً فقط، بل هو العلم النافع وراحة البال.")
        )
    }

    val matchedPages = remember(query, sahifaBook) {
        if (query.isBlank()) sahifaBook.pages.take(4)
        else sahifaBook.pages.filter {
            it.heading.contains(query, ignoreCase = true) || it.content.contains(query, ignoreCase = true)
        }.ifEmpty { sahifaBook.pages.take(3) }
    }

    val activeInsight = popularTopics.find { query.contains(it.keyword) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(LibraryColors.SurfaceDark)
                .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(20.dp)
        ) {
            Column {
                Text(
                    text = "ماذا يقول الإمام السجاد (ع) عن...؟",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = LibraryColors.TextWhite
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "اطرح أي سؤال بلسان طفولي أو أسري للبحث الفوري في نصوص الصحيفة السجادية (#5586).",
                    fontSize = 12.sp,
                    color = LibraryColors.TextMuted,
                    lineHeight = 18.sp
                )

                Spacer(modifier = Modifier.height(14.dp))

                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(popularTopics) { topic ->
                        val selected = query == topic.keyword
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) LibraryColors.TealPrimary else LibraryColors.SurfaceCard)
                                .clickable { query = topic.keyword }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = topic.keyword,
                                color = if (selected) LibraryColors.TextWhite else LibraryColors.TextMuted,
                                fontSize = 12.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        activeInsight?.let { insight ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LibraryColors.AmberAccent.copy(alpha = 0.12f))
                    .border(1.dp, LibraryColors.AmberAccent.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = LibraryColors.AmberAccent, modifier = Modifier.size(16.dp))
                        Text("درس عملي للطفل والناشئ:", color = LibraryColors.AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(insight.lesson, color = LibraryColors.TextWhite, fontSize = 12.sp, lineHeight = 18.sp)
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        Text(
            text = "الشواهد النصية من الصحيفة السجادية (${matchedPages.size}):",
            color = LibraryColors.TextWhite,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(matchedPages) { page ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(LibraryColors.SurfaceDark)
                        .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = if (page.heading.isNotBlank()) page.heading else "دعاء من الصحيفة السجادية",
                                color = LibraryColors.TealGlow,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            Button(
                                onClick = { onOpenPage(page.pageNumber) },
                                colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                modifier = Modifier.height(30.dp)
                            ) {
                                Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(12.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("ص ${page.pageNumber}", fontSize = 11.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = page.content.take(240) + "…",
                            color = LibraryColors.TextWhite,
                            fontSize = 13.sp,
                            lineHeight = 22.sp
                        )
                    }
                }
            }
        }
    }
}
