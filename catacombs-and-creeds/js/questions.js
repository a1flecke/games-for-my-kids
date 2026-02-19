/**
 * QuestionSystem - Manages educational questions for combat
 *
 * Loads questions from data/questions.json, tracks which have been asked
 * during the current combat to avoid repeats, supports filtering by level.
 * Multiple choice with 3 options, navigable with arrow keys.
 */
class QuestionSystem {
    constructor() {
        /** @type {Array} All loaded questions */
        this.allQuestions = [];

        /** @type {Set} IDs of questions already asked in this combat session */
        this.askedThisCombat = new Set();

        /** @type {Set} IDs of questions already asked in this play session (across combats) */
        this.askedThisSession = new Set();

        /** @type {boolean} Whether questions have been loaded */
        this.loaded = false;
    }

    /**
     * Load questions from JSON file.
     * @returns {Promise<boolean>} true if loaded successfully
     */
    async load() {
        try {
            const response = await fetch('data/questions.json');
            if (!response.ok) {
                throw new Error(`Failed to load questions: ${response.status}`);
            }
            this.allQuestions = await response.json();
            this.loaded = true;
            console.log(`Loaded ${this.allQuestions.length} questions`);
            return true;
        } catch (err) {
            console.error('Failed to load questions:', err);
            return false;
        }
    }

    /**
     * Reset the asked-questions tracker. Call at the start of each combat.
     */
    resetCombatSession() {
        this.askedThisCombat.clear();
    }

    /**
     * Get a random unasked question for the given level.
     * Falls back to any unasked question if none match the level,
     * then resets the tracker and tries again if all have been asked.
     * @param {number} level - Current game level (1-5)
     * @returns {Object|null} A question object, or null if none available
     */
    getQuestion(level) {
        if (!this.loaded || this.allQuestions.length === 0) {
            return null;
        }

        // Try to find an unasked question for this level (prefer session-unasked)
        let candidates = this.allQuestions.filter(
            q => q.level === level && !this.askedThisSession.has(q.id)
        );

        // Fallback: any session-unasked question
        if (candidates.length === 0) {
            candidates = this.allQuestions.filter(
                q => !this.askedThisSession.has(q.id)
            );
        }

        // If all questions have been asked this session, reset session tracker and try again
        if (candidates.length === 0) {
            this.askedThisSession.clear();
            this.askedThisCombat.clear();
            candidates = this.allQuestions.filter(q => q.level === level);
            if (candidates.length === 0) {
                candidates = [...this.allQuestions];
            }
        }

        // Within candidates, prefer ones not asked this combat
        const combatFresh = candidates.filter(q => !this.askedThisCombat.has(q.id));
        if (combatFresh.length > 0) {
            candidates = combatFresh;
        }

        if (candidates.length === 0) {
            return null;
        }

        // Pick a random question
        const question = candidates[randomInt(0, candidates.length - 1)];
        this.askedThisCombat.add(question.id);
        this.askedThisSession.add(question.id);

        // Clone question and shuffle choices (Fisher-Yates) so correct answer isn't always in position A
        const shuffled = { ...question, choices: [...question.choices] };
        for (let i = shuffled.choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled.choices[i], shuffled.choices[j]] = [shuffled.choices[j], shuffled.choices[i]];
        }
        return shuffled;
    }
}

// Expose globally
window.QuestionSystem = QuestionSystem;
