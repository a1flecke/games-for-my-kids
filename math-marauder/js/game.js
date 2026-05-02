(function attach(root, factory) {
    const exported = factory();
    root.MathMarauder = root.MathMarauder || {};
    root.MathMarauder.Game = exported;
})(typeof globalThis !== 'undefined' ? globalThis : window, function buildGame() {
    class Game {
        constructor() {
            this._state = 'TITLE';
            this._saveManager = null;
            this._save = null;
            this._progression = null;
            this._problemEngine = null;
            this._audio = null;
            this._speech = null;
            this._renderer = null;
            this._ui = null;
            this._raid = null;
            this._encounter = null;
            this._currentProblem = null;
            this._currentRoom = null;
            this._firstTry = true;
            this._phase = 1;
            this._rafId = null;
            this._lastTime = 0;
            this._scene = {};
        }

        init() {
            this._saveManager = new MathMarauder.SaveManager();
            this._save = this._saveManager.load();
            this._progression = new MathMarauder.Progression(this._save);
            this._problemEngine = new MathMarauder.ProblemEngine();
            this._audio = new MathMarauder.AudioManager();
            this._speech = new MathMarauder.SpeechManager();
            this._ui = new MathMarauder.UIManager(document);
            this._ui.onReplayDialogue((line) => this._speech.speak(line.voiceText));
            this._renderer = new MathMarauder.Renderer(document.getElementById('battle-canvas'));
            this._bindControls();
            this._applySettings();
            this._refreshUnlocks();
            this._ui.showScreen('screen-title');
            this._loop(0);
        }

        _bindControls() {
            document.getElementById('btn-quick-raid').addEventListener('click', () => this.startRaid('quick'));
            document.getElementById('btn-standard-raid').addEventListener('click', () => this.startRaid('standard'));
            document.getElementById('btn-practice-forge').addEventListener('click', () => this.startRaid('practice-forge'));
            document.getElementById('btn-results-quick').addEventListener('click', () => this.startRaid('quick'));
            document.getElementById('btn-results-title').addEventListener('click', () => this._ui.showScreen('screen-title'));
            document.getElementById('btn-settings').addEventListener('click', () => this._ui.openSettings(this._save.settings));
            ['setting-sfx', 'setting-music', 'setting-speech', 'setting-reduced-motion'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', () => this._saveSettingsFromControls());
            });
        }

        startRaid(mode) {
            this._audio.preWarm();
            if (mode === 'practice-forge') {
                const weak = this._progression.getWeakFacts()[0] || 'mul:7:8';
                const config = this._progression.makePracticeConfig(weak);
                this._raid = MathMarauder.GameRules.createRaidState('quick');
                this._raid.mode = 'practice-forge';
                this._raid.rooms = [{
                    biomeId: 'slime-foundry',
                    monsterId: 'crystal-golem',
                    hp: 6,
                    damage: 1,
                    promptTarget: config.promptTarget,
                    operations: config.operations,
                    band: config.band,
                    factorFamily: config.factorFamily
                }];
            } else {
                this._raid = MathMarauder.GameRules.createRaidState(mode);
            }
            this._state = 'RAID';
            this._phase = 1;
            this._ui.showScreen('screen-raid');
            this._ui.showSpell('');
            this._ui.showDialogue(MathMarauder.Content.dialogue[mode === 'standard' ? 5 : 1], () => {}, document.getElementById('answer-0'));
            this._speech.speak((MathMarauder.Content.dialogue[mode === 'standard' ? 5 : 1] || {}).voiceText || '');
            this.startRoom();
        }

        startRoom() {
            this._currentRoom = this._raid.rooms[this._raid.roomIndex];
            this._encounter = MathMarauder.GameRules.createEncounterState(this._currentRoom);
            this._encounter.hearts = this._raid.hearts;
            this._encounter.shields = this._raid.shields;
            this._encounter.streak = this._raid.streak;
            this._encounter.correctFirstTry = this._raid.correctFirstTry;
            this._encounter.promptsAnswered = this._raid.promptsAnswered;
            this._encounter.longestStreak = this._raid.longestStreak;
            this._phase = this._encounter.phaseIndex || 1;
            this.presentProblem();
            this._syncScene();
        }

        presentProblem() {
            const room = this._currentRoom;
            this._currentProblem = this._problemEngine.generate({
                operations: room.operations,
                band: room.band,
                factorFamily: room.factorFamily,
                adaptive: this._progression.getAdaptiveConfig()
            });
            this._firstTry = true;
            this._ui.setPrompt(this._currentProblem);
            this._ui.setAnswers(this._currentProblem.choices, (choice, index) => this.handleAnswer(choice, index));
            this._ui.updateHud(this._raid, this._roomLabel());
        }

        handleAnswer(choice, index) {
            const correct = choice === this._currentProblem.correct;
            this._ui.markAnswer(index, correct);
            this._progression.recordAnswer({
                factKey: this._currentProblem.factKey,
                correct,
                firstTry: this._firstTry
            });
            const resolved = MathMarauder.GameRules.resolveAnswer(this._encounter, { correct, firstTry: this._firstTry });
            this._encounter = resolved;
            this._raid.hearts = resolved.hearts;
            this._raid.shields = resolved.shields;
            this._raid.streak = resolved.streak;
            this._raid.promptsAnswered = resolved.promptsAnswered;
            this._raid.correctFirstTry = resolved.correctFirstTry;
            this._raid.longestStreak = resolved.longestStreak;
            this._syncScene(correct);
            if (correct) {
                this._audio.playCorrect();
                if (resolved.spellTriggered) {
                    this._ui.showSpell(this._spellLabel(resolved.spellTriggered));
                    this._narrateSpell(resolved.spellTriggered);
                }
                this._ui.announce(resolved.feedbackText || 'Correct. Spell hit.');
                if (resolved.spellTriggered === 'starbolt') this._audio.playHit();
                if (resolved.roomComplete || resolved.phaseComplete) {
                    setTimeout(() => this._finishMonsterStep(), 550);
                } else {
                    setTimeout(() => this.presentProblem(), 650);
                }
                return;
            }
            this._audio.playWrong();
            this._firstTry = false;
            const spellNarration = this._spellNarrationText(resolved.spellTriggered);
            if (resolved.spellTriggered) {
                this._ui.showSpell(this._spellLabel(resolved.spellTriggered));
            }
            if (resolved.recoveryMode === 'retreat') {
                this._ui.announce(resolved.feedbackText);
                this._speech.speak(this._joinSpeech(spellNarration, resolved.feedbackText));
                this._saveProgressOnly();
                setTimeout(() => this.startRoom(), 900);
                return;
            }
            const hint = resolved.hintText || 'Try again. The right rune is still here.';
            this._ui.announce(hint);
            this._speech.speak(this._joinSpeech(spellNarration, hint));
            setTimeout(() => {
                this._ui.setAnswers(this._currentProblem.choices, (retryChoice, retryIndex) => this.handleAnswer(retryChoice, retryIndex));
            }, 650);
        }

        finishRoom() {
            this._raid.roomIndex += 1;
            if (this._raid.roomIndex >= this._raid.rooms.length) {
                this.finishRaid();
                return;
            }
            this.startRoom();
        }

        finishRaid() {
            const result = this._progression.scoreRaid({
                total: this._raid.promptsAnswered,
                correctFirstTry: this._raid.correctFirstTry,
                hearts: this._raid.hearts,
                longestStreak: this._raid.longestStreak
            });
            this._progression.completeRaid(this._save, { mode: this._raid.mode, stars: result.stars, coins: result.coins });
            const progress = this._progression.toJSON();
            this._save.factMastery = progress.factMastery;
            this._save.weakFactQueue = progress.weakFactQueue;
            this._save.stats.promptsAnswered += this._raid.promptsAnswered;
            this._save.stats.correctFirstTry += this._raid.correctFirstTry;
            this._save.stats.longestStreak = Math.max(this._save.stats.longestStreak, this._raid.longestStreak);
            this._saveManager.save(this._save);
            this._audio.playVictory();
            this._speech.speak('Raid complete. Your best facts powered the final spell.');
            this._refreshUnlocks();
            const summary = document.getElementById('results-summary');
            if (summary) {
                summary.innerHTML = '';
                const p = document.createElement('p');
                p.textContent = `${result.stars} stars. ${result.coins} coins. ${this._raid.correctFirstTry} first-try answers. Longest streak ${this._raid.longestStreak}.`;
                summary.appendChild(p);
            }
            this._state = 'RESULTS';
            this._ui.showScreen('screen-results');
        }

        tick(timestamp) {
            this._lastTime = timestamp;
            if (this._state === 'RAID' && this._renderer) {
                this._scene.time = timestamp;
                this._scene.reducedMotion = !!this._save.settings.reducedMotion;
                this._renderer.draw(this._scene);
            }
        }

        _finishMonsterStep() {
            if (this._encounter && this._encounter.roomComplete) {
                this.finishRoom();
                return;
            }
            if (this._encounter && this._encounter.phaseComplete && this._phase < this._encounter.phaseCount) {
                this._encounter = MathMarauder.GameRules.advanceEncounterPhase(this._encounter);
                this._phase = this._encounter.phaseIndex;
                this._ui.showSpell(this._spellLabel(this._encounter.spellTriggered));
                this._narrateSpell(this._encounter.spellTriggered);
                this._ui.announce(`Boss phase ${this._phase}`);
                this.presentProblem();
                this._syncScene();
                return;
            }
            this.finishRoom();
        }

        _spellLabel(spellId) {
            return {
                'starbolt': 'Starbolt surge',
                'mirror-spark': 'Mirror Spark hint',
                'dragon-guard': 'Dragon Guard shield',
                'time-gem': 'Time Gem phase shift'
            }[spellId] || '';
        }

        _narrateSpell(spellId) {
            const line = this._spellNarrationText(spellId);
            if (line && this._speech) this._speech.speak(line);
        }

        _spellNarrationText(spellId) {
            return {
                'starbolt': 'Starbolt surge.',
                'mirror-spark': 'Mirror Spark hint.',
                'dragon-guard': 'Dragon Guard shield.',
                'time-gem': 'Time Gem phase shift.'
            }[spellId] || '';
        }

        _joinSpeech(first, second) {
            return [first, second].filter(Boolean).join(' ');
        }

        _syncScene(spellFlash) {
            if (!this._currentRoom || !this._encounter) return;
            this._scene = {
                biomeId: this._currentRoom.biomeId,
                monsterId: this._currentRoom.monsterId,
                monsterHp: this._encounter.monsterHp,
                monsterMaxHp: this._encounter.monsterMaxHp,
                hitFlash: spellFlash ? 1 : 0,
                spellFlash: spellFlash ? 1 : 0,
                reducedMotion: !!this._save.settings.reducedMotion,
                time: this._lastTime
            };
            this._ui.updateHud(this._raid, this._roomLabel());
        }

        _roomLabel() {
            const total = this._raid ? this._raid.rooms.length : 1;
            return `Room ${(this._raid.roomIndex || 0) + 1}/${total}`;
        }

        _saveSettingsFromControls() {
            this._save.settings.sfx = document.getElementById('setting-sfx').checked;
            this._save.settings.music = document.getElementById('setting-music').checked;
            this._save.settings.speech = document.getElementById('setting-speech').checked;
            this._save.settings.reducedMotion = document.getElementById('setting-reduced-motion').checked;
            this._audio.setMuted(!this._save.settings.sfx);
            this._audio.setMusicEnabled(this._save.settings.music, true);
            this._speech.setEnabled(this._save.settings.speech);
            this._ui.applySettings(this._save.settings);
            this._saveManager.save(this._save);
        }

        _applySettings() {
            this._audio.setMuted(!this._save.settings.sfx);
            this._audio.setMusicEnabled(this._save.settings.music, false);
            this._speech.setEnabled(this._save.settings.speech);
            this._ui.applySettings(this._save.settings);
            document.getElementById('setting-sfx').checked = !!this._save.settings.sfx;
            document.getElementById('setting-music').checked = !!this._save.settings.music;
            document.getElementById('setting-speech').checked = !!this._save.settings.speech;
            document.getElementById('setting-reduced-motion').checked = !!this._save.settings.reducedMotion;
        }

        _refreshUnlocks() {
            const modes = this._progression.getUnlockedModes(this._save);
            const forge = document.getElementById('btn-practice-forge');
            if (forge) forge.disabled = !modes.includes('practice-forge');
        }

        _saveProgressOnly() {
            const progress = this._progression.toJSON();
            this._save.factMastery = progress.factMastery;
            this._save.weakFactQueue = progress.weakFactQueue;
            this._saveManager.save(this._save);
        }

        _loop(timestamp) {
            this.tick(timestamp);
            this._rafId = requestAnimationFrame((time) => this._loop(time));
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.game = new MathMarauder.Game();
        window.game.init();
    });

    return Game;
});
