export interface TransformComponent {
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
}

export interface RigidBodyComponent {
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    gravity: number;
    mass: number;
    friction: number;
    restitution: number;
    isGrounded: boolean;
    isStatic: boolean;
}

export interface SpriteComponent {
    textureKey: string;
    flipX: boolean;
    flipY: boolean;
    alpha: number;
    tint: string;
    srcX: number;
    srcY: number;
    srcW: number;
    srcH: number;
    layer: number;
}

export interface AnimationComponent {
    currentAnim: string;
    currentFrame: number;
    frameTimer: number;
    frameSpeed: number;
    loop: boolean;
    animations: Record<string, {
        frames: number;
        speed: number;
        key: string;
    }>;
}

export interface ColliderComponent {
    type: 'aabb' | 'circle';
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    radius: number;
    isTrigger: boolean;
    layer: number;
    mask: number;
}

export interface HealthComponent {
    hp: number;
    maxHp: number;
    invincible: boolean;
    invincibleTimer: number;
    invincibleDuration: number;
    damageFlash: number;
}

export interface PlayerComponent {
    name: string;
    role: string;
    speed: number;
    jumpForce: number;
    stamina: number;
    maxStamina: number;
    special: number;
    maxSpecial: number;
    facingRight: boolean;
}

export interface GuardComponent {
    state: 'PATROL' | 'SUSPICIOUS' | 'ALERTED' | 'SEARCHING' | 'RETURNING';
    visionRange: number;
    visionAngle: number;
    suspicionLevel: number;
    suspicionThreshold: number;
    alertThreshold: number;
    patrolSpeed: number;
    chaseSpeed: number;
    startX: number;
    startY: number;
    patrolRange: number;
    facingRight: boolean;
    dir: number;
}

export interface GrappleComponent {
    active: boolean;
    targetX: number;
    targetY: number;
    ropeLength: number;
    maxDistance: number;
    cooldown: number;
    cooldownMax: number;
    swingVelocity: number;
    anchorAngle: number;
}

export interface StealthComponent {
    multiplier: number;
    isInShadow: boolean;
    noiseLevel: number;
}

export interface CameraFollowComponent {
    target: number;
    offsetX: number;
    offsetY: number;
    smoothing: number;
    zoom: number;
}

export interface PlatformComponent {
    material: string;
    wallHeight: number;
    wallSide: 'left' | 'right' | null;
}

export interface DecorationComponent {
    type: string;
    animated: boolean;
}

export interface ArtifactComponent {
    type: string;
    collected: boolean;
    phase: number;
    value: number;
}

export interface AnchorPointComponent {
    label: string;
}

export interface ShadowZoneComponent {
    zone: { x: number; y: number; w: number; h: number };
}

export function createTransform(x: number, y: number, w: number, h: number): TransformComponent {
    return { x, y, prevX: x, prevY: y, width: w, height: h, rotation: 0, scaleX: 1, scaleY: 1 };
}

export function createRigidBody(gravity: number = 0.55, isStatic: boolean = false): RigidBodyComponent {
    return {
        vx: 0, vy: 0, ax: 0, ay: 0,
        gravity, mass: 1, friction: 0.8, restitution: 0,
        isGrounded: false, isStatic
    };
}

export function createCollider(w: number, h: number, isTrigger: boolean = false): ColliderComponent {
    return {
        type: 'aabb', offsetX: 0, offsetY: 0,
        width: w, height: h, radius: 0,
        isTrigger, layer: 1, mask: 0xFFFFFFFF
    };
}

export function createHealth(maxHp: number): HealthComponent {
    return {
        hp: maxHp, maxHp,
        invincible: false, invincibleTimer: 0, invincibleDuration: 60,
        damageFlash: 0
    };
}

export function createPlayer(name: string, speed: number, jumpForce: number): PlayerComponent {
    return {
        name, role: '', speed, jumpForce,
        stamina: 100, maxStamina: 100,
        special: 100, maxSpecial: 100,
        facingRight: true
    };
}

export function createGuard(startX: number, startY: number, patrolRange: number): GuardComponent {
    return {
        state: 'PATROL',
        visionRange: 220, visionAngle: 0.6,
        suspicionLevel: 0, suspicionThreshold: 30, alertThreshold: 80,
        patrolSpeed: 1 + Math.random() * 0.5,
        chaseSpeed: 2.5,
        startX, startY, patrolRange,
        facingRight: Math.random() < 0.5,
        dir: Math.random() < 0.5 ? 1 : -1
    };
}

export function createGrapple(maxDistance: number = 300): GrappleComponent {
    return {
        active: false, targetX: 0, targetY: 0,
        ropeLength: 0, maxDistance,
        cooldown: 0, cooldownMax: 30,
        swingVelocity: 0, anchorAngle: 0
    };
}
