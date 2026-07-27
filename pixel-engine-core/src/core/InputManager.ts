import { MovementSystem } from '../ecs/systems/MovementSystem';

export class InputManager {
    private keys: Map<string, boolean> = new Map();
    private prevKeys: Map<string, boolean> = new Map();
    private mouse = { x: 0, y: 0, buttons: 0, clicked: false };
    private movementSystem: MovementSystem | null = null;

    constructor(canvas?: HTMLCanvasElement) {
        this.setupListeners(canvas);
    }

    public bindMovementSystem(ms: MovementSystem): void {
        this.movementSystem = ms;
    }

    private setupListeners(canvas?: HTMLCanvasElement): void {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            this.keys.set(e.code, true);
            if (this.movementSystem) {
                this.movementSystem.setInput(e.code, true);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.code, false);
            if (this.movementSystem) {
                this.movementSystem.setInput(e.code, false);
            }
        });

        if (canvas) {
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;
            });

            canvas.addEventListener('mousedown', (e) => {
                this.mouse.buttons |= 1 << e.button;
                this.mouse.clicked = true;
            });

            canvas.addEventListener('mouseup', (e) => {
                this.mouse.buttons &= ~(1 << e.button);
            });

            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }

    public isPressed(code: string): boolean {
        return this.keys.get(code) ?? false;
    }

    public wasPressed(code: string): boolean {
        return (this.keys.get(code) ?? false) && !(this.prevKeys.get(code) ?? false);
    }

    public wasReleased(code: string): boolean {
        return !(this.keys.get(code) ?? false) && (this.prevKeys.get(code) ?? false);
    }

    public getMouse(): { x: number; y: number; buttons: number; clicked: boolean } {
        return { ...this.mouse };
    }

    public consumeClick(): boolean {
        if (this.mouse.clicked) {
            this.mouse.clicked = false;
            return true;
        }
        return false;
    }

    public flush(): void {
        this.prevKeys = new Map(this.keys);
        this.mouse.clicked = false;
    }

    public destroy(): void {
        window.removeEventListener('keydown', () => {});
        window.removeEventListener('keyup', () => {});
    }
}
