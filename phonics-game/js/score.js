class ScoreManager {
    constructor() {
        this.correct = 0;
        this.wrong = 0;
        this.streak = 0;        // current accuracy streak
        this.maxStreak = 0;     // highest streak this session
        this.matchedWords = []; // words matched successfully
        this.wrongWords = [];   // words where a wrong tap occurred (for review)
        this.points = 0;
    }

    reset() {
        this.correct = 0;
        this.wrong = 0;
        this.streak = 0;
        this.maxStreak = 0;
        this.matchedWords = [];
        this.wrongWords = [];
        this.points = 0;
    }

    recordMatch(tileCount, pattern) {
        this.correct += tileCount;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        const streakBonus = this.streak >= 5 ? 1.25 : 1.0;
        this.points += tileCount * 10 * streakBonus;
    }

    recordWrong(word) {
        this.wrong++;
        this.streak = 0;
        if (word && !this.wrongWords.includes(word)) {
            this.wrongWords.push(word);
        }
    }

    recordMatchedWord(word) {
        if (!this.matchedWords.includes(word)) this.matchedWords.push(word);
    }

    getAccuracy() {
        const total = this.correct + this.wrong;
        if (total === 0) return 1.0;
        return this.correct / total;
    }

    getStars() {
        const accuracy = this.getAccuracy();
        const hasStreak = this.maxStreak >= 5;
        if (accuracy >= 0.90 && hasStreak) return 3;
        if (accuracy >= 0.75) return 2;
        return 1;  // 1 star for completion — no fail state
    }

    getSummary() {
        return {
            stars: this.getStars(),
            accuracy: this.getAccuracy(),
            correct: this.correct,
            wrong: this.wrong,
            maxStreak: this.maxStreak,
            matchedWords: this.matchedWords,
            wrongWords: this.wrongWords,
            points: Math.round(this.points)
        };
    }
}
