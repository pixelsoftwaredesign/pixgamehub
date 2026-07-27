import { World } from '../ecs/World';
import { TransformComponent } from '../ecs/components';

export class Camera {
    public x: number = 0;
    public y: number = 0;
    private targetX: number = 0;
    private targetY: number = 0;
    private smoothness: number = 0.1;
    private shakeTimer: number = 0;
    private shakeIntensity: number = 0;

    public update(world: World, playerEntityId: number, canvasWidth: number, canvasHeight: number): void {
        const transform = world.getComponent<TransformComponent>(playerEntityId, 'Transform');
        if (!transform) return;

        this.targetX = transform.x - canvasWidth / 2 + transform.width / 2;
        this.targetY = transform.y - canvasHeight / 2 + transform.height / 2;

        this.x += (this.targetX - this.x) * this.smoothness;
        this.y += (this.targetY - this.y) * this.smoothness;

        if (this.shakeTimer > 0) {
            this.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.y += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeTimer--;
        }
    }

    public shake(duration: number, intensity: number): void {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }
}
