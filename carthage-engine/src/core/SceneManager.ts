export interface Scene {
    init(): void | Promise<void>;
    update(dt: number): void;
    fixedUpdate(): void;
    render(interpolation: number): void;
    destroy(): void;
}

export class SceneManager {
    private scenes: Map<string, Scene> = new Map();
    private currentScene: Scene | null = null;
    private currentSceneKey: string | null = null;

    public addScene(key: string, scene: Scene): void {
        this.scenes.set(key, scene);
    }

    public async switchTo(key: string): Promise<void> {
        if (!this.scenes.has(key)) {
            console.error(`Scène introuvable : ${key}`);
            return;
        }

        if (this.currentScene) {
            this.currentScene.destroy();
        }

        this.currentSceneKey = key;
        this.currentScene = this.scenes.get(key)!;
        await this.currentScene.init();
        console.log(`Changement de scène vers : ${key}`);
    }

    public update(dt: number): void {
        if (this.currentScene) {
            this.currentScene.update(dt);
        }
    }

    public fixedUpdate(): void {
        if (this.currentScene) {
            this.currentScene.fixedUpdate();
        }
    }

    public render(interpolation: number): void {
        if (this.currentScene) {
            this.currentScene.render(interpolation);
        }
    }
}
