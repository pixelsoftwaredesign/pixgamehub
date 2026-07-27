export type UpdateCallback = (dt: number) => void;
export type FixedUpdateCallback = () => void;
export type RenderCallback = (interpolation: number) => void;

export class Engine {
    private lastTime: number = 0;
    private accumulatedTime: number = 0;
    private fixedTimeStep: number;
    private isRunning: boolean = false;
    private frameCount: number = 0;
    private fps: number = 0;
    private fpsTimer: number = 0;
    private fpsCount: number = 0;

    private updateCallback: UpdateCallback | null = null;
    private fixedUpdateCallback: FixedUpdateCallback | null = null;
    private renderCallback: RenderCallback | null = null;

    constructor(
        update: UpdateCallback,
        fixedUpdate: FixedUpdateCallback,
        render: RenderCallback,
        targetFPS: number = 60
    ) {
        this.updateCallback = update;
        this.fixedUpdateCallback = fixedUpdate;
        this.renderCallback = render;
        this.fixedTimeStep = 1000 / targetFPS;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulatedTime = 0;
        requestAnimationFrame(this.loop.bind(this));
    }

    public stop(): void {
        this.isRunning = false;
    }

    public getFPS(): number {
        return this.fps;
    }

    public getFrameCount(): number {
        return this.frameCount;
    }

    private loop(currentTime: number): void {
        if (!this.isRunning) return;

        let frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (frameTime > 250) {
            frameTime = 250;
        }

        this.accumulatedTime += frameTime;

        while (this.accumulatedTime >= this.fixedTimeStep) {
            if (this.fixedUpdateCallback) {
                this.fixedUpdateCallback();
            }
            this.accumulatedTime -= this.fixedTimeStep;
        }

        const interpolation = this.accumulatedTime / this.fixedTimeStep;

        const dt = frameTime / 1000;
        if (this.updateCallback) {
            this.updateCallback(dt);
        }

        if (this.renderCallback) {
            this.renderCallback(interpolation);
        }

        this.frameCount++;
        this.fpsCount++;
        this.fpsTimer += frameTime;
        if (this.fpsTimer >= 1000) {
            this.fps = this.fpsCount;
            this.fpsCount = 0;
            this.fpsTimer -= 1000;
        }

        requestAnimationFrame(this.loop.bind(this));
    }
}
