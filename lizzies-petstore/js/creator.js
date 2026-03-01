/**
 * creator.js — Creator studio: palette, placement, styling tools.
 * Manages the creature creation workspace.
 *
 * Two placement modes:
 *   - Tap-to-place (primary): tap part → auto-snap to attachment point
 *   - Drag-to-place (advanced): long-press 300ms → drag → snap to nearest valid point
 *
 * Style panel: slides up when a placed part is selected, shows color/texture/transform/eyes tabs.
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

// ── Color Palettes ────────────────────────────────────
const COLOR_PALETTES = {
    Rainbow: ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#5F27CD', '#FF69B4', '#1DD1A1'],
    Pastel:  ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF', '#FFB3E6', '#C9BAFF'],
    Earth:   ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2B48C', '#BC8F8F', '#F4A460', '#DAA520'],
    Ocean:   ['#006994', '#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#023E8A', '#0096C7', '#CAF0F8'],
    Galaxy:  ['#2D1B69', '#5B2C6F', '#7D3C98', '#A569BD', '#D2B4DE', '#1A1A2E', '#E94560', '#533483'],
    Candy:   ['#FF69B4', '#FF1493', '#FF6EB4', '#FFB6C1', '#FF85A2', '#C71585', '#DB7093', '#FFD1DC']
};

const EYE_COLORS = [
    { hex: '#4A90D9', name: 'Blue' },
    { hex: '#2ECC71', name: 'Green' },
    { hex: '#8B4513', name: 'Brown' },
    { hex: '#9B59B6', name: 'Purple' },
    { hex: '#E67E22', name: 'Amber' },
    { hex: '#1ABC9C', name: 'Teal' },
    { hex: '#34495E', name: 'Dark grey' },
    { hex: '#E74C3C', name: 'Ruby' }
];

const COVERING_TYPES = [
    { id: 'fur',      label: 'Fur',      icon: '≈' },
    { id: 'scales',   label: 'Scales',   icon: '◇' },
    { id: 'feathers', label: 'Feathers', icon: '~' },
    { id: 'smooth',   label: 'Smooth',   icon: '○' }
];

const PATTERN_TYPES = [
    { id: 'solid',    label: 'Solid',    icon: '■' },
    { id: 'spots',    label: 'Spots',    icon: '●' },
    { id: 'stripes',  label: 'Stripes',  icon: '≡' },
    { id: 'gradient', label: 'Gradient', icon: '▽' }
];

class Creator {
    constructor() {
        this._creature = null;       // Creature being built
        this._selectedPart = null;   // Currently selected placed part (slot name)
        this._activeCategory = 'head';
        this._undoStack = [];
        this._redoStack = [];
        this._maxUndoSteps = 20;
        this._isDirty = false;       // Unsaved changes flag

        // Thumbnail cache: partId -> offscreen 72x72 canvas
        this._thumbnailCache = new Map();

        // Drag state
        this._dragPart = null;       // Part meta being dragged
        this._dragPos = null;        // { x, y } in CSS pixels
        this._isDragging = false;
        this._dragCloneEl = null;    // DOM clone for drag visual

        // Pop-in animation per slot: { progress: 0..1 }
        this._popAnimations = {};

        // Poof animation for delete: { x, y, progress: 0..1 }
        this._poofAnimation = null;

        // Selection pulse accumulator (ms)
        this._selectionPulse = 0;

        // Layout computed on canvas setup
        this._displaySize = 0;
        this._creatureCenter = { x: 0, y: 0 };

        // Hit boxes in CSS pixels for placed parts
        this._partHitBoxes = {};

        // Trash icon hit area
        this._trashBox = null;

        // Screen positions for all attachment points (including empty ones)
        this._attachmentScreenPos = {};

        // Long-press timer for drag-from-thumbnail
        this._thumbLongPress = null;

        // Canvas input bound flag
        this._canvasBound = false;

        // ── Style panel state ──
        this._recentColors = [];         // max 8, most recent first
        this._partRotations = new Map(); // slot → degrees
        this._partFlips = new Map();     // slot → boolean
        this._stylePanelBuilt = false;
        this._coveringThumbsDirty = false;
        this._activeStyleTab = 'color';
        this._activePalette = 'Rainbow';
        this._sizeSliderOldValue = 1;    // for undo on change

        // Style panel DOM element refs (populated in _buildStylePanel)
        this._stylePanelEls = {};
    }

    /**
     * Start creating a new creature (or editing an existing one).
     * @param {object|null} existingCreature — null for new, creature data for edit
     */
    startCreating(existingCreature) {
        this.cancel(); // defensive reset on re-entry
        this._creature = existingCreature || this._newCreatureTemplate();
        this._selectedPart = null;
        this._undoStack = [];
        this._redoStack = [];
        this._isDirty = false;
        this._popAnimations = {};
        this._poofAnimation = null;
        this._selectionPulse = 0;
        this._dragPart = null;
        this._dragPos = null;
        this._isDragging = false;
        this._recentColors = [];
        this._partRotations = new Map();
        this._partFlips = new Map();
        this._coveringThumbsDirty = false;
        this._activeStyleTab = 'color';
        this._activePalette = 'Rainbow';
        this._sizeSliderOldValue = 1;

        // Build thumbnail cache (one-time per session)
        this._buildThumbnailCache();

        // Build style panel DOM (once)
        this._buildStylePanel();

        // Populate part strip with current category
        this._populateStrip(this._activeCategory);

        // Bind tab events
        this._bindTabEvents();

        // Bind canvas input
        this._bindCanvasInput();

        // If editing existing creature, build its cache
        if (existingCreature && this._displaySize > 0) {
            window.creatureCache.buildCache(
                existingCreature.id, existingCreature, this._displaySize
            );
        }

        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    /**
     * Cancel and clean up all creator state.
     */
    cancel() {
        clearTimeout(this._thumbLongPress);
        this._thumbLongPress = null;
        this._selectedPart = null;
        this._dragPart = null;
        this._dragPos = null;
        this._isDragging = false;
        this._popAnimations = {};
        this._poofAnimation = null;
        this._recentColors = [];
        this._partRotations = new Map();
        this._partFlips = new Map();

        // Remove drag clone if present
        if (this._dragCloneEl) {
            this._dragCloneEl.remove();
            this._dragCloneEl = null;
        }

        // Clear the part strip DOM
        const strip = document.getElementById('part-strip');
        if (strip) strip.innerHTML = '';

        // Hide style panel
        this._hideStylePanel();

        // Reset canvas binding so it re-binds on next session
        this._canvasBound = false;

        // Don't clear thumbnail cache — reusable across sessions
        // Don't clear style panel DOM — rebuilt only once
    }

    /**
     * Create a blank creature template.
     */
    _newCreatureTemplate() {
        return {
            id: typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : this._uuidFallback(),
            name: '',
            createdAt: Date.now(),
            growthStage: 'baby',
            totalCareActions: 0,
            personality: 'playful',
            body: {
                torso: null,
                head: null,
                eyes: null,
                legs: [],
                tail: null,
                wings: null,
                extras: []
            },
            accessories: [],
            room: {
                wallColor: '#FFE4E1',
                items: []
            },
            needs: { hunger: 80, cleanliness: 90, energy: 70, happiness: 85 },
            lastActiveAt: Date.now(),
            favorites: {}
        };
    }

    /**
     * UUID v4 fallback for environments without crypto.randomUUID.
     */
    _uuidFallback() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Check if creature has minimum parts (torso + head) for "Done" button.
     */
    canFinish() {
        return this._creature &&
               this._creature.body.torso !== null &&
               this._creature.body.head !== null;
    }

    /**
     * Get the current creature data.
     */
    getCreature() {
        return this._creature;
    }

    /**
     * Whether there are unsaved changes.
     */
    isDirty() {
        return this._isDirty;
    }

    // ══════════════════════════════════════════════════════════
    // ── Thumbnail Cache ──────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Build offscreen 72x72 canvas thumbnails for all parts.
     * Skips parts already cached.
     */
    _buildThumbnailCache() {
        if (!window.partsLib._partData) return;

        const dpr = window.devicePixelRatio || 1;
        const thumbSize = 72;

        for (const part of window.partsLib._partData) {
            if (this._thumbnailCache.has(part.id)) continue;

            const canvas = document.createElement('canvas');
            canvas.width = thumbSize * dpr;
            canvas.height = thumbSize * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            // Draw part centered at 80% scale
            const drawW = part.drawSize.w;
            const drawH = part.drawSize.h;
            const scale = Math.min(
                (thumbSize * 0.8) / drawW,
                (thumbSize * 0.8) / drawH
            );
            const scaledW = drawW * scale;
            const scaledH = drawH * scale;

            ctx.save();
            ctx.translate(
                (thumbSize - scaledW) / 2,
                (thumbSize - scaledH) / 2
            );
            ctx.scale(scale, scale);

            window.partsLib.drawPart(
                ctx, part.id, drawW, drawH,
                part.defaultColor, null, null, null
            );

            ctx.restore();

            this._thumbnailCache.set(part.id, canvas);
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Part Strip ───────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Populate the part strip with thumbnail buttons for a category.
     */
    _populateStrip(category) {
        const strip = document.getElementById('part-strip');
        if (!strip) return;

        strip.innerHTML = '';
        this._activeCategory = category;

        const parts = window.partsLib.getByCategory(category);
        const saveData = window.saveManager.load();
        const unlockedParts = saveData.unlockedParts || [];

        for (const part of parts) {
            const isLocked = part.unlockCondition !== null &&
                             !unlockedParts.includes(part.unlockCondition);

            const btn = document.createElement('button');
            btn.className = 'part-thumb';
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', isLocked ? `${part.name} (locked)` : part.name);
            btn.setAttribute('aria-selected', 'false');

            if (isLocked) {
                btn.disabled = true;
            }

            // Insert thumbnail canvas
            const thumbCanvas = this._thumbnailCache.get(part.id);
            if (thumbCanvas) {
                const wrap = document.createElement('div');
                wrap.className = 'part-thumb-wrap';

                const clone = thumbCanvas.cloneNode(false);
                const cloneCtx = clone.getContext('2d');
                cloneCtx.drawImage(thumbCanvas, 0, 0);
                clone.style.width = '60px';
                clone.style.height = '60px';
                wrap.appendChild(clone);

                if (isLocked) {
                    const lockIcon = document.createElement('span');
                    lockIcon.className = 'part-lock-icon';
                    lockIcon.textContent = '🔒';
                    lockIcon.setAttribute('aria-hidden', 'true');
                    wrap.appendChild(lockIcon);
                }

                btn.appendChild(wrap);
            }

            // Tap handler
            if (!isLocked) {
                btn.addEventListener('click', () => {
                    this._onPartThumbnailTap(part);
                });

                // Long-press for drag-to-place
                btn.addEventListener('pointerdown', (e) => {
                    if (e.button !== 0) return;
                    clearTimeout(this._thumbLongPress);
                    this._thumbLongPress = setTimeout(() => {
                        this._startDragFromThumb(part, e);
                    }, 300);
                });
                btn.addEventListener('pointerup', () => {
                    clearTimeout(this._thumbLongPress);
                    this._thumbLongPress = null;
                });
                btn.addEventListener('pointercancel', () => {
                    clearTimeout(this._thumbLongPress);
                    this._thumbLongPress = null;
                });
                btn.addEventListener('pointermove', (e) => {
                    // If dragging started, update drag clone position
                    if (this._isDragging && this._dragCloneEl) {
                        this._dragCloneEl.style.left = `${e.clientX - 36}px`;
                        this._dragCloneEl.style.top = `${e.clientY - 36}px`;

                        // Track canvas-relative position for attachment glow
                        const canvas = document.getElementById('creator-canvas');
                        if (canvas) {
                            const rect = canvas.getBoundingClientRect();
                            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                this._dragPos = {
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top
                                };
                            } else {
                                this._dragPos = null;
                            }
                        }
                    }
                });
            }

            strip.appendChild(btn);
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Tab Events ───────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Bind click handlers to category tabs.
     */
    _bindTabEvents() {
        const tabs = document.querySelectorAll('#creator-tabs .tab');
        for (const tab of tabs) {
            // Remove old listeners by cloning (idempotent re-bind)
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);

            newTab.addEventListener('click', () => {
                const category = newTab.getAttribute('data-category');

                // Tutorial restriction check
                if (!window.tutorialManager.isCategoryAllowed(category)) return;

                // Update selected state
                const allTabs = document.querySelectorAll('#creator-tabs .tab');
                for (const t of allTabs) {
                    t.setAttribute('aria-selected', 'false');
                }
                newTab.setAttribute('aria-selected', 'true');

                this._populateStrip(category);
            });
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Canvas Input ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Bind pointer events on the creator canvas.
     */
    _bindCanvasInput() {
        if (this._canvasBound) return;
        this._canvasBound = true;

        window.uiManager.bindCanvas('creator-canvas', {
            onTap: (pos) => this._onCanvasTap(pos),
            onDragMove: (pos) => this._onCanvasDragMove(pos),
            onDragEnd: (pos) => this._onCanvasDragEnd(pos)
        });
    }

    /**
     * Handle a tap on the creator canvas.
     * DPR correction: canvasCoords returns DPR-scaled pixels, we work in CSS pixels.
     */
    _onCanvasTap(pos) {
        const dpr = window.devicePixelRatio || 1;
        const cssPos = { x: pos.x / dpr, y: pos.y / dpr };

        // Check trash icon first
        if (this._selectedPart && this._trashBox) {
            if (window.uiManager.hitTest(cssPos, this._trashBox)) {
                this._deleteSelectedPart();
                return;
            }
        }

        // Check part hit boxes in reverse RENDER_ORDER (front parts have priority)
        const reverseOrder = [...RENDER_ORDER].reverse();
        for (const slot of reverseOrder) {
            const box = this._partHitBoxes[slot];
            if (!box) continue;
            if (window.uiManager.hitTest(cssPos, box)) {
                this._selectedPart = slot;
                this._selectionPulse = 0;
                this._showStylePanel(slot);
                return;
            }
        }

        // Miss — deselect
        this._selectedPart = null;
        this._hideStylePanel();
    }

    _onCanvasDragMove(pos) {
        // Used when dragging from thumbnail over canvas
        if (this._isDragging) {
            const dpr = window.devicePixelRatio || 1;
            this._dragPos = { x: pos.x / dpr, y: pos.y / dpr };
        }
    }

    _onCanvasDragEnd(pos) {
        if (this._isDragging && this._dragPart) {
            const dpr = window.devicePixelRatio || 1;
            const cssPos = { x: pos.x / dpr, y: pos.y / dpr };
            this._endDragPlace(cssPos);
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Tap-to-Place ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Handle a tap on a part thumbnail in the strip.
     * Places the part at its attachment slot.
     */
    _onPartThumbnailTap(partMeta) {
        if (!this._creature) return;

        const slot = partMeta.attachSlot;
        const oldValue = this._getSlotValue(slot);

        // Build new part data
        const newValue = {
            type: partMeta.id.split('-').slice(1).join('-'),
            color: partMeta.defaultColor,
            covering: null,
            pattern: null,
            patternColor: null,
            scale: 1
        };

        // For array slots (legs, extras), wrap in array
        if (slot === 'legs' || slot === 'extras') {
            this._setSlotValue(slot, [newValue]);
        } else {
            this._setSlotValue(slot, newValue);
        }

        // Push undo command
        this._pushCommand({
            type: 'place',
            slot: slot,
            oldValue: oldValue,
            newValue: this._getSlotValue(slot)
        });

        // Invalidate cache
        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, slot, this._creature
            );
        } else if (this._hasAnyPart()) {
            window.creatureCache.buildCache(
                this._creature.id, this._creature, this._displaySize
            );
        }

        // Auto-add default eyes when head is placed and no eyes exist
        if (slot === 'head' && !this._creature.body.eyes) {
            const defaultEyes = {
                type: 'sparkle',
                color: '#4A90D9',
                covering: null,
                pattern: null,
                patternColor: null,
                scale: 1
            };
            this._creature.body.eyes = defaultEyes;
            if (window.creatureCache.hasCache(this._creature.id)) {
                window.creatureCache.invalidatePart(
                    this._creature.id, 'eyes', this._creature
                );
            }
        }

        // Recompute hit boxes
        this._computePartHitBoxes();

        // Start pop animation
        this._popAnimations[slot] = { progress: 0 };

        // Spawn celebration sparkles
        const screenPos = this._attachmentScreenPos[slot];
        if (screenPos) {
            window.renderer.spawnSparkles(screenPos.x, screenPos.y, 5);
        }

        // Play sound
        window.audioManager.playSound('pop');

        // Notify tutorial
        window.tutorialManager.onPartPlaced(slot);

        this._isDirty = true;
        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    // ══════════════════════════════════════════════════════════
    // ── Drag-to-Place ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Start dragging a part from the thumbnail strip.
     */
    _startDragFromThumb(partMeta, e) {
        this._isDragging = true;
        this._dragPart = partMeta;

        // Create floating DOM clone
        const thumbCanvas = this._thumbnailCache.get(partMeta.id);
        if (thumbCanvas) {
            const clone = document.createElement('div');
            clone.className = 'drag-clone';
            const canvasClone = thumbCanvas.cloneNode(false);
            const ctx = canvasClone.getContext('2d');
            ctx.drawImage(thumbCanvas, 0, 0);
            canvasClone.style.width = '72px';
            canvasClone.style.height = '72px';
            clone.appendChild(canvasClone);
            clone.style.left = `${e.clientX - 36}px`;
            clone.style.top = `${e.clientY - 36}px`;
            document.body.appendChild(clone);
            this._dragCloneEl = clone;
        }

        // Set pointer capture on the triggering button
        e.target.setPointerCapture(e.pointerId);

        // Global pointerup to catch releases outside the canvas
        const onGlobalUp = (upEvent) => {
            document.removeEventListener('pointerup', onGlobalUp);
            if (this._isDragging) {
                // Check if pointer ended over canvas
                const canvas = document.getElementById('creator-canvas');
                if (canvas && this._dragPos) {
                    const rect = canvas.getBoundingClientRect();
                    if (upEvent.clientX >= rect.left && upEvent.clientX <= rect.right &&
                        upEvent.clientY >= rect.top && upEvent.clientY <= rect.bottom) {
                        this._endDragPlace(this._dragPos);
                        return;
                    }
                }
                this._clearDrag();
            }
        };
        document.addEventListener('pointerup', onGlobalUp);
    }

    /**
     * End drag — snap to nearest valid attachment point if within range.
     */
    _endDragPlace(cssPos) {
        if (!this._dragPart) {
            this._clearDrag();
            return;
        }

        const slot = this._dragPart.attachSlot;
        const targetPos = this._attachmentScreenPos[slot];

        if (targetPos) {
            const dx = cssPos.x - targetPos.x;
            const dy = cssPos.y - targetPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 50) {
                this._onPartThumbnailTap(this._dragPart);
            }
        }

        this._clearDrag();
    }

    /**
     * Clear all drag state and remove the clone element.
     */
    _clearDrag() {
        this._isDragging = false;
        this._dragPart = null;
        this._dragPos = null;
        if (this._dragCloneEl) {
            this._dragCloneEl.remove();
            this._dragCloneEl = null;
        }
    }

    // ══════════════════════════════════════════════════════════
    // ── Undo/Redo ────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Push a command to the undo stack.
     */
    _pushCommand(cmd) {
        this._undoStack.push(cmd);
        if (this._undoStack.length > this._maxUndoSteps) {
            this._undoStack.shift();
        }
        this._redoStack = [];
        this._updateUndoRedoButtons();
    }

    /**
     * Undo the last command.
     */
    undo() {
        if (this._undoStack.length === 0) return;
        const cmd = this._undoStack.pop();
        this._redoStack.push(cmd);
        this._applyCommand(cmd, true);
    }

    /**
     * Redo the last undone command.
     */
    redo() {
        if (this._redoStack.length === 0) return;
        const cmd = this._redoStack.pop();
        this._undoStack.push(cmd);
        this._applyCommand(cmd, false);
    }

    /**
     * Apply a command (for undo/redo).
     * @param {object} cmd — the command
     * @param {boolean} isUndo — true for undo, false for redo
     */
    _applyCommand(cmd, isUndo) {
        if (cmd.type === 'style') {
            // Style change: set only the changed property
            const partData = this._getPartDataForSlot(this._creature.body, cmd.slot);
            if (partData) {
                partData[cmd.property] = isUndo ? cmd.oldValue : cmd.newValue;
            }
            // Invalidate the part's cache
            if (window.creatureCache.hasCache(this._creature.id)) {
                window.creatureCache.invalidatePart(
                    this._creature.id, cmd.slot, this._creature
                );
            }
            this._computePartHitBoxes();
        } else if (cmd.type === 'rotate') {
            this._partRotations.set(cmd.slot, isUndo ? cmd.oldValue : cmd.newValue);
        } else if (cmd.type === 'flip') {
            this._partFlips.set(cmd.slot, isUndo ? cmd.oldValue : cmd.newValue);
        } else {
            // place/remove: restore full slot value
            this._setSlotValue(cmd.slot, isUndo ? cmd.oldValue : cmd.newValue);
            if (window.creatureCache.hasCache(this._creature.id)) {
                window.creatureCache.invalidatePart(
                    this._creature.id, cmd.slot, this._creature
                );
            }
            this._computePartHitBoxes();
        }

        this._selectedPart = null;
        this._hideStylePanel();
        this._isDirty = true;
        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    /**
     * Update the disabled state of undo/redo buttons.
     */
    _updateUndoRedoButtons() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = this._undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this._redoStack.length === 0;
    }

    // ══════════════════════════════════════════════════════════
    // ── Slot Helpers ─────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Get a deep copy of a slot's current value.
     */
    _getSlotValue(slot) {
        const val = this._creature.body[slot];
        if (val === null || val === undefined) return null;
        return JSON.parse(JSON.stringify(val));
    }

    /**
     * Set a slot's value on the creature body.
     */
    _setSlotValue(slot, value) {
        this._creature.body[slot] = value;
    }

    /**
     * Check if any body slot is populated.
     */
    _hasAnyPart() {
        const body = this._creature.body;
        if (body.torso) return true;
        if (body.head) return true;
        if (body.eyes) return true;
        if (body.tail) return true;
        if (body.wings) return true;
        if (body.legs && body.legs.length > 0) return true;
        if (body.extras && body.extras.length > 0) return true;
        return false;
    }

    // ══════════════════════════════════════════════════════════
    // ── Selection & Delete ───────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Delete the currently selected part.
     */
    _deleteSelectedPart() {
        if (!this._selectedPart || !this._creature) return;

        const slot = this._selectedPart;
        const oldValue = this._getSlotValue(slot);

        // Get screen position for poof animation
        const screenPos = this._attachmentScreenPos[slot];
        if (screenPos) {
            this._poofAnimation = { x: screenPos.x, y: screenPos.y, progress: 0 };
        }

        // Null out the slot
        if (slot === 'legs' || slot === 'extras') {
            this._setSlotValue(slot, []);
        } else {
            this._setSlotValue(slot, null);
        }

        // Push undo command
        this._pushCommand({
            type: 'remove',
            slot: slot,
            oldValue: oldValue,
            newValue: this._getSlotValue(slot)
        });

        // Invalidate cache
        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, slot, this._creature
            );
        }

        this._selectedPart = null;
        this._hideStylePanel();
        this._computePartHitBoxes();
        this._isDirty = true;
        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    // ══════════════════════════════════════════════════════════
    // ── Layout ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Compute display size and creature center from canvas dimensions.
     */
    _computeLayout() {
        const canvas = document.getElementById('creator-canvas');
        if (!canvas) return;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        this._displaySize = Math.min(w, h) * 0.6;
        this._creatureCenter = { x: w / 2, y: h * 0.4 };
    }

    /**
     * Compute hit boxes for all populated slots in CSS pixel space.
     * Also compute attachment screen positions for all slots (including empty).
     */
    _computePartHitBoxes() {
        this._partHitBoxes = {};
        this._attachmentScreenPos = {};

        if (!this._creature) return;

        const cx = this._creatureCenter.x;
        const cy = this._creatureCenter.y;
        const ds = this._displaySize;

        // Compute screen positions for all attachment points
        for (const slot of Object.keys(ATTACHMENT_OFFSETS)) {
            const offset = ATTACHMENT_OFFSETS[slot];
            this._attachmentScreenPos[slot] = {
                x: cx + offset.x * ds,
                y: cy + offset.y * ds
            };
        }

        // Compute hit boxes for populated slots
        const body = this._creature.body;
        for (const slot of RENDER_ORDER) {
            if (slot === 'accessories') continue;

            const partData = this._getPartDataForSlot(body, slot);
            if (!partData) continue;

            const partId = `${slot}-${partData.type}`;
            const partMeta = window.partsLib.getById(partId);
            if (!partMeta) continue;

            const screenPos = this._attachmentScreenPos[slot];
            const scale = ds / 200;
            const partScale = partData.scale || 1;
            const partW = partMeta.drawSize.w * partScale * scale;
            const partH = partMeta.drawSize.h * partScale * scale;

            // Hit box: at least 60px, centered on attachment point
            const hitW = Math.max(60, partW * (partMeta.hitBox ? partMeta.hitBox.w : 0.8));
            const hitH = Math.max(60, partH * (partMeta.hitBox ? partMeta.hitBox.h : 0.8));

            this._partHitBoxes[slot] = {
                x: screenPos.x - hitW / 2,
                y: screenPos.y - hitH / 2,
                w: hitW,
                h: hitH
            };
        }
    }

    /**
     * Extract part data from body for a slot (handles array slots).
     */
    _getPartDataForSlot(body, slot) {
        const data = body[slot];
        if (!data) return null;
        if (Array.isArray(data)) return data.length > 0 ? data[0] : null;
        return data;
    }

    // ══════════════════════════════════════════════════════════
    // ── Style Panel ──────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Build the style panel DOM once. Stores element references.
     */
    _buildStylePanel() {
        if (this._stylePanelBuilt) return;
        this._stylePanelBuilt = true;

        const panel = document.getElementById('style-panel');
        if (!panel) return;
        panel.innerHTML = '';

        const els = this._stylePanelEls;

        // ── Close button ──
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', 'Close style panel');
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => {
            this._selectedPart = null;
            this._hideStylePanel();
        });
        panel.appendChild(closeBtn);

        // ── Sub-tabs ──
        const tabBar = document.createElement('div');
        tabBar.className = 'style-tabs';
        tabBar.setAttribute('role', 'tablist');
        tabBar.setAttribute('aria-label', 'Style categories');

        const tabDefs = [
            { id: 'color',     label: '🎨 Color' },
            { id: 'texture',   label: '✨ Texture' },
            { id: 'transform', label: '📐 Transform' },
            { id: 'eyes',      label: '👁 Eyes' }
        ];

        els.tabs = {};
        for (const def of tabDefs) {
            const tab = document.createElement('button');
            tab.className = 'style-tab';
            if (def.id === 'eyes') tab.classList.add('style-tab-eyes');
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', def.id === 'color' ? 'true' : 'false');
            tab.setAttribute('aria-controls', `style-panel-${def.id}`);
            tab.textContent = def.label;
            tab.addEventListener('click', () => this._switchStyleTab(def.id));
            tabBar.appendChild(tab);
            els.tabs[def.id] = tab;
        }
        panel.appendChild(tabBar);

        // ── Color tab panel ──
        els.colorPanel = this._buildColorPanel();
        els.colorPanel.id = 'style-panel-color';
        panel.appendChild(els.colorPanel);

        // ── Texture tab panel ──
        els.texturePanel = this._buildTexturePanel();
        els.texturePanel.id = 'style-panel-texture';
        els.texturePanel.classList.add('hidden');
        panel.appendChild(els.texturePanel);

        // ── Transform tab panel ──
        els.transformPanel = this._buildTransformPanel();
        els.transformPanel.id = 'style-panel-transform';
        els.transformPanel.classList.add('hidden');
        panel.appendChild(els.transformPanel);

        // ── Eyes tab panel ──
        els.eyesPanel = this._buildEyesPanel();
        els.eyesPanel.id = 'style-panel-eyes';
        els.eyesPanel.classList.add('hidden');
        panel.appendChild(els.eyesPanel);
    }

    /**
     * Build the Color sub-tab panel.
     */
    _buildColorPanel() {
        const div = document.createElement('div');
        div.className = 'style-content style-colors';
        div.setAttribute('role', 'tabpanel');
        div.setAttribute('aria-label', 'Color options');

        const els = this._stylePanelEls;

        // Palette tabs
        const paletteTabs = document.createElement('div');
        paletteTabs.className = 'palette-tabs';
        paletteTabs.setAttribute('role', 'radiogroup');
        paletteTabs.setAttribute('aria-label', 'Color palette');

        els.paletteTabs = {};
        for (const name of Object.keys(COLOR_PALETTES)) {
            const btn = document.createElement('button');
            btn.className = 'palette-tab';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', name === this._activePalette ? 'true' : 'false');
            btn.setAttribute('aria-label', name);
            btn.textContent = name;
            btn.addEventListener('click', () => this._onPaletteTab(name));
            paletteTabs.appendChild(btn);
            els.paletteTabs[name] = btn;
        }
        div.appendChild(paletteTabs);

        // Color swatches
        const swatchWrap = document.createElement('div');
        swatchWrap.className = 'color-swatches';
        swatchWrap.setAttribute('role', 'radiogroup');
        swatchWrap.setAttribute('aria-label', 'Colors');
        els.colorSwatches = swatchWrap;
        div.appendChild(swatchWrap);

        this._renderColorSwatches(this._activePalette);

        // Recent colors
        const recentLabel = document.createElement('div');
        recentLabel.className = 'recent-label';
        recentLabel.textContent = 'Recent';
        els.recentLabel = recentLabel;
        div.appendChild(recentLabel);

        const recentWrap = document.createElement('div');
        recentWrap.className = 'recent-colors';
        recentWrap.setAttribute('role', 'radiogroup');
        recentWrap.setAttribute('aria-label', 'Recent colors');
        els.recentSwatches = recentWrap;
        div.appendChild(recentWrap);

        return div;
    }

    /**
     * Render color swatch buttons for a given palette.
     */
    _renderColorSwatches(paletteName) {
        const container = this._stylePanelEls.colorSwatches;
        if (!container) return;
        container.innerHTML = '';

        const colors = COLOR_PALETTES[paletteName] || [];
        const currentColor = this._getSelectedPartColor();

        for (const hex of colors) {
            const btn = this._createColorSwatch(hex, hex === currentColor);
            btn.addEventListener('click', () => this._onColorSelect(hex));
            container.appendChild(btn);
        }
    }

    /**
     * Create a single color swatch button.
     */
    _createColorSwatch(hex, checked) {
        const btn = document.createElement('button');
        btn.className = 'color-swatch';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', checked ? 'true' : 'false');
        btn.setAttribute('aria-label', hex);
        btn.style.backgroundColor = hex;
        return btn;
    }

    /**
     * Render recent color swatches.
     */
    _renderRecentColors() {
        const container = this._stylePanelEls.recentSwatches;
        const label = this._stylePanelEls.recentLabel;
        if (!container) return;
        container.innerHTML = '';

        if (this._recentColors.length === 0) {
            if (label) label.classList.add('hidden');
            return;
        }
        if (label) label.classList.remove('hidden');

        const currentColor = this._getSelectedPartColor();
        for (const hex of this._recentColors) {
            const btn = this._createColorSwatch(hex, hex === currentColor);
            btn.addEventListener('click', () => this._onColorSelect(hex));
            container.appendChild(btn);
        }
    }

    /**
     * Build the Texture sub-tab panel.
     */
    _buildTexturePanel() {
        const div = document.createElement('div');
        div.className = 'style-content style-textures';
        div.setAttribute('role', 'tabpanel');
        div.setAttribute('aria-label', 'Texture options');

        const els = this._stylePanelEls;

        // Covering label
        const coverLabel = document.createElement('div');
        coverLabel.className = 'style-section-label';
        coverLabel.textContent = 'Covering';
        div.appendChild(coverLabel);

        // Covering buttons
        const coverWrap = document.createElement('div');
        coverWrap.className = 'covering-buttons';
        coverWrap.setAttribute('role', 'radiogroup');
        coverWrap.setAttribute('aria-label', 'Covering type');

        els.coveringBtns = {};
        for (const cov of COVERING_TYPES) {
            const btn = document.createElement('button');
            btn.className = 'covering-btn';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('aria-label', cov.label);
            btn.textContent = cov.icon;
            btn.addEventListener('click', () => this._onCoveringSelect(cov.id));
            coverWrap.appendChild(btn);
            els.coveringBtns[cov.id] = btn;
        }
        div.appendChild(coverWrap);

        // Pattern label
        const patLabel = document.createElement('div');
        patLabel.className = 'style-section-label';
        patLabel.textContent = 'Pattern';
        div.appendChild(patLabel);

        // Pattern buttons
        const patWrap = document.createElement('div');
        patWrap.className = 'pattern-buttons';
        patWrap.setAttribute('role', 'radiogroup');
        patWrap.setAttribute('aria-label', 'Pattern type');

        els.patternBtns = {};
        for (const pat of PATTERN_TYPES) {
            const btn = document.createElement('button');
            btn.className = 'pattern-btn';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('aria-label', pat.label);
            btn.textContent = pat.icon;
            btn.addEventListener('click', () => this._onPatternSelect(pat.id));
            patWrap.appendChild(btn);
            els.patternBtns[pat.id] = btn;
        }
        div.appendChild(patWrap);

        return div;
    }

    /**
     * Build the Transform sub-tab panel.
     */
    _buildTransformPanel() {
        const div = document.createElement('div');
        div.className = 'style-content style-transform';
        div.setAttribute('role', 'tabpanel');
        div.setAttribute('aria-label', 'Transform options');

        const els = this._stylePanelEls;

        // Size label
        const sizeLabel = document.createElement('div');
        sizeLabel.className = 'style-section-label';
        sizeLabel.textContent = 'Size';
        div.appendChild(sizeLabel);

        // Size slider
        const sliderWrap = document.createElement('div');
        sliderWrap.className = 'size-slider-wrap';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.5';
        slider.max = '2.0';
        slider.step = '0.1';
        slider.value = '1.0';
        slider.setAttribute('aria-label', 'Part size');
        slider.setAttribute('aria-valuetext', '1.0x');
        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            slider.setAttribute('aria-valuetext', `${val.toFixed(1)}x`);
            this._onSizeInput(val);
        });
        slider.addEventListener('pointerdown', () => {
            this._sizeSliderOldValue = parseFloat(slider.value);
        });
        slider.addEventListener('change', () => {
            const newVal = parseFloat(slider.value);
            if (newVal !== this._sizeSliderOldValue) {
                this._onSizeChange(this._sizeSliderOldValue, newVal);
            }
        });
        sliderWrap.appendChild(slider);
        els.sizeSlider = slider;
        div.appendChild(sliderWrap);

        // Rotate label
        const rotLabel = document.createElement('div');
        rotLabel.className = 'style-section-label';
        rotLabel.textContent = 'Rotate';
        div.appendChild(rotLabel);

        // Rotate buttons
        const rotWrap = document.createElement('div');
        rotWrap.className = 'rotate-buttons';

        const rotLeft = document.createElement('button');
        rotLeft.className = 'rotate-btn';
        rotLeft.setAttribute('aria-label', 'Rotate left');
        rotLeft.textContent = '↶';
        rotLeft.addEventListener('click', () => this._onRotate(-15));
        rotWrap.appendChild(rotLeft);

        const rotRight = document.createElement('button');
        rotRight.className = 'rotate-btn';
        rotRight.setAttribute('aria-label', 'Rotate right');
        rotRight.textContent = '↷';
        rotRight.addEventListener('click', () => this._onRotate(15));
        rotWrap.appendChild(rotRight);

        const flipBtn = document.createElement('button');
        flipBtn.className = 'rotate-btn';
        flipBtn.setAttribute('aria-label', 'Flip horizontal');
        flipBtn.textContent = '↔';
        flipBtn.addEventListener('click', () => this._onFlip());
        rotWrap.appendChild(flipBtn);

        div.appendChild(rotWrap);

        return div;
    }

    /**
     * Build the Eyes sub-tab panel.
     */
    _buildEyesPanel() {
        const div = document.createElement('div');
        div.className = 'style-content style-eyes';
        div.setAttribute('role', 'tabpanel');
        div.setAttribute('aria-label', 'Eye options');

        const els = this._stylePanelEls;

        // Eye type label
        const typeLabel = document.createElement('div');
        typeLabel.className = 'style-section-label';
        typeLabel.textContent = 'Eye Style';
        div.appendChild(typeLabel);

        // Eye type buttons
        const typeWrap = document.createElement('div');
        typeWrap.className = 'eye-type-buttons';
        typeWrap.setAttribute('role', 'radiogroup');
        typeWrap.setAttribute('aria-label', 'Eye style');

        // Get eye parts from parts catalog
        const eyeParts = window.partsLib.getByCategory('eyes');
        els.eyeTypeBtns = {};
        for (const eyePart of eyeParts) {
            const eyeType = eyePart.id.split('-').slice(1).join('-');
            const btn = document.createElement('button');
            btn.className = 'eye-type-btn';
            btn.setAttribute('role', 'radio');
            btn.setAttribute('aria-checked', 'false');
            btn.setAttribute('aria-label', eyePart.name);

            // Draw thumbnail
            const thumb = this._buildMiniThumb(eyePart, '#4A90D9');
            btn.appendChild(thumb);

            btn.addEventListener('click', () => this._onEyeTypeSelect(eyeType));
            typeWrap.appendChild(btn);
            els.eyeTypeBtns[eyeType] = btn;
        }
        div.appendChild(typeWrap);

        // Eye color label
        const colorLabel = document.createElement('div');
        colorLabel.className = 'style-section-label';
        colorLabel.textContent = 'Eye Color';
        div.appendChild(colorLabel);

        // Eye color swatches
        const eyeColorWrap = document.createElement('div');
        eyeColorWrap.className = 'eye-color-swatches';
        eyeColorWrap.setAttribute('role', 'radiogroup');
        eyeColorWrap.setAttribute('aria-label', 'Eye color');

        els.eyeColorBtns = {};
        for (const ec of EYE_COLORS) {
            const btn = this._createColorSwatch(ec.hex, false);
            btn.setAttribute('aria-label', ec.name);
            btn.addEventListener('click', () => this._onEyeColorSelect(ec.hex));
            eyeColorWrap.appendChild(btn);
            els.eyeColorBtns[ec.hex] = btn;
        }
        div.appendChild(eyeColorWrap);

        return div;
    }

    /**
     * Build a 40×40 DPR-scaled mini thumbnail of a part.
     */
    _buildMiniThumb(partMeta, color) {
        const dpr = window.devicePixelRatio || 1;
        const size = 40;
        const canvas = document.createElement('canvas');
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const drawW = partMeta.drawSize.w;
        const drawH = partMeta.drawSize.h;
        const scale = Math.min(
            (size * 0.8) / drawW,
            (size * 0.8) / drawH
        );

        ctx.save();
        ctx.translate(
            (size - drawW * scale) / 2,
            (size - drawH * scale) / 2
        );
        ctx.scale(scale, scale);
        window.partsLib.drawPart(ctx, partMeta.id, drawW, drawH, color, null, null, null);
        ctx.restore();

        return canvas;
    }

    /**
     * Switch between style sub-tabs.
     */
    _switchStyleTab(tabId) {
        this._activeStyleTab = tabId;
        const els = this._stylePanelEls;

        // Update tab aria-selected
        for (const [id, tab] of Object.entries(els.tabs)) {
            tab.setAttribute('aria-selected', id === tabId ? 'true' : 'false');
        }

        // Show/hide panels
        const panels = {
            color: els.colorPanel,
            texture: els.texturePanel,
            transform: els.transformPanel,
            eyes: els.eyesPanel
        };
        for (const [id, panel] of Object.entries(panels)) {
            if (!panel) continue;
            if (id === tabId) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        }

        // Lazy regen covering/pattern thumbs when switching to texture tab
        if (tabId === 'texture' && this._coveringThumbsDirty) {
            this._coveringThumbsDirty = false;
            // Thumbnails show text icons, no regen needed for text-based buttons
        }
    }

    /**
     * Show the style panel for a given slot.
     */
    _showStylePanel(slot) {
        const panel = document.getElementById('style-panel');
        const strip = document.getElementById('part-strip');
        const tabs = document.getElementById('creator-tabs');

        if (panel) panel.classList.remove('hidden');
        if (strip) strip.classList.add('hidden');
        if (tabs) tabs.classList.add('hidden');

        // Show/hide eyes tab
        const eyesTab = this._stylePanelEls.tabs && this._stylePanelEls.tabs.eyes;
        if (eyesTab) {
            if (slot === 'head') {
                eyesTab.classList.remove('hidden');
            } else {
                eyesTab.classList.add('hidden');
                // If currently on eyes tab, switch to color
                if (this._activeStyleTab === 'eyes') {
                    this._switchStyleTab('color');
                }
            }
        }

        // Refresh panel to reflect selected part's values
        this._refreshStylePanel(slot);
    }

    /**
     * Hide the style panel and restore part strip + tabs.
     */
    _hideStylePanel() {
        const panel = document.getElementById('style-panel');
        const strip = document.getElementById('part-strip');
        const tabs = document.getElementById('creator-tabs');

        if (panel) panel.classList.add('hidden');
        if (strip) strip.classList.remove('hidden');
        if (tabs) tabs.classList.remove('hidden');
    }

    /**
     * Refresh the style panel UI to reflect the selected part's current values.
     */
    _refreshStylePanel(slot) {
        if (!this._creature) return;
        const partData = this._getPartDataForSlot(this._creature.body, slot);
        if (!partData) return;

        const els = this._stylePanelEls;

        // ── Color tab: highlight current color ──
        this._renderColorSwatches(this._activePalette);
        this._renderRecentColors();

        // ── Texture tab: highlight current covering & pattern ──
        const currentCovering = partData.covering || 'smooth';
        for (const [id, btn] of Object.entries(els.coveringBtns || {})) {
            btn.setAttribute('aria-checked', id === currentCovering ? 'true' : 'false');
        }

        const currentPattern = partData.pattern || 'solid';
        for (const [id, btn] of Object.entries(els.patternBtns || {})) {
            btn.setAttribute('aria-checked', id === currentPattern ? 'true' : 'false');
        }

        // ── Transform tab: set slider value ──
        if (els.sizeSlider) {
            els.sizeSlider.value = String(partData.scale || 1);
            els.sizeSlider.setAttribute('aria-valuetext', `${(partData.scale || 1).toFixed(1)}x`);
        }

        // ── Eyes tab: highlight current eye type & color ──
        if (slot === 'head' && this._creature.body.eyes) {
            const eyeData = this._creature.body.eyes;

            for (const [type, btn] of Object.entries(els.eyeTypeBtns || {})) {
                btn.setAttribute('aria-checked', type === eyeData.type ? 'true' : 'false');
            }

            for (const [hex, btn] of Object.entries(els.eyeColorBtns || {})) {
                btn.setAttribute('aria-checked', hex === eyeData.color ? 'true' : 'false');
            }
        }
    }

    /**
     * Get the currently selected part's color.
     */
    _getSelectedPartColor() {
        if (!this._selectedPart || !this._creature) return null;
        const partData = this._getPartDataForSlot(this._creature.body, this._selectedPart);
        return partData ? partData.color : null;
    }

    // ══════════════════════════════════════════════════════════
    // ── Style Handlers ───────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Handle color palette tab selection.
     */
    _onPaletteTab(name) {
        this._activePalette = name;
        const els = this._stylePanelEls;

        // Update palette tab aria-checked
        for (const [id, btn] of Object.entries(els.paletteTabs || {})) {
            btn.setAttribute('aria-checked', id === name ? 'true' : 'false');
        }

        this._renderColorSwatches(name);
    }

    /**
     * Handle color swatch selection.
     */
    _onColorSelect(hex) {
        if (!this._selectedPart || !this._creature) return;
        const partData = this._getPartDataForSlot(this._creature.body, this._selectedPart);
        if (!partData) return;

        const oldColor = partData.color;
        if (oldColor === hex) return; // no change

        partData.color = hex;

        // Auto-update patternColor if pattern is active
        if (partData.pattern && partData.pattern !== 'solid') {
            partData.patternColor = window.partsLib._adjustBrightness(hex, 40);
        }

        // Push undo
        this._pushCommand({
            type: 'style',
            slot: this._selectedPart,
            property: 'color',
            oldValue: oldColor,
            newValue: hex
        });

        // Invalidate cache
        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, this._selectedPart, this._creature
            );
        }

        // Update recent colors
        this._addRecentColor(hex);

        // Mark covering thumbs dirty for lazy regen
        this._coveringThumbsDirty = true;

        // Refresh swatch highlights
        this._renderColorSwatches(this._activePalette);
        this._renderRecentColors();

        this._isDirty = true;

        // Sparkle feedback
        const screenPos = this._attachmentScreenPos[this._selectedPart];
        if (screenPos) {
            window.renderer.spawnSparkles(screenPos.x, screenPos.y, 3);
        }
    }

    /**
     * Add a color to the recent colors list.
     */
    _addRecentColor(hex) {
        const idx = this._recentColors.indexOf(hex);
        if (idx !== -1) this._recentColors.splice(idx, 1);
        this._recentColors.unshift(hex);
        if (this._recentColors.length > 8) this._recentColors.pop();
    }

    /**
     * Handle covering type selection.
     */
    _onCoveringSelect(covId) {
        if (!this._selectedPart || !this._creature) return;
        const partData = this._getPartDataForSlot(this._creature.body, this._selectedPart);
        if (!partData) return;

        const oldCovering = partData.covering;
        const newCovering = covId === 'smooth' ? null : covId;
        if (oldCovering === newCovering) return;

        partData.covering = newCovering;

        this._pushCommand({
            type: 'style',
            slot: this._selectedPart,
            property: 'covering',
            oldValue: oldCovering,
            newValue: newCovering
        });

        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, this._selectedPart, this._creature
            );
        }

        // Update button states
        const currentCovering = newCovering || 'smooth';
        for (const [id, btn] of Object.entries(this._stylePanelEls.coveringBtns || {})) {
            btn.setAttribute('aria-checked', id === currentCovering ? 'true' : 'false');
        }

        this._isDirty = true;
    }

    /**
     * Handle pattern type selection.
     */
    _onPatternSelect(patId) {
        if (!this._selectedPart || !this._creature) return;
        const partData = this._getPartDataForSlot(this._creature.body, this._selectedPart);
        if (!partData) return;

        const oldPattern = partData.pattern;
        const newPattern = patId === 'solid' ? null : patId;
        if (oldPattern === newPattern) return;

        partData.pattern = newPattern;

        // Auto-compute patternColor
        if (newPattern) {
            partData.patternColor = window.partsLib._adjustBrightness(partData.color, 40);
        } else {
            partData.patternColor = null;
        }

        this._pushCommand({
            type: 'style',
            slot: this._selectedPart,
            property: 'pattern',
            oldValue: oldPattern,
            newValue: newPattern
        });

        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, this._selectedPart, this._creature
            );
        }

        // Update button states
        const currentPattern = newPattern || 'solid';
        for (const [id, btn] of Object.entries(this._stylePanelEls.patternBtns || {})) {
            btn.setAttribute('aria-checked', id === currentPattern ? 'true' : 'false');
        }

        this._isDirty = true;
    }

    /**
     * Handle live size slider input (preview, no undo).
     */
    _onSizeInput(value) {
        if (!this._selectedPart || !this._creature) return;
        const partData = this._getPartDataForSlot(this._creature.body, this._selectedPart);
        if (!partData) return;

        partData.scale = value;

        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, this._selectedPart, this._creature
            );
        }

        this._computePartHitBoxes();
        this._isDirty = true;
    }

    /**
     * Handle size slider change (push undo with old/new values).
     */
    _onSizeChange(oldVal, newVal) {
        if (!this._selectedPart) return;

        this._pushCommand({
            type: 'style',
            slot: this._selectedPart,
            property: 'scale',
            oldValue: oldVal,
            newValue: newVal
        });
    }

    /**
     * Handle rotation button press.
     */
    _onRotate(degrees) {
        if (!this._selectedPart) return;

        const oldDeg = this._partRotations.get(this._selectedPart) || 0;
        const newDeg = oldDeg + degrees;

        this._partRotations.set(this._selectedPart, newDeg);

        this._pushCommand({
            type: 'rotate',
            slot: this._selectedPart,
            oldValue: oldDeg,
            newValue: newDeg
        });

        this._isDirty = true;
    }

    /**
     * Handle flip button press.
     */
    _onFlip() {
        if (!this._selectedPart) return;

        const oldFlip = this._partFlips.get(this._selectedPart) || false;
        const newFlip = !oldFlip;

        this._partFlips.set(this._selectedPart, newFlip);

        this._pushCommand({
            type: 'flip',
            slot: this._selectedPart,
            oldValue: oldFlip,
            newValue: newFlip
        });

        this._isDirty = true;
    }

    /**
     * Handle eye type selection.
     */
    _onEyeTypeSelect(eyeType) {
        if (!this._creature || !this._creature.body.eyes) return;

        const eyes = this._creature.body.eyes;
        const oldType = eyes.type;
        if (oldType === eyeType) return;

        eyes.type = eyeType;

        this._pushCommand({
            type: 'style',
            slot: 'eyes',
            property: 'type',
            oldValue: oldType,
            newValue: eyeType
        });

        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, 'eyes', this._creature
            );
        }

        // Update button states
        for (const [type, btn] of Object.entries(this._stylePanelEls.eyeTypeBtns || {})) {
            btn.setAttribute('aria-checked', type === eyeType ? 'true' : 'false');
        }

        this._isDirty = true;

        // Sparkle
        const screenPos = this._attachmentScreenPos.eyes;
        if (screenPos) {
            window.renderer.spawnSparkles(screenPos.x, screenPos.y, 3);
        }
    }

    /**
     * Handle eye color selection.
     */
    _onEyeColorSelect(hex) {
        if (!this._creature || !this._creature.body.eyes) return;

        const eyes = this._creature.body.eyes;
        const oldColor = eyes.color;
        if (oldColor === hex) return;

        eyes.color = hex;

        this._pushCommand({
            type: 'style',
            slot: 'eyes',
            property: 'color',
            oldValue: oldColor,
            newValue: hex
        });

        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, 'eyes', this._creature
            );
        }

        // Update swatch states
        for (const [h, btn] of Object.entries(this._stylePanelEls.eyeColorBtns || {})) {
            btn.setAttribute('aria-checked', h === hex ? 'true' : 'false');
        }

        this._isDirty = true;
    }

    // ══════════════════════════════════════════════════════════
    // ── Update ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Update (called by game.js each frame).
     */
    update(dt) {
        // Advance pop animations
        const popSlots = Object.keys(this._popAnimations);
        for (const slot of popSlots) {
            this._popAnimations[slot].progress += dt / 300;
            if (this._popAnimations[slot].progress >= 1) {
                delete this._popAnimations[slot];
            }
        }

        // Advance poof animation
        if (this._poofAnimation) {
            this._poofAnimation.progress += dt / 400;
            if (this._poofAnimation.progress >= 1) {
                this._poofAnimation = null;
            }
        }

        // Advance selection pulse
        this._selectionPulse += dt;
    }

    // ══════════════════════════════════════════════════════════
    // ── Draw ─────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Draw (called by game.js each frame).
     */
    draw(ctx, w, h) {
        // Draw attachment point glows when dragging
        if (this._isDragging && this._dragPart) {
            this._drawAttachmentGlows(ctx);
        }

        // Draw creature
        if (window.creatureCache.hasCache(this._creature.id)) {
            // Build anim state with pop, rotation, and flip overrides
            const animState = this._buildAnimState();
            window.creatureCache.drawCreatureById(
                ctx,
                this._creatureCenter.x,
                this._creatureCenter.y,
                animState,
                this._displaySize,
                this._creature.id
            );
        } else if (this._hasAnyPart()) {
            // First part placed — build cache
            window.creatureCache.buildCache(
                this._creature.id, this._creature, this._displaySize
            );
        } else {
            // No parts yet — show placeholder
            window.renderer.drawPlaceholderText(ctx, w, h, 'Tap a part to start!');
        }

        // Draw selection ring if a part is selected
        if (this._selectedPart) {
            this._drawSelectionRing(ctx);
            this._drawTrashIcon(ctx, w, h);
        }

        // Draw drag preview if dragging over canvas
        if (this._isDragging && this._dragPos && this._dragPart) {
            this._drawDragPreview(ctx);
        }

        // Draw poof animation
        if (this._poofAnimation) {
            this._drawPoof(ctx);
        }

        // Tutorial draws on top
        if (window.tutorialManager.isActive()) {
            window.tutorialManager.draw(ctx, w, h);
        }
    }

    /**
     * Build animation state with pop-in scale overrides, rotation, and flip.
     * Replaces the former _buildPopAnimState().
     */
    _buildAnimState() {
        const state = {};

        // Apply rotation and flip for all slots
        for (const slot of RENDER_ORDER) {
            const rotation = this._partRotations.get(slot) || 0;
            const flip = this._partFlips.get(slot) || false;

            if (rotation !== 0 || flip) {
                state[slot] = {
                    translateX: 0,
                    translateY: 0,
                    rotation: rotation,
                    scaleX: flip ? -1 : 1,
                    scaleY: 1
                };
            }
        }

        // Apply pop animation overrides (merge on top)
        for (const slot of Object.keys(this._popAnimations)) {
            const p = this._popAnimations[slot].progress;
            // Overshoot bounce: scale from 0 -> 1.2 -> 1.0
            let s;
            if (p < 0.5) {
                s = p * 2 * 1.2; // 0 -> 1.2
            } else {
                s = 1.2 - (p - 0.5) * 2 * 0.2; // 1.2 -> 1.0
            }

            const existing = state[slot] || {
                translateX: 0, translateY: 0, rotation: 0, scaleX: 1, scaleY: 1
            };
            state[slot] = {
                translateX: existing.translateX,
                translateY: existing.translateY,
                rotation: existing.rotation,
                scaleX: (existing.scaleX < 0 ? -s : s),
                scaleY: s
            };
        }

        return state;
    }

    /**
     * Draw pulsing circles at empty valid attachment points during drag.
     */
    _drawAttachmentGlows(ctx) {
        if (!this._dragPart) return;

        const slot = this._dragPart.attachSlot;
        const pos = this._attachmentScreenPos[slot];
        if (!pos) return;

        const pulse = 0.5 + 0.3 * Math.sin(this._selectionPulse / 200);
        const radius = 25 + pulse * 5;

        ctx.save();
        ctx.globalAlpha = 0.4 + pulse * 0.2;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw a pulsing dashed selection ring around the selected part.
     */
    _drawSelectionRing(ctx) {
        const box = this._partHitBoxes[this._selectedPart];
        if (!box) return;

        const pulse = Math.sin(this._selectionPulse / 300) * 0.15 + 0.85;
        const pad = 6;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.lineDashOffset = -this._selectionPulse / 50;

        // Rounded rect
        const x = box.x - pad;
        const y = box.y - pad;
        const w = box.w + pad * 2;
        const h = box.h + pad * 2;
        const r = 12;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw trash icon at top-right corner when a part is selected.
     */
    _drawTrashIcon(ctx, w) {
        const iconSize = 40;
        const margin = 16;
        const tx = w - margin - iconSize;
        const ty = margin;

        // Update trash hit box
        this._trashBox = { x: tx, y: ty, w: iconSize, h: iconSize };

        ctx.save();

        // Background circle
        ctx.fillStyle = 'rgba(255, 107, 107, 0.15)';
        ctx.beginPath();
        ctx.arc(tx + iconSize / 2, ty + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Trash emoji
        ctx.font = "20px OpenDyslexic, 'Comic Sans MS', cursive";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText('🗑️', tx + iconSize / 2, ty + iconSize / 2);

        ctx.restore();
    }

    /**
     * Draw a semi-transparent preview of the dragged part at the cursor position.
     */
    _drawDragPreview(ctx) {
        if (!this._dragPos || !this._dragPart) return;

        const slot = this._dragPart.attachSlot;
        const targetPos = this._attachmentScreenPos[slot];
        if (!targetPos) return;

        // Draw a line from cursor to target attachment point
        const dx = targetPos.x - this._dragPos.x;
        const dy = targetPos.y - this._dragPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        ctx.save();
        ctx.globalAlpha = dist < 50 ? 0.8 : 0.3;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this._dragPos.x, this._dragPos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw poof (delete) animation.
     */
    _drawPoof(ctx) {
        if (!this._poofAnimation) return;

        const p = this._poofAnimation.progress;
        const x = this._poofAnimation.x;
        const y = this._poofAnimation.y;

        ctx.save();
        ctx.globalAlpha = 1 - p;

        // Expanding ring
        const radius = 20 + p * 40;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3 * (1 - p);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Small circles radiating outward
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const cx = x + Math.cos(angle) * radius * 0.8;
            const cy = y + Math.sin(angle) * radius * 0.8;
            const dotR = 4 * (1 - p);
            ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FF69B4';
            ctx.beginPath();
            ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // ══════════════════════════════════════════════════════════
    // ── Done Button ──────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    /**
     * Show/hide the Done button based on canFinish().
     */
    _updateDoneButton() {
        const btn = document.getElementById('btn-name-finish');
        if (!btn) return;
        if (this.canFinish()) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    }
}
