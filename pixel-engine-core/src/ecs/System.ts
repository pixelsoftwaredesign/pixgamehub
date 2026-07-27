import { World } from './World';

export abstract class System {
    public priority: number = 0;
    public enabled: boolean = true;
    protected world: World | null = null;

    public setWorld(world: World): void {
        this.world = world;
    }

    public abstract update(dt: number): void;

    public fixedUpdate?(): void;
    public render?(interpolation: number): void;
    public onAdded?(): void;
    public onRemoved?(): void;
}
