export interface TransformComponent {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface RigidBodyComponent {
    vx: number;
    vy: number;
    gravity: number;
    isGrounded: boolean;
}

export interface SpriteComponent {
    textureKey: string;
    flipX: boolean;
}

export interface GrappleComponent {
    active: boolean;
    targetX: number;
    targetY: number;
    ropeLength: number;
}

export interface PlatformComponent {
    type: string;
    id: string;
}

export interface GrapplePointComponent {
    id: string;
}
