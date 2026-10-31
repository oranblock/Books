package net.ablibrary.local.utils

import platform.AVFAudio.*

actual class AudioReader actual constructor() {
    private val synthesizer = AVSpeechSynthesizer()

    actual fun speak(text: String) {
        val clean = text.replace(Regex("[【】«»]"), "").trim()
        if (clean.isNotEmpty()) {
            val utterance = AVSpeechUtterance.speechUtteranceWithString(clean)
            utterance.voice = AVSpeechSynthesisVoice.voiceWithLanguage("ar-SA")
            synthesizer.speakUtterance(utterance)
        }
    }

    actual fun stop() {
        synthesizer.stopSpeakingAtBoundary(AVSpeechBoundary.AVSpeechBoundaryImmediate)
    }
}
