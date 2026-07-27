import { System } from '../System';
import {
    TransformComponent, RigidBodyComponent, GrappleComponent, PlayerComponent
} from '../components';
import { MovementSystem } from './MovementSystem';

export class GrappleSystem extends System {
    private movementSystem: MovementSystem;
    private ropeLength: number = 0;
    private anchorX: number = 0;
    private anchorY: number = 0;
    private anchorEntityId: number = -1;
    private swingAngle: number = 0;
    private swingVelocity: number = 0;
    private swingGravity: number = 0.002;
    private swingDamping: number = 0.995;

    constructor(movementSystem: MovementSystem) {
        super();
        this.movementSystem = movementSystem;
        this.priority = -3;
    }

    public update(dt: number): void {
        if (!this.world) return;

        const players = this.world.getEntitiesWith('transform', 'rigidBody', 'player', 'grapple');

        for (const entityId of players) {
            const transform = this.world.getComponent<TransformComponent>(entityId, 'transform');
            const rb = this.world.getComponent<RigidBodyComponent>(entityId, 'rigidBody');
            const grapple = this.world.getComponent<GrappleComponent>(entityId, 'grapple');
            const player = this.world.getComponent<PlayerComponent>(entityId, 'player');

            if (!transform || !rb || !grapple || !player) continue;

            if (grapple.cooldown > 0) {
                grapple.cooldown -= dt * 60;
            }

            if (this.movementSystem.wasPressed('KeyE') && !grapple.active && grapple.cooldown <= 0) {
                this.startGrapple(entityId, transform, rb, grapple, player);
            }

            if (grapple.active) {
                if (this.movementSystem.isPressed('KeyE')) {
                    this.releaseGrapple(entityId, transform, rb, grapple);
                } else {
                    this.updateSwing(dt, transform, rb, grapple);
                }
            }
        }
    }

    private startGrapple(
        _entityId: number,
        transform: TransformComponent,
        rb: RigidBodyComponent,
        grapple: GrappleComponent,
        player: PlayerComponent
    ): void {
        const searchRange = grapple.maxDistance;

        const anchors = this.world!.getEntitiesWith('transform', 'anchorPoint');
        let closestDist = Infinity;
        let closestX = 0;
        let closestY = 0;
        let found = false;

        const dirX = player.facingRight ? 1 : -1;
        const searchCenterX = transform.x + transform.width / 2;
        const searchCenterY = transform.y;

        for (const anchorId of anchors) {
            const anchorTransform = this.world!.getComponent<TransformComponent>(anchorId, 'transform');
            if (!anchorTransform) continue;

            const ax = anchorTransform.x + anchorTransform.width / 2;
            const ay = anchorTransform.y + anchorTransform.height / 2;

            const relX = ax - searchCenterX;
            const relY = ay - searchCenterY;

            if (Math.sign(relX) !== Math.sign(dirX) && Math.abs(relX) > 50) continue;

            const dist = Math.sqrt(relX * relX + relY * relY);
            if (dist < closestDist && dist <= searchRange) {
                closestDist = dist;
                closestX = ax;
                closestY = ay;
                found = true;
            }
        }

        if (!found) {
            const rayX = searchCenterX + dirX * searchRange * 0.8;
            const rayY = searchCenterY - searchRange * 0.5;

            const platforms = this.world!.getEntitiesWith('transform', 'collider', 'platform');
            for (const platId of platforms) {
                const platT = this.world!.getComponent<TransformComponent>(platId, 'transform');
                if (!platT) continue;
                const px = platT.x + platT.width / 2;
                const py = platT.y;
                const d = Math.sqrt((px - searchCenterX) ** 2 + (py - searchCenterY) ** 2);
                if (d < closestDist && d <= searchRange) {
                    closestDist = d;
                    closestX = px;
                    closestY = py;
                    found = true;
                }
            }

            if (!found) {
                closestX = rayX;
                closestY = rayY;
                closestDist = Math.sqrt((closestX - searchCenterX) ** 2 + (closestY - searchCenterY) ** 2);
            }
        }

        grapple.active = true;
        grapple.targetX = closestX;
        grapple.targetY = closestY;
        this.anchorX = closestX;
        this.anchorY = closestY;
        this.ropeLength = closestDist;
        this.anchorEntityId = -1;

        const playerCX = transform.x + transform.width / 2;
        const playerCY = transform.y + transform.height / 2;
        this.swingAngle = Math.atan2(playerCX - closestX, playerCY - closestY);
        this.swingVelocity = 0;

        rb.vx *= 0.3;
    }

    private updateSwing(
        dt: number,
        transform: TransformComponent,
        rb: RigidBodyComponent,
        grapple: GrappleComponent
    ): void {
        this.swingVelocity += this.swingGravity * Math.cos(this.swingAngle);
        this.swingVelocity *= this.swingDamping;
        this.swingAngle += this.swingVelocity * dt * 60;

        const anchorCX = this.anchorX;
        const anchorCY = this.anchorY;
        const playerCX = transform.x + transform.width / 2;

        const desiredX = anchorCX + Math.sin(this.swingAngle) * this.ropeLength;
        const desiredY = anchorCY + Math.cos(this.swingAngle) * this.ropeLength;

        const dx = desiredX - playerCX;
        const dy = desiredY - (transform.y + transform.height / 2);

        rb.vx = dx * 0.15;
        rb.vy = dy * 0.15 - 1.5;

        const dist = Math.sqrt(
            (playerCX - anchorCX) ** 2 +
            (transform.y + transform.height / 2 - anchorCY) ** 2
        );
        if (dist > this.ropeLength * 1.5) {
            this.releaseGrapple(0, transform, rb, grapple);
        }
    }

    private releaseGrapple(
        _entityId: number,
        _transform: TransformComponent,
        rb: RigidBodyComponent,
        grapple: GrappleComponent
    ): void {
        grapple.active = false;
        grapple.cooldown = grapple.cooldownMax;
        this.anchorEntityId = -1;

        rb.vx *= 1.2;
        rb.vy = Math.min(rb.vy, -2);
    }

    public getAnchorPosition(): { x: number; y: number } | null {
        if (this.anchorEntityId >= 0) {
            return { x: this.anchorX, y: this.anchorY };
        }
        return null;
    }

    public isActive(): boolean {
        return this.anchorEntityId >= 0;
    }
}
