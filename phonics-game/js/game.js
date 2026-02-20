// Placeholder lesson metadata for Session 1 UI.
// Real lesson data loaded from JSON files starting in Session 2.
const LESSON_META = [
    { id: 1,  grade: 1, title: 'Short Vowels — CVC Words' },
    { id: 2,  grade: 1, title: 'Short Vowels — More CVC' },
    { id: 3,  grade: 1, title: 'Consonant Digraphs' },
    { id: 4,  grade: 1, title: 'L-Blends & S-Blends' },
    { id: 5,  grade: 1, title: 'R-Blends & End Blends' },
    { id: 6,  grade: 1, title: 'Long Vowels — Silent E' },
    { id: 7,  grade: 2, title: 'Long-A Vowel Teams' },
    { id: 8,  grade: 2, title: 'Long-E Vowel Teams' },
    { id: 9,  grade: 2, title: 'Long-O Vowel Teams' },
    { id: 10, grade: 2, title: 'Long-I & Long-U Teams' },
    { id: 11, grade: 2, title: 'R-Controlled — ar, or' },
    { id: 12, grade: 2, title: 'R-Controlled — er, ir, ur' },
    { id: 13, grade: 2, title: 'Diphthongs — oi, oy' },
    { id: 14, grade: 2, title: 'Diphthongs — ou, ow' },
    { id: 15, grade: 3, title: 'Silent Letters — kn, wr, gn' },
    { id: 16, grade: 3, title: 'Silent GH Patterns' },
    { id: 17, grade: 3, title: 'Soft C and Soft G' },
    { id: 18, grade: 3, title: 'Syllable Types' },
    { id: 19, grade: 3, title: 'VCE & Vowel Team Syllables' },
    { id: 20, grade: 3, title: 'Common Suffixes' },
    { id: 21, grade: 4, title: 'Prefixes — Basic' },
    { id: 22, grade: 4, title: 'Suffixes — -tion, -sion, -ness' },
    { id: 23, grade: 4, title: 'Greek Roots I' },
    { id: 24, grade: 4, title: 'Latin Roots I' },
    { id: 25, grade: 4, title: 'Compound Words & Homophones' },
    { id: 26, grade: 5, title: 'Advanced Prefixes' },
    { id: 27, grade: 5, title: 'Advanced Suffixes' },
    { id: 28, grade: 5, title: 'Latin Roots II' },
    { id: 29, grade: 5, title: 'Greek Roots II' },
    { id: 30, grade: 5, title: 'Academic Vocabulary' },
];

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
        this.fontSizeLevel = 'medium'; // small | medium | large
        this._focusTrapHandler = null;
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
        this._syncSettings();
    }

    renderLessonSelect() {
        const grid = document.getElementById('lesson-grid');
        grid.innerHTML = '';

        LESSON_META.forEach(lesson => {
            const lessonData = this.progress.lessons?.[lesson.id];
            const stars = lessonData?.stars || 0;
            const completed = lessonData?.completed || false;
            const previewed = lessonData?.previewed || false;
            // Lesson 1 always unlocked; subsequent lessons unlock when previous is completed
            const isUnlocked = lesson.id === 1
                || this.progress.allUnlocked
                || Boolean(this.progress.lessons?.[lesson.id - 1]?.completed);
            // Any lesson can be started in preview mode even if locked
            const isPreview = !isUnlocked;

            const card = document.createElement('div');
            card.className = 'lesson-card';
            // Explicit string conversion ensures grade filter comparison works correctly
            card.dataset.grade = String(lesson.grade);
            card.dataset.id = String(lesson.id);

            if (isPreview) {
                card.classList.add('locked');
                card.setAttribute('tabindex', '-1');
                card.setAttribute('aria-disabled', 'true');
            } else {
                card.setAttribute('tabindex', '0');
            }

            card.setAttribute('role', 'button');
            card.setAttribute('aria-label',
                `Lesson ${lesson.id}: ${lesson.title}, Grade ${lesson.grade}` +
                (isPreview ? ', preview only' : '') +
                (stars > 0 ? `, ${stars} of 3 stars` : '')
            );

            card.innerHTML = `
                <div class="lesson-number">${escHtml(lesson.id)}</div>
                <div class="lesson-title">${escHtml(lesson.title)}</div>
                <div class="grade-badge grade-${escHtml(lesson.grade)}">Grade ${escHtml(lesson.grade)}</div>
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
    startLesson(id, isPreview = false) {
        console.log('Starting lesson', id, isPreview ? '(preview)' : '(full)');
        // Full implementation in Session 5
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

        // Unlock all (PIN-gated — PIN specified in design doc as "1234")
        document.getElementById('unlock-btn').addEventListener('click', () => {
            const pin = prompt('Enter PIN to unlock all lessons:');
            if (pin === '1234') {
                const data = SaveManager.load();
                data.allUnlocked = true;
                SaveManager.save(data);
                this.progress = data;
                this.renderLessonSelect();
                this._toggleSettings();
                alert('All lessons unlocked!');
            } else if (pin !== null) {
                alert('Incorrect PIN.');
            }
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
            // Move focus to close button (first focusable element in panel)
            document.getElementById('settings-close').focus();
            // Activate focus trap
            this._focusTrapHandler = this._handleFocusTrap.bind(this);
            document.addEventListener('keydown', this._focusTrapHandler);
        } else {
            // Return focus to gear button
            gearBtn.focus();
            // Remove focus trap
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
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    }

    _syncSettings() {
        const data = SaveManager.load();
        if (data.muteSpeech) document.getElementById('mute-speech').checked = true;
        if (data.muteSfx) document.getElementById('mute-sfx').checked = true;
        if (data.fontSize) {
            document.getElementById('font-size-select').value = data.fontSize;
            // _applyFontSize already called in init() with the persisted value
        }
    }

    _applyFontSize(level) {
        // Set font-size directly on <html> — more reliable than CSS custom property re-declaration
        const sizes = { small: '14px', medium: '16px', large: '20px' };
        document.documentElement.style.fontSize = sizes[level] || '16px';
        this.fontSizeLevel = level;
    }
}

window.addEventListener('load', () => {
    window.game = new Game();
    window.game.init();
});
