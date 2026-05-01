(function runBrowserUiTests() {
    const output = document.getElementById('test-output');
    const root = document.getElementById('test-root');
    const results = [];

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    function test(name, fn) {
        try {
            root.innerHTML = `
                <button id="btn-settings" aria-expanded="false">Settings</button>
                <div id="settings-overlay" class="overlay" role="dialog" aria-modal="true" aria-hidden="true">
                    <button id="btn-close-settings">x</button>
                    <label><input id="setting-reduced-motion" type="checkbox"> Reduced motion</label>
                </div>
                <div id="dialogue-overlay" class="overlay" role="dialog" aria-modal="true" aria-hidden="true">
                    <button id="btn-close-dialogue">x</button>
                    <p id="dialogue-speaker"></p>
                    <p id="dialogue-caption"></p>
                    <button id="btn-replay-dialogue">Replay narration</button>
                </div>
                <div id="math-prompt"></div>
                <div id="answer-grid">
                    <button id="answer-0"></button>
                    <button id="answer-1"></button>
                    <button id="answer-2"></button>
                    <button id="answer-3"></button>
                </div>
                <div id="battle-status" role="status"></div>
            `;
            fn(new MathMarauder.UIManager(document));
            results.push(`PASS ${name}`);
        } catch (err) {
            results.push(`FAIL ${name}: ${err.message}`);
        }
    }

    test('settings trap and escape restore focus', (ui) => {
        const trigger = document.getElementById('btn-settings');
        trigger.focus();
        ui.openSettings({ reducedMotion: false });
        assert(document.getElementById('settings-overlay').classList.contains('open'), 'settings did not open');
        assert(document.activeElement.id === 'btn-close-settings', 'close settings button did not receive focus');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        assert(!document.getElementById('settings-overlay').classList.contains('open'), 'settings did not close');
        assert(document.activeElement.id === 'btn-settings', 'settings focus did not return');
    });

    test('dialogue trap and replay keep caption stable', (ui) => {
        ui.showDialogue({ speaker: 'Guide', caption: 'Pick the matching rune.', voiceText: 'Pick the matching rune.' });
        assert(document.getElementById('dialogue-overlay').getAttribute('aria-hidden') === 'false', 'dialogue aria-hidden not false');
        assert(document.activeElement.id === 'btn-close-dialogue', 'dialogue close did not receive focus');
        document.getElementById('btn-replay-dialogue').click();
        assert(document.getElementById('dialogue-caption').textContent === 'Pick the matching rune.', 'caption changed on replay');
    });

    test('answer click is processed once and disables buttons', (ui) => {
        let calls = 0;
        ui.setAnswers([12, 24, 36, 48], () => { calls += 1; });
        document.getElementById('answer-0').click();
        document.getElementById('answer-0').click();
        assert(calls === 1, `expected one callback, got ${calls}`);
        assert(document.getElementById('answer-1').disabled, 'other answer buttons were not disabled');
    });

    test('number keys choose answers', (ui) => {
        let picked = null;
        ui.setAnswers([3, 6, 9, 12], (choice) => { picked = choice; });
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
        assert(picked === 9, `expected 9, got ${picked}`);
    });

    test('reduced motion toggles root class immediately', (ui) => {
        ui.applySettings({ reducedMotion: true });
        assert(document.documentElement.classList.contains('reduced-motion'), 'reduced motion class missing');
        ui.applySettings({ reducedMotion: false });
        assert(!document.documentElement.classList.contains('reduced-motion'), 'reduced motion class stuck');
    });

    output.textContent = results.join('\n');
    if (results.some((line) => line.startsWith('FAIL'))) {
        throw new Error(results.join('\n'));
    }
})();
