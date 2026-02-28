/**
 * DialogueSystem - Unified dialogue engine for Catacombs & Creeds
 *
 * Session 4: Full dialogue system with typewriter effect, branching choices,
 * quest flags, TTS, and dyslexia-friendly canvas rendering.
 *
 * Dialogue node format:
 *   { speaker, portrait, text, choices, setFlag, nextDialogue }
 *
 * Auto-splits text over CONFIG.MAX_WORDS_PER_BOX (15) words at sentence
 * boundaries, or at word boundaries if a single sentence exceeds the limit.
 */
class DialogueSystem {
    constructor() {
        // Registered dialogue data: dialogueId -> array of nodes
        this.dialogues = {};

        // Current state
        this.active = false;
        this.nodes = [];         // Pre-processed array of nodes for current dialogue
        this.nodeIndex = 0;      // Current node index
        this.onComplete = null;  // Callback when dialogue ends

        // Typewriter state
        this.revealedChars = 0;
        this.typewriterTimer = 0;
        this.typewriterComplete = false;

        // Blink timer for continue indicator
        this.blinkTimer = 0;

        // Choice state
        this.selectedChoice = 0;
        this._activeChoices = null;  // Shuffled copy of node.choices for display

        // Quest flags (persisted via Game save/load)
        this.questFlags = {};

        // TTS state
        this.ttsEnabled = false;
        this.ttsUtterance = null;

        // Audio reference (set by Game)
        this.audio = null;

        // Portrait colors for character placeholders
        this.portraitColors = {
            priscilla: '#a06090',
            peter: '#c4a44a',
            peter_apostle: '#a07030',
            james: '#5070a0',
            john: '#508050',
            guard: '#8b4444',
            centurion: '#aa3333',
            narrator: '#666688',
            default: '#888888'
        };

        // Layout constants
        this.BOX_HEIGHT = 160;
        this.BOX_MARGIN_X = 24;
        this.BOX_MARGIN_BOTTOM = 16;
        this.BOX_PADDING = 16;
        this.PORTRAIT_SIZE = 64;
        this.PORTRAIT_MARGIN = 12;
        this.BORDER_WIDTH = 3;
    }

    // ── Registration ──────────────────────────────────────────────────

    /**
     * Register a map of dialogueId -> node arrays.
     * @param {Object} dialogueData - { dialogueId: [ { speaker, portrait, text, ... }, ... ], ... }
     */
    registerDialogues(dialogueData) {
        for (const id of Object.keys(dialogueData)) {
            this.dialogues[id] = dialogueData[id];
        }
        console.log(`Registered ${Object.keys(dialogueData).length} dialogue(s)`);
    }

    // ── Start / Stop ──────────────────────────────────────────────────

    /**
     * Start a dialogue sequence by ID.
     * @param {string} dialogueId
     * @param {Function} [onComplete] - called when the sequence finishes
     */
    startDialogue(dialogueId, onComplete) {
        const rawNodes = this.dialogues[dialogueId];
        if (!rawNodes) {
            console.warn(`Dialogue not found: "${dialogueId}"`);
            if (onComplete) onComplete();
            return;
        }

        // Pre-process: auto-split long text into multiple nodes
        this.nodes = this._preprocessNodes(rawNodes);
        this.nodeIndex = 0;
        this.onComplete = onComplete || null;
        this.active = true;

        this._beginNode();
        console.log(`Dialogue started: "${dialogueId}" (${this.nodes.length} nodes)`);
    }

    /**
     * End the current dialogue immediately.
     */
    endDialogue() {
        this._cancelTTS();
        this.active = false;
        this.nodes = [];
        this.nodeIndex = 0;
        this._activeChoices = null;

        if (this.onComplete) {
            const cb = this.onComplete;
            this.onComplete = null;
            cb();
        }
    }

    /**
     * Returns true if a dialogue is currently active.
     */
    isActive() {
        return this.active;
    }

    // ── Quest Flags ───────────────────────────────────────────────────

    getFlag(name) {
        return this.questFlags[name] === true;
    }

    setFlag(name) {
        this.questFlags[name] = true;
        console.log(`Quest flag set: ${name}`);
    }

    // ── Update (call once per frame) ──────────────────────────────────

    /**
     * Process input for the active dialogue.
     * @param {InputHandler} input
     */
    update(input) {
        if (!this.active || this.nodes.length === 0) return;

        const node = this.nodes[this.nodeIndex];

        // Advance blink timer
        this.blinkTimer += 1 / 60;

        // Toggle TTS with T
        if (input.wasPressed('t') || input.wasPressed('T')) {
            this._toggleTTS();
        }

        // Escape ends dialogue immediately
        if (input.wasPressed('Escape')) {
            this.endDialogue();
            return;
        }

        // Typewriter still revealing text
        if (!this.typewriterComplete) {
            // Advance typewriter
            this.typewriterTimer += 1000 / 60; // ms per frame at 60fps
            while (this.typewriterTimer >= CONFIG.TYPEWRITER_SPEED && !this.typewriterComplete) {
                this.typewriterTimer -= CONFIG.TYPEWRITER_SPEED;
                this.revealedChars++;
                if (this.revealedChars >= node.text.length) {
                    this.typewriterComplete = true;
                    this.blinkTimer = 0;
                }
            }

            // SPACE skips typewriter to show full text
            if (input.wasPressed(' ') || input.wasPressed('Enter')) {
                this.revealedChars = node.text.length;
                this.typewriterComplete = true;
                this.blinkTimer = 0;
            }
            return;
        }

        // Text is fully revealed — handle choices or advance
        if (this._activeChoices && this._activeChoices.length > 0) {
            this._updateChoices(input, node);
        } else {
            // SPACE or Enter advances to next node
            if (input.wasPressed(' ') || input.wasPressed('Enter')) {
                this._advanceNode();
            }
        }
    }

    // ── Render (call once per frame) ──────────────────────────────────

    /**
     * Draw the dialogue box on top of the game world.
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLCanvasElement} canvas
     */
    render(ctx, canvas) {
        if (!this.active || this.nodes.length === 0) return;

        const node = this.nodes[this.nodeIndex];
        const a = CONFIG.ACCESSIBILITY;

        // Box dimensions
        const boxX = this.BOX_MARGIN_X;
        const boxW = canvas.width - this.BOX_MARGIN_X * 2;
        const boxH = this.BOX_HEIGHT;
        const boxY = canvas.height - boxH - this.BOX_MARGIN_BOTTOM;

        // If we have choices and text is complete, make the box taller
        let choiceAreaHeight = 0;
        if (this._activeChoices && this._activeChoices.length > 0 && this.typewriterComplete) {
            choiceAreaHeight = this._activeChoices.length * 32 + 16;
        }
        const totalBoxH = boxH + choiceAreaHeight;
        const totalBoxY = canvas.height - totalBoxH - this.BOX_MARGIN_BOTTOM;

        // Semi-transparent overlay behind box for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, totalBoxY - 10, canvas.width, canvas.height - totalBoxY + 10);

        // Box background
        ctx.fillStyle = a.bgColor;
        ctx.fillRect(boxX, totalBoxY, boxW, totalBoxH);

        // Box border
        ctx.strokeStyle = CONFIG.COLORS.uiBorder;
        ctx.lineWidth = this.BORDER_WIDTH;
        ctx.strokeRect(boxX, totalBoxY, boxW, totalBoxH);

        // Portrait
        const portraitX = boxX + this.BOX_PADDING;
        const portraitY = totalBoxY + this.BOX_PADDING;
        this._drawPortrait(ctx, node, portraitX, portraitY);

        // Text area starts after portrait
        const textX = portraitX + this.PORTRAIT_SIZE + this.PORTRAIT_MARGIN;
        const textMaxW = boxX + boxW - this.BOX_PADDING - textX;

        // Speaker name
        const nameY = totalBoxY + this.BOX_PADDING + 4;
        ctx.fillStyle = a.textColor;
        ctx.font = `bold 18px ${a.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(node.speaker || 'Unknown', textX, nameY);

        // Dialogue text (word-wrapped, typewriter)
        const textY = nameY + 26;
        const displayText = node.text.substring(0, this.revealedChars);
        this._drawWrappedText(ctx, displayText, textX, textY, textMaxW, a);

        // Continue indicator (blinking down arrow) when typewriter is complete and no choices
        if (this.typewriterComplete && (!this._activeChoices || this._activeChoices.length === 0)) {
            const blinkVisible = Math.sin(this.blinkTimer * 4) > 0;
            if (blinkVisible) {
                ctx.fillStyle = a.textColor;
                ctx.font = `20px ${a.fontFamily}`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText('\u25BC', boxX + boxW - this.BOX_PADDING, totalBoxY + totalBoxH - this.BOX_PADDING);
            }
        }

        // Choices
        if (this._activeChoices && this._activeChoices.length > 0 && this.typewriterComplete) {
            this._drawChoices(ctx, this._activeChoices, boxX, totalBoxY + boxH, boxW, a);
        }

        // TTS indicator
        if (this.ttsEnabled) {
            ctx.fillStyle = CONFIG.COLORS.info;
            ctx.font = `bold 12px ${a.fontFamily}`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText('TTS ON (T)', boxX + boxW - this.BOX_PADDING, totalBoxY + 6);
        }

        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // ── Internal helpers ──────────────────────────────────────────────

    /**
     * Pre-process raw dialogue nodes: auto-split long text.
     * Returns a new array of nodes.
     */
    _preprocessNodes(rawNodes) {
        const processed = [];
        const maxWords = CONFIG.MAX_WORDS_PER_BOX;

        for (const node of rawNodes) {
            const words = node.text.trim().split(/\s+/);

            if (words.length <= maxWords) {
                // Fits in one box — keep as-is
                processed.push({ ...node });
            } else {
                // Split at sentence boundaries first
                const sentences = this._splitIntoSentences(node.text);
                const chunks = [];
                let currentChunk = '';

                for (const sentence of sentences) {
                    const testChunk = currentChunk
                        ? currentChunk + ' ' + sentence
                        : sentence;
                    const testWords = testChunk.trim().split(/\s+/);

                    if (testWords.length <= maxWords) {
                        currentChunk = testChunk;
                    } else {
                        // Flush current chunk if it has content
                        if (currentChunk.trim()) {
                            chunks.push(currentChunk.trim());
                        }
                        // Check if the sentence itself exceeds max words
                        const sentenceWords = sentence.trim().split(/\s+/);
                        if (sentenceWords.length <= maxWords) {
                            currentChunk = sentence;
                        } else {
                            // Split the long sentence at word boundaries
                            const wordChunks = this._splitLongSentence(sentence, maxWords);
                            for (let i = 0; i < wordChunks.length - 1; i++) {
                                chunks.push(wordChunks[i]);
                            }
                            currentChunk = wordChunks[wordChunks.length - 1];
                        }
                    }
                }
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }

                // Create nodes from chunks. Only the last chunk carries choices/setFlag/nextDialogue.
                for (let i = 0; i < chunks.length; i++) {
                    const isLast = i === chunks.length - 1;
                    processed.push({
                        speaker: node.speaker,
                        portrait: node.portrait,
                        text: chunks[i],
                        choices: isLast ? (node.choices || null) : null,
                        setFlag: isLast ? (node.setFlag || null) : null,
                        nextDialogue: isLast ? (node.nextDialogue || null) : null
                    });
                }
            }
        }

        return processed;
    }

    /**
     * Split text into sentences. Keeps the punctuation with the sentence.
     */
    _splitIntoSentences(text) {
        // Split on sentence-ending punctuation, keeping the punctuation
        const parts = text.match(/[^.!?]+[.!?]+\s*/g);
        if (!parts) {
            // No sentence boundaries found — return the whole text
            return [text.trim()];
        }

        // Check if there's leftover text after the last punctuation
        const joined = parts.join('');
        if (joined.trim().length < text.trim().length) {
            const leftover = text.substring(joined.length).trim();
            if (leftover) {
                parts.push(leftover);
            }
        }

        return parts.map(s => s.trim()).filter(s => s.length > 0);
    }

    /**
     * Split a long sentence at word boundaries to fit maxWords per chunk.
     */
    _splitLongSentence(sentence, maxWords) {
        const words = sentence.trim().split(/\s+/);
        const chunks = [];
        for (let i = 0; i < words.length; i += maxWords) {
            chunks.push(words.slice(i, i + maxWords).join(' '));
        }
        return chunks;
    }

    /**
     * Begin displaying a node: reset typewriter, set flag, speak.
     */
    _beginNode() {
        const node = this.nodes[this.nodeIndex];
        this.revealedChars = 0;
        this.typewriterTimer = 0;
        this.typewriterComplete = false;
        this.selectedChoice = 0;
        this.blinkTimer = 0;

        // Set quest flag if specified
        if (node.setFlag) {
            this.setFlag(node.setFlag);
        }

        // Shuffle choices if they exist (Fisher-Yates shuffle on a copy)
        if (node.choices && node.choices.length > 1) {
            const shuffled = [...node.choices];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            this._activeChoices = shuffled;
        } else {
            this._activeChoices = node.choices || [];
        }

        // TTS
        if (this.ttsEnabled) {
            this._speakText(node.text);
        }
    }

    /**
     * Advance to the next node, or end the dialogue.
     */
    _advanceNode() {
        this._cancelTTS();
        if (this.audio) this.audio.playSFX('dialogue');
        const currentNode = this.nodes[this.nodeIndex];

        // Check for nextDialogue jump on the current node
        if (currentNode.nextDialogue) {
            const nextId = currentNode.nextDialogue;
            const cb = this.onComplete;
            this.active = false;
            this.nodes = [];
            this.nodeIndex = 0;
            this.onComplete = null;
            this.startDialogue(nextId, cb);
            return;
        }

        this.nodeIndex++;
        if (this.nodeIndex >= this.nodes.length) {
            // Dialogue complete
            this.endDialogue();
        } else {
            this._beginNode();
        }
    }

    /**
     * Handle choice navigation and selection.
     */
    _updateChoices(input, node) {
        const numChoices = this._activeChoices.length;

        // UP/DOWN navigation
        if (input.wasPressed('ArrowUp') || input.wasPressed('w') || input.wasPressed('W')) {
            this.selectedChoice = (this.selectedChoice - 1 + numChoices) % numChoices;
        }
        if (input.wasPressed('ArrowDown') || input.wasPressed('s') || input.wasPressed('S')) {
            this.selectedChoice = (this.selectedChoice + 1) % numChoices;
        }

        // Number keys for quick select (1-4)
        for (let i = 0; i < Math.min(numChoices, 4); i++) {
            if (input.wasPressed(String(i + 1))) {
                this.selectedChoice = i;
                this._selectChoice(node);
                return;
            }
        }

        // SPACE or Enter selects current choice
        if (input.wasPressed(' ') || input.wasPressed('Enter')) {
            this._selectChoice(node);
        }
    }

    /**
     * Execute the selected choice.
     */
    _selectChoice(node) {
        const choice = this._activeChoices[this.selectedChoice];
        if (!choice) return;

        if (this.audio) this.audio.playSFX('menu_select');
        console.log(`Choice selected: "${choice.text}"`);

        // Set flag from choice
        if (choice.setFlag) {
            this.setFlag(choice.setFlag);
        }

        // Jump to another dialogue sequence
        if (choice.nextDialogue) {
            this._cancelTTS();
            const cb = this.onComplete;
            this.active = false;
            this.nodes = [];
            this.nodeIndex = 0;
            this.onComplete = null;
            this.startDialogue(choice.nextDialogue, cb);
            return;
        }

        // Otherwise advance to next node
        this._advanceNode();
    }

    // ── Drawing helpers ───────────────────────────────────────────────

    /**
     * Draw a character portrait using pixel-art from portraits.js.
     * Falls back to colored circle with initial if portraits.js is unavailable.
     */
    _drawPortrait(ctx, node, x, y) {
        const size = this.PORTRAIT_SIZE;
        const portraitId = node.portrait || 'default';

        if (typeof drawPortrait === 'function') {
            drawPortrait(ctx, portraitId, x, y, size);
        } else {
            // Fallback: colored circle with initial
            const color = this.portraitColors[portraitId] || this.portraitColors.default;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = CONFIG.COLORS.uiBorder;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.stroke();
            const initial = (node.speaker || '?')[0].toUpperCase();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold 28px ${CONFIG.ACCESSIBILITY.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initial, x + size / 2, y + size / 2);
        }

        // Reset alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
    }

    /**
     * Draw word-wrapped text on canvas.
     */
    _drawWrappedText(ctx, text, x, y, maxWidth, accessibility) {
        ctx.fillStyle = accessibility.textColor;
        ctx.font = `${accessibility.fontSize}px ${accessibility.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const lineHeight = accessibility.fontSize * accessibility.lineHeight;
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
            const testLine = line ? line + ' ' + words[i] : words[i];
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && line) {
                ctx.fillText(line, x, currentY);
                line = words[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (line) {
            ctx.fillText(line, x, currentY);
        }
    }

    /**
     * Draw selectable choices below the text area.
     */
    _drawChoices(ctx, choices, boxX, choiceY, boxW, accessibility) {
        const startY = choiceY + 8;
        const lineHeight = 32;
        const textX = boxX + this.BOX_PADDING + this.PORTRAIT_SIZE + this.PORTRAIT_MARGIN;

        for (let i = 0; i < choices.length; i++) {
            const y = startY + i * lineHeight;
            const isSelected = i === this.selectedChoice;

            // Highlight bar for selected choice
            if (isSelected) {
                ctx.fillStyle = 'rgba(139, 69, 19, 0.15)';
                ctx.fillRect(textX - 8, y - 4, boxW - this.BOX_PADDING * 2 - this.PORTRAIT_SIZE - this.PORTRAIT_MARGIN, lineHeight);
            }

            // Choice text
            ctx.fillStyle = isSelected ? CONFIG.COLORS.info : accessibility.textColor;
            ctx.font = `${isSelected ? 'bold ' : ''}${accessibility.fontSize}px ${accessibility.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const prefix = `${i + 1}. `;
            const arrow = isSelected ? '\u25B6 ' : '  ';
            ctx.fillText(arrow + prefix + choices[i].text, textX, y);
        }
    }

    // ── TTS ───────────────────────────────────────────────────────────

    _toggleTTS() {
        this.ttsEnabled = !this.ttsEnabled;
        console.log(`TTS ${this.ttsEnabled ? 'enabled' : 'disabled'}`);

        if (this.ttsEnabled && this.active && this.nodes.length > 0) {
            // Speak the current node text
            this._speakText(this.nodes[this.nodeIndex].text);
        } else {
            this._cancelTTS();
        }
    }

    _speakText(text) {
        this._cancelTTS();

        if (!window.speechSynthesis) return;

        this.ttsUtterance = new SpeechSynthesisUtterance(text);
        this.ttsUtterance.rate = 0.9;
        this.ttsUtterance.pitch = 1.0;
        window.speechSynthesis.speak(this.ttsUtterance);
    }

    _cancelTTS() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.ttsUtterance = null;
    }
}

// Expose globally
window.DialogueSystem = DialogueSystem;
