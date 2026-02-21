class SaveManager {
    static _defaults() {
        return {
            lessons: {},
            tutorialSeen: {},
            fontSize: 'medium',
            muteSpeech: false,
            muteSfx: false,
            allUnlocked: false,
            totalWordsMatched: 0,
            sortPracticed: {},
        };
    }

    static load() {
        try {
            return JSON.parse(localStorage.getItem('phonics-progress')) || SaveManager._defaults();
        } catch (e) {
            return SaveManager._defaults();
        }
    }

    static save(data) {
        try {
            localStorage.setItem('phonics-progress', JSON.stringify(data));
        } catch (e) {
            console.warn('phonics-game: failed to save progress', e);
        }
    }

    static saveLessonResult(lessonId, summary) {
        const key = String(lessonId);
        const nextKey = String(Number(lessonId) + 1);
        const data = this.load();
        const prev = data.lessons[key] || { stars: 0, bestAccuracy: 0, completed: false };

        data.lessons[key] = {
            stars: Math.max(prev.stars, summary.stars),
            bestAccuracy: Math.max(prev.bestAccuracy, summary.accuracy),
            completed: true,
            previewed: prev.previewed || false
        };

        // Unlock next lesson if not already in progress
        data.lessons[nextKey] = data.lessons[nextKey] || { stars: 0, bestAccuracy: 0, completed: false };

        data.totalWordsMatched = (data.totalWordsMatched || 0) + summary.matchedWords.length;
        this.save(data);
        return data;
    }
}
