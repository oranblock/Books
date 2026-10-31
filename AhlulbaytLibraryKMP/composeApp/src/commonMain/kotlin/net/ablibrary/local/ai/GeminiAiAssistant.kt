package net.ablibrary.local.ai

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.net.NetworkClient

@Serializable
data class VocabItem(
    val word: String,
    val meaning: String
)

@Serializable
data class AiAnswerResult(
    val title: String,
    val summary: String,
    val directQuote: String,
    val practicalLesson: String,
    val vocabulary: List<VocabItem> = emptyList(),
    val followUpQuestions: List<String> = emptyList()
)

object GeminiAiAssistant {
    private const val GEMINI_FLASH_MODEL = "gemini-2.5-flash"

    suspend fun askAssistant(
        question: String,
        contextPages: List<BookPage>,
        apiKey: String? = null,
        serverProxyUrl: String? = null
    ): Result<AiAnswerResult> {
        val cleanQ = question.trim()
        if (cleanQ.isBlank()) return Result.failure(Exception("السؤال مطلوب"))

        // Build context snippet from matched pages
        val contextSnippet = if (contextPages.isNotEmpty()) {
            contextPages.take(3).joinToString("\n\n") { p ->
                "--- [صفحة ${p.pageNumber} - ${p.heading.ifBlank { "دعاء من الصحيفة السجادية" }}] ---\n${p.content.take(1200)}"
            }
        } else {
            "نصوص وأدعية الصحيفة السجادية للإمام علي بن الحسين زين العابدين عليه السلام."
        }

        // Try server proxy first if provided
        if (!serverProxyUrl.isNullOrBlank()) {
            try {
                val payload = buildJsonObject {
                    put("question", cleanQ)
                    put("targetAudience", "kids")
                    putJsonArray("contextPages") {
                        contextPages.take(3).forEach { p ->
                            addJsonObject {
                                put("pageNumber", p.pageNumber)
                                put("heading", p.heading)
                                put("content", p.content.take(1200))
                            }
                        }
                    }
                }.toString()

                val resp = NetworkClient.post(
                    serverProxyUrl,
                    mapOf("Content-Type" to "application/json"),
                    payload
                )

                if (resp.isSuccessful) {
                    val root = Json.parseToJsonElement(resp.body).jsonObject
                    val resultObj = root["result"]?.jsonObject
                    if (resultObj != null) {
                        return Result.success(parseAiResultJson(resultObj))
                    }
                }
            } catch (_: Exception) {}
        }

        // Direct Gemini API call if API key provided or available
        val effectiveKey = apiKey?.trim()?.ifBlank { null }
        if (effectiveKey != null) {
            try {
                val geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_FLASH_MODEL:generateContent?key=$effectiveKey"
                val systemInstruction = """
                    أنت "المعلم القرآني والسجادي اللطيف للأطفال والناشئة" (Child-friendly Ahlulbayt Spiritual Guide).
                    مهمتك:
                    1. الإجابة عن سؤال الطفل أو الناشئة بأسلوب دافئ، مشوق، ومبسط يزرع في قلبه المحبة والسكينة والرحمة.
                    2. الاستناد المباشر إلى نصوص الصحيفة السجادية المرفقة في السياق (كلام الإمام علي بن الحسين ع).
                    3. استخراج اقتباس حرفي دقيق من كلام الإمام بين قوسين «...».
                    4. تقديم تطبيق عملي وسلوكي في حياة الطفل اليومية.
                    5. أخرج النتيجة فقط بصيغة JSON متوافقة:
                    {
                      "title": "...",
                      "summary": "...",
                      "directQuote": "...",
                      "practicalLesson": "...",
                      "vocabulary": [{"word": "...", "meaning": "..."}],
                      "followUpQuestions": ["...", "..."]
                    }
                """.trimIndent()

                val prompt = """
                    السؤال: "$cleanQ"
                    السياق من الصحيفة السجادية (#5586):
                    $contextSnippet
                """.trimIndent()

                val requestBody = buildJsonObject {
                    putJsonArray("contents") {
                        addJsonObject {
                            putJsonArray("parts") {
                                addJsonObject { put("text", "$systemInstruction\n\n$prompt") }
                            }
                        }
                    }
                    putJsonObject("generationConfig") {
                        put("responseMimeType", "application/json")
                    }
                }.toString()

                val resp = NetworkClient.post(
                    geminiUrl,
                    mapOf("Content-Type" to "application/json"),
                    requestBody
                )

                if (resp.isSuccessful) {
                    val root = Json.parseToJsonElement(resp.body).jsonObject
                    val candidate = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
                    val contentObj = candidate?.get("content")?.jsonObject
                    val textPart = contentObj?.get("parts")?.jsonArray?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.contentOrNull

                    if (!textPart.isNullOrBlank()) {
                        val parsedObj = Json.parseToJsonElement(textPart).jsonObject
                        return Result.success(parseAiResultJson(parsedObj))
                    }
                }
            } catch (_: Exception) {}
        }

        // Contextual Fallback for 100% offline usage
        val firstPage = contextPages.firstOrNull()
        val quote = firstPage?.content?.lines()?.take(4)?.joinToString(" ")?.take(180)
            ?: "«الْحَمْدُ لِلَّهِ الَّذِي هَدَانَا لِحَمْدِهِ، وَجَعَلَنَا مِنْ أَهْلِهِ لِنَكُونَ لإِحْسَانِهِ مِنَ الشَّاكِرِينَ»"

        val fallbackResult = AiAnswerResult(
            title = "ما يعلّمنا إياه الإمام زين العابدين (ع) عن $cleanQ",
            summary = "يدعونا الإمام السجاد عليه السلام إلى إدراك أن اللجوء إلى الله ومناجاته هو مفتاح كل خير وطمأنينة. عندما تسأل عن $cleanQ، فإن أهل البيت عليهم السلام يرشدوننا إلى حسن الظن بالله، والتخلق بالأخلاق الكريمة، والصبر الجميل مع بذل الإحسان للآخرين.",
            directQuote = quote,
            practicalLesson = "في يومك، ابدأ صباحك بذكر الله وشكره على نعمة العافية، وعامل والديك وإخوتك في البيت والمدرسة بابتسامة ولسان طيب.",
            vocabulary = listOf(
                VocabItem("الرَّوْح", "الراحة والفرج بعد الشدة"),
                VocabItem("المَكَارِه", "المصاعب والهموم التي تزول بالدعاء")
            ),
            followUpQuestions = listOf(
                "كيف أدعو لوالدي كما علّمنا الإمام السجاد؟",
                "ما هو دعاء تفريج الهم والخوف؟"
            )
        )

        return Result.success(fallbackResult)
    }

    suspend fun explainPage(
        pageNumber: Int,
        heading: String,
        content: String,
        apiKey: String? = null
    ): String {
        val cleanH = heading.ifBlank { "دعاء مبارك" }
        val cleanC = content.take(1500)

        val effectiveKey = apiKey?.trim()?.ifBlank { null }
        if (effectiveKey != null) {
            try {
                val geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/$GEMINI_FLASH_MODEL:generateContent?key=$effectiveKey"
                val prompt = """
                    أنت مرشد روحي يشرح أدعية الصحيفة السجادية للأطفال والأسرة.
                    اشرح هذا المقطع من صفحة $pageNumber ($cleanH):
                    $cleanC
                    
                    المطلوب:
                    1. المعنى الجوهري بأسلوب لطيف.
                    2. درس عملي للطفل.
                    3. مفردتان لغويتان مع معناهما.
                """.trimIndent()

                val requestBody = buildJsonObject {
                    putJsonArray("contents") {
                        addJsonObject {
                            putJsonArray("parts") { addJsonObject { put("text", prompt) } }
                        }
                    }
                }.toString()

                val resp = NetworkClient.post(
                    geminiUrl,
                    mapOf("Content-Type" to "application/json"),
                    requestBody
                )

                if (resp.isSuccessful) {
                    val root = Json.parseToJsonElement(resp.body).jsonObject
                    val candidate = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
                    val contentObj = candidate?.get("content")?.jsonObject
                    val textPart = contentObj?.get("parts")?.jsonArray?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.contentOrNull
                    if (!textPart.isNullOrBlank()) return textPart
                }
            } catch (_: Exception) {}
        }

        // Clean offline explanation
        return """
            📖 تأملات في هذا الدعاء المبارك (صفحة $pageNumber):
            
            • المعنى العام: يتناول هذا المقطع من «$cleanH» أعظم مراتب التوحيد والافتقار إلى الله عز وجل، مبيناً أن راحة القلب الحقيقية تكون في الإقبال على الله ومناجاته بيقين.
            
            • درس للطفل والناشئ: داوم على ذكر الله كلما واجهت موقفاً صعباً، وتذكر أن الله قريب يسمع دعاءك ويحب أن تدعوه بحب وأدب.
            
            • تطبيق عملي: احفظ سطراً واحداً من هذا الدعاء المبارك واقرأه في صلاتك أو قبل نومك.
        """.trimIndent()
    }

    private fun parseAiResultJson(obj: JsonObject): AiAnswerResult {
        val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: "إجابة المساعد الذكي"
        val summary = obj["summary"]?.jsonPrimitive?.contentOrNull ?: ""
        val directQuote = obj["directQuote"]?.jsonPrimitive?.contentOrNull ?: ""
        val practicalLesson = obj["practicalLesson"]?.jsonPrimitive?.contentOrNull ?: ""

        val vocabList = mutableListOf<VocabItem>()
        obj["vocabulary"]?.jsonArray?.forEach { v ->
            if (v is JsonObject) {
                val w = v["word"]?.jsonPrimitive?.contentOrNull ?: ""
                val m = v["meaning"]?.jsonPrimitive?.contentOrNull ?: ""
                if (w.isNotBlank()) vocabList.add(VocabItem(w, m))
            }
        }

        val followUps = mutableListOf<String>()
        obj["followUpQuestions"]?.jsonArray?.forEach { f ->
            val q = f.jsonPrimitive.contentOrNull
            if (!q.isNullOrBlank()) followUps.add(q)
        }

        return AiAnswerResult(
            title = title,
            summary = summary,
            directQuote = directQuote,
            practicalLesson = practicalLesson,
            vocabulary = vocabList,
            followUpQuestions = followUps
        )
    }
}
