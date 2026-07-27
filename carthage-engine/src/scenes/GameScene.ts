import { Scene } from '../core/SceneManager';
import { World } from '../ecs/World';
import { LevelLoader } from '../core/LevelLoader';
import { InputSystem } from '../core/InputSystem';
import { ProceduralAudio } from '../core/ProceduralAudio';
import { PhysicsSystem } from '../physics/PhysicsSystem';
import { GrappleSystem } from '../physics/GrappleSystem';
import { WebGLRenderer } from '../renderer/WebGLRenderer';
import { Camera } from '../renderer/CameraSystem';
import { TransformComponent, RigidBodyComponent, SpriteComponent, GrappleComponent } from '../ecs/components';

export class GameScene implements Scene {
    private world!: World;
    private physicsSystem!: PhysicsSystem;
    private grappleSystem!: GrappleSystem;
    private inputSystem!: InputSystem;
    private audio!: ProceduralAudio;
    private camera!: Camera;
    private playerEntityId!: number;
    private wasGrounded = false;

    constructor(private renderer: WebGLRenderer, private canvas: HTMLCanvasElement) {}

    public async init(): Promise<void> {
        this.world = new World();
        this.physicsSystem = new PhysicsSystem();
        this.grappleSystem = new GrappleSystem();
        this.inputSystem = new InputSystem();
        this.audio = new ProceduralAudio();
        this.camera = new Camera();

        this.playerEntityId = this.world.createEntity();
        this.world.addComponent(this.playerEntityId, 'Transform', { x: 100, y: 150, width: 40, height: 70 } as TransformComponent);
        this.world.addComponent(this.playerEntityId, 'RigidBody', { vx: 0, vy: 0, gravity: 0.5, isGrounded: false } as RigidBodyComponent);
        this.world.addComponent(this.playerEntityId, 'Sprite', { textureKey: 'zayd_run', flipX: false } as SpriteComponent);
        this.world.addComponent(this.playerEntityId, 'Grapple', { active: false, targetX: 0, targetY: 0, ropeLength: 0 } as GrappleComponent);
        this.world.addComponent(this.playerEntityId, 'PlayerTag', {});

        try {
            await LevelLoader.loadLevel('/maps/carthage_level1.yaml', this.world);
        } catch (e) {
            console.error("Échec du chargement de la carte dans la scène:", e);
        }

        this.audio.init();
        this.audio.startAmbient();
    }

    public update(dt: number): void {
        this.inputSystem.update(this.world);

        const rb = this.world.getComponent<RigidBodyComponent>(this.playerEntityId, 'RigidBody');
        if (rb) {
            this.audio.updateFootsteps(dt, rb.vx, rb.isGrounded);
        }
    }

    public fixedUpdate(): void {
        const rb = this.world.getComponent<RigidBodyComponent>(this.playerEntityId, 'RigidBody');
        const wasGrounded = rb ? rb.isGrounded : true;

        this.physicsSystem.update(this.world, 1 / 60);
        this.grappleSystem.update(this.world, 650, 150);
        this.camera.update(this.world, this.playerEntityId, this.canvas.width, this.canvas.height);

        if (rb) {
            if (!wasGrounded && rb.isGrounded) {
                this.audio.playLand();
            }
        }

        const grapple = this.world.getComponent<GrappleComponent>(this.playerEntityId, 'Grapple');
        if (grapple) {
            this.audio.updateGrappleSound(grapple.active);
        }
    }

    public render(interpolation: number): void {
        this.renderer.clear(0.18, 0.09, 0.12, 1.0);

        const platformEntities = this.world.getEntitiesWith('Platform', 'Transform');
        for (const platId of platformEntities) {
            const transform = this.world.getComponent<TransformComponent>(platId, 'Transform');
            if (!transform) continue;
            this.renderer.drawRect(
                transform.x, transform.y, transform.width, transform.height,
                [0.52, 0.22, 0.15, 1.0],
                this.camera.x, this.camera.y
            );
        }

        const playerTransform = this.world.getComponent<TransformComponent>(this.playerEntityId, 'Transform');
        if (playerTransform) {
            this.renderer.drawRect(
                playerTransform.x, playerTransform.y, playerTransform.width, playerTransform.height,
                [0.85, 0.65, 0.25, 1.0],
                this.camera.x, this.camera.y
            );
        }
    }

    public destroy(): void {
        console.log("Fermeture de la GameScene de Carthage.");
    }
}
