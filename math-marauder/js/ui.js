(function attach(root, factory) {
    const exported = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = exported;
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.UIManager = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildUIManager() {
    class UIManager {
        constructor(doc) {
            this._doc = doc || document;
            this._answerCallback = null;
            this._answersLocked = false;
            this._settingsTrigger = null;
            this._dialogueReturnFocus = null;
            this._lastDialogue = null;
            this._replayHandler = null;
            this._bindKeys();
        }

        showScreen(screenId) {
            this._doc.querySelectorAll('.screen').forEach((screen) => {
                screen.classList.toggle('active', screen.id === screenId);
            });
        }

        setPrompt(problem) {
            const el = this._doc.getElementById('math-prompt');
            if (!el) return;
            el.textContent = problem.prompt;
            el.setAttribute('aria-label', problem.voiceText || problem.prompt);
        }

        setAnswers(choices, onChoose) {
            this._answerCallback = onChoose;
            this._answersLocked = false;
            choices.forEach((choice, index) => {
                const btn = this._doc.getElementById(`answer-${index}`);
                if (!btn) return;
                btn.textContent = String(choice);
                btn.setAttribute('aria-label', `Answer ${index + 1}: ${choice}`);
                btn.disabled = false;
                btn.classList.remove('correct', 'wrong');
                btn.onclick = () => this._choose(choice, index);
            });
        }

        showDialogue(line, onClose, returnFocus) {
            this._lastDialogue = line;
            this._dialogueReturnFocus = returnFocus || this._doc.activeElement;
            const overlay = this._doc.getElementById('dialogue-overlay');
            if (!overlay) return;
            const speaker = this._doc.getElementById('dialogue-speaker');
            const caption = this._doc.getElementById('dialogue-caption');
            if (speaker) speaker.textContent = line.speaker || '';
            if (caption) caption.textContent = line.caption || '';
            const replay = this._doc.getElementById('btn-replay-dialogue');
            if (replay) {
                replay.onclick = () => {
                    if (this._replayHandler) this._replayHandler(line);
                };
            }
            overlay.dataset.onClose = onClose ? '1' : '';
            overlay._onClose = onClose || null;
            this._openOverlay(overlay, this._doc.getElementById('btn-close-dialogue'), null);
        }

        closeDialogue() {
            const overlay = this._doc.getElementById('dialogue-overlay');
            if (!overlay) return;
            const cb = overlay._onClose;
            this._closeOverlay(overlay, null, this._dialogueReturnFocus);
            if (cb) cb();
        }

        onReplayDialogue(handler) {
            this._replayHandler = handler;
        }

        openSettings(settings) {
            this._settingsTrigger = this._doc.activeElement || this._doc.getElementById('btn-settings');
            const reduced = this._doc.getElementById('setting-reduced-motion');
            if (reduced) reduced.checked = !!(settings && settings.reducedMotion);
            this._openOverlay(this._doc.getElementById('settings-overlay'), this._doc.getElementById('btn-close-settings'), this._doc.getElementById('btn-settings'));
        }

        closeSettings() {
            this._closeOverlay(this._doc.getElementById('settings-overlay'), this._doc.getElementById('btn-settings'), this._settingsTrigger);
        }

        applySettings(settings) {
            this._doc.documentElement.classList.toggle('reduced-motion', !!(settings && settings.reducedMotion));
        }

        announce(text) {
            const el = this._doc.getElementById('battle-status');
            if (el) el.textContent = text;
        }

        showSpell(text) {
            const el = this._doc.getElementById('spell-banner');
            if (el) el.textContent = text || '';
        }

        updateHud(raid, roomLabel) {
            const hearts = this._doc.getElementById('hud-hearts');
            const room = this._doc.getElementById('hud-room');
            const streak = this._doc.getElementById('hud-streak');
            if (hearts) hearts.textContent = `HP ${Math.max(0, raid.hearts || 0)}`;
            if (room) room.textContent = roomLabel || `Room ${(raid.roomIndex || 0) + 1}`;
            if (streak) streak.textContent = `Streak ${raid.streak || 0}`;
        }

        _choose(choice, index) {
            if (this._answersLocked) return;
            this._answersLocked = true;
            this._doc.querySelectorAll('.answer-button').forEach((btn) => { btn.disabled = true; });
            const cb = this._answerCallback;
            if (cb) cb(choice, index);
        }

        markAnswer(index, correct) {
            const btn = this._doc.getElementById(`answer-${index}`);
            if (!btn) return;
            btn.classList.add(correct ? 'correct' : 'wrong');
        }

        _openOverlay(overlay, firstFocus, trigger) {
            if (!overlay) return;
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
            if (trigger) trigger.setAttribute('aria-expanded', 'true');
            if (firstFocus) firstFocus.focus();
        }

        _closeOverlay(overlay, trigger, returnFocus) {
            if (!overlay) return;
            overlay.classList.remove('open');
            overlay.setAttribute('aria-hidden', 'true');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
            if (returnFocus && returnFocus.focus) returnFocus.focus();
            else if (trigger) trigger.focus();
        }

        _bindKeys() {
            this._doc.addEventListener('keydown', (e) => {
                const settings = this._doc.getElementById('settings-overlay');
                const dialogue = this._doc.getElementById('dialogue-overlay');
                if (e.key === 'Escape') {
                    if (settings && settings.classList.contains('open')) this.closeSettings();
                    else if (dialogue && dialogue.classList.contains('open')) this.closeDialogue();
                    return;
                }
                const activeOverlay = [settings, dialogue].find((overlay) => overlay && overlay.classList.contains('open'));
                if (e.key === 'Tab' && activeOverlay) this._trapTab(e, activeOverlay);
                if (/^[1-4]$/.test(e.key) && !activeOverlay) {
                    const btn = this._doc.getElementById(`answer-${Number(e.key) - 1}`);
                    if (btn && !btn.disabled) btn.click();
                }
            });
            const closeSettings = this._doc.getElementById('btn-close-settings');
            const closeDialogue = this._doc.getElementById('btn-close-dialogue');
            if (closeSettings) closeSettings.addEventListener('click', () => this.closeSettings());
            if (closeDialogue) closeDialogue.addEventListener('click', () => this.closeDialogue());
        }

        _trapTab(e, overlay) {
            const focusable = Array.from(overlay.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'))
                .filter((el) => !el.disabled);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && this._doc.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && this._doc.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    return UIManager;
});
