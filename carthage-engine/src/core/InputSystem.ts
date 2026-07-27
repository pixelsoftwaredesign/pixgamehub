import { World } from '../ecs/World';
import { RigidBodyComponent, SpriteComponent } from '../ecs/components';

export class InputSystem {
    private keys: { [key: string]: boolean } = {};

    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    public update(world: World): void {
        const entities = world.getEntitiesWith('RigidBody', 'Sprite', 'PlayerTag');

        for (const entityId of entities) {
            const body = world.getComponent<RigidBodyComponent>(entityId, 'RigidBody');
            const sprite = world.getComponent<SpriteComponent>(entityId, 'Sprite');
            if (!body || !sprite) continue;

            const speed = 4.5;

            if (this.keys['KeyD'] || this.keys['ArrowRight']) {
                body.vx = speed;
                sprite.flipX = false;
            } else if (this.keys['KeyA'] || this.keys['KeyQ'] || this.keys['ArrowLeft']) {
                body.vx = -speed;
                sprite.flipX = true;
            } else {
                body.vx *= 0.8;
                if (Math.abs(body.vx) < 0.1) body.vx = 0;
            }

            if ((this.keys['Space'] || this.keys['ArrowUp']) && body.isGrounded) {
                body.vy = -12;
                body.isGrounded = false;
            }
        }
    }
}
