(function(global) {
  'use strict';

  class StoryViewer {
    constructor() {
      this._overlay = null;
      this._storyData = null;
      this._focusReturnTo = null;
      this._keyHandler = null;
      this._loadPromise = null;
      this._speakTimer = null;
    }

    open(triggerEl) {
      this._focusReturnTo = triggerEl || null;
      this._ensureOverlay();
      this._loadAndShow();
    }

    cancel() {
      this._stopSpeech();
      this._unbindKeys();
      if (this._overlay) {
        this._overlay.classList.remove('open');
        this._overlay.setAttribute('aria-hidden', 'true');
        if (this._focusReturnTo) this._focusReturnTo.focus();
        this._focusReturnTo = null;
      }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    _ensureOverlay() {
      if (this._overlay) return;
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.setAttribute('aria-hidden', 'true');
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Story chapters');
      document.getElementById('overlay-root').appendChild(ov);
      this._overlay = ov;
    }

    async _loadAndShow() {
      if (!this._storyData) {
        if (!this._loadPromise) {
          this._loadPromise = fetch('data/story.json')
            .then(function(r) { return r.json(); })
            .then((d) => { this._storyData = d; this._loadPromise = null; });
        }
        await this._loadPromise;
      }
      this._renderChapterList();
      this._overlay.classList.add('open');
      this._overlay.setAttribute('aria-hidden', 'false');
      const closeBtn = this._overlay.querySelector('.hub-overlay-close');
      if (closeBtn) closeBtn.focus();
      this._bindKeys();
    }

    _renderChapterList() {
      const data = SaveManager.load();
      const unlocked = data.storyChaptersUnlocked || [];
      const chapters = (this._storyData && this._storyData.chapters) || [];

      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close story viewer');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = 'Story';
      panel.appendChild(title);

      const list = document.createElement('div');
      list.className = 'story-chapter-list';
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Story chapters');

      if (chapters.length === 0 || unlocked.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'hub-overlay-subtitle';
        empty.textContent = 'Beat your first realm boss to start the story.';
        list.appendChild(empty);
      } else {
        chapters.forEach((chapter) => {
          const isUnlocked = unlocked.includes(chapter.id);
          list.appendChild(this._makeChapterBtn(chapter, isUnlocked));
        });

        // Show a locked placeholder for each remaining chapter (5 realms = 5 chapters total)
        const TOTAL_CHAPTERS = 5;
        const lockedCount = Math.max(0, TOTAL_CHAPTERS - chapters.length);
        for (let i = 0; i < lockedCount; i++) {
          const placeholder = this._makeLockedPlaceholder(chapters.length + i + 1);
          list.appendChild(placeholder);
        }
      }

      panel.appendChild(list);

      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _makeChapterBtn(chapter, isUnlocked) {
      const btn = document.createElement('button');
      btn.className = 'story-chapter-btn';
      btn.setAttribute('aria-label', (isUnlocked ? '' : 'Locked: ') + chapter.title);
      if (!isUnlocked) btn.disabled = true;

      const icon = document.createElement('span');
      icon.className = 'story-chapter-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = isUnlocked ? '📖' : '🔒';
      btn.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'story-chapter-info';

      const name = document.createElement('div');
      name.className = 'story-chapter-title';
      name.textContent = chapter.title;
      info.appendChild(name);

      if (!isUnlocked) {
        const hint = document.createElement('div');
        hint.className = 'story-chapter-hint';
        hint.textContent = 'Beat the realm boss to unlock';
        info.appendChild(hint);
      } else {
        const lineCount = document.createElement('div');
        lineCount.className = 'story-chapter-hint';
        lineCount.textContent = (chapter.lines || []).length + ' panels';
        info.appendChild(lineCount);
      }

      btn.appendChild(info);

      if (isUnlocked) {
        btn.addEventListener('click', () => this._openChapter(chapter));
      }

      return btn;
    }

    _makeLockedPlaceholder(n) {
      const btn = document.createElement('button');
      btn.className = 'story-chapter-btn';
      btn.setAttribute('aria-label', 'Locked: Chapter ' + n);
      btn.disabled = true;

      const icon = document.createElement('span');
      icon.className = 'story-chapter-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '🔒';
      btn.appendChild(icon);

      const info = document.createElement('div');
      info.className = 'story-chapter-info';

      const name = document.createElement('div');
      name.className = 'story-chapter-title';
      name.textContent = 'Chapter ' + n;
      info.appendChild(name);

      const hint = document.createElement('div');
      hint.className = 'story-chapter-hint';
      hint.textContent = 'Beat the previous realm boss to unlock';
      info.appendChild(hint);

      btn.appendChild(info);
      return btn;
    }

    _openChapter(chapter) {
      const lines = chapter.lines || [];
      const panel = document.createElement('div');
      panel.className = 'panel hub-overlay-panel';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'hub-overlay-close secondary';
      closeBtn.setAttribute('aria-label', 'Close story viewer');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.cancel());
      panel.appendChild(closeBtn);

      const title = document.createElement('h2');
      title.className = 'hub-overlay-title';
      title.textContent = chapter.title;
      panel.appendChild(title);

      const view = document.createElement('div');
      view.className = 'story-panel-view';

      lines.forEach((line, i) => {
        const row = document.createElement('div');
        row.className = 'story-panel-line';

        const text = document.createElement('span');
        text.className = 'story-panel-text';
        text.textContent = line;
        row.appendChild(text);

        const speakBtn = document.createElement('button');
        speakBtn.className = 'story-panel-speak secondary';
        speakBtn.setAttribute('aria-label', 'Read panel ' + (i + 1) + ' aloud');
        speakBtn.textContent = '🔊';
        speakBtn.addEventListener('click', () => this._speakLine(line, speakBtn));
        row.appendChild(speakBtn);

        view.appendChild(row);
      });

      const backBtn = document.createElement('button');
      backBtn.className = 'secondary story-back-btn';
      backBtn.setAttribute('aria-label', 'Back to chapter list');
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', () => {
        this._stopSpeech();
        this._renderChapterList();
        const closeB = this._overlay.querySelector('.hub-overlay-close');
        if (closeB) closeB.focus();
      });
      view.appendChild(backBtn);

      panel.appendChild(view);
      this._overlay.innerHTML = '';
      this._overlay.appendChild(panel);
    }

    _speakLine(text, btn) {
      if (!('speechSynthesis' in window)) return;
      this._stopSpeech();
      btn.classList.add('speaking');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => { btn.classList.remove('speaking'); };
      utterance.onerror = () => { btn.classList.remove('speaking'); };
      speechSynthesis.cancel();
      this._speakTimer = setTimeout(() => {
        this._speakTimer = null;
        speechSynthesis.speak(utterance);
      }, 50);
    }

    _stopSpeech() {
      if (this._speakTimer) {
        clearTimeout(this._speakTimer);
        this._speakTimer = null;
      }
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }

    _bindKeys() {
      this._keyHandler = (e) => {
        if (e.key === 'Escape') {
          if (this._overlay && this._overlay.classList.contains('open')) this.cancel();
          return;
        }
        if (e.key === 'Tab') this._trapFocus(e);
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    _unbindKeys() {
      if (this._keyHandler) {
        document.removeEventListener('keydown', this._keyHandler);
        this._keyHandler = null;
      }
    }

    _trapFocus(e) {
      if (!this._overlay) return;
      const focusable = Array.from(
        this._overlay.querySelectorAll('button:not([disabled]), [tabindex="0"]')
      ).filter(function(el) { return el.offsetParent !== null; });
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  global.StoryViewer = StoryViewer;
})(typeof window !== 'undefined' ? window : globalThis);
