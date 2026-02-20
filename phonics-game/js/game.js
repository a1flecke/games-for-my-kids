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
        this.activeGradeFilter = 'all';
        this.settingsOpen = false;
        this.pinOpen = false;
        this.fontSizeLevel = 'medium'; // small | medium | large
        this._focusTrapHandler = null;
        this._pinFocusTrapHandler = null;
    }

    init() {
        this.progress = SaveManager.load();
        // Restore persisted font size before rendering (so first render uses correct size)
        if (this.progress.fontSize) {
            this.fontSizeLevel = this.progress.fontSize;
        }
        this._applyFontSize(this.fontSizeLevel);
        this.renderLessonSelect();
        this._bindSettingsPanel();
        this._bindGradeFilter();
        this._bindPinDialog();
        this._bindBoardScreen();
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
                ${isPreview ? '<div class="lock-overlay" aria-hidden="true">🔒</div>' : ''}
            `;

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
            document.getElementById('screen-select').classList.remove('active');
            document.getElementById('screen-board').classList.add('active');
            document.getElementById('board-lesson-title').textContent = lesson.title;
            document.getElementById('board-progress').textContent =
                `0 / ${lesson.gridSize * lesson.gridSize} matched`;
            window.boardManager = new BoardManager();
            window.boardManager.init(lesson);
        } catch (err) {
            console.error('Failed to load lesson', id, err);
        }
    }

    showLessonSelect() {
        document.getElementById('screen-board').classList.remove('active');
        document.getElementById('screen-select').classList.add('active');
    }

    onTileTap(tile) {
        SpeechManager.speakIfUnmuted(tile.word);
        // Basic select/deselect stub — full match logic implemented in Session 6.
        if (tile.state === 'normal' || tile.state === 'glow') {
            window.boardManager.setTileState(tile, 'selected');
        } else if (tile.state === 'selected') {
            window.boardManager.setTileState(tile, 'normal');
            window.boardManager.resetAllStates();
        }
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
            card.style.display = visible ? '' : 'none';
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
        // Return focus to the unlock button
        document.getElementById('unlock-btn').focus();
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
    }

    _applyFontSize(level) {
        // Set font-size directly on <html> — more reliable than a CSS class approach
        // Minimums: small ≥ 16px, medium 18px, large 22px (per plan.md accessibility floor)
        const sizes = { small: '16px', medium: '18px', large: '22px' };
        document.documentElement.style.fontSize = sizes[level] || '18px';
        this.fontSizeLevel = level;
    }
}

// Assign to window immediately so other modules can reference window.game if needed.
window.game = new Game();
window.addEventListener('load', () => {
    window.game.init();
});
