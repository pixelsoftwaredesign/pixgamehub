import { World } from '../ecs/World';
import { EventBus } from './EventBus';
import { ResourceManager } from './ResourceManager';

export interface EngineConfig {
    targetFPS?: number;
    maxFrameTime?: number;
    canvas?: HTMLCanvasElement;
    mode?: 'webgl2' | 'canvas2d';
}

export class Engine {
    private lastTime: number = 0;
    private accumulatedTime: number = 0;
    private fixedTimeStep: number;
    private isRunning: boolean = false;
    private frameCount: number = 0;
    private fps: number = 0;
    private fpsTimer: number = 0;
    private fpsCount: number = 0;

    public world: World;
    public eventBus: EventBus;
    public resources: ResourceManager;
    public canvas: HTMLCanvasElement | null = null;
    public gl: WebGL2RenderingContext | null = null;
    public ctx: CanvasRenderingContext2D | null = null;
    public mode: 'webgl2' | 'canvas2d' = 'webgl2';

    private systems: Array<{ update?: (dt: number) => void; fixedUpdate?: () => void }> = [];
    private fixedUpdateSystems: Array<{ fixedUpdate: () => void }> = [];
    private renderSystems: Array<{ render?: (interpolation: number) => void }> = [];

    private updateCallback: ((dt: number) => void) | null = null;
    private renderCallback: ((interpolation: number) => void) | null = null;

    constructor(config: EngineConfig = {}) {
        const targetFPS = config.targetFPS || 60;
        this.fixedTimeStep = 1000 / targetFPS;
        this.mode = config.mode || 'webgl2';

        this.world = new World();
        this.eventBus = new EventBus();
        this.resources = new ResourceManager();

        if (config.canvas) {
            this.initCanvas(config.canvas);
        }
    }

    private initCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;

        if (this.mode === 'canvas2d') {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('[PixelEngine] Canvas2D non supporté');
                return;
            }
            this.ctx = ctx;
            return;
        }

        const gl = canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        });

        if (!gl) {
            console.error('[PixelEngine] WebGL2 non supporté, fallback Canvas2D');
            this.mode = 'canvas2d';
            const ctx = canvas.getContext('2d');
            if (ctx) this.ctx = ctx;
            return;
        }

        this.gl = gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.04, 0.02, 0.07, 1.0);
    }

    public setCanvas(canvas: HTMLCanvasElement): void {
        this.initCanvas(canvas);
    }

    public addSystem(system: { update?: (dt: number) => void; fixedUpdate?: () => void; render?: (interpolation: number) => void; setWorld?: (world: World) => void }): void {
        if (system.setWorld) {
            system.setWorld(this.world);
        }
        this.systems.push(system);
        if (system.fixedUpdate) {
            this.fixedUpdateSystems.push(system as { fixedUpdate: () => void });
        }
        if (system.render) {
            this.renderSystems.push(system as { render: (interpolation: number) => void });
        }
    }

    public setUpdateCallback(callback: (dt: number) => void): void {
        this.updateCallback = callback;
    }

    public setRenderCallback(callback: (interpolation: number) => void): void {
        this.renderCallback = callback;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulatedTime = 0;
        requestAnimationFrame(this.loop.bind(this));
        this.eventBus.emit('engine:start');
    }

    public stop(): void {
        this.isRunning = false;
        this.eventBus.emit('engine:stop');
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
            for (const system of this.fixedUpdateSystems) {
                system.fixedUpdate();
            }
            this.world.flush();
            this.accumulatedTime -= this.fixedTimeStep;
        }

        const interpolation = this.accumulatedTime / this.fixedTimeStep;

        const dt = frameTime / 1000;
        for (const system of this.systems) {
            if (system.update) {
                system.update(dt);
            }
        }

        if (this.updateCallback) {
            this.updateCallback(dt);
        }

        if (this.gl) {
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        } else if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        for (const system of this.renderSystems) {
            system.render?.(interpolation);
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
