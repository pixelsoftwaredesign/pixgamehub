import { World } from '../ecs/World';
import { TransformComponent, RigidBodyComponent, GrappleComponent } from '../ecs/components';

export class GrappleSystem {
    private isKeyPressed: boolean = false;

    constructor() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this.isKeyPressed = true;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) {
                this.isKeyPressed = false;
            }
        });
    }

    public update(world: World, targetX: number, targetY: number): void {
        const entities = world.getEntitiesWith('Transform', 'RigidBody', 'Grapple');

        for (const entityId of entities) {
            const transform = world.getComponent<TransformComponent>(entityId, 'Transform');
            const body = world.getComponent<RigidBodyComponent>(entityId, 'RigidBody');
            const grapple = world.getComponent<GrappleComponent>(entityId, 'Grapple');
            if (!transform || !body || !grapple) continue;

            if (this.isKeyPressed && !grapple.active) {
                grapple.active = true;
                grapple.targetX = targetX;
                grapple.targetY = targetY;

                const dx = grapple.targetX - (transform.x + transform.width / 2);
                const dy = grapple.targetY - (transform.y + transform.height / 2);
                grapple.ropeLength = Math.sqrt(dx * dx + dy * dy);
            }

            if (grapple.active) {
                if (!this.isKeyPressed) {
                    grapple.active = false;
                    continue;
                }

                const centerX = transform.x + transform.width / 2;
                const centerY = transform.y + transform.height / 2;

                const dx = grapple.targetX - centerX;
                const dy = grapple.targetY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const pullForce = 0.15;
                body.vx += (dx / distance) * pullForce * 2;
                body.vy += (dy / distance) * pullForce * 2;

                body.vy -= body.gravity * 0.8;
            }
        }
    }
}
