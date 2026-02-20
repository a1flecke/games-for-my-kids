class SaveManager {
    static load() {
        try {
            return JSON.parse(localStorage.getItem('phonics-progress')) || { lessons: {}, tutorialSeen: {} };
        } catch (e) { return { lessons: {}, tutorialSeen: {} }; }
    }
    static save(data) {
        try { localStorage.setItem('phonics-progress', JSON.stringify(data)); } catch (e) {}
    }
}
