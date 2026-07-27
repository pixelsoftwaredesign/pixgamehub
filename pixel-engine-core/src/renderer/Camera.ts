import { World } from '../ecs/World';
import { TransformComponent, CameraFollowComponent } from '../ecs/components';

export class Camera {
    public x: number = 0;
    public y: number = 0;
    public targetX: number = 0;
    public targetY: number = 0;
    public zoom: number = 1;
    public targetZoom: number = 1;
    public smoothing: number = 0.08;
    public viewportWidth: number = 1280;
    public viewportHeight: number = 720;
    public shakeIntensity: number = 0;
    public shakeDecay: number = 0.9;
    public shakeX: number = 0;
    public shakeY: number = 0;
    public bounds: { x: number; y: number; w: number; h: number } | null = null;

    public follow(world: World, entityId: number): void {
        const transform = world.getComponent<TransformComponent>(entityId, 'transform');
        const follow = world.getComponent<CameraFollowComponent>(entityId, 'cameraFollow');

        if (!transform) return;

        const offX = follow?.offsetX || 0;
        const offY = follow?.offsetY || 0;
        const sm = follow?.smoothing || this.smoothing;

        this.targetX = transform.x + transform.width / 2 - this.viewportWidth / 2 + offX;
        this.targetY = transform.y + transform.height / 2 - this.viewportHeight / 2 + offY;

        if (follow?.zoom) {
            this.targetZoom = follow.zoom;
        }

        this.x += (this.targetX - this.x) * sm;
        this.y += (this.targetY - this.y) * sm;
        this.zoom += (this.targetZoom - this.zoom) * sm;

        if (this.bounds) {
            this.x = Math.max(this.bounds.x, Math.min(this.x, this.bounds.x + this.bounds.w - this.viewportWidth / this.zoom));
            this.y = Math.max(this.bounds.y, Math.min(this.y, this.bounds.y + this.bounds.h - this.viewportHeight / this.zoom));
        }

        if (this.shakeIntensity > 0.1) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
            this.shakeIntensity = 0;
        }
    }

    public shake(intensity: number): void {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    public getCameraX(): number {
        return this.x + this.shakeX;
    }

    public getCameraY(): number {
        return this.y + this.shakeY;
    }

    public setViewport(w: number, h: number): void {
        this.viewportWidth = w;
        this.viewportHeight = h;
    }

    public screenToWorld(sx: number, sy: number): { x: number; y: number } {
        return {
            x: (sx / this.zoom) + this.getCameraX(),
            y: (sy / this.zoom) + this.getCameraY()
        };
    }

    public worldToScreen(wx: number, wy: number): { x: number; y: number } {
        return {
            x: (wx - this.getCameraX()) * this.zoom,
            y: (wy - this.getCameraY()) * this.zoom
        };
    }

    public isVisible(x: number, y: number, w: number, h: number): boolean {
        const camX = this.getCameraX();
        const camY = this.getCameraY();
        const vw = this.viewportWidth / this.zoom;
        const vh = this.viewportHeight / this.zoom;
        return x + w > camX && x < camX + vw && y + h > camY && y < camY + vh;
    }
}
