/**
 * game.js — Main state machine, game loop, screen management.
 * Owns the single RAF chain — no other module may call requestAnimationFrame.
 *
 * State machine:
 *   TITLE → CREATOR → BIRTH_ANIMATION → CARE (hub) → PARK
 *                                       ↕ WARDROBE
 *                                       ↕ ROOM_EDIT
 *     GALLERY ↔ CARE
 *     GALLERY → CREATOR (edit existing)
 */

class Game {
    constructor() {
        this.state = 'TITLE';
        this._canvas = null;
        this._ctx = null;
        this._rafId = null;
        this._lastTime = 0;

        // Managers (initialized in init())
        this._renderer = null;
        this._creator = null;
        this._care = null;
        this._park = null;
        this._room = null;
        this._wardrobe = null;
        this._tutorial = null;
        this._progress = null;
        this._audio = null;
        this._ui = null;

        // Current creature being edited/cared for
        this._activeCreatureId = null;
        this._editingCreature = null;
    }

    init() {
        // Initialize managers
        window.saveManager = new SaveManager();
        window.audioManager = new AudioManager();
        window.uiManager = new UIManager();
        window.partsLib = new PartsLibrary();
        window.creatureCache = new CreatureCache();
        window.animationEngine = new AnimationEngine();
        window.accessoriesLib = new AccessoriesLibrary();
        window.creator = new Creator();
        window.careManager = new CareManager();
        window.roomManager = new RoomManager();
        window.parkManager = new ParkManager();
        window.tutorialManager = new TutorialManager();
        window.progressManager = new ProgressManager();
        window.renderer = new Renderer();

        this._bindScreenButtons();
        this._showScreen('TITLE');

        // Start the game loop
        this._lastTime = performance.now();
        this._tick(this._lastTime);
    }

    // ── State Machine ──────────────────────────────────

    /**
     * Transition to a new state.
     * Cancels all active managers for the previous state before entering the new one.
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        this._showScreen(newState);
    }

    _showScreen(state) {
        // Deactivate all screens
        const screens = document.querySelectorAll('.screen');
        for (const s of screens) {
            s.classList.remove('active');
        }

        // Activate target screen
        const screenMap = {
            'TITLE': 'screen-title',
            'CREATOR': 'screen-creator',
            'NAMING': 'screen-naming',
            'BIRTH_ANIMATION': 'screen-birth',
            'CARE': 'screen-care',
            'GALLERY': 'screen-gallery',
            'WARDROBE': 'screen-wardrobe',
            'ROOM_EDIT': 'screen-room-edit',
            'PARK': 'screen-park'
        };

        const screenId = screenMap[state];
        if (screenId) {
            const el = document.getElementById(screenId);
            if (el) el.classList.add('active');
        }
    }

    // ── Game Loop (single RAF chain) ───────────────────

    _tick(now) {
        this._rafId = requestAnimationFrame((t) => this._tick(t));

        let dt = now - this._lastTime;
        this._lastTime = now;
        // Cap delta at 50ms to prevent spiral-of-death on tab-away
        if (dt > 50) dt = 50;

        this._update(dt);
        this._draw();
    }

    _update(dt) {
        switch (this.state) {
            case 'CREATOR':
                window.creator.update(dt);
                break;
            case 'BIRTH_ANIMATION':
                // Birth animation update
                break;
            case 'CARE':
                window.careManager.update(dt);
                break;
            case 'PARK':
                window.parkManager.update(dt);
                break;
            case 'WARDROBE':
                // Wardrobe preview animation
                break;
            case 'ROOM_EDIT':
                window.roomManager.update(dt);
                break;
        }
    }

    _draw() {
        switch (this.state) {
            case 'CREATOR':
                window.creator.draw(
                    document.getElementById('creator-canvas').getContext('2d'),
                    document.getElementById('creator-canvas').width,
                    document.getElementById('creator-canvas').height
                );
                break;
            case 'BIRTH_ANIMATION':
                // Birth animation draw
                break;
            case 'CARE':
                window.careManager.draw(
                    document.getElementById('care-canvas').getContext('2d'),
                    document.getElementById('care-canvas').width,
                    document.getElementById('care-canvas').height
                );
                break;
            case 'PARK':
                window.parkManager.draw(
                    document.getElementById('park-canvas').getContext('2d'),
                    document.getElementById('park-canvas').width,
                    document.getElementById('park-canvas').height
                );
                break;
            case 'ROOM_EDIT':
                window.roomManager.draw(
                    document.getElementById('room-canvas').getContext('2d'),
                    document.getElementById('room-canvas').width,
                    document.getElementById('room-canvas').height
                );
                break;
        }
    }

    // ── Button Bindings ────────────────────────────────

    _bindScreenButtons() {
        // Title screen
        document.getElementById('btn-new-creature').addEventListener('click', () => {
            this.setState('CREATOR');
        });
        document.getElementById('btn-my-pets').addEventListener('click', () => {
            this.setState('GALLERY');
        });

        // Creator screen
        document.getElementById('btn-creator-back').addEventListener('click', () => {
            // TODO: unsaved changes confirmation
            this.setState('GALLERY');
        });
        document.getElementById('btn-name-finish').addEventListener('click', () => {
            this.setState('NAMING');
        });

        // Naming screen
        document.getElementById('btn-birth').addEventListener('click', () => {
            this.setState('BIRTH_ANIMATION');
        });

        // Care screen
        document.getElementById('btn-care-gallery').addEventListener('click', () => {
            this.setState('GALLERY');
        });
        document.getElementById('btn-wardrobe').addEventListener('click', () => {
            this.setState('WARDROBE');
        });
        document.getElementById('btn-room-edit').addEventListener('click', () => {
            this.setState('ROOM_EDIT');
        });
        document.getElementById('btn-park').addEventListener('click', () => {
            this.setState('PARK');
        });

        // Gallery screen
        document.getElementById('btn-gallery-back').addEventListener('click', () => {
            this.setState('TITLE');
        });
        document.getElementById('btn-gallery-new').addEventListener('click', () => {
            this.setState('CREATOR');
        });

        // Wardrobe screen
        document.getElementById('btn-wardrobe-back').addEventListener('click', () => {
            this.setState('CARE');
        });

        // Room edit screen
        document.getElementById('btn-room-back').addEventListener('click', () => {
            this.setState('CARE');
        });
        document.getElementById('btn-room-done').addEventListener('click', () => {
            this.setState('CARE');
        });

        // Park screen
        document.getElementById('btn-park-home').addEventListener('click', () => {
            this.setState('CARE');
        });
    }
}

// ── Init ───────────────────────────────────────────────
window.game = new Game();
window.game.init();
