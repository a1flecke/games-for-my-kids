(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.SpeechManager = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildSpeechManager() {
    class SpeechManager {
        constructor() {
            this._enabled = true;
            this._lastText = '';
        }

        setEnabled(enabled) {
            this._enabled = !!enabled;
            if (!this._enabled) this.cancel();
        }

        speak(text) {
            this._lastText = text || '';
            if (!this._enabled || !this._lastText) return;
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
            window.speechSynthesis.cancel();
            setTimeout(() => {
                if (!this._enabled || !this._lastText) return;
                const utterance = new SpeechSynthesisUtterance(this._lastText);
                utterance.rate = 0.92;
                utterance.pitch = 1.02;
                window.speechSynthesis.speak(utterance);
            }, 50);
        }

        cancel() {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        }

        replayLast() {
            this.speak(this._lastText);
        }
    }

    return SpeechManager;
});
