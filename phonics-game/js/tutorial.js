class TutorialManager {
    constructor() {
        this.overlay = document.getElementById('tutorial-overlay');
        this.step = 0;
        this.lesson = null;
        this.onComplete = null;
        this.targetPattern = null;
        this.patternLabel = null;
        this.patternHint = null;
        this.miniSelected = [];
        this._focusTrapHandler = null;
        this._autoAdvanceTimer = null;
        this._wrongShakeTimer = null;

        // Bind buttons once — dispatch by this.step to avoid handler stacking.
        document.getElementById('tut-next-btn').addEventListener('click', () => {
            if (this.step === 1) this.showStep2();
            else if (this.step === 3) this.complete();
        });
        document.getElementById('tut-skip-btn').addEventListener('click', () => this.skip());
    }

    // Returns true if ANY of this lesson's patterns have not been seen yet.
    shouldShow(lesson, progress) {
        if (!progress || !progress.tutorialSeen) return true;
        return lesson.patterns.some(p => !progress.tutorialSeen[p]);
    }

    start(lesson, progress, onComplete) {
        // Always close any previous overlay state first to prevent stacked focus-trap handlers.
        this._close();

        this.lesson = lesson;
        this.onComplete = onComplete;
        this.step = 0;
        this.miniSelected = [];

        // Find the first unseen pattern to teach.
        const unseenPattern = lesson.patterns.find(p =>
            !progress.tutorialSeen || !progress.tutorialSeen[p]
        ) || lesson.patterns[0];

        this.targetPattern = unseenPattern;
        // Use optional chaining in case patternLabels is absent from the lesson JSON.
        this.patternLabel = lesson.patternLabels?.[unseenPattern] || unseenPattern;
        this.patternHint = lesson.patternHint || '';

        this.showStep1();
    }

    // --- Overlay open/close ---

    _open() {
        this.overlay.classList.add('open');
        this.overlay.setAttribute('aria-hidden', 'false');
        this._focusTrapHandler = this._handleFocusTrap.bind(this);
        document.addEventListener('keydown', this._focusTrapHandler);
    }

    _close() {
        this.overlay.classList.remove('open');
        this.overlay.setAttribute('aria-hidden', 'true');
        if (this._focusTrapHandler) {
            document.removeEventListener('keydown', this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
    }

    _handleFocusTrap(e) {
        if (e.key === 'Escape') {
            this.skip();
            return;
        }
        if (e.key !== 'Tab') return;

        // Query all focusable elements within the overlay that aren't hidden.
        const focusable = Array.from(
            this.overlay.querySelectorAll('button:not(.hidden), [tabindex="0"]:not(.hidden)')
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    // --- Steps ---

    showStep1() {
        this.step = 1;

        // Prefer tutorialWords if curated for this pattern; fall back to wordPool.
        const pool = (this.lesson.tutorialWords && this.lesson.tutorialWords[this.targetPattern])
            || this.lesson.wordPool[this.targetPattern] || [];
        const examples = pool.slice(0, 3);

        document.getElementById('tut-step').textContent = 'Step 1 of 3';
        document.getElementById('tut-title').textContent = `Meet the ${this.patternLabel} sound!`;

        // Build body with createElement — no innerHTML interpolation.
        const body = document.getElementById('tut-body');
        body.innerHTML = '';

        const hintP = document.createElement('p');
        hintP.textContent = this.patternHint;
        body.appendChild(hintP);

        const examplesDiv = document.createElement('div');
        examplesDiv.className = 'tut-examples';
        for (const word of examples) {
            const wordEl = document.createElement('div');
            wordEl.className = 'tut-word';
            wordEl.setAttribute('role', 'button');
            wordEl.setAttribute('tabindex', '0');
            wordEl.setAttribute('aria-pressed', 'false');
            wordEl.setAttribute('aria-label', `Hear word: ${word}`);
            const textNode = document.createTextNode(`${word} `);
            const speakerSpan = document.createElement('span');
            speakerSpan.className = 'tut-speaker';
            speakerSpan.textContent = '🔊';
            speakerSpan.setAttribute('aria-hidden', 'true');
            wordEl.appendChild(textNode);
            wordEl.appendChild(speakerSpan);
            wordEl.addEventListener('click', () => SpeechManager.speakIfUnmuted(word));
            wordEl.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    SpeechManager.speakIfUnmuted(word);
                }
            });
            examplesDiv.appendChild(wordEl);
        }
        body.appendChild(examplesDiv);

        const tapP = document.createElement('p');
        tapP.textContent = 'Tap each word to hear it!';
        tapP.className = 'tut-body-note';
        body.appendChild(tapP);

        // Buttons: next visible, skip visible.
        const nextBtn = document.getElementById('tut-next-btn');
        const skipBtn = document.getElementById('tut-skip-btn');
        nextBtn.textContent = 'Next \u2192';
        nextBtn.classList.remove('hidden');
        skipBtn.classList.remove('hidden');

        // Open overlay — always called unconditionally (start() already called _close()).
        this._open();

        // Focus skip button (first focusable element) so AT users land here on open.
        skipBtn.focus();

        // Speak the first example word; guard against empty pool.
        if (examples.length > 0) SpeechManager.speakIfUnmuted(examples[0]);
    }

    showStep2() {
        this.step = 2;
        this.miniSelected = [];

        document.getElementById('tut-step').textContent = 'Step 2 of 3';
        document.getElementById('tut-title').textContent =
            `Can you find the ${this.patternLabel} words?`;

        const body = document.getElementById('tut-body');
        body.innerHTML = '';

        const instrP = document.createElement('p');
        instrP.append('Tap all the ');
        const strong = document.createElement('strong');
        strong.textContent = this.patternLabel;
        instrP.appendChild(strong);
        instrP.append(' words!');
        body.appendChild(instrP);

        const miniBoard = document.createElement('div');
        miniBoard.id = 'tut-mini-board';
        miniBoard.className = 'tut-mini-board';
        body.appendChild(miniBoard);

        const feedback = document.createElement('p');
        feedback.id = 'tut-mini-feedback';
        feedback.className = 'tut-feedback';
        feedback.setAttribute('aria-live', 'polite');
        body.appendChild(feedback);

        // Hide next button — step advances automatically when 3 correct tiles tapped.
        document.getElementById('tut-next-btn').classList.add('hidden');
        document.getElementById('tut-skip-btn').classList.remove('hidden');

        // Pass the board element directly to avoid fragile getElementById coupling.
        this.buildMiniBoard(miniBoard);

        // Focus first tile so keyboard users can start immediately.
        const firstTile = miniBoard.querySelector('.tut-tile');
        if (firstTile) firstTile.focus();
    }

    buildMiniBoard(board) {
        const targetPool = (this.lesson.tutorialWords && this.lesson.tutorialWords[this.targetPattern])
            || this.lesson.wordPool[this.targetPattern] || [];
        const targetWords = targetPool.slice(0, 3);

        const otherPattern = this.lesson.patterns.find(p => p !== this.targetPattern)
            || this.targetPattern;
        const otherPool = (this.lesson.tutorialWords && this.lesson.tutorialWords[otherPattern])
            || this.lesson.wordPool[otherPattern] || [];
        const otherWords = otherPool.slice(0, 3);

        const allTiles = [
            ...targetWords.map(w => ({ word: w, isTarget: true })),
            ...otherWords.map(w => ({ word: w, isTarget: false }))
        ];

        // Fisher-Yates shuffle — unbiased.
        for (let i = allTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTiles[i], allTiles[j]] = [allTiles[j], allTiles[i]];
        }

        board.innerHTML = '';

        for (const tileData of allTiles) {
            const el = document.createElement('div');
            el.className = 'tut-tile';
            el.textContent = tileData.word;
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-pressed', 'false');
            el.setAttribute('aria-label', tileData.word);
            el.addEventListener('click', () => this._onMiniBoardTileTap(el, tileData));
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._onMiniBoardTileTap(el, tileData);
                }
            });
            board.appendChild(el);
        }
    }

    _onMiniBoardTileTap(el, tileData) {
        SpeechManager.speakIfUnmuted(tileData.word);
        const feedback = document.getElementById('tut-mini-feedback');

        if (tileData.isTarget) {
            if (el.classList.contains('tut-tile-correct')) return; // already selected
            el.classList.add('tut-tile-correct');
            el.setAttribute('aria-pressed', 'true');
            // Disable matched tile so AT users aren't confused by revisiting it.
            el.setAttribute('tabindex', '-1');
            el.setAttribute('aria-disabled', 'true');
            this.miniSelected.push(tileData.word);
            feedback.classList.remove('tut-feedback-wrong');
            feedback.textContent = `\u2713 "${tileData.word}" is a ${this.patternLabel} word!`;
            if (this.miniSelected.length >= 3) {
                this._autoAdvanceTimer = setTimeout(() => {
                    this._autoAdvanceTimer = null;
                    this.showStep3();
                }, 700);
            }
        } else {
            el.classList.add('tut-tile-wrong');
            // Store timer ID so cancel() can clear it if the overlay is dismissed.
            this._wrongShakeTimer = setTimeout(() => {
                this._wrongShakeTimer = null;
                if (el.isConnected) el.classList.remove('tut-tile-wrong');
            }, 400);
            feedback.classList.add('tut-feedback-wrong');
            feedback.textContent = `Hmm, try another word with the ${this.patternLabel} sound.`;
        }
    }

    showStep3() {
        this.step = 3;

        document.getElementById('tut-step').textContent = 'Step 3 of 3';
        document.getElementById('tut-title').textContent = 'You got it! \uD83C\uDF89';

        const body = document.getElementById('tut-body');
        body.innerHTML = '';

        const p1 = document.createElement('p');
        p1.append('Great job finding the ');
        const strong = document.createElement('strong');
        strong.textContent = this.patternLabel;
        p1.appendChild(strong);
        p1.append(' words!');
        body.appendChild(p1);

        const p2 = document.createElement('p');
        p2.textContent = 'Now try the full board. Good luck, Word Explorer!';
        body.appendChild(p2);

        const nextBtn = document.getElementById('tut-next-btn');
        nextBtn.textContent = "Let's Play! \u2192";
        nextBtn.classList.remove('hidden');
        document.getElementById('tut-skip-btn').classList.add('hidden');

        nextBtn.focus();
    }

    skip() {
        this.complete();
    }

    complete() {
        // Cancel timers first — prevents showStep3() from firing after the overlay closes.
        if (this._autoAdvanceTimer) {
            clearTimeout(this._autoAdvanceTimer);
            this._autoAdvanceTimer = null;
        }
        if (this._wrongShakeTimer) {
            clearTimeout(this._wrongShakeTimer);
            this._wrongShakeTimer = null;
        }

        this._close();

        // Mark all patterns in this lesson as seen.
        const progress = SaveManager.load();
        progress.tutorialSeen = progress.tutorialSeen || {};
        for (const p of this.lesson.patterns) {
            progress.tutorialSeen[p] = true;
        }
        SaveManager.save(progress);

        const cb = this.onComplete;
        this.onComplete = null;
        if (cb) cb();

        // Return focus to the board after matchManager.init() has populated tiles.
        const firstTile = document.querySelector('#board-grid .tile');
        const fallback = document.getElementById('board-back-btn');
        if (firstTile) firstTile.focus();
        else if (fallback) fallback.focus();
    }

    // Called from showLessonSelect() when navigating away mid-tutorial.
    cancel() {
        if (this._autoAdvanceTimer) {
            clearTimeout(this._autoAdvanceTimer);
            this._autoAdvanceTimer = null;
        }
        if (this._wrongShakeTimer) {
            clearTimeout(this._wrongShakeTimer);
            this._wrongShakeTimer = null;
        }
        this._close();
        this.onComplete = null;
    }
}
