import { System } from '../System';
import {
    TransformComponent, RigidBodyComponent, PlayerComponent, ColliderComponent
} from '../components';

export class MovementSystem extends System {
    private input: Map<string, boolean> = new Map();
    private prevInput: Map<string, boolean> = new Map();

    constructor(_physics: unknown) {
        super();
        this.priority = -5;
    }

    public setInput(key: string, pressed: boolean): void {
        this.input.set(key, pressed);
    }

    public isPressed(key: string): boolean {
        return this.input.get(key) ?? false;
    }

    public wasPressed(key: string): boolean {
        return (this.input.get(key) ?? false) && !(this.prevInput.get(key) ?? false);
    }

    public update(_dt: number): void {
        if (!this.world) return;

        const players = this.world.getEntitiesWith('transform', 'rigidBody', 'player');

        for (const entityId of players) {
            const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
            const rb = this.world.getComponent<RigidBodyComponent>(entityId, 'rigidBody');
            const player = this.world.getComponent<PlayerComponent>(entityId, 'player');
            const collider = this.world.getComponent<ColliderComponent>(entityId, 'collider');

            if (!transform || !rb || !player) continue;

            const moveX = (this.isPressed('KeyA') || this.isPressed('ArrowLeft') ? -1 : 0) +
                          (this.isPressed('KeyD') || this.isPressed('ArrowRight') ? 1 : 0);

            const jumpPressed = this.wasPressed('Space') || this.wasPressed('KeyW') || this.wasPressed('ArrowUp');

            if (moveX !== 0) {
                rb.vx += moveX * player.speed * 0.3;
                player.facingRight = moveX > 0;
            }

            if (jumpPressed && rb.isGrounded) {
                rb.vy = -player.jumpForce;
                rb.isGrounded = false;
            }

            if (this.isPressed('ShiftLeft') || this.isPressed('ShiftRight')) {
                if (player.stamina > 0) {
                    rb.vx *= 1.2;
                    player.stamina -= 0.5;
                }
            } else if (player.stamina < player.maxStamina) {
                player.stamina += 0.2;
            }

            if (collider && collider.type === 'aabb') {
                const grounded = this.checkGrounded(
                    transform.x + collider.offsetX,
                    transform.y + collider.offsetY + collider.height + 1,
                    collider.width, 2
                );
                if (!grounded) {
                    rb.isGrounded = false;
                }
            }
        }

        this.prevInput = new Map(this.input);
    }

    private checkGrounded(x: number, y: number, w: number, h: number): boolean {
        if (!this.world) return false;

        const platforms = this.world.getEntitiesWith('transform', 'collider');
        for (const entityId of platforms) {
            const rb = this.world.getComponent<RigidBodyComponent>(entityId, 'rigidBody');
            if (rb && rb.isStatic) {
                const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
                const collider = this.world.getComponent<ColliderComponent>(entityId, 'collider');
                if (!transform || !collider) continue;

                const px = transform.x + collider.offsetX;
                const py = transform.y + collider.offsetY;
                const pw = collider.width || transform.width;
                const ph = collider.height || transform.height;

                if (x < px + pw && x + w > px && y < py + ph && y + h > py) {
                    return true;
                }
            }
        }
        return false;
    }
}
