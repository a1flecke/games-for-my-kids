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
        this.mode = 'explorer';   // 'explorer' | 'challenge'
        this.challengeTimer = null;
        this._pendingBoardPlay = null;
        this._focusTrapHandler = null;
        this._pinFocusTrapHandler = null;
        this._summaryFocusTrapHandler = null;
        this._sortFocusTrapHandler = null;
        this._modeSelectFocusTrapHandler = null;
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
        // Initialize singleton managers before renderLessonSelect() so
        // narrativeManager.updateLenaOnSelect() is available on first render.
        // Never lazy-init in startLesson() — reuses stale state on second play.
        window.audioManager = new AudioManager();
        window.narrativeManager = new NarrativeManager();
        window.tutorialManager = new TutorialManager();
        window.sortManager = new SortManager();
        this.renderLessonSelect();
        this._bindSettingsPanel();
        this._bindGradeFilter();
        this._bindPinDialog();
        this._bindBoardScreen();
        this._bindModeSelect();
        this._bindSummaryScreen();
        this._bindSortScreen();
        this._syncSettings();
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
        window.narrativeManager?.updateLenaOnSelect(this.progress);
    }

    // isPreview=true means lesson is locked (no prior completion) — opens in preview mode
    async startLesson(id, isPreview = false) {
        // Defensive cleanup — stop any running timer and dismiss any open mode select.
        this.stopChallengeTimer();
        this._dismissModeSelect();
        try {
            const lesson = await DataManager.loadLesson(id);
            if (isPreview) SaveManager.markPreviewed(id);
            this.currentLessonId = id;
            // Remove active from all screens before showing board
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById('screen-board').classList.add('active');
            document.getElementById('board-lesson-title').textContent = lesson.title;
            // Reset mode indicator to Explorer defaults while mode select is pending.
            const modeLabel = document.getElementById('board-mode-label');
            modeLabel.textContent = 'Explorer Mode \uD83D\uDDFA\uFE0F';
            modeLabel.setAttribute('aria-label', 'Explorer Mode');
            document.getElementById('energy-bar-container').classList.remove('open');
            window.scoreManager = new ScoreManager();
            window.boardManager = new BoardManager();
            window.boardManager.init(lesson);

            const progress = SaveManager.load();
            // startBoardPlay creates MatchManager and begins play after mode is selected.
            const startBoardPlay = () => {
                window.matchManager = new MatchManager(window.boardManager, window.scoreManager);
                window.matchManager.init(lesson);
                // Return focus to board after overlays close.
                // Never leave focus on now-hidden overlay or in a void.
                const firstTile = document.querySelector('#board-grid .tile');
                if (firstTile) firstTile.focus();
            };

            // After tutorial (or if no tutorial), always show mode select before board play.
            const afterTutorial = () => {
                this._openModeSelect(lesson, progress, startBoardPlay);
            };

            if (window.tutorialManager.shouldShow(lesson, progress)) {
                // Tutorial overlay sits above the rendered board; mode select shows on complete.
                window.tutorialManager.start(lesson, progress, afterTutorial);
            } else {
                afterTutorial();
            }
        } catch (err) {
            console.error('Failed to load lesson', id, err);
        }
    }

    showLessonSelect() {
        // Stop challenge timer and close mode select before any other cleanup.
        this.stopChallengeTimer();
        this._dismissModeSelect();
        // Cancel any pending match/refill/win timers before leaving the board screen.
        if (window.matchManager) {
            window.matchManager.cancel();
            window.matchManager = null;
        }
        window.boardManager = null;
        window.scoreManager = null;
        if (window.tutorialManager) window.tutorialManager.cancel();
        if (window.sortManager) window.sortManager.cancel();
        if (window.narrativeManager) window.narrativeManager.cancel();
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
        // Stop challenge timer if board cleared before energy ran out.
        this.stopChallengeTimer();
        window.audioManager?.playLessonComplete();
        const summary = window.scoreManager.getSummary();
        // Capture whether this lesson was already completed BEFORE saving,
        // so we can show the room-unlock only on a player's first completion.
        const wasCompleted = SaveManager.load().lessons?.[String(this.currentLessonId)]?.completed === true;
        SaveManager.saveLessonResult(this.currentLessonId, summary);

        // Celebration (1.8s auto-dismiss) → first-time room unlock → summary
        window.narrativeManager.showCelebration(summary.stars, () => {
            if (!wasCompleted) {
                window.narrativeManager.showRoomUnlock(this.currentLessonId, () => {
                    this.showSummary(summary);
                });
            } else {
                this.showSummary(summary);
            }
        });
    }

    showSummary(summary, options) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-summary').classList.add('active');

        // Title and optional challenge-mode message — built with textContent (no innerHTML).
        const titleEl = document.getElementById('summary-title');
        const challengeMsg = document.getElementById('summary-challenge-msg');
        if (options?.timeUp) {
            titleEl.textContent = '\u26A1 Time Up!';
            challengeMsg.textContent = 'Your energy ran out \u2014 here\u2019s how you did!';
            challengeMsg.classList.remove('hidden');
        } else {
            titleEl.textContent = 'Lesson Complete!';
            challengeMsg.textContent = '';
            challengeMsg.classList.add('hidden');
        }

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
        // No aria-pressed — chips are action triggers (hear word), not toggle buttons.
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

        // Arrow key grid navigation — bound once here (not in BoardManager.render()) so
        // it doesn't stack up with each lesson play. Uses .closest('.tile') so arrow keys
        // also work when the speaker button inside a tile has focus.
        document.getElementById('board-grid').addEventListener('keydown', e => {
            if (!window.boardManager) return;
            const activeTileEl = document.activeElement.closest?.('.tile') ??
                (document.activeElement.classList?.contains('tile') ? document.activeElement : null);
            const tile = window.boardManager.tiles.find(t => t.element === activeTileEl);
            if (!tile) return;
            const { row, col } = tile;
            let next = null;
            if (e.key === 'ArrowRight') next = window.boardManager.getTile(row, col + 1);
            if (e.key === 'ArrowLeft')  next = window.boardManager.getTile(row, col - 1);
            if (e.key === 'ArrowDown')  next = window.boardManager.getTile(row + 1, col);
            if (e.key === 'ArrowUp')    next = window.boardManager.getTile(row - 1, col);
            if (e.key === 'Escape') {
                if (window.matchManager) window.matchManager.resetSelection();
                return;
            }
            if (next) { e.preventDefault(); next.element.focus(); }
        });
    }

    // ---- Mode Select ----

    _bindModeSelect() {
        // Bound once in init(); selectMode() uses this._pendingBoardPlay set by _openModeSelect().
        document.getElementById('mode-select-close').addEventListener('click', () => this.selectMode('explorer'));
        document.getElementById('mode-explorer-btn').addEventListener('click', () => this.selectMode('explorer'));
        document.getElementById('mode-challenge-btn').addEventListener('click', () => this.selectMode('challenge'));
    }

    _openModeSelect(lesson, progress, startBoardPlay) {
        this._pendingBoardPlay = startBoardPlay;

        // Enable/disable Challenge Mode button based on prior lesson completion.
        const completed = progress.lessons?.[String(lesson.id)]?.completed || false;
        const challengeBtn = document.getElementById('mode-challenge-btn');
        const modeDesc = challengeBtn.querySelector('.mode-desc');
        if (completed) {
            challengeBtn.disabled = false;
            modeDesc.textContent = 'Match as many as you can before energy runs out!';
        } else {
            challengeBtn.disabled = true;
            modeDesc.textContent = 'Complete Explorer Mode first to unlock!';
        }

        // Show overlay — use .open class (no style.display per CLAUDE.md).
        const overlay = document.getElementById('mode-select-overlay');
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');

        // Focus close button (first focusable element per CLAUDE.md modal rule).
        document.getElementById('mode-select-close').focus();

        // Focus trap: Tab stays within overlay; Escape defaults to Explorer Mode (Watch Out #3).
        this._modeSelectFocusTrapHandler = (e) => {
            if (e.key === 'Escape') {
                // Guard: only act if overlay is still open (prevents stale handler firing).
                const ov2 = document.getElementById('mode-select-overlay');
                if (ov2.classList.contains('open')) this.selectMode('explorer');
                return;
            }
            if (e.key !== 'Tab') return;
            const ov = document.getElementById('mode-select-overlay');
            const focusable = Array.from(ov.querySelectorAll('button:not([disabled])'));
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', this._modeSelectFocusTrapHandler);
    }

    _dismissModeSelect() {
        const overlay = document.getElementById('mode-select-overlay');
        if (!overlay) return;
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (this._modeSelectFocusTrapHandler) {
            document.removeEventListener('keydown', this._modeSelectFocusTrapHandler);
            this._modeSelectFocusTrapHandler = null;
        }
        this._pendingBoardPlay = null;
    }

    selectMode(mode) {
        // Save callback before _dismissModeSelect() nulls _pendingBoardPlay.
        const boardPlay = this._pendingBoardPlay;
        this.mode = mode;
        this._dismissModeSelect();

        const modeLabel = document.getElementById('board-mode-label');
        const energyContainer = document.getElementById('energy-bar-container');
        if (mode === 'explorer') {
            modeLabel.textContent = 'Explorer Mode \uD83D\uDDFA\uFE0F';
            modeLabel.setAttribute('aria-label', 'Explorer Mode');
            energyContainer.classList.remove('open');
        } else {
            modeLabel.textContent = 'Challenge Mode \u26A1';
            modeLabel.setAttribute('aria-label', 'Challenge Mode');
            energyContainer.classList.add('open');
            this.startChallengeTimer();
        }

        if (boardPlay) boardPlay();
    }

    // ---- Challenge Timer ----

    startChallengeTimer() {
        const DURATION = 180;  // seconds
        let remaining = DURATION;
        const fill = document.getElementById('energy-bar-fill');
        // Reset color classes FIRST, then set width — prevents a stale color flash on replay.
        fill.classList.remove('energy-mid', 'energy-low');
        fill.style.width = '100%';

        this.challengeTimer = setInterval(() => {
            remaining--;
            const pct = (remaining / DURATION) * 100;
            fill.style.width = `${pct}%`;

            // Update color class — no direct backgroundColor (Watch Out #2).
            fill.classList.remove('energy-mid', 'energy-low');
            if (pct <= 30) {
                fill.classList.add('energy-low');
            } else if (pct <= 60) {
                fill.classList.add('energy-mid');
            }

            if (remaining <= 0) {
                clearInterval(this.challengeTimer);
                this.challengeTimer = null;
                this.onChallengeTimeUp();
            }
        }, 1000);
    }

    stopChallengeTimer() {
        if (this.challengeTimer) {
            clearInterval(this.challengeTimer);
            this.challengeTimer = null;
        }
    }

    onChallengeTimeUp() {
        // Guard: scoreManager may be null if back-navigation raced the timer tick.
        if (!window.scoreManager) return;
        // Cancel match timers so they can't fire after the summary screen is shown.
        if (window.matchManager) {
            window.matchManager.cancel();
            window.matchManager = null;
        }
        window.audioManager?.playLessonComplete();
        const summary = window.scoreManager.getSummary();
        SaveManager.saveLessonResult(this.currentLessonId, summary);
        this.showSummary(summary, { timeUp: true });
    }

    _bindGradeFilter() {
        document.querySelectorAll('.grade-tab').forEach(tab => {
            // Initialize aria-pressed from the initial .active class state.
            tab.setAttribute('aria-pressed', tab.classList.contains('active') ? 'true' : 'false');
            tab.addEventListener('click', () => {
                document.querySelectorAll('.grade-tab').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-pressed', 'false');
                });
                tab.classList.add('active');
                tab.setAttribute('aria-pressed', 'true');
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
            // Keep hidden cards out of AT list count; remove attr (not set to "false") for visible
            if (visible) {
                card.removeAttribute('aria-hidden');
            } else {
                card.setAttribute('aria-hidden', 'true');
            }
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

        // Hint tile toggle — native checkbox; checked state is its own ARIA state carrier
        document.getElementById('hint-toggle').addEventListener('change', e => {
            this.hintMode = e.target.checked ? 'one' : 'none';
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
            document.getElementById('hint-toggle').checked = data.hintMode !== 'none';
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
