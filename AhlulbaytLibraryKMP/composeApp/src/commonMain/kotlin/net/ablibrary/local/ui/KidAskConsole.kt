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
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.ablibrary.local.ai.AiAnswerResult
import net.ablibrary.local.ai.GeminiAiAssistant
import net.ablibrary.local.model.Book
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.utils.TextParser

data class TopicPrompt(
    val keyword: String,
    val title: String,
    val defaultKeywords: List<String>
)

@Composable
fun KidAskConsole(
    sahifaBook: Book,
    onOpenPage: (Int) -> Unit
) {
    var query by remember { mutableStateOf("الصبر") }
    var useAiAssistant by remember { mutableStateOf(true) }
    var isAiLoading by remember { mutableStateOf(false) }
    var aiResult by remember { mutableStateOf<AiAnswerResult?>(null) }
    var aiError by remember { mutableStateOf<String?>(null) }
    var showApiKeyDialog by remember { mutableStateOf(false) }
    var customApiKey by remember { mutableStateOf("") }
    var copiedMessage by remember { mutableStateOf<String?>(null) }
    var isPlayingAudio by remember { mutableStateOf(false) }

    val audioReader = remember { net.ablibrary.local.utils.AudioReader() }
    val coroutineScope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current

    val popularTopics = remember {
        listOf(
            TopicPrompt("الصبر", "ماذا يقول الإمام السجاد (ع) عن الصبر عند الشدائد؟", listOf("صبر", "صابر", "بلوى", "شدة", "يسر")),
            TopicPrompt("الوالدين", "كيف علّمنا الإمام الدعاء للوالدين وبرهما؟", listOf("والد", "امي", "ابي", "بر", "ارحم")),
            TopicPrompt("الهموم", "ماذا أفعل عندما أشعر بالخوف أو ضيق الصدر؟", listOf("هم", "غم", "كرب", "مكاره", "فرج")),
            TopicPrompt("التوبة", "كيف أطلب العفو إذا أخطأت في حق الله أو الناس؟", listOf("توب", "عفو", "غفر", "ذنب", "ندم")),
            TopicPrompt("العافية", "كيف نشكر الله على نعمة الصحة والسلامة؟", listOf("عافي", "صحة", "شفاء", "بدن", "سلام")),
            TopicPrompt("الرزق", "طلب سعة الرزق وقضاء الحوائج؟", listOf("رزق", "دين", "حاجة", "برك", "كفاف")),
            TopicPrompt("مكارم الأخلاق", "دعاء مكارم الأخلاق ومرضي الأفعال؟", listOf("اخلاق", "كرم", "احسان", "صدق", "عدل"))
        )
    }

    // Local FTS exact search hits
    val matchedPages = remember(query, sahifaBook) {
        val normQ = TextParser.normalizeForSearch(query)
        val tokens = TextParser.tokenizeArabic(query)

        if (normQ.isBlank()) {
            sahifaBook.pages.take(5)
        } else {
            val scored = sahifaBook.pages.map { p ->
                val normHeading = TextParser.normalizeForSearch(p.heading)
                val normContent = TextParser.normalizeForSearch(p.content)
                var score = 0
                if (normHeading.contains(normQ)) score += 10
                if (normContent.contains(normQ)) score += 5
                for (token in tokens) {
                    if (normHeading.contains(token)) score += 3
                    if (normContent.contains(token)) score += 1
                }
                p to score
            }.filter { it.second > 0 }.sortedByDescending { it.second }.map { it.first }

            if (scored.isNotEmpty()) scored.take(5) else sahifaBook.pages.take(3)
        }
    }

    // Function to trigger AI generation
    fun executeAiQuery(questionText: String) {
        if (questionText.isBlank()) return
        isAiLoading = true
        aiError = null

        coroutineScope.launch {
            val res = GeminiAiAssistant.askAssistant(
                question = questionText,
                contextPages = matchedPages,
                apiKey = customApiKey.ifBlank { null }
            )
            isAiLoading = false
            res.onSuccess { aiResult = it }
            res.onFailure { aiError = it.message }
        }
    }

    // Initial AI fetch
    LaunchedEffect(Unit) {
        if (useAiAssistant && query.isNotBlank()) {
            executeAiQuery(query)
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Header & Mode Switcher
        item {
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(LibraryColors.SurfaceDark)
                    .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                    .padding(20.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Mode Switcher Buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color.White.copy(alpha = 0.05f))
                                .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(12.dp))
                                .padding(3.dp),
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Button(
                                onClick = {
                                    useAiAssistant = true
                                    executeAiQuery(query)
                                },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (useAiAssistant) LibraryColors.TealPrimary else Color.Transparent,
                                    contentColor = if (useAiAssistant) Color.White else LibraryColors.TextMuted
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("المساعد الذكي AI", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { useAiAssistant = false },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (!useAiAssistant) LibraryColors.GreenOffline else Color.Transparent,
                                    contentColor = if (!useAiAssistant) Color.Black else LibraryColors.TextMuted
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                                modifier = Modifier.height(32.dp)
                            ) {
                                Icon(Icons.Default.Bolt, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("استرجاع فوري FTS", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }

                        IconButton(
                            onClick = { showApiKeyDialog = true },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Settings, contentDescription = "إعدادات AI", tint = LibraryColors.TextMuted)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "ماذا يقول الإمام السجاد (ع) عن...؟",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "اطرح أي سؤال بلسان طفولي أو بحثي (الصبر، الوالدين، الهم، التوبة). يقوم النظام باستخراج الشاهد من الصحيفة السجادية (#5586) وتلخيص العبرة الأخلاقية.",
                        color = LibraryColors.TextMuted,
                        fontSize = 12.sp,
                        lineHeight = 18.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Search input
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("اكتب موضوعاً: ماذا يقول الإمام عن الصبر؟...", fontSize = 13.sp, color = LibraryColors.TextMuted) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = LibraryColors.TealGlow) },
                        trailingIcon = {
                            if (useAiAssistant) {
                                Button(
                                    onClick = { executeAiQuery(query) },
                                    enabled = !isAiLoading && query.isNotBlank(),
                                    colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                    modifier = Modifier.padding(end = 4.dp).height(34.dp)
                                ) {
                                    if (isAiLoading) {
                                        CircularProgressIndicator(modifier = Modifier.size(14.dp), color = Color.White, strokeWidth = 2.dp)
                                    } else {
                                        Text("اسأل AI", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = LibraryColors.TealPrimary,
                            unfocusedBorderColor = LibraryColors.BorderSubtle,
                            focusedContainerColor = LibraryColors.SurfaceCard,
                            unfocusedContainerColor = LibraryColors.SurfaceCard,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Topic chips
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(popularTopics) { topic ->
                            val isSelected = query == topic.keyword
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) LibraryColors.TealPrimary else LibraryColors.SurfaceCard)
                                    .border(1.dp, if (isSelected) LibraryColors.TealPrimary else LibraryColors.BorderSubtle, RoundedCornerShape(8.dp))
                                    .clickable {
                                        query = topic.keyword
                                        if (useAiAssistant) executeAiQuery(topic.keyword)
                                    }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = topic.keyword,
                                    fontSize = 12.sp,
                                    color = if (isSelected) Color.White else LibraryColors.TextWhite,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            }
                        }
                    }
                }
            }
        }

        // Section 1: AI Result Card (When in AI Mode)
        if (useAiAssistant) {
            item {
                if (isAiLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(LibraryColors.SurfaceDark)
                            .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CircularProgressIndicator(color = LibraryColors.TealGlow, modifier = Modifier.size(28.dp))
                            Text("جاري استخراج الشاهد وتلخيص المعنى بالذكاء الاصطناعي...", color = Color.White, fontSize = 13.sp)
                            Text("استناداً إلى نصوص الصحيفة السجادية المباركة", color = LibraryColors.TextMuted, fontSize = 11.sp)
                        }
                    }
                } else aiResult?.let { result ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(LibraryColors.SurfaceDark)
                            .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                            .padding(18.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            // Header
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = LibraryColors.AmberAccent, modifier = Modifier.size(16.dp))
                                    Text("إجابة المساعد الذكي AI", color = LibraryColors.TealGlow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Button(
                                        onClick = {
                                            if (isPlayingAudio) {
                                                audioReader.stop()
                                                isPlayingAudio = false
                                            } else {
                                                audioReader.speak("${result.title}. ${result.summary}. ومن كلام الإمام: ${result.directQuote}. والتطبيق العملي: ${result.practicalLesson}")
                                                isPlayingAudio = true
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (isPlayingAudio) LibraryColors.AmberAccent else LibraryColors.SurfaceCard,
                                            contentColor = if (isPlayingAudio) Color.Black else LibraryColors.TextWhite
                                        ),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Icon(if (isPlayingAudio) Icons.Default.Pause else Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(if (isPlayingAudio) "إيقاف" else "استماع صوتي", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }

                                    IconButton(
                                        onClick = {
                                            clipboardManager.setText(AnnotatedString("${result.title}\n\n${result.summary}\n\nالشاهد: ${result.directQuote}\n\nالدرس: ${result.practicalLesson}"))
                                            copiedMessage = "تم نسخ الإجابة بنجاح"
                                        },
                                        modifier = Modifier.size(28.dp)
                                    ) {
                                        Icon(Icons.Default.ContentCopy, contentDescription = "نسخ", tint = LibraryColors.TextMuted, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }

                            Text(
                                text = result.title,
                                color = Color.White,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                lineHeight = 24.sp
                            )

                            // Summary
                            Text(
                                text = result.summary,
                                color = LibraryColors.TextWhite,
                                fontSize = 14.sp,
                                lineHeight = 22.sp
                            )

                            // Direct Quote
                            if (result.directQuote.isNotBlank()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color.Black.copy(alpha = 0.4f))
                                        .border(1.dp, LibraryColors.TealPrimary.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                        .padding(14.dp)
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("📖 الشاهد الحرفي من كلام الإمام السجاد (ع):", color = LibraryColors.TealGlow, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text(result.directQuote, color = LibraryColors.AmberAccent, fontSize = 15.sp, lineHeight = 24.sp)
                                    }
                                }
                            }

                            // Practical Lesson
                            if (result.practicalLesson.isNotBlank()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(LibraryColors.AmberAccent.copy(alpha = 0.1f))
                                        .border(1.dp, LibraryColors.AmberAccent.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                                        .padding(12.dp)
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text("🌱 تطبيق عملي للطفل والناشئ في حياته اليومية:", color = LibraryColors.AmberAccent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        Text(result.practicalLesson, color = LibraryColors.TextWhite, fontSize = 12.sp, lineHeight = 18.sp)
                                    }
                                }
                            }

                            // Vocabulary items
                            if (result.vocabulary.isNotEmpty()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("قاموس الكلمات البلاغية المبسطة:", color = LibraryColors.TextMuted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        items(result.vocabulary) { v ->
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(LibraryColors.SurfaceCard)
                                                    .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(8.dp))
                                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                                            ) {
                                                Column {
                                                    Text(v.word, color = LibraryColors.AmberAccent, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                    Text(v.meaning, color = LibraryColors.TextMuted, fontSize = 10.sp)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Follow-up questions
                            if (result.followUpQuestions.isNotEmpty()) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("أسئلة متابعة مقترحة:", color = LibraryColors.TextMuted, fontSize = 11.sp)
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        items(result.followUpQuestions) { fq ->
                                            OutlinedButton(
                                                onClick = {
                                                    query = fq
                                                    executeAiQuery(fq)
                                                },
                                                shape = RoundedCornerShape(8.dp),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                modifier = Modifier.height(28.dp)
                                            ) {
                                                Text(fq, fontSize = 11.sp, color = LibraryColors.TealGlow)
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

        // Section 2: Raw Indexed Book Pages & Direct Citations
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "الصفحات والشواهد المطابقة في الصحيفة السجادية (${matchedPages.size}):",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "كتاب #5586",
                    color = LibraryColors.TextMuted,
                    fontSize = 11.sp
                )
            }
        }

        items(matchedPages) { page ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(LibraryColors.SurfaceDark)
                    .border(1.dp, LibraryColors.BorderSubtle, RoundedCornerShape(14.dp))
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "[ص ${page.pageLabel.ifBlank { page.pageNumber.toString() }}]",
                            color = LibraryColors.AmberAccent,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Button(
                            onClick = { onOpenPage(page.pageNumber) },
                            colors = ButtonDefaults.buttonColors(containerColor = LibraryColors.TealPrimary),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                            modifier = Modifier.height(28.dp)
                        ) {
                            Icon(Icons.Default.MenuBook, contentDescription = null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("فتح الصفحة", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = page.heading.ifBlank { "دعاء مبارك من الصحيفة السجادية" },
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.Black.copy(alpha = 0.35f))
                            .padding(10.dp)
                    ) {
                        Text(
                            text = page.content.take(240) + if (page.content.length > 240) "..." else "",
                            color = LibraryColors.TextWhite,
                            fontSize = 13.sp,
                            lineHeight = 20.sp
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // Settings dialog for custom Gemini API Key
    if (showApiKeyDialog) {
        AlertDialog(
            onDismissRequest = { showApiKeyDialog = false },
            title = { Text("إعدادات الذكاء الاصطناعي (Gemini)", color = Color.White) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "التطبيق يعمل محلياً بالكامل. إذا أردت استخدام مفتاح Gemini API مخصص للحصول على استجابات حية من جوجل، أدخله هنا:",
                        color = LibraryColors.TextMuted,
                        fontSize = 12.sp
                    )
                    OutlinedTextField(
                        value = customApiKey,
                        onValueChange = { customApiKey = it },
                        placeholder = { Text("مفتاح Gemini API (اختياري)...", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(onClick = { showApiKeyDialog = false }) {
                    Text("حفظ")
                }
            },
            dismissButton = {
                TextButton(onClick = { showApiKeyDialog = false }) {
                    Text("إغلاق")
                }
            },
            containerColor = LibraryColors.SurfaceDark
        )
    }
}
