import { System } from '../System';
import {
    TransformComponent, RigidBodyComponent, ColliderComponent
} from '../components';

export interface AABB {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface CollisionResult {
    entityA: number;
    entityB: number;
    overlapX: number;
    overlapY: number;
    normalX: number;
    normalY: number;
    isTrigger: boolean;
}

export class PhysicsSystem extends System {
    public gravity: number = 0.55;
    public friction: number = 0.82;
    public maxVelocity: number = 15;
    private worldBounds: AABB = { x: -1000, y: -1000, w: 10000, h: 5000 };
    private collisions: CollisionResult[] = [];

    constructor(gravity: number = 0.55) {
        super();
        this.gravity = gravity;
        this.priority = -10;
    }

    public setWorldBounds(x: number, y: number, w: number, h: number): void {
        this.worldBounds = { x, y, w, h };
    }

    public getCollisions(): CollisionResult[] {
        return this.collisions;
    }

    public update(dt: number): void {
        if (!this.world) return;

        this.collisions = [];

        const rigidBodies = this.world.getEntitiesWith('transform', 'rigidBody');

        for (const entityId of rigidBodies) {
            const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
            const rb = this.world.getComponent<RigidBodyComponent>(entityId, 'rigidBody');

            if (!transform || !rb || rb.isStatic) continue;

            rb.ay += this.gravity;

            rb.vx += rb.ax * dt * 60;
            rb.vy += rb.ay * dt * 60;

            rb.vx *= rb.friction;

            if (Math.abs(rb.vx) > this.maxVelocity) rb.vx = Math.sign(rb.vx) * this.maxVelocity;
            if (rb.vy > this.maxVelocity) rb.vy = this.maxVelocity;
            if (rb.vy < -this.maxVelocity * 2) rb.vy = -this.maxVelocity * 2;

            if (Math.abs(rb.vx) < 0.01) rb.vx = 0;

            transform.prevX = transform.x;
            transform.prevY = transform.y;

            transform.x += rb.vx;
            transform.y += rb.vy;

            rb.ax = 0;
            rb.ay = 0;
        }

        this.resolveCollisions();

        for (const entityId of rigidBodies) {
            const rb = this.world.getComponent<RigidBodyComponent>(entityId, 'rigidBody');
            const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
            if (!rb || !transform) continue;

            if (transform.x < this.worldBounds.x) {
                transform.x = this.worldBounds.x;
                rb.vx = 0;
            }
            if (transform.x + transform.width > this.worldBounds.x + this.worldBounds.w) {
                transform.x = this.worldBounds.x + this.worldBounds.w - transform.width;
                rb.vx = 0;
            }
            if (transform.y < this.worldBounds.y) {
                transform.y = this.worldBounds.y;
                rb.vy = 0;
            }
            if (transform.y > this.worldBounds.y + this.worldBounds.h) {
                transform.y = this.worldBounds.y + this.worldBounds.h;
                rb.vy = 0;
                rb.isGrounded = true;
            }
        }
    }

    private resolveCollisions(): void {
        if (!this.world) return;

        const collidables = this.world.getEntitiesWith('transform', 'collider');
        const aabbs: Array<{ entityId: number; aabb: AABB; isTrigger: boolean; layer: number; mask: number }> = [];

        for (const entityId of collidables) {
            const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
            const collider = this.world.getComponent<ColliderComponent>(entityId, 'collider');
            if (!transform || !collider) continue;

            const aabb: AABB = {
                x: transform.x + collider.offsetX,
                y: transform.y + collider.offsetY,
                w: collider.width || transform.width,
                h: collider.height || transform.height
            };
            aabbs.push({ entityId, aabb, isTrigger: collider.isTrigger, layer: collider.layer, mask: collider.mask });
        }

        for (let i = 0; i < aabbs.length; i++) {
            for (let j = i + 1; j < aabbs.length; j++) {
                const a = aabbs[i];
                const b = aabbs[j];

                if (!(a.layer & b.mask) && !(b.layer & a.mask)) continue;

                const overlapX = Math.min(a.aabb.x + a.aabb.w, b.aabb.x + b.aabb.w) - Math.max(a.aabb.x, b.aabb.x);
                const overlapY = Math.min(a.aabb.y + a.aabb.h, b.aabb.y + b.aabb.h) - Math.max(a.aabb.y, b.aabb.y);

                if (overlapX <= 0 || overlapY <= 0) continue;

                const result: CollisionResult = {
                    entityA: a.entityId,
                    entityB: b.entityId,
                    overlapX,
                    overlapY,
                    normalX: 0,
                    normalY: 0,
                    isTrigger: a.isTrigger || b.isTrigger
                };

                if (!result.isTrigger) {
                    const centerAX = a.aabb.x + a.aabb.w / 2;
                    const centerAY = a.aabb.y + a.aabb.h / 2;
                    const centerBX = b.aabb.x + b.aabb.w / 2;
                    const centerBY = b.aabb.y + b.aabb.h / 2;

                    if (overlapX < overlapY) {
                        result.normalX = centerBX > centerAX ? -1 : 1;
                    } else {
                        result.normalY = centerBY > centerAY ? -1 : 1;
                    }

                    const rbA = this.world.getComponent<RigidBodyComponent>(a.entityId, 'rigidBody');
                    const rbB = this.world.getComponent<RigidBodyComponent>(b.entityId, 'rigidBody');
                    const tA = this.world.getComponent<TransformComponent>(a.entityId, 'transform');
                    const tB = this.world.getComponent<TransformComponent>(b.entityId, 'transform');

                    if (rbA && tA && !rbA.isStatic) {
                        if (overlapX < overlapY) {
                            tA.x += result.normalX * overlapX;
                            rbA.vx = 0;
                        } else {
                            tA.y += result.normalY * overlapY;
                            rbA.vy = 0;
                            if (result.normalY < 0) rbA.isGrounded = true;
                        }
                    } else if (rbB && tB && !rbB.isStatic) {
                        if (overlapX < overlapY) {
                            tB.x -= result.normalX * overlapX;
                            rbB.vx = 0;
                        } else {
                            tB.y -= result.normalY * overlapY;
                            rbB.vy = 0;
                            if (result.normalY > 0) rbB.isGrounded = true;
                        }
                    }
                }

                this.collisions.push(result);
            }
        }
    }

    public fixedUpdate(): void {
    }
}
