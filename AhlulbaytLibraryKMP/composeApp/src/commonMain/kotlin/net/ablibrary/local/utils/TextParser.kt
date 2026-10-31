package net.ablibrary.local.utils

import kotlinx.serialization.json.*
import net.ablibrary.local.model.Book
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.model.TocItem

object TextParser {
    // Unicode range for Arabic Tashkeel (harakat), tatweel, Quranic recitation signs
    private val TASHKEEL_REGEX = Regex("[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")
    private val PUNCT_REGEX = Regex("[«»\"'\\(\\)\\[\\]،؛:!?؟\\.\\-\\—\\_\\n\\r\\t]")
    private val MULTI_SPACE_REGEX = Regex("\\s+")

    /**
     * Strips Arabic diacritics (tashkeel/harakat) and normalizes character variants
     * (alef, teh marbuta, alef maqsura) for consistent search and clean reading.
     */
    fun stripTashkeel(text: String): String {
        if (text.isBlank()) return ""
        return text
            .replace(TASHKEEL_REGEX, "")
            .replace(Regex("[إأآا]"), "ا")
            .replace('ة', 'ه')
            .replace(Regex("[يى]"), "ي")
    }

    /**
     * Normalizes text for search index / FTS tokenization.
     */
    fun normalizeForSearch(text: String): String {
        if (text.isBlank()) return ""
        return stripTashkeel(text.lowercase())
            .replace(PUNCT_REGEX, " ")
            .replace(MULTI_SPACE_REGEX, " ")
            .trim()
    }

    /**
     * Tokenizes Arabic text into searchable keyword tokens.
     */
    fun tokenizeArabic(text: String): List<String> {
        val normalized = normalizeForSearch(text)
        if (normalized.isBlank()) return emptyList()
        return normalized.split(" ").filter { it.length > 1 }
    }

    /**
     * Parses sahifa_5586.txt format: ===== صفحة X — Y =====
     */
    fun parseSahifaTxt(rawText: String): List<BookPage> {
        val pageHeaderRegex = Regex("=====\\s*صفحة\\s*(\\d+)(?:\\s*[—\\-]\\s*([^=]+))?\\s*=====")
        val matches = pageHeaderRegex.findAll(rawText).toList()
        if (matches.isEmpty()) return emptyList()

        val pages = mutableListOf<BookPage>()
        for (i in matches.indices) {
            val m = matches[i]
            val pageNum = m.groupValues[1].toIntOrNull() ?: (i + 1)
            val pageLabel = m.groupValues.getOrNull(2)?.trim()?.ifBlank { pageNum.toString() } ?: pageNum.toString()
            val startIdx = m.range.last + 1
            val endIdx = if (i + 1 < matches.size) matches[i + 1].range.first else rawText.length
            val rawBlock = rawText.substring(startIdx, endIdx).trim()

            var heading = ""
            val lines = rawBlock.lines().toMutableList()
            if (lines.isNotEmpty() && lines[0].trim().startsWith("#")) {
                heading = lines[0].trim().removePrefix("#").trim()
                lines.removeAt(0)
            }

            val content = lines.joinToString("\n").trim()
            pages.add(
                BookPage(
                    pageNumber = pageNum,
                    pageLabel = pageLabel,
                    heading = heading,
                    content = content
                )
            )
        }
        return pages
    }

    /**
     * Checks if a line is a probable chapter, section, or prayer heading.
     */
    fun isProbableHeading(line: String): Boolean {
        val t = line.trim()
        if (t.length !in 3..150) return false
        if (t.startsWith("#")) return true
        val norm = normalizeForSearch(t)
        return norm.startsWith("باب ") || norm.startsWith("فصل ") ||
                norm.startsWith("المقدمة") || norm.startsWith("الخاتمة") ||
                norm.startsWith("خطبة ") || norm.startsWith("رسالة ") ||
                norm.startsWith("دعاء ") || norm.contains("وكان من دعائه") ||
                norm.contains("دعاؤه في") || norm.contains("دعاؤه اذا") ||
                (t.startsWith("*") && t.endsWith("*")) ||
                (t.contains("باب") && (t.startsWith("(") || t.startsWith("*")))
    }

    fun cleanHeadingText(line: String): String {
        return line.trim()
            .removePrefix("#").trim()
            .trim('*', '—', '-', ' ', ':', '؛')
            .trim()
    }

    /**
     * Recursively extracts headings and text from an abx.pages JSON element.
     */
    fun walkAbxNode(
        element: JsonElement,
        outLines: MutableList<String>,
        headings: MutableList<String>,
        isParentHeading: Boolean = false
    ) {
        when (element) {
            is JsonObject -> {
                val hasHeadingProp = element.containsKey("heading") && element["heading"] !is JsonNull
                val isHeading = hasHeadingProp || isParentHeading
                val textEl = element["text"]

                if (textEl is JsonObject) {
                    val txt = textEl["text"]?.jsonPrimitive?.contentOrNull?.trim()
                    if (!txt.isNullOrBlank()) {
                        if (isHeading) {
                            headings.add(txt)
                        } else {
                            outLines.add(txt)
                        }
                    }
                } else if (textEl is JsonPrimitive) {
                    val txt = textEl.contentOrNull?.trim()
                    if (!txt.isNullOrBlank()) {
                        if (isHeading) {
                            headings.add(txt)
                        } else {
                            outLines.add(txt)
                        }
                    }
                }

                val headingEl = element["heading"]
                if (headingEl is JsonObject) {
                    walkAbxNode(headingEl, outLines, headings, isParentHeading = true)
                }

                element["children"]?.jsonArray?.forEach {
                    walkAbxNode(it, outLines, headings, isParentHeading = isHeading)
                }
                element["contents"]?.jsonArray?.forEach {
                    if (it != element) walkAbxNode(it, outLines, headings, isParentHeading = false)
                }
            }
            is JsonArray -> {
                element.forEach { walkAbxNode(it, outLines, headings, isParentHeading = isParentHeading) }
            }
            else -> {}
        }
    }

    /**
     * Parses contents_full.json format (abx.pages or pages array).
     */
    fun parseContentsFullJson(jsonStr: String): List<BookPage> {
        val json = Json { ignoreUnknownKeys = true; isLenient = true }
        val root = try { json.parseToJsonElement(jsonStr) } catch (_: Exception) { return emptyList() }

        val pagesArray: JsonArray = when {
            root is JsonObject && root["abx"] is JsonObject && (root["abx"] as JsonObject)["pages"] is JsonArray -> {
                (root["abx"] as JsonObject)["pages"]!!.jsonArray
            }
            root is JsonObject && root["pages"] is JsonArray -> {
                root["pages"]!!.jsonArray
            }
            root is JsonArray -> root
            else -> return emptyList()
        }

        val result = mutableListOf<BookPage>()
        for ((idx, pageEl) in pagesArray.withIndex()) {
            if (pageEl !is JsonObject) continue
            val num = pageEl["number"]?.jsonPrimitive?.intOrNull
                ?: pageEl["page_number"]?.jsonPrimitive?.intOrNull
                ?: (idx + 1)
            val lbl = pageEl["label"]?.jsonPrimitive?.contentOrNull
                ?: pageEl["page_label"]?.jsonPrimitive?.contentOrNull
                ?: num.toString()

            var heading = pageEl["heading"]?.jsonPrimitive?.contentOrNull ?: ""
            val outLines = mutableListOf<String>()
            val headings = mutableListOf<String>()

            // If flat content exists
            val flatContent = pageEl["content"]?.jsonPrimitive?.contentOrNull
            if (!flatContent.isNullOrBlank()) {
                outLines.add(flatContent)
            } else {
                walkAbxNode(pageEl, outLines, headings)
            }

            if (heading.isBlank() && headings.isNotEmpty()) {
                heading = headings.joinToString(" - ").trim()
            }

            // Smart fallback if heading is still blank: inspect first lines
            if (heading.isBlank() && outLines.isNotEmpty()) {
                for (line in outLines.take(3)) {
                    val trimmedLine = line.trim()
                    if (isProbableHeading(trimmedLine)) {
                        heading = cleanHeadingText(trimmedLine)
                        break
                    }
                }
            }

            result.add(
                BookPage(
                    pageNumber = num,
                    pageLabel = lbl,
                    heading = heading,
                    content = outLines.joinToString("\n").trim()
                )
            )
        }
        return result
    }

    /**
     * Parses XML <page> tags.
     */
    fun parseXmlPages(rawXml: String): List<BookPage> {
        val pageTagRegex = Regex("<page(?:\\s+number=[\"'](\\d+)[\"'])?(?:\\s+label=[\"']([^\"']*)[\"'])?>([\\s\\S]*?)</page>", RegexOption.IGNORE_CASE)
        val headingRegex = Regex("<heading>([\\s\\S]*?)</heading>", RegexOption.IGNORE_CASE)
        val matches = pageTagRegex.findAll(rawXml).toList()
        if (matches.isEmpty()) return emptyList()

        val pages = mutableListOf<BookPage>()
        for ((idx, m) in matches.withIndex()) {
            val num = m.groupValues[1].toIntOrNull() ?: (idx + 1)
            val lbl = m.groupValues[2].ifBlank { num.toString() }
            val inner = m.groupValues[3]

            val headingMatch = headingRegex.find(inner)
            val heading = headingMatch?.groupValues?.get(1)?.trim() ?: ""
            val cleanContent = inner.replace(headingRegex, "").replace(Regex("<[^>]+>"), "").trim()

            pages.add(
                BookPage(
                    pageNumber = num,
                    pageLabel = lbl,
                    heading = heading,
                    content = cleanContent
                )
            )
        }
        return pages
    }

    /**
     * Auto-detects and parses any text, json, or xml into structured BookPage list.
     */
    fun parseAnyContent(rawText: String): Pair<List<BookPage>, String> {
        val trimmed = rawText.trim()
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            val jsonPages = parseContentsFullJson(trimmed)
            if (jsonPages.isNotEmpty()) return jsonPages to "JSON (contents_full.json / abx.pages)"
        }

        if (trimmed.contains("===== صفحة") || trimmed.contains("=====صفحة")) {
            val txtPages = parseSahifaTxt(trimmed)
            if (txtPages.isNotEmpty()) return txtPages to "نص مهيكل (===== صفحة X — Y =====)"
        }

        if (trimmed.contains("<page") && trimmed.contains("</page>")) {
            val xmlPages = parseXmlPages(trimmed)
            if (xmlPages.isNotEmpty()) return xmlPages to "XML (<page> tags)"
        }

        // Fallback: chunk by separator '---' or paragraph size
        val parts = if (trimmed.contains("\n---")) {
            trimmed.split(Regex("\\n---\\n?")).map { it.trim() }.filter { it.isNotEmpty() }
        } else {
            val lines = trimmed.lines()
            val chunks = mutableListOf<String>()
            val buf = StringBuilder()
            for (line in lines) {
                buf.appendLine(line)
                if (buf.length >= 1500) {
                    chunks.add(buf.toString().trim())
                    buf.clear()
                }
            }
            if (buf.isNotBlank()) chunks.add(buf.toString().trim())
            chunks
        }

        val pages = parts.mapIndexed { idx, content ->
            val lines = content.lines()
            var heading = ""
            var body = content
            if (lines.isNotEmpty() && lines[0].startsWith("#")) {
                heading = lines[0].removePrefix("#").trim()
                body = lines.drop(1).joinToString("\n").trim()
            }
            BookPage(
                pageNumber = idx + 1,
                pageLabel = (idx + 1).toString(),
                heading = heading,
                content = body
            )
        }
        return pages to "نص حر مجزأ إلى صفحات"
    }

    /**
     * Backward-compatible alias for parseAnyContent.first
     */
    fun parseAnyTextOrJsonToPages(rawText: String): List<BookPage> = parseAnyContent(rawText).first

    /**
     * Generates Table of Contents from pages with consecutive deduplication.
     */
    fun extractToc(pages: List<BookPage>): List<TocItem> {
        val result = mutableListOf<TocItem>()
        var lastHeading = ""
        for (p in pages) {
            val h = p.heading.trim()
            if (h.isNotBlank() && h != lastHeading) {
                result.add(
                    TocItem(
                        title = h,
                        pageNumber = p.pageNumber,
                        pageLabel = p.pageLabel.ifBlank { p.pageNumber.toString() }
                    )
                )
                lastHeading = h
            }
        }
        return result
    }

    /**
     * Exports book pages to sahifa_5586.txt format.
     */
    fun exportBookAsTxt(book: Book, pages: List<BookPage>): String {
        val sb = StringBuilder()
        sb.appendLine("==========================================================")
        sb.appendLine("مكتبة أهل البيت (ع) - النسخة المتنقلة")
        sb.appendLine("كتاب: ${book.title}${book.volumeLabel?.let { " (ج $it)" } ?: ""}")
        book.authorName?.let { sb.appendLine("المؤلف: $it ${book.deathDisplay?.let { d -> "($d)" } ?: ""}") }
        sb.appendLine("معرف الكتاب: #${book.id}")
        sb.appendLine("إجمالي الصفحات: ${pages.size}")
        sb.appendLine("==========================================================")
        sb.appendLine()

        for (p in pages) {
            sb.appendLine("===== صفحة ${p.pageNumber} — ${p.pageLabel.ifBlank { p.pageNumber.toString() }} =====")
            if (p.heading.isNotBlank()) {
                sb.appendLine("# ${p.heading}")
                sb.appendLine()
            }
            sb.appendLine(p.content)
            sb.appendLine()
        }
        return sb.toString()
    }
}
