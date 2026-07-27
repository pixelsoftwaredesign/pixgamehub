import { World } from '../ecs/World';
import { TransformComponent, RigidBodyComponent } from '../ecs/components';

export class PhysicsSystem {
    public update(world: World, fixedDeltaTime: number): void {
        const dynamicEntities = world.getEntitiesWith('Transform', 'RigidBody');
        const platformEntities = world.getEntitiesWith('Transform', 'Platform');

        for (const entityId of dynamicEntities) {
            const transform = world.getComponent<TransformComponent>(entityId, 'Transform');
            const body = world.getComponent<RigidBodyComponent>(entityId, 'RigidBody');
            if (!transform || !body) continue;

            if (!body.isGrounded) {
                body.vy += body.gravity;
            }

            transform.x += body.vx;
            transform.y += body.vy;
            body.isGrounded = false;

            for (const platId of platformEntities) {
                const platTransform = world.getComponent<TransformComponent>(platId, 'Transform');
                if (!platTransform) continue;

                if (this.checkAABB(transform, platTransform)) {
                    if (body.vy > 0 && transform.y + transform.height - body.vy <= platTransform.y + 10) {
                        transform.y = platTransform.y - transform.height;
                        body.vy = 0;
                        body.isGrounded = true;
                    }
                }
            }
        }
    }

    private checkAABB(a: TransformComponent, b: TransformComponent): boolean {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
}
