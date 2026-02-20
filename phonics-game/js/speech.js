class SpeechManager {
    static speak(word) {
        if (speechSynthesis.speaking) speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    }

    // Reads mute preference from SaveManager so it stays in sync with the settings panel.
    static isMuted() {
        return SaveManager.load().muteSpeech === true;
    }

    static speakIfUnmuted(word) {
        if (!this.isMuted()) this.speak(word);
    }
}
