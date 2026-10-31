package net.ablibrary.local.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class BookPage(
    val id: Long? = null,
    @SerialName("page_number") val pageNumber: Int,
    @SerialName("page_label") val pageLabel: String = "",
    val heading: String = "",
    val content: String = ""
)

@Serializable
data class TocItem(
    val title: String,
    @SerialName("page_number") val pageNumber: Int,
    @SerialName("page_label") val pageLabel: String = ""
)

@Serializable
data class Contributor(
    val name: String,
    val role: String? = null,
    val era: String? = null,
    @SerialName("death_display") val deathDisplay: String? = null
)

@Serializable
data class Book(
    val id: Long,
    val title: String,
    @SerialName("volume_label") val volumeLabel: String? = null,
    @SerialName("volume_number") val volumeNumber: Int? = null,
    @SerialName("page_count") val pageCount: Int? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("category_id") val categoryId: Long? = null,
    @SerialName("author_name") val authorName: String? = null,
    @SerialName("author_era") val authorEra: String? = null,
    @SerialName("death_display") val deathDisplay: String? = null,
    @SerialName("publisher_name") val publisherName: String? = null,
    val printery: String? = null,
    @SerialName("print_year") val printYear: Int? = null,
    val abstract: String? = null,
    @SerialName("is_downloaded") val isDownloaded: Boolean = true,
    val pages: List<BookPage> = emptyList(),
    val toc: List<TocItem> = emptyList(),
    val contributors: List<Contributor> = emptyList()
)

@Serializable
enum class ReaderTheme { DARK, SEPIA, BLACK, LIGHT }

@Serializable
enum class ReaderFont { AMIRI, NASKH, SANS }

@Serializable
data class ReadingPreferences(
    val fontSize: Int = 19,
    val fontFamily: ReaderFont = ReaderFont.AMIRI,
    val theme: ReaderTheme = ReaderTheme.DARK,
    val lineHeight: Double = 2.1,
    val removeTashkeel: Boolean = false
)

@Serializable
data class PageBookmark(
    val bookId: Long,
    val bookTitle: String,
    val pageNumber: Int,
    val pageLabel: String,
    val heading: String? = null,
    val note: String? = null,
    val createdAt: String = ""
)
