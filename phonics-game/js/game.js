// Escape user-facing strings interpolated into innerHTML to prevent XSS.
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

class Game {
    constructor() {
        this.progress = null;
        this.currentLessonId = null;
        this.activeGradeFilter = 'all';
        this.settingsOpen = false;
        this.pinOpen = false;
        this.fontSizeLevel = 'medium'; // small | medium | large
        this.hintMode = 'one'; // 'one' | 'none'
        this._focusTrapHandler = null;
        this._pinFocusTrapHandler = null;
        this._summaryFocusTrapHandler = null;
        this._sortFocusTrapHandler = null;
    }

    init() {
        this.progress = SaveManager.load();
        // Restore persisted font size before rendering (so first render uses correct size)
        if (this.progress.fontSize) {
            this.fontSizeLevel = this.progress.fontSize;
        }
        this._applyFontSize(this.fontSizeLevel);
        if (this.progress.hintMode !== undefined) {
            this.hintMode = this.progress.hintMode;
        }
        this.renderLessonSelect();
        this._bindSettingsPanel();
        this._bindGradeFilter();
        this._bindPinDialog();
        this._bindBoardScreen();
        this._bindSummaryScreen();
        this._bindSortScreen();
        this._syncSettings();
        // Initialize singleton managers after DOM is ready.
        // Never lazy-init in startLesson() — reuses stale state on second play.
        window.audioManager = new AudioManager();
        window.tutorialManager = new TutorialManager();
        window.sortManager = new SortManager();
    }

    renderLessonSelect() {
        const grid = document.getElementById('lesson-grid');
        grid.innerHTML = '';

        DataManager.getLessonMeta().forEach(lesson => {
            // Use String key to match how localStorage serialises object keys
            const lessonData = this.progress.lessons?.[String(lesson.id)];
            const stars = lessonData?.stars || 0;
            const completed = lessonData?.completed || false;
            const previewed = lessonData?.previewed || false;
            const sortPracticed = !!this.progress.sortPracticed?.[String(lesson.id)];
            // Lesson 1 always unlocked; subsequent lessons unlock when previous is completed
            const isUnlocked = lesson.id === 1
                || this.progress.allUnlocked
                || Boolean(this.progress.lessons?.[String(lesson.id - 1)]?.completed);
            const isPreview = !isUnlocked;

            const card = document.createElement('div');
            card.className = 'lesson-card';
            card.dataset.grade = String(lesson.gradeLevel);
            card.dataset.id = String(lesson.id);

            if (isPreview) {
                card.classList.add('locked');
                card.setAttribute('tabindex', '-1');
                card.setAttribute('aria-disabled', 'true');
            } else {
                card.setAttribute('tabindex', '0');
                card.setAttribute('aria-disabled', 'false');
            }

            card.setAttribute('role', 'button');
            card.setAttribute('aria-label',
                `Lesson ${lesson.id}: ${lesson.title}, Grade ${lesson.gradeLevel}` +
                (isPreview ? ', preview only' : '') +
                (stars > 0 ? `, ${stars} of 3 stars` : '')
            );

            card.innerHTML = `
                <div class="lesson-number">${escHtml(lesson.id)}</div>
                <div class="lesson-title">${escHtml(lesson.title)}</div>
                <div class="grade-badge grade-${escHtml(lesson.gradeLevel)}">Grade ${escHtml(lesson.gradeLevel)}</div>
                <div class="star-row" aria-hidden="true">
                    ${[1,2,3].map(n => `<span class="star${stars >= n ? ' earned' : ''}">${stars >= n ? '★' : '☆'}</span>`).join('')}
                </div>
                ${previewed && !completed ? '<div class="preview-badge">Tried</div>' : ''}
                ${sortPracticed ? '<div class="sort-practiced-badge">Sort ✓</div>' : ''}
                ${isPreview ? '<div class="lock-overlay" aria-hidden="true">🔒</div>' : ''}
            `;

            // Action buttons — built with createElement (no onclick= attrs)
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'lesson-card-actions';

            const playBtn = document.createElement('button');
            playBtn.className = 'lesson-play-btn';
            playBtn.textContent = 'Play ▶';
            playBtn.setAttribute('aria-label', `Play Lesson ${lesson.id}: ${lesson.title}`);
            playBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.startLesson(lesson.id, isPreview);
            });

            const sortBtn = document.createElement('button');
            sortBtn.className = 'lesson-sort-btn';
            sortBtn.textContent = 'Sort 🗂';
            sortBtn.setAttribute('aria-label', `Sort Mode for Lesson ${lesson.id}: ${lesson.title}`);
            sortBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.startSortMode(lesson.id);
            });

            // Disable action buttons on locked cards — card click still opens preview mode
            if (isPreview) {
                playBtn.disabled = true;
                playBtn.setAttribute('aria-disabled', 'true');
                sortBtn.disabled = true;
                sortBtn.setAttribute('aria-disabled', 'true');
            }

            actionsDiv.appendChild(playBtn);
            actionsDiv.appendChild(sortBtn);
            card.appendChild(actionsDiv);

            card.addEventListener('click', () => this.startLesson(lesson.id, isPreview));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.startLesson(lesson.id, isPreview);
                }
            });

            grid.appendChild(card);
        });

        this._applyGradeFilter(this.activeGradeFilter);
    }

    // isPreview=true means lesson is locked (no prior completion) — opens in preview mode
    async startLesson(id, isPreview = false) {
        try {
            const lesson = await DataManager.loadLesson(id);
            if (isPreview) SaveManager.markPreviewed(id);
            this.currentLessonId = id;
            // Remove active from all screens before showing board
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-board').classList.add('active');
            document.getElementById('board-lesson-title').textContent = lesson.title;
            window.scoreManager = new ScoreManager();
            window.boardManager = new BoardManager();
            window.boardManager.init(lesson);

            const progress = SaveManager.load();
            const startMatch = () => {
                window.matchManager = new MatchManager(window.boardManager, window.scoreManager);
                window.matchManager.init(lesson);
            };

            if (window.tutorialManager.shouldShow(lesson, progress)) {
                // Tutorial overlay sits above the rendered board; matchManager starts on complete.
                window.tutorialManager.start(lesson, progress, startMatch);
            } else {
                startMatch();
            }
        } catch (err) {
            console.error('Failed to load lesson', id, err);
        }
    }

    showLessonSelect() {
        // Cancel any pending match/refill/win timers before leaving the board screen.
        if (window.matchManager) {
            window.matchManager.cancel();
            window.matchManager = null;
        }
        window.boardManager = null;
        window.scoreManager = null;
        if (window.tutorialManager) window.tutorialManager.cancel();
        if (window.sortManager) window.sortManager.cancel();
        if (window.audioManager) window.audioManager.cancel();
        this._dismissSummaryFocusTrap();
        this._dismissSortFocusTrap();
        // Remove active from all screens (handles navigating from board or summary)
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-select').classList.add('active');
        // Reload progress so updated stars are shown after lesson completion
        this.progress = SaveManager.load();
        this.renderLessonSelect();
    }

    onTileTap(tile) {
        SpeechManager.speakIfUnmuted(tile.word);
        if (window.matchManager) {
            window.matchManager.onTileTap(tile);
        }
    }

    onLessonComplete() {
        window.audioManager?.playLessonComplete();
        const summary = window.scoreManager.getSummary();
        SaveManager.saveLessonResult(this.currentLessonId, summary);
        this.showSummary(summary);
    }

    showSummary(summary) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-summary').classList.add('active');

        // Stars display — update aria-label dynamically so VoiceOver announces the count
        const stars = summary.stars;
        const starsEl = document.getElementById('summary-stars');
        starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        starsEl.setAttribute('aria-label', `${stars} of 3 stars earned`);

        // Stats
        document.getElementById('summary-accuracy').textContent =
            `Accuracy: ${Math.round(summary.accuracy * 100)}%`;
        const streakEl = document.getElementById('summary-streak');
        streakEl.textContent = summary.maxStreak >= 5
            ? `\uD83D\uDD25 Best streak: ${summary.maxStreak} in a row!`
            : '';

        // Matched words — tappable chips built with createElement (no innerHTML interpolation)
        const matchedDiv = document.getElementById('summary-matched-words');
        matchedDiv.innerHTML = '';
        for (const word of summary.matchedWords) {
            matchedDiv.appendChild(this._makeWordChip(word));
        }

        // Wrong words — use class (not style.display) to avoid inline-style specificity issues
        const reviewSection = document.getElementById('summary-review-section');
        const wrongDiv = document.getElementById('summary-wrong-words');
        wrongDiv.innerHTML = '';
        if (summary.wrongWords.length === 0) {
            reviewSection.classList.add('hidden');
        } else {
            reviewSection.classList.remove('hidden');
            for (const word of summary.wrongWords) {
                wrongDiv.appendChild(this._makeWordChip(word));
            }
        }

        // Focus trap — keep keyboard/AT users within the summary screen
        this._summaryFocusTrapHandler = this._handleSummaryFocusTrap.bind(this);
        document.addEventListener('keydown', this._summaryFocusTrapHandler);

        // Focus the primary button for keyboard/AT users
        document.getElementById('summary-next-lesson').focus();
    }

    _handleSummaryFocusTrap(e) {
        const screen = document.getElementById('screen-summary');
        const focusable = Array.from(
            screen.querySelectorAll('button, [tabindex="0"]')
        ).filter(el => !el.closest('.hidden'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }

    _dismissSummaryFocusTrap() {
        if (this._summaryFocusTrapHandler) {
            document.removeEventListener('keydown', this._summaryFocusTrapHandler);
            this._summaryFocusTrapHandler = null;
        }
    }

    _makeWordChip(word) {
        const chip = document.createElement('span');
        chip.className = 'summary-word-chip';
        chip.setAttribute('role', 'button');
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('aria-pressed', 'false');
        chip.setAttribute('aria-label', `Hear word: ${word}`);
        chip.textContent = `${word} \uD83D\uDD0A`;
        chip.addEventListener('click', () => SpeechManager.speakIfUnmuted(word));
        chip.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                SpeechManager.speakIfUnmuted(word);
            }
        });
        return chip;
    }

    playAgain() {
        this._dismissSummaryFocusTrap();
        this.startLesson(this.currentLessonId);
    }

    nextLesson() {
        this._dismissSummaryFocusTrap();
        const nextId = Number(this.currentLessonId) + 1;
        if (nextId <= 30) {
            this.startLesson(nextId);
        } else {
            this.showLessonSelect();
        }
    }

    _bindSummaryScreen() {
        document.getElementById('summary-play-again').addEventListener('click', () => this.playAgain());
        document.getElementById('summary-next-lesson').addEventListener('click', () => this.nextLesson());
        document.getElementById('summary-all-lessons').addEventListener('click', () => this.showLessonSelect());
    }

    async startSortMode(id) {
        this.currentLessonId = id;
        this._dismissSortFocusTrap();
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-sort').classList.add('active');
        document.getElementById('sort-back-btn').focus();
        // Set title immediately from metadata — loadLesson is async and takes time
        const meta = DataManager.getLessonMeta().find(l => l.id === id);
        if (meta) document.getElementById('sort-lesson-title').textContent = meta.title;
        // Focus trap — keeps Tab within the sort screen
        this._sortFocusTrapHandler = this._handleSortFocusTrap.bind(this);
        document.addEventListener('keydown', this._sortFocusTrapHandler);
        await window.sortManager.start(id);
    }

    _handleSortFocusTrap(e) {
        const screen = document.getElementById('screen-sort');
        const focusable = Array.from(
            screen.querySelectorAll('button:not([disabled]), [tabindex="0"]')
        ).filter(el => !el.closest('.hidden'));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.key === 'Escape') { this.showLessonSelect(); return; }
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }

    _dismissSortFocusTrap() {
        if (this._sortFocusTrapHandler) {
            document.removeEventListener('keydown', this._sortFocusTrapHandler);
            this._sortFocusTrapHandler = null;
        }
    }

    _bindSortScreen() {
        document.getElementById('sort-back-btn').addEventListener('click', () => {
            this.showLessonSelect();
        });
        document.getElementById('sort-again-btn').addEventListener('click', () => {
            window.sortManager.start(this.currentLessonId);
        });
        document.getElementById('sort-play-board-btn').addEventListener('click', () => {
            this._dismissSortFocusTrap();
            this.startLesson(this.currentLessonId);
        });
        document.getElementById('sort-all-lessons-btn').addEventListener('click', () => {
            this.showLessonSelect();
        });
    }

    _bindBoardScreen() {
        document.getElementById('board-back-btn').addEventListener('click', () => {
            this.showLessonSelect();
        });
    }

    _bindGradeFilter() {
        document.querySelectorAll('.grade-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.grade-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.activeGradeFilter = tab.dataset.grade;
                this._applyGradeFilter(this.activeGradeFilter);
            });
        });
    }

    _applyGradeFilter(grade) {
        const grid = document.getElementById('lesson-grid');
        const label = grade === 'all' ? 'Lessons' : `Grade ${grade} Lessons`;
        grid.setAttribute('aria-label', label);

        document.querySelectorAll('.lesson-card').forEach(card => {
            const visible = grade === 'all' || card.dataset.grade === grade;
            card.classList.toggle('grade-hidden', !visible);
            // Keep hidden cards out of the AT list count
            card.setAttribute('aria-hidden', visible ? 'false' : 'true');
        });
    }

    _bindSettingsPanel() {
        const gearBtn = document.getElementById('settings-btn');
        const closeBtn = document.getElementById('settings-close');
        const overlay = document.getElementById('settings-overlay');

        gearBtn.addEventListener('click', () => this._toggleSettings());
        closeBtn.addEventListener('click', () => this._toggleSettings());
        overlay.addEventListener('click', () => this._toggleSettings());

        // Mute toggles
        document.getElementById('mute-speech').addEventListener('change', e => {
            const data = SaveManager.load();
            data.muteSpeech = e.target.checked;
            SaveManager.save(data);
        });
        document.getElementById('mute-sfx').addEventListener('change', e => {
            const data = SaveManager.load();
            data.muteSfx = e.target.checked;
            SaveManager.save(data);
        });

        // Hint tile toggle
        document.getElementById('hint-toggle').addEventListener('change', e => {
            this.hintMode = e.target.checked ? 'one' : 'none';
            e.target.setAttribute('aria-pressed', String(e.target.checked));
            const data = SaveManager.load();
            data.hintMode = this.hintMode;
            SaveManager.save(data);
        });

        // Font size
        document.getElementById('font-size-select').addEventListener('change', e => {
            this.fontSizeLevel = e.target.value;
            this._applyFontSize(e.target.value);
            const data = SaveManager.load();
            data.fontSize = e.target.value;
            SaveManager.save(data);
        });

        // Unlock all — opens the accessible PIN dialog
        document.getElementById('unlock-btn').addEventListener('click', () => {
            this._toggleSettings();
            this._openPinDialog();
        });
    }

    _toggleSettings() {
        this.settingsOpen = !this.settingsOpen;
        const panel = document.getElementById('settings-panel');
        const overlay = document.getElementById('settings-overlay');
        const gearBtn = document.getElementById('settings-btn');

        panel.classList.toggle('open', this.settingsOpen);
        overlay.classList.toggle('open', this.settingsOpen);

        // Keep AT informed of open/closed state
        panel.setAttribute('aria-hidden', String(!this.settingsOpen));
        gearBtn.setAttribute('aria-expanded', String(this.settingsOpen));

        if (this.settingsOpen) {
            document.getElementById('settings-close').focus();
            this._focusTrapHandler = this._handleFocusTrap.bind(this);
            document.addEventListener('keydown', this._focusTrapHandler);
        } else {
            gearBtn.focus();
            if (this._focusTrapHandler) {
                document.removeEventListener('keydown', this._focusTrapHandler);
                this._focusTrapHandler = null;
            }
        }
    }

    _handleFocusTrap(e) {
        const panel = document.getElementById('settings-panel');
        const focusable = Array.from(
            panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select')
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.key === 'Escape') {
            this._toggleSettings();
            return;
        }
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }

    // ---- PIN dialog ----

    _bindPinDialog() {
        document.getElementById('pin-close').addEventListener('click', () => this._closePinDialog());
        document.getElementById('pin-overlay').addEventListener('click', () => this._closePinDialog());
        document.getElementById('pin-submit').addEventListener('click', () => this._submitPin());
        document.getElementById('pin-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') this._submitPin();
            if (e.key === 'Escape') this._closePinDialog();
        });
    }

    _openPinDialog() {
        this.pinOpen = true;
        const dialog = document.getElementById('pin-dialog');
        const overlay = document.getElementById('pin-overlay');
        document.getElementById('pin-input').value = '';
        document.getElementById('pin-error').textContent = '';
        dialog.classList.add('open');
        overlay.classList.add('open');
        dialog.setAttribute('aria-hidden', 'false');
        document.getElementById('pin-input').focus();
        this._pinFocusTrapHandler = this._handlePinFocusTrap.bind(this);
        document.addEventListener('keydown', this._pinFocusTrapHandler);
    }

    _closePinDialog() {
        this.pinOpen = false;
        const dialog = document.getElementById('pin-dialog');
        const overlay = document.getElementById('pin-overlay');
        dialog.classList.remove('open');
        overlay.classList.remove('open');
        dialog.setAttribute('aria-hidden', 'true');
        if (this._pinFocusTrapHandler) {
            document.removeEventListener('keydown', this._pinFocusTrapHandler);
            this._pinFocusTrapHandler = null;
        }
        // Return focus to the settings gear button (unlock-btn is inside the hidden panel).
        document.getElementById('settings-btn').focus();
    }

    _handlePinFocusTrap(e) {
        const dialog = document.getElementById('pin-dialog');
        const focusable = Array.from(
            dialog.querySelectorAll('button, input')
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.key === 'Escape') { this._closePinDialog(); return; }
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
    }

    _submitPin() {
        const pin = document.getElementById('pin-input').value;
        const errorEl = document.getElementById('pin-error');
        if (pin === '1234') {
            const data = SaveManager.load();
            data.allUnlocked = true;
            SaveManager.save(data);
            this.progress = data;
            this.renderLessonSelect();
            this._closePinDialog();
        } else {
            errorEl.textContent = 'Incorrect PIN. Please try again.';
            document.getElementById('pin-input').value = '';
            document.getElementById('pin-input').focus();
        }
    }

    // ---- Settings sync ----

    _syncSettings() {
        const data = SaveManager.load();
        if (data.muteSpeech) document.getElementById('mute-speech').checked = true;
        if (data.muteSfx) document.getElementById('mute-sfx').checked = true;
        if (data.fontSize) {
            document.getElementById('font-size-select').value = data.fontSize;
        }
        if (data.hintMode !== undefined) {
            const checked = data.hintMode !== 'none';
            const el = document.getElementById('hint-toggle');
            el.checked = checked;
            el.setAttribute('aria-pressed', String(checked));
        }
    }

    _applyFontSize(level) {
        // Set font-size directly on <html> — more reliable than a CSS class approach
        // Minimums: small ≥ 16px, medium 18px, large 22px (per plan.md accessibility floor)
        const sizes = { small: '16px', medium: '18px', large: '22px' };
        document.documentElement.style.fontSize = sizes[level] || '18px';
        this.fontSizeLevel = level;
    }
}

// Assign to window and init immediately — all defer scripts have run by the time
// game.js executes, so SaveManager/DataManager/BoardManager etc. are all defined.
// Using 'load' would delay the UI until fonts and images finish fetching.
window.game = new Game();
window.game.init();
