export class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this._prev = {};

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    isPressed(code) {
        return !!this.keys[code];
    }

    isAnyPressed(...codes) {
        return codes.some(c => !!this.keys[c]);
    }

    update() {
        for (const key in this.keys) {
            this.justPressed[key] = this.keys[key] && !this._prev[key];
            this._prev[key] = this.keys[key];
        }
    }

    wasJustPressed(code) {
        return !!this.justPressed[code];
    }

    getState() {
        return this.keys;
    }
}
