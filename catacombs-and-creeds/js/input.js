/**
 * InputHandler - Centralized input manager (decoupled from Player)
 *
 * Tracks held keys (isDown) for continuous actions like movement,
 * and just-pressed keys (wasPressed) for one-shot actions like menu
 * navigation and interact. Game reads input and routes to the
 * appropriate system based on current state.
 */
class InputHandler {
    constructor() {
        this.keysDown = {};
        this.justPressed = {};

        // Game keys to prevent default browser behavior
        this.gameKeys = new Set([
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'w', 'W', 's', 'S', 'a', 'A', 'd', 'D',
            ' ', 'Escape', 'i', 'I', 'Enter', 'e', 'E'
        ]);

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        if (this.gameKeys.has(e.key)) {
            e.preventDefault();
        }

        // Only mark justPressed on initial press, not repeat
        if (!this.keysDown[e.key]) {
            this.justPressed[e.key] = true;
        }
        this.keysDown[e.key] = true;
    }

    onKeyUp(e) {
        this.keysDown[e.key] = false;
    }

    /** Returns true while key is held (for movement) */
    isDown(key) {
        return this.keysDown[key] === true;
    }

    /** Returns true only on the frame the key went down (for menus, interact) */
    wasPressed(key) {
        return this.justPressed[key] === true;
    }

    /** Call at END of each game loop frame to clear justPressed state */
    update() {
        this.justPressed = {};
    }
}
