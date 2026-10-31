package net.ablibrary.local.utils

import android.speech.tts.TextToSpeech
import net.ablibrary.local.db.DatabaseDriverFactory
import java.util.Locale

actual class AudioReader actual constructor() : TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var isReady = false

    init {
        DatabaseDriverFactory.appContext?.let { ctx ->
            tts = TextToSpeech(ctx, this)
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("ar")
            isReady = true
        }
    }

    actual fun speak(text: String) {
        val clean = text.replace(Regex("[【】«»]"), "").trim()
        if (isReady && clean.isNotEmpty()) {
            tts?.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "AHLULBAYT_AUDIO")
        }
    }

    actual fun stop() {
        tts?.stop()
    }
}
