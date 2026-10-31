package net.ablibrary.local.net

import kotlinx.serialization.json.*
import net.ablibrary.local.model.BookPage
import net.ablibrary.local.utils.TextParser

object RemoteBookFetcher {
    private const val CONTENTS_URL = "https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Contents"
    private const val DETAILS_URL = "https://grpc.ablibrary.net/ablibrary.services.book_service.BookService/Details"

    private val RPC_HEADERS = mapOf(
        "User-Agent" to "Mozilla/5.0 (Linux; Android 15; Mobile) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
        "Origin" to "https://ablibrary.net",
        "Referer" to "https://ablibrary.net/",
        "Content-Type" to "application/json",
        "Connect-Protocol-Version" to "1"
    )

    suspend fun fetchBookPages(bookId: Long): Result<List<BookPage>> {
        // Step 1: Call BookService/Contents with {"bookId": "$bookId"}
        val payloads = listOf(
            """{"bookId":"$bookId"}""",
            """{"id":"$bookId"}"""
        )

        for (body in payloads) {
            val response = NetworkClient.post(CONTENTS_URL, RPC_HEADERS, body)
            if (response.isSuccessful && response.body.isNotBlank()) {
                val pages = TextParser.parseContentsFullJson(response.body)
                if (pages.isNotEmpty()) {
                    return Result.success(pages)
                }
            }
        }

        // Step 2: Fallback to BookService/Details to locate attachments
        try {
            val detailsResp = NetworkClient.post(DETAILS_URL, RPC_HEADERS, """{"id":"$bookId"}""")
            if (detailsResp.isSuccessful && detailsResp.body.isNotBlank()) {
                val json = Json { ignoreUnknownKeys = true; isLenient = true }
                val root = json.parseToJsonElement(detailsResp.body).jsonObject
                val bookObj = root["book"]?.jsonObject
                val atts = bookObj?.get("attachments")?.jsonArray

                if (atts != null && atts.isNotEmpty()) {
                    // Find json or text attachment
                    val sorted = atts.mapNotNull { it as? JsonObject }.sortedBy { att ->
                        val ctx = att["context"]?.jsonPrimitive?.contentOrNull ?: ""
                        val name = att["filename"]?.jsonPrimitive?.contentOrNull ?: ""
                        when {
                            ctx == "abx.pages" || name.contains(".json") -> 0
                            ctx == "text.export" || name.contains(".txt") -> 1
                            else -> 2
                        }
                    }

                    for (att in sorted) {
                        val fileId = att["fileId"]?.jsonPrimitive?.longOrNull
                            ?: att["file_id"]?.jsonPrimitive?.longOrNull
                            ?: att["id"]?.jsonPrimitive?.longOrNull

                        if (fileId != null) {
                            val downloadUrls = listOf(
                                "https://api.ablibrary.net/files/$fileId/download",
                                "https://files.ablibrary.net/books/$bookId/$fileId",
                                "https://ablibrary.net/api/files/$fileId"
                            )
                            for (dUrl in downloadUrls) {
                                val dlResp = NetworkClient.get(dUrl)
                                if (dlResp.isSuccessful && dlResp.body.isNotBlank()) {
                                    val parsed = TextParser.parseAnyContent(dlResp.body).first
                                    if (parsed.isNotEmpty()) {
                                        return Result.success(parsed)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        return Result.failure(Exception("تعذر استرجاع محتوى الكتاب عن بعد. يمكنك استيراد ملف محلي (JSON أو TXT)."))
    }
}
