class NarrativeManager {
    constructor() {
        this.totalRooms = 30;

        // Timer IDs — all null at construction (timer lifecycle pattern).
        this._celebrationTimer    = null;
        this._narrativeFadeTimer  = null;
        this._narrativeDismissTimer = null;

        // Callback to fire after celebration finishes.
        this._onCelebrationDone = null;

        // Stored event handler references for removal in cancel().
        this._celebrationClickHandler = null;
        this._celebrationKeyHandler   = null; // Escape to dismiss celebration
        this._narrativeClickHandler   = null;

        // Bind dismiss button once — prevents handler stacking on re-entry.
        document.getElementById('celebration-dismiss-btn')
            .addEventListener('click', () => this._completeCelebration());
    }

    // ── Public API ──────────────────────────────────────────────────────────

    cancel() {
        this._hideCelebration();
        this._hideNarrative();
    }

    getRoomsUnlocked(progress) {
        if (!progress?.lessons) return 0;
        return Object.values(progress.lessons).filter(l => l.completed).length;
    }

    getRoomDescription(lessonId) {
        if (lessonId <= 6)  return 'the Alphabet Atrium';
        if (lessonId <= 14) return 'the Vowel Vault';
        if (lessonId <= 20) return 'the Spelling Sanctum';
        if (lessonId <= 25) return 'the Morpheme Museum';
        return 'the Academic Archives';
    }

    updateLenaOnSelect(progress) {
        const rooms = this.getRoomsUnlocked(progress);
        const total = this.totalRooms;
        const pct   = Math.round((rooms / total) * 100);

        const textEl = document.getElementById('lena-progress-text');
        const fillEl = document.getElementById('lena-progress-bar-fill');
        const barEl  = document.getElementById('lena-progress-bar');

        if (textEl) textEl.textContent = `${rooms}/${total} rooms explored`;
        // style.width is a dynamic CSS value — inline style is appropriate for progress bars
        if (fillEl) fillEl.style.width = `${pct}%`;
        if (barEl)  barEl.setAttribute('aria-valuenow', String(rooms));
    }

    // Show celebration overlay; calls onDone when dismissed (auto or manual).
    showCelebration(stars, onDone) {
        this.cancel(); // defensive reset — clears any previous timers/handlers
        this._onCelebrationDone = onDone;

        const overlay    = document.getElementById('celebration-overlay');
        const titleEl    = document.getElementById('celebration-title');
        const subtitleEl = document.getElementById('celebration-subtitle');
        const confettiEl = document.getElementById('celebration-confetti');

        titleEl.textContent    = stars === 3 ? '🌟 Perfect!' : stars === 2 ? '🎉 Great Job!' : '✨ You Did It!';
        subtitleEl.textContent = `You earned ${stars} star${stars !== 1 ? 's' : ''}!`;

        // Build confetti with createElement — no innerHTML interpolation
        confettiEl.innerHTML = '';
        confettiEl.setAttribute('aria-hidden', 'true'); // decorative — don't enumerate in AT
        for (let i = 0; i < 12; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            confettiEl.appendChild(piece);
        }

        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('celebration-dismiss-btn').focus();

        // Tap overlay background to dismiss early (distinct from dismiss button)
        this._celebrationClickHandler = e => {
            if (e.target === overlay) this._completeCelebration();
        };
        overlay.addEventListener('click', this._celebrationClickHandler);

        // Escape key to dismiss early
        this._celebrationKeyHandler = e => {
            if (e.key === 'Escape') this._completeCelebration();
        };
        document.addEventListener('keydown', this._celebrationKeyHandler);

        // Auto-dismiss after 1.8s
        this._celebrationTimer = setTimeout(() => {
            this._celebrationTimer = null;
            this._completeCelebration();
        }, 1800);
    }

    // Show room-unlock overlay; calls onDone after it auto-dismisses or user taps.
    showRoomUnlock(lessonId, onDone) {
        this._hideNarrative(); // reset any previous room-unlock state

        const overlay = document.getElementById('narrative-overlay');
        const msgEl   = document.getElementById('narrative-msg');
        msgEl.textContent = `Lena unlocked: ${this.getRoomDescription(lessonId)}!`;

        overlay.classList.add('open');
        // Overlay is decorative — announce message through the dedicated aria-live region
        const ariaLive = document.getElementById('aria-live');
        if (ariaLive) ariaLive.textContent = msgEl.textContent;

        // Auto-dismiss after 2.5s with a 0.6s CSS fade
        this._narrativeFadeTimer = setTimeout(() => {
            this._narrativeFadeTimer = null;
            this._startNarrativeFade(onDone);
        }, 2500);

        // Tap anywhere to dismiss early
        this._narrativeClickHandler = () => this._startNarrativeFade(onDone);
        overlay.addEventListener('click', this._narrativeClickHandler);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    _completeCelebration() {
        const overlay = document.getElementById('celebration-overlay');
        if (!overlay.classList.contains('open')) return; // guard against double-call
        const cb = this._onCelebrationDone; // save BEFORE _hideCelebration nulls it
        this._hideCelebration();
        if (cb) cb();
    }

    _hideCelebration() {
        clearTimeout(this._celebrationTimer); this._celebrationTimer = null;
        this._onCelebrationDone = null;

        const overlay = document.getElementById('celebration-overlay');
        if (this._celebrationClickHandler) {
            overlay.removeEventListener('click', this._celebrationClickHandler);
            this._celebrationClickHandler = null;
        }
        if (this._celebrationKeyHandler) {
            document.removeEventListener('keydown', this._celebrationKeyHandler);
            this._celebrationKeyHandler = null;
        }
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');

        const confettiEl = document.getElementById('celebration-confetti');
        if (confettiEl) confettiEl.innerHTML = '';
    }

    _startNarrativeFade(onDone) {
        const overlay = document.getElementById('narrative-overlay');
        // Guard: if already fading or closed, don't restart
        if (!overlay.classList.contains('open') || overlay.classList.contains('fading')) return;

        clearTimeout(this._narrativeFadeTimer); this._narrativeFadeTimer = null;
        if (this._narrativeClickHandler) {
            overlay.removeEventListener('click', this._narrativeClickHandler);
            this._narrativeClickHandler = null;
        }

        overlay.classList.add('fading');
        overlay.style.pointerEvents = 'none'; // prevent iOS tap-through during fade
        this._narrativeDismissTimer = setTimeout(() => {
            this._narrativeDismissTimer = null;
            this._hideNarrative();
            if (onDone) onDone();
        }, 600);
    }

    _hideNarrative() {
        clearTimeout(this._narrativeFadeTimer);   this._narrativeFadeTimer = null;
        clearTimeout(this._narrativeDismissTimer); this._narrativeDismissTimer = null;

        const overlay = document.getElementById('narrative-overlay');
        if (this._narrativeClickHandler) {
            overlay.removeEventListener('click', this._narrativeClickHandler);
            this._narrativeClickHandler = null;
        }
        overlay.classList.remove('open', 'fading');
        overlay.style.pointerEvents = ''; // restore after fade
    }
}
