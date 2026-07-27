import { System } from '../System';
import {
    TransformComponent, RigidBodyComponent, GuardComponent,
    PlayerComponent, StealthComponent
} from '../components';

export class GuardAISystem extends System {
    private alertTimeout: number = 0;

    constructor() {
        super();
    }

    public update(_dt: number): void {
    }

    public fixedUpdate(): void {
        if (!this.world) return;

        this.alertTimeout = Math.max(0, this.alertTimeout - 1);

        const guards = this.world.getEntitiesWith('transform', 'guard', 'rigidBody');
        const players = this.world.getEntitiesWith('transform', 'player', 'rigidBody');

        for (const guardId of guards) {
            const transform = this.world.getComponent<TransformComponent>(guardId, 'transform');
            const guard = this.world.getComponent<GuardComponent>(guardId, 'guard');
            const rb = this.world.getComponent<RigidBodyComponent>(guardId, 'rigidBody');
            if (!transform || !guard || !rb) continue;

            let playerDetected = false;
            let playerDist = Infinity;

            for (const playerId of players) {
                const pTransform = this.world.getComponent<TransformComponent>(playerId, 'transform');
                const pPlayer = this.world.getComponent<PlayerComponent>(playerId, 'player');
                const pRb = this.world.getComponent<RigidBodyComponent>(playerId, 'rigidBody');
                const pStealth = this.world.getComponent<StealthComponent>(playerId, 'stealth');
                if (!pTransform || !pPlayer || !pRb) continue;

                const pcx = pTransform.x + pTransform.width / 2;
                const pcy = pTransform.y + pTransform.height / 2;
                const gcx = transform.x + transform.width / 2;
                const gcy = transform.y + transform.height / 2;
                const dx = pcx - gcx;
                const dy = pcy - gcy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                playerDist = Math.min(playerDist, dist);

                if (dist > guard.visionRange) continue;

                const angleToPlayer = Math.atan2(dy, dx);
                const guardAngle = guard.facingRight ? 0 : Math.PI;
                let angleDiff = Math.abs(angleToPlayer - guardAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

                if (angleDiff > guard.visionAngle) continue;

                let suspicionGain = 0.15;

                if (pStealth) {
                    if (pStealth.isInShadow) {
                        suspicionGain *= 0.2;
                    }
                    suspicionGain *= 1 + pStealth.noiseLevel * 0.3;
                }

                const speed = Math.sqrt(pRb.vx * pRb.vx + pRb.vy * pRb.vy);
                if (speed > 2) {
                    suspicionGain *= 1.8;
                }

                const distFactor = 1 - (dist / guard.visionRange);
                suspicionGain *= 0.3 + distFactor * 0.7;

                if (angleDiff < guard.visionAngle * 0.4) {
                    suspicionGain *= 1.5;
                }

                guard.suspicionLevel = Math.min(100, guard.suspicionLevel + suspicionGain);
                playerDetected = true;
            }

            switch (guard.state) {
                case 'PATROL':
                    this.doPatrol(guard, transform, rb);
                    if (playerDetected && guard.suspicionLevel >= guard.alertThreshold) {
                        guard.state = 'ALERTED';
                        this.alertTimeout = 120;
                    } else if (playerDetected && guard.suspicionLevel >= guard.suspicionThreshold) {
                        guard.state = 'SUSPICIOUS';
                    }
                    break;

                case 'SUSPICIOUS':
                    rb.vx *= 0.9;
                    guard.suspicionLevel = Math.max(0, guard.suspicionLevel - 0.12);
                    if (guard.suspicionLevel >= guard.alertThreshold) {
                        guard.state = 'ALERTED';
                        this.alertTimeout = 120;
                    } else if (guard.suspicionLevel < guard.suspicionThreshold * 0.3) {
                        guard.state = 'RETURNING';
                    }
                    break;

                case 'ALERTED':
                    if (playerDetected) {
                        this.chasePlayer(guard, transform, rb, playerDist);
                    }
                    guard.suspicionLevel = Math.max(0, guard.suspicionLevel - 0.05);
                    if (this.alertTimeout <= 0 && guard.suspicionLevel < guard.suspicionThreshold) {
                        guard.state = 'SEARCHING';
                    }
                    break;

                case 'SEARCHING':
                    this.doSearch(guard, transform, rb);
                    guard.suspicionLevel = Math.max(0, guard.suspicionLevel - 0.2);
                    if (playerDetected && guard.suspicionLevel >= guard.suspicionThreshold) {
                        guard.state = 'ALERTED';
                        this.alertTimeout = 120;
                    } else if (guard.suspicionLevel < 5) {
                        guard.state = 'RETURNING';
                    }
                    break;

                case 'RETURNING':
                    this.returnToStart(guard, transform, rb);
                    const dxStart = guard.startX - transform.x;
                    if (Math.abs(dxStart) < 10) {
                        guard.state = 'PATROL';
                        guard.suspicionLevel = 0;
                    }
                    break;
            }
        }
    }

    private doPatrol(guard: GuardComponent, transform: TransformComponent, rb: RigidBodyComponent): void {
        rb.vx = guard.dir * guard.patrolSpeed;
        guard.facingRight = guard.dir > 0;

        const leftBound = guard.startX - guard.patrolRange;
        const rightBound = guard.startX + guard.patrolRange;

        if (transform.x <= leftBound) {
            guard.dir = 1;
            guard.facingRight = true;
        } else if (transform.x >= rightBound) {
            guard.dir = -1;
            guard.facingRight = false;
        }
    }

    private chasePlayer(guard: GuardComponent, _transform: TransformComponent, rb: RigidBodyComponent, _distToPlayer: number): void {
        rb.vx = guard.dir * guard.chaseSpeed;
        guard.facingRight = guard.dir > 0;
    }

    private doSearch(guard: GuardComponent, _transform: TransformComponent, rb: RigidBodyComponent): void {
        const time = performance.now() / 1000;
        rb.vx = Math.sin(time * 2) * guard.patrolSpeed * 1.5;
        guard.facingRight = Math.sin(time * 2) > 0;
    }

    private returnToStart(guard: GuardComponent, transform: TransformComponent, rb: RigidBodyComponent): void {
        const dx = guard.startX - transform.x;
        if (Math.abs(dx) < 5) {
            rb.vx = 0;
            return;
        }
        const dir = dx > 0 ? 1 : -1;
        rb.vx = dir * guard.patrolSpeed * 1.2;
        guard.facingRight = dir > 0;
        guard.dir = dir;
    }
}
