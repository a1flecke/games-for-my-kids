class SpeechManager {
    static speak(word) {
        if (!('speechSynthesis' in window)) return;
        const doSpeak = () => {
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';
            speechSynthesis.speak(utterance);
        };
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            // iOS Safari silences a speak() called immediately after cancel().
            // A short delay lets the engine flush before queuing the new utterance.
            setTimeout(doSpeak, 50);
        } else {
            doSpeak();
        }
    }

    // Reads mute preference from SaveManager so it stays in sync with the settings panel.
    static isMuted() {
        return SaveManager.load().muteSpeech === true;
    }

    static speakIfUnmuted(word) {
        if (!this.isMuted()) this.speak(word);
    }
}
