package net.ablibrary.local.utils

object TextParser {
    private val TASHKEEL = Regex("[\u0617-\u061A\u064B-\u0652]")
    fun stripTashkeel(text: String): String = text.replace(TASHKEEL, "")
}
