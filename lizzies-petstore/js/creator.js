/**
 * creator.js — Creator studio: palette, placement, styling tools.
 * Manages the creature creation workspace.
 *
 * Two placement modes:
 *   - Tap-to-place (primary): tap part → auto-snap to attachment point
 *   - Drag-to-place (advanced): long-press 300ms → drag → snap to nearest valid point
 *
 * Does NOT own its own RAF loop. Exposes update(dt) and draw(ctx, w, h).
 */

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

        // Build thumbnail cache (one-time per session)
        this._buildThumbnailCache();

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

        // Remove drag clone if present
        if (this._dragCloneEl) {
            this._dragCloneEl.remove();
            this._dragCloneEl = null;
        }

        // Clear the part strip DOM
        const strip = document.getElementById('part-strip');
        if (strip) strip.innerHTML = '';

        // Reset canvas binding so it re-binds on next session
        this._canvasBound = false;

        // Don't clear thumbnail cache — reusable across sessions
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

    // ── Thumbnail Cache ──────────────────────────────────

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

    // ── Part Strip ───────────────────────────────────────

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

    // ── Tab Events ───────────────────────────────────────

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

    // ── Canvas Input ─────────────────────────────────────

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
                return;
            }
        }

        // Miss — deselect
        this._selectedPart = null;
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

    // ── Tap-to-Place ─────────────────────────────────────

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

    // ── Drag-to-Place ────────────────────────────────────

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

    // ── Undo/Redo ────────────────────────────────────────

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

        // Restore old value
        this._setSlotValue(cmd.slot, cmd.oldValue);
        this._redoStack.push(cmd);

        // Invalidate cache
        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, cmd.slot, this._creature
            );
        }

        this._computePartHitBoxes();
        this._selectedPart = null;
        this._isDirty = true;
        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    /**
     * Redo the last undone command.
     */
    redo() {
        if (this._redoStack.length === 0) return;
        const cmd = this._redoStack.pop();

        // Apply new value
        this._setSlotValue(cmd.slot, cmd.newValue);
        this._undoStack.push(cmd);

        // Invalidate cache
        if (window.creatureCache.hasCache(this._creature.id)) {
            window.creatureCache.invalidatePart(
                this._creature.id, cmd.slot, this._creature
            );
        }

        this._computePartHitBoxes();
        this._selectedPart = null;
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

    // ── Slot Helpers ─────────────────────────────────────

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

    // ── Selection & Delete ───────────────────────────────

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
        this._computePartHitBoxes();
        this._isDirty = true;
        this._updateDoneButton();
        this._updateUndoRedoButtons();
    }

    // ── Layout ───────────────────────────────────────────

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

    // ── Update ───────────────────────────────────────────

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

    // ── Draw ─────────────────────────────────────────────

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
            // Build anim state with pop overrides
            const animState = this._buildPopAnimState();
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
     * Build animation state with pop-in scale overrides.
     */
    _buildPopAnimState() {
        const state = {};
        for (const slot of Object.keys(this._popAnimations)) {
            const p = this._popAnimations[slot].progress;
            // Overshoot bounce: scale from 0 -> 1.2 -> 1.0
            let s;
            if (p < 0.5) {
                s = p * 2 * 1.2; // 0 -> 1.2
            } else {
                s = 1.2 - (p - 0.5) * 2 * 0.2; // 1.2 -> 1.0
            }
            state[slot] = {
                translateX: 0, translateY: 0, rotation: 0,
                scaleX: s, scaleY: s
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

    // ── Done Button ──────────────────────────────────────

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
