class SaveManager {
    static _defaults() {
        return {
            lessons: {},
            tutorialSeen: {},
            fontSize: 'medium',
            muteSpeech: false,
            muteSfx: false,
            allUnlocked: false,
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
}
