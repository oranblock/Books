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
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sparkles
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
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.utils.TextParser

data class TopicPrompt(
    val keyword: String,
    val title: String,
    val lesson: String,
    val defaultKeywords: List<String>
)

@Composable
fun KidAskConsole(
    sahifaBook: Book,
    onOpenPage: (Int) -> Unit
) {
    var query by remember { mutableStateOf("الصبر") }

    val popularTopics = remember {
        listOf(
            TopicPrompt(
                keyword = "الصبر",
                title = "ماذا يقول الإمام السجاد (ع) عن الصبر عند الشدائد؟",
                lesson = "يعلّمنا الإمام أن الصبر ليس مجرد انتظار، بل ثقة وطمأنينة بأن الله تعالى يرى تعبنا وسيبدل الشدة يسراً وفرجاً قريباً.",
                defaultKeywords = listOf("صبر", "صابر", "بلوى", "شدة", "يسر")
            ),
            TopicPrompt(
                keyword = "الوالدين",
                title = "كيف علّمنا الإمام الدعاء للوالدين وبرهما؟",
                lesson = "برّ الوالدين بالابتسامة، والحديث اللطيف، والدعاء لهما بالمغفرة وطول العمر مع العافية، وخفض الجناح لهما رحمةً وعرفاناً.",
                defaultKeywords = listOf("والد", "امي", "ابي", "بر", "ارحم")
            ),
            TopicPrompt(
                keyword = "الهموم",
                title = "ماذا أفعل عندما أشعر بالخوف أو ضيق الصدر؟",
                lesson = "لا تقلق وتوجه إلى الله بالدعاء الخاشع: يا من تُحل به عُقد المكاره ويا من يُلتمس منه مخرج الروح.",
                defaultKeywords = listOf("هم", "غم", "كرب", "مكاره", "فرج")
            ),
            TopicPrompt(
                keyword = "التوبة",
                title = "كيف أطلب العفو إذا أخطأت في حق الله أو الناس؟",
                lesson = "باب الله مفتوح دائماً ولا تيأس؛ إذا أخطأت فاعتذر بصدق واطلب المغفرة، والله يحب التوابين ويفرح بعودتهم.",
                defaultKeywords = listOf("توب", "عفو", "غفر", "ذنب", "ندم")
            ),
            TopicPrompt(
                keyword = "العافية",
                title = "كيف نشكر الله على نعمة الصحة والسلامة؟",
                lesson = "اشكر الله على صحتك وسلامة حواسك كل صباح ومساء، واستخدم طاقتك في مساعدة الضعفاء وإسعاد من حولك.",
                defaultKeywords = listOf("عافي", "صحة", "شفاء", "بدن", "سلام")
            ),
            TopicPrompt(
                keyword = "الرزق",
                title = "طلب سعة الرزق وقضاء الحوائج؟",
                lesson = "الرزق ليس مالاً فقط، بل هو العلم النافع، والأصدقاء الصالحون، وراحة البال، والبركة في كل عمل طيب.",
                defaultKeywords = listOf("رزق", "دين", "حاجة", "برك", "كفاف")
            ),
            TopicPrompt(
                keyword = "مكارم الأخلاق",
                title = "دعاء مكارم الأخلاق ومرضي الأفعال؟",
                lesson = "الإمام يدعونا إلى أن نقابل الإساءة بالإحسان، وأن ننشر السلام، ونكظم الغيظ، ونكون قدوة في الصدق والأمانة.",
                defaultKeywords = listOf("اخلاق", "كرم", "احسان", "صدق", "عدل")
            )
        )
    }

    val activeInsight = remember(query) {
        val normQ = TextParser.normalizeForSearch(query)
        popularTopics.find { topic ->
            val normK = TextParser.normalizeForSearch(topic.keyword)
            normQ.contains(normK) || topic.defaultKeywords.any { normQ.contains(it) }
        }
    }

    val matchedPages = remember(query, sahifaBook) {
        val normQ = TextParser.normalizeForSearch(query)
        val tokens = TextParser.tokenizeArabic(query)

        if (tokens.isEmpty()) {
            sahifaBook.pages.take(4)
        } else {
            val scored = sahifaBook.pages.map { page ->
                val normHeading = TextParser.normalizeForSearch(page.heading)
                val normContent = TextParser.normalizeForSearch(page.content)
                var score = 0
                for (token in tokens) {
                    if (normHeading.contains(token)) score += 10
                    if (normContent.contains(token)) score += 2
                }
                page to score
            }.filter { it.second > 0 }.sortedByDescending { it.second }.map { it.first }

            if (scored.isNotEmpty()) scored.take(6) else sahifaBook.pages.take(3)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Hero search container
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(LibraryColors.SurfaceDark)
                .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                .padding(18.dp)
        ) {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Sparkles, contentDescription = null, tint = LibraryColors.AmberAccent)
                    Text(
                        text = "اسأل الإمام زين العابدين (ع)",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = LibraryColors.TextWhite
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "مساعد بحث ذكي مستند إلى نصوص الصحيفة السجادية (#5586) بلغة تربوية ميسرة للناشئة والأسرة.",
                    fontSize = 11.sp,
                    color = LibraryColors.TextMuted,
                    lineHeight = 17.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("اكتب سؤالك (مثال: ماذا يقول عن الصبر؟ بر الوالدين)...", fontSize = 11.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = LibraryColors.TealGlow) },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = LibraryColors.SurfaceCard,
                        unfocusedContainerColor = LibraryColors.SurfaceCard,
                        focusedTextColor = LibraryColors.TextWhite,
                        unfocusedTextColor = LibraryColors.TextWhite
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

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
                                fontSize = 11.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Practical Lesson Banner
        activeInsight?.let { insight ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(LibraryColors.AmberAccent.copy(alpha = 0.12f))
                    .border(1.dp, LibraryColors.AmberAccent.copy(alpha = 0.35f), RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = LibraryColors.AmberAccent, modifier = Modifier.size(16.dp))
                        Text(insight.title, color = LibraryColors.AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(insight.lesson, color = LibraryColors.TextWhite, fontSize = 12.sp, lineHeight = 19.sp)
                }
            }
            Spacer(modifier = Modifier.height(14.dp))
        }

        // Matched texts
        Text(
            text = "الشواهد النصية من الصحيفة السجادية (${matchedPages.size}):",
            color = LibraryColors.TextWhite,
            fontSize = 13.sp,
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
                                text = page.heading.ifBlank { "دعاء من الصحيفة السجادية" },
                                color = LibraryColors.TealGlow,
                                fontSize = 13.sp,
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
                            text = page.content.take(220) + "…",
                            color = LibraryColors.TextWhite,
                            fontSize = 12.sp,
                            lineHeight = 21.sp
                        )
                    }
                }
            }
        }
    }
}
