package net.ablibrary.local.utils

expect class AudioReader() {
    fun speak(text: String)
    fun stop()
}
