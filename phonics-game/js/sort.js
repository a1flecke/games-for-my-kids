class SortManager {
    constructor() {
        this.lesson = null;
        this.wordQueue = [];
        this.currentWord = null;
        this.wordIndex = 0;
        this.results = { correct: [], wrong: [] };
        this.buckets = {}; // pattern → count

        // Generation counter — guards async start() against concurrent calls.
        this._generation = 0;
        this._lessonId = null; // stored so _showSortComplete can use it even if lesson.id absent

        // Timer IDs — all declared as null in constructor (timer lifecycle pattern).
        this._bucketCorrectTimer = null; // flash on correct bucket (500ms)
        this._nextWordTimer = null;      // advance to next word after correct (700ms)
        this._wrongBucketTimer = null;   // flash on wrong bucket (400ms, needs isConnected)
        this._wrongFeedbackTimer = null; // clear wrong feedback text (1500ms)

        // Bind static speaker button once — prevents handler stacking on re-entry.
        document.getElementById('sort-speaker-btn').addEventListener('click', () => {
            if (this.currentWord) SpeechManager.speakIfUnmuted(this.currentWord.word);
        });
    }

    // Called from game.showLessonSelect() when navigating away mid-sort.
    cancel() {
        this._generation++; // invalidate any pending async start()
        clearTimeout(this._bucketCorrectTimer); this._bucketCorrectTimer = null;
        clearTimeout(this._nextWordTimer);      this._nextWordTimer = null;
        clearTimeout(this._wrongBucketTimer);   this._wrongBucketTimer = null;
        clearTimeout(this._wrongFeedbackTimer); this._wrongFeedbackTimer = null;
        this.currentWord = null;
    }

    async start(lessonId) {
        this.cancel(); // defensive reset — clears timers and increments generation
        const gen = this._generation;

        const lesson = await DataManager.loadLesson(lessonId);
        if (this._generation !== gen) return; // navigated away while loading

        this.lesson = lesson;
        this._lessonId = lessonId; // saved arg — lesson.id may be absent in some lesson JSONs
        this.results = { correct: [], wrong: [] };
        this.buckets = {};

        // Show word section, hide complete section
        document.getElementById('sort-word-section').classList.remove('hidden');
        document.getElementById('sort-complete-section').classList.add('hidden');

        this._buildWordQueue();
        this._renderBuckets();
        this._nextWord();
    }

    _buildWordQueue() {
        const queue = [];
        for (const pattern of this.lesson.patterns) {
            // Fisher-Yates shuffle per-pattern words before slicing
            const words = [...(this.lesson.wordPool[pattern] || [])];
            for (let i = words.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [words[i], words[j]] = [words[j], words[i]];
            }
            const sample = words.slice(0, 3);
            for (const word of sample) queue.push({ word, pattern });
        }
        // Fisher-Yates shuffle the combined queue
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        this.wordQueue = queue;
        this.wordIndex = 0;
    }

    _renderBuckets() {
        const container = document.getElementById('sort-buckets');
        container.innerHTML = '';

        for (const pattern of this.lesson.patterns) {
            const label = this.lesson.patternLabels?.[pattern] || pattern;
            const example = this.lesson.wordPool[pattern]?.[0] || '';

            const bucket = document.createElement('div');
            bucket.className = 'sort-bucket';
            bucket.dataset.pattern = pattern;
            bucket.setAttribute('role', 'button');
            bucket.setAttribute('tabindex', '0');
            // No aria-pressed — buckets are action triggers, not toggle buttons
            bucket.setAttribute('aria-label', `${label} bucket, 0 words sorted`);

            const labelEl = document.createElement('div');
            labelEl.className = 'sort-bucket-label';
            labelEl.textContent = label;

            const exampleEl = document.createElement('div');
            exampleEl.className = 'sort-bucket-example';
            exampleEl.textContent = `e.g. "${example}"`;

            const countEl = document.createElement('div');
            countEl.className = 'sort-bucket-count';
            countEl.textContent = '0 words';

            bucket.appendChild(labelEl);
            bucket.appendChild(exampleEl);
            bucket.appendChild(countEl);

            bucket.addEventListener('click', () => this._onBucketTap(pattern, bucket));
            bucket.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._onBucketTap(pattern, bucket);
                }
            });

            container.appendChild(bucket);
            this.buckets[pattern] = 0;
        }
    }

    _nextWord() {
        if (this.wordIndex >= this.wordQueue.length) {
            this._showSortComplete();
            return;
        }

        this.currentWord = this.wordQueue[this.wordIndex];
        this.wordIndex++;

        const wordCard = document.getElementById('sort-word-card');
        wordCard.textContent = this.currentWord.word;
        // aria-live="polite" on the element handles VoiceOver announcement — no aria-label needed

        document.getElementById('sort-progress').textContent =
            `Word ${this.wordIndex} of ${this.wordQueue.length}`;

        SpeechManager.speakIfUnmuted(this.currentWord.word);
    }

    _onBucketTap(pattern, bucketEl) {
        if (!this.currentWord) return; // guard against taps during transition

        const isCorrect = pattern === this.currentWord.pattern;
        const feedbackEl = document.getElementById('sort-feedback');

        if (isCorrect) {
            // Cancel any pending wrong-feedback timers so they don't overwrite correct feedback
            clearTimeout(this._wrongBucketTimer);   this._wrongBucketTimer = null;
            clearTimeout(this._wrongFeedbackTimer); this._wrongFeedbackTimer = null;

            bucketEl.classList.add('sort-bucket-correct');
            this._bucketCorrectTimer = setTimeout(() => {
                this._bucketCorrectTimer = null;
                if (bucketEl.isConnected) bucketEl.classList.remove('sort-bucket-correct');
            }, 500);

            this.results.correct.push(this.currentWord.word);
            this.buckets[pattern]++;
            const count = this.buckets[pattern];

            const countEl = bucketEl.querySelector('.sort-bucket-count');
            countEl.textContent = `${count} word${count !== 1 ? 's' : ''}`;

            const label = this.lesson.patternLabels?.[pattern] || pattern;
            // Update aria-label to reflect new count
            bucketEl.setAttribute('aria-label',
                `${label} bucket, ${count} word${count !== 1 ? 's' : ''} sorted`);

            const word = this.currentWord.word;
            feedbackEl.textContent = `✓ "${word}" is a ${label} word!`;
            feedbackEl.className = 'sort-feedback sort-feedback-correct';

            this.currentWord = null; // prevent double-tap during animation

            this._nextWordTimer = setTimeout(() => {
                this._nextWordTimer = null;
                feedbackEl.textContent = '';
                feedbackEl.className = 'sort-feedback';
                this._nextWord();
            }, 700);

        } else {
            // Wrong — gentle shake, keep word for retry
            bucketEl.classList.add('sort-bucket-wrong');
            this._wrongBucketTimer = setTimeout(() => {
                this._wrongBucketTimer = null;
                if (bucketEl.isConnected) bucketEl.classList.remove('sort-bucket-wrong');
            }, 400);

            if (!this.results.wrong.includes(this.currentWord.word)) {
                this.results.wrong.push(this.currentWord.word);
            }

            const correctLabel =
                this.lesson.patternLabels?.[this.currentWord.pattern] || this.currentWord.pattern;
            feedbackEl.textContent = `Hmm — try the ${correctLabel} bucket!`;
            feedbackEl.className = 'sort-feedback sort-feedback-wrong';

            // Reset any previous wrong-feedback clear timer
            clearTimeout(this._wrongFeedbackTimer);
            this._wrongFeedbackTimer = setTimeout(() => {
                this._wrongFeedbackTimer = null;
                // isConnected guard — feedbackEl closure may be stale if DOM rebuilt
                if (feedbackEl.isConnected && feedbackEl.classList.contains('sort-feedback-wrong')) {
                    feedbackEl.textContent = '';
                    feedbackEl.className = 'sort-feedback';
                }
            }, 1500);
        }
    }

    _showSortComplete() {
        document.getElementById('sort-word-section').classList.add('hidden');
        document.getElementById('sort-complete-section').classList.remove('hidden');

        const total = this.wordQueue.length;
        const correct = this.results.correct.length;
        document.getElementById('sort-complete-msg').textContent =
            `You sorted ${correct} of ${total} words correctly!`;

        // Save "practiced" badge — use String key for consistency with lesson keys
        const data = SaveManager.load();
        if (!data.sortPracticed) data.sortPracticed = {};
        data.sortPracticed[String(this._lessonId)] = true;
        SaveManager.save(data);

        document.getElementById('sort-again-btn').focus();
    }
}
